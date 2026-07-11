import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
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
import { RecentActivityRow } from '../../core/models/dashboard-summary.model';

const CHART_RANGES = ['Weekly', 'Monthly', 'Quarterly'] as const;
type ChartRange = (typeof CHART_RANGES)[number];

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
    KpiCardComponent,
    StatusBadgeComponent,
    BarLineChartComponent,
    RadarChartComponent,
  ],
  template: `
    <!-- Page header -->
    <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 class="text-xl font-semibold text-white">Overview</h2>
        <p class="mt-1 text-sm text-slate-500">
          Track equipment health, maintenance and receiving across your facility.
        </p>
      </div>

      <div class="flex shrink-0 items-center gap-2">
        <p-button
          type="button"
          icon="pi pi-download"
          label="Export Data"
          [outlined]="true"
          severity="secondary"
          styleClass="dashboard-toolbar-btn !rounded-xl !border-white/10 !bg-transparent !text-slate-300 hover:!border-white/20 hover:!bg-white/5 hover:!text-white"
          pTooltip="Export dashboard data"
          tooltipPosition="bottom"
        />
        <p-button
          type="button"
          icon="pi pi-chart-line"
          label="View Reports"
          styleClass="dashboard-toolbar-btn !rounded-xl !border-orange-500 !bg-orange-500 !text-white hover:!border-orange-400 hover:!bg-orange-400"
          pTooltip="Open reports"
          tooltipPosition="bottom"
          (onClick)="goToReports()"
        />
      </div>
    </div>

    <!-- KPI cards -->
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      @for (kpi of kpis(); track kpi.label) {
        <app-kpi-card [kpi]="kpi" />
      }
    </div>

    <!-- Charts -->
    <div class="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
      <!-- Equipment activity -->
      <div class="rounded-2xl border border-white/5 bg-[#111319] p-5 lg:col-span-2">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p class="text-sm font-semibold text-white">Equipment Activity</p>
            <div class="mt-1.5 flex flex-wrap items-center gap-2">
              <span class="text-2xl font-semibold text-white">{{ weeklyTotal() }}</span>
              <p-tag
                icon="pi pi-arrow-up-right"
                value="12%"
                severity="success"
                [rounded]="true"
                styleClass="!text-xs !font-semibold"
                pTooltip="Up 12% vs last week"
                tooltipPosition="top"
              />
              <span class="text-xs text-slate-500">vs last week</span>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <p-select
              [options]="chartRangeOptions"
              [ngModel]="chartRange()"
              (ngModelChange)="setChartRange($event)"
              optionLabel="label"
              optionValue="value"
              styleClass="!min-w-[7.5rem] !rounded-lg !border-white/10 !bg-[#1a1d26] !text-xs !text-slate-300"
              panelStyleClass="!bg-[#1a1d26] !border-white/10"
              pTooltip="Chart time range"
              tooltipPosition="top"
            />
            <p-button
              type="button"
              icon="pi pi-external-link"
              [rounded]="true"
              [text]="true"
              severity="secondary"
              styleClass="!size-8 !text-slate-500 hover:!text-slate-300"
              ariaLabel="Expand chart"
              pTooltip="Expand chart"
              tooltipPosition="top"
            />
          </div>
        </div>

        <div class="mt-3 flex flex-wrap items-center gap-2">
          @for (item of activityLegend; track item.label) {
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

        <div class="mt-4 h-64">
          <app-bar-line-chart
            [labels]="chartLabels()"
            [bars]="barSeries()"
            [line]="lineSeries()"
          />
        </div>
      </div>

      <!-- Operational health -->
      <div class="flex flex-col rounded-2xl border border-white/5 bg-[#111319] p-5">
        <div class="flex items-start justify-between gap-3">
          <p class="text-sm font-semibold text-white">Operational Health</p>
          <p-button
            type="button"
            icon="pi pi-external-link"
            [rounded]="true"
            [text]="true"
            severity="secondary"
            styleClass="!size-8 !text-slate-500 hover:!text-slate-300"
            ariaLabel="Expand chart"
            pTooltip="Expand chart"
            tooltipPosition="top"
          />
        </div>

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
      </div>
    </div>

    <!-- Recent activity -->
    <div class="mt-5 overflow-hidden rounded-2xl border border-white/5 bg-[#111319]">
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
              <p class="text-sm font-semibold text-white">Recent Transactions</p>
              <p class="mt-0.5 text-xs text-slate-500">
                {{ filteredActivity().length }} record{{ filteredActivity().length === 1 ? '' : 's' }}
              </p>
            </div>

            <div class="flex items-center gap-2">
              <p-iconfield iconPosition="left" styleClass="w-full sm:w-56">
                <p-inputicon styleClass="pi pi-search !text-slate-500" />
                <input
                  pInputText
                  type="search"
                  placeholder="Search transactions"
                  [ngModel]="searchTerm()"
                  (ngModelChange)="searchTerm.set($event)"
                  class="w-full !rounded-lg !border-white/10 !bg-[#1a1d26] !py-2 !pl-9 !text-sm !text-slate-200 placeholder:!text-slate-500"
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
                styleClass="dashboard-toolbar-btn !rounded-lg !border-white/10 !text-slate-300 hover:!border-white/20 hover:!bg-white/5"
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
              <span class="font-mono text-xs font-medium text-slate-400">{{ row.assetNumber }}</span>
            </td>
            <td>
              <div class="flex items-center gap-3">
                <p-avatar
                  [label]="row.avatarInitials"
                  shape="circle"
                  styleClass="!size-8 !bg-white/5 !text-[11px] !font-semibold !text-slate-300"
                  [pTooltip]="row.assignedTo"
                  tooltipPosition="top"
                />
                <div class="min-w-0">
                  <p class="truncate font-medium text-slate-200">{{ row.equipmentName }}</p>
                  <p class="truncate text-xs text-slate-500">{{ row.assignedTo }}</p>
                </div>
              </div>
            </td>
            <td>
              <app-status-badge [status]="row.status" />
            </td>
            <td>
              <span class="text-slate-400">{{ row.department }}</span>
            </td>
            <td>
              <span class="text-slate-500">{{ row.updatedAt }}</span>
            </td>
            <td>
              <p-button
                type="button"
                icon="pi pi-ellipsis-h"
                [rounded]="true"
                [text]="true"
                severity="secondary"
                styleClass="!size-8 !text-slate-500 hover:!text-slate-300"
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
                  class="flex size-12 items-center justify-center rounded-2xl border border-white/5 bg-white/5 text-slate-500"
                >
                  <i class="pi pi-inbox text-xl"></i>
                </span>
                <div>
                  <p class="text-sm font-medium text-slate-300">No transactions found</p>
                  <p class="mt-1 text-xs text-slate-500">
                    Try adjusting your search or filter criteria.
                  </p>
                </div>
              </div>
            </td>
          </tr>
        </ng-template>
      </p-table>
    </div>
  `,
})
export class DashboardComponent {
  private readonly dashboardService = inject(DashboardService);
  private readonly router = inject(Router);

  readonly activityLegend: LegendItem[] = [
    { label: 'Received', icon: 'pi pi-inbox', severity: 'secondary' },
    { label: 'Installed', icon: 'pi pi-check-circle', severity: 'warn' },
    { label: 'PM Completed', icon: 'pi pi-wrench', severity: 'success' },
  ];

  readonly healthLegend: LegendItem[] = [
    { label: 'This week', icon: 'pi pi-calendar', severity: 'warn' },
    { label: 'Last week', icon: 'pi pi-history', severity: 'success' },
  ];

  readonly kpis = toSignal(this.dashboardService.getKpiTrends(), { initialValue: [] });
  readonly weeklyActivity = toSignal(this.dashboardService.getWeeklyActivity(), {
    initialValue: [],
  });
  readonly operationalHealth = toSignal(this.dashboardService.getOperationalHealth(), {
    initialValue: [],
  });
  readonly recentActivity = toSignal(this.dashboardService.getRecentActivity(), {
    initialValue: [],
  });

  readonly chartRangeOptions = CHART_RANGES.map((range) => ({ label: range, value: range }));
  readonly chartRange = signal<ChartRange>('Weekly');
  readonly searchTerm = signal('');

  readonly weeklyTotal = computed(() =>
    this.weeklyActivity().reduce((sum, p) => sum + p.received + p.installed, 0),
  );

  readonly chartLabels = computed(() => this.weeklyActivity().map((p) => p.label));

  readonly barSeries = computed<BarSeries[]>(() => [
    { label: 'Received', data: this.weeklyActivity().map((p) => p.received), color: '#374151' },
    { label: 'Installed', data: this.weeklyActivity().map((p) => p.installed), color: '#f97316' },
  ]);

  readonly lineSeries = computed<LineSeries>(() => ({
    label: 'PM Completed',
    data: this.weeklyActivity().map((p) => p.pmCompleted),
    color: '#22c55e',
  }));

  readonly radarLabels = computed(() => this.operationalHealth().map((m) => m.axis));

  readonly radarSeries = computed<RadarSeries[]>(() => [
    {
      label: 'This week',
      data: this.operationalHealth().map((m) => m.thisWeek),
      color: '#f97316',
    },
    {
      label: 'Last week',
      data: this.operationalHealth().map((m) => m.lastWeek),
      color: '#22c55e',
    },
  ]);

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

  setChartRange(range: ChartRange): void {
    this.chartRange.set(range);
  }

  goToReports(): void {
    void this.router.navigate(['/reports']);
  }
}
