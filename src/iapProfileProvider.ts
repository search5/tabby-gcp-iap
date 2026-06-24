import * as os from 'os'
import { Injectable } from '@angular/core'
import { NewTabParameters, PartialProfile, ProfileProvider } from 'tabby-core'
import { IAPProfile } from './api'
import { IAPProfileSettingsComponent } from './components/iapProfileSettings.component'
import { IAPTabComponent } from './components/iapTab.component'

@Injectable()
export class GCPIAPProfileProvider extends ProfileProvider<IAPProfile> {
    id = 'gcp-iap'
    name = 'GCP IAP SSH'
    settingsComponent = IAPProfileSettingsComponent as any

    configDefaults = {
        options: {
            instance: '',
            project: '',
            zone: '',
            user: os.userInfo().username,
            port: 22,
            privateKey: '~/.ssh/google_compute_engine',
        },
    }

    async getBuiltinProfiles (): Promise<PartialProfile<IAPProfile>[]> {
        return [
            {
                id: 'gcp-iap:template',
                type: 'gcp-iap',
                name: 'GCP IAP SSH',
                icon: 'fas fa-cloud',
                options: {
                    instance: '',
                    project: '',
                    zone: '',
                    user: os.userInfo().username,
                    port: 22,
                    privateKey: '~/.ssh/google_compute_engine',
                },
                isBuiltin: true,
                isTemplate: true,
                weight: -1,
            },
        ]
    }

    async getNewTabParameters (profile: IAPProfile): Promise<NewTabParameters<IAPTabComponent>> {
        return {
            type: IAPTabComponent,
            inputs: { profile },
        }
    }

    getDescription (profile: PartialProfile<IAPProfile>): string {
        if (!profile.options?.instance) return ''
        return `${profile.options.instance} (${profile.options.project}/${profile.options.zone})`
    }
}
