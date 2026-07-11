import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Tag } from 'primeng/tag';

type Tone = 'success' | 'warn' | 'danger' | 'info' | 'secondary';

const STATUS_TONE: Record<string, Tone> = {
  WORKING: 'success',
  COMPLETED: 'success',
  ACTIVE: 'success',
  UNDER_REPAIR: 'warn',
  IN_PROGRESS: 'warn',
  SCHEDULED: 'info',
  PENDING_INSTALLATION: 'info',
  OVERDUE: 'danger',
  CONDEMNED: 'danger',
  DECOMMISSIONED: 'secondary',
  INACTIVE: 'secondary',
};

@Component({
  selector: 'app-status-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Tag],
  template: `
    <p-tag
      [value]="label()"
      [severity]="severity()"
      [rounded]="true"
      styleClass="!text-xs !font-medium"
    />
  `,
})
export class StatusBadgeComponent {
  readonly status = input.required<string>();

  readonly severity = computed(() => STATUS_TONE[this.status()] ?? 'secondary');

  readonly label = computed(() =>
    this.status()
      .toLowerCase()
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' '),
  );
}
