import { Component, inject } from '@angular/core';
import { OrderStore } from '../stores/order.store';

@Component({
  selector: 'app-orders',
  imports: [],
  templateUrl: './orders.html',
  styleUrl: './orders.scss',
})
export class Orders {
  orderStore = inject(OrderStore);
}
