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
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { ConfirmationService } from 'primeng/api';
import { Button } from 'primeng/button';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { Dialog } from 'primeng/dialog';
import { IconField } from 'primeng/iconfield';
import { InputIcon } from 'primeng/inputicon';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { TooltipModule } from 'primeng/tooltip';
import { Message } from 'primeng/message';

import { EquipmentService } from '../../core/services/equipment.service';
import { DepartmentsService } from '../../core/services/departments.service';
import { AuthService } from '../../core/services/auth.service';
import { StoreContextService } from '../../core/services/store-context.service';
import { ApiErrorBody, PaginationMeta } from '../../core/models/common.model';
import { EquipmentStatus } from '../../core/models/equipment-status.enum';
import {
  CreateEquipmentDto,
  EQUIPMENT_STATUS_LABEL,
  Equipment,
} from '../../core/models/equipment.model';
import { normalizeDepartment } from '../../core/utils/entity.util';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';

interface SelectOption<T = string> {
  label: string;
  value: T;
}

@Component({
  selector: 'app-equipment',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ConfirmationService],
  imports: [
    FormsModule,
    ReactiveFormsModule,
    Button,
    ConfirmDialog,
    Dialog,
    IconField,
    InputIcon,
    InputText,
    Select,
    TableModule,
    TooltipModule,
    Message,
    StatusBadgeComponent,
  ],
  template: `
    <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 class="text-xl font-semibold text-white">Equipment</h2>
        <p class="mt-1 text-sm text-slate-500">
          Browse, register and track assets across your facility.
        </p>
      </div>

      @if (canCreate()) {
        <p-button
          type="button"
          icon="pi pi-plus"
          label="New Equipment"
          styleClass="!rounded-xl !border-orange-500 !bg-orange-500 hover:!border-orange-400 hover:!bg-orange-400"
          (onClick)="openCreateDialog()"
        />
      }
    </div>

    <div class="overflow-hidden rounded-2xl border border-white/5 bg-[#111319]">
      <p-table
        [value]="equipment()"
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
          <div class="flex flex-col gap-3">
            <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p class="text-sm font-medium text-slate-200">All equipment</p>
                <p class="text-xs text-slate-500">{{ totalRecords() }} total assets</p>
              </div>

              <p-iconfield iconPosition="left" class="w-full sm:w-72">
                <p-inputicon styleClass="pi pi-search" />
                <input
                  pInputText
                  type="search"
                  placeholder="Search name, category, manufacturer…"
                  class="w-full !rounded-xl !border-white/10 !bg-[#1a1d26] !py-2 !text-sm !text-slate-100 placeholder:!text-slate-500"
                  [value]="searchInput()"
                  (input)="onSearchInput($event)"
                />
              </p-iconfield>
            </div>

            <div class="flex flex-col gap-2 sm:flex-row">
              <p-select
                [options]="departmentFilterOptions()"
                [(ngModel)]="departmentFilter"
                optionLabel="label"
                optionValue="value"
                placeholder="All departments"
                [showClear]="true"
                styleClass="w-full sm:w-56 !rounded-xl"
                (onChange)="onFiltersChanged()"
              />
              <p-select
                [options]="statusFilterOptions"
                [(ngModel)]="statusFilter"
                optionLabel="label"
                optionValue="value"
                placeholder="All statuses"
                [showClear]="true"
                styleClass="w-full sm:w-56 !rounded-xl"
                (onChange)="onFiltersChanged()"
              />
            </div>
          </div>
        </ng-template>

        <ng-template #header>
          <tr>
            <th class="!min-w-[7rem]">Asset #</th>
            <th class="!min-w-[14rem]">Equipment</th>
            <th class="!min-w-[8rem]">Category</th>
            <th class="!min-w-[9rem]">Department</th>
            <th class="!min-w-[8rem]">Status</th>
            @if (canEdit() || canDelete()) {
              <th class="!w-28"></th>
            }
          </tr>
        </ng-template>

        <ng-template #body let-item>
          <tr>
            <td>
              <span class="font-mono text-xs font-medium text-orange-300/90">{{
                item.assetNumber || '—'
              }}</span>
            </td>
            <td>
              <div class="min-w-0">
                <p class="truncate font-medium text-slate-200">{{ item.name }}</p>
                <p class="truncate text-xs text-slate-500">
                  {{ item.manufacturer
                  }}{{ item.model ? ' · ' + item.model : '' }}
                  · SN {{ item.serialNumber }}
                </p>
              </div>
            </td>
            <td>
              <span class="text-sm text-slate-400">{{ item.category }}</span>
            </td>
            <td>
              <span class="text-sm text-slate-400">{{ departmentLabel(item) }}</span>
            </td>
            <td>
              <app-status-badge [status]="item.status" />
            </td>
            @if (canEdit() || canDelete()) {
              <td>
                <div class="flex items-center justify-end gap-1">
                  @if (canEdit()) {
                    <p-button
                      type="button"
                      icon="pi pi-pencil"
                      [rounded]="true"
                      [text]="true"
                      severity="secondary"
                      styleClass="!size-8 !text-slate-500 hover:!text-slate-300"
                      pTooltip="Edit equipment"
                      tooltipPosition="left"
                      (onClick)="openEditDialog(item)"
                    />
                  }
                  @if (canDelete()) {
                    <p-button
                      type="button"
                      icon="pi pi-trash"
                      [rounded]="true"
                      [text]="true"
                      severity="danger"
                      styleClass="!size-8 !text-slate-500 hover:!text-rose-400"
                      pTooltip="Delete equipment"
                      tooltipPosition="left"
                      (onClick)="confirmDelete(item)"
                    />
                  }
                </div>
              </td>
            }
          </tr>
        </ng-template>

        <ng-template #emptymessage>
          <tr>
            <td [attr.colspan]="canEdit() || canDelete() ? 6 : 5">
              <div class="flex flex-col items-center justify-center gap-3 py-14 text-center">
                <span
                  class="flex size-12 items-center justify-center rounded-2xl border border-white/5 bg-white/5 text-slate-500"
                >
                  <i class="pi pi-box text-xl"></i>
                </span>
                <div>
                  <p class="text-sm font-medium text-slate-300">No equipment found</p>
                  <p class="mt-1 text-xs text-slate-500">
                    Try adjusting filters or register a new asset.
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
      [style]="{ width: '42rem', maxWidth: '95vw' }"
      styleClass="app-dialog"
      [header]="editing() ? 'Edit Equipment' : 'New Equipment'"
      (onHide)="resetForm()"
    >
      @if (formError()) {
        <p-message severity="error" [text]="formError()!" styleClass="!mb-4 !w-full" />
      }

      <form [formGroup]="form" (ngSubmit)="saveEquipment()" class="flex flex-col gap-4">
        <div class="grid gap-4 sm:grid-cols-2">
          <div class="flex flex-col gap-1.5 sm:col-span-2">
            <label for="eqName" class="text-sm font-medium text-slate-300">Name</label>
            <input
              pInputText
              id="eqName"
              formControlName="name"
              placeholder="Patient Monitor"
              class="w-full !rounded-xl !border-white/10 !bg-[#1a1d26] !py-2.5 !text-slate-100 placeholder:!text-slate-500"
            />
          </div>

          <div class="flex flex-col gap-1.5">
            <label for="eqCategory" class="text-sm font-medium text-slate-300">Category</label>
            <input
              pInputText
              id="eqCategory"
              formControlName="category"
              placeholder="Monitoring"
              class="w-full !rounded-xl !border-white/10 !bg-[#1a1d26] !py-2.5 !text-slate-100 placeholder:!text-slate-500"
            />
          </div>

          <div class="flex flex-col gap-1.5">
            <label for="eqManufacturer" class="text-sm font-medium text-slate-300">Manufacturer</label>
            <input
              pInputText
              id="eqManufacturer"
              formControlName="manufacturer"
              placeholder="Philips"
              class="w-full !rounded-xl !border-white/10 !bg-[#1a1d26] !py-2.5 !text-slate-100 placeholder:!text-slate-500"
            />
          </div>

          <div class="flex flex-col gap-1.5">
            <label for="eqModel" class="text-sm font-medium text-slate-300">
              Model <span class="text-slate-600">(optional)</span>
            </label>
            <input
              pInputText
              id="eqModel"
              formControlName="model"
              placeholder="MX450"
              class="w-full !rounded-xl !border-white/10 !bg-[#1a1d26] !py-2.5 !text-slate-100 placeholder:!text-slate-500"
            />
          </div>

          <div class="flex flex-col gap-1.5">
            <label for="eqSerial" class="text-sm font-medium text-slate-300">Serial number</label>
            <input
              pInputText
              id="eqSerial"
              formControlName="serialNumber"
              placeholder="SN-2024-001"
              class="w-full !rounded-xl !border-white/10 !bg-[#1a1d26] !py-2.5 !text-slate-100 placeholder:!text-slate-500"
            />
          </div>

          <div class="flex flex-col gap-1.5 sm:col-span-2">
            <label for="eqDepartment" class="text-sm font-medium text-slate-300">Department</label>
            <p-select
              inputId="eqDepartment"
              formControlName="department"
              [options]="departmentFormOptions()"
              optionLabel="label"
              optionValue="value"
              placeholder="Select department"
              styleClass="w-full !rounded-xl"
              [loading]="departmentsLoading()"
            />
          </div>

          <div class="flex flex-col gap-1.5">
            <label for="eqRoom" class="text-sm font-medium text-slate-300">
              Room location <span class="text-slate-600">(optional)</span>
            </label>
            <input
              pInputText
              id="eqRoom"
              formControlName="roomLocation"
              placeholder="ICU Bay 3"
              class="w-full !rounded-xl !border-white/10 !bg-[#1a1d26] !py-2.5 !text-slate-100 placeholder:!text-slate-500"
            />
          </div>

          <div class="flex flex-col gap-1.5">
            <label for="eqSupplier" class="text-sm font-medium text-slate-300">
              Supplier <span class="text-slate-600">(optional)</span>
            </label>
            <input
              pInputText
              id="eqSupplier"
              formControlName="supplier"
              placeholder="MedSupply Co."
              class="w-full !rounded-xl !border-white/10 !bg-[#1a1d26] !py-2.5 !text-slate-100 placeholder:!text-slate-500"
            />
          </div>

          <div class="flex flex-col gap-1.5">
            <label for="eqPurchaseDate" class="text-sm font-medium text-slate-300">
              Purchase date <span class="text-slate-600">(optional)</span>
            </label>
            <input
              id="eqPurchaseDate"
              type="date"
              formControlName="purchaseDate"
              class="w-full rounded-xl border border-white/10 bg-[#1a1d26] px-3 py-2.5 text-slate-100"
            />
          </div>

          <div class="flex flex-col gap-1.5">
            <label for="eqCost" class="text-sm font-medium text-slate-300">
              Cost <span class="text-slate-600">(optional)</span>
            </label>
            <input
              pInputText
              id="eqCost"
              type="number"
              min="0"
              step="0.01"
              formControlName="cost"
              placeholder="0.00"
              class="w-full !rounded-xl !border-white/10 !bg-[#1a1d26] !py-2.5 !text-slate-100 placeholder:!text-slate-500"
            />
          </div>

          <div class="flex flex-col gap-1.5">
            <label for="eqWarrantyStart" class="text-sm font-medium text-slate-300">
              Warranty start <span class="text-slate-600">(optional)</span>
            </label>
            <input
              id="eqWarrantyStart"
              type="date"
              formControlName="warrantyStartDate"
              class="w-full rounded-xl border border-white/10 bg-[#1a1d26] px-3 py-2.5 text-slate-100"
            />
          </div>

          <div class="flex flex-col gap-1.5">
            <label for="eqWarrantyEnd" class="text-sm font-medium text-slate-300">
              Warranty end <span class="text-slate-600">(optional)</span>
            </label>
            <input
              id="eqWarrantyEnd"
              type="date"
              formControlName="warrantyEndDate"
              class="w-full rounded-xl border border-white/10 bg-[#1a1d26] px-3 py-2.5 text-slate-100"
            />
          </div>

          <div class="flex flex-col gap-1.5">
            <label for="eqPmDays" class="text-sm font-medium text-slate-300">
              PM frequency (days) <span class="text-slate-600">(optional)</span>
            </label>
            <input
              pInputText
              id="eqPmDays"
              type="number"
              min="1"
              formControlName="pmFrequencyDays"
              placeholder="90"
              class="w-full !rounded-xl !border-white/10 !bg-[#1a1d26] !py-2.5 !text-slate-100 placeholder:!text-slate-500"
            />
          </div>

          <div class="flex flex-col gap-1.5">
            <label for="eqCalDays" class="text-sm font-medium text-slate-300">
              Calibration frequency (days) <span class="text-slate-600">(optional)</span>
            </label>
            <input
              pInputText
              id="eqCalDays"
              type="number"
              min="1"
              formControlName="calibrationFrequencyDays"
              placeholder="365"
              class="w-full !rounded-xl !border-white/10 !bg-[#1a1d26] !py-2.5 !text-slate-100 placeholder:!text-slate-500"
            />
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
            [label]="editing() ? 'Save Changes' : 'Create Equipment'"
            icon="pi pi-check"
            [loading]="saving()"
            [disabled]="form.invalid || saving()"
            styleClass="!rounded-xl !border-orange-500 !bg-orange-500 hover:!border-orange-400 hover:!bg-orange-400"
          />
        </div>
      </form>
    </p-dialog>

    <p-confirmdialog styleClass="app-dialog" />
  `,
})
export class EquipmentComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly equipmentService = inject(EquipmentService);
  private readonly departmentsService = inject(DepartmentsService);
  private readonly storeContext = inject(StoreContextService);
  private readonly auth = inject(AuthService);
  private readonly confirm = inject(ConfirmationService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly searchChanges$ = new Subject<string>();

  protected readonly pageSize = 10;

  readonly equipment = signal<Equipment[]>([]);
  readonly totalRecords = signal(0);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly departmentsLoading = signal(false);
  readonly formError = signal<string | null>(null);
  readonly searchInput = signal('');
  readonly editing = signal<Equipment | null>(null);
  readonly departmentFormOptions = signal<SelectOption[]>([]);
  readonly departmentFilterOptions = signal<SelectOption[]>([]);

  readonly canCreate = computed(() => this.storeContext.can('equipment:create'));
  readonly canEdit = computed(() => this.storeContext.can('equipment:edit'));
  readonly canDelete = computed(() => this.auth.isAdmin());

  departmentFilter: string | null = null;
  statusFilter: EquipmentStatus | null = null;

  dialogVisible = false;

  readonly statusFilterOptions: SelectOption<EquipmentStatus>[] = Object.values(EquipmentStatus).map(
    (status) => ({
      label: EQUIPMENT_STATUS_LABEL[status],
      value: status,
    }),
  );

  readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    category: ['', Validators.required],
    manufacturer: ['', Validators.required],
    model: [''],
    serialNumber: ['', Validators.required],
    department: ['', Validators.required],
    roomLocation: [''],
    supplier: [''],
    purchaseDate: [''],
    warrantyStartDate: [''],
    warrantyEndDate: [''],
    cost: [''],
    pmFrequencyDays: [''],
    calibrationFrequencyDays: [''],
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
        this.loadEquipment();
      });
  }

  onLazyLoad(event: TableLazyLoadEvent): void {
    this.currentPage = event.first! / event.rows! + 1;
    this.loadEquipment(event.rows ?? this.pageSize);
  }

  onSearchInput(event: Event): void {
    this.searchChanges$.next((event.target as HTMLInputElement).value);
  }

  onFiltersChanged(): void {
    this.currentPage = 1;
    this.loadEquipment();
  }

  openCreateDialog(): void {
    this.editing.set(null);
    this.formError.set(null);
    this.resetFormValues();
    this.dialogVisible = true;
    if (!this.departmentFormOptions().length) {
      this.loadDepartments();
    }
  }

  openEditDialog(item: Equipment): void {
    this.editing.set(item);
    this.formError.set(null);
    this.form.reset({
      name: item.name,
      category: item.category,
      manufacturer: item.manufacturer,
      model: item.model ?? '',
      serialNumber: item.serialNumber,
      department: this.departmentId(item),
      roomLocation: item.roomLocation ?? '',
      supplier: item.supplier ?? '',
      purchaseDate: this.toDateInput(item.purchaseDate),
      warrantyStartDate: this.toDateInput(item.warrantyStartDate),
      warrantyEndDate: this.toDateInput(item.warrantyEndDate),
      cost: item.cost != null ? String(item.cost) : '',
      pmFrequencyDays: item.pmFrequencyDays != null ? String(item.pmFrequencyDays) : '',
      calibrationFrequencyDays:
        item.calibrationFrequencyDays != null ? String(item.calibrationFrequencyDays) : '',
    });
    this.dialogVisible = true;
  }

  closeDialog(): void {
    this.dialogVisible = false;
  }

  resetForm(): void {
    this.resetFormValues();
    this.editing.set(null);
    this.formError.set(null);
    this.saving.set(false);
  }

  saveEquipment(): void {
    if (this.form.invalid || this.saving()) return;

    this.saving.set(true);
    this.formError.set(null);

    const payload = this.buildPayload();
    const editing = this.editing();
    const request = editing
      ? this.equipmentService.update(editing.id, payload)
      : this.equipmentService.create(payload);

    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.dialogVisible = false;
        this.loadEquipment();
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        this.formError.set(this.resolveError(err));
      },
    });
  }

  confirmDelete(item: Equipment): void {
    this.confirm.confirm({
      header: 'Delete Equipment',
      message: `Delete "${item.name}" (${item.assetNumber})? This action cannot be undone.`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-text',
      accept: () => {
        this.equipmentService.remove(item.id).subscribe({
          next: () => this.loadEquipment(),
        });
      },
    });
  }

  departmentLabel(item: Equipment): string {
    const department = item.department;
    if (typeof department === 'string') {
      return this.departmentNameById.get(department) ?? department;
    }
    return department.name;
  }

  private departmentId(item: Equipment): string {
    if (typeof item.department === 'string') return item.department;
    return item.department.id;
  }

  private loadEquipment(limit = this.pageSize): void {
    this.loading.set(true);

    this.equipmentService
      .list({
        page: this.currentPage,
        limit,
        search: this.searchInput().trim() || undefined,
        department: this.departmentFilter ?? undefined,
        status: this.statusFilter ?? undefined,
      })
      .subscribe({
        next: (res) => {
          this.equipment.set(res.data);
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
        const departments = res.data.map((dept) => normalizeDepartment(dept)).filter((d) => !!d.id);
        this.departmentNameById = new Map(departments.map((dept) => [dept.id, dept.name]));
        const options = departments.map((dept) => ({
          label: `${dept.name} (${dept.code})`,
          value: dept.id,
        }));
        this.departmentFormOptions.set(options);
        this.departmentFilterOptions.set(options);
        this.departmentsLoading.set(false);
      },
      error: () => this.departmentsLoading.set(false),
    });
  }

  private buildPayload(): CreateEquipmentDto {
    const raw = this.form.getRawValue();

    return {
      name: raw.name.trim(),
      category: raw.category.trim(),
      manufacturer: raw.manufacturer.trim(),
      model: raw.model.trim() || undefined,
      serialNumber: raw.serialNumber.trim(),
      department: raw.department,
      roomLocation: raw.roomLocation.trim() || undefined,
      supplier: raw.supplier.trim() || undefined,
      purchaseDate: raw.purchaseDate || undefined,
      warrantyStartDate: raw.warrantyStartDate || undefined,
      warrantyEndDate: raw.warrantyEndDate || undefined,
      cost: raw.cost ? Number(raw.cost) : undefined,
      pmFrequencyDays: raw.pmFrequencyDays ? Number(raw.pmFrequencyDays) : undefined,
      calibrationFrequencyDays: raw.calibrationFrequencyDays
        ? Number(raw.calibrationFrequencyDays)
        : undefined,
    };
  }

  private resetFormValues(): void {
    this.form.reset({
      name: '',
      category: '',
      manufacturer: '',
      model: '',
      serialNumber: '',
      department: '',
      roomLocation: '',
      supplier: '',
      purchaseDate: '',
      warrantyStartDate: '',
      warrantyEndDate: '',
      cost: '',
      pmFrequencyDays: '',
      calibrationFrequencyDays: '',
    });
  }

  private toDateInput(value?: string): string {
    if (!value) return '';
    return value.slice(0, 10);
  }

  private resolveError(err: HttpErrorResponse): string {
    const body = err.error as ApiErrorBody | undefined;
    const message = body?.message;

    if (Array.isArray(message)) {
      return message[0] ?? 'Unable to save equipment. Please try again.';
    }

    if (typeof message === 'string' && message.trim()) {
      return message;
    }

    return 'Unable to save equipment. Please try again.';
  }
}
