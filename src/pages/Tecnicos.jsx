import React, { useState } from 'react';
import { useApp } from '../AppContext';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import SheetsService from '../services/SheetsService';

export default function Tecnicos() {
  const { dados, carregarDados } = useApp();
  const { tecnicos } = dados;
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ nome: '', placa: '', status: '' });
  const [loading, setLoading] = useState(false);

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const salvar = async () => {
    if (!form.nome || !form.placa || !form.status) {
      alert('Preencha todos os campos');
      return;
    }
    setLoading(true);
    try {
      const res = await SheetsService.salvarMovimentacao({
        acao: 'salvarTecnico',
        nome: form.nome,
        placa: form.placa,
        status: form.status,
      });
      if (!res.success) throw new Error(res.error);
      alert('Técnico cadastrado com sucesso!');
      setShowModal(false);
      setForm({ nome: '', placa: '', status: '' });
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
            <button className="btn-primary" onClick={() => setShowModal(true)}>
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
                </tr>
              </thead>
              <tbody>
                {tecnicos.map((t, i) => (
                  <tr key={i}>
                    <td>{t.ID || i + 1}</td>
                    <td>{t['NOME COMPLETO'] || t.NOME || '—'}</td>
                    <td>{t.PLACA || '—'}</td>
                    <td>
                      <span className={`badge ${t.STATUS === 'ATIVO' ? 'success' : 'danger'}`}>
                        {t.STATUS || '—'}
                      </span>
                    </td>
                  </tr>
                ))}
                {tecnicos.length === 0 && (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-light)' }}>
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
          title="Novo Técnico"
          onClose={() => setShowModal(false)}
          footer={
            <>
              <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
              <button className="btn-primary" onClick={salvar} disabled={loading}>
                {loading ? 'Salvando...' : 'Salvar Técnico'}
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
    </>
  );
}
