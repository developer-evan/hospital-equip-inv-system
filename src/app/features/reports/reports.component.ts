import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { SelectButton } from 'primeng/selectbutton';
import { Card } from 'primeng/card';

import { ReportsService, ReportFilter, ReportFormat, ReportType } from '../../core/services/reports.service';
import { DepartmentsService } from '../../core/services/departments.service';
import { EquipmentStatus } from '../../core/models/equipment-status.enum';
import { EQUIPMENT_STATUS_LABEL } from '../../core/models/equipment.model';
import { normalizeDepartment } from '../../core/utils/entity.util';

interface SelectOption<T = string> {
  label: string;
  value: T;
}

interface ReportItem {
  key: ReportType;
  label: string;
  description: string;
  requiresDepartment?: boolean;
  requiresEngineer?: boolean;
}

@Component({
  selector: 'app-reports',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, Button, InputText, Select, SelectButton, Card],
  template: `
    <div class="mb-6">
      <h2 class="text-xl font-semibold text-color">Reports</h2>
      <p class="mt-1 text-sm text-muted-color">Export hospital-wide inventory and maintenance reports.</p>
    </div>

    <p-card styleClass="!mb-6 !rounded-2xl !border-surface !bg-surface-0 dark:bg-surface-900">
      <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <p-select [options]="departmentOptions()" [(ngModel)]="filter.department" optionLabel="label" optionValue="value" placeholder="All departments" [showClear]="true" styleClass="w-full !rounded-xl" />
        <p-select [options]="statusOptions" [(ngModel)]="filter.status" optionLabel="label" optionValue="value" placeholder="All statuses" [showClear]="true" styleClass="w-full !rounded-xl" />
        <input type="date" [(ngModel)]="filter.from" class="rounded-xl border border-surface px-3 py-2.5" />
        <input type="date" [(ngModel)]="filter.to" class="rounded-xl border border-surface px-3 py-2.5" />
        <input pInputText [(ngModel)]="filter.engineer" placeholder="Engineer ID (optional)" class="rounded-xl border border-surface px-3 py-2.5" />
        <p-selectbutton [options]="formatOptions" [(ngModel)]="filter.format" optionLabel="label" optionValue="value" styleClass="w-full" />
      </div>
    </p-card>

    <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      @for (report of reports; track report.key) {
        <div class="rounded-2xl border border-surface bg-surface-0 dark:bg-surface-900 p-5">
          <h3 class="font-medium text-color">{{ report.label }}</h3>
          <p class="mt-1 text-sm text-muted-color">{{ report.description }}</p>
          <p-button
            type="button"
            icon="pi pi-download"
            label="Download"
            styleClass="!mt-4 !rounded-xl"
            [disabled]="!canDownload(report)"
            (onClick)="download(report.key)"
          />
        </div>
      }
    </div>
  `,
})
export class ReportsComponent implements OnInit {
  private readonly reportsService = inject(ReportsService);
  private readonly departmentsService = inject(DepartmentsService);

  readonly departmentOptions = signal<SelectOption[]>([]);

  filter: ReportFilter = {
    format: 'excel',
  };

  readonly formatOptions: SelectOption<ReportFormat>[] = [
    { label: 'Excel', value: 'excel' },
    { label: 'PDF', value: 'pdf' },
  ];

  readonly statusOptions: SelectOption<EquipmentStatus>[] = Object.values(EquipmentStatus).map((s) => ({
    label: EQUIPMENT_STATUS_LABEL[s],
    value: s,
  }));

  readonly reports: ReportItem[] = [
    { key: 'inventory', label: 'Inventory', description: 'Full equipment inventory export.' },
    { key: 'department-inventory', label: 'Department Inventory', description: 'Inventory scoped to one department.', requiresDepartment: true },
    { key: 'condemned', label: 'Condemned Assets', description: 'Equipment marked condemned or decommissioned.' },
    { key: 'pm', label: 'Preventive Maintenance', description: 'PM schedule and completion summary.' },
    { key: 'breakdown', label: 'Breakdown Report', description: 'Corrective maintenance and downtime.' },
    { key: 'engineer-work', label: 'Engineer Work', description: 'Work completed by engineer.', requiresEngineer: true },
  ];

  ngOnInit(): void {
    this.departmentsService.active().subscribe({
      next: (res) => {
        this.departmentOptions.set(
          res.data.map(normalizeDepartment).filter((d) => !!d.id).map((d) => ({
            label: `${d.name} (${d.code})`,
            value: d.id,
          })),
        );
      },
    });
  }

  canDownload(report: ReportItem): boolean {
    if (report.requiresDepartment && !this.filter.department) return false;
    if (report.requiresEngineer && !this.filter.engineer?.trim()) return false;
    return true;
  }

  download(report: ReportType): void {
    this.reportsService.download(report, {
      ...this.filter,
      engineer: this.filter.engineer?.trim() || undefined,
    });
  }
}
