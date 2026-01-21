import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-suppliers',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './suppliers.html',
  styleUrls: ['./suppliers.scss']
})
export class SuppliersComponent {}
