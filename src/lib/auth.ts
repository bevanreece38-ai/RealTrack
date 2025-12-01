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
   * Define tokens usando localStorage (temporário até configurar subdomínio)
   */
  static setTokens(tokens: AuthTokens): void {
    // TEMPORÁRIO: Usar localStorage em produção até configurar subdomínio api.realtracker.site
    // Cookies httpOnly cross-domain requerem configuração de DNS personalizada
    localStorage.setItem(this.ACCESS_TOKEN_KEY, tokens.accessToken);
    localStorage.setItem(this.REFRESH_TOKEN_KEY, tokens.refreshToken);
    localStorage.setItem(this.EXPIRES_KEY, tokens.expiresAt.toString());
    console.log('✅ Tokens salvos no localStorage');
  }

  /**
   * Obtém token de acesso atual
   */
  static getAccessToken(): string | null {
    const token = localStorage.getItem(this.ACCESS_TOKEN_KEY);
    if (!token) return null;

    // Verificar expiração
    const expiresAt = localStorage.getItem(this.EXPIRES_KEY);
    if (expiresAt && parseInt(expiresAt) < Date.now()) {
      this.clearTokens();
      return null;
    }

    return token;
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
    localStorage.removeItem(this.ACCESS_TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.EXPIRES_KEY);
    
    // Também chamar logout do backend para limpar cookies (se houver)
    fetch(`${import.meta.env.VITE_API_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    }).catch(console.error);
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
}

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
  };
}
