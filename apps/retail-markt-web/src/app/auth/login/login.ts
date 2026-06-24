import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { AuthService } from '../auth.service';
import { ROUTES } from '../../app.constants';

@Component({
  selector: 'app-login',
  imports: [RouterLink, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  email = '';
  password = '';
  readonly errorMessage = signal<string | null>(null);

  async onSubmit() {
    this.errorMessage.set(null);
    try {
      await this.auth.login(this.email, this.password);
      this.router.navigate([ROUTES.HOME]);
    } catch (error) {
      this.errorMessage.set(this.toMessage(error));
    }
  }

  async loginWithGoogle() {
    this.errorMessage.set(null);
    try {
      await this.auth.googleSignIn();
      this.router.navigate([ROUTES.HOME]);
    } catch (error) {
      this.errorMessage.set(this.toMessage(error));
    }
  }

  private toMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Login failed';
  }
}
