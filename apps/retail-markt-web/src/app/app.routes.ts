import { Route } from '@angular/router';
import { authGuard } from './auth/auth-guard';

export const appRoutes: Route[] = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./home/home').then((m) => m.Home),
  },
  {
    path: 'products',
    loadComponent: () => import('./products/products').then((m) => m.Products),
  },
  {
    path: 'cart',
    loadComponent: () => import('./cart/cart').then((m) => m.Cart),
  },
  {
    path: 'checkout',
    loadComponent: () => import('./checkout/checkout').then((m) => m.Checkout),
  },
  {
    path: 'checkout/cancel',
    loadComponent: () =>
      import('./checkout/checkout-failure/checkout-failure').then(
        (m) => m.CheckoutFailure,
      ),
  },
  {
    path: 'checkout/success',
    loadComponent: () =>
      import('./checkout/checkout-success/checkout-success').then(
        (m) => m.CheckoutSuccess,
      ),
  },
  {
    path: 'auth/login',
    loadComponent: () => import('./auth/login/login').then((m) => m.Login),
  },
  {
    path: 'auth/signup',
    loadComponent: () => import('./auth/signup/signup').then((m) => m.Signup),
  },
  {
    path: 'orders',
    loadComponent: () => import('./orders/orders').then((m) => m.Orders),
    canActivate: [authGuard],
  },
  {
    path: 'orders/:id',
    loadComponent: () => import('./order/order').then((m) => m.Order),
  },
  {
    path: '**',
    redirectTo: 'home',
  },
];
