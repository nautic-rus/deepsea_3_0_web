import { Routes } from '@angular/router';
import { AuthGuard } from './auth/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
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
      }
      ,
      {
        path: 'administration',
        loadComponent: () => import('./pages/administration/administration').then(m => m.AdministrationComponent),
        canActivate: [AuthGuard]
      }
      ,
      {
        path: 'issues',
        loadComponent: () => import('./pages/issues/issues').then(m => m.IssuesComponent),
        canActivate: [AuthGuard]
      }
      ,
      {
        path: 'documents',
        loadComponent: () => import('./pages/documents/documents').then(m => m.DocumentsComponent),
        canActivate: [AuthGuard]
      }
      ,
      {
        path: 'reports',
        loadComponent: () => import('./pages/reports/reports').then(m => m.ReportsComponent),
        canActivate: [AuthGuard]
      }
      ,
      {
        path: 'materials',
        loadComponent: () => import('./pages/materials/materials').then(m => m.MaterialsComponent),
        canActivate: [AuthGuard]
      }
      ,
      {
        path: 'specifications',
        loadComponent: () => import('./pages/specifications/specifications').then(m => m.SpecificationsComponent),
        canActivate: [AuthGuard]
      }
      ,
      {
        path: 'statements',
        loadComponent: () => import('./pages/statements/statements').then(m => m.StatementsComponent),
        canActivate: [AuthGuard]
      }
      ,
      {
        path: 'equipment',
        loadComponent: () => import('./pages/equipment/equipment').then(m => m.EquipmentComponent),
        canActivate: [AuthGuard]
      }
      ,
      {
        path: 'suppliers',
        loadComponent: () => import('./pages/suppliers/suppliers').then(m => m.SuppliersComponent),
        canActivate: [AuthGuard]
      }
      ,
      {
        path: 'projects',
        loadComponent: () => import('./pages/projects/projects').then(m => m.ProjectsComponent),
        canActivate: [AuthGuard]
      }
    ]
  }
];
