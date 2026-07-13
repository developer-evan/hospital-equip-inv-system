import { DOCUMENT } from '@angular/common';
import { Injectable, computed, inject, signal } from '@angular/core';

export type ThemeMode = 'light' | 'dark';

const THEME_KEY = 'heims_theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly doc = inject(DOCUMENT);

  private readonly modeSignal = signal<ThemeMode>(this.readStoredMode());

  readonly mode = this.modeSignal.asReadonly();
  readonly isDark = computed(() => this.modeSignal() === 'dark');

  init(): void {
    this.apply(this.modeSignal());
  }

  toggle(): void {
    this.setTheme(this.isDark() ? 'light' : 'dark');
  }

  setTheme(mode: ThemeMode): void {
    this.modeSignal.set(mode);
    localStorage.setItem(THEME_KEY, mode);
    this.apply(mode);
  }

  private apply(mode: ThemeMode): void {
    const root = this.doc.documentElement;
    root.classList.toggle('app-dark', mode === 'dark');
    root.style.colorScheme = mode;
  }

  private readStoredMode(): ThemeMode {
    try {
      return localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark';
    } catch {
      return 'dark';
    }
  }
}
