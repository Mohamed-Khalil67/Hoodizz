import { Component, inject } from '@angular/core';
import { AuthService } from '../auth.service';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-signup',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './signup.html',
  styleUrl: './signup.scss',
})
export class Signup {
  private auth = inject(AuthService);
  private router = inject(Router);

  email = '';
  password = '';

  async onSubmit() {
    try {
      await this.auth.signup(this.email, this.password);
      this.router.navigate(['/']);
    } catch (error) {
      console.error('Signup error:', error);
    }
  }

  async signupWithGoogle() {
    try {
      await this.auth.googleSignIn();
      this.router.navigate(['/']);
    } catch (error) {
      console.error('Google signup error:', error);
    }
  }
}
