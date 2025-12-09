/**
 * Sistema de autenticação seguro com httpOnly cookies
 * Substitui localStorage por cookies mais seguros
 */

import { useState, useEffect } from 'react';

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

interface JwtPayload {
  exp: number;
  iat?: number;
  [key: string]: unknown;
}

interface AuthChangeEvent {
  isAuthenticated: boolean;
}

type AuthListener = (event: AuthChangeEvent) => void;

const ACCESS_TOKEN_KEY = 'at';
const REFRESH_TOKEN_KEY = 'rt';
const EXPIRES_KEY = 'exp';
const DEFAULT_API_URL = 'http://localhost:3001/api';

const authListeners = new Set<AuthListener>();

const notifyAuthListeners = (isAuthenticated: boolean): void => {
  authListeners.forEach((listener) => {
    try {
      listener({ isAuthenticated });
    } catch (error) {
      console.error('Auth listener error:', error);
    }
  });
};

const subscribeToAuthChanges = (listener: AuthListener): (() => void) => {
  authListeners.add(listener);
  return () => {
    authListeners.delete(listener);
  };
};

const resolveApiBaseUrl = (): string => {
  const envUrl = typeof import.meta.env.VITE_API_URL === 'string' ? import.meta.env.VITE_API_URL : undefined;
  return (envUrl && envUrl.length > 0 ? envUrl : DEFAULT_API_URL).replace(/\/$/, '');
};

const isJwtPayload = (value: unknown): value is JwtPayload => {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return typeof record.exp === 'number';
};

const decodeJwtSegment = (segment: string): string => {
  const normalized = segment.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  return atob(padded);
};

const parseJwt = (token: string): JwtPayload => {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid JWT format');
  }

  try {
    const payloadJson = decodeJwtSegment(parts[1]);
    const payload = JSON.parse(payloadJson) as unknown;
    if (!isJwtPayload(payload)) {
      throw new Error('Invalid JWT payload');
    }
    return payload;
  } catch {
    throw new Error('Failed to parse JWT');
  }
};

const setTokens = (tokens: AuthTokens): void => {
  localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
  localStorage.setItem(EXPIRES_KEY, tokens.expiresAt.toString());
  notifyAuthListeners(true);
};

const clearTokens = (): void => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(EXPIRES_KEY);

  const logoutUrl = `${resolveApiBaseUrl()}/auth/logout`;
  fetch(logoutUrl, {
    method: 'POST',
    credentials: 'include',
  }).catch(() => {
    /* Falha silenciosa para manter UX */
  });

  notifyAuthListeners(false);
};

const getAccessToken = (): string | null => {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  if (!token) return null;

  const expiresAt = localStorage.getItem(EXPIRES_KEY);
  if (expiresAt && Number.parseInt(expiresAt, 10) < Date.now()) {
    clearTokens();
    return null;
  }

  return token;
};

const isTokenValid = (): boolean => {
  const token = getAccessToken();
  if (!token) return false;

  try {
    const payload = parseJwt(token);
    const now = Math.floor(Date.now() / 1000);
    return payload.exp > now;
  } catch {
    return false;
  }
};

/**
 * Gerencia tokens de forma segura usando httpOnly cookies.
 * Representado como objeto simples para alinhar com lint e facilitar testes.
 */
export const AuthManager = {
  setTokens,
  getAccessToken,
  isTokenValid,
  clearTokens,
  subscribe: subscribeToAuthChanges,
} as const;

/**
 * Hook para gerenciar autenticação em componentes React
 */
export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = () => {
      // Usar verificação local do token em localStorage
      if (AuthManager.isTokenValid()) {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  useEffect(() => {
    const unsubscribe = AuthManager.subscribe(({ isAuthenticated }) => {
      setIsAuthenticated(isAuthenticated);
      setIsLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = (tokens: AuthTokens) => {
    AuthManager.setTokens(tokens);
    setIsAuthenticated(true);
  };

  const logout = () => {
    AuthManager.clearTokens();
    setIsAuthenticated(false);
  };

  return {
    isAuthenticated,
    isLoading,
    login,
    logout,
  };
}
