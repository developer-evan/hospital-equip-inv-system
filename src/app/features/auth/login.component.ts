import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { Checkbox } from 'primeng/checkbox';
import { InputText } from 'primeng/inputtext';
import { Password } from 'primeng/password';
import { Message } from 'primeng/message';

import { AuthService } from '../../core/services/auth.service';
import { ApiErrorBody } from '../../core/models/common.model';

@Component({
  selector: 'app-login',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, Button, Card, Checkbox, InputText, Password, Message],
  template: `
    <div class="flex min-h-dvh bg-surface-50 dark:bg-surface-950 text-color">
      <!-- Brand panel -->
      <div
        class="relative hidden w-[45%] flex-col justify-between overflow-hidden border-r border-surface bg-surface-0 dark:bg-surface-900 p-10 lg:flex"
      >
        <div class="relative z-10">
          <div class="flex items-center gap-3">
            <div
              class="flex size-10 items-center justify-center rounded-xl bg-orange-500 text-white shadow-lg shadow-orange-500/25"
            >
              <i class="pi pi-heart-fill"></i>
            </div>
            <span class="text-xl font-semibold tracking-tight text-color">MediTrack</span>
          </div>
        </div>

        <div class="relative z-10 max-w-md">
          <h1 class="text-3xl font-semibold leading-tight text-color">
            Hospital equipment inventory, simplified.
          </h1>
          <p class="mt-4 text-sm leading-relaxed text-muted-color">
            Track assets, maintenance schedules and receiving workflows across every department
            — all in one place.
          </p>
        </div>

        <p class="relative z-10 text-xs text-muted-color">
          &copy; {{ currentYear }} MediTrack &middot; Hospital Equipment Inventory System
        </p>

        <div
          class="pointer-events-none absolute -right-20 -top-20 size-72 rounded-full bg-orange-500/10 blur-3xl"
          aria-hidden="true"
        ></div>
        <div
          class="pointer-events-none absolute -bottom-16 left-10 size-56 rounded-full bg-orange-500/5 blur-3xl"
          aria-hidden="true"
        ></div>
      </div>

      <!-- Form panel -->
      <div class="flex flex-1 items-center justify-center px-6 py-10">
        <div class="w-full max-w-md">
          <div class="mb-8 lg:hidden">
            <div class="flex items-center gap-3">
              <div
                class="flex size-10 items-center justify-center rounded-xl bg-orange-500 text-white"
              >
                <i class="pi pi-heart-fill"></i>
              </div>
              <span class="text-xl font-semibold text-color">MediTrack</span>
            </div>
          </div>

          <p-card styleClass="auth-card">
            <ng-template #header>
              <div class="px-1 pt-1">
                <h2 class="text-2xl font-semibold text-color">Welcome back</h2>
                <p class="mt-1 text-sm text-muted-color">Sign in to access your dashboard</p>
              </div>
            </ng-template>

            @if (errorMessage()) {
              <p-message severity="error" [text]="errorMessage()!" styleClass="!mb-4 !w-full" />
            }

            <form [formGroup]="form" (ngSubmit)="submit()" class="flex flex-col gap-4">
              <div class="flex flex-col gap-1.5">
                <label for="username" class="text-sm font-medium text-color">Username</label>
                <input
                  pInputText
                  id="username"
                  formControlName="username"
                  placeholder="Enter your username"
                  autocomplete="username"
                  class="w-full !rounded-xl !border-surface !py-2.5"
                />
              </div>

              <div class="flex flex-col gap-1.5">
                <label for="password" class="text-sm font-medium text-color">Password</label>
                <p-password
                  inputId="password"
                  formControlName="password"
                  placeholder="Enter your password"
                  [toggleMask]="true"
                  [feedback]="false"
                  autocomplete="current-password"
                  styleClass="w-full"
                  inputStyleClass="w-full !rounded-xl !border-surface !py-2.5"
                />
              </div>

              <div class="flex items-center gap-2">
                <p-checkbox formControlName="rememberMe" [binary]="true" inputId="rememberMe" />
                <label for="rememberMe" class="cursor-pointer text-sm text-muted-color">
                  Remember me
                </label>
              </div>

              <p-button
                type="submit"
                label="Sign in"
                icon="pi pi-sign-in"
                [loading]="loading()"
                [disabled]="form.invalid || loading()"
                styleClass="!mt-1 !w-full !rounded-xl !border-orange-500 !bg-orange-500 !py-2.5 !text-white hover:!border-orange-400 hover:!bg-orange-400"
              />
            </form>
          </p-card>
        </div>
      </div>
    </div>
  `,
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly currentYear = new Date().getFullYear();
  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    username: ['', Validators.required],
    password: ['', Validators.required],
    rememberMe: [true],
  });

  submit(): void {
    if (this.form.invalid || this.loading()) return;

    this.loading.set(true);
    this.errorMessage.set(null);

    const { username, password } = this.form.getRawValue();
    this.auth.login({ username, password }).subscribe({
      next: () => {
        void this.router.navigate(['/dashboard']);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.errorMessage.set(this.resolveLoginError(err));
      },
    });
  }

  private resolveLoginError(err: HttpErrorResponse): string {
    const body = err.error as ApiErrorBody | undefined;
    const message = body?.message;

    if (Array.isArray(message)) {
      return message[0] ?? 'Invalid username or password. Please try again.';
    }

    if (typeof message === 'string' && message.trim()) {
      return message;
    }

    if (err.status === 0) {
      return 'Unable to reach the server. Check that the API is running.';
    }

    return 'Invalid username or password. Please try again.';
  }
}
