import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock } from 'lucide-react';
import api from '../lib/api';
import { type ApiError } from '../types/api';

interface LoginResponse {
  token: string;
}

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<'email' | 'senha' | null>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  // Forçar estilos escuros quando autofill é detectado
  useEffect(() => {
    const forceDarkStyles = () => {
      const inputs = [emailInputRef.current, passwordInputRef.current].filter(Boolean) as HTMLInputElement[];
      
      inputs.forEach(input => {
        // Sempre aplicar estilos escuros, independente do autofill
        input.style.setProperty('background-color', '#020617', 'important');
        input.style.setProperty('background', '#020617', 'important');
        input.style.setProperty('color', '#ffffff', 'important');
        input.style.setProperty('-webkit-text-fill-color', '#ffffff', 'important');
        input.style.setProperty('-webkit-box-shadow', '0 0 0 1000px #020617 inset', 'important');
      });
    };

    // Verificar imediatamente
    forceDarkStyles();

    // Verificar periodicamente (para pegar autofill que acontece depois)
    const interval = setInterval(forceDarkStyles, 100);

    // Verificar em eventos
    const checkOnEvent = () => {
      setTimeout(forceDarkStyles, 10);
    };

    // Verificar quando os inputs são montados
    setTimeout(forceDarkStyles, 50);
    setTimeout(forceDarkStyles, 200);
    setTimeout(forceDarkStyles, 500);

    if (typeof window !== 'undefined') {
      window.addEventListener('load', checkOnEvent);
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', checkOnEvent);
      } else {
        checkOnEvent();
      }
    }

    return () => {
      clearInterval(interval);
      if (typeof window !== 'undefined') {
        window.removeEventListener('load', checkOnEvent);
        document.removeEventListener('DOMContentLoaded', checkOnEvent);
      }
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data } = await api.post<LoginResponse>('/auth/login', { email, senha });
      
      if (data.token) {
        localStorage.setItem('token', data.token);
        void navigate('/dashboard');
      }
    } catch (err) {
      const apiError = err as ApiError;
      const errorMessage = apiError.response?.data?.error;
      setError(typeof errorMessage === 'string' ? errorMessage : 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex',
      position: 'relative',
      overflow: 'hidden',
      background: '#0a0e1a'
    }}>
      {/* Background com estrelas e montanhas */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: `
          radial-gradient(ellipse at 20% 30%, rgba(139, 92, 246, 0.15) 0%, transparent 50%),
          radial-gradient(ellipse at 80% 70%, rgba(168, 85, 247, 0.1) 0%, transparent 50%),
          linear-gradient(135deg, #0a0e1a 0%, #1a1f2e 25%, #0f1419 50%, #1a1f2e 75%, #0a0e1a 100%)
        `,
        backgroundAttachment: 'fixed'
      }}>
        {/* Estrelas */}
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `
            radial-gradient(2px 2px at 20% 30%, white, transparent),
            radial-gradient(2px 2px at 60% 70%, white, transparent),
            radial-gradient(1px 1px at 50% 50%, white, transparent),
            radial-gradient(1px 1px at 80% 10%, white, transparent),
            radial-gradient(2px 2px at 90% 40%, white, transparent),
            radial-gradient(1px 1px at 33% 60%, white, transparent),
            radial-gradient(1px 1px at 10% 80%, white, transparent),
            radial-gradient(2px 2px at 40% 20%, white, transparent),
            radial-gradient(1px 1px at 70% 50%, white, transparent),
            radial-gradient(1px 1px at 15% 40%, white, transparent)
          `,
          backgroundRepeat: 'repeat',
          backgroundSize: '200% 200%',
          opacity: 0.6,
          animation: 'twinkle 8s ease-in-out infinite alternate'
        }} />
        
        {/* Montanhas */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '40%',
          background: `
            linear-gradient(to top, 
              #1a1f2e 0%, 
              #0f1419 30%, 
              #0a0e1a 60%,
              transparent 100%
            )
          `,
          clipPath: 'polygon(0% 100%, 0% 60%, 20% 50%, 40% 55%, 60% 45%, 80% 50%, 100% 55%, 100% 100%)'
        }} />
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '35%',
          background: `
            linear-gradient(to top, 
              #0f1419 0%, 
              #0a0e1a 40%,
              transparent 100%
            )
          `,
          clipPath: 'polygon(0% 100%, 0% 70%, 15% 65%, 35% 70%, 55% 60%, 75% 65%, 100% 70%, 100% 100%)',
          opacity: 0.8
        }} />
      </div>

      {/* Conteúdo do Login */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        width: '100%',
        maxWidth: '480px',
        padding: '32px 32px 40px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        margin: '0 auto'
      }}>
        {/* Título */}
        <div style={{ marginBottom: '32px', textAlign: 'center' }}>
          <h1 style={{ 
            margin: '0 0 12px', 
            fontSize: '2.25rem', 
            fontWeight: 700,
            color: 'var(--color-text-white-dark)',
            fontFamily: 'Inter, system-ui, sans-serif',
            letterSpacing: '-0.02em'
          }}>
            Real Comando
            <span style={{
              display: 'inline-block',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: 'conic-gradient(from 180deg, #22d3ee, #6366f1, #ec4899, #22d3ee)',
              marginLeft: '8px',
              boxShadow: '0 0 16px rgba(129, 140, 248, 0.8)'
            }} />
          </h1>
          <p style={{ 
            margin: 0, 
            color: 'rgba(255, 255, 255, 0.7)',
            fontSize: '1rem',
            fontWeight: 400
          }}>
            Faça login para acessar seu dashboard
          </p>
        </div>

        {/* Efeito de vidro opaco ao redor do formulário */}
        <div style={{
          position: 'relative',
          padding: '22px 0 26px 0',
          marginTop: '-4px',
          marginBottom: '-4px'
        }}>
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(circle at top, rgba(56,189,248,0.1), transparent 55%), rgba(15,23,42,0.88)',
            backdropFilter: 'blur(26px) saturate(200%)',
            WebkitBackdropFilter: 'blur(26px) saturate(200%)',
            borderRadius: '26px',
            border: '1px solid rgba(148, 163, 184, 0.45)',
            boxShadow: '0 24px 80px rgba(15, 23, 42, 0.95), 0 0 0 1px rgba(15,23,42,0.8)',
            zIndex: -1
          }} />
          
          {/* Formulário */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px', position: 'relative', zIndex: 1, padding: '0 16px' }}>
          {loading && (
            <div
              style={{
                position: 'fixed',
                inset: 0,
                background: '#000000',
                animation: 'rc-screen-close 0.35s ease-out forwards',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 999,
                pointerEvents: 'auto'
              }}
            >
              <div
                style={{
                  padding: '18px 26px',
                  borderRadius: '18px',
                  background: 'linear-gradient(145deg, #020617, #020617)',
                  boxShadow: '0 18px 50px rgba(0,0,0,0.85), 0 0 0 1px rgba(30,64,175,0.6)',
                  border: '1px solid rgba(59,130,246,0.6)',
                  minWidth: '240px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 12
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '999px',
                    border: '3px solid rgba(59,130,246,0.25)',
                    borderTopColor: 'rgba(59,130,246,1)',
                    animation: 'rc-spin 0.9s linear infinite',
                    boxShadow: '0 0 18px rgba(59,130,246,0.8)'
                  }}
                />
                <div style={{ textAlign: 'center' }}>
                  <p
                    style={{
                      margin: 0,
                      fontSize: '0.9rem',
                      fontWeight: 700,
                      letterSpacing: '0.15em',
                      textTransform: 'uppercase',
                      color: 'rgba(248,250,252,0.96)'
                    }}
                  >
                    Autenticando
                  </p>
                  <p
                    style={{
                      margin: '4px 0 0',
                      fontSize: '0.8rem',
                      color: 'rgba(148,163,184,0.96)'
                    }}
                  >
                    Validando seus dados com segurança…
                  </p>
                </div>
              </div>
            </div>
          )}
          {/* Campo Email */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <label style={{ 
              fontSize: '0.9rem', 
              fontWeight: 600,
              color: 'var(--color-text-white-dark)'
            }}>
              Email
            </label>
            <div style={{ position: 'relative' }}>
              <Mail 
                size={20} 
                style={{ 
                  position: 'absolute', 
                  left: '16px', 
                  top: '50%', 
                  transform: 'translateY(-50%)',
                  color: focusedField === 'email' ? '#a78bfa' : 'rgba(255, 255, 255, 0.6)',
                  pointerEvents: 'none',
                  transition: 'color 0.2s',
                  zIndex: 1
                }} 
              />
              <input
                ref={emailInputRef}
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  // Forçar estilos após mudança
                  setTimeout(() => {
                    if (emailInputRef.current) {
                      emailInputRef.current.style.setProperty('background-color', '#020617', 'important');
                      emailInputRef.current.style.setProperty('background', '#020617', 'important');
                    }
                  }, 10);
                }}
                placeholder="seu@email.com"
                required
                autoComplete="email"
                onFocus={() => {
                  setFocusedField('email');
                  // Forçar estilos ao focar
                  setTimeout(() => {
                    if (emailInputRef.current) {
                      emailInputRef.current.style.setProperty('background-color', '#020617', 'important');
                      emailInputRef.current.style.setProperty('background', '#020617', 'important');
                    }
                  }, 10);
                }}
                onBlur={() => {
                  setFocusedField(null);
                  // Forçar estilos ao perder foco
                  setTimeout(() => {
                    if (emailInputRef.current) {
                      emailInputRef.current.style.setProperty('background-color', '#020617', 'important');
                      emailInputRef.current.style.setProperty('background', '#020617', 'important');
                    }
                  }, 10);
                }}
                style={{
                  width: '100%',
                  padding: '14px 14px 14px 48px',
                  border: focusedField === 'email' 
                    ? '1px solid #8b5cf6' 
                    : '1px solid rgba(148, 163, 184, 0.5)',
                  borderRadius: '12px',
                  fontSize: '0.95rem',
                  background: '#020617',
                  backgroundColor: '#020617',
                  color: '#e5e7eb',
                  outline: 'none',
                  transition: 'all 0.3s ease',
                  boxShadow: focusedField === 'email'
                    ? '0 0 0 3px rgba(129, 140, 248, 0.25), 0 0 20px rgba(129, 140, 248, 0.35)'
                    : 'none'
                }}
              />
            </div>
          </div>

          {/* Campo Senha */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <label style={{ 
              fontSize: '0.9rem', 
              fontWeight: 600,
              color: 'var(--color-text-white-dark)'
            }}>
              Senha
            </label>
            <div style={{ position: 'relative' }}>
              <Lock 
                size={20} 
                style={{ 
                  position: 'absolute', 
                  left: '16px', 
                  top: '50%', 
                  transform: 'translateY(-50%)',
                  color: focusedField === 'senha' ? '#a78bfa' : 'rgba(255, 255, 255, 0.6)',
                  pointerEvents: 'none',
                  transition: 'color 0.2s',
                  zIndex: 1
                }} 
              />
              <input
                ref={passwordInputRef}
                type="password"
                value={senha}
                onChange={(e) => {
                  setSenha(e.target.value);
                  // Forçar estilos após mudança
                  setTimeout(() => {
                    if (passwordInputRef.current) {
                      passwordInputRef.current.style.setProperty('background-color', '#020617', 'important');
                      passwordInputRef.current.style.setProperty('background', '#020617', 'important');
                    }
                  }, 10);
                }}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                onFocus={() => {
                  setFocusedField('senha');
                  // Forçar estilos ao focar
                  setTimeout(() => {
                    if (passwordInputRef.current) {
                      passwordInputRef.current.style.setProperty('background-color', '#020617', 'important');
                      passwordInputRef.current.style.setProperty('background', '#020617', 'important');
                    }
                  }, 10);
                }}
                onBlur={() => {
                  setFocusedField(null);
                  // Forçar estilos ao perder foco
                  setTimeout(() => {
                    if (passwordInputRef.current) {
                      passwordInputRef.current.style.setProperty('background-color', '#020617', 'important');
                      passwordInputRef.current.style.setProperty('background', '#020617', 'important');
                    }
                  }, 10);
                }}
                style={{
                  width: '100%',
                  padding: '14px 14px 14px 48px',
                  border: focusedField === 'senha' 
                    ? '1px solid #8b5cf6' 
                    : '1px solid rgba(148, 163, 184, 0.5)',
                  borderRadius: '12px',
                  fontSize: '0.95rem',
                  background: '#020617',
                  backgroundColor: '#020617',
                  color: '#e5e7eb',
                  outline: 'none',
                  transition: 'all 0.3s ease',
                  boxShadow: focusedField === 'senha'
                    ? '0 0 0 3px rgba(129, 140, 248, 0.25), 0 0 20px rgba(129, 140, 248, 0.35)'
                    : 'none'
                }}
              />
            </div>
            <Link 
              to="/recuperar-senha" 
              style={{ 
                color: 'rgba(255, 255, 255, 0.7)',
                fontSize: '0.85rem',
                textDecoration: 'none',
                transition: 'color 0.2s',
                fontWeight: 400,
                alignSelf: 'flex-end',
                marginTop: '-4px'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#a78bfa'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)'}
            >
              Esqueci minha senha
            </Link>
          </div>

          {/* Mensagem de Erro */}
          {error && (
            <div style={{
              padding: '12px 16px',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '12px',
              color: '#f87171',
              fontSize: '0.9rem'
            }}>
              {error}
            </div>
          )}

          {/* Botão Entrar */}
          <button 
            type="submit" 
            disabled={loading} 
            style={{ 
              width: '100%', 
              padding: '15px',
              background: loading 
                ? 'rgba(15, 23, 42, 0.8)' 
                : 'linear-gradient(135deg, #22d3ee 0%, #6366f1 40%, #ec4899 80%)',
              backgroundSize: '180% 100%',
              color: 'var(--color-text-white-dark)',
              border: 'none',
              borderRadius: '999px',
              fontSize: '1rem',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.25s ease',
              marginTop: '8px',
              boxShadow: loading 
                ? 'none' 
                : '0 12px 35px rgba(37, 99, 235, 0.55)',
              position: 'relative',
              overflow: 'hidden'
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.backgroundPosition = '100% 0';
                e.currentTarget.style.transform = 'translateY(-1px) scale(1.01)';
                e.currentTarget.style.boxShadow = '0 18px 40px rgba(37, 99, 235, 0.7)';
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.currentTarget.style.backgroundPosition = '0% 0';
                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                e.currentTarget.style.boxShadow = '0 12px 35px rgba(37, 99, 235, 0.55)';
              }
            }}
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>

          {/* Link Cadastro */}
          <div style={{ textAlign: 'center', marginTop: '8px' }}>
            <Link 
              to="/cadastro" 
              style={{ 
                color: 'rgba(255, 255, 255, 0.7)',
                fontSize: '0.9rem',
                textDecoration: 'none',
                transition: 'color 0.2s',
                fontWeight: 400
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#a78bfa'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)'}
            >
              Ainda não tenho uma conta
            </Link>
          </div>
        </form>
        </div>
      </div>

      {/* Estilos específicos para inputs da página de login */}
      <style>{`
        @keyframes twinkle {
          0% { opacity: 0.4; }
          100% { opacity: 0.8; }
        }
        @keyframes rc-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes rc-screen-close {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
        
        /* Garantir que os inputs na página de login sempre tenham fundo escuro */
        input[type="email"],
        input[type="password"] {
          background: #020617 !important;
          background-color: #020617 !important;
          color: #ffffff !important;
          -webkit-text-fill-color: #ffffff !important;
          caret-color: #ffffff !important;
        }
        
        input[type="email"]::placeholder,
        input[type="password"]::placeholder {
          color: rgba(255, 255, 255, 0.5) !important;
          opacity: 1 !important;
        }
        
        /* Estilos para autofill do navegador - mais agressivo */
        input[type="email"]:-webkit-autofill,
        input[type="email"]:-webkit-autofill:hover,
        input[type="email"]:-webkit-autofill:focus,
        input[type="email"]:-webkit-autofill:active,
        input[type="email"]:-webkit-autofill:visited,
        input[type="password"]:-webkit-autofill,
        input[type="password"]:-webkit-autofill:hover,
        input[type="password"]:-webkit-autofill:focus,
        input[type="password"]:-webkit-autofill:active,
        input[type="password"]:-webkit-autofill:visited {
          -webkit-box-shadow: 0 0 0 1000px #020617 inset !important;
          -webkit-text-fill-color: #ffffff !important;
          background: #020617 !important;
          background-color: #020617 !important;
          background-image: none !important;
          color: #ffffff !important;
          caret-color: #ffffff !important;
          transition: background-color 5000s ease-in-out 0s, background 5000s ease-in-out 0s !important;
          -webkit-transition: background-color 5000s ease-in-out 0s, background 5000s ease-in-out 0s !important;
        }
        
        /* Para outros navegadores (Firefox, etc) */
        input[type="email"]:-moz-autofill,
        input[type="email"]:-moz-autofill:hover,
        input[type="email"]:-moz-autofill:focus,
        input[type="password"]:-moz-autofill,
        input[type="password"]:-moz-autofill:hover,
        input[type="password"]:-moz-autofill:focus {
          background: #020617 !important;
          background-color: #020617 !important;
          background-image: none !important;
          color: #ffffff !important;
        }
        
        /* Forçar estilos mesmo quando o navegador tenta mudar */
        input[type="email"]:not(:placeholder-shown),
        input[type="password"]:not(:placeholder-shown) {
          background: #020617 !important;
          background-color: #020617 !important;
          color: #ffffff !important;
        }
      `}</style>
    </div>
  );
}
