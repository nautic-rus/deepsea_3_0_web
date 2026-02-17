import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService, LangChangeEvent } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { AccordionModule } from 'primeng/accordion';
import { RippleModule } from 'primeng/ripple';
import { RouterModule } from '@angular/router';

export interface ProjectsMenuGroup {
  label: string;
  items: { label: string; icon: string; routerLink: string[] }[];
}

@Component({
	selector: 'app-projects',
	standalone: true,
	imports: [CommonModule, TranslateModule, AccordionModule, RippleModule, RouterModule],
	templateUrl: './projects.html',
	styleUrls: ['./projects.scss']
})
export class ProjectsComponent implements OnInit, OnDestroy {
		menuGroups: ProjectsMenuGroup[] = [];
		private langSub: Subscription | null = null;

		constructor(private translate: TranslateService) {}

		ngOnInit(): void {
			this.buildMenu();
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
			this.menuGroups = [
				{
					label: t('components.projects.menu.TITLE'),
					items: [
						{ label: t('components.projects.menu.LIST'), icon: 'pi pi-fw pi-folder', routerLink: ['/projects/projects-list'] },
						{ label: t('components.projects.menu.USERS'), icon: 'pi pi-fw pi-users', routerLink: ['/projects/projects-users'] },
						{ label: t('components.projects.menu.TEMPLATES'), icon: 'pi pi-fw pi-clone', routerLink: ['/projects/projects-templates'] }
					]
				}
			];
		}
}
