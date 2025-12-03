/**
 * Testes do bancaService
 */

import { bancaService } from '../../services/api';
import { createApiClientModuleMock, createEventBusModuleMock } from '../testUtils/mockFactories';

const apiClientModuleMock = createApiClientModuleMock();
const eventBusModuleMock = createEventBusModuleMock();

// Mock do apiClient
jest.mock('../../services/api/apiClient', () => apiClientModuleMock);

// Mock do eventBus
jest.mock('../../utils/eventBus', () => eventBusModuleMock);

const mockedApiClient = apiClientModuleMock.apiClient;
const mockedEventBus = eventBusModuleMock.eventBus;

describe('bancaService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAll()', () => {
    it('deve retornar lista de bancas mapeadas', async () => {
      const mockApiResponse = [
        {
          id: '1',
          nome: 'Minha Banca',
          descricao: 'Descrição',
          status: 'Ativa',
          ePadrao: true,
          criadoEm: '2024-01-01T00:00:00Z',
          metricas: { totalApostas: 10 }
        }
      ];

      mockedApiClient.get.mockResolvedValueOnce({ data: mockApiResponse });

      const result = await bancaService.getAll();

      expect(mockedApiClient.get).toHaveBeenCalledWith('/bancas');
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: '1',
        nome: 'Minha Banca',
        padrao: true
      });
    });

    it('deve retornar array vazio quando não há dados', async () => {
      mockedApiClient.get.mockResolvedValueOnce({ data: null });

      const result = await bancaService.getAll();

      expect(result).toEqual([]);
    });

    it('deve tratar dados inválidos graciosamente', async () => {
      mockedApiClient.get.mockResolvedValueOnce({ data: 'invalid' });

      const result = await bancaService.getAll();

      expect(result).toEqual([]);
    });
  });

  describe('create()', () => {
    it('deve criar banca e emitir evento', async () => {
      const payload = { nome: 'Nova Banca' };
      const mockResponse = {
        id: 'new-id',
        nome: 'Nova Banca',
        ePadrao: false
      };

      mockedApiClient.post.mockResolvedValueOnce({ data: mockResponse });

      const result = await bancaService.create(payload);

      expect(mockedApiClient.post).toHaveBeenCalledWith('/bancas', expect.objectContaining({
        nome: 'Nova Banca'
      }));
      expect(mockedEventBus.emitBancaCreated).toHaveBeenCalledWith('new-id');
      expect(result.id).toBe('new-id');
    });

    it('deve enviar nome trimado e descrição opcional', async () => {
      const payload = { nome: '  Banca Teste  ', descricao: '  Descrição  ' };
      const mockResponse = { id: '1', nome: 'Banca Teste' };

      mockedApiClient.post.mockResolvedValueOnce({ data: mockResponse });

      await bancaService.create(payload);

      expect(mockedApiClient.post).toHaveBeenCalledWith('/bancas', expect.objectContaining({
        nome: 'Banca Teste',
        descricao: 'Descrição'
      }));
    });
  });

  describe('update()', () => {
    it('deve atualizar banca e emitir evento', async () => {
      const payload = { nome: 'Nome Atualizado' };
      const mockResponse = {
        id: '123',
        nome: 'Nome Atualizado'
      };

      mockedApiClient.put.mockResolvedValueOnce({ data: mockResponse });

      await bancaService.update('123', payload);

      expect(mockedApiClient.put).toHaveBeenCalledWith('/bancas/123', payload);
      expect(mockedEventBus.emitBancaUpdated).toHaveBeenCalledWith('123');
    });
  });

  describe('remove()', () => {
    it('deve deletar banca e emitir evento', async () => {
      mockedApiClient.delete.mockResolvedValueOnce({ data: { success: true } });

      await bancaService.remove('123');

      expect(mockedApiClient.delete).toHaveBeenCalledWith('/bancas/123');
      expect(mockedEventBus.emitBancaDeleted).toHaveBeenCalledWith('123');
    });
  });

  describe('togglePadrao()', () => {
    it('deve alternar status padrão', async () => {
      const mockResponse = { id: '1', ePadrao: true };
      mockedApiClient.put.mockResolvedValueOnce({ data: mockResponse });

      await bancaService.togglePadrao('1', false);

      expect(mockedApiClient.put).toHaveBeenCalledWith('/bancas/1', { ePadrao: true });
    });
  });

  describe('toggleStatus()', () => {
    it('deve alternar status Ativa para Inativa', async () => {
      const mockResponse = { id: '1', status: 'Inativa' };
      mockedApiClient.put.mockResolvedValueOnce({ data: mockResponse });

      await bancaService.toggleStatus('1', 'Ativa');

      expect(mockedApiClient.put).toHaveBeenCalledWith('/bancas/1', { status: 'Inativa' });
    });

    it('deve alternar status Inativa para Ativa', async () => {
      const mockResponse = { id: '1', status: 'Ativa' };
      mockedApiClient.put.mockResolvedValueOnce({ data: mockResponse });

      await bancaService.toggleStatus('1', 'Inativa');

      expect(mockedApiClient.put).toHaveBeenCalledWith('/bancas/1', { status: 'Ativa' });
    });
  });
});
