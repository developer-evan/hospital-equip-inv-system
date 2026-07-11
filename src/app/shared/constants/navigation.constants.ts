import { NavIconName } from '../components/nav-icon/nav-icon.component';

type Permission =
  | 'orders:create'
  | 'equipment:create'
  | 'equipment:edit'
  | 'users:manage'
  | 'reports:view'
  | 'departments:write'
  | 'receiving:register'
  | 'maintenance:create';

export interface NavItem {
  label: string;
  route: string;
  icon: NavIconName;
  permission?: Permission;
  hasChildren?: boolean;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export interface FooterLink {
  label: string;
  icon: NavIconName;
}

export const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Menu',
    items: [
      { label: 'Overview', route: '/dashboard', icon: 'overview' },
      { label: 'Equipment', route: '/equipment', icon: 'equipment' },
      { label: 'Maintenance', route: '/maintenance', icon: 'maintenance' },
      { label: 'Receiving', route: '/receiving', icon: 'receiving' },
    ],
  },
  {
    title: 'Management',
    items: [
      { label: 'Departments', route: '/departments', icon: 'departments' },
      { label: 'Users', route: '/users', icon: 'users', permission: 'users:manage' },
      { label: 'Reports', route: '/reports', icon: 'reports', permission: 'reports:view' },
    ],
  },
  {
    title: 'Others',
    items: [
      { label: 'Notifications', route: '/notifications', icon: 'notifications' },
      { label: 'Settings', route: '/settings', icon: 'settings' },
    ],
  },
];

export const FOOTER_LINKS: FooterLink[] = [
  { label: 'Feedback', icon: 'feedback' },
  { label: 'Help & Center', icon: 'help' },
];
