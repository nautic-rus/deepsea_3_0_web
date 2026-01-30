import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService, LangChangeEvent } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { MenuModule } from 'primeng/menu';
import { AccordionModule } from 'primeng/accordion';
import { MenuItem } from 'primeng/api';
import { RouterModule } from '@angular/router';

@Component({
	selector: 'app-projects',
	standalone: true,
	imports: [CommonModule, TranslateModule, MenuModule, AccordionModule, RouterModule],
	templateUrl: './projects.html',
	styleUrls: ['./projects.scss']
})
export class ProjectsComponent implements OnInit, OnDestroy {
		menuItems: MenuItem[] = [];
		private langSub: Subscription | null = null;

		constructor(private translate: TranslateService) {}

		ngOnInit(): void {
			this.buildMenu();
			// Rebuild menu when language changes so labels update on the fly
			this.langSub = this.translate.onLangChange.subscribe((e: LangChangeEvent) => {
				this.buildMenu();
			});
		}

		ngOnDestroy(): void {
			if (this.langSub) {
				this.langSub.unsubscribe();
				this.langSub = null;
			}
		}

		private buildMenu(): void {
			const t = (k: string) => this.translate.instant(k) || k;
			this.menuItems = [
				{
					label: t('components.projects.menu.TITLE'),
					items: [
						{ label: t('components.projects.menu.LIST'), icon: 'pi pi-folder', routerLink: ['/projects/projects-list'] },
						{ label: t('components.projects.menu.USERS'), icon: 'pi pi-users', routerLink: ['/projects/projects-users'] },
						// { label: t('components.projects.menu.TEMPLATES'), icon: 'pi pi-clone', routerLink: ['/projects/projects-templates'] }
					]
				}
			];
		}
}
