import * as Sentry from '@sentry/react';

/**
 * Inicializa o Sentry para monitoramento de erros
 * Configurado para funcionar apenas em produção
 */
export function initSentry(): void {
  // Obter DSN do Sentry das variáveis de ambiente
  // DSN padrão fornecido pelo usuário (pode ser sobrescrito por variável de ambiente)
  const defaultDsn = 'https://67e89bd0834d47319940c09f28acc80b@o4510418265964544.ingest.de.sentry.io/4510418271076432';
  const sentryDsn = import.meta.env.VITE_SENTRY_DSN ?? defaultDsn;
  
  // Inicializar se tiver DSN (funciona em dev e produção)
  if (!sentryDsn) {
    console.log('Sentry não configurado (DSN não fornecido)');
    return;
  }

  try {
    Sentry.init({
      dsn: sentryDsn,
      environment: import.meta.env.MODE || 'production',
      
      // Enviar dados padrão de PII (IP, etc) - como no exemplo fornecido
      sendDefaultPii: true,
      
      // Integrações do React
      integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration({
          // Gravar sessões apenas quando há erros (economiza recursos)
          maskAllText: true,
          blockAllMedia: true,
        }),
      ],

      // Performance Monitoring
      tracesSampleRate: 0.1, // 10% das transações (reduz carga)
      
      // Session Replay
      replaysSessionSampleRate: 0.1, // 10% das sessões normais
      replaysOnErrorSampleRate: 1.0, // 100% das sessões com erro

      // Filtros de erros
      beforeSend(event, hint) {
        // Ignorar erros conhecidos que não são relevantes
        if (event.exception) {
          const error = hint.originalException;
          
          // Ignorar erros de bloqueio de cliente (AdBlock, etc)
          if (
            error instanceof Error &&
            (error.message.includes('ERR_BLOCKED_BY_CLIENT') ||
             error.message.includes('net::ERR_BLOCKED_BY_CLIENT'))
          ) {
            return null; // Não enviar este erro
          }

          // Ignorar erros de CORS em desenvolvimento
          if (error instanceof Error && error.message.includes('CORS')) {
            return null;
          }
        }

        return event;
      },

      // Ignorar URLs específicas
      ignoreErrors: [
        'ERR_BLOCKED_BY_CLIENT',
        'ResizeObserver loop limit exceeded',
        'Non-Error promise rejection captured',
      ],

      // Configurações de release (opcional)
      release: import.meta.env.VITE_APP_VERSION || undefined,
    });

    console.log('Sentry inicializado com sucesso');
  } catch (error) {
    console.warn('Erro ao inicializar Sentry:', error);
  }
}

