import type { AxiosInstance } from 'axios';

type EventBusShape = typeof import('../../utils/eventBus').eventBus;

/**
 * Shape mínima do apiClient usada nos testes.
 */
type ApiClientSubset = Pick<AxiosInstance, 'get' | 'post' | 'put' | 'delete' | 'patch' | 'defaults'>;
type CachePatternFn = (pattern?: string) => void;
type CacheFn = (url: string, method?: string) => void;
type ClearCacheFn = () => void;

export interface ApiClientModuleMock {
  apiClient: jest.Mocked<ApiClientSubset>;
  invalidateCachePattern: jest.MockedFunction<CachePatternFn>;
  invalidateCache: jest.MockedFunction<CacheFn>;
  clearCache: jest.MockedFunction<ClearCacheFn>;
  default: jest.Mocked<ApiClientSubset>;
}

export const createApiClientModuleMock = (): ApiClientModuleMock => {
  const apiClientMock = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    patch: jest.fn(),
    defaults: {
      headers: {
        common: {},
      },
    } as AxiosInstance['defaults'],
  } as jest.Mocked<ApiClientSubset>;

  const invalidateCachePatternMock = jest.fn() as jest.MockedFunction<CachePatternFn>;
  const invalidateCacheMock = jest.fn() as jest.MockedFunction<CacheFn>;
  const clearCacheMock = jest.fn() as jest.MockedFunction<ClearCacheFn>;

  return {
    apiClient: apiClientMock,
    invalidateCachePattern: invalidateCachePatternMock,
    invalidateCache: invalidateCacheMock,
    clearCache: clearCacheMock,
    default: apiClientMock,
  };
};

/**
 * Shape mínima do eventBus usada nos testes.
 */
type EventBusSubset = Pick<
  EventBusShape,
  | 'emit'
  | 'on'
  | 'off'
  | 'clearAll'
  | 'emitBancaCreated'
  | 'emitBancaUpdated'
  | 'emitBancaDeleted'
  | 'emitProfileUpdated'
  | 'emitApostasUpdated'
>;

export interface EventBusModuleMock {
  eventBus: jest.Mocked<EventBusSubset>;
  default: jest.Mocked<EventBusSubset>;
}

export const createEventBusModuleMock = (): EventBusModuleMock => {
  const eventBusMock = {
    emit: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    clearAll: jest.fn(),
    emitBancaCreated: jest.fn(),
    emitBancaUpdated: jest.fn(),
    emitBancaDeleted: jest.fn(),
    emitProfileUpdated: jest.fn(),
    emitApostasUpdated: jest.fn(),
  } as jest.Mocked<EventBusSubset>;

  return {
    eventBus: eventBusMock,
    default: eventBusMock,
  };
};
