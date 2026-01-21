import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-statements',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './statements.html',
  styleUrls: ['./statements.scss']
})
export class StatementsComponent {}
