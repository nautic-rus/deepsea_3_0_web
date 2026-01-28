import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-admin-pages',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './pages.html',
  styleUrls: ['./pages.scss']
})
export class AdminPagesComponent {
  // Placeholder admin pages component — implement features as needed
}
