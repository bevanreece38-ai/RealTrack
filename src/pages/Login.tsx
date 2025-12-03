import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ChevronRight } from 'lucide-react';
import { authService } from '../services/api';
import { AuthManager } from '../lib/auth';
import { type ApiError } from '../types/api';

const heroStats = [
  { value: '24/7', label: 'Bot Suporte' },
  { value: '90%', label: 'Taxa de Sucesso' },
  { value: '5+', label: 'Usuários Ativos' }
];

const BrandMark = () => (
  <div
    className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/25 to-emerald-400/40 shadow-[0_15px_35px_rgba(6,78,59,0.35)]"
    aria-hidden="true"
  >
    <span className="pointer-events-none absolute h-12 w-12 rounded-full border-2 border-emerald-200/45" />
    <span className="pointer-events-none absolute h-8 w-8 rounded-full border-2 border-emerald-200/45" />
    <span className="pointer-events-none absolute h-5 w-5 rounded-full border-2 border-emerald-400/80" />
    <span className="pointer-events-none absolute h-3 w-3 rounded-full bg-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.9)]" />
  </div>
);

const inputClass =
  'w-full rounded-2xl border border-white/10 bg-white/90 py-3.5 pl-11 pr-4 text-sm text-slate-900 placeholder:text-slate-500 transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/30';

const fieldLabelClass = 'text-sm font-medium text-slate-300';
const fieldWrapperClass = 'flex flex-col gap-2.5';
const formCardClass =
  'relative z-10 w-full rounded-[32px] border border-white/10 bg-[rgba(6,19,27,0.9)] p-8 shadow-[0_30px_60px_rgba(2,6,23,0.35)] backdrop-blur-2xl lg:p-10';
const primaryButtonClass =
  'mt-7 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 py-4 text-base font-semibold text-white shadow-[0_0_30px_rgba(16,185,129,0.35)] transition hover:from-emerald-600 hover:to-emerald-700 disabled:cursor-not-allowed disabled:opacity-80';
const checkboxClass =
  'h-4 w-4 rounded border border-white/15 bg-transparent text-emerald-400 focus:ring-emerald-400 focus:ring-offset-0';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [lembrarMe, setLembrarMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authService.login(email, senha);
      
      if (response.success) {
        // Salvar tokens no localStorage
        if (response.token && response.refreshToken && response.expiresAt) {
          AuthManager.setTokens({
            accessToken: response.token,
            refreshToken: response.refreshToken,
            expiresAt: response.expiresAt
          });
        }
        
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
    <div className="login-page relative flex min-h-screen w-full flex-col overflow-hidden bg-[#010806] text-slate-100 lg:flex-row">
      <div className="pointer-events-none absolute -right-24 -top-24 h-[28rem] w-[28rem] rounded-full bg-emerald-500/30 blur-[180px]" aria-hidden="true" />
      <div className="pointer-events-none absolute -bottom-16 -left-16 h-[26rem] w-[26rem] rounded-full bg-emerald-600/20 blur-[180px]" aria-hidden="true" />

      {/* Left Panel - Hero */}
      <div className="relative z-10 flex flex-col justify-between px-6 py-12 sm:px-10 lg:w-1/2 lg:px-16 lg:py-16">
        <div className="pt-6 lg:pt-10">
          <div className="mb-16 flex items-center gap-4">
            <BrandMark />
            <div>
              <p className="text-xl font-semibold text-white">Real Comando</p>
              <p className="text-[0.65rem] uppercase tracking-[0.3em] text-emerald-300">Planilha Esportiva</p>
            </div>
          </div>

          <div className="max-w-xl space-y-6">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.4em] text-emerald-300">
              Plataforma oficial
            </p>
            <h1 className="text-4xl font-semibold leading-tight text-white lg:text-6xl">
              Domine o jogo das
              <span className="mt-2 block bg-gradient-to-r from-emerald-300 to-teal-300 bg-clip-text text-transparent">
                apostas esportivas
              </span>
            </h1>
            <p className="text-lg leading-relaxed text-slate-300">
              Plataforma completa de análise, gestão e otimização de resultados para potencializar seus ganhos.
            </p>
          </div>
        </div>

        <div className="hidden gap-6 pt-16 text-slate-400 lg:grid lg:grid-cols-3">
          {heroStats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-3xl border border-white/5 bg-white/5 p-4 backdrop-blur-xl"
            >
              <span className="text-2xl font-semibold text-emerald-300">{stat.value}</span>
              <span className="block text-sm text-slate-300">{stat.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="relative z-10 flex w-full items-center justify-center px-6 py-12 sm:px-10 lg:w-1/2 lg:px-16 lg:py-16">
        <div className="relative w-full max-w-md">
          <div
            className="pointer-events-none absolute -inset-4 rounded-[32px] bg-gradient-to-br from-emerald-400/15 via-transparent to-transparent blur-3xl"
            aria-hidden="true"
          />

          <div className={formCardClass}>
            <div className="mb-8">
              <h2 className="mb-2 text-2xl text-white">Acessar conta</h2>
              <p className="text-slate-400">Faça login para continuar</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className={fieldWrapperClass}>
                <label htmlFor="email" className={fieldLabelClass}>
                  Endereço de e-mail
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-500">
                    <Mail size={18} />
                  </span>
                  <input
                    ref={emailInputRef}
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="voce@exemplo.com"
                    className={inputClass}
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className={fieldWrapperClass}>
                <label htmlFor="password" className={fieldLabelClass}>
                  Senha
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-500">
                    <Lock size={18} />
                  </span>
                  <input
                    ref={passwordInputRef}
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    placeholder="••••••••••"
                    className={`${inputClass} pr-11`}
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-500 transition hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 text-sm">
                <label className="group flex cursor-pointer items-center gap-2 text-slate-400">
                  <input
                    type="checkbox"
                    checked={lembrarMe}
                    onChange={(e) => setLembrarMe(e.target.checked)}
                    className={checkboxClass}
                  />
                  <span className="transition group-hover:text-slate-200">Lembrar-me</span>
                </label>
                <Link to="/recuperar-senha" className="font-medium text-emerald-400 transition hover:text-emerald-200">
                  Esqueceu a senha?
                </Link>
              </div>

              {error && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400" role="alert">
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading} className={`${primaryButtonClass} group`}>
                <span>{loading ? 'Entrando...' : 'Entrar agora'}</span>
                <ChevronRight size={18} className="transition-transform group-hover:translate-x-0.5" />
              </button>
            </form>

            <div className="relative my-7 flex items-center">
              <div className="h-px w-full bg-slate-800" />
              <span className="absolute bg-[rgba(6,19,27,0.95)] px-4 text-xs font-semibold uppercase tracking-[0.3em] text-slate-600">
                Novo aqui?
              </span>
            </div>

            <div className="text-center">
              <Link
                to="/cadastro"
                className="group inline-flex items-center justify-center gap-2 text-sm text-slate-300 transition hover:text-emerald-400"
              >
                <span>Criar uma conta gratuita</span>
                <ChevronRight size={16} className="transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>

          <p className="mt-6 flex items-center justify-center gap-2 text-center text-xs text-slate-600">
            <svg className="h-4 w-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
            Seus dados estão protegidos com criptografia de ponta
          </p>
        </div>
      </div>
    </div>
  );
}
