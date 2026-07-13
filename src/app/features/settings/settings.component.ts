import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Card } from 'primeng/card';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { Button } from 'primeng/button';
import { Message } from 'primeng/message';

import { AuthService } from '../../core/services/auth.service';
import { ROLE_LABEL } from '../../core/models/role.enum';

interface NotificationPrefs {
  emailAlerts: boolean;
  maintenanceReminders: boolean;
  receivingUpdates: boolean;
}

const PREFS_KEY = 'heims_notification_prefs';

@Component({
  selector: 'app-settings',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, Card, ToggleSwitch, Button, Message],
  template: `
    <div class="mb-6 w-full">
      <h2 class="text-xl font-semibold text-color">Settings</h2>
      <p class="mt-1 text-sm text-muted-color">Facility preferences and notification options.</p>
    </div>

    @if (saved()) {
      <p-message severity="success" text="Preferences saved." styleClass="!mb-4 !w-full max-w-3xl" />
    }

    <div class="grid  gap-4">
      <p-card styleClass="p-4 !rounded-2xl">
        <ng-template #header>
          <div class="px-1 pt-1">
            <h3 class="font-medium text-color">Account</h3>
            <p class="mt-1 text-sm text-muted-color">Signed in as {{ user()?.fullName }}</p>
          </div>
        </ng-template>
        <div class="grid gap-3 text-sm">
          <div class="flex justify-between gap-4 border-b border-surface pb-3">
            <span class="text-muted-color">Role</span>
            <span class="text-color">{{ roleLabel() }}</span>
          </div>
          <div class="flex justify-between gap-4 border-b border-surface pb-3">
            <span class="text-muted-color">Email</span>
            <span class="text-color">{{ user()?.email }}</span>
          </div>
          <div class="flex justify-between gap-4">
            <span class="text-muted-color">Username</span>
            <span class="font-mono text-color">{{ user()?.username }}</span>
          </div>
        </div>
      </p-card>

      <p-card styleClass="p-4 !rounded-2xl">
        <ng-template #header>
          <div class="px-1 pt-1">
            <h3 class="font-medium text-color">Notifications</h3>
            <p class="mt-1 text-sm text-muted-color">Control which alerts you receive in the app.</p>
          </div>
        </ng-template>
        <div class="flex flex-col gap-4">
          <div class="flex items-center justify-between gap-4">
            <div>
              <p class="text-sm font-medium text-color">Email alerts</p>
              <p class="text-xs text-muted-color">Critical system notifications</p>
            </div>
            <p-toggleswitch [(ngModel)]="prefs.emailAlerts" />
          </div>
          <div class="flex items-center justify-between gap-4">
            <div>
              <p class="text-sm font-medium text-color">Maintenance reminders</p>
              <p class="text-xs text-muted-color">Upcoming and overdue PM tasks</p>
            </div>
            <p-toggleswitch [(ngModel)]="prefs.maintenanceReminders" />
          </div>
          <div class="flex items-center justify-between gap-4">
            <div>
              <p class="text-sm font-medium text-color">Receiving updates</p>
              <p class="text-xs text-muted-color">New registrations and installations</p>
            </div>
            <p-toggleswitch [(ngModel)]="prefs.receivingUpdates" />
          </div>
        </div>
        <div class="mt-6 flex justify-end">
          <p-button type="button" label="Save preferences" icon="pi pi-save" styleClass="!rounded-xl !border-primary !bg-primary !text-primary-contrast" (onClick)="savePrefs()" />
        </div>
      </p-card>

      <p-card styleClass="p-4 !rounded-2xl">
        <ng-template #header>
          <div class="px-1 pt-1">
            <h3 class="font-medium text-color">Facility</h3>
            <p class="mt-1 text-sm text-muted-color">MediTrack Hospital Equipment Inventory System</p>
          </div>
        </ng-template>
        <p class="text-sm text-muted-color">
          Facility-wide configuration is managed by administrators through the backend. Contact your
          system administrator to update hospital profile details.
        </p>
      </p-card>
    </div>
  `,
})
export class SettingsComponent {
  private readonly auth = inject(AuthService);

  readonly user = this.auth.currentUser;
  readonly saved = signal(false);

  prefs: NotificationPrefs = this.readPrefs();

  roleLabel(): string {
    const user = this.user();
    return user ? ROLE_LABEL[user.role] : '';
  }

  savePrefs(): void {
    localStorage.setItem(PREFS_KEY, JSON.stringify(this.prefs));
    this.saved.set(true);
    setTimeout(() => this.saved.set(false), 2500);
  }

  private readPrefs(): NotificationPrefs {
    try {
      return {
        emailAlerts: true,
        maintenanceReminders: true,
        receivingUpdates: true,
        ...JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}'),
      };
    } catch {
      return { emailAlerts: true, maintenanceReminders: true, receivingUpdates: true };
    }
  }
}
