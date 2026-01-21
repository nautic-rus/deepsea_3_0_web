import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-specifications',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './specifications.html',
  styleUrls: ['./specifications.scss']
})
export class SpecificationsComponent {}
