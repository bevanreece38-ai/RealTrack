import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Target, ChevronRight } from 'lucide-react';
import api from '../lib/api';
import { type ApiError } from '../types/api';

interface LoginResponse {
  token: string;
}

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  
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
    <div className="w-screen h-screen bg-gradient-to-br from-emerald-950 via-slate-950 to-slate-950 flex flex-col lg:flex-row relative overflow-hidden" style={{ transform: 'scale(1.05)', transformOrigin: 'top left', width: '100vw', height: '100vh', overflow: 'hidden', position: 'fixed', top: '0', left: '0' }}>
      {/* Decorative Elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-600/5 rounded-full blur-3xl" />
      
      {/* Left Panel - Hero */}
      <div className="lg:w-1/2 p-8 lg:p-16 flex flex-col justify-between relative z-10">
        {/* Logo & Title */}
        <div>
          <div className="flex items-center gap-3 mb-16">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <Target className="text-white" size={24} strokeWidth={2.5} />
            </div>
            <div>
              <div className="text-white text-xl">Real Comando</div>
              <div className="text-emerald-400 text-xs tracking-wider">MANAGEMENT</div>
            </div>
          </div>

          <div className="max-w-xl">
            <h1 className="text-white text-5xl lg:text-6xl mb-6 leading-tight">
              Domine o jogo das
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400 mt-2">
                apostas esportivas
              </span>
            </h1>
            <p className="text-slate-400 text-lg leading-relaxed">
              Plataforma completa de análise, gestão e otimização de resultados. Transforme dados em lucros consistentes.
            </p>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="hidden lg:block">
          <div className="grid grid-cols-3 gap-6 pt-8 border-t border-slate-800/50">
            <div>
              <div className="text-emerald-400 text-2xl mb-1">15.7k+</div>
              <div className="text-slate-500 text-sm">Apostadores</div>
            </div>
            <div>
              <div className="text-emerald-400 text-2xl mb-1">87%</div>
              <div className="text-slate-500 text-sm">Taxa de Sucesso</div>
            </div>
            <div>
              <div className="text-emerald-400 text-2xl mb-1">R$ 24M</div>
              <div className="text-slate-500 text-sm">Volume Total</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="lg:w-1/2 flex items-center justify-center p-8 relative z-10">
        <div className="w-full max-w-md">
          {/* Background Card Effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-3xl blur-3xl" />
          
          {/* Login Card */}
          <div className="relative bg-slate-900/90 backdrop-blur-2xl border border-slate-800/50 rounded-2xl p-8 lg:p-10 shadow-2xl">
            {/* Header */}
            <div className="mb-8">
              <h2 className="text-white text-2xl mb-2">Acessar conta</h2>
              <p className="text-slate-400">Faça login para continuar</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-slate-300 mb-2.5 text-sm">
                  Endereço de e-mail
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                    <Mail className="text-slate-500" size={18} />
                  </div>
                  <input
                    ref={emailInputRef}
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="voce@exemplo.com"
                    className="w-full bg-slate-950/50 border border-slate-700/50 text-white rounded-xl pl-11 pr-4 py-3.5 text-sm placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all"
                    style={{ 
                      color: '#ffffff !important', 
                      backgroundColor: '#0f172a !important', 
                      WebkitTextFillColor: '#ffffff !important',
                      WebkitBoxShadow: '0 0 0 1000px #0f172a inset !important',
                      caretColor: '#ffffff !important'
                    }}
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-slate-300 mb-2.5 text-sm">
                  Senha
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                    <Lock className="text-slate-500" size={18} />
                  </div>
                  <input
                    ref={passwordInputRef}
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    placeholder="••••••••••"
                    className="w-full bg-slate-950/50 border border-slate-700/50 text-white rounded-xl pl-11 pr-11 py-3.5 text-sm placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all"
                    style={{ 
                      color: '#ffffff !important', 
                      backgroundColor: '#0f172a !important', 
                      WebkitTextFillColor: '#ffffff !important',
                      WebkitBoxShadow: '0 0 0 1000px #0f172a inset !important',
                      caretColor: '#ffffff !important'
                    }}
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Remember & Forgot */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0 cursor-pointer"
                  />
                  <span className="text-slate-400 text-sm group-hover:text-slate-300 transition-colors">
                    Lembrar-me
                  </span>
                </label>
                <Link 
                  to="/recuperar-senha" 
                  className="text-emerald-400 hover:text-emerald-300 text-sm transition-colors"
                >
                  Esqueceu a senha?
                </Link>
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                  {error}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 disabled:from-slate-600 disabled:to-slate-700 text-white py-4 rounded-xl transition-all shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 disabled:shadow-none flex items-center justify-center gap-2 group mt-7 disabled:cursor-not-allowed"
              >
                <span>{loading ? 'Entrando...' : 'Entrar agora'}</span>
                <ChevronRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
              </button>
            </form>

            {/* Divider */}
            <div className="relative my-7">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-800"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="px-4 bg-slate-900 text-slate-600 text-xs uppercase tracking-wider">
                  Novo aqui?
                </span>
              </div>
            </div>

            {/* Sign Up Link */}
            <div className="text-center">
              <Link 
                to="/cadastro" 
                className="inline-flex items-center justify-center gap-2 text-slate-300 hover:text-emerald-400 transition-colors group"
              >
                <span className="text-sm">Criar uma conta gratuita</span>
                <ChevronRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </div>

          {/* Trust Badge */}
          <div className="mt-6 text-center">
            <p className="text-slate-600 text-xs flex items-center justify-center gap-2">
              <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              Seus dados estão protegidos com criptografia de ponta
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
