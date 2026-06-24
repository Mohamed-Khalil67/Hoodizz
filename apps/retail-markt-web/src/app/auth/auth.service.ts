import { isPlatformServer } from '@angular/common';
import {
  inject,
  Injectable,
  OnDestroy,
  PLATFORM_ID,
  REQUEST,
} from '@angular/core';
import {
  Auth,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onIdTokenChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  user,
} from '@angular/fire/auth';
import { Router } from '@angular/router';
import { beforeAuthStateChanged } from '@firebase/auth';
import cookies from 'js-cookie';
import { COOKIES, ROUTES } from '../app.constants';

@Injectable({ providedIn: 'root' })
export class AuthService implements OnDestroy {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);

  readonly currentUser$ = user(this.auth);

  private idToken = '';
  private unsubscribeFromIdTokenChanges?: () => void;
  private unsubscribeFromBeforeAuthStateChanged?: () => void;

  constructor() {
    if (isPlatformServer(this.platformId)) {
      this.setUpServerAuth();
    } else {
      this.setUpBrowserAuth();
    }
  }

  private setUpServerAuth() {
    const request = inject(REQUEST);
    const cookieHeader = request?.headers?.get('cookie');
    const authIdToken = cookieHeader
      ? this.parseCookie(cookieHeader, COOKIES.SESSION)
      : undefined;

    if (authIdToken) {
      this.idToken = authIdToken;
      this.handleCookie(this.idToken);
    } else {
      this.handleCookie();
    }
  }

  private setUpBrowserAuth() {
    this.unsubscribeFromIdTokenChanges = onIdTokenChanged(
      this.auth,
      async (user) => {
        const token = await user?.getIdToken();
        this.handleCookie(token);
      },
    );

    let priorCookieValue: string | undefined;
    this.unsubscribeFromBeforeAuthStateChanged = beforeAuthStateChanged(
      this.auth,
      async (user) => {
        priorCookieValue = cookies.get(COOKIES.SESSION);
        const token = await user?.getIdToken();
        this.handleCookie(token);
      },
      async () => {
        this.handleCookie(priorCookieValue);
      },
    );

    this.idToken = cookies.get(COOKIES.SESSION) || '';
  }

  private parseCookie(header: string, key: string): string | undefined {
    for (const pair of header.split(';')) {
      const [k, v] = pair.trim().split('=');
      if (k === key) return v;
    }
    return undefined;
  }

  private handleCookie(token?: string) {
    if (token) {
      cookies.set(COOKIES.SESSION, token, { sameSite: 'lax', secure: true });
    } else {
      cookies.remove(COOKIES.SESSION);
    }
  }

  async login(email: string, password: string) {
    const result = await signInWithEmailAndPassword(this.auth, email, password);
    return result.user;
  }

  async signup(email: string, password: string) {
    const result = await createUserWithEmailAndPassword(
      this.auth,
      email,
      password,
    );
    return result.user;
  }

  async getToken(): Promise<string | null> {
    const user = this.auth.currentUser;
    if (user) return user.getIdToken();
    return this.idToken || null;
  }

  async googleSignIn() {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(this.auth, provider);
    return result.user;
  }

  async logout() {
    await signOut(this.auth);
    this.router.navigate([ROUTES.LOGIN]);
  }

  ngOnDestroy(): void {
    this.unsubscribeFromIdTokenChanges?.();
    this.unsubscribeFromBeforeAuthStateChanged?.();
  }
}
