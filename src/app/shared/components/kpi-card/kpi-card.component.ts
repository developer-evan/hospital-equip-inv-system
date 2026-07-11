import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Button } from 'primeng/button';
import { Tag } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { KpiTrend } from '../../../core/models/dashboard-summary.model';

@Component({
  selector: 'app-kpi-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button, Tag, TooltipModule],
  template: `
    <div
      class="group relative overflow-hidden rounded-2xl border border-white/5 bg-[#111319] p-5 transition-colors hover:border-white/10"
    >
      <div class="flex items-start justify-between gap-3">
        <div class="flex items-center gap-2.5">
          <p-button
            type="button"
            [icon]="kpi().icon"
            [rounded]="true"
            [text]="true"
            severity="secondary"
            styleClass="!size-9 !cursor-default !bg-orange-500/10 !text-orange-400 pointer-events-none"
            [attr.aria-hidden]="true"
            tabindex="-1"
          />
          <span class="text-sm font-medium text-slate-400">{{ kpi().label }}</span>
        </div>

        <p-button
          type="button"
          icon="pi pi-ellipsis-h"
          [rounded]="true"
          [text]="true"
          severity="secondary"
          styleClass="!size-8 !text-slate-500 opacity-0 transition-opacity group-hover:opacity-100 hover:!text-slate-300 hover:!bg-slate-700"
          ariaLabel="More options"
          pTooltip="More options"
          tooltipPosition="top"
        />
      </div>

      <p class="mt-4 text-3xl font-semibold tracking-tight text-white">{{ kpi().value }}</p>

      <div class="mt-3 flex items-center gap-2">
        <p-tag
          [icon]="kpi().trend === 'up' ? 'pi pi-arrow-up-right' : 'pi pi-arrow-down-right'"
          [value]="kpi().deltaPercent + '%'"
          [severity]="kpi().trend === 'up' ? 'success' : 'danger'"
          [rounded]="true"
          styleClass="!text-xs !font-semibold"
          [pTooltip]="kpi().comparisonLabel"
          tooltipPosition="top"
        />
        <span class="text-xs text-slate-500">{{ kpi().comparisonLabel }}</span>
      </div>

      <span
        class="pointer-events-none absolute bottom-0 left-0 h-0.5 w-full origin-left scale-x-0 bg-orange-500 transition-transform duration-300 group-hover:scale-x-100"
        aria-hidden="true"
      ></span>
    </div>
  `,
})
export class KpiCardComponent {
  readonly kpi = input.required<KpiTrend>();
}
