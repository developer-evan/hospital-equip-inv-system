import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';
import { roleGuard } from './core/guards/role.guard';
import { Role } from './core/models/role.enum';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/login.component').then((m) => m.LoginComponent),
  },
  {
    path: '',
    canActivate: [authGuard],
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
          import('./features/equipment/equipment.component').then((m) => m.EquipmentComponent),
        data: { title: 'Equipment' },
      },
      {
        path: 'maintenance',
        loadComponent: () =>
          import('./features/maintenance/maintenance.component').then((m) => m.MaintenanceComponent),
        data: { title: 'Maintenance' },
      },
      {
        path: 'maintenance/:id',
        loadComponent: () =>
          import('./features/maintenance/maintenance-detail.component').then(
            (m) => m.MaintenanceDetailComponent,
          ),
        data: { title: 'Maintenance Details' },
      },
      {
        path: 'receiving',
        loadComponent: () =>
          import('./features/receiving/receiving.component').then((m) => m.ReceivingComponent),
        data: { title: 'Receiving' },
      },
      {
        path: 'departments',
        loadComponent: () =>
          import('./features/departments/departments.component').then((m) => m.DepartmentsComponent),
        data: { title: 'Departments' },
      },
      {
        path: 'users',
        canActivate: [roleGuard(Role.ADMINISTRATOR)],
        loadComponent: () =>
          import('./features/users/users.component').then((m) => m.UsersComponent),
        data: { title: 'Users' },
      },
      {
        path: 'reports',
        canActivate: [roleGuard(Role.ADMINISTRATOR)],
        loadComponent: () =>
          import('./features/reports/reports.component').then((m) => m.ReportsComponent),
        data: { title: 'Reports' },
      },
      {
        path: 'notifications',
        loadComponent: () =>
          import('./features/notifications/notifications.component').then(
            (m) => m.NotificationsComponent,
          ),
        data: { title: 'Notifications' },
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./features/settings/settings.component').then((m) => m.SettingsComponent),
        data: { title: 'Settings' },
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./features/profile/profile.component').then((m) => m.ProfileComponent),
        data: { title: 'My Profile' },
      },
    ],
  },
  { path: '**', redirectTo: 'login' },
];
