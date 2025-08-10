// src/lib/auth-persist.ts
import type { Session } from '@supabase/supabase-js';

/**
 * POR QUE ISSO FUNCIONA NO iOS?
 * - iOS pode desalocar o processo do PWA e apagar localStorage.
 * - IndexedDB é a opção mais durável para PWAs no iOS hoje.
 * - Este módulo salva/recupera os tokens principalmente via IDB,
 *   com fallback em localStorage e Cookie (para safety).
 */

type AuthBackup = {
  access_token: string;
  refresh_token: string;
  expires_at?: number | null;
  provider_token?: string | null;
  user?: unknown;
};

// ---------------------------
// IndexedDB ultra-minimal
// ---------------------------
const IDB_DB_NAME = 'sp-auth-db';
const IDB_STORE = 'kv';
const IDB_KEY = 'auth_backup';

function openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    try {
      const req = indexedDB.open(IDB_DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error('IDB open error'));
    } catch (e) {
      reject(e);
    }
  });
}

async function idbSet<T = unknown>(key: string, value: T): Promise<void> {
  const db = await openIDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    const store = tx.objectStore(IDB_STORE);
    const req = store.put(value as any, key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error || new Error('IDB put error'));
  });
  db.close();
}

async function idbGet<T = unknown>(key: string): Promise<T | undefined> {
  const db = await openIDB();
  const result = await new Promise<T | undefined>((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readonly');
    const store = tx.objectStore(IDB_STORE);
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error || new Error('IDB get error'));
  });
  db.close();
  return result;
}

async function idbDel(key: string): Promise<void> {
  const db = await openIDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    const store = tx.objectStore(IDB_STORE);
    const req = store.delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error || new Error('IDB delete error'));
  });
  db.close();
}

// ---------------------------
// Fallbacks (LS / Cookie)
// ---------------------------
const LS_KEY = 'sp_auth_backup';
const COOKIE_KEY = 'sp_auth_backup';

function setCookie(name: string, value: string, days = 7) {
  try {
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = `${name}=${encodeURIComponent(value)}; Expires=${expires}; Path=/; SameSite=Lax`;
  } catch {}
}
function getCookie(name: string): string | null {
  try {
    const parts = (document.cookie || '').split('; ');
    const part = parts.find(p => p.startsWith(name + '='));
    return part ? decodeURIComponent(part.split('=').slice(1).join('=')) : null;
  } catch {
    return null;
  }
}
function deleteCookie(name: string) {
  try {
    document.cookie = `${name}=; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/; SameSite=Lax`;
  } catch {}
}

// ---------------------------
// API pública usada no app
// ---------------------------
export async function persistAuthBackup(session: Session) {
  try {
    const payload: AuthBackup = {
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_at: session.expires_at ?? null,
      provider_token: (session as any)?.provider_token ?? null,
      user: session.user ?? null,
    };

    // 1) Canonical: IndexedDB
    await idbSet<AuthBackup>(IDB_KEY, payload);

    // 2) Fallbacks (não-confie neles no iOS, mas ajudam no desktop)
    try { localStorage.setItem(LS_KEY, JSON.stringify(payload)); } catch {}
    try { setCookie(COOKIE_KEY, JSON.stringify(payload), 7); } catch {}
  } catch (e) {
    // Se IDB falhar (modo privado antigo, etc.), tenta LS/Cookie ao menos
    try { localStorage.setItem(LS_KEY, JSON.stringify({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_at: session.expires_at ?? null,
      provider_token: (session as any)?.provider_token ?? null,
      user: session.user ?? null,
    })); } catch {}
    try { setCookie(COOKIE_KEY, JSON.stringify({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_at: session.expires_at ?? null,
      provider_token: (session as any)?.provider_token ?? null,
      user: session.user ?? null,
    }), 7); } catch {}
  }
}

export async function readAuthBackup(): Promise<AuthBackup | null> {
  // 1) Tenta IDB
  try {
    const fromIDB = await idbGet<AuthBackup>(IDB_KEY);
    if (fromIDB && fromIDB.access_token && fromIDB.refresh_token) return fromIDB;
  } catch {}

  // 2) Tenta LS
  try {
    const fromLS = localStorage.getItem(LS_KEY);
    if (fromLS) {
      const parsed = JSON.parse(fromLS) as AuthBackup;
      if (parsed?.access_token && parsed?.refresh_token) return parsed;
    }
  } catch {}

  // 3) Tenta Cookie
  try {
    const fromCookie = getCookie(COOKIE_KEY);
    if (fromCookie) {
      const parsed = JSON.parse(fromCookie) as AuthBackup;
      if (parsed?.access_token && parsed?.refresh_token) return parsed;
    }
  } catch {}

  return null;
}

export async function clearAuthBackup() {
  try { await idbDel(IDB_KEY); } catch {}
  try { localStorage.removeItem(LS_KEY); } catch {}
  try { deleteCookie(COOKIE_KEY); } catch {}
}

/**
 * Dica opcional: peça persistência de armazenamento quando suportado.
 * Safari ainda é limitado, mas não quebra nada chamar.
 */
export async function tryPersistStorage() {
  try {
    // @ts-ignore
    if (navigator?.storage?.persist) {
      // @ts-ignore
      await navigator.storage.persist();
    }
  } catch {}
}
