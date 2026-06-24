import { NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { ProfileProvider } from 'tabby-core'
import { GCPIAPProfileProvider } from './iapProfileProvider'
import { IAPProfileSettingsComponent } from './components/iapProfileSettings.component'
import { IAPTabComponent } from './components/iapTab.component'

console.log('[tabby-gcp-iap] module loaded')

@NgModule({
    imports: [CommonModule, FormsModule],
    declarations: [IAPProfileSettingsComponent, IAPTabComponent],
    exports: [IAPProfileSettingsComponent, IAPTabComponent],
    providers: [
        { provide: ProfileProvider, useClass: GCPIAPProfileProvider, multi: true },
    ],
})
export default class GCPIAPModule {}
