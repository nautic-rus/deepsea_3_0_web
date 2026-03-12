import { Component } from '@angular/core';
;
import { TranslateModule } from '@ngx-translate/core';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-equipment',
  standalone: true,
  imports: [TranslateModule, RouterModule, ButtonModule],
  templateUrl: './equipment.html',
  styleUrls: ['./equipment.scss']
})
export class EquipmentComponent {}
