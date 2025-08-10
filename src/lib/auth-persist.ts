import { Session } from '@supabase/supabase-js';

const CACHE_NAME = 'auth-backup-v1';
const CACHE_REQ = '/__auth_backup__';
const LS_KEY = 'sp_auth_backup';
const COOKIE_KEY = 'sp_auth_backup';

function setCookie(name: string, value: string, days = 7) {
  try {
    const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString();
    document.cookie = `${name}=${encodeURIComponent(value)}; Expires=${expires}; Path=/; SameSite=Lax`;
  } catch {}
}
function getCookie(name: string): string | null {
  try {
    const parts = (document.cookie || '').split('; ');
    for (const part of parts) {
      const [k, ...rest] = part.split('=');
      if (k === name) return decodeURIComponent(rest.join('='));
    }
  } catch {}
  return null;
}
function deleteCookie(name: string) {
  try {
    document.cookie = `${name}=; Expires=Thu, 01 Jan 1970 00:00:01 GMT; Path=/; SameSite=Lax`;
  } catch {}
}

export type AuthBackup = {
  access_token: string;
  refresh_token: string;
  expires_at?: number | null;
};

export async function persistAuthBackup(session: Session) {
  const payload: AuthBackup = {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_at: null,
  };
  const json = JSON.stringify(payload);

  // Cache Storage (principal)
  try {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(CACHE_REQ, new Response(json, {
      headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
    }));
  } catch {}

  // Fallbacks
  try { localStorage.setItem(LS_KEY, json); } catch {}
  try { setCookie(COOKIE_KEY, json, 365); } catch {}
}

export async function readAuthBackup(): Promise<AuthBackup | null> {
  // Cache Storage
  try {
    const cache = await caches.open(CACHE_NAME);
    const res = await cache.match(CACHE_REQ);
    if (res) {
      const data = await res.json();
      if (data?.access_token && data?.refresh_token) return data as AuthBackup;
    }
  } catch {}

  // Fallbacks
  try {
    const fromLs = localStorage.getItem(LS_KEY);
    if (fromLs) return JSON.parse(fromLs) as AuthBackup;
  } catch {}
  try {
    const fromCookie = getCookie(COOKIE_KEY);
    if (fromCookie) return JSON.parse(fromCookie) as AuthBackup;
  } catch {}

  return null;
}

export async function clearAuthBackup() {
  try {
    const cache = await caches.open(CACHE_NAME);
    await cache.delete(CACHE_REQ);
  } catch {}
  try { localStorage.removeItem(LS_KEY); } catch {}
  try { deleteCookie(COOKIE_KEY); } catch {}
}
