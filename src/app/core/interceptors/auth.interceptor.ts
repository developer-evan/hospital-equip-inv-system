import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { TokenStorageService } from '../services/token-storage.service';

function isAuthExempt(url: string): boolean {
  return (
    url.includes('/auth/login') ||
    url.includes('/auth/refresh') ||
    url.includes('/auth/logout')
  );
}

function shouldAttachAccessToken(url: string): boolean {
  return !url.includes('/auth/login') && !url.includes('/auth/refresh');
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const tokens = inject(TokenStorageService);
  const auth = inject(AuthService);
  const accessToken = tokens.getAccessToken();

  const authedReq =
    accessToken && shouldAttachAccessToken(req.url)
      ? req.clone({ setHeaders: { Authorization: `Bearer ${accessToken}` } })
      : req;

  return next(authedReq).pipe(
    catchError((err: unknown) => {
      if (!(err instanceof HttpErrorResponse) || err.status !== 401 || isAuthExempt(req.url)) {
        return throwError(() => err);
      }

      return auth.refresh().pipe(
        switchMap((tokenPair) =>
          next(
            req.clone({
              setHeaders: { Authorization: `Bearer ${tokenPair.accessToken}` },
            }),
          ),
        ),
        catchError((refreshErr) => {
          auth.sessionExpired();
          return throwError(() => refreshErr);
        }),
      );
    }),
  );
};
