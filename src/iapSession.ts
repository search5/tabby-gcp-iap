import * as os from 'os'
import * as fs from 'fs'
import { Injector } from '@angular/core'
import { LogService } from 'tabby-core'
import { BaseSession } from 'tabby-terminal'
import { Client as SSHClient, ClientChannel } from 'ssh2'
import { IAPProfile } from './api'
import { getAccessToken } from './iapAuth'
import { createIAPTunnel } from './iapTunnel'

export class IAPSession extends BaseSession {
    private ssh: SSHClient | null = null
    private shell: ClientChannel | null = null

    constructor (private injector: Injector, public profile: IAPProfile) {
        super(injector.get(LogService).create('iap-session'))
    }

    async start (_options?: unknown): Promise<void> {
        const opts = this.profile.options

        const token = await getAccessToken()

        const stream = await createIAPTunnel({
            project: opts.project,
            zone: opts.zone,
            instance: opts.instance,
            port: opts.port ?? 22,
            token,
        })

        const ssh = new SSHClient()
        this.ssh = ssh

        const keyPath = (opts.privateKey || '~/.ssh/google_compute_engine').replace(/^~/, os.homedir())
        const privateKey = fs.readFileSync(keyPath)

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

        this.releaseInitialDataBuffer()
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
