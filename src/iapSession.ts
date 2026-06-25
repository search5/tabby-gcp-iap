import * as os from 'os'
import * as fs from 'fs'
import { Injector } from '@angular/core'
import { LogService } from 'tabby-core'
import { BaseSession } from 'tabby-terminal'
import { Client as SSHClient, ClientChannel } from 'ssh2'
import { IAPProfile } from './api'
import { getAccessToken } from './iapAuth'
import { createIAPTunnel } from './iapTunnel'
import { ensureKey, registerPublicKey, DEFAULT_KEY_PATH } from './iapKeyManager'

export class IAPSession extends BaseSession {
    private ssh: SSHClient | null = null
    private shell: ClientChannel | null = null

    constructor (private injector: Injector, public profile: IAPProfile) {
        super(injector.get(LogService).create('iap-session'))
    }

    async start (_options?: unknown): Promise<void> {
        // Release early so status messages appear in the terminal immediately
        this.releaseInitialDataBuffer()

        const emit = (msg: string) => this.emitOutput(Buffer.from(`\x1b[90m[GCP IAP] ${msg}\x1b[0m\r\n`))

        const opts = this.profile.options

        emit('Getting access token...')
        const token = await getAccessToken()

        const keyPath = (opts.privateKey || DEFAULT_KEY_PATH).replace(/^~/, os.homedir())
        const keyExists = fs.existsSync(keyPath)
        if (!keyExists) emit('Generating SSH key pair...')
        const { privateKeyPath, publicKeyLine } = ensureKey(keyPath)
        if (!keyExists) emit(`SSH key saved to ${privateKeyPath}`)

        emit('Checking SSH key registration...')
        const needsPropagation = await registerPublicKey({
            project: opts.project,
            zone: opts.zone,
            instance: opts.instance,
            username: opts.user,
            publicKeyLine,
            token,
            onStatus: msg => emit(msg),
        })

        if (needsPropagation) {
            emit('Key registered. Waiting for VM guest agent (5 s)...')
            await new Promise(r => setTimeout(r, 5000))
        }

        emit('Opening IAP tunnel...')
        const stream = await createIAPTunnel({
            project: opts.project,
            zone: opts.zone,
            instance: opts.instance,
            port: opts.port ?? 22,
            token,
        })

        emit('Connecting SSH...')
        const ssh = new SSHClient()
        this.ssh = ssh

        const privateKey = fs.readFileSync(privateKeyPath)

        await new Promise<void>((resolve, reject) => {
            ssh.once('ready', resolve)
            ssh.once('error', reject)
            ssh.connect({
                sock: stream as any,
                username: opts.user,
                privateKey,
                tryKeyboard: false,
            })
        })

        const channel = await new Promise<ClientChannel>((resolve, reject) => {
            ssh.shell({ term: 'xterm-256color', rows: 24, cols: 80 }, (err, ch) => {
                if (err) reject(err)
                else resolve(ch)
            })
        })

        this.shell = channel
        this.open = true

        channel.on('data', (data: Buffer) => this.emitOutput(data))
        channel.stderr.on('data', (data: Buffer) => this.emitOutput(data))
        channel.on('close', () => this.destroy())
    }

    write (data: Buffer): void {
        this.shell?.write(data)
    }

    resize (columns: number, rows: number): void {
        this.shell?.setWindow(rows, columns, 0, 0)
    }

    kill (_signal?: string): void {
        this.shell?.end()
    }

    async gracefullyKillProcess (): Promise<void> {
        this.kill()
    }

    supportsWorkingDirectory (): boolean { return false }

    async getWorkingDirectory (): Promise<string | null> { return null }

    async destroy (): Promise<void> {
        this.shell = null
        this.ssh?.end()
        this.ssh = null
        await super.destroy()
    }
}
