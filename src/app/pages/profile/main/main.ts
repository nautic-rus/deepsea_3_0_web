import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-profile-main',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './main.html',
  styleUrls: ['./main.scss']
})
export class ProfileMainComponent {}
