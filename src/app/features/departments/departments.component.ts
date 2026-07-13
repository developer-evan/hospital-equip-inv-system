import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { ConfirmationService } from 'primeng/api';
import { Button } from 'primeng/button';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { Dialog } from 'primeng/dialog';
import { IconField } from 'primeng/iconfield';
import { InputIcon } from 'primeng/inputicon';
import { InputText } from 'primeng/inputtext';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { Tag } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { Message } from 'primeng/message';

import { DepartmentsService } from '../../core/services/departments.service';
import { StoreContextService } from '../../core/services/store-context.service';
import { ApiErrorBody, PaginationMeta } from '../../core/models/common.model';
import { CreateDepartmentDto, Department } from '../../core/models/department.model';

type DepartmentRecord = Department & { _id?: string };

@Component({
  selector: 'app-departments',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ConfirmationService],
  imports: [
    ReactiveFormsModule,
    Button,
    ConfirmDialog,
    Dialog,
    IconField,
    InputIcon,
    InputText,
    TableModule,
    Tag,
    TooltipModule,
    Message,
  ],
  template: `
    <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 class="text-xl font-semibold text-color">Departments</h2>
        <p class="mt-1 text-sm text-muted-color">
          Manage hospital departments that equipment and staff are scoped to.
        </p>
      </div>

      @if (canManage()) {
        <p-button
          type="button"
          icon="pi pi-plus"
          label="New Department"
          styleClass="!rounded-xl !border-primary !bg-primary !text-primary-contrast hover:!border-primary-emphasis hover:!bg-primary-emphasis"
          (onClick)="openCreateDialog()"
        />
      }
    </div>

    <div class="overflow-hidden rounded-2xl border border-surface bg-surface-0 dark:bg-surface-900">
      <p-table
        [value]="departments()"
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
              <p class="text-sm font-medium text-color">All departments</p>
              <p class="text-xs text-muted-color">{{ totalRecords() }} total departments</p>
            </div>

            <p-iconfield iconPosition="left" class="w-full sm:w-72">
              <p-inputicon styleClass="pi pi-search" />
              <input
                pInputText
                type="search"
                placeholder="Search name, code or location…"
                class="w-full rounded-xl! border-surface! !py-2 !text-sm"
                [value]="searchInput()"
                (input)="onSearchInput($event)"
              />
            </p-iconfield>
          </div>
        </ng-template>

        <ng-template #header>
          <tr>
            <th class="!min-w-[12rem]">Name</th>
            <th class="!min-w-[7rem]">Code</th>
            <th class="!min-w-[12rem]">Location</th>
            <th class="!min-w-[6rem]">Status</th>
            @if (canManage()) {
              <th class="!w-28"></th>
            }
          </tr>
        </ng-template>

        <ng-template #body let-dept>
          <tr>
            <td>
              <div class="flex items-center gap-3">
                <span
                  class="flex size-9 shrink-0 items-center justify-center rounded-xl border border-surface text-sm font-semibold text-primary-300"
                >
                  {{ dept.code.slice(0, 2).toUpperCase() }}
                </span>
                <span class="font-medium text-color">{{ dept.name }}</span>
              </div>
            </td>
            <td>
              <span class="font-mono text-sm text-muted-color">{{ dept.code }}</span>
            </td>
            <td>
              <span class="text-sm text-muted-color">{{ dept.location || '—' }}</span>
            </td>
            <td>
              <p-tag
                [value]="dept.isActive === false ? 'Inactive' : 'Active'"
                [severity]="dept.isActive === false ? 'danger' : 'success'"
                styleClass="!text-xs"
              />
            </td>
            @if (canManage()) {
              <td>
                <div class="flex items-center justify-end gap-1">
                  <p-button
                    type="button"
                    icon="pi pi-pencil"
                    [rounded]="true"
                    [text]="true"
                    severity="secondary"
                    styleClass="!size-8 !text-muted-color hover:!text-color"
                    pTooltip="Edit department"
                    tooltipPosition="left"
                    (onClick)="openEditDialog(dept)"
                  />
                  <p-button
                    type="button"
                    icon="pi pi-trash"
                    [rounded]="true"
                    [text]="true"
                    severity="danger"
                    styleClass="!size-8 !text-muted-color hover:!text-rose-400"
                    pTooltip="Delete department"
                    tooltipPosition="left"
                    (onClick)="confirmDelete(dept)"
                  />
                </div>
              </td>
            }
          </tr>
        </ng-template>

        <ng-template #emptymessage>
          <tr>
            <td [attr.colspan]="canManage() ? 5 : 4">
              <div class="flex flex-col items-center justify-center gap-3 py-14 text-center">
                <span
                  class="flex size-12 items-center justify-center rounded-2xl border border-surface text-muted-color"
                >
                  <i class="pi pi-building text-xl"></i>
                </span>
                <div>
                  <p class="text-sm font-medium text-color">No departments found</p>
                  <p class="mt-1 text-xs text-muted-color">
                    Try a different search or add a new department.
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
      [style]="{ width: '28rem', maxWidth: '95vw' }"
      styleClass="app-dialog"
      [header]="editing() ? 'Edit Department' : 'New Department'"
      (onHide)="resetForm()"
    >
      @if (formError()) {
        <p-message severity="error" [text]="formError()!" styleClass="!mb-4 !w-full" />
      }

      <form [formGroup]="form" (ngSubmit)="saveDepartment()" class="flex flex-col gap-4">
        <div class="flex flex-col gap-1.5">
          <label for="deptName" class="text-sm font-medium text-color">Name</label>
          <input
            pInputText
            id="deptName"
            formControlName="name"
            placeholder="Intensive Care Unit"
            class="w-full !rounded-xl !border-surface !py-2.5"
          />
        </div>

        <div class="flex flex-col gap-1.5">
          <label for="deptCode" class="text-sm font-medium text-color">Code</label>
          <input
            pInputText
            id="deptCode"
            formControlName="code"
            placeholder="ICU"
            class="w-full !rounded-xl !border-surface !py-2.5"
          />
        </div>

        <div class="flex flex-col gap-1.5">
          <label for="deptLocation" class="text-sm font-medium text-color">
            Location <span class="text-muted-color">(optional)</span>
          </label>
          <input
            pInputText
            id="deptLocation"
            formControlName="location"
            placeholder="Building A, Floor 3"
            class="w-full !rounded-xl !border-surface !py-2.5"
          />
        </div>

        <div class="mt-2 flex justify-end gap-2 border-t border-surface pt-4">
          <p-button
            type="button"
            label="Cancel"
            [text]="true"
            severity="secondary"
            styleClass="!text-muted-color"
            (onClick)="closeDialog()"
          />
          <p-button
            type="submit"
            [label]="editing() ? 'Save Changes' : 'Create Department'"
            icon="pi pi-check"
            [loading]="saving()"
            [disabled]="form.invalid || saving()"
            styleClass="!rounded-xl !border-primary !bg-primary !text-primary-contrast hover:!border-primary-emphasis hover:!bg-primary-emphasis"
          />
        </div>
      </form>
    </p-dialog>

    <p-confirmdialog styleClass="app-dialog" />
  `,
})
export class DepartmentsComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly departmentsService = inject(DepartmentsService);
  private readonly storeContext = inject(StoreContextService);
  private readonly confirm = inject(ConfirmationService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly searchChanges$ = new Subject<string>();

  protected readonly pageSize = 10;

  readonly departments = signal<Department[]>([]);
  readonly totalRecords = signal(0);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly formError = signal<string | null>(null);
  readonly searchInput = signal('');
  readonly editing = signal<Department | null>(null);
  readonly canManage = computed(() => this.storeContext.can('departments:write'));

  dialogVisible = false;

  readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    code: ['', Validators.required],
    location: [''],
  });

  private currentPage = 1;

  ngOnInit(): void {
    this.searchChanges$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((term) => {
        this.searchInput.set(term);
        this.currentPage = 1;
        this.loadDepartments();
      });
  }

  onLazyLoad(event: TableLazyLoadEvent): void {
    this.currentPage = event.first! / event.rows! + 1;
    this.loadDepartments(event.rows ?? this.pageSize);
  }

  onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchChanges$.next(value);
  }

  openCreateDialog(): void {
    this.editing.set(null);
    this.formError.set(null);
    this.form.reset({ name: '', code: '', location: '' });
    this.dialogVisible = true;
  }

  openEditDialog(department: Department): void {
    this.editing.set(department);
    this.formError.set(null);
    this.form.reset({
      name: department.name,
      code: department.code,
      location: department.location ?? '',
    });
    this.dialogVisible = true;
  }

  closeDialog(): void {
    this.dialogVisible = false;
  }

  resetForm(): void {
    this.form.reset({ name: '', code: '', location: '' });
    this.editing.set(null);
    this.formError.set(null);
    this.saving.set(false);
  }

  saveDepartment(): void {
    if (this.form.invalid || this.saving()) return;

    this.saving.set(true);
    this.formError.set(null);

    const payload = this.form.getRawValue() as CreateDepartmentDto;
    const editing = this.editing();
    const request = editing
      ? this.departmentsService.update(editing.id, payload)
      : this.departmentsService.create(payload);

    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.dialogVisible = false;
        this.loadDepartments();
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        this.formError.set(this.resolveError(err));
      },
    });
  }

  confirmDelete(department: Department): void {
    this.confirm.confirm({
      header: 'Delete Department',
      message: `Delete "${department.name}"? Equipment and users linked to this department may be affected.`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-text',
      accept: () => {
        this.departmentsService.remove(department.id).subscribe({
          next: () => this.loadDepartments(),
        });
      },
    });
  }

  private loadDepartments(limit = this.pageSize): void {
    this.loading.set(true);

    this.departmentsService
      .list({
        page: this.currentPage,
        limit,
        search: this.searchInput().trim() || undefined,
      })
      .subscribe({
        next: (res) => {
          const departments = res.data
            .map((dept) => this.normalizeDepartment(dept as DepartmentRecord))
            .filter((dept) => !!dept.id);

          this.departments.set(departments);
          this.totalRecords.set((res.meta as PaginationMeta).totalItems ?? departments.length);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  private normalizeDepartment(dept: DepartmentRecord): Department {
    return {
      id: this.resolveEntityId(dept),
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
      return message[0] ?? 'Unable to save department. Please try again.';
    }

    if (typeof message === 'string' && message.trim()) {
      return message;
    }

    return 'Unable to save department. Please try again.';
  }
}
