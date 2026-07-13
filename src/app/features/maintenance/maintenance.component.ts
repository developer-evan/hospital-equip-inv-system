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
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { TooltipModule } from 'primeng/tooltip';
import { Message } from 'primeng/message';

import { MaintenanceService } from '../../core/services/maintenance.service';
import { EquipmentService } from '../../core/services/equipment.service';
import { StoreContextService } from '../../core/services/store-context.service';
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
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';

interface SelectOption<T = string> {
  label: string;
  value: T;
}

@Component({
  selector: 'app-maintenance',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    Button,
    Dialog,
    Select,
    TableModule,
    ToggleSwitch,
    TooltipModule,
    Message,
    StatusBadgeComponent,
  ],
  template: `
    <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 class="text-xl font-semibold text-color">Maintenance</h2>
        <p class="mt-1 text-sm text-muted-color">Schedule and complete preventive, corrective and calibration work.</p>
      </div>
      @if (canCreate()) {
        <p-button type="button" icon="pi pi-plus" label="Schedule Maintenance" styleClass="!rounded-xl !border-orange-500 !bg-orange-500" (onClick)="openCreateDialog()" />
      }
    </div>

    <div class="overflow-hidden rounded-2xl border border-surface bg-surface-0 dark:bg-surface-900">
      <p-table [value]="records()" [loading]="loading()" [lazy]="true" [paginator]="true" [rows]="pageSize" [totalRecords]="totalRecords()" (onLazyLoad)="onLazyLoad($event)" styleClass="dashboard-table" paginatorStyleClass="dashboard-paginator" [rowHover]="true">
        <ng-template #caption>
          <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div class="flex items-center gap-3">
              <span class="text-sm text-muted-color">Show overdue only</span>
              <p-toggleswitch [(ngModel)]="overdueOnly" (ngModelChange)="onFiltersChanged()" />
            </div>
            <div class="flex flex-col gap-2 sm:flex-row">
              <p-select [options]="typeOptions" [(ngModel)]="typeFilter" optionLabel="label" optionValue="value" placeholder="All types" [showClear]="true" styleClass="w-full sm:w-44 !rounded-xl" (onChange)="onFiltersChanged()" />
              <p-select [options]="statusOptions" [(ngModel)]="statusFilter" optionLabel="label" optionValue="value" placeholder="All statuses" [showClear]="true" styleClass="w-full sm:w-44 !rounded-xl" (onChange)="onFiltersChanged()" />
            </div>
          </div>
        </ng-template>
        <ng-template #header>
          <tr>
            <th>Equipment</th>
            <th>Type</th>
            <th>Scheduled</th>
            <th>Engineer</th>
            <th>Status</th>
            <th class="!w-28"></th>
          </tr>
        </ng-template>
        <ng-template #body let-row>
          <tr>
            <td>
              <p class="font-medium text-color">{{ equipmentName(row) }}</p>
              <p class="text-xs text-muted-color">{{ equipmentAsset(row) }}</p>
            </td>
            <td class="text-sm text-muted-color">{{ typeLabel(row.type) }}</td>
            <td class="text-sm text-muted-color">{{ formatDate(row.scheduledDate) }}</td>
            <td class="text-sm text-muted-color">{{ engineerName(row) }}</td>
            <td><app-status-badge [status]="row.status" /></td>
            <td class="text-right">
              @if (canComplete(row)) {
                <p-button type="button" icon="pi pi-check-circle" [rounded]="true" [text]="true" pTooltip="Mark complete" (onClick)="openCompleteDialog(row)" />
              }
            </td>
          </tr>
        </ng-template>
        <ng-template #emptymessage>
          <tr><td colspan="6"><div class="py-14 text-center text-sm text-muted-color">No maintenance records found.</div></td></tr>
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
  `,
})
export class MaintenanceComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly maintenanceService = inject(MaintenanceService);
  private readonly equipmentService = inject(EquipmentService);
  private readonly storeContext = inject(StoreContextService);

  protected readonly pageSize = 10;
  readonly records = signal<MaintenanceRecord[]>([]);
  readonly totalRecords = signal(0);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly formError = signal<string | null>(null);
  readonly equipmentOptions = signal<SelectOption[]>([]);
  readonly selected = signal<MaintenanceRecord | null>(null);
  readonly canCreate = computed(() => this.storeContext.can('maintenance:create'));

  typeFilter: MaintenanceType | null = null;
  statusFilter: MaintenanceStatus | null = null;
  overdueOnly = false;
  createVisible = false;
  completeVisible = false;
  private currentPage = 1;

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
  readonly completeForm = this.fb.nonNullable.group({
    performedDate: [new Date().toISOString().slice(0, 10), Validators.required],
    serviceReport: ['', Validators.required],
  });

  ngOnInit(): void {
    this.loadEquipmentOptions();
  }

  onLazyLoad(event: TableLazyLoadEvent): void {
    this.currentPage = event.first! / event.rows! + 1;
    this.loadRecords(event.rows ?? this.pageSize);
  }

  onFiltersChanged(): void {
    this.currentPage = 1;
    this.loadRecords();
  }

  openCreateDialog(): void {
    this.formError.set(null);
    this.createForm.reset({ equipment: '', type: MaintenanceType.PREVENTIVE, scheduledDate: new Date().toISOString().slice(0, 10) });
    this.createVisible = true;
  }

  openCompleteDialog(row: MaintenanceRecord): void {
    this.selected.set(row);
    this.formError.set(null);
    this.completeForm.reset({ performedDate: new Date().toISOString().slice(0, 10), serviceReport: '' });
    this.completeVisible = true;
  }

  canComplete(row: MaintenanceRecord): boolean {
    return row.status !== MaintenanceStatus.COMPLETED && this.storeContext.can('maintenance:create');
  }

  submitCreate(): void {
    if (this.createForm.invalid || this.saving()) return;
    this.saving.set(true);
    this.formError.set(null);
    this.maintenanceService.create(this.createForm.getRawValue()).subscribe({
      next: () => { this.saving.set(false); this.createVisible = false; this.loadRecords(); },
      error: (err: HttpErrorResponse) => { this.saving.set(false); this.formError.set(this.resolveError(err)); },
    });
  }

  submitComplete(): void {
    const row = this.selected();
    if (!row || this.completeForm.invalid || this.saving()) return;
    this.saving.set(true);
    this.formError.set(null);
    this.maintenanceService.complete(row.id, this.completeForm.getRawValue()).subscribe({
      next: () => { this.saving.set(false); this.completeVisible = false; this.loadRecords(); },
      error: (err: HttpErrorResponse) => { this.saving.set(false); this.formError.set(this.resolveError(err)); },
    });
  }

  equipmentName(row: MaintenanceRecord): string {
    const eq = row.equipment;
    return typeof eq === 'string' ? eq : (eq as MaintenanceEquipmentRef).name;
  }

  equipmentAsset(row: MaintenanceRecord): string {
    const eq = row.equipment;
    return typeof eq === 'object' && eq && 'assetNumber' in eq ? eq.assetNumber ?? '' : '';
  }

  engineerName(row: MaintenanceRecord): string {
    if (!row.engineer) return '—';
    return typeof row.engineer === 'string' ? row.engineer : row.engineer.fullName;
  }

  typeLabel(type: MaintenanceType): string {
    return MAINTENANCE_TYPE_LABEL[type];
  }

  formatDate(value: string): string {
    return value ? new Date(value).toLocaleDateString() : '—';
  }

  private loadRecords(limit = this.pageSize): void {
    this.loading.set(true);
    this.maintenanceService.list({
      page: this.currentPage,
      limit,
      type: this.typeFilter ?? undefined,
      status: this.overdueOnly ? MaintenanceStatus.OVERDUE : (this.statusFilter ?? undefined),
    }).subscribe({
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
        this.equipmentOptions.set(res.data.map((e) => ({
          label: `${e.assetNumber} — ${e.name}`,
          value: e.id,
        })));
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
