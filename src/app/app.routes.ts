import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./layout/shell/dashboard-layout.component').then((m) => m.DashboardLayoutComponent),
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
        data: { title: 'Overview' },
      },
      {
        path: 'equipment',
        loadComponent: () =>
          import('./shared/components/placeholder-page/placeholder-page.component').then(
            (m) => m.PlaceholderPageComponent,
          ),
        data: {
          title: 'Equipment',
          icon: 'pi pi-box',
          description: 'Browse, register and track every asset — list, detail and lifecycle views land here next.',
        },
      },
      {
        path: 'maintenance',
        loadComponent: () =>
          import('./shared/components/placeholder-page/placeholder-page.component').then(
            (m) => m.PlaceholderPageComponent,
          ),
        data: {
          title: 'Maintenance',
          icon: 'pi pi-wrench',
          description: 'Preventive, corrective and calibration schedules with completion logs.',
        },
      },
      {
        path: 'receiving',
        loadComponent: () =>
          import('./shared/components/placeholder-page/placeholder-page.component').then(
            (m) => m.PlaceholderPageComponent,
          ),
        data: {
          title: 'Receiving',
          icon: 'pi pi-inbox',
          description: 'Register new equipment and walk it through installation and status changes.',
        },
      },
      {
        path: 'departments',
        loadComponent: () =>
          import('./shared/components/placeholder-page/placeholder-page.component').then(
            (m) => m.PlaceholderPageComponent,
          ),
        data: {
          title: 'Departments',
          icon: 'pi pi-building',
          description: 'Manage hospital departments that equipment and staff are scoped to.',
        },
      },
      {
        path: 'users',
        loadComponent: () =>
          import('./shared/components/placeholder-page/placeholder-page.component').then(
            (m) => m.PlaceholderPageComponent,
          ),
        data: {
          title: 'Users',
          icon: 'pi pi-users',
          description: 'Administrator-only user management — roles, department assignment and access resets.',
        },
      },
      {
        path: 'reports',
        loadComponent: () =>
          import('./shared/components/placeholder-page/placeholder-page.component').then(
            (m) => m.PlaceholderPageComponent,
          ),
        data: {
          title: 'Reports',
          icon: 'pi pi-chart-bar',
          description: 'Export inventory, breakdown, PM and engineer-work reports as Excel or PDF.',
        },
      },
      {
        path: 'notifications',
        loadComponent: () =>
          import('./shared/components/placeholder-page/placeholder-page.component').then(
            (m) => m.PlaceholderPageComponent,
          ),
        data: {
          title: 'Notifications',
          icon: 'pi pi-bell',
          description: 'Every alert in one place, with read/unread state and quick links back to the source record.',
        },
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./shared/components/placeholder-page/placeholder-page.component').then(
            (m) => m.PlaceholderPageComponent,
          ),
        data: {
          title: 'Settings',
          icon: 'pi pi-cog',
          description: 'Facility profile, notification preferences and system configuration.',
        },
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./shared/components/placeholder-page/placeholder-page.component').then(
            (m) => m.PlaceholderPageComponent,
          ),
        data: {
          title: 'My Profile',
          icon: 'pi pi-user',
          description: 'Your account details and password.',
        },
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
