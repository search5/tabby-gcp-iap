import * as crypto from 'crypto'
import * as fs from 'fs'
import * as https from 'https'
import * as os from 'os'
import * as path from 'path'

export const DEFAULT_KEY_PATH = path.join(os.homedir(), '.ssh', 'google_compute_engine')

// Convert a Node.js RSA public key to SSH authorized_keys wire format
function toSSHPublicKey (keyObj: crypto.KeyObject, comment: string): string {
    const jwk = keyObj.export({ format: 'jwk' }) as { e: string; n: string }
    let e = Buffer.from(jwk.e, 'base64url')
    let n = Buffer.from(jwk.n, 'base64url')
    // SSH MPIs are signed big-endian; prepend 0x00 if high bit is set
    if (e[0] & 0x80) e = Buffer.concat([Buffer.from([0x00]), e])
    if (n[0] & 0x80) n = Buffer.concat([Buffer.from([0x00]), n])

    function field (data: Buffer): Buffer {
        const len = Buffer.allocUnsafe(4)
        len.writeUInt32BE(data.length)
        return Buffer.concat([len, data])
    }

    const wire = Buffer.concat([field(Buffer.from('ssh-rsa')), field(e), field(n)])
    return `ssh-rsa ${wire.toString('base64')} ${comment}`
}

/**
 * Ensure ~/.ssh/google_compute_engine (or the given path) exists.
 * Generates a new RSA-2048 key pair if the private key file is missing.
 * Returns the private key path and the public key line (ssh-rsa AAAA... user).
 */
export function ensureKey (keyPath: string = DEFAULT_KEY_PATH): { privateKeyPath: string; publicKeyLine: string } {
    const pubKeyPath = keyPath + '.pub'

    if (!fs.existsSync(keyPath)) {
        const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 })
        const sshDir = path.dirname(keyPath)
        if (!fs.existsSync(sshDir)) {
            fs.mkdirSync(sshDir, { recursive: true, mode: 0o700 })
        }
        fs.writeFileSync(keyPath, privateKey.export({ type: 'pkcs1', format: 'pem' }) as string, { mode: 0o600 })
        fs.writeFileSync(pubKeyPath, toSSHPublicKey(publicKey, os.userInfo().username) + '\n', { mode: 0o644 })
    }

    // Regenerate .pub if somehow missing
    if (!fs.existsSync(pubKeyPath)) {
        const keyBuffer = fs.readFileSync(keyPath)
        const pub = crypto.createPublicKey(keyBuffer)
        fs.writeFileSync(pubKeyPath, toSSHPublicKey(pub, os.userInfo().username) + '\n', { mode: 0o644 })
    }

    return { privateKeyPath: keyPath, publicKeyLine: fs.readFileSync(pubKeyPath, 'utf-8').trim() }
}

// ── GCP API helpers ──────────────────────────────────────────────────────────

async function gcpGet<T> (url: string, token: string): Promise<T> {
    return new Promise((resolve, reject) => {
        https.get(url, { headers: { Authorization: `Bearer ${token}` } }, res => {
            const chunks: Buffer[] = []
            res.on('data', (c: Buffer) => chunks.push(c))
            res.on('end', () => {
                const body = Buffer.concat(chunks).toString()
                if ((res.statusCode ?? 0) >= 200 && (res.statusCode ?? 0) < 300) {
                    resolve(JSON.parse(body))
                } else {
                    reject(new Error(`GCP API ${res.statusCode}: ${body}`))
                }
            })
        }).on('error', reject)
    })
}

async function gcpPost<T> (url: string, token: string, body: object): Promise<T> {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(body)
        const u = new URL(url)
        const req = https.request({
            hostname: u.hostname,
            path: u.pathname + u.search,
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data),
            },
        }, res => {
            const chunks: Buffer[] = []
            res.on('data', (c: Buffer) => chunks.push(c))
            res.on('end', () => {
                const body = Buffer.concat(chunks).toString()
                if ((res.statusCode ?? 0) >= 200 && (res.statusCode ?? 0) < 300) {
                    resolve(JSON.parse(body))
                } else {
                    reject(new Error(`GCP API ${res.statusCode}: ${body}`))
                }
            })
        })
        req.on('error', reject)
        req.write(data)
        req.end()
    })
}

function metaItem (items: { key: string; value: string }[] | undefined, key: string): string | undefined {
    return items?.find(i => i.key === key)?.value
}

function osLoginEnabled (items: { key: string; value: string }[] | undefined): boolean {
    return metaItem(items, 'enable-oslogin')?.toLowerCase() === 'true'
}

async function waitForOperation (token: string, project: string, opName: string): Promise<void> {
    const url = `https://compute.googleapis.com/compute/v1/projects/${project}/global/operations/${opName}`
    for (let i = 0; i < 30; i++) {
        const op = await gcpGet<any>(url, token)
        if (op.status === 'DONE') {
            if (op.error) throw new Error(`Metadata update failed: ${JSON.stringify(op.error.errors)}`)
            return
        }
        await new Promise(r => setTimeout(r, 1000))
    }
    throw new Error('Metadata update timed out after 30 s')
}

// ── Key registration strategies ──────────────────────────────────────────────

async function registerViaMetadata (
    token: string, project: string, username: string, publicKeyLine: string,
): Promise<void> {
    // Fetch email for the google-ssh JSON comment (same as gcloud does)
    const userInfo = await gcpGet<any>('https://www.googleapis.com/oauth2/v2/userinfo', token)
    const email = userInfo.email as string

    // gcloud format: expiry 10 minutes from now, "YYYY-MM-DDTHH:MM:SS+0000"
    const expireOn = new Date(Date.now() + 10 * 60 * 1000)
        .toISOString()
        .replace(/\.\d{3}Z$/, '+0000')

    // Strip comment from public key line, append google-ssh JSON
    const [keyType, keyData] = publicKeyLine.split(' ')
    const googleSshJson = JSON.stringify({ userName: email, expireOn })
    const keyEntry = `${username}:${keyType} ${keyData} google-ssh ${googleSshJson}`

    const projectInfo = await gcpGet<any>(
        `https://compute.googleapis.com/compute/v1/projects/${project}`, token,
    )
    const meta = projectInfo.commonInstanceMetadata ?? { items: [] }
    const items: { key: string; value: string }[] = meta.items ?? []

    const existingSSHKeys = metaItem(items, 'ssh-keys') ?? ''

    // Remove all previous entries for this username, then add fresh one
    const otherKeys = existingSSHKeys.split('\n').filter(l => l.trim() && !l.startsWith(`${username}:`))
    const newSSHKeys = [...otherKeys, keyEntry].join('\n')

    const newItems = items.filter(i => i.key !== 'ssh-keys')
    newItems.push({ key: 'ssh-keys', value: newSSHKeys })

    const op = await gcpPost<any>(
        `https://compute.googleapis.com/compute/v1/projects/${project}/setCommonInstanceMetadata`,
        token,
        { fingerprint: meta.fingerprint, items: newItems },
    )

    await waitForOperation(token, project, op.name)
}

async function registerViaOsLogin (token: string, publicKeyLine: string): Promise<void> {
    const userInfo = await gcpGet<any>('https://www.googleapis.com/oauth2/v2/userinfo', token)
    const userId = encodeURIComponent(userInfo.email as string)
    await gcpPost(
        `https://oslogin.googleapis.com/v1/users/${userId}:importSshPublicKey`,
        token,
        { key: publicKeyLine },
    )
}

// ── Public API ───────────────────────────────────────────────────────────────

export interface RegisterKeyOptions {
    project: string
    zone: string
    instance: string
    username: string
    publicKeyLine: string
    token: string
    /** Called with a progress message before each step that may take time */
    onStatus?: (msg: string) => void
}

/**
 * Register the given SSH public key with GCP so the target instance will accept it.
 * Detects OS Login vs metadata-based SSH automatically.
 * Returns true if the key was newly registered (caller may want to wait for propagation).
 */
export async function registerPublicKey (opts: RegisterKeyOptions): Promise<boolean> {
    const { project, zone, instance, token, username, publicKeyLine, onStatus } = opts

    const [projectInfo, instanceInfo] = await Promise.all([
        gcpGet<any>(`https://compute.googleapis.com/compute/v1/projects/${project}`, token),
        gcpGet<any>(`https://compute.googleapis.com/compute/v1/projects/${project}/zones/${zone}/instances/${instance}`, token),
    ])

    const useOsLogin = osLoginEnabled(projectInfo.commonInstanceMetadata?.items)
                    || osLoginEnabled(instanceInfo.metadata?.items)

    if (useOsLogin) {
        onStatus?.('Registering SSH key via OS Login...')
        await registerViaOsLogin(token, publicKeyLine)
        return false // OS Login propagates instantly
    } else {
        onStatus?.('Uploading temporary SSH key to project metadata...')
        await registerViaMetadata(token, project, username, publicKeyLine)
        return true // VM guest agent needs time to pick up the new metadata
    }
}
