import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class SidebarStateService {
  readonly collapsed = signal<boolean>(false);
  readonly mobileOpen = signal<boolean>(false);

  toggleCollapsed(): void {
    this.collapsed.update((v) => !v);
  }

  toggleMobile(): void {
    this.mobileOpen.update((v) => !v);
  }

  setMobileOpen(open: boolean): void {
    this.mobileOpen.set(open);
  }

  closeMobile(): void {
    this.mobileOpen.set(false);
  }
}
