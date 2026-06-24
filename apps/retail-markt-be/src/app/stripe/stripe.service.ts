import { Inject, Injectable } from '@nestjs/common';
import Stripe from 'stripe';

/**
 * Stripe v22 re-exports its core class as `Stripe.Stripe` (a TYPE alias),
 * not a namespace, so `Stripe.Event` / `Stripe.Checkout.Session` are not
 * directly reachable from the default import. We derive the event/session
 * types from the instance method signatures, which gives us full typing
 * without ever falling back to `any` / `unknown`.
 */
export type StripeNs = Stripe.Stripe;

export type StripeEvent = ReturnType<StripeNs['webhooks']['constructEvent']>;

export type StripeCheckoutSession = Awaited<
  ReturnType<StripeNs['checkout']['sessions']['create']>
>;

export const STRIPE_CLIENT = Symbol('STRIPE_CLIENT');

@Injectable()
export class StripeService {
  constructor(@Inject(STRIPE_CLIENT) public readonly client: StripeNs) {}

  constructEvent(
    payload: Buffer | string,
    signature: string,
    secret: string,
  ): StripeEvent {
    return this.client.webhooks.constructEvent(payload, signature, secret);
  }
}
