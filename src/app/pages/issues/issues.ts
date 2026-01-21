import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-issues',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './issues.html',
  styleUrls: ['./issues.scss']
})
export class IssuesComponent {}
