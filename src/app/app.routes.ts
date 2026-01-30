import { Routes } from '@angular/router';
import { AuthGuard } from './auth/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login').then(m => m.LoginComponent)
  },
  {
    path: 'reset-password',
    loadComponent: () => import('./pages/password-reset/password-reset').then(m => m.PasswordResetComponent)
  },
  {
    path: '',
    loadComponent: () => import('./layout/layout').then(m => m.LayoutComponent),
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./pages/dashboard/dashboard').then(m => m.DashboardComponent),
        canActivate: [AuthGuard]
      },
      {
        path: 'profile',
        loadComponent: () => import('./pages/profile/profile').then(m => m.ProfileComponent),
        canActivate: [AuthGuard]
      },
      {
        path: 'administration',
        loadComponent: () => import('./pages/administration/administration').then(m => m.AdministrationComponent),
        canActivate: [AuthGuard],
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'users' },
          { path: 'users', loadComponent: () => import('./pages/administration/users/users').then(m => m.AdminUsersComponent), canActivate: [AuthGuard] },
          { path: 'roles', loadComponent: () => import('./pages/administration/roles/roles').then(m => m.AdminRolesComponent), canActivate: [AuthGuard] },
          { path: 'permissions', loadComponent: () => import('./pages/administration/permissions/permissions').then(m => m.AdminPermissionsComponent), canActivate: [AuthGuard] },
          { path: 'pages', loadComponent: () => import('./pages/administration/pages/pages').then(m => m.AdminPagesComponent), canActivate: [AuthGuard] },
          { path: 'notifications', loadComponent: () => import('./pages/administration/notifications/notifications').then(m => m.AdminNotificationsComponent), canActivate: [AuthGuard] },
          { path: 'departments', loadComponent: () => import('./pages/administration/departments/departments').then(m => m.AdminDepartmentsComponent), canActivate: [AuthGuard] },
          { path: 'specializations', loadComponent: () => import('./pages/administration/specializations/specializations').then(m => m.AdminSpecializationsComponent), canActivate: [AuthGuard] }
        ]
      },
      {
        path: 'issues',
        loadComponent: () => import('./pages/issues/issues').then(m => m.IssuesComponent),
        canActivate: [AuthGuard]
      },
      {
        path: 'documents',
        loadComponent: () => import('./pages/documents/documents').then(m => m.DocumentsComponent),
        canActivate: [AuthGuard]
      },
      {
        path: 'reports',
        loadComponent: () => import('./pages/reports/reports').then(m => m.ReportsComponent),
        canActivate: [AuthGuard]
      },
      {
        path: 'materials',
        loadComponent: () => import('./pages/materials/materials').then(m => m.MaterialsComponent),
        canActivate: [AuthGuard]
      },
      {
        path: 'specifications',
        loadComponent: () => import('./pages/specifications/specifications').then(m => m.SpecificationsComponent),
        canActivate: [AuthGuard]
      },
      {
        path: 'statements',
        loadComponent: () => import('./pages/statements/statements').then(m => m.StatementsComponent),
        canActivate: [AuthGuard]
      },
      {
        path: 'equipment',
        loadComponent: () => import('./pages/equipment/equipment').then(m => m.EquipmentComponent),
        canActivate: [AuthGuard]
      },
      {
        path: 'suppliers',
        loadComponent: () => import('./pages/suppliers/suppliers').then(m => m.SuppliersComponent),
        canActivate: [AuthGuard]
      },
      {
        path: 'projects',
        loadComponent: () => import('./pages/projects/projects').then(m => m.ProjectsComponent),
        canActivate: [AuthGuard],
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'projects-list' },
          { path: 'projects-list', loadComponent: () => import('./pages/projects/projects-list/projects-list').then(m => m.ProjectsListComponent), canActivate: [AuthGuard] },
          { path: 'projects-users', loadComponent: () => import('./pages/projects/projects-users/projects-users').then(m => m.ProjectsUsersComponent), canActivate: [AuthGuard] },
          { path: 'projects-templates', loadComponent: () => import('./pages/projects/projects-templates/projects-templates').then(m => m.ProjectsTemplatesComponent), canActivate: [AuthGuard] }
        ]
      }
    ]
  }
];
