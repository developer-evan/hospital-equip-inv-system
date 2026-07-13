import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { Select } from 'primeng/select';
import { IconField } from 'primeng/iconfield';
import { InputIcon } from 'primeng/inputicon';
import { InputText } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { Avatar } from 'primeng/avatar';
import { Tag } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { ProgressSpinner } from 'primeng/progressspinner';
import { Message } from 'primeng/message';

import { DashboardService } from './dashboard.service';
import { KpiCardComponent } from '../../shared/components/kpi-card/kpi-card.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import {
  BarLineChartComponent,
  BarSeries,
  LineSeries,
} from '../../shared/components/bar-line-chart/bar-line-chart.component';
import {
  RadarChartComponent,
  RadarSeries,
} from '../../shared/components/radar-chart/radar-chart.component';
import { RecentActivityRow, DashboardSummary } from '../../core/models/dashboard-summary.model';
import { DepartmentsService } from '../../core/services/departments.service';
import { AuthService } from '../../core/services/auth.service';
import { Role } from '../../core/models/role.enum';
import { Department } from '../../core/models/department.model';
import { normalizeDepartment } from '../../core/utils/entity.util';

interface LegendItem {
  label: string;
  icon: string;
  severity: 'secondary' | 'warn' | 'success' | 'info';
}

@Component({
  selector: 'app-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    Button,
    Select,
    IconField,
    InputIcon,
    InputText,
    TableModule,
    Avatar,
    Tag,
    TooltipModule,
    ProgressSpinner,
    Message,
    KpiCardComponent,
    StatusBadgeComponent,
    BarLineChartComponent,
    RadarChartComponent,
  ],
  template: `
    <!-- Page header -->
    <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 class="text-xl font-semibold text-color">Overview</h2>
        <p class="mt-1 text-sm text-muted-color">
          Track equipment health, maintenance and receiving across your facility.
        </p>
      </div>

      <div class="flex shrink-0 flex-wrap items-center gap-2">
        @if (showDepartmentFilter()) {
          <p-select
            [options]="departmentOptions()"
            [ngModel]="selectedDepartmentId()"
            (ngModelChange)="onDepartmentChange($event)"
            optionLabel="label"
            optionValue="value"
            placeholder="All departments"
            [showClear]="true"
            styleClass="!min-w-[11rem] !rounded-xl !border-surface !text-xs !text-color"
            panelStyleClass="!border-surface"
            pTooltip="Filter dashboard by department"
            tooltipPosition="bottom"
          />
        }
        <p-button
          type="button"
          icon="pi pi-download"
          label="Export Data"
          [outlined]="true"
          severity="secondary"
          styleClass="dashboard-toolbar-btn !rounded-xl !border-surface !bg-transparent !text-color hover:!border-surface hover:!bg-emphasis hover:!text-color"
          pTooltip="Export dashboard data"
          tooltipPosition="bottom"
        />
        <p-button
          type="button"
          icon="pi pi-chart-line"
          label="View Reports"
          styleClass="dashboard-toolbar-btn !rounded-xl !border-primary !bg-primary !text-primary-contrast hover:!border-primary-emphasis hover:!bg-primary-emphasis"
          pTooltip="Open reports"
          tooltipPosition="bottom"
          (onClick)="goToReports()"
        />
      </div>
    </div>

    @if (loadError()) {
      <p-message severity="error" styleClass="mb-5 w-full" [text]="loadError()!" />
    }

    @if (loading()) {
      <div class="flex min-h-[18rem] items-center justify-center rounded-2xl border border-surface bg-surface-0 dark:bg-surface-900">
        <p-progressSpinner styleClass="!size-10" strokeWidth="4" />
      </div>
    } @else {
    <!-- KPI cards -->
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      @for (kpi of kpis(); track kpi.label) {
        <app-kpi-card [kpi]="kpi" />
      }
    </div>

    <!-- Charts -->
    <div class="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
      <!-- Department breakdown -->
      <div class="rounded-2xl border border-surface bg-surface-0 dark:bg-surface-900 p-5 lg:col-span-2">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p class="text-sm font-semibold text-color">Equipment by Department</p>
            <div class="mt-1.5 flex flex-wrap items-center gap-2">
              <span class="text-2xl font-semibold text-color">{{ departmentTotal() }}</span>
              <span class="text-xs text-muted-color">units across {{ chartLabels().length }} departments</span>
            </div>
          </div>
        </div>

        @if (chartLabels().length === 0) {
          <div class="mt-8 flex flex-col items-center justify-center gap-2 py-16 text-center">
            <i class="pi pi-chart-bar text-2xl text-muted-color"></i>
            <p class="text-sm text-muted-color">No department breakdown data available.</p>
          </div>
        } @else {
          <div class="mt-4 h-64">
            <app-bar-line-chart
              [labels]="chartLabels()"
              [bars]="barSeries()"
              [line]="lineSeries()"
            />
          </div>
        }
      </div>

      <!-- Operational health -->
      <div class="flex flex-col rounded-2xl border border-surface bg-surface-0 dark:bg-surface-900 p-5">
        <div class="flex items-start justify-between gap-3">
          <p class="text-sm font-semibold text-color">Operational Health</p>
        </div>

        @if (radarLabels().length === 0) {
          <div class="mt-8 flex flex-1 flex-col items-center justify-center gap-2 py-16 text-center">
            <i class="pi pi-chart-pie text-2xl text-muted-color"></i>
            <p class="text-sm text-muted-color">No operational health metrics available.</p>
          </div>
        } @else {
          <div class="mt-2 min-h-[220px] flex-1">
            <app-radar-chart [labels]="radarLabels()" [series]="radarSeries()" />
          </div>

          <div class="mt-3 flex flex-wrap items-center justify-center gap-2">
            @for (item of healthLegend; track item.label) {
              <p-tag
                [icon]="item.icon"
                [value]="item.label"
                [severity]="item.severity"
                [rounded]="true"
                styleClass="!text-xs"
                [pTooltip]="item.label"
                tooltipPosition="top"
              />
            }
          </div>
        }
      </div>
    </div>

    <!-- Recent activity -->
    <div class="mt-5 overflow-hidden rounded-2xl border border-surface bg-surface-0 dark:bg-surface-900">
      <p-table
        [value]="filteredActivity()"
        [paginator]="true"
        [rows]="5"
        [rowsPerPageOptions]="[5, 10]"
        [rowHover]="true"
        [showGridlines]="false"
        responsiveLayout="scroll"
        sortMode="single"
        styleClass="dashboard-table"
        paginatorStyleClass="dashboard-paginator"
      >
        <ng-template #caption>
          <div class="flex flex-wrap items-center justify-between gap-3 px-1 py-1">
            <div>
              <p class="text-sm font-semibold text-color">Recent Transactions</p>
              <p class="mt-0.5 text-xs text-muted-color">
                {{ filteredActivity().length }} record{{ filteredActivity().length === 1 ? '' : 's' }}
              </p>
            </div>

            <div class="flex items-center gap-2">
              <p-iconfield iconPosition="left" styleClass="w-full sm:w-56">
                <p-inputicon styleClass="pi pi-search !text-muted-color" />
                <input
                  pInputText
                  type="search"
                  placeholder="Search transactions"
                  [ngModel]="searchTerm()"
                  (ngModelChange)="searchTerm.set($event)"
                  class="w-full !rounded-lg !border-surface !py-2 !pl-9 !text-sm"
                  pTooltip="Search by asset, equipment or department"
                  tooltipPosition="top"
                />
              </p-iconfield>

              <p-button
                type="button"
                icon="pi pi-filter"
                label="Filter"
                [outlined]="true"
                severity="secondary"
                size="small"
                styleClass="dashboard-toolbar-btn !rounded-lg !border-surface !text-color hover:!border-surface hover:!bg-emphasis"
                pTooltip="Filter transactions"
                tooltipPosition="top"
              />
            </div>
          </div>
        </ng-template>

        <ng-template #header>
          <tr>
            <th pSortableColumn="assetNumber" class="!min-w-[7rem]">
              <span class="inline-flex items-center gap-1.5">
                Order ID
                <p-sortIcon field="assetNumber" />
              </span>
            </th>
            <th pSortableColumn="equipmentName" class="!min-w-[14rem]">
              <span class="inline-flex items-center gap-1.5">
                Equipment
                <p-sortIcon field="equipmentName" />
              </span>
            </th>
            <th pSortableColumn="status" class="!min-w-[8rem]">
              <span class="inline-flex items-center gap-1.5">
                Status
                <p-sortIcon field="status" />
              </span>
            </th>
            <th pSortableColumn="department" class="!min-w-[7rem]">Department</th>
            <th pSortableColumn="updatedAt" class="!min-w-[7rem]">
              <span class="inline-flex items-center gap-1.5">
                Date
                <p-sortIcon field="updatedAt" />
              </span>
            </th>
            <th class="!w-12"></th>
          </tr>
        </ng-template>

        <ng-template #body let-row>
          <tr>
            <td>
              <span class="font-mono text-xs font-medium text-muted-color">{{ row.assetNumber }}</span>
            </td>
            <td>
              <div class="flex items-center gap-3">
                <p-avatar
                  [label]="row.avatarInitials"
                  shape="circle"
                  styleClass="!size-8 !text-[11px] !font-semibold !text-color"
                  [pTooltip]="row.assignedTo"
                  tooltipPosition="top"
                />
                <div class="min-w-0">
                  <p class="truncate font-medium text-color">{{ row.equipmentName }}</p>
                  <p class="truncate text-xs text-muted-color">{{ row.assignedTo }}</p>
                </div>
              </div>
            </td>
            <td>
              <app-status-badge [status]="row.status" />
            </td>
            <td>
              <span class="text-muted-color">{{ row.department }}</span>
            </td>
            <td>
              <span class="text-muted-color">{{ row.updatedAt }}</span>
            </td>
            <td>
              <p-button
                type="button"
                icon="pi pi-ellipsis-h"
                [rounded]="true"
                [text]="true"
                severity="secondary"
                styleClass="!size-8 !text-muted-color hover:!text-color"
                [ariaLabel]="'Actions for ' + row.equipmentName"
                [pTooltip]="'Actions for ' + row.equipmentName"
                tooltipPosition="left"
              />
            </td>
          </tr>
        </ng-template>

        <ng-template #emptymessage>
          <tr>
            <td colspan="6">
              <div class="flex flex-col items-center justify-center gap-3 py-14 text-center">
                <span
                  class="flex size-12 items-center justify-center rounded-2xl border border-surface text-muted-color"
                >
                  <i class="pi pi-inbox text-xl"></i>
                </span>
                <div>
                  <p class="text-sm font-medium text-color">No transactions found</p>
                  <p class="mt-1 text-xs text-muted-color">
                    Try adjusting your search or filter criteria.
                  </p>
                </div>
              </div>
            </td>
          </tr>
        </ng-template>
      </p-table>
    </div>
    }
  `,
})
export class DashboardComponent implements OnInit {
  private readonly dashboardService = inject(DashboardService);
  private readonly departmentsService = inject(DepartmentsService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly healthLegend: LegendItem[] = [
    { label: 'This week', icon: 'pi pi-calendar', severity: 'warn' },
    { label: 'Last week', icon: 'pi pi-history', severity: 'success' },
  ];

  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);
  readonly selectedDepartmentId = signal<string | null>(null);
  readonly departments = signal<Department[]>([]);

  readonly showDepartmentFilter = computed(() =>
    this.auth.hasRole(Role.ADMINISTRATOR, Role.STORE_OFFICER),
  );

  readonly departmentOptions = computed(() =>
    this.departments().map((department) => ({
      label: department.name,
      value: department.id,
    })),
  );

  readonly summary = signal<DashboardSummary | null>(null);

  readonly kpis = computed(() => {
    const data = this.summary();
    return data ? this.dashboardService.buildKpiTrends(data) : [];
  });

  readonly searchTerm = signal('');

  readonly departmentTotal = computed(() =>
    (this.summary()?.byDepartment ?? []).reduce((sum, item) => sum + item.count, 0),
  );

  readonly chartLabels = computed(() =>
    (this.summary()?.byDepartment ?? []).map((item) => item.name ?? item.department ?? 'Unknown'),
  );

  readonly barSeries = computed<BarSeries[]>(() => [
    {
      label: 'Equipment',
      data: (this.summary()?.byDepartment ?? []).map((item) => item.count),
      color: '#10b981',
    },
  ]);

  readonly lineSeries = computed<LineSeries | null>(() => {
    const weekly = this.summary()?.weeklyActivity ?? [];
    if (weekly.length === 0) return null;
    return {
      label: 'PM Completed',
      data: weekly.map((point) => point.pmCompleted),
      color: '#22c55e',
    };
  });

  readonly radarLabels = computed(() =>
    (this.summary()?.operationalHealth ?? []).map((metric) => metric.axis),
  );

  readonly radarSeries = computed<RadarSeries[]>(() => [
    {
      label: 'This week',
      data: (this.summary()?.operationalHealth ?? []).map((metric) => metric.thisWeek),
      color: '#10b981',
    },
    {
      label: 'Last week',
      data: (this.summary()?.operationalHealth ?? []).map((metric) => metric.lastWeek),
      color: '#22c55e',
    },
  ]);

  readonly recentActivity = computed(() => this.summary()?.recentActivity ?? []);

  readonly filteredActivity = computed<RecentActivityRow[]>(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const rows = this.recentActivity();
    if (!term) return rows;
    return rows.filter((row) =>
      [row.assetNumber, row.equipmentName, row.department, row.assignedTo].some((field) =>
        field.toLowerCase().includes(term),
      ),
    );
  });

  ngOnInit(): void {
    if (this.showDepartmentFilter()) {
      this.departmentsService.active().subscribe({
        next: (res) => {
          this.departments.set((res.data ?? []).map((item) => normalizeDepartment(item)).filter((item) => !!item.id));
        },
      });
    }

    this.loadSummary();
  }

  onDepartmentChange(departmentId: string | null): void {
    this.selectedDepartmentId.set(departmentId);
    this.loadSummary();
  }

  goToReports(): void {
    void this.router.navigate(['/reports']);
  }

  private loadSummary(): void {
    this.loading.set(true);
    this.loadError.set(null);

    const departmentId = this.selectedDepartmentId() ?? undefined;
    this.dashboardService.getSummary(departmentId).subscribe({
      next: (data) => {
        this.summary.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.summary.set(null);
        this.loading.set(false);
        this.loadError.set('Unable to load dashboard summary. Please try again.');
      },
    });
  }
}
