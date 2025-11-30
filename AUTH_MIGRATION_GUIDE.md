# 🛡️ Guia de Migração: localStorage → httpOnly Cookies

## 📋 Overview
Migração do sistema de autenticação de localStorage para httpOnly cookies para maior segurança.

## 🔧 Backend Necessário

Para implementação completa, o backend precisa fornecer os seguintes endpoints:

### 1. Set Cookies Endpoint
```http
POST /api/auth/set-cookies
Content-Type: application/json

{
  "accessToken": "jwt_token",
  "refreshToken": "refresh_token", 
  "expiresAt": 1234567890
}
```

**Response:**
```http
Set-Cookie: access_token=jwt_token; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=3600
Set-Cookie: refresh_token=refresh_token; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=86400
```

### 2. Clear Cookies Endpoint
```http
POST /api/auth/clear-cookies
```

**Response:**
```http
Set-Cookie: access_token=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0
Set-Cookie: refresh_token=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0
```

### 3. Refresh Token Endpoint
```http
POST /api/auth/refresh
Credentials: include
```

**Response:**
```json
{
  "accessToken": "new_jwt_token",
  "refreshToken": "new_refresh_token",
  "expiresAt": 1234567890
}
```

## 🔄 Mudanças no Frontend

### 1. Login
**Antes:**
```typescript
localStorage.setItem('token', data.token);
```

**Depois:**
```typescript
import { AuthManager } from '../lib/auth';

AuthManager.setTokens({
  accessToken: data.accessToken,
  refreshToken: data.refreshToken,
  expiresAt: data.expiresAt
});
```

### 2. Logout
**Antes:**
```typescript
localStorage.removeItem('token');
sessionStorage.removeItem('token');
```

**Depois:**
```typescript
AuthManager.clearTokens();
```

### 3. Verificação de Autenticação
**Antes:**
```typescript
const token = localStorage.getItem('token');
```

**Depois:**
```typescript
import { useAuth } from '../lib/auth';

const { isAuthenticated } = useAuth();
// ou
const isValid = AuthManager.isTokenValid();
```

## 🏗️ Estrutura de Cookies

### Produção (httpOnly)
```http
Set-Cookie: access_token=jwt; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=3600
Set-Cookie: refresh_token=refresh; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=86400
```

### Desenvolvimento (localStorage fallback)
```javascript
localStorage.setItem('at', 'jwt_token');
localStorage.setItem('rt', 'refresh_token');
localStorage.setItem('exp', '1234567890');
```

## 🔒 Benefícios de Segurança

1. **XSS Protection**: Tokens não acessíveis via JavaScript
2. **CSRF Protection**: SameSite=Strict previne CSRF
3. **Session Management**: Cookies automaticamente gerenciados
4. **Auto Refresh**: Refresh automático de tokens
5. **Secure Transmission**: Secure flag em produção

## 🚀 Implementação Passo a Passo

### 1. Backend - Configurar Cookies
```javascript
// Express.js example
app.post('/api/auth/login', (req, res) => {
  const { accessToken, refreshToken, expiresAt } = generateTokens(user);
  
  res.cookie('access_token', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 3600000 // 1 hora
  });
  
  res.cookie('refresh_token', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 86400000 // 24 horas
  });
  
  res.json({ success: true });
});
```

### 2. Frontend - Atualizar Components
```typescript
// Login.tsx
const handleLogin = async (credentials) => {
  const response = await api.post('/auth/login', credentials);
  const tokens = response.data;
  
  AuthManager.setTokens(tokens);
  navigate('/dashboard');
};

// ProtectedRoute.tsx
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) return <Loading />;
  if (!isAuthenticated) return <Navigate to="/login" />;
  
  return children;
};
```

## ⚠️ Considerações Importantes

### 1. CORS Configuration
```javascript
// Backend CORS config
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true, // Importante para cookies!
  sameSite: 'strict'
}));
```

### 2. Environment Variables
```bash
# .env.production
VITE_API_URL=https://api.yourapp.com
NODE_ENV=production
```

### 3. Testing
- Testar fluxo completo de login/logout
- Verificar refresh automático
- Testar expiração de tokens
- Validar CORS e credenciais

## 🔄 Rollback Plan

Se necessário voltar para localStorage:
```typescript
// Comente AuthManager e descomente localStorage
// AuthManager.clearTokens();
localStorage.removeItem('token');
sessionStorage.removeItem('token');
```

## 📊 Monitoramento

Monitorar métricas de segurança:
- Taxa de sucesso de refresh
- Tentativas de acesso inválido
- Performance do novo sistema

---

**Status**: ✅ Frontend implementado, backend pendente
**Prioridade**: Alta - Segurança crítica
**Impacto**: Melhoria significativa de segurança
