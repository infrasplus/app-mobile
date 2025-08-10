// src/lib/persistent-auth.ts
// Sistema de autenticação ETERNA e MULTI-DEVICE para PWA

import { openDB, IDBPDatabase } from 'idb';

// Info básica do device (só para log, não bloqueia)
export class DeviceInfo {
  static get() {
    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      screen: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      timestamp: new Date().toISOString(),
      isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent),
      isAndroid: /Android/.test(navigator.userAgent),
      isPWA: window.matchMedia('(display-mode: standalone)').matches,
      isMobile: /Mobile|Android|iPhone/i.test(navigator.userAgent),
    };
  }
}

// Sistema de Multi-Storage otimizado para iOS e Android
export class PersistentStorage {
  private static DB_NAME = 'sp_auth_db';
  private static DB_VERSION = 1;
  private static STORE_NAME = 'auth_store';
  private static CACHE_NAME = 'sp-auth-cache-v1';
  private db: IDBPDatabase | null = null;
  
  // Chaves de armazenamento
  private static KEYS = {
    AUTH_CODE: 'sp_auth_code',
    SESSION: 'sp_session',
    USER_DATA: 'sp_user_data',
    LAST_SYNC: 'sp_last_sync',
  };
  
  async init() {
    try {
      // IndexedDB (melhor para iOS PWA)
      this.db = await openDB(PersistentStorage.DB_NAME, PersistentStorage.DB_VERSION, {
        upgrade(db) {
          if (!db.objectStoreNames.contains(PersistentStorage.STORE_NAME)) {
            db.createObjectStore(PersistentStorage.STORE_NAME);
          }
        },
      });
      
      console.log('✅ Storage inicializado');
      
      // Sincronizar dados entre storages
      await this.syncStorages();
    } catch (error) {
      console.error('Erro ao inicializar storage:', error);
    }
  }
  
  // Salvar em TODOS os lugares
  async saveEverywhere(key: string, value: any): Promise<void> {
    const data = {
      value,
      timestamp: Date.now(),
      version: '1.0',
    };
    
    const serialized = JSON.stringify(data);
    
    // 1. IndexedDB (prioridade no iOS)
    try {
      if (this.db) {
        await this.db.put(PersistentStorage.STORE_NAME, serialized, key);
      }
    } catch (e) {
      console.warn('IndexedDB falhou:', e);
    }
    
    // 2. Cache API (bom para PWA)
    try {
      const cache = await caches.open(PersistentStorage.CACHE_NAME);
      const response = new Response(serialized, {
        headers: { 'Content-Type': 'application/json' }
      });
      await cache.put(new Request(`/${key}`), response);
    } catch (e) {
      console.warn('Cache API falhou:', e);
    }
    
    // 3. localStorage (funciona bem no Android)
    try {
      localStorage.setItem(key, serialized);
    } catch (e) {
      console.warn('localStorage falhou:', e);
    }
    
    // 4. sessionStorage (backup rápido)
    try {
      sessionStorage.setItem(key, serialized);
    } catch (e) {
      console.warn('sessionStorage falhou:', e);
    }
  }
  
  // Recuperar de qualquer lugar
  async getFromAnywhere(key: string): Promise<any> {
    let data = null;
    
    // Ordem otimizada: iOS prefere IndexedDB, Android prefere localStorage
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const storageOrder = isIOS 
      ? ['indexeddb', 'cache', 'local', 'session']
      : ['local', 'indexeddb', 'cache', 'session'];
    
    for (const storage of storageOrder) {
      if (data) break;
      
      switch (storage) {
        case 'indexeddb':
          try {
            if (this.db) {
              const stored = await this.db.get(PersistentStorage.STORE_NAME, key);
              if (stored) data = JSON.parse(stored);
            }
          } catch (e) {}
          break;
          
        case 'cache':
          try {
            const cache = await caches.open(PersistentStorage.CACHE_NAME);
            const response = await cache.match(new Request(`/${key}`));
            if (response) {
              const text = await response.text();
              data = JSON.parse(text);
            }
          } catch (e) {}
          break;
          
        case 'local':
          try {
            const stored = localStorage.getItem(key);
            if (stored) data = JSON.parse(stored);
          } catch (e) {}
          break;
          
        case 'session':
          try {
            const stored = sessionStorage.getItem(key);
            if (stored) data = JSON.parse(stored);
          } catch (e) {}
          break;
      }
    }
    
    // Se achou, propagar para outros storages
    if (data) {
      await this.saveEverywhere(key, data.value);
      return data.value;
    }
    
    return null;
  }
  
  // Sincronizar storages
  async syncStorages() {
    const keys = Object.values(PersistentStorage.KEYS);
    
    for (const key of keys) {
      const value = await this.getFromAnywhere(key);
      if (value) {
        await this.saveEverywhere(key, value);
      }
    }
    
    await this.saveEverywhere(PersistentStorage.KEYS.LAST_SYNC, Date.now());
  }
  
  // Métodos específicos
  async saveAuthCode(code: string) {
    await this.saveEverywhere(PersistentStorage.KEYS.AUTH_CODE, code);
  }
  
  async getAuthCode(): Promise<string | null> {
    return await this.getFromAnywhere(PersistentStorage.KEYS.AUTH_CODE);
  }
  
  async saveSession(session: any) {
    await this.saveEverywhere(PersistentStorage.KEYS.SESSION, session);
  }
  
  async getSession(): Promise<any> {
    return await this.getFromAnywhere(PersistentStorage.KEYS.SESSION);
  }
  
  async saveUserData(userData: any) {
    await this.saveEverywhere(PersistentStorage.KEYS.USER_DATA, userData);
  }
  
  async getUserData(): Promise<any> {
    return await this.getFromAnywhere(PersistentStorage.KEYS.USER_DATA);
  }
  
  // Limpar tudo (logout)
  async clearAll() {
    const keys = Object.values(PersistentStorage.KEYS);
    
    // Limpar todos os storages
    try {
      if (this.db) {
        for (const key of keys) {
          await this.db.delete(PersistentStorage.STORE_NAME, key);
        }
      }
    } catch (e) {}
    
    try {
      await caches.delete(PersistentStorage.CACHE_NAME);
    } catch (e) {}
    
    try {
      keys.forEach(key => localStorage.removeItem(key));
    } catch (e) {}
    
    try {
      keys.forEach(key => sessionStorage.removeItem(key));
    } catch (e) {}
  }
}

// Singleton global
export const persistentStorage = new PersistentStorage();