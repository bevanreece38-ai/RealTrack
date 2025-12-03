/**
 * Testes do eventBus
 */

import { eventBus } from '../../utils/eventBus';

describe('eventBus', () => {
  beforeEach(() => {
    eventBus.clearAll();
  });

  describe('on() e emit()', () => {
    it('deve registrar listener e receber eventos', () => {
      const handler = jest.fn();
      
      eventBus.on('banca:created', handler);
      eventBus.emit('banca:created', { id: '123' });

      expect(handler).toHaveBeenCalledWith({ id: '123' });
    });

    it('deve suportar múltiplos listeners para mesmo evento', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      eventBus.on('banca:updated', handler1);
      eventBus.on('banca:updated', handler2);
      eventBus.emit('banca:updated', { id: '1' });

      expect(handler1).toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
    });

    it('não deve afetar outros eventos', () => {
      const handler = jest.fn();

      eventBus.on('banca:created', handler);
      eventBus.emit('banca:deleted', { id: '1' });

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('off()', () => {
    it('deve remover listener específico', () => {
      const handler = jest.fn();

      eventBus.on('apostas:updated', handler);
      eventBus.off('apostas:updated', handler);
      eventBus.emit('apostas:updated', undefined);

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('once()', () => {
    it('deve executar handler apenas uma vez', () => {
      const handler = jest.fn();

      eventBus.once('profile:updated', handler);
      eventBus.emit('profile:updated', { id: '1' });
      eventBus.emit('profile:updated', { id: '2' });

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith({ id: '1' });
    });
  });

  describe('clear()', () => {
    it('deve remover todos os listeners de um evento', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      eventBus.on('banca:saved', handler1);
      eventBus.on('banca:saved', handler2);
      eventBus.clear('banca:saved');
      eventBus.emit('banca:saved', { id: '1' });

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
    });
  });

  describe('clearAll()', () => {
    it('deve remover todos os listeners de todos os eventos', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      eventBus.on('banca:created', handler1);
      eventBus.on('apostas:updated', handler2);
      eventBus.clearAll();
      eventBus.emit('banca:created', { id: '1' });
      eventBus.emit('apostas:updated', undefined);

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
    });
  });

  describe('Helpers', () => {
    it('emitBancaCreated deve emitir evento correto', () => {
      const handler = jest.fn();
      eventBus.on('banca:created', handler);

      eventBus.emitBancaCreated('123');

      expect(handler).toHaveBeenCalledWith({ id: '123' });
    });

    it('emitBancaUpdated deve emitir evento correto', () => {
      const handler = jest.fn();
      eventBus.on('banca:updated', handler);

      eventBus.emitBancaUpdated('456');

      expect(handler).toHaveBeenCalledWith({ id: '456' });
    });

    it('emitBancaDeleted deve emitir evento correto', () => {
      const handler = jest.fn();
      eventBus.on('banca:deleted', handler);

      eventBus.emitBancaDeleted('789');

      expect(handler).toHaveBeenCalledWith({ id: '789' });
    });

    it('emitApostasUpdated deve emitir evento correto', () => {
      const handler = jest.fn();
      eventBus.on('apostas:updated', handler);

      eventBus.emitApostasUpdated(50);

      expect(handler).toHaveBeenCalledWith({ count: 50 });
    });
  });

  describe('Tratamento de erros', () => {
    it('deve capturar erros de handlers sem afetar outros', () => {
      const errorHandler = jest.fn(() => {
        throw new Error('Handler error');
      });
      const goodHandler = jest.fn();
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      eventBus.on('banca:created', errorHandler);
      eventBus.on('banca:created', goodHandler);
      eventBus.emit('banca:created', { id: '1' });

      expect(consoleSpy).toHaveBeenCalled();
      expect(goodHandler).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });
});
