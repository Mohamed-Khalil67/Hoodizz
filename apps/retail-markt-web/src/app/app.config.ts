import {
  ApplicationConfig,
  inject,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { appRoutes } from './app.routes';
import {
  provideClientHydration,
  withEventReplay,
  withIncrementalHydration,
} from '@angular/platform-browser';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideApollo } from 'apollo-angular';
import { HttpLink } from 'apollo-angular/http';
import { ApolloLink, InMemoryCache, Observable } from '@apollo/client/core';
import { environment } from './environments/environment';
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideAnalytics, getAnalytics } from '@angular/fire/analytics';
import { provideAuth, getAuth } from '@angular/fire/auth';
import { AuthService } from './auth/auth.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideClientHydration(withEventReplay(), withIncrementalHydration()),
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(appRoutes),
    provideHttpClient(withFetch()),
    provideApollo(() => {
      const httpLink = inject(HttpLink);
      const auth = inject(AuthService);

      const authLink = new ApolloLink((operation, forward) => {
        return new Observable((observer) => {
          let cancelled = false;
          auth
            .getToken()
            .then((token) => {
              if (cancelled) return;
              if (token) {
                operation.setContext(
                  ({ headers = {} }: { headers?: Record<string, string> }) => ({
                    headers: {
                      ...headers,
                      authorization: `Bearer ${token}`,
                    },
                  }),
                );
              }
              forward(operation).subscribe({
                next: (v) => observer.next(v),
                error: (e) => observer.error(e),
                complete: () => observer.complete(),
              });
            })
            .catch((e) => observer.error(e));
          return () => {
            cancelled = true;
          };
        });
      });

      return {
        link: ApolloLink.from([
          authLink,
          httpLink.create({ uri: environment.apiUrl + '/graphql' }),
        ]),
        cache: new InMemoryCache(),
      };
    }),
    provideFirebaseApp(() => initializeApp(environment.firebase)),
    provideAuth(() => getAuth()),
    provideAnalytics(() => getAnalytics()),
  ],
};
