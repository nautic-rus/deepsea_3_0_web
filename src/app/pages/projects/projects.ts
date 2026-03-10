import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
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
			this.langSub = this.translate.onLangChange.subscribe(() => {
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
						{ label: t('components.projects.menu.USERS'), icon: 'pi pi-fw pi-users', routerLink: ['/projects/projects-users'] }
					]
				}
				,
				{
					label: t('components.projects.menu.SETTINGS'),
					items: [
						{ label: t('components.projects.menu.STATUSES'), icon: 'pi pi-fw pi-list', routerLink: ['/projects/statuses'] },
						{ label: t('components.projects.menu.TYPES'), icon: 'pi pi-fw pi-tags', routerLink: ['/projects/types'] },
						{ label: t('components.projects.menu.STORAGE_TYPES'), icon: 'pi pi-fw pi-database', routerLink: ['/projects/storage-types'] },
						{ label: t('components.projects.menu.WORK_FLOW'), icon: 'pi pi-fw pi-cog', routerLink: ['/projects/work-flow'] }
					]
				}
			];
		}
}
