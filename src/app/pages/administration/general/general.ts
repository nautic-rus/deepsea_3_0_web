import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-admin-general',
  standalone: true,
  imports: [CommonModule, TranslateModule, ButtonModule, RouterModule],
  templateUrl: './general.html',
  styleUrls: ['./general.scss']
})
export class AdminGeneralComponent {}
