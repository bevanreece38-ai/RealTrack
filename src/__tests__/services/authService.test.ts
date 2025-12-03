/**
 * @file authService.test.ts
 * @description Testes unitários para o serviço de autenticação
 */

import { authService } from '../../services/api';
import { createApiClientModuleMock } from '../testUtils/mockFactories';

const apiClientModuleMock = createApiClientModuleMock();

// Mock do apiClient
jest.mock('../../services/api/apiClient', () => apiClientModuleMock);

const mockedApiClient = apiClientModuleMock.apiClient;

describe('authService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  describe('login', () => {
    it('deve fazer login com credenciais válidas', async () => {
      const mockResponse = {
        data: {
          accessToken: 'access-token-123',
          refreshToken: 'refresh-token-456',
          expiresIn: 3600,
          usuario: {
            id: 'user-1',
            email: 'test@example.com',
            nome: 'Test User',
          },
        },
      };

      mockedApiClient.post.mockResolvedValueOnce(mockResponse);

      const result = await authService.login('test@example.com', 'password123');

      expect(mockedApiClient.post).toHaveBeenCalledWith('/auth/login', {
        email: 'test@example.com',
        senha: 'password123',
      });
      expect(result).toEqual(mockResponse.data);
      expect(localStorage.getItem('at')).toBe('access-token-123');
      expect(localStorage.getItem('rt')).toBe('refresh-token-456');
    });

    it('deve lançar erro com credenciais inválidas', async () => {
      const errorResponse = {
        response: {
          status: 401,
          data: { message: 'Credenciais inválidas' },
        },
      };

      mockedApiClient.post.mockRejectedValueOnce(errorResponse);

      await expect(
        authService.login('wrong@email.com', 'wrongpassword')
      ).rejects.toMatchObject(errorResponse);
    });

    it('deve lançar erro quando email está vazio', async () => {
      const errorResponse = {
        response: {
          status: 400,
          data: { message: 'Email é obrigatório' },
        },
      };

      mockedApiClient.post.mockRejectedValueOnce(errorResponse);

      await expect(authService.login('', 'password123')).rejects.toMatchObject(
        errorResponse
      );
    });
  });

  describe('register', () => {
    it('deve registrar novo usuário com sucesso', async () => {
      const mockResponse = {
        data: {
          accessToken: 'new-access-token',
          refreshToken: 'new-refresh-token',
          expiresIn: 3600,
          usuario: {
            id: 'new-user-1',
            email: 'newuser@example.com',
            nome: 'New User',
          },
        },
      };

      mockedApiClient.post.mockResolvedValueOnce(mockResponse);

      const result = await authService.register({
        nome: 'New User',
        email: 'newuser@example.com',
        senha: 'newpassword123',
      });

      expect(mockedApiClient.post).toHaveBeenCalledWith('/auth/registrar', {
        nome: 'New User',
        email: 'newuser@example.com',
        senha: 'newpassword123',
      });
      expect(result).toEqual(mockResponse.data);
    });

    it('deve lançar erro quando email já existe', async () => {
      const errorResponse = {
        response: {
          status: 409,
          data: { message: 'Email já cadastrado' },
        },
      };

      mockedApiClient.post.mockRejectedValueOnce(errorResponse);

      await expect(
        authService.register({
          nome: 'Test',
          email: 'existing@example.com',
          senha: 'password',
        })
      ).rejects.toMatchObject(errorResponse);
    });
  });

  describe('logout', () => {
    it('deve limpar tokens e cache ao fazer logout', () => {
      // Setup inicial
      localStorage.setItem('at', 'access-token');
      localStorage.setItem('rt', 'refresh-token');
      localStorage.setItem('exp', '999999999');

      authService.logout();

      expect(localStorage.getItem('at')).toBeNull();
      expect(localStorage.getItem('rt')).toBeNull();
      expect(localStorage.getItem('exp')).toBeNull();
    });
  });

  describe('telegramAuth', () => {
    it('deve autenticar via Telegram com dados válidos', async () => {
      const telegramData = {
        id: 123456789,
        first_name: 'Telegram',
        last_name: 'User',
        username: 'telegramuser',
        photo_url: 'https://t.me/photo.jpg',
        auth_date: Date.now(),
        hash: 'valid-hash-123',
      };

      const mockResponse = {
        data: {
          accessToken: 'telegram-access-token',
          refreshToken: 'telegram-refresh-token',
          expiresIn: 3600,
          usuario: {
            id: 'tg-user-1',
            telegramId: '123456789',
            nome: 'Telegram User',
          },
        },
      };

      mockedApiClient.post.mockResolvedValueOnce(mockResponse);

      const result = await authService.telegramAuth(telegramData);

      expect(mockedApiClient.post).toHaveBeenCalledWith('/auth/telegram', telegramData);
      expect(result).toEqual(mockResponse.data);
    });

    it('deve lançar erro com hash inválido', async () => {
      const telegramData = {
        id: 123456789,
        first_name: 'Telegram',
        auth_date: Date.now(),
        hash: 'invalid-hash',
      };

      const errorResponse = {
        response: {
          status: 401,
          data: { message: 'Hash de autenticação inválido' },
        },
      };

      mockedApiClient.post.mockRejectedValueOnce(errorResponse);

      await expect(
        authService.telegramAuth(telegramData)
      ).rejects.toMatchObject(errorResponse);
    });
  });

  describe('getAccessToken', () => {
    it('deve retornar o token de acesso armazenado', () => {
      localStorage.setItem('at', 'stored-access-token');

      const token = authService.getAccessToken();

      expect(token).toBe('stored-access-token');
    });

    it('deve retornar null quando não há token', () => {
      localStorage.clear();

      const token = authService.getAccessToken();

      expect(token).toBeNull();
    });
  });

  describe('setTokens', () => {
    it('deve armazenar tokens corretamente', () => {
      authService.setTokens('new-access', 'new-refresh', 7200);

      expect(localStorage.getItem('at')).toBe('new-access');
      expect(localStorage.getItem('rt')).toBe('new-refresh');
      expect(localStorage.getItem('exp')).toBeTruthy();
    });
  });

  describe('clearTokens', () => {
    it('deve remover todos os tokens', () => {
      localStorage.setItem('at', 'access');
      localStorage.setItem('rt', 'refresh');
      localStorage.setItem('exp', '123456');

      authService.clearTokens();

      expect(localStorage.getItem('at')).toBeNull();
      expect(localStorage.getItem('rt')).toBeNull();
      expect(localStorage.getItem('exp')).toBeNull();
    });
  });

  describe('isAuthenticated', () => {
    it('deve retornar true quando há token válido', () => {
      localStorage.setItem('at', 'valid-token');
      localStorage.setItem('exp', String(Date.now() + 3600000)); // +1 hora

      const result = authService.isAuthenticated();

      expect(result).toBe(true);
    });

    it('deve retornar false quando não há token', () => {
      localStorage.clear();

      const result = authService.isAuthenticated();

      expect(result).toBe(false);
    });

    it('deve retornar false quando token expirou', () => {
      localStorage.setItem('at', 'expired-token');
      localStorage.setItem('exp', String(Date.now() - 1000)); // -1 segundo

      const result = authService.isAuthenticated();

      expect(result).toBe(false);
    });
  });
});
