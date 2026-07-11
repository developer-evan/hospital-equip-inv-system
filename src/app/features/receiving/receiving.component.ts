import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { TooltipModule } from 'primeng/tooltip';
import { Message } from 'primeng/message';

import { EquipmentService } from '../../core/services/equipment.service';
import { ReceivingService } from '../../core/services/receiving.service';
import { DepartmentsService } from '../../core/services/departments.service';
import { AuthService } from '../../core/services/auth.service';
import { StoreContextService } from '../../core/services/store-context.service';
import { ApiErrorBody, PaginationMeta } from '../../core/models/common.model';
import { CreateEquipmentDto, Equipment } from '../../core/models/equipment.model';
import { EquipmentStatus } from '../../core/models/equipment-status.enum';
import { Role } from '../../core/models/role.enum';
import { normalizeDepartment } from '../../core/utils/entity.util';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';

interface SelectOption {
  label: string;
  value: string;
}

@Component({
  selector: 'app-receiving',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    Button,
    Dialog,
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
        <h2 class="text-xl font-semibold text-white">Receiving</h2>
        <p class="mt-1 text-sm text-slate-500">
          Register incoming equipment and confirm installation.
        </p>
      </div>
      @if (canRegister()) {
        <p-button
          type="button"
          icon="pi pi-inbox"
          label="Register Equipment"
          styleClass="!rounded-xl !border-orange-500 !bg-orange-500 hover:!border-orange-400 hover:!bg-orange-400"
          (onClick)="openRegisterDialog()"
        />
      }
    </div>

    <div class="overflow-hidden rounded-2xl border border-white/5 bg-[#111319]">
      <p-table
        [value]="pending()"
        [loading]="loading()"
        [lazy]="true"
        [paginator]="true"
        [rows]="pageSize"
        [totalRecords]="totalRecords()"
        (onLazyLoad)="onLazyLoad($event)"
        styleClass="dashboard-table"
        paginatorStyleClass="dashboard-paginator"
        [rowHover]="true"
      >
        <ng-template #caption>
          <div>
            <p class="text-sm font-medium text-slate-200">Pending installation</p>
            <p class="text-xs text-slate-500">{{ totalRecords() }} assets awaiting setup</p>
          </div>
        </ng-template>
        <ng-template #header>
          <tr>
            <th>Asset #</th>
            <th>Equipment</th>
            <th>Department</th>
            <th>Status</th>
            @if (canConfirm()) {
              <th class="!w-36"></th>
            }
          </tr>
        </ng-template>
        <ng-template #body let-item>
          <tr>
            <td><span class="font-mono text-xs text-orange-300/90">{{ item.assetNumber }}</span></td>
            <td>
              <p class="font-medium text-slate-200">{{ item.name }}</p>
              <p class="text-xs text-slate-500">{{ item.manufacturer }} · SN {{ item.serialNumber }}</p>
            </td>
            <td class="text-sm text-slate-400">{{ departmentLabel(item) }}</td>
            <td><app-status-badge [status]="item.status" /></td>
            @if (canConfirm()) {
              <td class="text-right">
                <p-button
                  type="button"
                  label="Confirm"
                  icon="pi pi-check"
                  size="small"
                  styleClass="!rounded-lg !border-emerald-500/30 !bg-emerald-500/15 !text-emerald-300"
                  (onClick)="openConfirmDialog(item)"
                />
              </td>
            }
          </tr>
        </ng-template>
        <ng-template #emptymessage>
          <tr>
            <td [attr.colspan]="canConfirm() ? 5 : 4">
              <div class="py-14 text-center text-sm text-slate-500">No pending installations.</div>
            </td>
          </tr>
        </ng-template>
      </p-table>
    </div>

    <p-dialog
      [(visible)]="registerVisible"
      [modal]="true"
      header="Register Equipment"
      [style]="{ width: '42rem', maxWidth: '95vw' }"
      styleClass="app-dialog"
      (onHide)="resetRegisterForm()"
    >
      @if (formError()) {
        <p-message severity="error" [text]="formError()!" styleClass="!mb-4 !w-full" />
      }
      <form [formGroup]="registerForm" (ngSubmit)="submitRegister()" class="grid gap-4 sm:grid-cols-2">
        <input pInputText formControlName="name" placeholder="Name *" class="sm:col-span-2 !rounded-xl !border-white/10 !bg-[#1a1d26] !py-2.5" />
        <input pInputText formControlName="category" placeholder="Category *" class="!rounded-xl !border-white/10 !bg-[#1a1d26] !py-2.5" />
        <input pInputText formControlName="manufacturer" placeholder="Manufacturer *" class="!rounded-xl !border-white/10 !bg-[#1a1d26] !py-2.5" />
        <input pInputText formControlName="model" placeholder="Model" class="!rounded-xl !border-white/10 !bg-[#1a1d26] !py-2.5" />
        <input pInputText formControlName="serialNumber" placeholder="Serial number *" class="!rounded-xl !border-white/10 !bg-[#1a1d26] !py-2.5" />
        <p-select formControlName="department" [options]="departmentOptions()" optionLabel="label" optionValue="value" placeholder="Department *" styleClass="sm:col-span-2 w-full !rounded-xl" />
        <div class="sm:col-span-2 flex justify-end gap-2 border-t border-white/5 pt-4">
          <p-button type="button" label="Cancel" [text]="true" (onClick)="registerVisible = false" />
          <p-button type="submit" label="Register" icon="pi pi-check" [loading]="saving()" [disabled]="registerForm.invalid || saving()" />
        </div>
      </form>
    </p-dialog>

    <p-dialog
      [(visible)]="confirmVisible"
      [modal]="true"
      header="Confirm Installation"
      [style]="{ width: '28rem', maxWidth: '95vw' }"
      styleClass="app-dialog"
    >
      @if (formError()) {
        <p-message severity="error" [text]="formError()!" styleClass="!mb-4 !w-full" />
      }
      <form [formGroup]="confirmForm" (ngSubmit)="submitConfirm()" class="flex flex-col gap-4">
        <p class="text-sm text-slate-400">Confirm installation for <strong class="text-slate-200">{{ selected()?.name }}</strong></p>
        <input type="date" formControlName="installationDate" class="rounded-xl border border-white/10 bg-[#1a1d26] px-3 py-2.5 text-slate-100" />
        <textarea formControlName="note" rows="3" placeholder="Optional note" class="rounded-xl border border-white/10 bg-[#1a1d26] px-3 py-2.5 text-slate-100"></textarea>
        <div class="flex justify-end gap-2">
          <p-button type="button" label="Cancel" [text]="true" (onClick)="confirmVisible = false" />
          <p-button type="submit" label="Confirm" icon="pi pi-check" [loading]="saving()" [disabled]="confirmForm.invalid || saving()" />
        </div>
      </form>
    </p-dialog>
  `,
})
export class ReceivingComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly equipmentService = inject(EquipmentService);
  private readonly receivingService = inject(ReceivingService);
  private readonly departmentsService = inject(DepartmentsService);
  private readonly storeContext = inject(StoreContextService);
  private readonly auth = inject(AuthService);

  protected readonly pageSize = 10;
  readonly pending = signal<Equipment[]>([]);
  readonly totalRecords = signal(0);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly formError = signal<string | null>(null);
  readonly departmentOptions = signal<SelectOption[]>([]);
  readonly selected = signal<Equipment | null>(null);

  readonly canRegister = computed(() => this.storeContext.can('receiving:register'));
  readonly canConfirm = computed(() =>
    this.auth.hasRole(Role.ADMINISTRATOR, Role.BIOMEDICAL_ENGINEER),
  );

  registerVisible = false;
  confirmVisible = false;
  private currentPage = 1;
  private departmentNames = new Map<string, string>();

  readonly registerForm = this.fb.nonNullable.group({
    name: ['', Validators.required],
    category: ['', Validators.required],
    manufacturer: ['', Validators.required],
    model: [''],
    serialNumber: ['', Validators.required],
    department: ['', Validators.required],
  });

  readonly confirmForm = this.fb.nonNullable.group({
    installationDate: [new Date().toISOString().slice(0, 10), Validators.required],
    note: [''],
  });

  ngOnInit(): void {
    this.loadDepartments();
  }

  onLazyLoad(event: TableLazyLoadEvent): void {
    this.currentPage = event.first! / event.rows! + 1;
    this.loadPending(event.rows ?? this.pageSize);
  }

  openRegisterDialog(): void {
    this.formError.set(null);
    this.registerForm.reset({ name: '', category: '', manufacturer: '', model: '', serialNumber: '', department: '' });
    this.registerVisible = true;
  }

  resetRegisterForm(): void {
    this.saving.set(false);
    this.formError.set(null);
  }

  openConfirmDialog(item: Equipment): void {
    this.selected.set(item);
    this.formError.set(null);
    this.confirmForm.reset({ installationDate: new Date().toISOString().slice(0, 10), note: '' });
    this.confirmVisible = true;
  }

  submitRegister(): void {
    if (this.registerForm.invalid || this.saving()) return;
    this.saving.set(true);
    this.formError.set(null);
    const raw = this.registerForm.getRawValue();
    const payload: CreateEquipmentDto = {
      name: raw.name.trim(),
      category: raw.category.trim(),
      manufacturer: raw.manufacturer.trim(),
      model: raw.model.trim() || undefined,
      serialNumber: raw.serialNumber.trim(),
      department: raw.department,
    };
    this.receivingService.register(payload).subscribe({
      next: () => {
        this.saving.set(false);
        this.registerVisible = false;
        this.loadPending();
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        this.formError.set(this.resolveError(err));
      },
    });
  }

  submitConfirm(): void {
    const item = this.selected();
    if (!item || this.confirmForm.invalid || this.saving()) return;
    this.saving.set(true);
    this.formError.set(null);
    const { installationDate, note } = this.confirmForm.getRawValue();
    this.receivingService.confirmInstallation(item.id, { installationDate, note: note.trim() || undefined }).subscribe({
      next: () => {
        this.saving.set(false);
        this.confirmVisible = false;
        this.loadPending();
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        this.formError.set(this.resolveError(err));
      },
    });
  }

  departmentLabel(item: Equipment): string {
    const dept = item.department;
    if (typeof dept === 'string') return this.departmentNames.get(dept) ?? dept;
    return dept.name;
  }

  private loadPending(limit = this.pageSize): void {
    this.loading.set(true);
    this.equipmentService
      .list({ page: this.currentPage, limit, status: EquipmentStatus.PENDING_INSTALLATION })
      .subscribe({
        next: (res) => {
          this.pending.set(res.data);
          this.totalRecords.set((res.meta as PaginationMeta).totalItems ?? res.data.length);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  private loadDepartments(): void {
    this.departmentsService.active().subscribe({
      next: (res) => {
        const departments = res.data.map(normalizeDepartment).filter((d) => !!d.id);
        this.departmentNames = new Map(departments.map((d) => [d.id, d.name]));
        this.departmentOptions.set(departments.map((d) => ({ label: `${d.name} (${d.code})`, value: d.id })));
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
