import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { IconField } from 'primeng/iconfield';
import { InputIcon } from 'primeng/inputicon';
import { InputText } from 'primeng/inputtext';
import { MultiSelect } from 'primeng/multiselect';
import { Password } from 'primeng/password';
import { Select } from 'primeng/select';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { Tag } from 'primeng/tag';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { TooltipModule } from 'primeng/tooltip';
import { Message } from 'primeng/message';
import { Avatar } from 'primeng/avatar';

import { UsersService } from '../../core/services/users.service';
import { DepartmentsService } from '../../core/services/departments.service';
import { ApiErrorBody, PaginationMeta } from '../../core/models/common.model';
import { Department } from '../../core/models/department.model';
import { User, UserDepartmentRef } from '../../core/models/user.model';
import { Role, ROLE_LABEL } from '../../core/models/role.enum';

interface SelectOption<T = string> {
  label: string;
  value: T;
}

type DepartmentOption = Department & { _id?: string };

@Component({
  selector: 'app-users',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    Button,
    Dialog,
    IconField,
    InputIcon,
    InputText,
    MultiSelect,
    Password,
    Select,
    TableModule,
    Tag,
    ToggleSwitch,
    TooltipModule,
    Message,
    Avatar,
  ],
  template: `
    <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 class="text-xl font-semibold text-white">Users</h2>
        <p class="mt-1 text-sm text-slate-500">
          Create accounts, assign roles and departments across your facility.
        </p>
      </div>

      <p-button
        type="button"
        icon="pi pi-user-plus"
        label="New User"
        styleClass="!rounded-xl !border-orange-500 !bg-orange-500 hover:!border-orange-400 hover:!bg-orange-400"
        (onClick)="openCreateDialog()"
      />
    </div>

    <div class="overflow-hidden rounded-2xl border border-white/5 bg-[#111319]">
      <p-table
        [value]="users()"
        [loading]="loading()"
        [lazy]="true"
        [paginator]="true"
        [rows]="pageSize"
        [totalRecords]="totalRecords()"
        [rowsPerPageOptions]="[10, 20, 50]"
        (onLazyLoad)="onLazyLoad($event)"
        styleClass="dashboard-table"
        paginatorStyleClass="dashboard-paginator"
        [showGridlines]="false"
        [rowHover]="true"
      >
        <ng-template #caption>
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p class="text-sm font-medium text-slate-200">All users</p>
              <p class="text-xs text-slate-500">{{ totalRecords() }} total accounts</p>
            </div>

            <p-iconfield iconPosition="left" class="w-full sm:w-72">
              <p-inputicon styleClass="pi pi-search" />
              <input
                pInputText
                type="search"
                placeholder="Search username, email or name…"
                class="w-full !rounded-xl !border-white/10 !bg-[#1a1d26] !py-2 !text-sm !text-slate-100 placeholder:!text-slate-500"
                [value]="searchInput()"
                (input)="onSearchInput($event)"
              />
            </p-iconfield>
          </div>
        </ng-template>

        <ng-template #header>
          <tr>
            <th class="!min-w-[14rem]">User</th>
            <th class="!min-w-[8rem]">Username</th>
            <th class="!min-w-[8rem]">Role</th>
            <th class="!min-w-[10rem]">Departments</th>
            <th class="!min-w-[6rem]">Status</th>
            <th class="!w-28"></th>
          </tr>
        </ng-template>

        <ng-template #body let-user>
          <tr>
            <td>
              <div class="flex items-center gap-3">
                <p-avatar
                  [label]="initials(user.fullName)"
                  shape="circle"
                  styleClass="!size-9 !bg-orange-500/15 !text-xs !font-semibold !text-orange-300"
                />
                <div class="min-w-0">
                  <p class="truncate font-medium text-slate-200">{{ user.fullName }}</p>
                  <p class="truncate text-xs text-slate-500">{{ user.email }}</p>
                </div>
              </div>
            </td>
            <td>
              <span class="font-mono text-sm text-slate-400">{{ user.username }}</span>
            </td>
            <td>
              <p-tag
                [value]="roleLabel(user.role)"
                [severity]="user.role === Role.ADMINISTRATOR ? 'warn' : 'secondary'"
                styleClass="!text-xs"
              />
            </td>
            <td>
              <span class="text-sm text-slate-400">{{ departmentLabels(user) }}</span>
            </td>
            <td>
              <p-tag
                [value]="user.isActive ? 'Active' : 'Inactive'"
                [severity]="user.isActive ? 'success' : 'danger'"
                styleClass="!text-xs"
              />
            </td>
            <td>
              <div class="flex items-center justify-end gap-2">
                <p-toggleswitch
                  [ngModel]="user.isActive"
                  (ngModelChange)="toggleStatus(user, $event)"
                  [disabled]="statusUpdatingId() === user.id"
                  pTooltip="Toggle active status"
                  tooltipPosition="left"
                />
              </div>
            </td>
          </tr>
        </ng-template>

        <ng-template #emptymessage>
          <tr>
            <td colspan="6">
              <div class="flex flex-col items-center justify-center gap-3 py-14 text-center">
                <span
                  class="flex size-12 items-center justify-center rounded-2xl border border-white/5 bg-white/5 text-slate-500"
                >
                  <i class="pi pi-users text-xl"></i>
                </span>
                <div>
                  <p class="text-sm font-medium text-slate-300">No users found</p>
                  <p class="mt-1 text-xs text-slate-500">
                    Try a different search or add a new user account.
                  </p>
                </div>
              </div>
            </td>
          </tr>
        </ng-template>
      </p-table>
    </div>

    <p-dialog
      [(visible)]="dialogVisible"
      [modal]="true"
      [draggable]="false"
      [resizable]="false"
      [style]="{ width: '32rem', maxWidth: '95vw' }"
      styleClass="app-dialog"
      header="New User"
      (onHide)="resetCreateForm()"
    >
      @if (formError()) {
        <p-message severity="error" [text]="formError()!" styleClass="!mb-4 !w-full" />
      }

      <form [formGroup]="form" (ngSubmit)="saveUser()" class="flex flex-col gap-4">
        <div class="grid gap-4 sm:grid-cols-2">
          <div class="flex flex-col gap-1.5 sm:col-span-2">
            <label for="fullName" class="text-sm font-medium text-slate-300">Full name</label>
            <input
              pInputText
              id="fullName"
              formControlName="fullName"
              placeholder="Dr. Jane Doe"
              class="w-full !rounded-xl !border-white/10 !bg-[#1a1d26] !py-2.5 !text-slate-100 placeholder:!text-slate-500"
            />
          </div>

          <div class="flex flex-col gap-1.5">
            <label for="username" class="text-sm font-medium text-slate-300">Username</label>
            <input
              pInputText
              id="username"
              formControlName="username"
              placeholder="jdoe"
              autocomplete="off"
              class="w-full !rounded-xl !border-white/10 !bg-[#1a1d26] !py-2.5 !text-slate-100 placeholder:!text-slate-500"
            />
          </div>

          <div class="flex flex-col gap-1.5">
            <label for="email" class="text-sm font-medium text-slate-300">Email</label>
            <input
              pInputText
              id="email"
              type="email"
              formControlName="email"
              placeholder="jane.doe@hospital.org"
              class="w-full !rounded-xl !border-white/10 !bg-[#1a1d26] !py-2.5 !text-slate-100 placeholder:!text-slate-500"
            />
          </div>

          <div class="flex flex-col gap-1.5 sm:col-span-2">
            <label for="password" class="text-sm font-medium text-slate-300">Password</label>
            <p-password
              inputId="password"
              formControlName="password"
              placeholder="Minimum 8 characters"
              [toggleMask]="true"
              [feedback]="false"
              autocomplete="new-password"
              styleClass="w-full"
              inputStyleClass="w-full !rounded-xl !border-white/10 !bg-[#1a1d26] !py-2.5 !text-slate-100 placeholder:!text-slate-500"
            />
          </div>

          <div class="flex flex-col gap-1.5">
            <label for="role" class="text-sm font-medium text-slate-300">Role</label>
            <p-select
              inputId="role"
              formControlName="role"
              [options]="roleOptions"
              optionLabel="label"
              optionValue="value"
              placeholder="Select role"
              styleClass="w-full !rounded-xl"
            />
          </div>

          <div class="flex flex-col gap-1.5">
            <label for="departments" class="text-sm font-medium text-slate-300">Departments</label>
            <p-multiselect
              inputId="departments"
              formControlName="departments"
              [options]="departmentOptions()"
              optionLabel="name"
              optionValue="id"
              dataKey="id"
              placeholder="Assign departments"
              display="chip"
              appendTo="body"
              [showToggleAll]="false"
              styleClass="w-full !rounded-xl"
              [loading]="departmentsLoading()"
            >
              <ng-template let-dept #item>
                <span>{{ dept.name }} ({{ dept.code }})</span>
              </ng-template>
            </p-multiselect>
          </div>
        </div>

        <div class="mt-2 flex justify-end gap-2 border-t border-white/5 pt-4">
          <p-button
            type="button"
            label="Cancel"
            [text]="true"
            severity="secondary"
            styleClass="!text-slate-400"
            (onClick)="closeDialog()"
          />
          <p-button
            type="submit"
            label="Create User"
            icon="pi pi-check"
            [loading]="saving()"
            [disabled]="form.invalid || saving()"
            styleClass="!rounded-xl !border-orange-500 !bg-orange-500 hover:!border-orange-400 hover:!bg-orange-400"
          />
        </div>
      </form>
    </p-dialog>
  `,
})
export class UsersComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly usersService = inject(UsersService);
  private readonly departmentsService = inject(DepartmentsService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly searchChanges$ = new Subject<string>();

  protected readonly Role = Role;
  protected readonly pageSize = 10;

  readonly users = signal<User[]>([]);
  readonly totalRecords = signal(0);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly departmentsLoading = signal(false);
  readonly formError = signal<string | null>(null);
  readonly statusUpdatingId = signal<string | null>(null);
  readonly searchInput = signal('');
  readonly departmentOptions = signal<Department[]>([]);

  dialogVisible = false;

  readonly roleOptions: SelectOption<Role>[] = Object.values(Role).map((role) => ({
    label: ROLE_LABEL[role],
    value: role,
  }));

  readonly form = this.fb.nonNullable.group({
    username: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    fullName: ['', Validators.required],
    role: [Role.DEPARTMENT_USER as Role, Validators.required],
    departments: [[] as string[], Validators.required],
  });

  private currentPage = 1;
  private departmentNameById = new Map<string, string>();

  ngOnInit(): void {
    this.loadDepartments();

    this.searchChanges$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((term) => {
        this.searchInput.set(term);
        this.currentPage = 1;
        this.loadUsers();
      });
  }

  onLazyLoad(event: TableLazyLoadEvent): void {
    this.currentPage = event.first! / event.rows! + 1;
    this.loadUsers(event.rows ?? this.pageSize);
  }

  onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchChanges$.next(value);
  }

  openCreateDialog(): void {
    this.formError.set(null);
    this.dialogVisible = true;
    if (!this.departmentOptions().length) {
      this.loadDepartments();
    }
  }

  closeDialog(): void {
    this.dialogVisible = false;
  }

  resetCreateForm(): void {
    this.form.reset({
      username: '',
      email: '',
      password: '',
      fullName: '',
      role: Role.DEPARTMENT_USER,
      departments: [],
    });
    this.formError.set(null);
    this.saving.set(false);
  }

  saveUser(): void {
    if (this.form.invalid || this.saving()) return;

    this.saving.set(true);
    this.formError.set(null);

    this.usersService.create(this.form.getRawValue()).subscribe({
      next: () => {
        this.saving.set(false);
        this.dialogVisible = false;
        this.loadUsers();
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        this.formError.set(this.resolveError(err));
      },
    });
  }

  toggleStatus(user: User, isActive: boolean): void {
    if (this.statusUpdatingId() === user.id) return;

    this.statusUpdatingId.set(user.id);
    this.usersService.updateStatus(user.id, isActive).subscribe({
      next: (res) => {
        this.users.update((list) => list.map((item) => (item.id === user.id ? res.data : item)));
        this.statusUpdatingId.set(null);
      },
      error: () => {
        this.statusUpdatingId.set(null);
        this.loadUsers();
      },
    });
  }

  roleLabel(role: Role): string {
    return ROLE_LABEL[role];
  }

  initials(fullName: string): string {
    return fullName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('');
  }

  departmentLabels(user: User): string {
    const departments = user.departments ?? [];
    if (!departments.length) return '—';

    return departments
      .map((department) => {
        if (typeof department === 'string') {
          return this.departmentNameById.get(department) ?? department;
        }
        return (department as UserDepartmentRef).name;
      })
      .join(', ');
  }

  private loadUsers(limit = this.pageSize): void {
    this.loading.set(true);

    this.usersService
      .list({
        page: this.currentPage,
        limit,
        search: this.searchInput().trim() || undefined,
      })
      .subscribe({
        next: (res) => {
          this.users.set(res.data);
          this.totalRecords.set((res.meta as PaginationMeta).totalItems ?? res.data.length);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  private loadDepartments(): void {
    this.departmentsLoading.set(true);

    this.departmentsService.active().subscribe({
      next: (res) => {
        const departments = res.data
          .map((dept) => this.normalizeDepartment(dept as DepartmentOption))
          .filter((dept) => !!dept.id);

        this.departmentNameById = new Map(departments.map((dept) => [dept.id, dept.name]));
        this.departmentOptions.set(departments);
        this.departmentsLoading.set(false);
      },
      error: () => this.departmentsLoading.set(false),
    });
  }

  private normalizeDepartment(dept: DepartmentOption): Department {
    const id = this.resolveEntityId(dept);
    return {
      id,
      name: dept.name,
      code: dept.code,
      location: dept.location,
      isActive: dept.isActive,
    };
  }

  private resolveEntityId(entity: { id?: string; _id?: string | { toString(): string } }): string {
    if (entity.id) return String(entity.id);
    if (entity._id) {
      return typeof entity._id === 'string' ? entity._id : entity._id.toString();
    }
    return '';
  }

  private resolveError(err: HttpErrorResponse): string {
    const body = err.error as ApiErrorBody | undefined;
    const message = body?.message;

    if (Array.isArray(message)) {
      return message[0] ?? 'Unable to create user. Please try again.';
    }

    if (typeof message === 'string' && message.trim()) {
      return message;
    }

    return 'Unable to create user. Please try again.';
  }
}
