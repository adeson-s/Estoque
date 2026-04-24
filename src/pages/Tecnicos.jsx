import React, { useState } from 'react';
import { useApp } from '../AppContext';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import SheetsService from '../services/SheetsService';
import DetalheTecnico from '../components/DetalheTecnico';

export default function Tecnicos() {
const { dados } = useApp();
const { tecnicos, movimentacoes } = dados;

  const [showModal, setShowModal] = useState(false);
  const [modoEdicao, setModoEdicao] = useState(false);
  const [tecnicoEditando, setTecnicoEditando] = useState(null);
  const [form, setForm] = useState({ nome: '', placa: '', status: '' });
  const [loading, setLoading] = useState(false);

const getHistoricoTecnico = (tecnico) => {
  return movimentacoes.filter(m => {
    return (
      m.ID_TECNICO == tecnico.TÉCNICO || 
      m.NOME == tecnico['NOME COMPLETO'] // fallback (caso não tenha ID)
    );
  });
};

  // ── Detalhe do técnico ──
  const [tecnicoDetalhe, setTecnicoDetalhe] = useState(null);

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const abrirModalNovo = () => {
    setModoEdicao(false);
    setTecnicoEditando(null);
    setForm({ nome: '', placa: '', status: '' });
    setShowModal(true);
  };

  const abrirModalEdicao = (tecnico) => {
    setModoEdicao(true);
    setTecnicoEditando(tecnico);
    setForm({
      nome: tecnico['NOME COMPLETO'] || tecnico.TÉCNICO || '',
      placa: tecnico.PLACA || '',
      status: tecnico.STATUS || '',
    });
    setShowModal(true);
  };

  const fecharModal = () => {
    setShowModal(false);
    setModoEdicao(false);
    setTecnicoEditando(null);
    setForm({ nome: '', placa: '', status: '' });
  };

  const salvar = async () => {
    if (!form.nome || !form.placa || !form.status) {
      alert('Preencha todos os campos');
      return;
    }
    setLoading(true);
    try {
      const payload = modoEdicao
        ? {
            acao: 'editarTecnico',
            id: tecnicoEditando.ID,
            nome: form.nome,
            placa: form.placa,
            status: form.status,
          }
        : {
            acao: 'salvarTecnico',
            nome: form.nome,
            placa: form.placa,
            status: form.status,
          };

      const res = await SheetsService.salvarMovimentacao(payload);
      if (!res.success) throw new Error(res.error);

      alert(modoEdicao ? 'Técnico atualizado com sucesso!' : 'Técnico cadastrado com sucesso!');
      fecharModal();
      await carregarDados();
    } catch (err) {
      alert('Erro ao salvar técnico: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageHeader title="Técnicos" subtitle="Equipe em campo" />
      <div className="page-content">
        <div className="table-card">
          <div className="table-header">
            <h3>Técnicos Cadastrados</h3>
            <button className="btn-primary" onClick={abrirModalNovo}>
              <i className="fas fa-plus"></i> Novo Técnico
            </button>
          </div>
          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nome</th>
                  <th>Placa</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {tecnicos.map((t, i) => (
                  <tr
                    key={i}
                    style={{ cursor: 'pointer' }}
                    onClick={() => setTecnicoDetalhe({
  ...t,
  historico: getHistoricoTecnico(t)
})}
                  >
                    <td>{t.ID || i + 1}</td>
                    <td>{t['NOME COMPLETO'] || t.NOME || '—'}</td>
                    <td>{t.PLACA || '—'}</td>
                    <td>
                      <span className={`badge ${t.STATUS === 'ATIVO' ? 'success' : 'danger'}`}>
                        {t.STATUS || '—'}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn-icon"
                        title="Editar técnico"
                        onClick={e => { e.stopPropagation(); abrirModalEdicao(t); }}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: 'var(--primary, #3b82f6)',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '14px',
                          transition: 'opacity 0.2s',
                        }}
                        onMouseOver={e => (e.currentTarget.style.opacity = '0.7')}
                        onMouseOut={e => (e.currentTarget.style.opacity = '1')}
                      >
                        <i className="fas fa-edit"></i>
                      </button>
                    </td>
                  </tr>
                ))}
                {tecnicos.length === 0 && (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-light)' }}>
                      Nenhum técnico cadastrado
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showModal && (
        <Modal
          title={modoEdicao ? 'Editar Técnico' : 'Novo Técnico'}
          onClose={fecharModal}
          footer={
            <>
              <button className="btn-secondary" onClick={fecharModal}>Cancelar</button>
              <button className="btn-primary" onClick={salvar} disabled={loading}>
                {loading ? 'Salvando...' : modoEdicao ? 'Salvar Alterações' : 'Salvar Técnico'}
              </button>
            </>
          }
        >
          <div className="form-group">
            <label>Nome Completo *</label>
            <input type="text" name="nome" value={form.nome} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>Placa *</label>
            <input type="text" name="placa" value={form.placa} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>Status *</label>
            <select name="status" value={form.status} onChange={handleChange}>
              <option value="">Selecione...</option>
              <option value="ATIVO">Ativo</option>
              <option value="INATIVO">Inativo</option>
            </select>
          </div>
        </Modal>
      )}

      {/* ─── DETALHE DO TÉCNICO (drawer lateral) ─── */}
      {tecnicoDetalhe && (
        <DetalheTecnico
          tecnico={tecnicoDetalhe}
          onClose={() => setTecnicoDetalhe(null)}
        />
      )}
    </>
  );
}