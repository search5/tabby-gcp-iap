import { Injectable } from '@angular/core'
import { NewTabParameters, RecoveryToken, TabRecoveryProvider } from 'tabby-core'
import { IAPTabComponent } from './components/iapTab.component'

@Injectable()
export class GCPIAPRecoveryProvider extends TabRecoveryProvider<IAPTabComponent> {
    async applicableTo (recoveryToken: RecoveryToken): Promise<boolean> {
        return recoveryToken.type === 'app:gcp-iap-tab'
    }

    async recover (recoveryToken: RecoveryToken): Promise<NewTabParameters<IAPTabComponent>> {
        return {
            type: IAPTabComponent,
            inputs: {
                profile: recoveryToken.profile,
                savedState: recoveryToken.savedState,
            },
        }
    }
}
