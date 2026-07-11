import { Component, computed, inject } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs';
import { Button } from 'primeng/button';
import { Avatar } from 'primeng/avatar';
import { TooltipModule } from 'primeng/tooltip';

import { NAV_SECTIONS } from '../../shared/constants/navigation.constants';
import { StoreContextService } from '../../core/services/store-context.service';
import { AuthService } from '../../core/services/auth.service';
import { ROLE_LABEL } from '../../core/models/role.enum';
import { SidebarStateService } from '../services/sidebar-state.service';

@Component({
  selector: 'app-dashboard-header',
  imports: [Button, Avatar, TooltipModule],
  host: {
    class:
      'sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b border-white/5 bg-[#0a0b0f]/90 px-4 backdrop-blur-md md:h-[4.25rem] md:px-5',
  },
  template: `
    <!-- Mobile hamburger -->
    <p-button
      type="button"
      icon="pi pi-bars"
      [rounded]="true"
      [text]="true"
      severity="secondary"
      styleClass="!text-slate-300 hover:!text-white hover:!bg-slate-700 lg:!hidden"
      ariaLabel="Open navigation menu"
      (onClick)="sidebar.toggleMobile()"
    />

    <!-- Desktop sidebar toggle -->
    <p-button
      type="button"
      [icon]="sidebar.collapsed() ? 'pi pi-chevron-right' : 'pi pi-align-justify'"
      [rounded]="true"
      [text]="true"
      severity="secondary"
      styleClass="!hidden !size-9 !text-slate-400 hover:!text-white hover:!bg-slate-700 lg:!inline-flex"
      [ariaLabel]="sidebar.collapsed() ? 'Expand sidebar' : 'Collapse sidebar'"
      (onClick)="sidebar.toggleCollapsed()"
    />

    <div class="min-w-0 flex-1">
      <p class="truncate text-[10px] font-semibold uppercase tracking-widest text-slate-500">
        Dashboard
      </p>
      <h1 class="truncate text-base font-semibold text-white md:text-lg">
        {{ pageTitle() }}
      </h1>
    </div>

    <div class="flex items-center gap-2">
      <p-button
        type="button"
        icon="pi pi-bell"
        [rounded]="true"
        [text]="true"
        severity="secondary"
        styleClass="!text-slate-400 hover:!text-white"
        ariaLabel="Notifications"
        pTooltip="Notifications"
        tooltipPosition="bottom"
      />

      <span class="hidden h-6 w-px bg-white/10 sm:block"></span>

      <div class="hidden items-center gap-2 sm:flex">
        <p-avatar
          [label]="userInitials()"
          shape="circle"
          styleClass="!size-8 !bg-orange-500/20 !text-xs !font-semibold !text-orange-300"
        />
        <div class="min-w-0 text-left">
          <p class="truncate text-sm font-medium text-white">{{ user()?.fullName }}</p>
          <p class="truncate text-xs text-slate-500">{{ roleLabel() }}</p>
        </div>
      </div>

      <p-button
        type="button"
        icon="pi pi-sign-out"
        [rounded]="true"
        [text]="true"
        severity="secondary"
        styleClass="!text-slate-400 hover:!text-rose-400"
        ariaLabel="Sign out"
        pTooltip="Sign out"
        tooltipPosition="bottom"
        (onClick)="logout()"
      />
    </div>
  `,
})
export class DashboardHeaderComponent {
  private readonly router = inject(Router);
  protected readonly sidebar = inject(SidebarStateService);
  protected readonly storeContext = inject(StoreContextService);
  protected readonly auth = inject(AuthService);

  protected readonly user = this.auth.currentUser;

  protected readonly userInitials = computed(() => {
    const user = this.user();
    return user ? this.auth.getInitials(user.fullName) : '';
  });

  protected readonly roleLabel = computed(() => {
    const user = this.user();
    return user ? ROLE_LABEL[user.role] : '';
  });

  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => this.router.url),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  protected readonly pageTitle = computed(() => {
    const url = this.currentUrl();
    const allItems = NAV_SECTIONS.flatMap((section) => section.items);
    const match = allItems.find(
      (item) => url === item.route || url.startsWith(item.route + '/'),
    );
    return match?.label ?? 'Overview';
  });

  protected logout(): void {
    this.auth.logout();
  }
}
