import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  OnInit,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom, of, switchMap } from 'rxjs';
import { ConfirmationService } from 'primeng/api';
import { Button } from 'primeng/button';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { DatePicker } from 'primeng/datepicker';
import { Dialog } from 'primeng/dialog';
import { Divider } from 'primeng/divider';
import { FileSelectEvent, FileUpload } from 'primeng/fileupload';
import { InputText } from 'primeng/inputtext';
import { Message } from 'primeng/message';
import { Panel } from 'primeng/panel';
import { ProgressSpinner } from 'primeng/progressspinner';
import { Select } from 'primeng/select';
import { Skeleton } from 'primeng/skeleton';
import { Tag } from 'primeng/tag';
import { Toolbar } from 'primeng/toolbar';
import { Timeline } from 'primeng/timeline';
import { TableModule } from 'primeng/table';
import { Textarea } from 'primeng/textarea';
import { TooltipModule } from 'primeng/tooltip';

import { EquipmentService } from '../../core/services/equipment.service';
import { ReceivingService } from '../../core/services/receiving.service';
import { MaintenanceService } from '../../core/services/maintenance.service';
import { DepartmentsService } from '../../core/services/departments.service';
import { StoreContextService } from '../../core/services/store-context.service';
import { AuthService } from '../../core/services/auth.service';
import { ApiErrorBody } from '../../core/models/common.model';
import { EquipmentStatus } from '../../core/models/equipment-status.enum';
import { ReceivingHistoryEntry } from '../../core/models/receiving-history.model';
import { MaintenanceRecord } from '../../core/models/maintenance.model';
import { MAINTENANCE_TYPE_LABEL } from '../../core/models/maintenance-type.enum';
import { nextEquipmentStatuses } from '../../core/utils/equipment-transitions.util';
import {
  CreateEquipmentDto,
  EQUIPMENT_STATUS_LABEL,
  Equipment,
  EquipmentDepartmentRef,
} from '../../core/models/equipment.model';
import { normalizeDepartment } from '../../core/utils/entity.util';
import { resolveAssetUrl } from '../../core/utils/asset-url.util';
import { AssetImageComponent } from '../../shared/components/asset-image/asset-image.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';

interface SelectOption<T = string> {
  label: string;
  value: T;
}

@Component({
  selector: 'app-equipment-detail',
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
    FileUpload,
    InputText,
    Message,
    Panel,
    ProgressSpinner,
    Select,
    Skeleton,
    Tag,
    Toolbar,
    Timeline,
    TableModule,
    Textarea,
    TooltipModule,
    AssetImageComponent,
    StatusBadgeComponent,
  ],
  template: `
    <p-toolbar styleClass="!mb-6 !rounded-2xl !border !border-surface !bg-surface-0 dark:!bg-surface-900 !px-4 !py-3">
      <ng-template #start>
        <p-button routerLink="/equipment" icon="pi pi-arrow-left" label="Back" [text]="true" severity="secondary" styleClass="!text-muted-color hover:!text-color" />
      </ng-template>
      <ng-template #end>
        @if (item(); as eq) {
          <div class="flex flex-wrap justify-end gap-2">
            @if (canScheduleMaintenance()) {
              <p-button type="button" label="Maintenance" icon="pi pi-wrench" [outlined]="true" styleClass="!rounded-xl" [routerLink]="['/maintenance']" [queryParams]="{ equipment: eq.id }" />
            }
            @if (canConfirmInstallation(eq)) {
              <p-button type="button" label="Confirm install" icon="pi pi-check-circle" styleClass="!rounded-xl !border-primary !bg-primary !text-primary-contrast" (onClick)="openConfirmInstallDialog()" />
            }
            @if (canChangeStatus() && statusTransitionOptions().length) {
              <p-button type="button" label="Change status" icon="pi pi-sync" [outlined]="true" styleClass="!rounded-xl" (onClick)="openStatusDialog()" />
            }
            @if (canEdit()) {
              <p-button type="button" label="Edit" icon="pi pi-pencil" [outlined]="true" styleClass="!rounded-xl" (onClick)="openEditDialog()" />
            }
            @if (canRegenerateQr()) {
              <p-button type="button" label="Regenerate QR" icon="pi pi-refresh" [outlined]="true" styleClass="!rounded-xl" [loading]="regeneratingQr()" (onClick)="regenerateQrCode()" />
            }
            @if (canDelete()) {
              <p-button type="button" label="Delete" icon="pi pi-trash" severity="danger" [outlined]="true" styleClass="!rounded-xl" (onClick)="confirmDelete(eq)" />
            }
          </div>
        }
      </ng-template>
    </p-toolbar>

    @if (loadError()) {
      <p-message severity="error" [text]="loadError()!" styleClass="!mb-4 !w-full" />
    }

    @if (loading()) {
      <div class="grid gap-4 lg:grid-cols-3">
        <div class="flex flex-col gap-4 lg:col-span-2">
          <p-skeleton height="16rem" styleClass="!rounded-2xl" />
          <p-skeleton height="8rem" styleClass="!rounded-2xl" />
        </div>
        <p-skeleton height="20rem" styleClass="!rounded-2xl" />
      </div>
    } @else if (item(); as eq) {
      <div class="mb-6 flex flex-wrap items-center gap-3">
        <h2 class="text-xl font-semibold text-color">{{ eq.name }}</h2>
        <app-status-badge [status]="eq.status" />
        <p-tag [value]="eq.category" severity="info" styleClass="!text-xs" />
        <span class="font-mono text-xs text-muted-color">{{ eq.assetNumber }}</span>
      </div>

      <div class="grid gap-4 lg:grid-cols-3">
        <div class="flex flex-col gap-4 lg:col-span-2">
          <p-panel header="Asset details" [toggleable]="false" styleClass="detail-panel">
            <div class="grid gap-4 sm:grid-cols-2">
              @for (field of detailFields(eq); track field.label) {
                <div>
                  <p class="text-xs font-medium uppercase tracking-wide text-muted-color">{{ field.label }}</p>
                  <p class="mt-1 text-sm text-color">{{ field.value }}</p>
                </div>
              }
            </div>
          </p-panel>

          <p-panel header="Maintenance schedule" [toggleable]="false" styleClass="detail-panel">
            <div class="grid gap-4 sm:grid-cols-2">
              <div>
                <p class="text-xs font-medium uppercase tracking-wide text-muted-color">PM frequency</p>
                <p class="mt-1 text-sm text-color">{{ eq.pmFrequencyDays ? eq.pmFrequencyDays + ' days' : '—' }}</p>
              </div>
              <div>
                <p class="text-xs font-medium uppercase tracking-wide text-muted-color">Calibration frequency</p>
                <p class="mt-1 text-sm text-color">{{ eq.calibrationFrequencyDays ? eq.calibrationFrequencyDays + ' days' : '—' }}</p>
              </div>
              <div>
                <p class="text-xs font-medium uppercase tracking-wide text-muted-color">Installation date</p>
                <p class="mt-1 text-sm text-color">{{ formatDate(eq.installationDate) }}</p>
              </div>
              <div>
                <p class="text-xs font-medium uppercase tracking-wide text-muted-color">Last updated</p>
                <p class="mt-1 text-sm text-color">{{ formatDateTime(eq.updatedAt) }}</p>
              </div>
            </div>
          </p-panel>

          <p-panel header="Status history" [toggleable]="false" styleClass="detail-panel">
            @if (historyLoading()) {
              <p-progressspinner styleClass="!size-8" />
            } @else if (statusHistory().length) {
              <p-timeline [value]="statusHistory()" align="left" styleClass="equipment-timeline">
                <ng-template #content let-entry>
                  <div class="pb-4">
                    <p class="text-sm font-medium text-color">
                      {{ statusHistoryLabel(entry) }}
                    </p>
                    <p class="mt-0.5 text-xs text-muted-color">
                      {{ formatDateTime(entry.changedAt) }} · {{ changedByLabel(entry) }}
                    </p>
                    @if (entry.note) {
                      <p class="mt-1 text-sm text-muted-color">{{ entry.note }}</p>
                    }
                  </div>
                </ng-template>
              </p-timeline>
            } @else {
              <p-message severity="secondary" text="No status changes recorded yet." styleClass="!w-full" />
            }
          </p-panel>

          <p-panel header="Maintenance history" [toggleable]="false" styleClass="detail-panel">
            @if (maintenanceLoading()) {
              <p-progressspinner styleClass="!size-8" />
            } @else if (maintenanceHistory().length) {
              <p-table [value]="maintenanceHistory()" styleClass="dashboard-table" [rowHover]="true">
                <ng-template #header>
                  <tr>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Scheduled</th>
                    <th class="!w-24"></th>
                  </tr>
                </ng-template>
                <ng-template #body let-row>
                  <tr>
                    <td class="text-sm">{{ maintenanceTypeLabel(row.type) }}</td>
                    <td><app-status-badge [status]="row.status" /></td>
                    <td class="text-sm text-muted-color">{{ formatDate(row.scheduledDate) }}</td>
                    <td class="text-right">
                      <p-button type="button" icon="pi pi-eye" [rounded]="true" [text]="true" severity="secondary" styleClass="!size-8" [routerLink]="['/maintenance', row.id]" />
                    </td>
                  </tr>
                </ng-template>
              </p-table>
            } @else {
              <p-message severity="secondary" text="No maintenance records for this asset." styleClass="!w-full" />
            }
          </p-panel>

          <p-panel header="Photos" [toggleable]="false" styleClass="detail-panel">
            <div class="mb-4 flex items-center gap-3">
              @if (canUploadMedia()) {
                <p-fileupload mode="basic" chooseLabel="Upload photos" chooseIcon="pi pi-upload" accept="image/*" [multiple]="true" [disabled]="uploadingPhotos()" chooseStyleClass="!rounded-xl" (onSelect)="onPhotosSelected($event)" />
              }
              @if (uploadingPhotos()) { <p-progressspinner styleClass="!size-6" /> }
            </div>
            @if (eq.photoUrls?.length) {
              <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
                @for (url of eq.photoUrls; track url) {
                  <div class="overflow-hidden rounded-xl border border-surface">
                    <app-asset-image [src]="url" alt="Equipment photo" />
                  </div>
                }
              </div>
            } @else if (!uploadingPhotos()) {
              <p-message severity="secondary" text="No photos attached." styleClass="!w-full" />
            }
          </p-panel>

          <p-panel header="Manuals & documents" [toggleable]="false" styleClass="detail-panel">
            <div class="mb-4 flex items-center gap-3">
              @if (canUploadMedia()) {
                <p-fileupload mode="basic" chooseLabel="Upload manual" chooseIcon="pi pi-file-pdf" accept=".pdf,.doc,.docx,application/pdf" [disabled]="uploadingManual()" chooseStyleClass="!rounded-xl" (onSelect)="onManualSelected($event)" />
              }
              @if (uploadingManual()) { <p-progressspinner styleClass="!size-6" /> }
            </div>
            @if (eq.manualUrls?.length) {
              <ul class="flex flex-col gap-2">
                @for (url of eq.manualUrls; track url; let i = $index) {
                  <li>
                    <a [href]="resolveAssetUrl(url)" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-2 text-sm text-primary hover:underline">
                      <i class="pi pi-file-pdf"></i>
                      Manual {{ i + 1 }}
                    </a>
                  </li>
                }
              </ul>
            } @else if (!uploadingManual()) {
              <p-message severity="secondary" text="No manuals uploaded." styleClass="!w-full" />
            }
          </p-panel>
        </div>

        <p-panel header="QR code" [toggleable]="false" styleClass="detail-panel">
          @if (formError()) {
            <p-message severity="error" [text]="formError()!" styleClass="!mb-4 !w-full" />
          }
          @if (eq.qrCodeUrl) {
            <div class="flex flex-col items-center gap-4">
              <div class="w-full max-w-48 overflow-hidden rounded-xl border border-surface bg-surface-0 p-2 dark:bg-surface-900">
                <app-asset-image [src]="eq.qrCodeUrl" alt="Equipment QR code" [contain]="true" />
              </div>
              <div class="flex flex-wrap justify-center gap-2">
                <p-button type="button" label="Download" icon="pi pi-download" [outlined]="true" styleClass="!rounded-xl" (onClick)="downloadQrCode()" />
                <p-button type="button" label="Open" icon="pi pi-external-link" [outlined]="true" styleClass="!rounded-xl" (onClick)="openQrCode(eq.qrCodeUrl!)" />
              </div>
            </div>
          } @else {
            <p-message severity="secondary" text="No QR code generated yet." styleClass="!mb-4 !w-full" />
            @if (canRegenerateQr()) {
              <p-button type="button" label="Generate QR code" icon="pi pi-qrcode" styleClass="!rounded-xl !w-full" [loading]="regeneratingQr()" (onClick)="regenerateQrCode()" />
            }
          }
        </p-panel>
      </div>
    }

    <p-dialog [(visible)]="editVisible" header="Edit Equipment" [modal]="true" [draggable]="false" [style]="{ width: '42rem', maxWidth: '95vw' }" styleClass="app-dialog">
      @if (formError()) { <p-message severity="error" [text]="formError()!" styleClass="!mb-4 !w-full" /> }
      <form [formGroup]="form" (ngSubmit)="submitEdit()" class="flex flex-col gap-4">
        <div class="grid gap-4 sm:grid-cols-2">
          <div class="flex flex-col gap-1.5 sm:col-span-2">
            <label for="eqName" class="text-sm font-medium text-color">Name</label>
            <input pInputText id="eqName" formControlName="name" class="w-full !rounded-xl !py-2.5" />
          </div>
          <div class="flex flex-col gap-1.5">
            <label for="eqCategory" class="text-sm font-medium text-color">Category</label>
            <input pInputText id="eqCategory" formControlName="category" class="w-full !rounded-xl !py-2.5" />
          </div>
          <div class="flex flex-col gap-1.5">
            <label for="eqManufacturer" class="text-sm font-medium text-color">Manufacturer</label>
            <input pInputText id="eqManufacturer" formControlName="manufacturer" class="w-full !rounded-xl !py-2.5" />
          </div>
          <div class="flex flex-col gap-1.5">
            <label for="eqModel" class="text-sm font-medium text-color">Model</label>
            <input pInputText id="eqModel" formControlName="model" class="w-full !rounded-xl !py-2.5" />
          </div>
          <div class="flex flex-col gap-1.5">
            <label for="eqSerial" class="text-sm font-medium text-color">Serial number</label>
            <input pInputText id="eqSerial" formControlName="serialNumber" class="w-full !rounded-xl !py-2.5" />
          </div>
          <div class="flex flex-col gap-1.5 sm:col-span-2">
            <label for="eqBarcodeTag" class="text-sm font-medium text-color">Barcode / tag number</label>
            <input pInputText id="eqBarcodeTag" formControlName="barcodeTagNumber" class="w-full !rounded-xl !py-2.5" />
          </div>
          <div class="flex flex-col gap-1.5 sm:col-span-2">
            <label for="eqDepartment" class="text-sm font-medium text-color">Department</label>
            <p-select inputId="eqDepartment" formControlName="department" [options]="departmentOptions()" optionLabel="label" optionValue="value" placeholder="Select department" styleClass="w-full !rounded-xl" />
          </div>
          <div class="flex flex-col gap-1.5">
            <label for="eqRoom" class="text-sm font-medium text-color">Room location</label>
            <input pInputText id="eqRoom" formControlName="roomLocation" class="w-full !rounded-xl !py-2.5" />
          </div>
          <div class="flex flex-col gap-1.5">
            <label for="eqSupplier" class="text-sm font-medium text-color">Supplier</label>
            <input pInputText id="eqSupplier" formControlName="supplier" class="w-full !rounded-xl !py-2.5" />
          </div>
          <div class="flex flex-col gap-1.5">
            <label for="eqPurchaseDate" class="text-sm font-medium text-color">Purchase date</label>
            <p-datepicker inputId="eqPurchaseDate" formControlName="purchaseDate" [showIcon]="true" dateFormat="yy-mm-dd" styleClass="w-full" inputStyleClass="w-full !rounded-xl" />
          </div>
          <div class="flex flex-col gap-1.5">
            <label for="eqCost" class="text-sm font-medium text-color">Cost</label>
            <input pInputText id="eqCost" type="number" min="0" step="0.01" formControlName="cost" class="w-full !rounded-xl !py-2.5" />
          </div>
          <div class="flex flex-col gap-1.5">
            <label for="eqWarrantyStart" class="text-sm font-medium text-color">Warranty start</label>
            <p-datepicker inputId="eqWarrantyStart" formControlName="warrantyStartDate" [showIcon]="true" dateFormat="yy-mm-dd" styleClass="w-full" inputStyleClass="w-full !rounded-xl" />
          </div>
          <div class="flex flex-col gap-1.5">
            <label for="eqWarrantyEnd" class="text-sm font-medium text-color">Warranty end</label>
            <p-datepicker inputId="eqWarrantyEnd" formControlName="warrantyEndDate" [showIcon]="true" dateFormat="yy-mm-dd" styleClass="w-full" inputStyleClass="w-full !rounded-xl" />
          </div>
          <div class="flex flex-col gap-1.5">
            <label for="eqPmDays" class="text-sm font-medium text-color">PM frequency (days)</label>
            <input pInputText id="eqPmDays" type="number" min="1" formControlName="pmFrequencyDays" class="w-full !rounded-xl !py-2.5" />
          </div>
          <div class="flex flex-col gap-1.5">
            <label for="eqCalDays" class="text-sm font-medium text-color">Calibration frequency (days)</label>
            <input pInputText id="eqCalDays" type="number" min="1" formControlName="calibrationFrequencyDays" class="w-full !rounded-xl !py-2.5" />
          </div>
        </div>
        <p-divider />
        <div class="flex justify-end gap-2">
          <p-button type="button" label="Cancel" [text]="true" (onClick)="editVisible = false" />
          <p-button type="submit" label="Save changes" icon="pi pi-check" [loading]="saving()" [disabled]="form.invalid || saving()" />
        </div>
      </form>
    </p-dialog>

    <p-dialog [(visible)]="confirmInstallVisible" header="Confirm Installation" [modal]="true" [style]="{ width: '28rem', maxWidth: '95vw' }" styleClass="app-dialog">
      @if (formError()) { <p-message severity="error" [text]="formError()!" styleClass="!mb-4 !w-full" /> }
      <form [formGroup]="confirmInstallForm" (ngSubmit)="submitConfirmInstall()" class="flex flex-col gap-4">
        <p class="text-sm text-muted-color">Mark this asset as installed and move it to working status.</p>
        <div class="flex flex-col gap-1.5">
          <label for="installDate" class="text-sm font-medium text-color">Installation date</label>
          <input id="installDate" type="date" formControlName="installationDate" class="rounded-xl border border-surface px-3 py-2.5" />
        </div>
        <div class="flex flex-col gap-1.5">
          <label for="installNote" class="text-sm font-medium text-color">Note <span class="text-muted-color">(optional)</span></label>
          <textarea pTextarea id="installNote" formControlName="note" rows="3" class="w-full !rounded-xl"></textarea>
        </div>
        <div class="flex justify-end gap-2">
          <p-button type="button" label="Cancel" [text]="true" (onClick)="confirmInstallVisible = false" />
          <p-button type="submit" label="Confirm" icon="pi pi-check" [loading]="lifecycleSaving()" [disabled]="confirmInstallForm.invalid || lifecycleSaving()" />
        </div>
      </form>
    </p-dialog>

    <p-dialog [(visible)]="statusChangeVisible" header="Change Equipment Status" [modal]="true" [style]="{ width: '28rem', maxWidth: '95vw' }" styleClass="app-dialog">
      @if (formError()) { <p-message severity="error" [text]="formError()!" styleClass="!mb-4 !w-full" /> }
      <form [formGroup]="statusChangeForm" (ngSubmit)="submitStatusChange()" class="flex flex-col gap-4">
        <p class="text-sm text-muted-color">Current status: <strong class="text-color">{{ item() ? equipmentStatusLabel(item()!.status) : '' }}</strong></p>
        <div class="flex flex-col gap-1.5">
          <label for="toStatus" class="text-sm font-medium text-color">New status</label>
          <p-select inputId="toStatus" formControlName="toStatus" [options]="statusTransitionOptions()" optionLabel="label" optionValue="value" placeholder="Select status" styleClass="w-full !rounded-xl" />
        </div>
        <div class="flex flex-col gap-1.5">
          <label for="statusNote" class="text-sm font-medium text-color">Note <span class="text-muted-color">(optional)</span></label>
          <textarea pTextarea id="statusNote" formControlName="note" rows="3" class="w-full !rounded-xl"></textarea>
        </div>
        <div class="flex justify-end gap-2">
          <p-button type="button" label="Cancel" [text]="true" (onClick)="statusChangeVisible = false" />
          <p-button type="submit" label="Update status" icon="pi pi-check" [loading]="lifecycleSaving()" [disabled]="statusChangeForm.invalid || lifecycleSaving()" />
        </div>
      </form>
    </p-dialog>

    <p-confirmdialog styleClass="app-dialog" />
  `,
})
export class EquipmentDetailComponent implements OnInit {
  readonly id = input.required<string>();

  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);
  private readonly equipmentService = inject(EquipmentService);
  private readonly receivingService = inject(ReceivingService);
  private readonly maintenanceService = inject(MaintenanceService);
  private readonly departmentsService = inject(DepartmentsService);
  private readonly storeContext = inject(StoreContextService);
  private readonly auth = inject(AuthService);
  private readonly confirm = inject(ConfirmationService);

  readonly item = signal<Equipment | null>(null);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly uploadingPhotos = signal(false);
  readonly uploadingManual = signal(false);
  readonly regeneratingQr = signal(false);
  readonly lifecycleSaving = signal(false);
  readonly historyLoading = signal(false);
  readonly maintenanceLoading = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly formError = signal<string | null>(null);
  readonly departmentOptions = signal<SelectOption[]>([]);
  readonly statusHistory = signal<ReceivingHistoryEntry[]>([]);
  readonly maintenanceHistory = signal<MaintenanceRecord[]>([]);
  readonly canEdit = computed(() => this.storeContext.can('equipment:edit'));
  readonly canUploadMedia = computed(() => this.storeContext.can('equipment:media'));
  readonly canChangeStatus = computed(() => this.storeContext.can('equipment:status'));
  readonly canRegenerateQr = computed(() => this.storeContext.can('equipment:qr'));
  readonly canScheduleMaintenance = computed(() => this.storeContext.can('maintenance:create'));
  readonly canDelete = computed(() => this.auth.isAdmin());
  readonly statusTransitionOptions = computed(() => {
    const eq = this.item();
    if (!eq) return [];
    return nextEquipmentStatuses(eq.status).map((status) => ({
      label: EQUIPMENT_STATUS_LABEL[status],
      value: status,
    }));
  });

  editVisible = false;
  confirmInstallVisible = false;
  statusChangeVisible = false;
  private departmentNameById = new Map<string, string>();

  readonly form = this.fb.group({
    name: ['', Validators.required],
    category: ['', Validators.required],
    manufacturer: ['', Validators.required],
    model: [''],
    serialNumber: ['', Validators.required],
    barcodeTagNumber: ['', Validators.required],
    department: ['', Validators.required],
    roomLocation: [''],
    supplier: [''],
    purchaseDate: [null as Date | null],
    warrantyStartDate: [null as Date | null],
    warrantyEndDate: [null as Date | null],
    cost: [''],
    pmFrequencyDays: [''],
    calibrationFrequencyDays: [''],
  });

  readonly confirmInstallForm = this.fb.nonNullable.group({
    installationDate: [new Date().toISOString().slice(0, 10), Validators.required],
    note: [''],
  });

  readonly statusChangeForm = this.fb.nonNullable.group({
    toStatus: ['' as EquipmentStatus, Validators.required],
    note: [''],
  });

  ngOnInit(): void {
    this.loadDepartments();
    this.loadItem(this.id());
  }

  detailFields(eq: Equipment): { label: string; value: string }[] {
    return [
      { label: 'Asset number', value: eq.assetNumber || '—' },
      { label: 'Barcode / tag', value: eq.barcodeTagNumber || '—' },
      { label: 'Manufacturer', value: eq.manufacturer },
      { label: 'Model', value: eq.model ?? '—' },
      { label: 'Serial number', value: eq.serialNumber },
      { label: 'Department', value: this.departmentLabel(eq) },
      { label: 'Status', value: EQUIPMENT_STATUS_LABEL[eq.status] },
      { label: 'Room location', value: eq.roomLocation ?? '—' },
      { label: 'Supplier', value: eq.supplier ?? '—' },
      { label: 'Purchase date', value: this.formatDate(eq.purchaseDate) },
      { label: 'Warranty start', value: this.formatDate(eq.warrantyStartDate) },
      { label: 'Warranty end', value: this.formatDate(eq.warrantyEndDate) },
      { label: 'Cost', value: eq.cost != null ? eq.cost.toLocaleString() : '—' },
      { label: 'Created', value: this.formatDateTime(eq.createdAt) },
    ];
  }

  canConfirmInstallation(eq: Equipment): boolean {
    return (
      this.canChangeStatus() && eq.status === EquipmentStatus.PENDING_INSTALLATION
    );
  }

  equipmentStatusLabel(status: EquipmentStatus): string {
    return EQUIPMENT_STATUS_LABEL[status];
  }

  openConfirmInstallDialog(): void {
    this.formError.set(null);
    this.confirmInstallForm.reset({
      installationDate: new Date().toISOString().slice(0, 10),
      note: '',
    });
    this.confirmInstallVisible = true;
  }

  openStatusDialog(): void {
    this.formError.set(null);
    const options = this.statusTransitionOptions();
    this.statusChangeForm.reset({
      toStatus: options[0]?.value ?? ('' as EquipmentStatus),
      note: '',
    });
    this.statusChangeVisible = true;
  }

  submitConfirmInstall(): void {
    const eq = this.item();
    if (!eq || this.confirmInstallForm.invalid || this.lifecycleSaving()) return;
    this.lifecycleSaving.set(true);
    this.formError.set(null);
    const { installationDate, note } = this.confirmInstallForm.getRawValue();
    this.receivingService
      .confirmInstallation(eq.id, {
        installationDate,
        note: note.trim() || undefined,
      })
      .subscribe({
        next: (res) => {
          this.lifecycleSaving.set(false);
          this.confirmInstallVisible = false;
          this.item.set(res.data);
          this.refreshLifecyclePanels();
        },
        error: (err: HttpErrorResponse) => {
          this.lifecycleSaving.set(false);
          this.formError.set(this.resolveError(err));
        },
      });
  }

  submitStatusChange(): void {
    const eq = this.item();
    if (!eq || this.statusChangeForm.invalid || this.lifecycleSaving()) return;
    this.lifecycleSaving.set(true);
    this.formError.set(null);
    const { toStatus, note } = this.statusChangeForm.getRawValue();
    this.receivingService
      .changeStatus(eq.id, { toStatus, note: note.trim() || undefined })
      .subscribe({
        next: (res) => {
          this.lifecycleSaving.set(false);
          this.statusChangeVisible = false;
          this.item.set(res.data);
          this.refreshLifecyclePanels();
        },
        error: (err: HttpErrorResponse) => {
          this.lifecycleSaving.set(false);
          this.formError.set(this.resolveError(err));
        },
      });
  }

  statusHistoryLabel(entry: ReceivingHistoryEntry): string {
    const from = entry.fromStatus ? EQUIPMENT_STATUS_LABEL[entry.fromStatus] : 'Initial';
    const to = EQUIPMENT_STATUS_LABEL[entry.toStatus];
    return `${from} → ${to}`;
  }

  changedByLabel(entry: ReceivingHistoryEntry): string {
    const by = entry.changedBy;
    if (!by) return 'System';
    if (typeof by === 'string') return by;
    return by.fullName;
  }

  maintenanceTypeLabel(type: MaintenanceRecord['type']): string {
    return MAINTENANCE_TYPE_LABEL[type];
  }

  openEditDialog(): void {
    const eq = this.item();
    if (!eq) return;
    this.formError.set(null);
    this.form.reset({
      name: eq.name,
      category: eq.category,
      manufacturer: eq.manufacturer,
      model: eq.model ?? '',
      serialNumber: eq.serialNumber,
      barcodeTagNumber: eq.barcodeTagNumber,
      department: this.departmentId(eq),
      roomLocation: eq.roomLocation ?? '',
      supplier: eq.supplier ?? '',
      purchaseDate: eq.purchaseDate ? new Date(eq.purchaseDate) : null,
      warrantyStartDate: eq.warrantyStartDate ? new Date(eq.warrantyStartDate) : null,
      warrantyEndDate: eq.warrantyEndDate ? new Date(eq.warrantyEndDate) : null,
      cost: eq.cost != null ? String(eq.cost) : '',
      pmFrequencyDays: eq.pmFrequencyDays != null ? String(eq.pmFrequencyDays) : '',
      calibrationFrequencyDays: eq.calibrationFrequencyDays != null ? String(eq.calibrationFrequencyDays) : '',
    });
    this.editVisible = true;
  }

  submitEdit(): void {
    const eq = this.item();
    if (!eq || this.form.invalid || this.saving()) return;
    this.saving.set(true);
    this.formError.set(null);
    this.equipmentService.update(eq.id, this.buildPayload()).subscribe({
      next: (res) => {
        this.saving.set(false);
        this.editVisible = false;
        this.item.set(res.data);
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        this.formError.set(this.resolveError(err));
      },
    });
  }

  confirmDelete(eq: Equipment): void {
    this.confirm.confirm({
      header: 'Delete Equipment',
      message: `Delete "${eq.name}" (${eq.assetNumber})? This action cannot be undone.`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-text',
      accept: () => {
        this.equipmentService.remove(eq.id).subscribe({
          next: () => this.router.navigate(['/equipment']),
        });
      },
    });
  }

  onPhotosSelected(event: FileSelectEvent): void {
    const files = event.files ? Array.from(event.files) : [];
    const eq = this.item();
    if (!files.length || !eq || this.uploadingPhotos()) return;
    this.uploadingPhotos.set(true);
    this.formError.set(null);
    this.equipmentService.uploadPhotos(eq.id, files).subscribe({
      next: (res) => {
        this.item.set(res.data);
        this.uploadingPhotos.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.uploadingPhotos.set(false);
        this.formError.set(this.resolveError(err));
      },
    });
  }

  onManualSelected(event: FileSelectEvent): void {
    const file = event.files?.[0];
    const eq = this.item();
    if (!file || !eq || this.uploadingManual()) return;
    this.uploadingManual.set(true);
    this.formError.set(null);
    this.equipmentService.uploadManual(eq.id, file).subscribe({
      next: (res) => {
        this.item.set(res.data);
        this.uploadingManual.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.uploadingManual.set(false);
        this.formError.set(this.resolveError(err));
      },
    });
  }

  regenerateQrCode(): void {
    const eq = this.item();
    if (!eq || this.regeneratingQr()) return;
    this.regeneratingQr.set(true);
    this.formError.set(null);
    this.equipmentService.regenerateQrCode(eq.id).subscribe({
      next: (res) => {
        this.item.set(res.data);
        this.regeneratingQr.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.regeneratingQr.set(false);
        this.formError.set(this.resolveError(err));
      },
    });
  }

  downloadQrCode(): void {
    const eq = this.item();
    const path$ = eq?.qrCodeUrl ? of(eq.qrCodeUrl) : this.equipmentService.getQrCodeUrl(this.id());

    firstValueFrom(
      path$.pipe(
        switchMap((path) => {
          if (!path) throw new Error('No QR code');
          return this.http.get(resolveAssetUrl(path), { responseType: 'blob' });
        }),
      ),
    )
      .then((blob) => {
        const objectUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = objectUrl;
        link.download = `${eq?.assetNumber ?? 'equipment'}-qr.png`;
        link.click();
        URL.revokeObjectURL(objectUrl);
      })
      .catch((err: unknown) => {
        if (err instanceof HttpErrorResponse) {
          this.formError.set(this.resolveError(err));
        } else {
          this.formError.set('Unable to download QR code.');
        }
      });
  }

  openQrCode(url: string): void {
    window.open(resolveAssetUrl(url), '_blank', 'noopener,noreferrer');
  }

  readonly resolveAssetUrl = resolveAssetUrl;

  departmentLabel(eq: Equipment): string {
    const department = eq.department;
    if (typeof department === 'string') {
      return this.departmentNameById.get(department) ?? department;
    }
    return (department as EquipmentDepartmentRef).name;
  }

  formatDate(value?: string): string {
    return value ? new Date(value).toLocaleDateString() : '—';
  }

  formatDateTime(value?: string): string {
    return value ? new Date(value).toLocaleString() : '—';
  }

  private departmentId(eq: Equipment): string {
    if (typeof eq.department === 'string') return eq.department;
    return eq.department.id;
  }

  private buildPayload(): Partial<CreateEquipmentDto> {
    const raw = this.form.getRawValue();
    return {
      name: raw.name!.trim(),
      category: raw.category!.trim(),
      manufacturer: raw.manufacturer!.trim(),
      model: raw.model?.trim() || undefined,
      serialNumber: raw.serialNumber!.trim(),
      barcodeTagNumber: raw.barcodeTagNumber!.trim(),
      department: raw.department!,
      roomLocation: raw.roomLocation?.trim() || undefined,
      supplier: raw.supplier?.trim() || undefined,
      purchaseDate: raw.purchaseDate ? this.formatDateInput(raw.purchaseDate) : undefined,
      warrantyStartDate: raw.warrantyStartDate ? this.formatDateInput(raw.warrantyStartDate) : undefined,
      warrantyEndDate: raw.warrantyEndDate ? this.formatDateInput(raw.warrantyEndDate) : undefined,
      cost: raw.cost ? Number(raw.cost) : undefined,
      pmFrequencyDays: raw.pmFrequencyDays ? Number(raw.pmFrequencyDays) : undefined,
      calibrationFrequencyDays: raw.calibrationFrequencyDays ? Number(raw.calibrationFrequencyDays) : undefined,
    };
  }

  private formatDateInput(value: Date): string {
    return value.toISOString().slice(0, 10);
  }

  private loadItem(id: string): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.item.set(null);
    this.equipmentService.getById(id).subscribe({
      next: (res) => {
        this.item.set(res.data);
        this.loading.set(false);
        this.refreshLifecyclePanels();
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.loadError.set(this.resolveError(err));
      },
    });
  }

  private loadDepartments(): void {
    this.departmentsService.active().subscribe({
      next: (res) => {
        const departments = res.data.map((dept) => normalizeDepartment(dept)).filter((d) => !!d.id);
        this.departmentNameById = new Map(departments.map((dept) => [dept.id, dept.name]));
        this.departmentOptions.set(
          departments.map((dept) => ({ label: `${dept.name} (${dept.code})`, value: dept.id })),
        );
      },
    });
  }

  private refreshLifecyclePanels(): void {
    const id = this.item()?.id ?? this.id();
    if (!id) return;

    this.historyLoading.set(true);
    this.receivingService.getHistory(id, { page: 1, limit: 20 }).subscribe({
      next: (res) => {
        this.statusHistory.set(res.data ?? []);
        this.historyLoading.set(false);
      },
      error: () => this.historyLoading.set(false),
    });

    this.maintenanceLoading.set(true);
    this.maintenanceService.getEquipmentHistory(id, { page: 1, limit: 10 }).subscribe({
      next: (res) => {
        this.maintenanceHistory.set(res.data ?? []);
        this.maintenanceLoading.set(false);
      },
      error: () => this.maintenanceLoading.set(false),
    });
  }

  private resolveError(err: HttpErrorResponse): string {
    const message = (err.error as ApiErrorBody | undefined)?.message;
    if (Array.isArray(message)) return message[0] ?? 'Request failed.';
    if (typeof message === 'string' && message.trim()) return message;
    return 'Request failed. Please try again.';
  }
}
