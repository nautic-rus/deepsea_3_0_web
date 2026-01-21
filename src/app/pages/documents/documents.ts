import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-documents',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './documents.html',
  styleUrls: ['./documents.scss']
})
export class DocumentsComponent {}
