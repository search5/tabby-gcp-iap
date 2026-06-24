import { Component, Input } from '@angular/core'
import { IAPProfile } from '../api'

@Component({
    template: `
        <div class="form-group row mb-3">
            <label class="col-sm-3 col-form-label">Instance name</label>
            <div class="col-sm-9">
                <input
                    class="form-control"
                    [(ngModel)]="profile.options.instance"
                    placeholder="my-gce-instance"
                />
            </div>
        </div>
        <div class="form-group row mb-3">
            <label class="col-sm-3 col-form-label">Project</label>
            <div class="col-sm-9">
                <input
                    class="form-control"
                    [(ngModel)]="profile.options.project"
                    placeholder="my-gcp-project"
                />
            </div>
        </div>
        <div class="form-group row mb-3">
            <label class="col-sm-3 col-form-label">Zone</label>
            <div class="col-sm-9">
                <input
                    class="form-control"
                    [(ngModel)]="profile.options.zone"
                    placeholder="asia-northeast3-a"
                />
            </div>
        </div>
        <div class="form-group row mb-3">
            <label class="col-sm-3 col-form-label">Username</label>
            <div class="col-sm-9">
                <input
                    class="form-control"
                    [(ngModel)]="profile.options.user"
                    placeholder="$(whoami)"
                />
            </div>
        </div>
        <div class="form-group row mb-3">
            <label class="col-sm-3 col-form-label">SSH Port</label>
            <div class="col-sm-9">
                <input
                    type="number"
                    class="form-control"
                    [(ngModel)]="profile.options.port"
                />
            </div>
        </div>
        <div class="form-group row mb-3">
            <label class="col-sm-3 col-form-label">SSH private key</label>
            <div class="col-sm-9">
                <input
                    class="form-control"
                    [(ngModel)]="profile.options.privateKey"
                    placeholder="~/.ssh/google_compute_engine"
                />
                <small class="text-muted">gcloud compute ssh를 한 번 실행하면 자동 생성됨</small>
            </div>
        </div>
    `,
})
export class IAPProfileSettingsComponent {
    @Input() profile: IAPProfile
}
