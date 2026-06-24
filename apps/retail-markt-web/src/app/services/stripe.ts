import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { from, switchMap } from 'rxjs';

import { CartStore } from '../stores/cart.store';
import { AuthService } from '../auth/auth.service';
import { environment } from '../environments/environment';
import { API_PATHS } from '../app.constants';

export interface CheckoutResponse {
  url: string;
  sessionId: string;
  orderId: string;
}

@Injectable({ providedIn: 'root' })
export class StripeService {
  private readonly cartStore = inject(CartStore);
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  createCheckoutSession() {
    const items = this.cartStore.items();
    const totalAmount = this.cartStore.totalAmount();

    return from(this.auth.getToken()).pipe(
      switchMap((token) =>
        this.http.post<CheckoutResponse>(
          `${environment.apiUrl}${API_PATHS.CHECKOUT}`,
          {
            items: items.map((item) => ({
              productId: item.id,
              name: item.name,
              price: item.price,
              quantity: item.quantity,
              size: item.selectedSize,
              color: item.selectedColor,
            })),
            totalAmount,
          },
          {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          },
        ),
      ),
    );
  }
}
