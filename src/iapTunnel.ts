import { Duplex } from 'stream'
import WebSocket = require('ws')

const TAG_SID = 0x0001
const TAG_DATA = 0x0004
const TAG_ACK = 0x0007

export interface IAPTunnelOptions {
    project: string
    zone: string
    instance: string
    port: number
    token: string
}

export function createIAPTunnel (opts: IAPTunnelOptions): Promise<Duplex> {
    return new Promise((resolve, reject) => {
        const params = new URLSearchParams({
            project: opts.project,
            zone: opts.zone,
            instance: opts.instance,
            interface: 'nic0',
            port: String(opts.port),
            newWebsocket: 'true',
        })
        const url = `wss://tunnel.cloudproxy.app/v4/connect?${params}`

        const ws = new WebSocket(url, ['relay.tunnel.cloudproxy.app'], {
            headers: {
                Authorization: `Bearer ${opts.token}`,
                Origin: 'bot:iap-tunneler',
            },
        })
        ws.binaryType = 'nodebuffer'

        let bytesReceived = BigInt(0)
        let resolved = false

        function sendAck (n: bigint): void {
            if (ws.readyState !== WebSocket.OPEN) return
            const buf = Buffer.allocUnsafe(10)
            buf.writeUInt16BE(TAG_ACK, 0)
            buf.writeBigUInt64BE(n, 2)
            ws.send(buf)
        }

        const stream = new Duplex({
            read () {},
            write (chunk: Buffer, _enc, cb) {
                const header = Buffer.allocUnsafe(6)
                header.writeUInt16BE(TAG_DATA, 0)
                header.writeUInt32BE(chunk.length, 2)
                ws.send(Buffer.concat([header, chunk]))
                cb()
            },
        })

        ws.on('open', () => {
            resolved = true
            resolve(stream)
        })

        ws.on('error', err => {
            if (!resolved) reject(err)
            else stream.destroy(err)
        })

        ws.on('close', () => stream.push(null))

        ws.on('message', (msg: Buffer) => {
            let offset = 0
            while (offset + 2 <= msg.length) {
                const tag = msg.readUInt16BE(offset)
                offset += 2
                if (tag === TAG_SID) {
                    if (offset + 4 > msg.length) break
                    const len = msg.readUInt32BE(offset); offset += 4
                    offset += len
                } else if (tag === TAG_DATA) {
                    if (offset + 4 > msg.length) break
                    const len = msg.readUInt32BE(offset); offset += 4
                    if (offset + len > msg.length) break
                    const data = msg.slice(offset, offset + len)
                    offset += len
                    bytesReceived += BigInt(len)
                    stream.push(data)
                    sendAck(bytesReceived)
                } else if (tag === TAG_ACK) {
                    offset += 8
                } else {
                    break
                }
            }
        })
    })
}
