import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Role } from '../models/role.enum';

export const roleGuard = (...allowed: Role[]): CanActivateFn => () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.hasRole(...allowed)) return true;
  return router.createUrlTree(['/dashboard']);
};
