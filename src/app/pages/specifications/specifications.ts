import { Component } from '@angular/core';
;
import { TranslateModule } from '@ngx-translate/core';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-specifications',
  standalone: true,
  imports: [TranslateModule, RouterModule, ButtonModule],
  templateUrl: './specifications.html',
  styleUrls: ['./specifications.scss']
})
export class SpecificationsComponent {}
