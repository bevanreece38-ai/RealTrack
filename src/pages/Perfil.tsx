import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Crown, 
  Zap, 
  Infinity as InfinityIcon, 
  ArrowRight, 
  User, 
  Mail, 
  Lock, 
  Copy, 
  CheckCircle2, 
  Calendar, 
  RefreshCw, 
  Shield, 
  Bot, 
  AlertTriangle,
  Trash2,
  X,
  MessageCircle
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import api from '../lib/api';
import { type ApiProfileResponse, type ApiError } from '../types/api';
import '../styles/animations.css';
import { formatCurrency as formatCurrencyUtil, formatDate as formatDateUtil } from '../utils/formatters';

interface ResetAccountResponse {
  deleted: {
    bancas: number;
    apostas: number;
    transacoes: number;
  };
}


export default function Perfil() {
  const [profile, setProfile] = useState<ApiProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(false);
  const [updateForm, setUpdateForm] = useState({
    nomeCompleto: '',
    email: ''
  });
  const [passwordForm, setPasswordForm] = useState({
    senhaAtual: '',
    novaSenha: '',
    confirmarSenha: ''
  });
  const [passwordError, setPasswordError] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    void fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const { data } = await api.get<ApiProfileResponse>('/perfil');
      setProfile(data);
      setUpdateForm({
        nomeCompleto: data.nomeCompleto,
        email: data.email
      });
    } catch (err) {
      const apiError = err as ApiError;
      const errorMessage = apiError.response?.data?.error;
      setError(typeof errorMessage === 'string' ? errorMessage : 'Erro ao carregar perfil');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    try {
      setUpdating(true);
      setError('');
      const { data } = await api.put<ApiProfileResponse>('/perfil', updateForm);
      setProfile(data);
      
      // Atualizar o formulário com os novos dados
      setUpdateForm({
        nomeCompleto: data.nomeCompleto,
        email: data.email
      });
      
      // Disparar evento customizado para atualizar o Layout e outras partes do site
      window.dispatchEvent(new CustomEvent('profile-updated', { detail: data }));
      
      alert('Perfil atualizado com sucesso!');
    } catch (err) {
      const apiError = err as ApiError;
      const errorMessage = apiError.response?.data?.error;
      setError(typeof errorMessage === 'string' ? errorMessage : 'Erro ao atualizar perfil');
    } finally {
      setUpdating(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess(false);

    // Validações
    if (!passwordForm.senhaAtual || !passwordForm.novaSenha || !passwordForm.confirmarSenha) {
      setPasswordError('Todos os campos são obrigatórios');
      return;
    }

    if (passwordForm.novaSenha.length < 6) {
      setPasswordError('A nova senha deve ter pelo menos 6 caracteres');
      return;
    }

    if (passwordForm.novaSenha !== passwordForm.confirmarSenha) {
      setPasswordError('As senhas não coincidem');
      return;
    }

    try {
      setChangingPassword(true);
      await api.put('/perfil/senha', {
        senhaAtual: passwordForm.senhaAtual,
        novaSenha: passwordForm.novaSenha
      });
      
      setPasswordSuccess(true);
      setPasswordForm({
        senhaAtual: '',
        novaSenha: '',
        confirmarSenha: ''
      });
      
      // Limpar mensagem de sucesso após 3 segundos
      setTimeout(() => {
        setPasswordSuccess(false);
      }, 3000);
    } catch (err) {
      const apiError = err as ApiError;
      const errorMessage = apiError.response?.data?.error;
      setPasswordError(typeof errorMessage === 'string' ? errorMessage : 'Erro ao alterar senha');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleResetAccount = async () => {
    try {
      setResetting(true);
      setResetError('');
      const { data } = await api.delete<ResetAccountResponse>('/perfil/reset');
      
      alert(`Conta resetada com sucesso!\n\nDados removidos:\n- ${data.deleted.bancas} bancas\n- ${data.deleted.apostas} apostas\n- ${data.deleted.transacoes} transações`);
      
      setResetModalOpen(false);
      // Redirecionar para o dashboard após reset
      void navigate('/dashboard');
      // Recarregar a página para atualizar os dados
      window.location.reload();
    } catch (err) {
      const apiError = err as ApiError;
      const errorMessage = apiError.response?.data?.error;
      setResetError(typeof errorMessage === 'string' ? errorMessage : 'Erro ao resetar conta');
    } finally {
      setResetting(false);
    }
  };


  const formatDate = (dateString: string) => {
    return formatDateUtil(dateString);
  };

  const formatCurrency = (value: number) => {
    return formatCurrencyUtil(value);
  };

  const copyToClipboard = (text: string) => {
    void navigator.clipboard.writeText(text).then(() => {
      alert('ID copiado para a área de transferência!');
    }).catch(() => {
      alert('Erro ao copiar ID');
    });
  };

  const handleLinkTelegram = () => {
    if (!profile) return;
    
    // Nome do bot do Telegram (pode ser configurado via variável de ambiente)
    const envBot: unknown = import.meta.env.VITE_TELEGRAM_BOT_USERNAME;
    const botUsername = typeof envBot === 'string' ? envBot : 'RealComando_bot';
    const telegramUrl = `https://t.me/${botUsername}?start=${profile.id}`;
    
    // Abre o bot do Telegram em uma nova aba
    window.open(telegramUrl, '_blank');
  };

  const handleUnlinkTelegram = async () => {
    if (!profile) return;
    
    if (!confirm('Tem certeza que deseja desvincular sua conta do Telegram?')) {
      return;
    }

    try {
      const { data } = await api.put<ApiProfileResponse>('/perfil/telegram', { telegramId: null });
      setProfile(data);
      alert('Telegram desvinculado com sucesso!');
    } catch (err) {
      const apiError = err as ApiError;
      const errorMessage = apiError.response?.data?.error;
      alert(typeof errorMessage === 'string' ? errorMessage : 'Erro ao desvincular Telegram');
    }
  };

  const handleOpenSupportBot = () => {
    if (!profile) return;
    
    // Nome do bot de suporte do Telegram (pode ser configurado via variável de ambiente)
    const envSupportBot: unknown = import.meta.env.VITE_TELEGRAM_SUPPORT_BOT_USERNAME;
    const supportBotUsername = typeof envSupportBot === 'string' ? envSupportBot : 'RealComandoSuporte_bot';
    // Enviar o userId como parâmetro para o bot reconhecer a conta vinculada
    const telegramUrl = `https://t.me/${supportBotUsername}?start=support_${profile.id}`;
    
    // Abre o bot de suporte do Telegram em uma nova aba
    window.open(telegramUrl, '_blank');
  };

  if (loading) {
    return (
      <div>
        <PageHeader title="Meu Perfil" subtitle="Gerencie suas informações pessoais e configurações da conta" />
        <div className="card" className="fade-up card-hover">
          <p>Carregando...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div>
        <PageHeader title="Meu Perfil" subtitle="Gerencie suas informações pessoais e configurações da conta" />
        <div className="card" className="fade-up card-hover">
          <p style={{ color: 'var(--color-danger)' }}>{error || 'Erro ao carregar perfil'}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <PageHeader title="Meu Perfil" subtitle="Gerencie suas informações pessoais e configurações da conta" />

      {error && (
        <div className="card" className="fade-up card-hover" style={{ marginBottom: 0, background: 'var(--color-bg-danger)', borderColor: 'var(--color-border-danger)' }}>
          <p style={{ color: 'var(--color-danger-dark)', margin: 0 }}>{error}</p>
        </div>
      )}

      {/* Seção: Plano Atual - Destaque Superior */}
      <div className="card fade-up card-hover" style={{ marginBottom: 0 }}>
        <div style={{
          background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(59, 130, 246, 0.15) 100%)',
          borderRadius: '16px',
          padding: '24px',
          border: '1px solid rgba(139, 92, 246, 0.2)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Decorative elements */}
          <div style={{
            position: 'absolute',
            top: '-50px',
            right: '-50px',
            width: '150px',
            height: '150px',
            background: 'radial-gradient(circle, rgba(139, 92, 246, 0.1) 0%, transparent 70%)',
            borderRadius: '50%'
          }} />
          <div style={{
            position: 'absolute',
            bottom: '-30px',
            left: '-30px',
            width: '100px',
            height: '100px',
            background: 'radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, transparent 70%)',
            borderRadius: '50%'
          }} />
          
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.3) 0%, rgba(59, 130, 246, 0.3) 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid rgba(139, 92, 246, 0.3)'
              }}>
                {profile.plano.nome.toLowerCase() === 'gratuito' ? (
                  <Zap size={28} style={{ color: 'var(--color-primary)' }} />
                ) : (
                  <Crown size={28} style={{ color: 'var(--color-primary)' }} />
                )}
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Plano Atual
                </h3>
                <p style={{ 
                  fontSize: '2.5rem', 
                  fontWeight: 800, 
                  margin: '4px 0 0 0',
                  color: '#8b5cf6',
                  background: 'linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}>
                  {profile.plano.nome}
                </p>
              </div>
            </div>

            <div style={{
              background: 'transparent',
              borderRadius: '14px',
              padding: '12px 16px',
              border: 'none',
              flex: 1,
              minWidth: '280px',
              display: 'flex',
              justifyContent: 'space-around',
              alignItems: 'center',
              gap: '12px'
            }}>
              <div style={{ textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Preço Mensal</p>
                <p style={{ margin: '4px 0 0 0', fontSize: '1.25rem', fontWeight: 700, color: 'var(--text)' }}>
                  {formatCurrency(profile.plano.preco)}
                </p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Limite Diário</p>
                <p style={{ margin: '4px 0 0 0', fontSize: '1.25rem', fontWeight: 700, color: 'var(--text)' }}>
                  {profile.plano.limiteApostasDiarias === 0 ? (
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                      <InfinityIcon size={18} />
                      Ilimitado
                    </span>
                  ) : (
                    `${profile.plano.limiteApostasDiarias} apostas`
                  )}
                </p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Renovação</p>
                <p style={{ margin: '4px 0 0 0', fontSize: '1.25rem', fontWeight: 700, color: 'var(--text)' }}>
                  {formatDate(new Date().toISOString())}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Informações Pessoais | Estatísticas da Conta */}
      <div className="grid-2" style={{ marginBottom: 0, alignItems: 'stretch' }}>
        <div className="card" className="fade-up card-hover" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.10) 0%, rgba(59, 130, 246, 0.10) 100%)',
            borderRadius: '16px',
            padding: '24px',
            border: '1px solid var(--color-border-card)',
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            flex: 1
          }}>
            {/* Decorative elements */}
            <div style={{
              position: 'absolute',
              top: '-50px',
              right: '-50px',
              width: '150px',
              height: '150px',
              background: 'radial-gradient(circle, rgba(139, 92, 246, 0.1) 0%, transparent 70%)',
              borderRadius: '50%'
            }} />
            <div style={{
              position: 'absolute',
              bottom: '-30px',
              left: '-30px',
              width: '100px',
              height: '100px',
              background: 'radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, transparent 70%)',
              borderRadius: '50%'
            }} />
            
            <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.3) 0%, rgba(59, 130, 246, 0.3) 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid rgba(139, 92, 246, 0.3)'
                }}>
                  <User size={24} style={{ color: 'var(--color-primary)' }} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Informações Pessoais
                  </h3>
                  <p style={{ 
                    fontSize: '2rem', 
                    fontWeight: 800, 
                    margin: '4px 0 0 0',
                    color: '#8b5cf6',
                    background: 'linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text'
                  }}>
                    {profile.nomeCompleto || 'Perfil'}
                  </p>
                </div>
              </div>

              <div style={{
                background: 'var(--perfil-panel-bg)',
                backdropFilter: 'blur(10px) saturate(180%)',
                WebkitBackdropFilter: 'blur(10px) saturate(180%)',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '20px',
                border: '1px solid var(--perfil-panel-border)'
              }}>
                <form className="filters-panel" style={{ gridTemplateColumns: '1fr', gap: '16px' }} onSubmit={(e) => { e.preventDefault(); void handleUpdateProfile(); }}>
                  <div className="field" style={{ marginBottom: 0 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem', color: 'var(--muted)' }}>
                      <User size={14} />
                      Apelido
                    </label>
              <input
                type="text"
                      className="input-focus"
                value={updateForm.nomeCompleto}
                onChange={(e) => setUpdateForm((prev) => ({ ...prev, nomeCompleto: e.target.value }))}
                      style={{ 
                        paddingLeft: '12px'
                      }}
              />
            </div>
                  <div className="field" style={{ marginBottom: 0 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem', color: 'var(--muted)' }}>
                      <Mail size={14} />
                      Email
                    </label>
              <input
                type="email"
                      className="input-focus"
                value={updateForm.email}
                onChange={(e) => setUpdateForm((prev) => ({ ...prev, email: e.target.value }))}
                      style={{ 
                        paddingLeft: '12px'
                      }}
              />
            </div>
                </form>
              </div>

            <button
                type="button"
                onClick={(e) => { e.preventDefault(); void handleUpdateProfile(); }}
                className="btn primary btn-press" 
                style={{ 
                  width: '100%',
                  marginTop: 'auto',
                  background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-light) 100%)',
                  border: 'none',
                  color: 'white',
                  padding: '14px 24px',
                  fontSize: '1rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(139, 92, 246, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(139, 92, 246, 0.3)';
                }}
              disabled={updating}
            >
              {updating ? 'Salvando...' : 'Salvar Alterações'}
                <ArrowRight size={18} />
            </button>
            </div>
          </div>
        </div>

        <div className="card" className="fade-up card-hover" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.10) 0%, rgba(59, 130, 246, 0.10) 100%)',
            borderRadius: '16px',
            padding: '24px',
            border: '1px solid var(--color-border-card)',
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            flex: 1
          }}>
            {/* Decorative elements */}
            <div style={{
              position: 'absolute',
              top: '-50px',
              right: '-50px',
              width: '150px',
              height: '150px',
              background: 'radial-gradient(circle, rgba(139, 92, 246, 0.1) 0%, transparent 70%)',
              borderRadius: '50%'
            }} />
            <div style={{
              position: 'absolute',
              bottom: '-30px',
              left: '-30px',
              width: '100px',
              height: '100px',
              background: 'radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, transparent 70%)',
              borderRadius: '50%'
            }} />
            
            <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.3) 0%, rgba(59, 130, 246, 0.3) 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid rgba(139, 92, 246, 0.3)'
                }}>
                  <Shield size={24} style={{ color: 'var(--color-primary)' }} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Estatísticas da Conta
                  </h3>
                  <p style={{ 
                    fontSize: '2rem', 
                    fontWeight: 800, 
                    margin: '4px 0 0 0',
                    color: '#8b5cf6',
                    background: 'linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    Ativo
                    <span className="status-pulse" style={{
                      display: 'inline-block',
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                      verticalAlign: 'middle',
                      marginLeft: '1px',
                      position: 'relative',
                      top: '3px',
                    }} />
                  </p>
                </div>
              </div>

              <div style={{
                background: 'var(--perfil-panel-bg)',
                backdropFilter: 'blur(10px) saturate(180%)',
                WebkitBackdropFilter: 'blur(10px) saturate(180%)',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '20px',
                border: '1px solid var(--perfil-panel-border)'
              }}>
                <div className="field" style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem', color: 'var(--muted)', marginBottom: '8px' }}>
                    <Shield size={14} />
                    ID da Conta
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      className="input-focus"
                      value={profile.id}
                      readOnly
                      style={{ 
                        paddingLeft: '12px',
                        flex: 1
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => copyToClipboard(profile.id)}
                      className="btn secondary btn-press"
                      style={{
                        padding: '12px',
                        minWidth: '48px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      title="Copiar ID"
                    >
                      <Copy size={16} />
            </button>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderTop: '1px solid var(--perfil-panel-divider)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Calendar size={16} style={{ color: 'var(--muted)' }} />
                    <span style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>Membro desde</span>
                  </div>
                  <b style={{ fontSize: '0.875rem', color: 'var(--text)' }}>{formatDate(profile.membroDesde)}</b>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderTop: '1px solid var(--perfil-panel-divider)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <RefreshCw size={16} style={{ color: 'var(--muted)' }} />
                    <span style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>Última atualização</span>
                  </div>
                  <b style={{ fontSize: '0.875rem', color: 'var(--text)' }}>{formatDate(profile.updatedAt)}</b>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Alterar Senha | Integração com Telegram */}
      <div className="grid-2" style={{ marginBottom: 0, alignItems: 'stretch' }}>
        <div className="card" className="fade-up card-hover" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.10) 0%, rgba(59, 130, 246, 0.10) 100%)',
            borderRadius: '16px',
            padding: '24px',
            border: '1px solid var(--color-border-card)',
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            flex: 1
          }}>
            {/* Decorative elements */}
            <div style={{
              position: 'absolute',
              top: '-50px',
              right: '-50px',
              width: '150px',
              height: '150px',
              background: 'radial-gradient(circle, rgba(139, 92, 246, 0.1) 0%, transparent 70%)',
              borderRadius: '50%'
            }} />
            <div style={{
              position: 'absolute',
              bottom: '-30px',
              left: '-30px',
              width: '100px',
              height: '100px',
              background: 'radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, transparent 70%)',
              borderRadius: '50%'
            }} />
            
            <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.3) 0%, rgba(59, 130, 246, 0.3) 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid rgba(139, 92, 246, 0.3)'
                }}>
                  <Lock size={24} style={{ color: 'var(--color-primary)' }} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Alterar Senha
                  </h3>
                  <p style={{ 
                    fontSize: '2rem', 
                    fontWeight: 800, 
                    margin: '4px 0 0 0',
                    color: '#8b5cf6',
                    background: 'linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text'
                  }}>
                    Segurança
                  </p>
                </div>
              </div>

            {passwordError && (
                <div style={{ 
                  marginBottom: 16, 
                  padding: 12, 
                  background: 'rgba(239, 68, 68, 0.1)', 
                  border: '1px solid rgba(239, 68, 68, 0.3)', 
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <AlertTriangle size={16} style={{ color: 'var(--color-danger)' }} />
                  <p style={{ color: 'var(--color-danger)', margin: 0, fontSize: '0.875rem' }}>{passwordError}</p>
              </div>
            )}
            {passwordSuccess && (
                <div style={{ 
                  marginBottom: 16, 
                  padding: 12, 
                  background: 'rgba(34, 197, 94, 0.1)', 
                  border: '1px solid rgba(34, 197, 94, 0.3)', 
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <CheckCircle2 size={16} style={{ color: 'var(--color-success)' }} />
                  <p style={{ color: 'var(--color-success)', margin: 0, fontSize: '0.875rem' }}>Senha alterada com sucesso!</p>
              </div>
            )}

              <div style={{
                background: 'var(--perfil-panel-bg)',
                backdropFilter: 'blur(10px) saturate(180%)',
                WebkitBackdropFilter: 'blur(10px) saturate(180%)',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '20px',
                border: '1px solid var(--perfil-panel-border)'
              }}>
                <form className="filters-panel" style={{ gridTemplateColumns: '1fr', gap: '16px' }} onSubmit={handleChangePassword}>
                  <div className="field" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>Senha Atual</label>
                <input
                  type="password"
                      className="input-focus"
                  placeholder="••••••"
                  value={passwordForm.senhaAtual}
                  onChange={(e) => setPasswordForm((prev) => ({ ...prev, senhaAtual: e.target.value }))}
                  disabled={changingPassword}
                />
              </div>
                  <div className="field" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>Nova Senha</label>
                <input
                  type="password"
                      className="input-focus"
                  placeholder="Nova senha"
                  value={passwordForm.novaSenha}
                  onChange={(e) => setPasswordForm((prev) => ({ ...prev, novaSenha: e.target.value }))}
                  disabled={changingPassword}
                />
              </div>
                  <div className="field" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>Confirmar Nova Senha</label>
                <input
                  type="password"
                      className="input-focus"
                  placeholder="Confirme a senha"
                  value={passwordForm.confirmarSenha}
                  onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirmarSenha: e.target.value }))}
                  disabled={changingPassword}
                />
              </div>
                </form>
              </div>

              <button
                type="button"
                onClick={(e) => { e.preventDefault(); void handleChangePassword(e); }}
                className="btn primary btn-press"
                style={{ 
                  width: '100%',
                  marginTop: 'auto',
                  background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-light) 100%)',
                  border: 'none',
                  color: 'white',
                  padding: '14px 24px',
                  fontSize: '1rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(139, 92, 246, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(139, 92, 246, 0.3)';
                }}
                disabled={changingPassword}
              >
                {changingPassword ? 'Alterando...' : 'Alterar Senha'}
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        </div>

        <div className="card" className="fade-up card-hover" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(59, 130, 246, 0.15) 100%)',
            borderRadius: '16px',
            padding: '24px',
            border: '1px solid rgba(139, 92, 246, 0.2)',
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            flex: 1
          }}>
            {/* Decorative elements */}
            <div style={{
              position: 'absolute',
              top: '-50px',
              right: '-50px',
              width: '150px',
              height: '150px',
              background: 'radial-gradient(circle, rgba(139, 92, 246, 0.1) 0%, transparent 70%)',
              borderRadius: '50%'
            }} />
            <div style={{
              position: 'absolute',
              bottom: '-30px',
              left: '-30px',
              width: '100px',
              height: '100px',
              background: 'radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, transparent 70%)',
              borderRadius: '50%'
            }} />
            
            <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.3) 0%, rgba(59, 130, 246, 0.3) 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid rgba(139, 92, 246, 0.3)'
                }}>
                  <Bot size={24} style={{ color: 'var(--color-primary)' }} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Integração com Telegram
                  </h3>
                  <p style={{ 
                    fontSize: '2rem', 
                    fontWeight: 800, 
                    margin: '4px 0 0 0',
                    color: '#8b5cf6',
                    background: 'linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text'
                  }}>
                    Bot
              </p>
            </div>
          </div>

              <div style={{
                background: 'var(--perfil-panel-bg)',
                backdropFilter: 'blur(10px) saturate(180%)',
                WebkitBackdropFilter: 'blur(10px) saturate(180%)',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '20px',
                border: '1px solid var(--perfil-panel-border)'
              }}>
                <p className="card-desc" style={{ 
                  color: 'var(--muted)', 
                  marginBottom: '16px',
                  lineHeight: 1.5,
                  fontSize: '0.875rem'
                }}>
                  Vincule sua conta ao Telegram para receber notificações e gerenciar suas apostas diretamente pelo bot.
                </p>

                <button 
                  type="button"
                  onClick={profile.telegramId ? handleUnlinkTelegram : handleLinkTelegram}
                  className="btn secondary btn-press"
                  style={{ 
                    width: '100%',
                    marginBottom: '16px',
                    background: profile.telegramId 
                      ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(220, 38, 38, 0.2) 100%)'
                      : 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-light) 100%)',
                    border: profile.telegramId 
                      ? '1px solid rgba(239, 68, 68, 0.3)'
                      : 'none',
                    color: profile.telegramId ? 'var(--color-danger)' : 'white',
                    padding: '14px 24px',
                    fontSize: '1rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'all 0.3s ease',
                    boxShadow: profile.telegramId 
                      ? '0 4px 12px rgba(239, 68, 68, 0.2)'
                      : '0 4px 12px rgba(139, 92, 246, 0.3)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = profile.telegramId 
                      ? '0 6px 16px rgba(239, 68, 68, 0.3)'
                      : '0 6px 16px rgba(139, 92, 246, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = profile.telegramId 
                      ? '0 4px 12px rgba(239, 68, 68, 0.2)'
                      : '0 4px 12px rgba(139, 92, 246, 0.3)';
                  }}
                >
                  {profile.telegramId ? (
                    <>
                      <X size={18} />
                      Desvincular Telegram
                    </>
                  ) : (
                    <>
                      <Bot size={18} />
                      Vincular Telegram
                    </>
                  )}
                </button>

                <div className="field" style={{ marginBottom: 0 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem', color: 'var(--muted)', marginBottom: '8px' }}>
                    <Bot size={14} />
                    Telegram ID
                  </label>
                  <input
                    type="text"
                    className="input-focus"
                    value={profile.telegramId ?? 'Não vinculado'}
                    readOnly
                    style={{
                      paddingLeft: '12px'
                    }}
                  />
                </div>
              </div>

            <button 
                type="button"
                onClick={handleOpenSupportBot}
                className="btn secondary btn-press"
                style={{ 
                  width: '100%',
                  marginTop: 'auto',
                  background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                  border: 'none',
                  color: '#ffffff',
                  padding: '14px 24px',
                  fontSize: '1rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 12px rgba(5, 150, 105, 0.3)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(5, 150, 105, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(5, 150, 105, 0.3)';
                }}
              >
                <MessageCircle size={18} />
                Chamar Bot de Suporte
            </button>
            </div>
          </div>
        </div>
      </div>

      {/* Seção: Zona de Perigo - Isolada Inferior */}
      <div className="card fade-up card-hover" style={{ marginBottom: 0 }}>
        <div style={{ 
          background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(220, 38, 38, 0.15) 100%)',
            borderRadius: '16px',
            padding: '24px',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Decorative elements */}
            <div style={{
              position: 'absolute',
              top: '-50px',
              right: '-50px',
              width: '150px',
              height: '150px',
              background: 'radial-gradient(circle, rgba(239, 68, 68, 0.1) 0%, transparent 70%)',
              borderRadius: '50%'
            }} />
            <div style={{
              position: 'absolute',
              bottom: '-30px',
              left: '-30px',
              width: '100px',
              height: '100px',
              background: 'radial-gradient(circle, rgba(220, 38, 38, 0.1) 0%, transparent 70%)',
              borderRadius: '50%'
            }} />
            
            <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.3) 0%, rgba(220, 38, 38, 0.3) 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid rgba(239, 68, 68, 0.3)'
                }}>
                  <AlertTriangle size={24} style={{ color: 'var(--color-danger)' }} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Zona de Perigo
                  </h3>
                  <p style={{ 
                    fontSize: '2rem', 
                    fontWeight: 800, 
                    margin: '4px 0 0 0',
                    color: '#ef4444',
                    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text'
                  }}>
                    Perigo
                  </p>
                </div>
              </div>

              <div style={{
                background: 'var(--perfil-panel-bg)',
                backdropFilter: 'blur(10px) saturate(180%)',
                WebkitBackdropFilter: 'blur(10px) saturate(180%)',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '20px',
                border: '1px solid var(--perfil-panel-border)'
              }}>
                <p className="card-desc" style={{ 
                  color: 'var(--color-danger-darker)', 
                  marginBottom: 0,
                  lineHeight: 1.5,
                  fontSize: '0.875rem'
                }}>
                  Ações irreversíveis que afetarão seus dados permanentemente. Use com extrema cautela.
                </p>
              </div>
            
        <button
                className="btn btn-press"
                style={{ 
                  background: 'linear-gradient(135deg, var(--color-danger) 0%, rgba(220, 38, 38, 1) 100%)',
                  border: 'none',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '14px 24px',
                  fontWeight: 600,
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
                  width: '100%',
                  fontSize: '1rem',
                  marginTop: 'auto'
                }}
          onClick={() => setResetModalOpen(true)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(239, 68, 68, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.3)';
                }}
              >
                <Trash2 size={18} />
          Resetar Todos os Dados
        </button>
      </div>
          </div>
        </div>

      <Modal
        isOpen={resetModalOpen}
        onClose={() => {
          if (!resetting) {
            setResetModalOpen(false);
            setResetError('');
          }
        }}
        title="Confirmar Reset da Conta"
      >
        <div style={{ padding: '8px 0' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '20px',
            padding: '16px',
            background: 'rgba(239, 68, 68, 0.1)',
            borderRadius: '12px',
            border: '1px solid rgba(239, 68, 68, 0.3)'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'rgba(239, 68, 68, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(239, 68, 68, 0.3)'
            }}>
              <AlertTriangle size={24} style={{ color: 'var(--color-danger)' }} />
            </div>
            <div>
              <p style={{ margin: 0, fontWeight: 700, color: 'var(--color-danger)', fontSize: '1rem' }}>
                ATENÇÃO: Ação Irreversível
              </p>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.875rem', color: 'var(--color-danger-darker)' }}>
                Esta ação não pode ser desfeita
              </p>
            </div>
          </div>
          
          <p style={{ marginBottom: 16, lineHeight: 1.6, fontSize: '0.875rem' }}>
            Esta ação irá deletar <strong>permanentemente</strong>:
          </p>
          
          <div style={{ 
            marginBottom: 24, 
            background: 'var(--perfil-panel-bg)',
            backdropFilter: 'blur(10px) saturate(180%)',
            WebkitBackdropFilter: 'blur(10px) saturate(180%)',
            borderRadius: '12px',
            padding: '16px',
            border: '1px solid var(--perfil-panel-border)'
          }}>
            <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 2 }}>
              <li style={{ fontSize: '0.875rem' }}>Todas as suas <strong>bancas</strong></li>
              <li style={{ fontSize: '0.875rem' }}>Todas as suas <strong>apostas</strong></li>
              <li style={{ fontSize: '0.875rem' }}>Todas as suas <strong>transações financeiras</strong></li>
          </ul>
          </div>
          
          <p style={{ 
            marginBottom: 24, 
            color: 'var(--color-danger)', 
            fontWeight: 600,
            fontSize: '0.875rem',
            textAlign: 'center',
            padding: '12px',
            background: 'rgba(239, 68, 68, 0.1)',
            borderRadius: '8px',
            border: '1px solid rgba(239, 68, 68, 0.2)'
          }}>
            Tem certeza que deseja continuar?
          </p>
          
          {resetError && (
            <div style={{ 
              marginBottom: 16, 
              padding: 12, 
              background: 'rgba(239, 68, 68, 0.1)', 
              border: '1px solid rgba(239, 68, 68, 0.3)', 
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <AlertTriangle size={16} style={{ color: 'var(--color-danger)' }} />
              <p style={{ color: 'var(--color-danger)', margin: 0, fontSize: '0.875rem' }}>{resetError}</p>
            </div>
          )}
          
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="btn ghost"
              onClick={() => {
                setResetModalOpen(false);
                setResetError('');
              }}
              disabled={resetting}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <X size={18} />
              Cancelar
            </button>
            <button
              type="button"
              className="btn"
              style={{ 
                background: 'linear-gradient(135deg, var(--color-danger) 0%, rgba(220, 38, 38, 1) 100%)',
                border: 'none',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onClick={handleResetAccount}
              disabled={resetting}
            >
              <Trash2 size={18} />
              {resetting ? 'Resetando...' : 'Sim, Resetar Tudo'}
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
