import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-administration',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './administration.html',
  styleUrls: ['./administration.scss']
})
export class AdministrationComponent {}
