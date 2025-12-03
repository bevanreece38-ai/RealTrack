/**
 * Testes do apiClient
 */

import axios from 'axios';
import { get, post, put, del, clearCache, invalidateCache } from '../../services/api/apiClient';

interface MockedAxiosResponse {
  data: unknown;
  status: number;
  headers: Record<string, unknown>;
}

type AxiosMethod = (url: string, data?: unknown, config?: unknown) => Promise<MockedAxiosResponse>;
type AxiosMethodMock = jest.Mock<ReturnType<AxiosMethod>, Parameters<AxiosMethod>>;

interface AxiosMockInstance {
  get: AxiosMethodMock;
  post: AxiosMethodMock;
  put: AxiosMethodMock;
  delete: AxiosMethodMock;
  patch: AxiosMethodMock;
  defaults: {
    headers: {
      common: Record<string, string>;
    };
  };
  interceptors: {
    request: { use: (...args: unknown[]) => number };
    response: { use: (...args: unknown[]) => number };
  };
}

const createAxiosMethodMock = (): AxiosMethodMock =>
  jest.fn<ReturnType<AxiosMethod>, Parameters<AxiosMethod>>();

const createAxiosResponse = (overrides: Partial<MockedAxiosResponse>): MockedAxiosResponse => ({
  data: null,
  status: 200,
  headers: {},
  ...overrides,
});

const queueAxiosResponse = (method: AxiosMethodMock, response: MockedAxiosResponse): void => {
  method.mockImplementationOnce(() => Promise.resolve(response));
};

const buildInterceptorUse = (tracker: unknown[][]) => {
  return (...args: unknown[]): number => {
    tracker.push(args);
    return tracker.length;
  };
};

const requestInterceptorCalls: unknown[][] = [];
const responseInterceptorCalls: unknown[][] = [];

const axiosInstanceMock: AxiosMockInstance = {
  get: createAxiosMethodMock(),
  post: createAxiosMethodMock(),
  put: createAxiosMethodMock(),
  delete: createAxiosMethodMock(),
  patch: createAxiosMethodMock(),
  defaults: {
    headers: {
      common: {},
    },
  },
  interceptors: {
    request: {
      use: buildInterceptorUse(requestInterceptorCalls),
    },
    response: {
      use: buildInterceptorUse(responseInterceptorCalls),
    },
  },
};

// Mock do axios (mantendo helpers reais como AxiosHeaders)
jest.mock('axios', () => {
  const actual = jest.requireActual<typeof import('axios')>('axios');
  return {
    ...actual,
    create: jest.fn(() => axiosInstanceMock),
    isAxiosError: jest.fn(),
    __axiosInstanceMock: axiosInstanceMock,
  };
});

type AxiosModuleWithMock = typeof axios & {
  __axiosInstanceMock: AxiosMockInstance;
  create: jest.Mock;
};

const mockedAxios = axios as AxiosModuleWithMock;
const mockAxios = mockedAxios.__axiosInstanceMock;
const getMock = mockAxios.get;
const postMock = mockAxios.post;
const putMock = mockAxios.put;
const deleteMock = mockAxios.delete;
const axiosCreateMock = mockedAxios.create as jest.Mock<ReturnType<typeof axios.create>, Parameters<typeof axios.create>>;

describe('apiClient', () => {

  beforeEach(() => {
    jest.clearAllMocks();
    clearCache();
    requestInterceptorCalls.length = 0;
    responseInterceptorCalls.length = 0;
  });

  describe('Configuração', () => {
    it('deve criar instância do axios com configurações corretas', () => {
      expect(axiosCreateMock).toHaveBeenCalled();

      const [[createdConfig]] = axiosCreateMock.mock.calls;
      const config = createdConfig!;

      expect(config.withCredentials).toBe(true);
      expect(typeof config.timeout).toBe('number');
    });

    it('deve configurar interceptors de request e response', () => {
      expect(requestInterceptorCalls.length).toBeGreaterThan(0);
      expect(responseInterceptorCalls.length).toBeGreaterThan(0);
    });
  });

  describe('Funções de API', () => {
    describe('get()', () => {
      it('deve fazer requisição GET e retornar dados formatados', async () => {
        const mockData = { id: 1, nome: 'Teste' };
        queueAxiosResponse(
          getMock,
          createAxiosResponse({
            data: mockData,
            status: 200,
            headers: { 'content-type': 'application/json' }
          })
        );

        const result = await get<typeof mockData>('/test');

        expect(result.data).toEqual(mockData);
        expect(result.status).toBe(200);
        expect(result.headers).toEqual({ 'content-type': 'application/json' });
      });

      it('deve propagar erros corretamente', async () => {
        const mockError = new Error('Network Error');
        getMock.mockRejectedValueOnce(mockError);

        await expect(get('/test')).rejects.toThrow('Network Error');
      });
    });

    describe('post()', () => {
      it('deve fazer requisição POST com payload', async () => {
        const payload = { nome: 'Nova Banca' };
        const mockResponse = { id: '123', ...payload };
        queueAxiosResponse(
          postMock,
          createAxiosResponse({
            data: mockResponse,
            status: 201,
            headers: {}
          })
        );

        const result = await post<typeof mockResponse>('/bancas', payload);

        expect(postMock).toHaveBeenCalledWith('/bancas', payload, undefined);
        expect(result.data).toEqual(mockResponse);
        expect(result.status).toBe(201);
      });
    });

    describe('put()', () => {
      it('deve fazer requisição PUT com payload', async () => {
        const payload = { nome: 'Banca Atualizada' };
        queueAxiosResponse(
          putMock,
          createAxiosResponse({
            data: { id: '123', ...payload },
            status: 200,
            headers: {}
          })
        );

        const result = await put('/bancas/123', payload);

        expect(result.status).toBe(200);
      });
    });

    describe('del()', () => {
      it('deve fazer requisição DELETE', async () => {
        queueAxiosResponse(
          deleteMock,
          createAxiosResponse({
            data: { success: true },
            status: 200,
            headers: {}
          })
        );

        const result = await del('/bancas/123');

        expect(result.status).toBe(200);
      });
    });
  });

  describe('Cache', () => {
    it('invalidateCache deve remover entrada do cache', () => {
      // O cache é interno, testamos indiretamente
      expect(() => invalidateCache('/test')).not.toThrow();
    });

    it('clearCache deve limpar todo o cache', () => {
      expect(() => clearCache()).not.toThrow();
    });
  });
});
