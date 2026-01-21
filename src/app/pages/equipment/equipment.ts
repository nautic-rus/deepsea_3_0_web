import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-equipment',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './equipment.html',
  styleUrls: ['./equipment.scss']
})
export class EquipmentComponent {}
