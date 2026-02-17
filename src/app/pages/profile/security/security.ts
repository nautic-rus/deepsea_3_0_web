import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-profile-security',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './security.html',
  styleUrls: ['./security.scss']
})
export class ProfileSecurityComponent {}
