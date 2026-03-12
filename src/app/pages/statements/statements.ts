import { Component } from '@angular/core';
;
import { TranslateModule } from '@ngx-translate/core';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-statements',
  standalone: true,
  imports: [TranslateModule, RouterModule, ButtonModule],
  templateUrl: './statements.html',
  styleUrls: ['./statements.scss']
})
export class StatementsComponent {}
