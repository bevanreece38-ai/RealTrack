/**
 * Vitest Setup File
 * 
 * Configurações globais para todos os testes
 */
import { vi, beforeEach } from 'vitest';

// Mock do localStorage
const localStorageMock = (() => {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => { store.set(key, value); },
    removeItem: (key: string) => { store.delete(key); },
    clear: () => { store.clear(); },
    get length() { return store.size; },
    key: (index: number) => Array.from(store.keys())[index] ?? null,
  };
})();

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

// Mock do alert
globalThis.alert = vi.fn();

// Limpar mocks entre testes
beforeEach(() => {
  vi.clearAllMocks();
  localStorageMock.clear();
});

export { localStorageMock };
