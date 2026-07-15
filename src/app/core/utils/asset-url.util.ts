import { environment } from '../../../environments/environment';

/** Resolve API-relative upload paths to absolute URLs for img/file links. */
export function resolveAssetUrl(url?: string | null): string {
  if (!url?.trim()) return '';

  const trimmed = url.trim().replace(/\\/g, '/');

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  if (trimmed.startsWith('//')) return `https:${trimmed}`;

  const base = environment.apiUrl.replace(/\/$/, '');
  const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;

  return `${base}${path}`;
}
