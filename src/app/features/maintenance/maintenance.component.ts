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
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ConfirmationService } from 'primeng/api';
import { Button } from 'primeng/button';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { DatePicker } from 'primeng/datepicker';
import { Dialog } from 'primeng/dialog';
import { Divider } from 'primeng/divider';
import { Select } from 'primeng/select';
import { SelectButton } from 'primeng/selectbutton';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { TooltipModule } from 'primeng/tooltip';
import { Message } from 'primeng/message';
import { Textarea } from 'primeng/textarea';

import { MaintenanceService } from '../../core/services/maintenance.service';
import { EquipmentService } from '../../core/services/equipment.service';
import { EquipmentLabelCacheService } from '../../core/services/equipment-label-cache.service';
import { DepartmentsService } from '../../core/services/departments.service';
import { UsersService } from '../../core/services/users.service';
import { StoreContextService } from '../../core/services/store-context.service';
import { AuthService } from '../../core/services/auth.service';
import { ApiErrorBody, PaginationMeta } from '../../core/models/common.model';
import {
  MAINTENANCE_STATUS_LABEL,
  MaintenanceEngineerRef,
  MaintenanceEquipmentRef,
  MaintenanceRecord,
} from '../../core/models/maintenance.model';
import { MaintenanceStatus } from '../../core/models/maintenance-status.enum';
import {
  MAINTENANCE_TYPE_LABEL,
  MaintenanceType,
  maintenanceTypeRequiresVerification,
} from '../../core/models/maintenance-type.enum';
import { normalizeDepartment } from '../../core/utils/entity.util';
import {
  maintenanceVerifierId,
  maintenanceVerifierRef,
} from '../../core/utils/maintenance-verifier.util';
import { switchMap } from 'rxjs';
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
    RouterLink,
    FormsModule,
    ReactiveFormsModule,
    Button,
    ConfirmDialog,
    DatePicker,
    Dialog,
    Divider,
    Select,
    SelectButton,
    TableModule,
    ToggleSwitch,
    TooltipModule,
    Message,
    Textarea,
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
            <th class="w-44!">Actions</th>
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
                <p-button type="button" icon="pi pi-eye" [rounded]="true" [text]="true" severity="secondary" styleClass="!size-8 !text-muted-color hover:!text-color" pTooltip="View details" tooltipPosition="left" (onClick)="viewRecord(row)" />
                <p-button type="button" icon="pi pi-history" [rounded]="true" [text]="true" severity="secondary" styleClass="!size-8 !text-muted-color hover:!text-color" pTooltip="Equipment history" tooltipPosition="left" (onClick)="openHistoryDialog(row)" />
                @if (canEdit(row)) {
                  <p-button type="button" icon="pi pi-pencil" [rounded]="true" [text]="true" severity="secondary" styleClass="!size-8 !text-muted-color hover:!text-color" pTooltip="Edit" tooltipPosition="left" (onClick)="openEditDialog(row)" />
                }
                @if (canComplete(row)) {
                  <p-button type="button" icon="pi pi-check-circle" [rounded]="true" [text]="true" severity="success" styleClass="!size-8 !text-muted-color hover:!text-emerald-400" pTooltip="Mark complete" tooltipPosition="left" (onClick)="openCompleteDialog(row)" />
                }
                @if (canVerify(row)) {
                  <p-button type="button" icon="pi pi-verified" [rounded]="true" [text]="true" severity="warn" styleClass="!size-8 !text-muted-color hover:!text-amber-400" pTooltip="Verify work" tooltipPosition="left" (onClick)="openVerifyDialog(row)" />
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
        <div class="flex flex-col gap-1.5">
          <label for="createEquipment" class="text-sm font-medium text-color">Equipment</label>
          <p-select inputId="createEquipment" formControlName="equipment" [options]="equipmentOptions()" optionLabel="label" optionValue="value" placeholder="Select equipment" styleClass="w-full !rounded-xl" />
        </div>
        <div class="flex flex-col gap-1.5">
          <label for="createType" class="text-sm font-medium text-color">Type</label>
          <p-select inputId="createType" formControlName="type" [options]="typeOptions" optionLabel="label" optionValue="value" placeholder="Select type" styleClass="w-full !rounded-xl" />
        </div>
        <div class="flex flex-col gap-1.5">
          <label for="createScheduled" class="text-sm font-medium text-color">Scheduled date</label>
          <p-datepicker inputId="createScheduled" formControlName="scheduledDate" [showIcon]="true" dateFormat="yy-mm-dd" styleClass="w-full" inputStyleClass="w-full !rounded-xl" />
        </div>
        @if (createForm.controls.type.value && maintenanceTypeRequiresVerification(createForm.controls.type.value)) {
          <div class="flex flex-col gap-1.5">
            <label for="createVerifier" class="text-sm font-medium text-color">Verification in charge</label>
            <p-select inputId="createVerifier" formControlName="engineer" [options]="verificationAssigneeOptions()" optionLabel="label" optionValue="value" placeholder="Select verifier" styleClass="w-full !rounded-xl" />
            @if (!verificationAssigneeOptions().length) {
              <p-message severity="warn" styleClass="!w-full" text="No verifiers listed yet. Ask an administrator to add active users under Users, or pick from the full user list if you are an admin." />
              @if (auth.isAdmin()) {
                <a routerLink="/users" class="text-sm text-primary hover:underline" (click)="createVisible = false">Open Users →</a>
              }
            }
          </div>
        }
        <p-divider />
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
        <p-select formControlName="type" [options]="typeOptions" optionLabel="label" optionValue="value" placeholder="Select type" styleClass="w-full !rounded-xl" />
        <div class="flex flex-col gap-1.5">
          <label for="editScheduled" class="text-sm font-medium text-color">Scheduled date</label>
          <p-datepicker inputId="editScheduled" formControlName="scheduledDate" [showIcon]="true" dateFormat="yy-mm-dd" styleClass="w-full" inputStyleClass="w-full !rounded-xl" />
        </div>
        @if (editForm.controls.type.value && maintenanceTypeRequiresVerification(editForm.controls.type.value)) {
          <div class="rounded-xl border border-surface bg-surface-50 px-3 py-2.5 dark:bg-surface-800">
            <p class="text-xs font-medium text-muted-color">Verification in charge</p>
            @if (selected() && maintenanceVerifierId(selected()!)) {
              <p class="mt-1 text-sm text-color">{{ personName(maintenanceVerifierRef(selected()!)) }}</p>
            } @else {
              <p class="mt-1 text-sm text-muted-color">Not assigned yet</p>
              <p class="mt-2 text-xs text-muted-color">
                Choose a verifier when scheduling, on <strong class="text-color">Complete</strong>, or set below and save.
              </p>
              <p-select
                inputId="editEngineer"
                formControlName="engineer"
                [options]="verificationAssigneeOptions()"
                optionLabel="label"
                optionValue="value"
                placeholder="Assign verifier"
                styleClass="mt-2 w-full !rounded-xl"
              />
            }
          </div>
        }
        <p-divider />
        <div class="flex justify-end gap-2">
          <p-button type="button" label="Cancel" [text]="true" (onClick)="editVisible = false" />
          <p-button type="submit" label="Save changes" icon="pi pi-check" [loading]="saving()" [disabled]="editForm.invalid || saving()" />
        </div>
      </form>
    </p-dialog>

    <p-dialog [(visible)]="completeVisible" header="Complete Maintenance" [modal]="true" [style]="{ width: '28rem', maxWidth: '95vw' }" styleClass="app-dialog">
      @if (formError()) { <p-message severity="error" [text]="formError()!" styleClass="!mb-4 !w-full" /> }
      <form [formGroup]="completeForm" (ngSubmit)="submitComplete()" class="flex flex-col gap-4">
        <div class="flex flex-col gap-1.5">
          <label for="completePerformed" class="text-sm font-medium text-color">Performed date</label>
          <p-datepicker inputId="completePerformed" formControlName="performedDate" [showIcon]="true" dateFormat="yy-mm-dd" styleClass="w-full" inputStyleClass="w-full !rounded-xl" />
        </div>
        <div class="flex flex-col gap-1.5">
          <label for="completeReport" class="text-sm font-medium text-color">Service report</label>
          <textarea pTextarea id="completeReport" formControlName="serviceReport" rows="4" placeholder="Describe work performed…" class="w-full !rounded-xl"></textarea>
        </div>
        @if (completeNeedsVerifierPicker()) {
          <div class="flex flex-col gap-1.5">
            <label for="completeVerifier" class="text-sm font-medium text-color">Verification in charge</label>
            <p-select inputId="completeVerifier" formControlName="engineer" [options]="verificationAssigneeOptions()" optionLabel="label" optionValue="value" placeholder="Select verifier" styleClass="w-full !rounded-xl" />
            @if (!verificationAssigneeOptions().length) {
              <p-message severity="warn" styleClass="!w-full" text="Add a verifier via Edit on this record, or ask an admin to create active users who can sign off PM/calibration work." />
            }
          </div>
        } @else if (selected() && maintenanceTypeRequiresVerification(selected()!.type)) {
          <p class="text-sm text-muted-color">
            Verification in charge: <strong class="text-color">{{ personName(maintenanceVerifierRef(selected()!)) }}</strong>
          </p>
        }
        <p-divider />
        <div class="flex justify-end gap-2">
          <p-button type="button" label="Cancel" [text]="true" (onClick)="completeVisible = false" />
          <p-button type="submit" label="Complete" icon="pi pi-check" [loading]="saving()" [disabled]="completeForm.invalid || saving()" />
        </div>
      </form>
    </p-dialog>

    <p-dialog [(visible)]="verifyVisible" header="Verify Maintenance" [modal]="true" [style]="{ width: '28rem', maxWidth: '95vw' }" styleClass="app-dialog">
      @if (formError()) { <p-message severity="error" [text]="formError()!" styleClass="!mb-4 !w-full" /> }
      <form [formGroup]="verifyForm" (ngSubmit)="submitVerify()" class="flex flex-col gap-4">
        <p class="text-sm text-muted-color">
          Confirm that preventive/calibration work for
          <strong class="text-color">{{ selected() ? equipmentName(selected()!) : '' }}</strong>
          meets requirements.
        </p>
        <div class="flex flex-col gap-1.5">
          <label for="verifyNotes" class="text-sm font-medium text-color">Verification notes <span class="text-muted-color">(optional)</span></label>
          <textarea pTextarea id="verifyNotes" formControlName="verificationNotes" rows="3" placeholder="Optional sign-off notes…" class="w-full !rounded-xl"></textarea>
        </div>
        <p-divider />
        <div class="flex justify-end gap-2">
          <p-button type="button" label="Cancel" [text]="true" (onClick)="verifyVisible = false" />
          <p-button type="submit" label="Verify" icon="pi pi-verified" [loading]="saving()" [disabled]="verifyForm.invalid || saving()" />
        </div>
      </form>
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
              <p-button type="button" icon="pi pi-eye" [rounded]="true" [text]="true" pTooltip="View" (onClick)="viewRecord(row)" />
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
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly maintenanceService = inject(MaintenanceService);
  private readonly equipmentService = inject(EquipmentService);
  private readonly equipmentLabels = inject(EquipmentLabelCacheService);
  private readonly departmentsService = inject(DepartmentsService);
  private readonly usersService = inject(UsersService);
  private readonly storeContext = inject(StoreContextService);
  protected readonly auth = inject(AuthService);
  private readonly confirm = inject(ConfirmationService);

  protected readonly maintenanceTypeRequiresVerification = maintenanceTypeRequiresVerification;
  protected readonly maintenanceVerifierRef = maintenanceVerifierRef;
  protected readonly maintenanceVerifierId = maintenanceVerifierId;

  protected readonly pageSize = 10;
  readonly records = signal<MaintenanceRecord[]>([]);
  readonly totalRecords = signal(0);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly historyLoading = signal(false);
  readonly formError = signal<string | null>(null);
  readonly equipmentOptions = signal<SelectOption[]>([]);
  readonly equipmentFilterOptions = signal<SelectOption[]>([]);
  readonly verificationAssigneeOptions = signal<SelectOption[]>([]);
  readonly selected = signal<MaintenanceRecord | null>(null);
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
  verifyVisible = false;
  historyVisible = false;
  private currentPage = 1;
  private departmentNameById = new Map<string, string>();
  private prefillEquipmentId: string | null = null;

  readonly typeOptions: SelectOption<MaintenanceType>[] = Object.values(MaintenanceType).map((t) => ({
    label: MAINTENANCE_TYPE_LABEL[t],
    value: t,
  }));
  readonly statusOptions: SelectOption<MaintenanceStatus>[] = Object.values(MaintenanceStatus).map((s) => ({
    label: MAINTENANCE_STATUS_LABEL[s],
    value: s,
  }));

  readonly createForm = this.fb.group({
    equipment: ['', Validators.required],
    type: [MaintenanceType.PREVENTIVE, Validators.required],
    scheduledDate: [new Date(), Validators.required],
    engineer: [''],
  });
  readonly editForm = this.fb.group({
    type: [MaintenanceType.PREVENTIVE, Validators.required],
    scheduledDate: [null as Date | null, Validators.required],
    engineer: [''],
  });
  readonly completeForm = this.fb.group({
    performedDate: [new Date(), Validators.required],
    serviceReport: ['', Validators.required],
    engineer: [''],
  });

  readonly verifyForm = this.fb.group({
    verificationNotes: [''],
  });

  ngOnInit(): void {
    this.prefillEquipmentId = this.route.snapshot.queryParamMap.get('equipment');
    this.loadEquipmentOptions();
    this.loadDepartments();
    this.loadVerificationAssignees();
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
      scheduledDate: new Date(),
      engineer: '',
    });
    this.createVisible = true;
  }

  openEditDialog(row: MaintenanceRecord): void {
    this.selected.set(row);
    this.formError.set(null);
    this.editForm.reset({
      type: row.type,
      scheduledDate: new Date(row.scheduledDate),
      engineer: maintenanceVerifierId(row) ?? '',
    });
    this.editVisible = true;
  }

  openCompleteDialog(row: MaintenanceRecord): void {
    this.selected.set(row);
    this.formError.set(null);
    this.completeForm.reset({
      performedDate: new Date(),
      serviceReport: '',
      engineer: maintenanceVerifierId(row) ?? '',
    });
    this.completeVisible = true;
  }

  openVerifyDialog(row: MaintenanceRecord): void {
    this.selected.set(row);
    this.formError.set(null);
    this.verifyForm.reset({ verificationNotes: '' });
    this.verifyVisible = true;
  }

  completeNeedsVerifierPicker(): boolean {
    const row = this.selected();
    return !!row && maintenanceTypeRequiresVerification(row.type) && !maintenanceVerifierId(row);
  }

  viewRecord(row: MaintenanceRecord): void {
    this.router.navigate(['/maintenance', row.id]);
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

  canEdit(row: MaintenanceRecord): boolean {
    return (
      row.status !== MaintenanceStatus.COMPLETED &&
      row.status !== MaintenanceStatus.PENDING_VERIFICATION &&
      this.canCreate()
    );
  }

  canComplete(row: MaintenanceRecord): boolean {
    return (
      row.status !== MaintenanceStatus.COMPLETED &&
      row.status !== MaintenanceStatus.PENDING_VERIFICATION &&
      this.canCreate()
    );
  }

  canVerify(row: MaintenanceRecord): boolean {
    if (row.status !== MaintenanceStatus.PENDING_VERIFICATION) return false;
    const user = this.auth.currentUser();
    if (!user) return false;
    if (this.auth.isAdmin()) return true;
    return maintenanceVerifierId(row) === user.id;
  }

  personName(ref?: string | MaintenanceEngineerRef): string {
    if (!ref) return '—';
    if (typeof ref === 'string') return ref;
    return ref.fullName || '—';
  }

  protected userRefId(ref?: string | MaintenanceEngineerRef): string | undefined {
    if (!ref) return undefined;
    return typeof ref === 'string' ? ref : ref.id;
  }

  submitCreate(): void {
    if (this.createForm.invalid || this.saving()) return;
    const raw = this.createForm.getRawValue();
    this.formError.set(null);
    if (maintenanceTypeRequiresVerification(raw.type!) && !raw.engineer) {
      this.formError.set('Verification in charge is required for preventive and calibration work.');
      return;
    }
    this.saving.set(true);
    this.maintenanceService
      .create({
        equipment: raw.equipment!,
        type: raw.type!,
        scheduledDate: this.formatDateInput(raw.scheduledDate),
        engineer: raw.engineer || undefined,
      })
      .subscribe({
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
    const raw = this.editForm.getRawValue();
    this.saving.set(true);
    this.formError.set(null);
    this.maintenanceService
      .update(row.id, {
        type: raw.type!,
        scheduledDate: this.formatDateInput(raw.scheduledDate),
        engineer: raw.engineer || undefined,
      })
      .subscribe({
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
    const raw = this.completeForm.getRawValue();
    this.formError.set(null);
    const needsVerifier = this.completeNeedsVerifierPicker();
    const engineerId = raw.engineer?.trim();
    if (needsVerifier && !engineerId) {
      this.formError.set('Select the verification in charge before completing.');
      return;
    }
    this.saving.set(true);
    const completePayload = {
      performedDate: this.formatDateInput(raw.performedDate),
      serviceReport: raw.serviceReport!,
    };
    const complete$ = this.maintenanceService.complete(row.id, completePayload);
    const request =
      needsVerifier && engineerId
        ? this.maintenanceService.update(row.id, { engineer: engineerId }).pipe(switchMap(() => complete$))
        : complete$;

    request.subscribe({
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

  submitVerify(): void {
    const row = this.selected();
    if (!row || this.saving()) return;
    this.saving.set(true);
    this.formError.set(null);
    const notes = this.verifyForm.getRawValue().verificationNotes?.trim();
    this.maintenanceService.verify(row.id, notes ? { verificationNotes: notes } : {}).subscribe({
      next: () => {
        this.saving.set(false);
        this.verifyVisible = false;
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

  equipmentId(row: MaintenanceRecord): string {
    const eq = row.equipment;
    return typeof eq === 'string' ? eq : eq.id;
  }

  equipmentName(row: MaintenanceRecord): string {
    return this.equipmentLabels.displayFor(row.equipment).name;
  }

  equipmentAsset(row: MaintenanceRecord): string {
    return this.equipmentLabels.displayFor(row.equipment).assetNumber;
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

  private formatDateInput(value: Date | null): string {
    if (!value) return '';
    return value.toISOString().slice(0, 10);
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

        const prefill = this.prefillEquipmentId;
        if (prefill && options.some((o) => o.value === prefill)) {
          this.equipmentFilter = prefill;
          this.prefillEquipmentId = null;
          if (this.canCreate()) {
            this.createForm.patchValue({ equipment: prefill });
            this.createVisible = true;
          }
          this.currentPage = 1;
          this.loadRecords();
        }
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

  private loadVerificationAssignees(): void {
    if (!this.canCreate()) return;
    this.usersService.verificationAssigneeOptions().subscribe({
      next: (options) => this.verificationAssigneeOptions.set(options),
    });
  }

  private resolveError(err: HttpErrorResponse): string {
    const message = (err.error as ApiErrorBody | undefined)?.message;
    if (Array.isArray(message)) return message[0] ?? 'Request failed.';
    if (typeof message === 'string' && message.trim()) return message;
    return 'Request failed. Please try again.';
  }
}
