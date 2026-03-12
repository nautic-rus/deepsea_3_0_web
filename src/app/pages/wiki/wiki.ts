import { Component } from '@angular/core';
;
import { TranslateModule } from '@ngx-translate/core';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-wiki',
  standalone: true,
  imports: [TranslateModule, RouterModule, ButtonModule],
  templateUrl: './wiki.html',
  styleUrls: ['./wiki.scss']
})
export class WikiComponent {}
