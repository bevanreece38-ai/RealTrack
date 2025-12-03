/**
 * @file financeiroService.test.ts
 * @description Testes unitários para o serviço de financeiro
 */

import { financeiroService } from '../../services/api';
import { createApiClientModuleMock, createEventBusModuleMock } from '../testUtils/mockFactories';

const apiClientModuleMock = createApiClientModuleMock();
const eventBusModuleMock = createEventBusModuleMock();

// Mock do apiClient
jest.mock('../../services/api/apiClient', () => apiClientModuleMock);

// Mock do eventBus
jest.mock('../../utils/eventBus', () => eventBusModuleMock);

const mockedApiClient = apiClientModuleMock.apiClient;

describe('financeiroService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAll / getTransacoes', () => {
    it('deve buscar todas as transações', async () => {
      const mockResponse = {
        data: {
          data: [
            {
              id: 'trans-1',
              tipo: 'Depósito',
              valor: 100,
              observacao: 'Depósito inicial',
              dataTransacao: '2024-01-15',
              bancaId: 'banca-1',
              casaDeAposta: 'Bet365',
            },
            {
              id: 'trans-2',
              tipo: 'Saque',
              valor: 50,
              observacao: 'Saque parcial',
              dataTransacao: '2024-01-16',
              bancaId: 'banca-1',
              casaDeAposta: 'Bet365',
            },
          ],
          total: 2,
        },
      };

      mockedApiClient.get.mockResolvedValueOnce(mockResponse);

      const result = await financeiroService.getAll();

      expect(mockedApiClient.get).toHaveBeenCalledWith('/financeiro');
      expect(result.transacoes).toHaveLength(2);
      expect(result.transacoes[0]).toMatchObject({
        id: 'trans-1',
        tipo: 'Depósito',
        valor: 100,
      });
    });

    it('deve filtrar transações por bancaId', async () => {
      const mockResponse = {
        data: {
          data: [
            {
              id: 'trans-1',
              tipo: 'Depósito',
              valor: 100,
              bancaId: 'banca-1',
              casaDeAposta: 'Bet365',
              dataTransacao: '2024-01-15',
            },
          ],
        },
      };

      mockedApiClient.get.mockResolvedValueOnce(mockResponse);

      await financeiroService.getAll({ bancaId: 'banca-1' });

      expect(mockedApiClient.get).toHaveBeenCalledWith('/financeiro?bancaId=banca-1');
    });

    it('deve filtrar por tipo de transação', async () => {
      const mockResponse = { data: { data: [] } };

      mockedApiClient.get.mockResolvedValueOnce(mockResponse);

      await financeiroService.getAll({ tipo: 'Depósito' });

      expect(mockedApiClient.get).toHaveBeenCalledWith(expect.stringContaining('tipo=Dep'));
    });

    it('getTransacoes deve retornar apenas array de transações', async () => {
      const mockResponse = { 
        data: { 
          data: [{ id: '1', tipo: 'Depósito', valor: 100, bancaId: 'b1', casaDeAposta: 'Bet365', dataTransacao: '2024-01-15' }] 
        } 
      };
      mockedApiClient.get.mockResolvedValueOnce(mockResponse);

      const result = await financeiroService.getTransacoes({ bancaId: 'banca-1' });

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getSaldoGeral', () => {
    it('deve retornar resumo financeiro', async () => {
      const mockResponse = {
        data: {
          totalDepositado: 1000,
          totalSacado: 300,
          saldoAtual: 700,
          totalTransacoes: 5,
          totalDepositos: 3,
          totalSaques: 2,
          resultadoApostas: 100,
          apostasPendentes: 2,
          valorApostasPendentes: 50,
          apostasConcluidas: 10,
          porCasa: {},
        },
      };

      mockedApiClient.get.mockResolvedValueOnce(mockResponse);

      const result = await financeiroService.getSaldoGeral();

      expect(result.totalDepositado).toBe(1000);
      expect(result.saldoAtual).toBe(700);
    });

    it('deve filtrar resumo por bancaId', async () => {
      const mockResponse = {
        data: {
          totalDepositado: 500,
          totalSacado: 100,
          saldoAtual: 400,
          totalTransacoes: 2,
          totalDepositos: 1,
          totalSaques: 1,
          resultadoApostas: 0,
          apostasPendentes: 0,
          valorApostasPendentes: 0,
          apostasConcluidas: 0,
          porCasa: {},
        },
      };

      mockedApiClient.get.mockResolvedValueOnce(mockResponse);

      await financeiroService.getSaldoGeral({ bancaId: 'banca-specific' });

      expect(mockedApiClient.get).toHaveBeenCalledWith('/financeiro/resumo?bancaId=banca-specific');
    });
  });

  describe('getResumo', () => {
    it('deve retornar resumo financeiro completo', async () => {
      const mockResponse = {
        data: {
          totalDepositado: 2000,
          totalSacado: 500,
          saldoAtual: 1500,
          totalTransacoes: 10,
          totalDepositos: 7,
          totalSaques: 3,
          resultadoApostas: 200,
          apostasPendentes: 5,
          valorApostasPendentes: 100,
          apostasConcluidas: 20,
          porCasa: {
            'Bet365': { depositos: 1000, saques: 200, saldo: 800, apostas: 10, resultado: 100 },
          },
        },
      };

      mockedApiClient.get.mockResolvedValueOnce(mockResponse);

      const result = await financeiroService.getResumo('banca-1');

      expect(mockedApiClient.get).toHaveBeenCalledWith('/financeiro/resumo?bancaId=banca-1');
      expect(result).toMatchObject({
        totalDepositado: 2000,
        totalSacado: 500,
        saldoAtual: 1500,
      });
    });
  });

  describe('create', () => {
    it('deve criar depósito com sucesso', async () => {
      const mockResponse = {
        data: {
          id: 'new-trans-1',
          tipo: 'Depósito',
          valor: 500,
          observacao: 'Novo depósito',
          bancaId: 'banca-1',
          casaDeAposta: 'Bet365',
          dataTransacao: '2024-01-20',
        },
      };

      mockedApiClient.post.mockResolvedValueOnce(mockResponse);

      const result = await financeiroService.create({
        tipo: 'Depósito',
        valor: 500,
        observacao: 'Novo depósito',
        bancaId: 'banca-1',
        casaDeAposta: 'Bet365',
        dataTransacao: '2024-01-20',
      });

      expect(mockedApiClient.post).toHaveBeenCalledWith('/financeiro', {
        tipo: 'Depósito',
        valor: 500,
        observacao: 'Novo depósito',
        bancaId: 'banca-1',
        casaDeAposta: 'Bet365',
        dataTransacao: '2024-01-20',
      });
      expect(result).toMatchObject({
        id: 'new-trans-1',
        tipo: 'Depósito',
        valor: 500,
      });
    });

    it('deve criar saque com sucesso', async () => {
      const mockResponse = {
        data: {
          id: 'new-trans-2',
          tipo: 'Saque',
          valor: 200,
          bancaId: 'banca-1',
          casaDeAposta: 'Betano',
          dataTransacao: '2024-01-21',
        },
      };

      mockedApiClient.post.mockResolvedValueOnce(mockResponse);

      const result = await financeiroService.create({
        tipo: 'Saque',
        valor: 200,
        bancaId: 'banca-1',
        casaDeAposta: 'Betano',
        dataTransacao: '2024-01-21',
      });

      expect(result.tipo).toBe('Saque');
      expect(result.valor).toBe(200);
    });

    it('deve lançar erro com valor negativo', async () => {
      const errorResponse = {
        response: {
          status: 400,
          data: { message: 'Valor deve ser positivo' },
        },
      };

      mockedApiClient.post.mockRejectedValueOnce(errorResponse);

      await expect(
        financeiroService.create({
          tipo: 'Depósito',
          valor: -100,
          bancaId: 'banca-1',
          casaDeAposta: 'Bet365',
          dataTransacao: '2024-01-20',
        })
      ).rejects.toMatchObject(errorResponse);
    });
  });

  describe('update', () => {
    it('deve atualizar transação com sucesso', async () => {
      const mockResponse = {
        data: {
          id: 'trans-1',
          tipo: 'Depósito',
          valor: 750,
          observacao: 'Depósito atualizado',
          bancaId: 'banca-1',
          casaDeAposta: 'Bet365',
          dataTransacao: '2024-01-15',
        },
      };

      mockedApiClient.put.mockResolvedValueOnce(mockResponse);

      const result = await financeiroService.update('trans-1', {
        valor: 750,
        observacao: 'Depósito atualizado',
      });

      expect(mockedApiClient.put).toHaveBeenCalledWith('/financeiro/trans-1', {
        valor: 750,
        observacao: 'Depósito atualizado',
      });
      expect(result.valor).toBe(750);
    });
  });

  describe('remove', () => {
    it('deve remover transação com sucesso', async () => {
      mockedApiClient.delete.mockResolvedValueOnce({});

      await financeiroService.remove('trans-1');

      expect(mockedApiClient.delete).toHaveBeenCalledWith('/financeiro/trans-1');
    });

    it('deve lançar erro ao remover transação inexistente', async () => {
      const errorResponse = {
        response: {
          status: 404,
          data: { message: 'Transação não encontrada' },
        },
      };

      mockedApiClient.delete.mockRejectedValueOnce(errorResponse);

      await expect(
        financeiroService.remove('nonexistent-id')
      ).rejects.toMatchObject(errorResponse);
    });
  });

  describe('helpers: criarDeposito e criarSaque', () => {
    it('criarDeposito deve criar com tipo Depósito', async () => {
      const mockResponse = {
        data: { 
          id: '1', 
          tipo: 'Depósito', 
          valor: 100,
          bancaId: 'banca-1',
          casaDeAposta: 'Bet365',
          dataTransacao: '2024-01-20',
        },
      };

      mockedApiClient.post.mockResolvedValueOnce(mockResponse);

      await financeiroService.criarDeposito('banca-1', 'Bet365', 100, '2024-01-20', 'Depósito teste');

      expect(mockedApiClient.post).toHaveBeenCalledWith('/financeiro', {
        tipo: 'Depósito',
        valor: 100,
        observacao: 'Depósito teste',
        bancaId: 'banca-1',
        casaDeAposta: 'Bet365',
        dataTransacao: '2024-01-20',
      });
    });

    it('criarSaque deve criar com tipo Saque', async () => {
      const mockResponse = {
        data: { 
          id: '1', 
          tipo: 'Saque', 
          valor: 50,
          bancaId: 'banca-1',
          casaDeAposta: 'Betano',
          dataTransacao: '2024-01-21',
        },
      };

      mockedApiClient.post.mockResolvedValueOnce(mockResponse);

      await financeiroService.criarSaque('banca-1', 'Betano', 50, '2024-01-21', 'Saque teste');

      expect(mockedApiClient.post).toHaveBeenCalledWith('/financeiro', {
        tipo: 'Saque',
        valor: 50,
        observacao: 'Saque teste',
        bancaId: 'banca-1',
        casaDeAposta: 'Betano',
        dataTransacao: '2024-01-21',
      });
    });
  });

  describe('casos extremos', () => {
    it('deve lidar com valor muito grande', async () => {
      const mockResponse = {
        data: {
          id: '1',
          tipo: 'Depósito',
          valor: 999999999.99,
          bancaId: 'banca-1',
          casaDeAposta: 'Bet365',
          dataTransacao: '2024-01-20',
        },
      };

      mockedApiClient.post.mockResolvedValueOnce(mockResponse);

      const result = await financeiroService.create({
        tipo: 'Depósito',
        valor: 999999999.99,
        bancaId: 'banca-1',
        casaDeAposta: 'Bet365',
        dataTransacao: '2024-01-20',
      });

      expect(result.valor).toBe(999999999.99);
    });

    it('deve lidar com observação muito longa', async () => {
      const longObservacao = 'a'.repeat(1000);
      const mockResponse = {
        data: {
          id: '1',
          tipo: 'Depósito',
          valor: 100,
          observacao: longObservacao,
          bancaId: 'banca-1',
          casaDeAposta: 'Bet365',
          dataTransacao: '2024-01-20',
        },
      };

      mockedApiClient.post.mockResolvedValueOnce(mockResponse);

      const result = await financeiroService.create({
        tipo: 'Depósito',
        valor: 100,
        observacao: longObservacao,
        bancaId: 'banca-1',
        casaDeAposta: 'Bet365',
        dataTransacao: '2024-01-20',
      });

      expect(result.observacao).toHaveLength(1000);
    });
  });
});
