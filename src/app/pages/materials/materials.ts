import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-materials',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './materials.html',
  styleUrls: ['./materials.scss']
})
export class MaterialsComponent {}
