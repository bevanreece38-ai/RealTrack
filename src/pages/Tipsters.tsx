import { Plus, Pencil, Trash2, X, Check } from 'lucide-react';
import { useCallback, useState } from 'react';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import api from '../lib/api';
import { useTipsters } from '../hooks/useTipsters';
import { type ApiTipster, type ApiError } from '../types/api';

export default function Tipsters() {
  const { tipsters, loading, invalidateCache } = useTipsters();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTipster, setEditingTipster] = useState<ApiTipster | null>(null);
  const [formData, setFormData] = useState({ nome: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleOpenModal = useCallback((tipster?: ApiTipster) => {
    console.log('handleOpenModal chamado', tipster);
    if (tipster) {
      setEditingTipster(tipster);
      setFormData({ nome: tipster.nome });
    } else {
      setEditingTipster(null);
      setFormData({ nome: '' });
    }
    setError('');
    setModalOpen(true);
  }, []);

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingTipster(null);
    setFormData({ nome: '' });
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      if (editingTipster) {
        await api.put(`/tipsters/${editingTipster.id}`, { nome: formData.nome.trim() });
      } else {
        await api.post('/tipsters', { nome: formData.nome.trim() });
      }
      invalidateCache();
      handleCloseModal();
    } catch (err) {
      const apiError = err as ApiError;
      const errorMessage = apiError.response?.data?.error;
      setError(typeof errorMessage === 'string' ? errorMessage : 'Erro ao salvar tipster');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (tipster: ApiTipster) => {
    try {
      await api.put(`/tipsters/${tipster.id}`, { ativo: !tipster.ativo });
      invalidateCache();
    } catch (err) {
      const apiError = err as ApiError;
      const errorMessage = apiError.response?.data?.error;
      alert(typeof errorMessage === 'string' ? errorMessage : 'Erro ao atualizar tipster');
    }
  };

  const handleDelete = async (tipster: ApiTipster) => {
    if (!window.confirm(`Tem certeza que deseja deletar o tipster "${tipster.nome}"?`)) {
      return;
    }

    try {
      await api.delete(`/tipsters/${tipster.id}`);
      invalidateCache();
    } catch (err) {
      const apiError = err as ApiError;
      const errorMessage = apiError.response?.data?.error;
      alert(typeof errorMessage === 'string' ? errorMessage : 'Erro ao deletar tipster');
    }
  };

  return (
    <div>
      <PageHeader
        title="Tipsters"
        subtitle="Gerencie seus tipsters favoritos"
      />

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)' }}>
          Carregando...
        </div>
      ) : tipsters.length === 0 ? (
        <div style={{ 
          padding: '60px 20px', 
          textAlign: 'center',
          background: 'var(--surface)',
          borderRadius: 'var(--card-radius)',
          border: '1px solid var(--border)'
        }}>
          <p style={{ color: 'var(--muted)', marginBottom: '20px' }}>
            Nenhum tipster cadastrado ainda.
          </p>
          <button 
            className="btn" 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('Botão clicado');
              handleOpenModal();
            }} 
            type="button"
          >
            <Plus size={16} /> Adicionar Primeiro Tipster
          </button>
        </div>
      ) : (
        <div style={{ marginTop: '24px' }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '16px'
          }}>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: 'var(--text)' }}>
              Meus Tipsters ({tipsters.length})
            </h2>
            <button 
              className="btn" 
              onClick={() => handleOpenModal()} 
              type="button"
            >
              <Plus size={16} /> Adicionar Tipster
            </button>
          </div>
          <div className="tipsters-list">
            {tipsters.map((tipster) => (
            <div
              key={tipster.id}
              className="card tipster-card"
            >
              <div style={{ flex: 1 }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--text)' }}>
                    {tipster.nome}
                  </h3>
                  <button
                    type="button"
                    onClick={() => handleToggleActive(tipster)}
                    style={{
                      border: 'none',
                      background: tipster.ativo ? 'var(--bank-color, #10b981)' : 'var(--border)',
                      color: tipster.ativo ? 'white' : 'var(--muted)',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      if (tipster.ativo) {
                        e.currentTarget.style.background = 'var(--bank-color-dark, #0d9668)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (tipster.ativo) {
                        e.currentTarget.style.background = 'var(--bank-color, #10b981)';
                      }
                    }}
                  >
                    {tipster.ativo ? <Check size={12} /> : <X size={12} />}
                    {tipster.ativo ? 'Ativo' : 'Inativo'}
                  </button>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => handleOpenModal(tipster)}
                  style={{ padding: '8px' }}
                  title="Editar tipster"
                >
                  <Pencil size={16} />
                </button>
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => handleDelete(tipster)}
                  style={{
                    padding: '8px',
                    color: '#ef4444'
                  }}
                  title="Deletar tipster"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
          </div>
        </div>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={handleCloseModal}
        title={editingTipster ? 'Editar Tipster' : 'Adicionar Tipster'}
      >
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Nome do Tipster *</label>
            <input
              type="text"
              value={formData.nome}
              onChange={(e) => setFormData({ nome: e.target.value })}
              placeholder="Ex: Tipster A, João Silva, etc."
              required
              autoFocus
            />
          </div>

          {error && (
            <div style={{
              padding: '12px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid #ef4444',
              borderRadius: '8px',
              color: '#ef4444',
              fontSize: '0.875rem',
              marginBottom: '16px'
            }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
            <button
              type="button"
              className="btn ghost"
              onClick={handleCloseModal}
              disabled={saving}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn"
              disabled={saving || !formData.nome.trim()}
            >
              {saving ? 'Salvando...' : editingTipster ? 'Salvar Alterações' : 'Adicionar'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

