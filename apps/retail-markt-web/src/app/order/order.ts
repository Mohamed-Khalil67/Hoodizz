import { Component, inject, OnInit } from '@angular/core';
import { OrderStore } from '../stores/order.store';
import { OrderDetail } from '../components/order-detail/order-detail';
import { pipe, switchMap } from 'rxjs';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';

@Component({
  selector: 'app-order',
  imports: [OrderDetail, RouterLink],
  templateUrl: './order.html',
  styleUrl: './order.scss',
})
export class Order implements OnInit {
  orderStore = inject(OrderStore);
  route = inject(ActivatedRoute);
  getOrder = rxMethod<string>(
    pipe(switchMap((orderId) => this.orderStore.getOrder(orderId))),
  );

  ngOnInit(): void {
    const orderId = this.route.snapshot.paramMap.get('id');
    if (!orderId) {
      this.orderStore.setError('No order ID found');
      return;
    }
    this.getOrder(orderId);
  }
}
