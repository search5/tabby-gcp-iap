import { ConnectableTerminalProfile } from 'tabby-terminal'

export interface IAPProfileOptions {
    instance: string
    project: string
    zone: string
    user: string
    port: number
    privateKey: string
}

export interface IAPProfile extends ConnectableTerminalProfile {
    options: IAPProfileOptions
}
