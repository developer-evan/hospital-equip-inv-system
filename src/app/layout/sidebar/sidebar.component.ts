import { Component, computed, inject, output } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs';
import { IconField } from 'primeng/iconfield';
import { InputIcon } from 'primeng/inputicon';
import { InputText } from 'primeng/inputtext';
import { Button } from 'primeng/button';
import { Avatar } from 'primeng/avatar';
import { ScrollPanelModule } from 'primeng/scrollpanel';
import { TooltipModule } from 'primeng/tooltip';

import { NavIconComponent } from '../../shared/components/nav-icon/nav-icon.component';
import {
  FOOTER_LINKS,
  NAV_SECTIONS,
  NavItem,
} from '../../shared/constants/navigation.constants';
import { StoreContextService } from '../../core/services/store-context.service';
import { SidebarStateService } from '../services/sidebar-state.service';

@Component({
  selector: 'app-sidebar',
  imports: [
    IconField,
    InputIcon,
    InputText,
    Button,
    Avatar,
    ScrollPanelModule,
    TooltipModule,
    NavIconComponent,
  ],
  host: {
    class: 'flex h-full min-h-0 flex-col bg-[#111319] text-slate-200',
  },
  template: `
    <!-- Brand -->
    <div
      class="flex shrink-0 items-center gap-3 border-b border-white/5 px-4 py-4"
      [class.justify-center]="sidebar.collapsed()"
      [class.lg:px-3]="sidebar.collapsed()"
    >
      <div
        class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-orange-500 text-white shadow-lg shadow-orange-500/20"
        aria-hidden="true"
      >
        <svg viewBox="0 0 24 24" class="size-5 fill-current" role="img">
          <path
            d="M12 4a8 8 0 1 0 7.746 9.996 1.5 1.5 0 1 1 2.912.576A10 10 0 1 1 12 2a1.5 1.5 0 0 1 0 3Z"
          />
          <path d="M12 7a1.5 1.5 0 0 1 1.5 1.5V12h3.5a1.5 1.5 0 0 1 0 3h-3.5v3.5a1.5 1.5 0 0 1-3 0V15H7.5a1.5 1.5 0 0 1 0-3H11V8.5A1.5 1.5 0 0 1 12 7Z" />
        </svg>
      </div>

      @if (!sidebar.collapsed()) {
        <span class="flex-1 text-lg font-semibold tracking-tight text-white">MediTrack</span>
      }
    </div>

    <!-- Search -->
    @if (!sidebar.collapsed()) {
      <div class="shrink-0 px-4 py-4">
        <div class="relative">
          <p-iconfield iconPosition="left" styleClass="w-full">
            <p-inputicon styleClass="pi pi-search text-slate-500" />
            <input
              pInputText
              type="search"
              placeholder="Search"
              class="w-full !rounded-xl border-white/5! !bg-[#1a1d26] !py-2.5 !pl-10 !pr-14 !text-sm !text-slate-200 placeholder:!text-slate-500"
              aria-label="Search navigation"
            />
          </p-iconfield>
          <span
            class="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-md border border-white/10 bg-[#111319] px-1.5 py-0.5 text-[10px] font-medium text-slate-500 sm:inline"
          >
            ⌘ K
          </span>
        </div>
      </div>
    } @else {
      <div class="hidden shrink-0 justify-center px-2 py-4 lg:flex">
        <p-button
          type="button"
          icon="pi pi-search"
          [rounded]="true"
          [text]="true"
          severity="secondary"
          styleClass="!size-9 !text-slate-400 hover:!text-white"
          ariaLabel="Search"
          pTooltip="Search"
          tooltipPosition="right"
          [tooltipDisabled]="!sidebar.collapsed()"
        />
      </div>
    }

    <!-- Navigation -->
    <div class="min-h-0 flex-1">
      <p-scrollpanel styleClass="sidebar-scroll h-full w-full">
        <nav class="px-3 pb-4" aria-label="Main navigation">
          @for (section of navSections(); track section.title) {
            <div class="mb-5">
              @if (!sidebar.collapsed()) {
                <p
                  class="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500"
                >
                  {{ section.title }}
                </p>
              }

              <div class="flex flex-col gap-0.5">
                @for (item of section.items; track item.route) {
                  <div class="relative">
                    <span
                      class="pointer-events-none absolute inset-y-1.5 left-0 z-10 w-1 rounded-r-full bg-orange-500 transition-opacity"
                      [class.opacity-0]="!isActive(item.route)"
                      [class.opacity-100]="isActive(item.route)"
                      aria-hidden="true"
                    ></span>

                    <p-button
                      type="button"
                      [text]="true"
                      severity="secondary"
                      [styleClass]="navItemClass(item)"
                      [ariaLabel]="item.label"
                      [pTooltip]="item.label"
                      tooltipPosition="right"
                      [tooltipDisabled]="!sidebar.collapsed()"
                      (onClick)="navigateTo(item)"
                    >
                      <span
                        class="flex w-full items-center gap-3"
                        [class.justify-center]="sidebar.collapsed()"
                      >
                        <app-nav-icon [name]="item.icon" [active]="isActive(item.route)" />

                        @if (!sidebar.collapsed()) {
                          <span class="flex-1 truncate text-left text-sm font-medium">{{
                            item.label
                          }}</span>

                          @if (item.hasChildren) {
                            <i class="pi pi-chevron-down text-xs text-slate-500" aria-hidden="true"></i>
                          }
                        }
                      </span>
                    </p-button>
                  </div>
                }
              </div>
            </div>
          }
        </nav>
      </p-scrollpanel>
    </div>

    <!-- Footer -->
    <div class="mt-auto shrink-0 border-t border-white/5 px-3 py-4">
      <div class="mb-3 flex flex-col gap-0.5">
        @for (link of footerLinks; track link.label) {
          <p-button
            type="button"
            [text]="true"
            severity="secondary"
            [styleClass]="footerLinkClass()"
            [ariaLabel]="link.label"
            [pTooltip]="link.label"
            tooltipPosition="right"
            [tooltipDisabled]="!sidebar.collapsed()"
          >
            <span
              class="flex w-full items-center gap-3"
              [class.justify-center]="sidebar.collapsed()"
            >
              <app-nav-icon [name]="link.icon" />
              @if (!sidebar.collapsed()) {
                <span class="text-sm">{{ link.label }}</span>
              }
            </span>
          </p-button>
        }
      </div>

      <p-button
        type="button"
        [text]="true"
        severity="secondary"
        [styleClass]="storeSwitcherClass()"
        ariaLabel="Switch store"
        [pTooltip]="storeProfile().name"
        tooltipPosition="right"
        [tooltipDisabled]="!sidebar.collapsed()"
        (onClick)="onStoreClick()"
      >
        <span
          class="flex w-full items-center gap-3"
          [class.justify-center]="sidebar.collapsed()"
        >
          <p-avatar
            [label]="storeProfile().initials"
            shape="circle"
            styleClass="!size-9 !bg-orange-300/90 !text-sm !font-semibold !text-orange-950 shrink-0"
          />

          @if (!sidebar.collapsed()) {
            <span class="min-w-0 flex-1 text-left">
              <span class="block text-[11px] text-slate-500">{{ storeProfile().label }}</span>
              <span class="block truncate text-sm font-semibold text-white">{{
                storeProfile().name
              }}</span>
            </span>
            @if (storeContext.hasMultipleStores()) {
              <i class="pi pi-sort text-xs text-slate-500" aria-hidden="true"></i>
            }
          }
        </span>
      </p-button>
    </div>
  `,
})
export class SidebarComponent {
  protected readonly sidebar = inject(SidebarStateService);
  protected readonly storeContext = inject(StoreContextService);
  private readonly router = inject(Router);
  protected readonly footerLinks = FOOTER_LINKS;

  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => this.router.url),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  protected readonly navSections = computed(() =>
    NAV_SECTIONS.map((section) => ({
      ...section,
      items: section.items.filter(
        (item) => !item.permission || this.storeContext.can(item.permission),
      ),
    })).filter((section) => section.items.length > 0),
  );

  protected readonly storeProfile = this.storeContext.activeStoreProfile;

  readonly navigated = output<void>();

  protected isActive(route: string): boolean {
    const url = this.currentUrl();
    return route === '/dashboard'
      ? url === route
      : url === route || url.startsWith(`${route}/`);
  }

  protected navItemClass(item: NavItem): string {
    const base =
      '!w-full !justify-start !rounded-xl !border-0 !px-3 !py-2.5 !shadow-none transition-colors';
    const collapsed = this.sidebar.collapsed() ? ' !px-2 !justify-center' : '';
    const active = this.isActive(item.route)
      ? ' !bg-white/10 !text-white hover:!bg-white/10'
      : ' !bg-transparent !text-slate-300 hover:!bg-white/5 hover:!text-white';
    return `${base}${collapsed}${active}`;
  }

  protected footerLinkClass(): string {
    const base =
      '!w-full !justify-start !rounded-xl !border-0 !px-3 !py-2 !shadow-none !bg-transparent !text-slate-400 hover:!bg-white/5 hover:!text-slate-200 transition-colors';
    return this.sidebar.collapsed() ? `${base} !px-2 !justify-center` : base;
  }

  protected storeSwitcherClass(): string {
    const base =
      '!w-full !justify-start !rounded-xl !border !border-white/5 !bg-[#1a1d26] !p-2.5 !shadow-none hover:!border-white/10 hover:!bg-[#1f2330] transition-colors';
    return this.sidebar.collapsed() ? `${base} !justify-center` : base;
  }

  protected navigateTo(item: NavItem): void {
    void this.router.navigate([item.route]);
    this.onNavigate();
  }

  protected onNavigate(): void {
    this.navigated.emit();
  }

  protected onStoreClick(): void {
    if (!this.storeContext.hasMultipleStores()) return;
    void this.router.navigate(['/select-store']);
  }
}
