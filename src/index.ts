import { NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { ProfileProvider, TabRecoveryProvider } from 'tabby-core'
import { GCPIAPProfileProvider } from './iapProfileProvider'
import { GCPIAPRecoveryProvider } from './iapRecoveryProvider'
import { IAPProfileSettingsComponent } from './components/iapProfileSettings.component'
import { IAPTabComponent } from './components/iapTab.component'

console.log('[tabby-gcp-iap] module loaded')

@NgModule({
    imports: [CommonModule, FormsModule],
    declarations: [IAPProfileSettingsComponent, IAPTabComponent],
    exports: [IAPProfileSettingsComponent, IAPTabComponent],
    providers: [
        { provide: ProfileProvider, useClass: GCPIAPProfileProvider, multi: true },
        { provide: TabRecoveryProvider, useClass: GCPIAPRecoveryProvider, multi: true },
    ],
})
export default class GCPIAPModule {}
