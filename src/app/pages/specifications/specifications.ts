import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';


@Component({
  selector: 'app-specifications',
  standalone: true,
  imports: [CommonModule, TranslateModule, RouterModule, ButtonModule],
  templateUrl: './specifications.html',
  styleUrls: ['./specifications.scss']
})
export class SpecificationsComponent {}
