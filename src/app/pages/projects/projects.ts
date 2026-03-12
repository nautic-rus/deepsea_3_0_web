import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, DestroyRef, inject } from '@angular/core';
;
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AccordionModule } from 'primeng/accordion';
import { RippleModule } from 'primeng/ripple';
import { RouterModule } from '@angular/router';

export interface ProjectsMenuGroup {
  label: string;
  items: { label: string; icon: string; routerLink: string[] }[];
}

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'app-projects',
	standalone: true,
	imports: [TranslateModule, AccordionModule, RippleModule, RouterModule],
	templateUrl: './projects.html',
	styleUrls: ['./projects.scss']
})
export class ProjectsComponent implements OnInit, OnDestroy {
		menuGroups: ProjectsMenuGroup[] = [];
		private destroyRef = inject(DestroyRef);

		constructor(private translate: TranslateService, private cdr: ChangeDetectorRef) {}

		ngOnInit(): void {
			this.buildMenu();
			this.translate.onLangChange.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
				this.buildMenu();
				this.cdr.markForCheck();
			});
		}

		ngOnDestroy(): void { /* subscriptions auto-cleaned via takeUntilDestroyed */ }

		private buildMenu(): void {
			const t = (k: string) => this.translate.instant(k) || k;
			this.menuGroups = [
				{
					label: t('components.projects.menu.TITLE'),
					items: [
						{ label: t('components.projects.menu.LIST'), icon: 'pi pi-fw pi-folder', routerLink: ['/projects/projects-list'] },
						{ label: t('components.projects.menu.USERS'), icon: 'pi pi-fw pi-users', routerLink: ['/projects/projects-users'] }
					]
				},
				{
					label: t('MENU.ISSUE'),
					items: [
						{ label: t('components.projects.menu.STATUSES'), icon: 'pi pi-fw pi-list', routerLink: ['/projects/issues/statuses'] },
						{ label: t('components.projects.menu.TYPES'), icon: 'pi pi-fw pi-tags', routerLink: ['/projects/issues/types'] },
						{ label: t('components.projects.menu.WORK_FLOW'), icon: 'pi pi-fw pi-cog', routerLink: ['/projects/issues/work-flow'] }
					]
				},
				{
					label: t('MENU.DOCUMENT'),
					items: [
						{ label: t('components.projects.menu.STATUSES'), icon: 'pi pi-fw pi-list', routerLink: ['/projects/documents/statuses'] },
						{ label: t('components.projects.menu.TYPES'), icon: 'pi pi-fw pi-tags', routerLink: ['/projects/documents/types'] },
						{ label: t('components.projects.menu.WORK_FLOW'), icon: 'pi pi-fw pi-cog', routerLink: ['/projects/documents/work-flow'] },
						{ label: t('components.projects.menu.STORAGE_TYPES'), icon: 'pi pi-fw pi-database', routerLink: ['/projects/documents/storage-types'] }
					]
				},
				{
					label: t('MENU.CUSTOMER_QUESTION'),
					items: [
						{ label: t('components.projects.menu.STATUSES'), icon: 'pi pi-fw pi-list', routerLink: ['/projects/questions/statuses'] },
						{ label: t('components.projects.menu.TYPES'), icon: 'pi pi-fw pi-tags', routerLink: ['/projects/questions/types'] },
						{ label: t('components.projects.menu.WORK_FLOW'), icon: 'pi pi-fw pi-cog', routerLink: ['/projects/questions/work-flow'] }
					]
				}
			];
		}
}
