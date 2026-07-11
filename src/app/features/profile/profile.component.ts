import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Card } from 'primeng/card';
import { Password } from 'primeng/password';
import { Button } from 'primeng/button';
import { Tag } from 'primeng/tag';
import { Message } from 'primeng/message';

import { UsersService } from '../../core/services/users.service';
import { ApiErrorBody } from '../../core/models/common.model';
import { UserProfile } from '../../core/models/profile.model';
import { ROLE_LABEL } from '../../core/models/role.enum';

@Component({
  selector: 'app-profile',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, Card, Password, Button, Tag, Message],
  template: `
    <div class="mb-6">
      <h2 class="text-xl font-semibold text-white">My Profile</h2>
      <p class="mt-1 text-sm text-slate-500">Your account details and password.</p>
    </div>

    @if (loading()) {
      <p class="text-sm text-slate-500">Loading profile…</p>
    } @else if (profile()) {
      <div class="grid max-w-3xl gap-4">
        <p-card styleClass="!rounded-2xl !border-white/5 !bg-[#111319]">
          <div class="flex items-start gap-4">
            <span class="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-orange-500/15 text-lg font-semibold text-orange-300">
              {{ initials(profile()!.fullName) }}
            </span>
            <div class="min-w-0 flex-1">
              <h3 class="text-lg font-semibold text-white">{{ profile()!.fullName }}</h3>
              <p class="text-sm text-slate-500">{{ profile()!.email }}</p>
              <div class="mt-3 flex flex-wrap gap-2">
                <p-tag [value]="roleLabel(profile()!.role)" severity="warn" styleClass="!text-xs" />
                <p-tag [value]="profile()!.isActive ? 'Active' : 'Inactive'" [severity]="profile()!.isActive ? 'success' : 'danger'" styleClass="!text-xs" />
              </div>
            </div>
          </div>

          <div class="mt-6 grid gap-3 border-t border-white/5 pt-5 text-sm">
            <div class="flex justify-between gap-4">
              <span class="text-slate-500">Username</span>
              <span class="font-mono text-slate-200">{{ profile()!.username }}</span>
            </div>
            <div class="flex justify-between gap-4">
              <span class="text-slate-500">Departments</span>
              <span class="text-right text-slate-200">{{ departmentLabels(profile()!) }}</span>
            </div>
            @if (profile()!.lastLoginAt) {
              <div class="flex justify-between gap-4">
                <span class="text-slate-500">Last login</span>
                <span class="text-slate-200">{{ formatDate(profile()!.lastLoginAt!) }}</span>
              </div>
            }
          </div>
        </p-card>

        <p-card styleClass="!rounded-2xl !border-white/5 !bg-[#111319]">
          <ng-template #header>
            <div class="px-1 pt-1">
              <h3 class="font-medium text-slate-200">Change password</h3>
              <p class="mt-1 text-sm text-slate-500">Update your account password.</p>
            </div>
          </ng-template>

          @if (passwordSuccess()) {
            <p-message severity="success" text="Password updated successfully." styleClass="!mb-4 !w-full" />
          }
          @if (passwordError()) {
            <p-message severity="error" [text]="passwordError()!" styleClass="!mb-4 !w-full" />
          }

          <form [formGroup]="passwordForm" (ngSubmit)="changePassword()" class="flex flex-col gap-4">
            <p-password formControlName="currentPassword" placeholder="Current password" [toggleMask]="true" [feedback]="false" styleClass="w-full" inputStyleClass="w-full !rounded-xl !border-white/10 !bg-[#1a1d26] !py-2.5" />
            <p-password formControlName="newPassword" placeholder="New password (min 8 chars)" [toggleMask]="true" [feedback]="false" styleClass="w-full" inputStyleClass="w-full !rounded-xl !border-white/10 !bg-[#1a1d26] !py-2.5" />
            <div class="flex justify-end">
              <p-button type="submit" label="Update password" icon="pi pi-lock" [loading]="saving()" [disabled]="passwordForm.invalid || saving()" styleClass="!rounded-xl !border-orange-500 !bg-orange-500" />
            </div>
          </form>
        </p-card>
      </div>
    }
  `,
})
export class ProfileComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly usersService = inject(UsersService);

  readonly profile = signal<UserProfile | null>(null);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly passwordSuccess = signal(false);
  readonly passwordError = signal<string | null>(null);

  readonly passwordForm = this.fb.nonNullable.group({
    currentPassword: ['', Validators.required],
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
  });

  ngOnInit(): void {
    this.usersService.getMe().subscribe({
      next: (res) => {
        this.profile.set(res.data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  changePassword(): void {
    if (this.passwordForm.invalid || this.saving()) return;
    this.saving.set(true);
    this.passwordSuccess.set(false);
    this.passwordError.set(null);

    this.usersService.changeMyPassword(this.passwordForm.getRawValue()).subscribe({
      next: () => {
        this.saving.set(false);
        this.passwordSuccess.set(true);
        this.passwordForm.reset();
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        this.passwordError.set(this.resolveError(err));
      },
    });
  }

  initials(name: string): string {
    return name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('');
  }

  roleLabel(role: UserProfile['role']): string {
    return ROLE_LABEL[role];
  }

  departmentLabels(profile: UserProfile): string {
    return profile.departments.length ? profile.departments.map((d) => d.name).join(', ') : '—';
  }

  formatDate(value: string): string {
    return new Date(value).toLocaleString();
  }

  private resolveError(err: HttpErrorResponse): string {
    const message = (err.error as ApiErrorBody | undefined)?.message;
    if (Array.isArray(message)) return message[0] ?? 'Unable to update password.';
    if (typeof message === 'string' && message.trim()) return message;
    return 'Unable to update password.';
  }
}
