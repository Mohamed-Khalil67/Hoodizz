import { Component, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { User } from '@angular/fire/auth';

import { CartStore } from '../../stores/cart.store';
import { AuthService } from '../../auth/auth.service';

const CART_BOUNCE_DURATION_MS = 1000;

@Component({
  selector: 'app-header',
  imports: [CommonModule, RouterLink],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {
  readonly cartStore = inject(CartStore);
  readonly auth = inject(AuthService);
  readonly currentUser$ = this.auth.currentUser$;

  readonly isCartBouncing = signal(false);
  isDropdownOpen = false;

  private previousCount = 0;

  constructor() {
    effect(() => {
      const currentCount = this.cartStore.totalItems();
      if (currentCount > this.previousCount) {
        this.isCartBouncing.set(true);
        setTimeout(() => this.isCartBouncing.set(false), CART_BOUNCE_DURATION_MS);
      }
      this.previousCount = currentCount;
    });
  }

  toggleDropdown() {
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  getUserDisplayName(user: User | null): string {
    return user?.displayName || user?.email?.split('@')[0] || 'User';
  }

  getUserPhotoUrl(user: User | null): string {
    return (
      user?.photoURL ||
      `https://ui-avatars.com/api/?name=${this.getUserDisplayName(user)}`
    );
  }

  async logout() {
    await this.auth.logout();
    this.isDropdownOpen = false;
  }
}
