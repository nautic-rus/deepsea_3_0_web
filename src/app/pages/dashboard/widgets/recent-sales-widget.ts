import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';

interface Product {
  id: string;
  name: string;
  image: string;
  price: number;
  category: string;
  inventoryStatus: string;
}

@Component({
  standalone: true,
  selector: 'app-recent-sales-widget',
  imports: [CommonModule, TableModule, ButtonModule],
  template: `
    <div class="card mb-0">
      <div class="font-semibold text-xl mb-4">Recent Sales</div>
      <p-table [value]="products" [paginator]="true" [rows]="5" responsiveLayout="scroll">
        <ng-template #header>
          <tr>
            <th>Image</th>
            <th pSortableColumn="name">Name <p-sortIcon field="name"></p-sortIcon></th>
            <th pSortableColumn="price">Price <p-sortIcon field="price"></p-sortIcon></th>
            <th>View</th>
          </tr>
        </ng-template>
        <ng-template #body let-product>
          <tr>
            <td style="width: 15%; min-width: 5rem;">
              <img [src]="product.image" [alt]="product.name" class="w-16 shadow-lg rounded-lg" />
            </td>
            <td style="width: 35%; min-width: 7rem;">{{ product.name }}</td>
            <td style="width: 35%; min-width: 8rem;">{{ product.price | currency:'USD' }}</td>
            <td style="width: 15%;">
              <button pButton icon="pi pi-search" type="button" [rounded]="true" [text]="true"></button>
            </td>
          </tr>
        </ng-template>
      </p-table>
    </div>
  `
})
export class RecentSalesWidget implements OnInit {
  products: Product[] = [];

  ngOnInit() {
    this.products = [
      {
        id: '1000',
        name: 'Bamboo Watch',
        image: 'https://primefaces.org/cdn/primeng/images/demo/product/bamboo-watch.jpg',
        price: 65,
        category: 'Accessories',
        inventoryStatus: 'INSTOCK'
      },
      {
        id: '1001',
        name: 'Black Watch',
        image: 'https://primefaces.org/cdn/primeng/images/demo/product/black-watch.jpg',
        price: 72,
        category: 'Accessories',
        inventoryStatus: 'INSTOCK'
      },
      {
        id: '1002',
        name: 'Blue Band',
        image: 'https://primefaces.org/cdn/primeng/images/demo/product/blue-band.jpg',
        price: 79,
        category: 'Fitness',
        inventoryStatus: 'LOWSTOCK'
      },
      {
        id: '1003',
        name: 'Blue T-Shirt',
        image: 'https://primefaces.org/cdn/primeng/images/demo/product/blue-t-shirt.jpg',
        price: 29,
        category: 'Clothing',
        inventoryStatus: 'INSTOCK'
      },
      {
        id: '1004',
        name: 'Bracelet',
        image: 'https://primefaces.org/cdn/primeng/images/demo/product/bracelet.jpg',
        price: 15,
        category: 'Accessories',
        inventoryStatus: 'INSTOCK'
      },
      {
        id: '1005',
        name: 'Brown Purse',
        image: 'https://primefaces.org/cdn/primeng/images/demo/product/brown-purse.jpg',
        price: 120,
        category: 'Accessories',
        inventoryStatus: 'OUTOFSTOCK'
      },
      {
        id: '1006',
        name: 'Chakra Bracelet',
        image: 'https://primefaces.org/cdn/primeng/images/demo/product/chakra-bracelet.jpg',
        price: 32,
        category: 'Accessories',
        inventoryStatus: 'LOWSTOCK'
      }
    ];
  }
}
