import { Component } from '@angular/core';
;
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-profile-main',
  standalone: true,
  imports: [TranslateModule],
  templateUrl: './main.html',
  styleUrls: ['./main.scss']
})
export class ProfileMainComponent {}
