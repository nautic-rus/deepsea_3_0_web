import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-admin-storage',
  standalone: true,
  imports: [CommonModule, TranslateModule, ButtonModule, RouterModule],
  templateUrl: './storage.html',
  styleUrls: ['./storage.scss']
})
export class AdminStorageComponent {}
