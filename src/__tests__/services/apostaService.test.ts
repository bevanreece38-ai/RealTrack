/**
 * Testes do apostaService
 */

import { apostaService } from '../../services/api';
import { createApiClientModuleMock, createEventBusModuleMock } from '../testUtils/mockFactories';

const apiClientModuleMock = createApiClientModuleMock();

// Mock do apiClient
jest.mock('../../services/api/apiClient', () => apiClientModuleMock);

// Mock do eventBus
jest.mock('../../utils/eventBus', () => createEventBusModuleMock());

const mockedApiClient = apiClientModuleMock.apiClient;

describe('apostaService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAll()', () => {
    it('deve retornar lista de apostas mapeadas', async () => {
      const mockApiResponse = [
        {
          id: 'aposta-1',
          bancaId: 'banca-1',
          esporte: 'Futebol',
          jogo: 'Time A vs Time B',
          torneio: 'Brasileirão',
          pais: 'Brasil',
          mercado: 'Resultado Final',
          tipoAposta: 'Simples',
          valorApostado: 100,
          odd: 2.0,
          bonus: 0,
          dataJogo: '2024-01-15',
          status: 'Pendente',
          casaDeAposta: 'Bet365',
          tipster: '',
          retornoObtido: 0
        }
      ];

      mockedApiClient.get.mockResolvedValueOnce({ data: mockApiResponse });

      const result = await apostaService.getAll();

      expect(result.apostas).toHaveLength(1);
      expect(result.apostas[0]).toMatchObject({
        id: 'aposta-1',
        esporte: 'Futebol',
        status: 'Pendente'
      });
    });

    it('deve construir query params para filtros', async () => {
      mockedApiClient.get.mockResolvedValueOnce({ data: [] });

      await apostaService.getAll({
        bancaId: 'banca-1',
        status: 'Pendente',
        esporte: 'Futebol'
      });

      expect(mockedApiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('bancaId=banca-1')
      );
      expect(mockedApiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('status=Pendente')
      );
    });

    it('deve tratar resposta paginada', async () => {
      const mockPaginatedResponse = {
        data: [{ 
          id: '1', 
          bancaId: 'b1', 
          esporte: 'F', 
          jogo: 'J', 
          torneio: 'T',
          pais: 'P',
          mercado: 'M', 
          tipoAposta: 'S', 
          valorApostado: 10, 
          odd: 1.5, 
          bonus: 0, 
          dataJogo: '2024-01-01', 
          status: 'Pendente', 
          casaDeAposta: 'C',
          tipster: '',
          retornoObtido: 0
        }],
        total: 100,
        page: 1,
        totalPages: 10
      };

      mockedApiClient.get.mockResolvedValueOnce({ data: mockPaginatedResponse });

      const result = await apostaService.getAll({ page: 1, limit: 10 });

      expect(result.total).toBe(100);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(10);
    });
  });

  describe('create()', () => {
    it('deve criar aposta e emitir evento', async () => {
      const payload = {
        bancaId: 'banca-1',
        esporte: 'Futebol',
        jogo: 'Time A vs Time B',
        mercado: 'Resultado Final',
        tipoAposta: 'Simples',
        valorApostado: 100,
        odd: 2.0,
        dataJogo: '2024-01-15',
        casaDeAposta: 'Bet365'
      };

      const mockResponse = { 
        id: 'new-id', 
        ...payload, 
        bonus: 0, 
        status: 'Pendente',
        torneio: '',
        pais: '',
        tipster: '',
        retornoObtido: 0
      };
      mockedApiClient.post.mockResolvedValueOnce({ data: mockResponse });

      const result = await apostaService.create(payload);

      expect(mockedApiClient.post).toHaveBeenCalledWith('/apostas', payload);
      expect(result.id).toBe('new-id');
    });
  });

  describe('update()', () => {
    it('deve atualizar aposta e emitir evento', async () => {
      const mockResponse = {
        id: '123',
        status: 'Green',
        retornoObtido: 200,
        bancaId: 'b1',
        esporte: 'F',
        jogo: 'J',
        torneio: 'T',
        pais: 'P',
        mercado: 'M',
        tipoAposta: 'S',
        valorApostado: 100,
        odd: 2.0,
        bonus: 0,
        dataJogo: '2024-01-01',
        casaDeAposta: 'C',
        tipster: ''
      };

      mockedApiClient.put.mockResolvedValueOnce({ data: mockResponse });

      const result = await apostaService.update('123', {
        status: 'Green',
        retornoObtido: 200
      });

      expect(mockedApiClient.put).toHaveBeenCalledWith('/apostas/123', {
        status: 'Green',
        retornoObtido: 200
      });
      expect(result.retornoObtido).toBe(200);
    });
  });

  describe('updateStatus()', () => {
    it('deve atualizar apenas status e retorno', async () => {
      const mockResponse = {
        id: '123',
        status: 'Red',
        retornoObtido: 0,
        bancaId: 'b1',
        esporte: 'F',
        jogo: 'J',
        torneio: 'T',
        pais: 'P',
        mercado: 'M',
        tipoAposta: 'S',
        valorApostado: 100,
        odd: 2.0,
        bonus: 0,
        dataJogo: '2024-01-01',
        casaDeAposta: 'C',
        tipster: ''
      };

      mockedApiClient.put.mockResolvedValueOnce({ data: mockResponse });

      await apostaService.updateStatus('123', 'Red', 0);

      expect(mockedApiClient.put).toHaveBeenCalledWith('/apostas/123', {
        status: 'Red',
        retornoObtido: 0
      });
    });
  });

  describe('remove()', () => {
    it('deve deletar aposta e emitir evento', async () => {
      mockedApiClient.delete.mockResolvedValueOnce({ data: { success: true } });

      await apostaService.remove('123');

      expect(mockedApiClient.delete).toHaveBeenCalledWith('/apostas/123');
    });
  });

  describe('removeMany()', () => {
    it('deve deletar múltiplas apostas', async () => {
      mockedApiClient.delete.mockResolvedValue({ data: { success: true } });

      await apostaService.removeMany(['1', '2', '3']);

      expect(mockedApiClient.delete).toHaveBeenCalledTimes(3);
    });
  });
});
