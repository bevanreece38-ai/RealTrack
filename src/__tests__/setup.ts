/**
 * Jest Setup File
 * 
 * Configurações globais para todos os testes
 */

// Mock do import.meta.env
Object.defineProperty(globalThis, 'import', {
  value: {
    meta: {
      env: {
        VITE_API_URL: 'http://localhost:3001/api',
        MODE: 'test',
        DEV: true,
        PROD: false,
      }
    }
  }
});

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
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Não precisamos mockar window.location - jsdom já fornece um mock adequado

// Mock do alert
window.alert = jest.fn();

// Mock do CustomEvent (jsdom já fornece, mas garantimos consistência)
if (typeof window.CustomEvent !== 'function') {
  class MockCustomEvent<T = unknown> extends Event {
    detail: T;
    constructor(type: string, options?: CustomEventInit<T>) {
      super(type, options);
      this.detail = options?.detail as T;
    }
  }
  Object.defineProperty(window, 'CustomEvent', { value: MockCustomEvent });
}

// Limpar mocks entre testes
beforeEach(() => {
  jest.clearAllMocks();
  localStorageMock.clear();
});

export { localStorageMock };
