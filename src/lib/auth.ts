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

/**
 * Gerencia tokens de forma segura usando httpOnly cookies
 * Nota: Parte da implementação precisa ser server-side para httpOnly
 */
export class AuthManager {
  private static readonly ACCESS_TOKEN_KEY = 'at';
  private static readonly REFRESH_TOKEN_KEY = 'rt';
  private static readonly EXPIRES_KEY = 'exp';

  /**
   * Define tokens usando cookies (fallback para localStorage em desenvolvimento)
   */
  static setTokens(tokens: AuthTokens): void {
    if (import.meta.env.PROD) {
      // Em produção, cookies são definidos diretamente pelo backend
      // Não precisa fazer nada no frontend
      console.log('Tokens managed by backend via httpOnly cookies');
    } else {
      // Em desenvolvimento, fallback para localStorage
      localStorage.setItem(this.ACCESS_TOKEN_KEY, tokens.accessToken);
      localStorage.setItem(this.REFRESH_TOKEN_KEY, tokens.refreshToken);
      localStorage.setItem(this.EXPIRES_KEY, tokens.expiresAt.toString());
    }
  }

  /**
   * Obtém token de acesso atual
   */
  static getAccessToken(): string | null {
    if (import.meta.env.PROD) {
      return this.getServerSideToken();
    }
    return this.getDevelopmentToken();
  }

  /**
   * Verifica se o token está válido
   */
  static isTokenValid(): boolean {
    const token = this.getAccessToken();
    if (!token) return false;

    try {
      // Verificar expiração do payload JWT
      const payload = this.parseJWT(token);
      const now = Math.floor(Date.now() / 1000);
      return payload.exp > now;
    } catch {
      return false;
    }
  }

  /**
   * Limpa todos os tokens
   */
  static clearTokens(): void {
    if (import.meta.env.PROD) {
      this.clearServerSideTokens();
    } else {
      this.clearDevelopmentTokens();
    }
  }

  /**
   * Verifica se precisa refresh do token
   */
  static shouldRefreshToken(): boolean {
    const token = this.getAccessToken();
    if (!token) return true;

    try {
      const payload = this.parseJWT(token);
      const now = Math.floor(Date.now() / 1000);
      // Refresh se faltar menos de 5 minutos
      return payload.exp - now < 300;
    } catch {
      return true;
    }
  }

  /**
   * Implementação server-side (httpOnly cookies)
   */
  private static getServerSideToken(): string | null {
    // Token é enviado automaticamente via httpOnly cookie
    // Não acessível via JavaScript (segurança!)
    return null; // Backend vai validar o cookie
  }

  private static clearServerSideTokens(): void {
    // Limpa cookies httpOnly via backend
    fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    }).catch(console.error);
  }

  /**
   * Fallback para desenvolvimento (localStorage)
   */
  private static getDevelopmentToken(): string | null {
    const token = localStorage.getItem(this.ACCESS_TOKEN_KEY);
    if (!token) return null;

    // Verificar expiração
    const expiresAt = localStorage.getItem(this.EXPIRES_KEY);
    if (expiresAt && parseInt(expiresAt) < Date.now()) {
      this.clearDevelopmentTokens();
      return null;
    }

    return token;
  }

  private static clearDevelopmentTokens(): void {
    localStorage.removeItem(this.ACCESS_TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.EXPIRES_KEY);
  }

  /**
   * Parse JWT payload de forma segura
   */
  private static parseJWT(token: string): { exp: number; iat: number; [key: string]: any } {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format');
    }

    try {
      const payload = JSON.parse(atob(parts[1]));
      if (!payload.exp || typeof payload.exp !== 'number') {
        throw new Error('Invalid JWT payload');
      }
      return payload;
    } catch {
      throw new Error('Failed to parse JWT');
    }
  }

  /**
   * Refresh token automático
   */
  static async refreshToken(): Promise<boolean> {
    if (import.meta.env.PROD) {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          // Backend sets new cookies automatically
          return true;
        }
      } catch (error) {
        console.error('Failed to refresh token:', error);
      }
      return false;
    } else {
      // Fallback desenvolvimento
      const refreshToken = localStorage.getItem(this.REFRESH_TOKEN_KEY);
      if (!refreshToken) return false;

      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${refreshToken}`,
          },
        });

        if (response.ok) {
          const tokens = await response.json();
          this.setTokens(tokens);
          return true;
        }
      } catch (error) {
        console.error('Failed to refresh token:', error);
      }
      return false;
    }
  }
}

/**
 * Hook para gerenciar autenticação em componentes React
 */
export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      if (AuthManager.isTokenValid()) {
        // Verificar se precisa refresh
        if (AuthManager.shouldRefreshToken()) {
          const refreshed = await AuthManager.refreshToken();
          setIsAuthenticated(refreshed);
        } else {
          setIsAuthenticated(true);
        }
      } else {
        // Tentar refresh se token inválido
        const refreshed = await AuthManager.refreshToken();
        setIsAuthenticated(refreshed);
      }
      setIsLoading(false);
    };

    void checkAuth();
  }, []);

  const login = async (tokens: AuthTokens) => {
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
    refreshToken: () => AuthManager.refreshToken(),
  };
}
