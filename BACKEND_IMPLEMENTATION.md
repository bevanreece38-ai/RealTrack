# 🔧 Backend Implementation Guide - httpOnly Cookies

## 📋 Endpoints Necessários

### 1. POST /api/auth/logout
**Purpose**: Limpar cookies no logout

```javascript
app.post('/api/auth/logout', (req, res) => {
  res.clearCookie("access_token", { path: "/" });
  res.clearCookie("refresh_token", { path: "/" });
  res.json({ success: true });
});
```

### 2. POST /api/auth/refresh
**Purpose**: Renovar access token usando refresh token

```javascript
app.post('/api/auth/refresh', async (req, res) => {
  try {
    const refreshToken = req.cookies.refresh_token;
    if (!refreshToken) return res.status(401).json({ error: 'Refresh token ausente' });

    const decoded = jwt.verify(refreshToken, process.env.REFRESH_SECRET);
    const user = await getUserById(decoded.userId);
    if (!user) return res.status(401).json({ error: 'Usuário inválido' });

    const newAccessToken = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    const newRefreshToken = jwt.sign(
      { userId: user.id },
      process.env.REFRESH_SECRET,
      { expiresIn: "7d" }
    );

    res.cookie("access_token", newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 15 * 60 * 1000
    });

    res.cookie("refresh_token", newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({ success: true });

  } catch (err) {
    return res.status(401).json({ error: 'Refresh inválido' });
  }
});
```

## 🔒 CORS Configuration

### Express.js CORS Setup
```javascript
const cors = require('cors');

// Configuração CORS para httpOnly cookies
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true, // ESSENCIAL para cookies!
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Set-Cookie']
}));
```

## 🔄 Atualizar Login Existente

### Modificar Endpoint de Login
```javascript
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  const user = await authenticateUser(email, password);
  if (!user) return res.status(401).json({ error: "Credenciais inválidas" });

  const accessToken = jwt.sign(
    { userId: user.id },
    process.env.JWT_SECRET,
    { expiresIn: "15m" }
  );

  const refreshToken = jwt.sign(
    { userId: user.id },
    process.env.REFRESH_SECRET,
    { expiresIn: "7d" }
  );

  res.cookie("access_token", accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 15 * 60 * 1000,
    path: "/",
  });

  res.cookie("refresh_token", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  });

  res.json({ success: true });
});
```

## 🛡️ Middleware de Autenticação

### Verificar Cookies em Rotas Protegidas
```javascript
const authenticate = (req, res, next) => {
  const token = req.cookies.access_token;

  if (!token)
    return res.status(401).json({ error: "no_token" });

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError")
      return res.status(401).json({ error: "expired" });

    return res.status(401).json({ error: "invalid" });
  }
};
```

### Usar em Rotas Protegidas
```javascript
// Exemplo de uso
app.get('/api/perfil', authenticate, async (req, res) => {
  const user = await getUserById(req.user.userId);
  res.json(user);
});

app.get('/api/bancas', authenticate, async (req, res) => {
  const bancas = await getBancasByUserId(req.user.userId);
  res.json(bancas);
});
```

## 📦 Package Dependencies

### npm install
```bash
npm install cookie-parser cors jsonwebtoken
npm install -D @types/cookie-parser @types/cors @types/jsonwebtoken
```

### Configurar Middlewares
```javascript
const cookieParser = require('cookie-parser');
const cors = require('cors');

app.use(cookieParser());
app.use(cors(corsConfig));
```

## 🔧 Environment Variables

### .env
```env
# JWT Secrets
JWT_SECRET=your_super_secret_jwt_key_here
REFRESH_SECRET=your_super_secret_refresh_key_here

# CORS
FRONTEND_URL=http://localhost:5173

# Environment
NODE_ENV=development
```

## 🧪 Testing

### Testar Cookies Manualmente
```bash
# 1. Fazer login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"email":"user@example.com","password":"password"}'

# 2. Acessar rota protegida
curl -X GET http://localhost:3001/api/perfil \
  -b cookies.txt \
  -v

# 3. Fazer logout
curl -X POST http://localhost:3001/api/auth/clear-cookies \
  -b cookies.txt \
  -c cookies.txt
```

### Testar CORS
```javascript
// No browser console
fetch('http://localhost:3001/api/auth/login', {
  method: 'POST',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
})
.then(res => res.json())
.then(console.log);
```

## 🚀 Deploy Considerations

### Produção
- `secure: true` nos cookies
- HTTPS obrigatório
- `NODE_ENV=production`
- Frontend URL configurado

### Development
- `secure: false` nos cookies
- HTTP permitido
- `NODE_ENV=development`
- `http://localhost:5173`

---

## ✅ Checklist de Implementação

- [ ] Instalar dependências (cookie-parser, cors, jsonwebtoken)
- [ ] Configurar CORS com `credentials: true`
- [ ] Implementar `/api/auth/login` com cookies diretos
- [ ] Implementar `/api/auth/logout` com clearCookie
- [ ] Implementar `/api/auth/refresh` (tokens apenas via cookies)
- [ ] Atualizar middleware de autenticação
- [ ] Configurar environment variables
- [ ] Testar fluxo completo
- [ ] Deploy em produção com HTTPS

**🚨 REGRAS DE SEGURANÇA CRÍTICAS:**
- ❌ NUNCA aceitar tokens via `req.body`
- ✅ Tokens criados APENAS no servidor
- ✅ Refresh token via cookie httpOnly
- ✅ Nenhum token exposto em responses

**Status**: Guia completo para implementação backend
