import * as https from 'https'
import * as os from 'os'
import * as path from 'path'
import * as fs from 'fs'

interface ADCCredentials {
    client_id: string
    client_secret: string
    refresh_token: string
    type: string
}

export async function getAccessToken (): Promise<string> {
    const adcPath = path.join(os.homedir(), '.config', 'gcloud', 'application_default_credentials.json')
    let creds: ADCCredentials
    try {
        creds = JSON.parse(fs.readFileSync(adcPath, 'utf-8'))
    } catch {
        throw new Error(
            `Could not read GCP credentials from ${adcPath}.\n` +
            `Run: gcloud auth application-default login`,
        )
    }

    if (creds.type !== 'authorized_user') {
        throw new Error(`Unsupported credential type: ${creds.type}`)
    }

    const body = new URLSearchParams({
        client_id: creds.client_id,
        client_secret: creds.client_secret,
        refresh_token: creds.refresh_token,
        grant_type: 'refresh_token',
    }).toString()

    return new Promise((resolve, reject) => {
        const req = https.request(
            {
                hostname: 'oauth2.googleapis.com',
                path: '/token',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Content-Length': Buffer.byteLength(body),
                },
            },
            res => {
                let data = ''
                res.on('data', chunk => { data += chunk })
                res.on('end', () => {
                    try {
                        const json = JSON.parse(data)
                        if (json.access_token) {
                            resolve(json.access_token)
                        } else {
                            reject(new Error(`Token refresh failed: ${json.error_description || data}`))
                        }
                    } catch (e) {
                        reject(e)
                    }
                })
            },
        )
        req.on('error', reject)
        req.write(body)
        req.end()
    })
}
