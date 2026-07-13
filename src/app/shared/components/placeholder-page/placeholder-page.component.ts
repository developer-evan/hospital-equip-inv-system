import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';

interface PageData {
  title?: string;
  description?: string;
  icon?: string;
}

@Component({
  selector: 'app-placeholder-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex min-h-[60vh] items-center justify-center">
      <div class="flex max-w-sm flex-col items-center text-center">
        <div
          class="flex size-16 items-center justify-center rounded-2xl border border-surface text-primary-400"
        >
          <i [class]="(data()?.['icon'] ?? 'pi pi-sparkles') + ' text-2xl'"></i>
        </div>
        <h2 class="mt-5 text-lg font-semibold text-color">
          {{ data()?.['title'] ?? 'Coming soon' }}
        </h2>
        <p class="mt-2 text-sm leading-relaxed text-muted-color">
          {{ data()?.['description'] ?? 'This module is on the roadmap and will follow the same patterns as the rest of the app.' }}
        </p>
      </div>
    </div>
  `,
})
export class PlaceholderPageComponent {
  private readonly route = inject(ActivatedRoute);

  readonly data = toSignal(
    this.route.data.pipe(map((d) => d as PageData)),
    { initialValue: {} as PageData },
  );
}
