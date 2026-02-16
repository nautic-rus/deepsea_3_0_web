import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-statements',
  standalone: true,
  imports: [CommonModule, TranslateModule, RouterModule, ButtonModule],
  templateUrl: './statements.html',
  styleUrls: ['./statements.scss']
})
export class StatementsComponent {}
