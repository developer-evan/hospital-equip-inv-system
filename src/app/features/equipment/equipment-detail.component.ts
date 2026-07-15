import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  OnInit,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
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
import { TooltipModule } from 'primeng/tooltip';

import { EquipmentService } from '../../core/services/equipment.service';
import { DepartmentsService } from '../../core/services/departments.service';
import { StoreContextService } from '../../core/services/store-context.service';
import { AuthService } from '../../core/services/auth.service';
import { ApiErrorBody } from '../../core/models/common.model';
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
            @if (canEdit()) {
              <p-button type="button" label="Edit" icon="pi pi-pencil" [outlined]="true" styleClass="!rounded-xl" (onClick)="openEditDialog()" />
            }
            @if (canEdit()) {
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

          <p-panel header="Photos" [toggleable]="false" styleClass="detail-panel">
            <div class="mb-4 flex items-center gap-3">
              @if (canEdit()) {
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
              @if (canEdit()) {
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
            @if (canEdit()) {
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

    <p-confirmdialog styleClass="app-dialog" />
  `,
})
export class EquipmentDetailComponent implements OnInit {
  readonly id = input.required<string>();

  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly equipmentService = inject(EquipmentService);
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
  readonly loadError = signal<string | null>(null);
  readonly formError = signal<string | null>(null);
  readonly departmentOptions = signal<SelectOption[]>([]);
  readonly canEdit = computed(() => this.storeContext.can('equipment:edit'));
  readonly canDelete = computed(() => this.auth.isAdmin());

  editVisible = false;
  private departmentNameById = new Map<string, string>();

  readonly form = this.fb.group({
    name: ['', Validators.required],
    category: ['', Validators.required],
    manufacturer: ['', Validators.required],
    model: [''],
    serialNumber: ['', Validators.required],
    department: ['', Validators.required],
    roomLocation: [''],
    supplier: [''],
    purchaseDate: [null as Date | null],
    cost: [''],
    pmFrequencyDays: [''],
    calibrationFrequencyDays: [''],
  });

  ngOnInit(): void {
    this.loadDepartments();
    this.loadItem(this.id());
  }

  detailFields(eq: Equipment): { label: string; value: string }[] {
    return [
      { label: 'Asset number', value: eq.assetNumber || '—' },
      { label: 'Manufacturer', value: eq.manufacturer },
      { label: 'Model', value: eq.model ?? '—' },
      { label: 'Serial number', value: eq.serialNumber },
      { label: 'Department', value: this.departmentLabel(eq) },
      { label: 'Status', value: EQUIPMENT_STATUS_LABEL[eq.status] },
      { label: 'Room location', value: eq.roomLocation ?? '—' },
      { label: 'Supplier', value: eq.supplier ?? '—' },
      { label: 'Purchase date', value: this.formatDate(eq.purchaseDate) },
      { label: 'Cost', value: eq.cost != null ? eq.cost.toLocaleString() : '—' },
      { label: 'Created', value: this.formatDateTime(eq.createdAt) },
    ];
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
      department: this.departmentId(eq),
      roomLocation: eq.roomLocation ?? '',
      supplier: eq.supplier ?? '',
      purchaseDate: eq.purchaseDate ? new Date(eq.purchaseDate) : null,
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
    this.equipmentService.getQrCode(this.id()).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${this.item()?.assetNumber ?? 'equipment'}-qr.png`;
        link.click();
        URL.revokeObjectURL(url);
      },
      error: (err: HttpErrorResponse) => this.formError.set(this.resolveError(err)),
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
      department: raw.department!,
      roomLocation: raw.roomLocation?.trim() || undefined,
      supplier: raw.supplier?.trim() || undefined,
      purchaseDate: raw.purchaseDate ? this.formatDateInput(raw.purchaseDate) : undefined,
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

  private resolveError(err: HttpErrorResponse): string {
    const message = (err.error as ApiErrorBody | undefined)?.message;
    if (Array.isArray(message)) return message[0] ?? 'Request failed.';
    if (typeof message === 'string' && message.trim()) return message;
    return 'Request failed. Please try again.';
  }
}
