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
      // Em produção com cookies httpOnly, não acessamos o token via JavaScript
      // O backend envia o cookie automaticamente nas requisições
      return 'httpOnly-cookie'; // Valor placeholder para indicar que depende do backend
    }
    return this.getDevelopmentToken();
  }

  /**
   * Verifica se o token está válido
   */
  static isTokenValid(): boolean {
    if (import.meta.env.PROD) {
      // Em produção, confiamos que os cookies httpOnly são válidos
      // O backend irá validar os cookies em cada requisição
      return true;
    }
    
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
      // Em produção, limpa cookies httpOnly via backend
      fetch(`${import.meta.env.VITE_API_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      }).catch(console.error);
    } else {
      this.clearDevelopmentTokens();
    }
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
}

/**
 * Hook para gerenciar autenticação em componentes React
 */
  export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      if (import.meta.env.PROD) {
        // Em produção, verificar autenticação fazendo uma requisição ao backend
        try {
          const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
          const response = await fetch(`${apiUrl}/perfil`, {
            method: 'GET',
            credentials: 'include', // ESSENCIAL: Incluir cookies httpOnly
            headers: {
              'Content-Type': 'application/json',
            },
            // Não enviar cache para sempre pegar status atualizado
            cache: 'no-cache',
          });
          
          if (response.ok) {
            setIsAuthenticated(true);
          } else {
            console.warn('Autenticação falhou:', response.status, await response.text().catch(() => 'No response body'));
            setIsAuthenticated(false);
          }
        } catch (error) {
          console.error('Erro ao verificar autenticação:', error);
          setIsAuthenticated(false);
        }
      } else {
        // Em desenvolvimento, usar verificação local
        if (AuthManager.isTokenValid()) {
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
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
  };
}
