import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import { PerfilProvider } from './contexts/PerfilContext';
import { ToastProvider } from './contexts/ToastContext';
import ToastContainer from './components/ToastContainer';

// Lazy load de todas as páginas para reduzir bundle inicial
const Login = lazy(() => import('./pages/Login'));
const Cadastro = lazy(() => import('./pages/Cadastro'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Bancas = lazy(() => import('./pages/Bancas'));
const Financeiro = lazy(() => import('./pages/Financeiro'));
const Analise = lazy(() => import('./pages/Analise'));
const Atualizar = lazy(() => import('./pages/Atualizar'));
const Perfil = lazy(() => import('./pages/Perfil'));
const Tipsters = lazy(() => import('./pages/Tipsters'));
const TelegramEdit = lazy(() => import('./pages/TelegramEdit'));
const TelegramStatus = lazy(() => import('./pages/TelegramStatus'));

// Componente de loading simples para Suspense
const PageLoader = () => (
  <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
    <div className="text-center">
      <div className="mx-auto mb-4 h-10 w-10 rounded-full border-4 border-border/60 border-t-brand-emerald animate-spin" />
      <p className="text-sm text-foreground-muted">Carregando...</p>
    </div>
  </div>
);

function App() {
  return (
    <ToastProvider>
      <PerfilProvider>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route index element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/cadastro" element={<Cadastro />} />
            <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/bancas" element={<Bancas />} />
              <Route path="/financeiro" element={<Financeiro />} />
              <Route path="/analise" element={<Analise />} />
              <Route path="/atualizar" element={<Atualizar />} />
              <Route path="/perfil" element={<Perfil />} />
              <Route path="/tipsters" element={<Tipsters />} />
            </Route>
            {/* Rotas do Telegram Web App (sem Layout) */}
            <Route element={<ProtectedRoute><div /></ProtectedRoute>}>
              <Route path="/telegram/edit" element={<TelegramEdit />} />
              <Route path="/telegram/status" element={<TelegramStatus />} />
            </Route>
          </Routes>
        </Suspense>
        <ToastContainer />
      </PerfilProvider>
    </ToastProvider>
  );
}

export default App;
