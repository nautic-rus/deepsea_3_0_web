import { Injectable } from '@angular/core';
import { MessageService } from 'primeng/api';
import { TranslateService } from '@ngx-translate/core';

@Injectable({ providedIn: 'root' })
export class AppMessageService {
  constructor(private messageService: MessageService, private translate: TranslateService) {}

  private title(key: string, fallback: string) {
    try { return this.translate.instant(key) || fallback; } catch (e) { return fallback; }
  }

  success(detail: string) {
    this.messageService.add({ severity: 'success', summary: this.title('MESSAGES.SUCCESS', 'Success'), detail });
  }

  info(detail: string) {
    this.messageService.add({ severity: 'info', summary: this.title('MESSAGES.INFO', 'Info'), detail });
  }

  warn(detail: string) {
    this.messageService.add({ severity: 'warn', summary: this.title('MESSAGES.WARNING', 'Warning'), detail });
  }

  error(detail: string) {
    this.messageService.add({ severity: 'error', summary: this.title('MESSAGES.ERROR', 'Error'), detail });
  }

  // non-standard severities: keep same structure so consumers can use them
  secondary(detail: string) {
    this.messageService.add({ severity: 'secondary', summary: this.title('MESSAGES.SECONDARY', 'Secondary'), detail });
  }

  contrast(detail: string) {
    this.messageService.add({ severity: 'contrast', summary: this.title('MESSAGES.CONTRAST', 'Contrast'), detail });
  }

  clear(key?: string) {
    this.messageService.clear(key);
  }
}
