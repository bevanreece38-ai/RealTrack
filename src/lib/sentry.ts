import * as Sentry from '@sentry/react';

/**
 * Inicializa o Sentry para monitoramento de erros
 * Configurado para funcionar apenas em produção
 */
export function initSentry(): void {
  // Obter DSN do Sentry das variáveis de ambiente
  // DSN padrão fornecido pelo usuário (pode ser sobrescrito por variável de ambiente)
  const defaultDsn = 'https://67e89bd0834d47319940c09f28acc80b@o4510418265964544.ingest.de.sentry.io/4510418271076432';
  const envDsn: unknown = import.meta.env.VITE_SENTRY_DSN;
  const sentryDsn = typeof envDsn === 'string' ? envDsn : defaultDsn;
  
  // Inicializar se tiver DSN (funciona em dev e produção)
  if (!sentryDsn) {
    console.log('Sentry não configurado (DSN não fornecido)');
    return;
  }

  try {
    const envMode: unknown = import.meta.env.MODE;
    const environment = typeof envMode === 'string' ? envMode : 'production';
    
    // Criar integrações de forma type-safe
    const browserTracing = (Sentry as { browserTracingIntegration?: () => unknown }).browserTracingIntegration?.();
    const replay = (Sentry as { replayIntegration?: (opts: unknown) => unknown }).replayIntegration?.({
      maskAllText: true,
      blockAllMedia: true,
    });
    
    const integrations = [browserTracing, replay].filter((x): x is NonNullable<typeof x> => x != null);
    
    // Type assertion para evitar unsafe member access
    const sentryInit = (Sentry as unknown as { init: (options: {
      dsn: string;
      environment: string;
      sendDefaultPii: boolean;
      integrations: unknown[];
      tracesSampleRate: number;
      replaysSessionSampleRate: number;
      replaysOnErrorSampleRate: number;
      beforeSend: (event: unknown, hint: { originalException?: unknown }) => unknown;
      ignoreErrors: string[];
      release?: string;
    }) => void }).init;
    
    sentryInit({
      dsn: sentryDsn,
      environment,
      
      // Enviar dados padrão de PII (IP, etc) - como no exemplo fornecido
      sendDefaultPii: true,
      
      // Integrações do React
      integrations,

      // Performance Monitoring
      tracesSampleRate: 0.1, // 10% das transações (reduz carga)
      
      // Session Replay
      replaysSessionSampleRate: 0.1, // 10% das sessões normais
      replaysOnErrorSampleRate: 1.0, // 100% das sessões com erro

      // Filtros de erros
      beforeSend(event: unknown, hint: { originalException?: unknown }) {
        // Ignorar erros conhecidos que não são relevantes
        const eventObj = event as { exception?: unknown };
        if (eventObj.exception && hint.originalException) {
          const error = hint.originalException as Error | string;
          
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

        return event as { exception?: unknown };
      },

      // Ignorar URLs específicas
      ignoreErrors: [
        'ERR_BLOCKED_BY_CLIENT',
        'ResizeObserver loop limit exceeded',
        'Non-Error promise rejection captured',
      ],

      // Configurações de release (opcional)
      release: typeof import.meta.env.VITE_APP_VERSION === 'string' ? import.meta.env.VITE_APP_VERSION : undefined,
    });

    console.log('Sentry inicializado com sucesso');
  } catch (error) {
    console.warn('Erro ao inicializar Sentry:', error);
  }
}

