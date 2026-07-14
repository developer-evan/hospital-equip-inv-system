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
import { Card } from 'primeng/card';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { DatePicker } from 'primeng/datepicker';
import { Dialog } from 'primeng/dialog';
import { Divider } from 'primeng/divider';
import { FileSelectEvent, FileUpload } from 'primeng/fileupload';
import { Image } from 'primeng/image';
import { Message } from 'primeng/message';
import { Panel } from 'primeng/panel';
import { ProgressSpinner } from 'primeng/progressspinner';
import { Select } from 'primeng/select';
import { Skeleton } from 'primeng/skeleton';
import { TableModule } from 'primeng/table';
import { Tag } from 'primeng/tag';
import { Textarea } from 'primeng/textarea';
import { Toolbar } from 'primeng/toolbar';
import { TooltipModule } from 'primeng/tooltip';
import { environment } from '../../../environments/environment';

import { MaintenanceService } from '../../core/services/maintenance.service';
import { DepartmentsService } from '../../core/services/departments.service';
import { StoreContextService } from '../../core/services/store-context.service';
import { AuthService } from '../../core/services/auth.service';
import { ApiErrorBody } from '../../core/models/common.model';
import {
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

@Component({
  selector: 'app-maintenance-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ConfirmationService],
  imports: [
    RouterLink,
    ReactiveFormsModule,
    Button,
    Card,
    ConfirmDialog,
    DatePicker,
    Dialog,
    Divider,
    FileUpload,
    Image,
    Message,
    Panel,
    ProgressSpinner,
    Select,
    Skeleton,
    TableModule,
    Tag,
    Textarea,
    Toolbar,
    TooltipModule,
    StatusBadgeComponent,
  ],
  template: `
    <p-toolbar styleClass="!mb-6 !rounded-2xl !border !border-surface !bg-surface-0 dark:!bg-surface-900 !px-4 !py-3">
      <ng-template #start>
        <p-button
          routerLink="/maintenance"
          icon="pi pi-arrow-left"
          label="Back"
          [text]="true"
          severity="secondary"
          styleClass="!text-muted-color hover:!text-color"
        />
      </ng-template>
      <ng-template #end>
        @if (record(); as item) {
          <div class="flex flex-wrap justify-end gap-2">
            <p-button
              type="button"
              label="History"
              icon="pi pi-history"
              [outlined]="true"
              styleClass="!rounded-xl"
              (onClick)="openHistoryDialog(item)"
            />
            @if (canEdit(item)) {
              <p-button
                type="button"
                label="Edit"
                icon="pi pi-pencil"
                [outlined]="true"
                styleClass="!rounded-xl"
                (onClick)="openEditDialog(item)"
              />
            }
            @if (canComplete(item)) {
              <p-button
                type="button"
                label="Complete"
                icon="pi pi-check-circle"
                styleClass="!rounded-xl !border-primary !bg-primary !text-primary-contrast"
                (onClick)="openCompleteDialog(item)"
              />
            }
            @if (canDelete()) {
              <p-button
                type="button"
                label="Delete"
                icon="pi pi-trash"
                severity="danger"
                [outlined]="true"
                styleClass="!rounded-xl"
                (onClick)="confirmDelete(item)"
              />
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
          <p-card styleClass="detail-card">
            <div class="grid gap-4 sm:grid-cols-2">
              @for (i of [1, 2, 3, 4, 5, 6]; track i) {
                <div class="flex flex-col gap-2">
                  <p-skeleton width="5rem" height="0.75rem" />
                  <p-skeleton width="100%" height="1.25rem" />
                </div>
              }
            </div>
          </p-card>
          <p-card styleClass="detail-card">
            <p-skeleton width="8rem" height="1rem" styleClass="!mb-3" />
            <p-skeleton width="100%" height="4rem" />
          </p-card>
        </div>
        <p-card styleClass="detail-card">
          <p-skeleton width="5rem" height="1rem" styleClass="!mb-3" />
          <div class="grid grid-cols-2 gap-2">
            <p-skeleton width="100%" height="6rem" />
            <p-skeleton width="100%" height="6rem" />
          </div>
        </p-card>
      </div>
    } @else if (record(); as item) {
      <div class="mb-6 flex flex-wrap items-center gap-3">
        <h2 class="text-xl font-semibold text-color">{{ equipmentName(item) }}</h2>
        <app-status-badge [status]="item.status" />
        <p-tag [value]="typeLabel(item.type)" severity="info" styleClass="!text-xs" />
        <span class="font-mono text-xs text-muted-color">{{ equipmentAsset(item) }}</span>
      </div>

      <div class="grid gap-4 lg:grid-cols-3">
        <div class="flex flex-col gap-4 lg:col-span-2">
          <p-panel header="Record details" [toggleable]="false" styleClass="detail-panel">
            <div class="grid gap-4 sm:grid-cols-2">
              <div>
                <p class="text-xs font-medium uppercase tracking-wide text-muted-color">Equipment</p>
                <p class="mt-1 text-sm font-medium text-color">{{ equipmentName(item) }}</p>
                <p class="text-xs text-muted-color">{{ equipmentAsset(item) }}</p>
              </div>
              <div>
                <p class="text-xs font-medium uppercase tracking-wide text-muted-color">Department</p>
                <p class="mt-1 text-sm text-color">{{ departmentLabel(item) }}</p>
              </div>
              <div>
                <p class="text-xs font-medium uppercase tracking-wide text-muted-color">Scheduled</p>
                <p class="mt-1 text-sm text-color">{{ formatDate(item.scheduledDate) }}</p>
              </div>
              <div>
                <p class="text-xs font-medium uppercase tracking-wide text-muted-color">Performed</p>
                <p class="mt-1 text-sm text-color">{{ formatDate(item.performedDate) }}</p>
              </div>
              <div>
                <p class="text-xs font-medium uppercase tracking-wide text-muted-color">Next due</p>
                <p class="mt-1 text-sm text-color">{{ formatDate(item.nextDueDate) }}</p>
              </div>
              <div>
                <p class="text-xs font-medium uppercase tracking-wide text-muted-color">Last updated</p>
                <p class="mt-1 text-sm text-color">{{ formatDateTime(item.updatedAt) }}</p>
              </div>
            </div>
          </p-panel>

          <p-panel header="Service report" [toggleable]="false" styleClass="detail-panel">
            @if (item.serviceReport) {
              <p class="text-sm leading-relaxed text-color">{{ item.serviceReport }}</p>
            } @else {
              <p-message severity="secondary" text="No service report yet." styleClass="!w-full" />
            }
          </p-panel>
        </div>

        <p-panel header="Photos" [toggleable]="false" styleClass="detail-panel">
          <div class="mb-4 flex items-center justify-between gap-2">
            @if (canCreate()) {
              <p-fileupload
                mode="basic"
                chooseLabel="Upload photos"
                chooseIcon="pi pi-upload"
                accept="image/*"
                [multiple]="true"
                [disabled]="uploading()"
                chooseStyleClass="!rounded-xl"
                (onSelect)="onPhotosSelected($event)"
              />
            }
            @if (uploading()) {
              <p-progressspinner styleClass="!size-6" />
            }
          </div>

          @if (formError()) {
            <p-message severity="error" [text]="formError()!" styleClass="!mb-4 !w-full" />
          }

          @if (item.photoUrls?.length) {
            <div class="grid grid-cols-2 gap-3">
              @for (url of item.photoUrls; track url) {
                <p-image
                  [src]="photoUrl(url)"
                  alt="Maintenance photo"
                  width="100%"
                  [preview]="true"
                  styleClass="overflow-hidden rounded-xl border border-surface"
                  imageStyleClass="aspect-square w-full object-cover"
                />
              }
            </div>
          } @else if (!uploading()) {
            <p-message severity="secondary" text="No photos attached." styleClass="!w-full" />
          }
        </p-panel>
      </div>
    }

    <p-dialog [(visible)]="editVisible" header="Edit Maintenance" [modal]="true" [draggable]="false" [style]="{ width: '28rem', maxWidth: '95vw' }" styleClass="app-dialog">
      @if (formError()) { <p-message severity="error" [text]="formError()!" styleClass="!mb-4 !w-full" /> }
      <form [formGroup]="editForm" (ngSubmit)="submitEdit()" class="flex flex-col gap-4">
        <div class="flex flex-col gap-1.5">
          <label for="editType" class="text-sm font-medium text-color">Type</label>
          <p-select inputId="editType" formControlName="type" [options]="typeOptions" optionLabel="label" optionValue="value" placeholder="Select type" styleClass="w-full !rounded-xl" />
        </div>
        <div class="flex flex-col gap-1.5">
          <label for="editScheduled" class="text-sm font-medium text-color">Scheduled date</label>
          <p-datepicker
            inputId="editScheduled"
            formControlName="scheduledDate"
            [showIcon]="true"
            dateFormat="yy-mm-dd"
            styleClass="w-full"
            inputStyleClass="w-full !rounded-xl"
          />
        </div>
        <p-divider />
        <div class="flex justify-end gap-2">
          <p-button type="button" label="Cancel" [text]="true" (onClick)="editVisible = false" />
          <p-button type="submit" label="Save changes" icon="pi pi-check" [loading]="saving()" [disabled]="editForm.invalid || saving()" />
        </div>
      </form>
    </p-dialog>

    <p-dialog [(visible)]="completeVisible" header="Complete Maintenance" [modal]="true" [draggable]="false" [style]="{ width: '28rem', maxWidth: '95vw' }" styleClass="app-dialog">
      @if (formError()) { <p-message severity="error" [text]="formError()!" styleClass="!mb-4 !w-full" /> }
      <form [formGroup]="completeForm" (ngSubmit)="submitComplete()" class="flex flex-col gap-4">
        <div class="flex flex-col gap-1.5">
          <label for="performedDate" class="text-sm font-medium text-color">Performed date</label>
          <p-datepicker
            inputId="performedDate"
            formControlName="performedDate"
            [showIcon]="true"
            dateFormat="yy-mm-dd"
            styleClass="w-full"
            inputStyleClass="w-full !rounded-xl"
          />
        </div>
        <div class="flex flex-col gap-1.5">
          <label for="serviceReport" class="text-sm font-medium text-color">Service report</label>
          <textarea
            pTextarea
            id="serviceReport"
            formControlName="serviceReport"
            rows="4"
            placeholder="Describe work performed…"
            class="w-full !rounded-xl"
          ></textarea>
        </div>
        <p-divider />
        <div class="flex justify-end gap-2">
          <p-button type="button" label="Cancel" [text]="true" (onClick)="completeVisible = false" />
          <p-button type="submit" label="Complete" icon="pi pi-check" [loading]="saving()" [disabled]="completeForm.invalid || saving()" />
        </div>
      </form>
    </p-dialog>

    <p-dialog [(visible)]="historyVisible" [header]="'History — ' + historyEquipment()" [modal]="true" [draggable]="false" [style]="{ width: '48rem', maxWidth: '95vw' }" styleClass="app-dialog">
      <p-table [value]="historyRecords()" [loading]="historyLoading()" styleClass="dashboard-table" [rowHover]="true">
        <ng-template #header>
          <tr>
            <th>Type</th>
            <th>Scheduled</th>
            <th>Performed</th>
            <th>Status</th>
            <th>Report</th>
            <th class="w-16!"></th>
          </tr>
        </ng-template>
        <ng-template #body let-row>
          <tr>
            <td class="text-sm text-muted-color">{{ typeLabel(row.type) }}</td>
            <td class="text-sm text-muted-color">{{ formatDate(row.scheduledDate) }}</td>
            <td class="text-sm text-muted-color">{{ formatDate(row.performedDate) }}</td>
            <td><app-status-badge [status]="row.status" /></td>
            <td class="max-w-48 truncate text-sm text-muted-color" [pTooltip]="row.serviceReport ?? ''">{{ row.serviceReport ?? '—' }}</td>
            <td class="text-right">
              <p-button
                type="button"
                icon="pi pi-eye"
                [rounded]="true"
                [text]="true"
                severity="secondary"
                pTooltip="View"
                [routerLink]="['/maintenance', row.id]"
                (onClick)="historyVisible = false"
              />
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
export class MaintenanceDetailComponent implements OnInit {
  readonly id = input.required<string>();

  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly maintenanceService = inject(MaintenanceService);
  private readonly departmentsService = inject(DepartmentsService);
  private readonly storeContext = inject(StoreContextService);
  private readonly auth = inject(AuthService);
  private readonly confirm = inject(ConfirmationService);

  readonly record = signal<MaintenanceRecord | null>(null);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly uploading = signal(false);
  readonly historyLoading = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly formError = signal<string | null>(null);
  readonly historyRecords = signal<MaintenanceRecord[]>([]);
  readonly historyEquipment = signal('');
  readonly canCreate = computed(() => this.storeContext.can('maintenance:create'));
  readonly canDelete = computed(() => this.auth.isAdmin());

  editVisible = false;
  completeVisible = false;
  historyVisible = false;
  private departmentNameById = new Map<string, string>();

  readonly typeOptions: SelectOption<MaintenanceType>[] = Object.values(MaintenanceType).map((t) => ({
    label: MAINTENANCE_TYPE_LABEL[t],
    value: t,
  }));

  readonly editForm = this.fb.group({
    type: [MaintenanceType.PREVENTIVE, Validators.required],
    scheduledDate: [null as Date | null, Validators.required],
  });
  readonly completeForm = this.fb.group({
    performedDate: [new Date(), Validators.required],
    serviceReport: ['', Validators.required],
  });

  ngOnInit(): void {
    this.loadDepartments();
    this.loadRecord(this.id());
  }

  openEditDialog(item: MaintenanceRecord): void {
    this.formError.set(null);
    this.editForm.reset({
      type: item.type,
      scheduledDate: new Date(item.scheduledDate),
    });
    this.editVisible = true;
  }

  openCompleteDialog(item: MaintenanceRecord): void {
    this.formError.set(null);
    this.completeForm.reset({
      performedDate: new Date(),
      serviceReport: '',
    });
    this.completeVisible = true;
  }

  openHistoryDialog(item: MaintenanceRecord): void {
    this.historyEquipment.set(this.equipmentName(item));
    this.historyRecords.set([]);
    this.historyLoading.set(true);
    this.historyVisible = true;

    this.maintenanceService.getEquipmentHistory(this.equipmentId(item), { page: 1, limit: 50 }).subscribe({
      next: (res) => {
        this.historyRecords.set(res.data);
        this.historyLoading.set(false);
      },
      error: () => this.historyLoading.set(false),
    });
  }

  canEdit(item: MaintenanceRecord): boolean {
    return item.status !== MaintenanceStatus.COMPLETED && this.canCreate();
  }

  canComplete(item: MaintenanceRecord): boolean {
    return item.status !== MaintenanceStatus.COMPLETED && this.canCreate();
  }

  submitEdit(): void {
    const item = this.record();
    if (!item || this.editForm.invalid || this.saving()) return;
    const raw = this.editForm.getRawValue();
    this.saving.set(true);
    this.formError.set(null);
    this.maintenanceService
      .update(item.id, {
        type: raw.type!,
        scheduledDate: this.formatDateInput(raw.scheduledDate),
      })
      .subscribe({
        next: (res) => {
          this.saving.set(false);
          this.editVisible = false;
          this.record.set(res.data);
        },
        error: (err: HttpErrorResponse) => {
          this.saving.set(false);
          this.formError.set(this.resolveError(err));
        },
      });
  }

  submitComplete(): void {
    const item = this.record();
    if (!item || this.completeForm.invalid || this.saving()) return;
    const raw = this.completeForm.getRawValue();
    this.saving.set(true);
    this.formError.set(null);
    this.maintenanceService
      .complete(item.id, {
        performedDate: this.formatDateInput(raw.performedDate),
        serviceReport: raw.serviceReport!,
      })
      .subscribe({
        next: (res) => {
          this.saving.set(false);
          this.completeVisible = false;
          this.record.set(res.data);
        },
        error: (err: HttpErrorResponse) => {
          this.saving.set(false);
          this.formError.set(this.resolveError(err));
        },
      });
  }

  confirmDelete(item: MaintenanceRecord): void {
    this.confirm.confirm({
      header: 'Delete Maintenance',
      message: `Delete the ${this.typeLabel(item.type).toLowerCase()} maintenance for "${this.equipmentName(item)}"? This action cannot be undone.`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-text',
      accept: () => {
        this.maintenanceService.remove(item.id).subscribe({
          next: () => this.router.navigate(['/maintenance']),
        });
      },
    });
  }

  onPhotosSelected(event: FileSelectEvent): void {
    const files = event.files ? Array.from(event.files) : [];
    const item = this.record();
    if (!files.length || !item || this.uploading()) return;

    this.uploading.set(true);
    this.formError.set(null);
    this.maintenanceService.uploadPhotos(item.id, files).subscribe({
      next: (res) => {
        this.record.set(res.data);
        this.uploading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.uploading.set(false);
        this.formError.set(this.resolveError(err));
      },
    });
  }

  equipmentId(item: MaintenanceRecord): string {
    const eq = item.equipment;
    return typeof eq === 'string' ? eq : eq.id;
  }

  equipmentName(item: MaintenanceRecord): string {
    const eq = item.equipment;
    return typeof eq === 'string' ? eq : (eq as MaintenanceEquipmentRef).name;
  }

  equipmentAsset(item: MaintenanceRecord): string {
    const eq = item.equipment;
    return typeof eq === 'object' && eq && 'assetNumber' in eq ? eq.assetNumber ?? '' : '';
  }

  departmentLabel(item: MaintenanceRecord): string {
    const eq = item.equipment;
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

  private formatDateInput(value: Date | null): string {
    if (!value) return '';
    return value.toISOString().slice(0, 10);
  }

  private loadRecord(id: string): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.record.set(null);

    this.maintenanceService.getById(id).subscribe({
      next: (res) => {
        this.record.set(res.data);
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
