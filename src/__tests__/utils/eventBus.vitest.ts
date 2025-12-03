/**
 * @file eventBus.vitest.ts
 * @description Testes unitários para o Event Bus usando Vitest
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { eventBus } from '../../utils/eventBus';

describe('eventBus', () => {
  beforeEach(() => {
    eventBus.clearAll();
  });

  describe('on() e emit()', () => {
    it('deve registrar listener e receber eventos', () => {
      const handler = vi.fn();
      
      eventBus.on('apostas:updated', handler);
      eventBus.emit('apostas:updated', undefined);
      
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('deve suportar múltiplos listeners para mesmo evento', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      
      eventBus.on('apostas:updated', handler1);
      eventBus.on('apostas:updated', handler2);
      eventBus.emit('apostas:updated', undefined);
      
      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
    });

    it('não deve afetar outros eventos', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      
      eventBus.on('banca:created', handler1);
      eventBus.on('banca:updated', handler2);
      eventBus.emit('banca:created', { id: '1' });
      
      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).not.toHaveBeenCalled();
    });
  });

  describe('off()', () => {
    it('deve remover listener específico', () => {
      const handler = vi.fn();
      
      eventBus.on('apostas:updated', handler);
      eventBus.off('apostas:updated', handler);
      eventBus.emit('apostas:updated', undefined);
      
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('once()', () => {
    it('deve executar handler apenas uma vez', () => {
      const handler = vi.fn();
      
      eventBus.once('apostas:updated', handler);
      eventBus.emit('apostas:updated', undefined);
      eventBus.emit('apostas:updated', undefined);
      
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe('clear()', () => {
    it('deve remover todos os listeners de um evento', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      
      eventBus.on('apostas:updated', handler1);
      eventBus.on('apostas:updated', handler2);
      eventBus.clear('apostas:updated');
      eventBus.emit('apostas:updated', undefined);
      
      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
    });
  });

  describe('clearAll()', () => {
    it('deve remover todos os listeners de todos os eventos', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      
      eventBus.on('apostas:updated', handler1);
      eventBus.on('banca:created', handler2);
      eventBus.clearAll();
      eventBus.emit('apostas:updated', undefined);
      eventBus.emit('banca:created', { id: '1' });
      
      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
    });
  });

  describe('Helpers', () => {
    it('emitBancaCreated deve emitir evento correto', () => {
      const handler = vi.fn();
      eventBus.on('banca:created', handler);
      
      eventBus.emitBancaCreated('banca-1');
      
      expect(handler).toHaveBeenCalledWith({ id: 'banca-1' });
    });

    it('emitBancaUpdated deve emitir evento correto', () => {
      const handler = vi.fn();
      eventBus.on('banca:updated', handler);
      
      eventBus.emitBancaUpdated('banca-1');
      
      expect(handler).toHaveBeenCalledWith({ id: 'banca-1' });
    });

    it('emitBancaDeleted deve emitir evento correto', () => {
      const handler = vi.fn();
      eventBus.on('banca:deleted', handler);
      
      eventBus.emitBancaDeleted('banca-123');
      
      expect(handler).toHaveBeenCalledWith({ id: 'banca-123' });
    });

    it('emitApostasUpdated deve emitir evento correto', () => {
      const handler = vi.fn();
      eventBus.on('apostas:updated', handler);
      
      eventBus.emitApostasUpdated();
      
      expect(handler).toHaveBeenCalled();
    });
  });

  describe('Tratamento de erros', () => {
    it('deve capturar erros de handlers sem afetar outros', () => {
      const errorHandler = vi.fn(() => {
        throw new Error('Handler error');
      });
      const normalHandler = vi.fn();
      
      // Suprimir console.error para este teste
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      eventBus.on('apostas:updated', errorHandler);
      eventBus.on('apostas:updated', normalHandler);
      eventBus.emit('apostas:updated', undefined);
      
      expect(errorHandler).toHaveBeenCalled();
      expect(normalHandler).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });
});
