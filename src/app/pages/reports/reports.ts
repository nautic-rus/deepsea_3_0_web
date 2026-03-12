import { Component } from '@angular/core';
;
import { TranslateModule } from '@ngx-translate/core';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [TranslateModule, RouterModule, ButtonModule],
  templateUrl: './reports.html',
  styleUrls: ['./reports.scss']
})
export class ReportsComponent {}
