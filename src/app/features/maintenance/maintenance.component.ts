import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ConfirmationService } from 'primeng/api';
import { Button } from 'primeng/button';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { Dialog } from 'primeng/dialog';
import { Select } from 'primeng/select';
import { SelectButton } from 'primeng/selectbutton';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { TooltipModule } from 'primeng/tooltip';
import { Message } from 'primeng/message';
import { ProgressSpinner } from 'primeng/progressspinner';
import { environment } from '../../../environments/environment';

import { MaintenanceService } from '../../core/services/maintenance.service';
import { EquipmentService } from '../../core/services/equipment.service';
import { DepartmentsService } from '../../core/services/departments.service';
import { StoreContextService } from '../../core/services/store-context.service';
import { AuthService } from '../../core/services/auth.service';
import { ApiErrorBody, PaginationMeta } from '../../core/models/common.model';
import {
  MAINTENANCE_STATUS_LABEL,
  MaintenanceEquipmentRef,
  MaintenanceRecord,
} from '../../core/models/maintenance.model';
import { MaintenanceStatus } from '../../core/models/maintenance-status.enum';
import {
  MAINTENANCE_TYPE_LABEL,
  MaintenanceType,
} from '../../core/models/maintenance-type.enum';
import { normalizeDepartment } from '../../core/utils/entity.util';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';

interface SelectOption<T = string> {
  label: string;
  value: T;
}

type MaintenanceViewMode = 'records' | 'schedule';

@Component({
  selector: 'app-maintenance',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ConfirmationService],
  imports: [
    FormsModule,
    ReactiveFormsModule,
    Button,
    ConfirmDialog,
    Dialog,
    Select,
    SelectButton,
    TableModule,
    ToggleSwitch,
    TooltipModule,
    Message,
    ProgressSpinner,
    StatusBadgeComponent,
  ],
  template: `
    <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 class="text-xl font-semibold text-color">Maintenance</h2>
        <p class="mt-1 text-sm text-muted-color">Schedule and complete preventive, corrective and calibration work.</p>
      </div>
      @if (canCreate()) {
        <p-button type="button" icon="pi pi-plus" label="Schedule Maintenance" styleClass="!rounded-xl !border-primary !bg-primary !text-primary-contrast" (onClick)="openCreateDialog()" />
      }
    </div>

    <div class="overflow-hidden rounded-2xl border border-surface bg-surface-0 dark:bg-surface-900">
      <p-table [value]="records()" [loading]="loading()" [lazy]="true" [paginator]="true" [rows]="pageSize" [totalRecords]="totalRecords()" (onLazyLoad)="onLazyLoad($event)" styleClass="dashboard-table" paginatorStyleClass="dashboard-paginator" [rowHover]="true">
        <ng-template #caption>
          <div class="flex flex-col gap-3">
            <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <p-selectbutton [options]="viewModeOptions" [(ngModel)]="viewMode" optionLabel="label" optionValue="value" (ngModelChange)="onViewModeChanged()" styleClass="!rounded-xl" />
              <div class="flex items-center gap-3">
                <span class="text-sm text-muted-color">Show overdue only</span>
                <p-toggleswitch [(ngModel)]="overdueOnly" (ngModelChange)="onFiltersChanged()" />
              </div>
            </div>
            <div class="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <p-select [options]="equipmentFilterOptions()" [(ngModel)]="equipmentFilter" optionLabel="label" optionValue="value" placeholder="All equipment" [showClear]="true" styleClass="w-full sm:w-52 !rounded-xl" (onChange)="onFiltersChanged()" />
              <p-select [options]="typeOptions" [(ngModel)]="typeFilter" optionLabel="label" optionValue="value" placeholder="All types" [showClear]="true" styleClass="w-full sm:w-44 !rounded-xl" (onChange)="onFiltersChanged()" />
              <p-select [options]="statusOptions" [(ngModel)]="statusFilter" optionLabel="label" optionValue="value" placeholder="All statuses" [showClear]="true" styleClass="w-full sm:w-44 !rounded-xl" (onChange)="onFiltersChanged()" [disabled]="overdueOnly" />
            </div>
          </div>
        </ng-template>
        <ng-template #header>
          <tr>
            <th>Equipment</th>
            <th>Department</th>
            <th>Type</th>
            <th>Scheduled</th>
            <th>Performed</th>
            <th>Next due</th>
            <th>Status</th>
            <th class="!w-44">Actions</th>
          </tr>
        </ng-template>
        <ng-template #body let-row>
          <tr>
            <td>
              <p class="font-medium text-color">{{ equipmentName(row) }}</p>
              <p class="text-xs text-muted-color">{{ equipmentAsset(row) }}</p>
            </td>
            <td class="text-sm text-muted-color">{{ departmentLabel(row) }}</td>
            <td class="text-sm text-muted-color">{{ typeLabel(row.type) }}</td>
            <td class="text-sm text-muted-color">{{ formatDate(row.scheduledDate) }}</td>
            <td class="text-sm text-muted-color">{{ formatDate(row.performedDate) }}</td>
            <td class="text-sm text-muted-color">{{ formatDate(row.nextDueDate) }}</td>
            <td><app-status-badge [status]="row.status" /></td>
            <td>
              <div class="flex items-center justify-end gap-1">
                <p-button type="button" icon="pi pi-eye" [rounded]="true" [text]="true" severity="secondary" styleClass="!size-8 !text-muted-color hover:!text-color" pTooltip="View details" tooltipPosition="left" (onClick)="openViewDialog(row)" />
                <p-button type="button" icon="pi pi-history" [rounded]="true" [text]="true" severity="secondary" styleClass="!size-8 !text-muted-color hover:!text-color" pTooltip="Equipment history" tooltipPosition="left" (onClick)="openHistoryDialog(row)" />
                @if (canEdit(row)) {
                  <p-button type="button" icon="pi pi-pencil" [rounded]="true" [text]="true" severity="secondary" styleClass="!size-8 !text-muted-color hover:!text-color" pTooltip="Edit" tooltipPosition="left" (onClick)="openEditDialog(row)" />
                }
                @if (canComplete(row)) {
                  <p-button type="button" icon="pi pi-check-circle" [rounded]="true" [text]="true" severity="success" styleClass="!size-8 !text-muted-color hover:!text-emerald-400" pTooltip="Mark complete" tooltipPosition="left" (onClick)="openCompleteDialog(row)" />
                }
                @if (canDelete()) {
                  <p-button type="button" icon="pi pi-trash" [rounded]="true" [text]="true" severity="danger" styleClass="!size-8 !text-muted-color hover:!text-rose-400" pTooltip="Delete" tooltipPosition="left" (onClick)="confirmDelete(row)" />
                }
              </div>
            </td>
          </tr>
        </ng-template>
        <ng-template #emptymessage>
          <tr><td colspan="8"><div class="py-14 text-center text-sm text-muted-color">No maintenance records found.</div></td></tr>
        </ng-template>
      </p-table>
    </div>

    <p-dialog [(visible)]="createVisible" header="Schedule Maintenance" [modal]="true" [style]="{ width: '28rem', maxWidth: '95vw' }" styleClass="app-dialog">
      @if (formError()) { <p-message severity="error" [text]="formError()!" styleClass="!mb-4 !w-full" /> }
      <form [formGroup]="createForm" (ngSubmit)="submitCreate()" class="flex flex-col gap-4">
        <p-select formControlName="equipment" [options]="equipmentOptions()" optionLabel="label" optionValue="value" placeholder="Equipment *" styleClass="w-full !rounded-xl" />
        <p-select formControlName="type" [options]="typeOptions" optionLabel="label" optionValue="value" placeholder="Type *" styleClass="w-full !rounded-xl" />
        <input type="date" formControlName="scheduledDate" class="rounded-xl border border-surface px-3 py-2.5" />
        <div class="flex justify-end gap-2">
          <p-button type="button" label="Cancel" [text]="true" (onClick)="createVisible = false" />
          <p-button type="submit" label="Schedule" icon="pi pi-check" [loading]="saving()" [disabled]="createForm.invalid || saving()" />
        </div>
      </form>
    </p-dialog>

    <p-dialog [(visible)]="editVisible" header="Edit Maintenance" [modal]="true" [style]="{ width: '28rem', maxWidth: '95vw' }" styleClass="app-dialog">
      @if (formError()) { <p-message severity="error" [text]="formError()!" styleClass="!mb-4 !w-full" /> }
      <form [formGroup]="editForm" (ngSubmit)="submitEdit()" class="flex flex-col gap-4">
        <div class="rounded-xl border border-surface bg-surface-50 px-3 py-2.5 dark:bg-surface-800">
          <p class="text-xs text-muted-color">Equipment</p>
          <p class="text-sm font-medium text-color">{{ selected() ? equipmentName(selected()!) : '' }}</p>
          <p class="text-xs text-muted-color">{{ selected() ? equipmentAsset(selected()!) : '' }}</p>
        </div>
        <p-select formControlName="type" [options]="typeOptions" optionLabel="label" optionValue="value" placeholder="Type *" styleClass="w-full !rounded-xl" />
        <input type="date" formControlName="scheduledDate" class="rounded-xl border border-surface px-3 py-2.5" />
        <div class="flex justify-end gap-2">
          <p-button type="button" label="Cancel" [text]="true" (onClick)="editVisible = false" />
          <p-button type="submit" label="Save changes" icon="pi pi-check" [loading]="saving()" [disabled]="editForm.invalid || saving()" />
        </div>
      </form>
    </p-dialog>

    <p-dialog [(visible)]="completeVisible" header="Complete Maintenance" [modal]="true" [style]="{ width: '28rem', maxWidth: '95vw' }" styleClass="app-dialog">
      @if (formError()) { <p-message severity="error" [text]="formError()!" styleClass="!mb-4 !w-full" /> }
      <form [formGroup]="completeForm" (ngSubmit)="submitComplete()" class="flex flex-col gap-4">
        <input type="date" formControlName="performedDate" class="rounded-xl border border-surface px-3 py-2.5" />
        <textarea formControlName="serviceReport" rows="4" placeholder="Service report *" class="rounded-xl border border-surface px-3 py-2.5"></textarea>
        <div class="flex justify-end gap-2">
          <p-button type="button" label="Cancel" [text]="true" (onClick)="completeVisible = false" />
          <p-button type="submit" label="Complete" icon="pi pi-check" [loading]="saving()" [disabled]="completeForm.invalid || saving()" />
        </div>
      </form>
    </p-dialog>

    <p-dialog [(visible)]="viewVisible" header="Maintenance Details" [modal]="true" [style]="{ width: '36rem', maxWidth: '95vw' }" styleClass="app-dialog">
      @if (formError()) { <p-message severity="error" [text]="formError()!" styleClass="!mb-4 !w-full" /> }
      @if (detailLoading()) {
        <div class="flex justify-center py-10"><p-progressspinner styleClass="!size-10" /></div>
      } @else if (detailRecord(); as record) {
        <div class="flex flex-col gap-4">
          <div class="grid gap-3 sm:grid-cols-2">
            <div>
              <p class="text-xs text-muted-color">Equipment</p>
              <p class="text-sm font-medium text-color">{{ equipmentName(record) }}</p>
              <p class="text-xs text-muted-color">{{ equipmentAsset(record) }}</p>
            </div>
            <div>
              <p class="text-xs text-muted-color">Department</p>
              <p class="text-sm text-color">{{ departmentLabel(record) }}</p>
            </div>
            <div>
              <p class="text-xs text-muted-color">Type</p>
              <p class="text-sm text-color">{{ typeLabel(record.type) }}</p>
            </div>
            <div>
              <p class="text-xs text-muted-color">Status</p>
              <app-status-badge [status]="record.status" />
            </div>
            <div>
              <p class="text-xs text-muted-color">Scheduled</p>
              <p class="text-sm text-color">{{ formatDate(record.scheduledDate) }}</p>
            </div>
            <div>
              <p class="text-xs text-muted-color">Performed</p>
              <p class="text-sm text-color">{{ formatDate(record.performedDate) }}</p>
            </div>
            <div>
              <p class="text-xs text-muted-color">Next due</p>
              <p class="text-sm text-color">{{ formatDate(record.nextDueDate) }}</p>
            </div>
            <div>
              <p class="text-xs text-muted-color">Last updated</p>
              <p class="text-sm text-color">{{ formatDateTime(record.updatedAt) }}</p>
            </div>
          </div>

          @if (record.serviceReport) {
            <div>
              <p class="mb-1 text-xs text-muted-color">Service report</p>
              <p class="rounded-xl border border-surface bg-surface-50 px-3 py-2.5 text-sm text-color dark:bg-surface-800">{{ record.serviceReport }}</p>
            </div>
          }

          <div>
            <div class="mb-2 flex items-center justify-between gap-2">
              <p class="text-xs text-muted-color">Photos</p>
              @if (canCreate()) {
                <label class="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-surface px-3 py-1.5 text-xs text-muted-color hover:text-color">
                  <i class="pi pi-upload"></i>
                  Upload
                  <input type="file" accept="image/*" multiple class="hidden" (change)="onPhotosSelected($event)" />
                </label>
              }
            </div>
            @if (uploading()) {
              <p class="text-xs text-muted-color">Uploading photos…</p>
            } @else if (record.photoUrls?.length) {
              <div class="flex flex-wrap gap-2">
                @for (url of record.photoUrls; track url) {
                  <a [href]="photoUrl(url)" target="_blank" rel="noopener noreferrer" class="block overflow-hidden rounded-xl border border-surface">
                    <img [src]="photoUrl(url)" alt="Maintenance photo" class="size-20 object-cover" />
                  </a>
                }
              </div>
            } @else {
              <p class="text-sm text-muted-color">No photos attached.</p>
            }
          </div>

          <div class="flex flex-wrap justify-end gap-2 border-t border-surface pt-4">
            <p-button type="button" label="Equipment history" icon="pi pi-history" [text]="true" (onClick)="openHistoryFromDetail(record)" />
            @if (canEdit(record)) {
              <p-button type="button" label="Edit" icon="pi pi-pencil" [text]="true" (onClick)="openEditFromDetail(record)" />
            }
            @if (canComplete(record)) {
              <p-button type="button" label="Complete" icon="pi pi-check-circle" (onClick)="openCompleteFromDetail(record)" />
            }
          </div>
        </div>
      }
    </p-dialog>

    <p-dialog [(visible)]="historyVisible" [header]="'History — ' + historyEquipment()" [modal]="true" [style]="{ width: '48rem', maxWidth: '95vw' }" styleClass="app-dialog">
      <p-table [value]="historyRecords()" [loading]="historyLoading()" styleClass="dashboard-table" [rowHover]="true">
        <ng-template #header>
          <tr>
            <th>Type</th>
            <th>Scheduled</th>
            <th>Performed</th>
            <th>Status</th>
            <th>Report</th>
            <th class="!w-16"></th>
          </tr>
        </ng-template>
        <ng-template #body let-row>
          <tr>
            <td class="text-sm text-muted-color">{{ typeLabel(row.type) }}</td>
            <td class="text-sm text-muted-color">{{ formatDate(row.scheduledDate) }}</td>
            <td class="text-sm text-muted-color">{{ formatDate(row.performedDate) }}</td>
            <td><app-status-badge [status]="row.status" /></td>
            <td class="max-w-[12rem] truncate text-sm text-muted-color" [pTooltip]="row.serviceReport ?? ''">{{ row.serviceReport ?? '—' }}</td>
            <td class="text-right">
              <p-button type="button" icon="pi pi-eye" [rounded]="true" [text]="true" pTooltip="View" (onClick)="openViewDialog(row)" />
            </td>
          </tr>
        </ng-template>
        <ng-template #emptymessage>
          <tr><td colspan="6"><div class="py-10 text-center text-sm text-muted-color">No maintenance history for this equipment.</div></td></tr>
        </ng-template>
      </p-table>
    </p-dialog>

    <p-confirmdialog styleClass="app-dialog" />
  `,
})
export class MaintenanceComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly maintenanceService = inject(MaintenanceService);
  private readonly equipmentService = inject(EquipmentService);
  private readonly departmentsService = inject(DepartmentsService);
  private readonly storeContext = inject(StoreContextService);
  private readonly auth = inject(AuthService);
  private readonly confirm = inject(ConfirmationService);

  protected readonly pageSize = 10;
  readonly records = signal<MaintenanceRecord[]>([]);
  readonly totalRecords = signal(0);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly uploading = signal(false);
  readonly detailLoading = signal(false);
  readonly historyLoading = signal(false);
  readonly formError = signal<string | null>(null);
  readonly equipmentOptions = signal<SelectOption[]>([]);
  readonly equipmentFilterOptions = signal<SelectOption[]>([]);
  readonly selected = signal<MaintenanceRecord | null>(null);
  readonly detailRecord = signal<MaintenanceRecord | null>(null);
  readonly historyRecords = signal<MaintenanceRecord[]>([]);
  readonly historyEquipment = signal('');
  readonly canCreate = computed(() => this.storeContext.can('maintenance:create'));
  readonly canDelete = computed(() => this.auth.isAdmin());

  viewMode: MaintenanceViewMode = 'records';
  readonly viewModeOptions: SelectOption<MaintenanceViewMode>[] = [
    { label: 'All records', value: 'records' },
    { label: 'Schedule', value: 'schedule' },
  ];

  typeFilter: MaintenanceType | null = null;
  statusFilter: MaintenanceStatus | null = null;
  equipmentFilter: string | null = null;
  overdueOnly = false;
  createVisible = false;
  editVisible = false;
  completeVisible = false;
  viewVisible = false;
  historyVisible = false;
  private currentPage = 1;
  private departmentNameById = new Map<string, string>();

  readonly typeOptions: SelectOption<MaintenanceType>[] = Object.values(MaintenanceType).map((t) => ({
    label: MAINTENANCE_TYPE_LABEL[t],
    value: t,
  }));
  readonly statusOptions: SelectOption<MaintenanceStatus>[] = Object.values(MaintenanceStatus).map((s) => ({
    label: MAINTENANCE_STATUS_LABEL[s],
    value: s,
  }));

  readonly createForm = this.fb.nonNullable.group({
    equipment: ['', Validators.required],
    type: [MaintenanceType.PREVENTIVE, Validators.required],
    scheduledDate: [new Date().toISOString().slice(0, 10), Validators.required],
  });
  readonly editForm = this.fb.nonNullable.group({
    type: [MaintenanceType.PREVENTIVE, Validators.required],
    scheduledDate: ['', Validators.required],
  });
  readonly completeForm = this.fb.nonNullable.group({
    performedDate: [new Date().toISOString().slice(0, 10), Validators.required],
    serviceReport: ['', Validators.required],
  });

  ngOnInit(): void {
    this.loadEquipmentOptions();
    this.loadDepartments();
  }

  onLazyLoad(event: TableLazyLoadEvent): void {
    this.currentPage = event.first! / event.rows! + 1;
    this.loadRecords(event.rows ?? this.pageSize);
  }

  onFiltersChanged(): void {
    this.currentPage = 1;
    this.loadRecords();
  }

  onViewModeChanged(): void {
    this.currentPage = 1;
    this.loadRecords();
  }

  openCreateDialog(): void {
    this.formError.set(null);
    this.createForm.reset({
      equipment: '',
      type: MaintenanceType.PREVENTIVE,
      scheduledDate: new Date().toISOString().slice(0, 10),
    });
    this.createVisible = true;
  }

  openEditDialog(row: MaintenanceRecord): void {
    this.selected.set(row);
    this.formError.set(null);
    this.editForm.reset({
      type: row.type,
      scheduledDate: row.scheduledDate.slice(0, 10),
    });
    this.editVisible = true;
  }

  openCompleteDialog(row: MaintenanceRecord): void {
    this.selected.set(row);
    this.formError.set(null);
    this.completeForm.reset({
      performedDate: new Date().toISOString().slice(0, 10),
      serviceReport: '',
    });
    this.completeVisible = true;
  }

  openViewDialog(row: MaintenanceRecord): void {
    this.detailRecord.set(null);
    this.detailLoading.set(true);
    this.formError.set(null);
    this.viewVisible = true;

    this.maintenanceService.getById(row.id).subscribe({
      next: (res) => {
        this.detailRecord.set(res.data);
        this.detailLoading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.detailLoading.set(false);
        this.formError.set(this.resolveError(err));
      },
    });
  }

  openHistoryDialog(row: MaintenanceRecord): void {
    this.historyEquipment.set(this.equipmentName(row));
    this.historyRecords.set([]);
    this.historyLoading.set(true);
    this.historyVisible = true;

    this.maintenanceService.getEquipmentHistory(this.equipmentId(row), { page: 1, limit: 50 }).subscribe({
      next: (res) => {
        this.historyRecords.set(res.data);
        this.historyLoading.set(false);
      },
      error: () => this.historyLoading.set(false),
    });
  }

  openEditFromDetail(record: MaintenanceRecord): void {
    this.viewVisible = false;
    this.openEditDialog(record);
  }

  openCompleteFromDetail(record: MaintenanceRecord): void {
    this.viewVisible = false;
    this.openCompleteDialog(record);
  }

  openHistoryFromDetail(record: MaintenanceRecord): void {
    this.openHistoryDialog(record);
  }

  canEdit(row: MaintenanceRecord): boolean {
    return row.status !== MaintenanceStatus.COMPLETED && this.canCreate();
  }

  canComplete(row: MaintenanceRecord): boolean {
    return row.status !== MaintenanceStatus.COMPLETED && this.canCreate();
  }

  submitCreate(): void {
    if (this.createForm.invalid || this.saving()) return;
    this.saving.set(true);
    this.formError.set(null);
    this.maintenanceService.create(this.createForm.getRawValue()).subscribe({
      next: () => {
        this.saving.set(false);
        this.createVisible = false;
        this.loadRecords();
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        this.formError.set(this.resolveError(err));
      },
    });
  }

  submitEdit(): void {
    const row = this.selected();
    if (!row || this.editForm.invalid || this.saving()) return;
    this.saving.set(true);
    this.formError.set(null);
    this.maintenanceService.update(row.id, this.editForm.getRawValue()).subscribe({
      next: () => {
        this.saving.set(false);
        this.editVisible = false;
        this.loadRecords();
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        this.formError.set(this.resolveError(err));
      },
    });
  }

  submitComplete(): void {
    const row = this.selected();
    if (!row || this.completeForm.invalid || this.saving()) return;
    this.saving.set(true);
    this.formError.set(null);
    this.maintenanceService.complete(row.id, this.completeForm.getRawValue()).subscribe({
      next: () => {
        this.saving.set(false);
        this.completeVisible = false;
        this.loadRecords();
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        this.formError.set(this.resolveError(err));
      },
    });
  }

  confirmDelete(row: MaintenanceRecord): void {
    this.confirm.confirm({
      header: 'Delete Maintenance',
      message: `Delete the ${this.typeLabel(row.type).toLowerCase()} maintenance for "${this.equipmentName(row)}"? This action cannot be undone.`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-text',
      accept: () => {
        this.maintenanceService.remove(row.id).subscribe({
          next: () => this.loadRecords(),
        });
      },
    });
  }

  onPhotosSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files ? Array.from(input.files) : [];
    const record = this.detailRecord();
    if (!files.length || !record || this.uploading()) return;

    this.uploading.set(true);
    this.formError.set(null);
    this.maintenanceService.uploadPhotos(record.id, files).subscribe({
      next: (res) => {
        this.detailRecord.set(res.data);
        this.uploading.set(false);
        input.value = '';
        this.loadRecords();
      },
      error: (err: HttpErrorResponse) => {
        this.uploading.set(false);
        this.formError.set(this.resolveError(err));
      },
    });
  }

  equipmentId(row: MaintenanceRecord): string {
    const eq = row.equipment;
    return typeof eq === 'string' ? eq : eq.id;
  }

  equipmentName(row: MaintenanceRecord): string {
    const eq = row.equipment;
    return typeof eq === 'string' ? eq : (eq as MaintenanceEquipmentRef).name;
  }

  equipmentAsset(row: MaintenanceRecord): string {
    const eq = row.equipment;
    return typeof eq === 'object' && eq && 'assetNumber' in eq ? eq.assetNumber ?? '' : '';
  }

  departmentLabel(row: MaintenanceRecord): string {
    const eq = row.equipment;
    if (typeof eq !== 'object' || !eq?.department) return '—';

    const department = eq.department;
    if (typeof department === 'string') {
      return this.departmentNameById.get(department) ?? department;
    }
    return department.name;
  }

  typeLabel(type: MaintenanceType): string {
    return MAINTENANCE_TYPE_LABEL[type];
  }

  formatDate(value?: string): string {
    return value ? new Date(value).toLocaleDateString() : '—';
  }

  formatDateTime(value?: string): string {
    return value ? new Date(value).toLocaleString() : '—';
  }

  photoUrl(url: string): string {
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `${environment.apiUrl}${url.startsWith('/') ? url : `/${url}`}`;
  }

  private loadRecords(limit = this.pageSize): void {
    this.loading.set(true);
    const query = {
      page: this.currentPage,
      limit,
      equipment: this.equipmentFilter ?? undefined,
      type: this.typeFilter ?? undefined,
      status: this.overdueOnly ? MaintenanceStatus.OVERDUE : (this.statusFilter ?? undefined),
    };

    const request =
      this.viewMode === 'schedule'
        ? this.maintenanceService.getSchedule(query)
        : this.maintenanceService.list(query);

    request.subscribe({
      next: (res) => {
        this.records.set(res.data);
        this.totalRecords.set((res.meta as PaginationMeta).totalItems ?? res.data.length);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  private loadEquipmentOptions(): void {
    this.equipmentService.list({ page: 1, limit: 100 }).subscribe({
      next: (res) => {
        const options = res.data.map((e) => ({
          label: `${e.assetNumber} — ${e.name}`,
          value: e.id,
        }));
        this.equipmentOptions.set(options);
        this.equipmentFilterOptions.set(options);
      },
    });
  }

  private loadDepartments(): void {
    this.departmentsService.active().subscribe({
      next: (res) => {
        const departments = res.data.map((dept) => normalizeDepartment(dept)).filter((d) => !!d.id);
        this.departmentNameById = new Map(departments.map((dept) => [dept.id, dept.name]));
      },
    });
  }

  private resolveError(err: HttpErrorResponse): string {
    const message = (err.error as ApiErrorBody | undefined)?.message;
    if (Array.isArray(message)) return message[0] ?? 'Request failed.';
    if (typeof message === 'string' && message.trim()) return message;
    return 'Request failed. Please try again.';
  }
}
