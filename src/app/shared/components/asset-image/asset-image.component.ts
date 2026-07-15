import { HttpClient } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { Image } from 'primeng/image';
import { ProgressSpinner } from 'primeng/progressspinner';
import { resolveAssetUrl } from '../../../core/utils/asset-url.util';

@Component({
  selector: 'app-asset-image',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Image, ProgressSpinner],
  host: {
    class: 'asset-image block',
    '[class.asset-image--contain]': 'contain()',
  },
  template: `
    @if (displaySrc(); as src) {
      <p-image
        [src]="src"
        [previewImageSrc]="src"
        [preview]="preview()"
        appendTo="body"
        [alt]="alt()"
        imageClass="asset-image__img"
      />
    } @else if (loading()) {
      <div class="flex aspect-square items-center justify-center rounded-xl bg-emphasis">
        <p-progressspinner styleClass="!size-8" />
      </div>
    } @else {
      <div class="flex aspect-square flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-surface p-4 text-center">
        <i class="pi pi-image text-2xl text-muted-color"></i>
        <span class="text-xs text-muted-color">Image unavailable</span>
        @if (absoluteUrl()) {
          <a [href]="absoluteUrl()" target="_blank" rel="noopener noreferrer" class="text-xs text-primary hover:underline">
            Open in new tab
          </a>
        }
      </div>
    }
  `,
})
export class AssetImageComponent {
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);

  readonly src = input.required<string>();
  readonly alt = input('Image');
  readonly preview = input(true);
  readonly contain = input(false);

  readonly displaySrc = signal<string | null>(null);
  readonly absoluteUrl = signal('');
  readonly loading = signal(true);

  private blobUrl: string | null = null;

  constructor() {
    effect((onCleanup) => {
      const absolute = resolveAssetUrl(this.src());
      this.absoluteUrl.set(absolute);

      if (!absolute) {
        this.loading.set(false);
        this.clearDisplay();
        return;
      }

      this.loading.set(true);
      this.clearDisplay();

      let cancelled = false;
      const sub = this.http.get(absolute, { responseType: 'blob' }).subscribe({
        next: (blob) => {
          if (cancelled) return;

          const isImage =
            !blob.type ||
            blob.type.startsWith('image/') ||
            blob.type === 'application/octet-stream';

          if (!isImage) {
            this.loading.set(false);
            return;
          }

          this.revokeBlob();
          this.blobUrl = URL.createObjectURL(blob);
          this.displaySrc.set(this.blobUrl);
          this.loading.set(false);
        },
        error: () => {
          if (!cancelled) this.loading.set(false);
        },
      });

      onCleanup(() => {
        cancelled = true;
        sub.unsubscribe();
        this.revokeBlob();
        this.displaySrc.set(null);
      });
    });

    this.destroyRef.onDestroy(() => this.revokeBlob());
  }

  private clearDisplay(): void {
    this.revokeBlob();
    this.displaySrc.set(null);
  }

  private revokeBlob(): void {
    if (this.blobUrl) {
      URL.revokeObjectURL(this.blobUrl);
      this.blobUrl = null;
    }
  }
}
