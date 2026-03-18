import React, { useState, useEffect } from 'react';
import { useApp } from '../AppContext';
import PageHeader from '../components/PageHeader';
import SheetsService from '../services/SheetsService';

const statusOptions = ['NÃO ASSOCIOU', 'TROCA', 'SOBRA', 'PERDIDO'];

export default function NovaSaida() {
  const { dados, carregarDados } = useApp();
  const { tecnicos, produtos } = dados;

  const today = new Date().toISOString().split('T')[0];

  const [form, setForm] = useState({
    data: today, tecnico: '', placa: '', produto: '', quantidade: '', status: '', obs: ''
  });
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null); // { tipo, msg }

  const tecnicosAtivos = tecnicos.filter(t => t.STATUS === 'ATIVO');

  // Auto-preencher placa quando técnico muda
  useEffect(() => {
    const tec = tecnicos.find(t => (t['NOME COMPLETO'] || t.NOME) === form.tecnico);
    if (tec) setForm(f => ({ ...f, placa: tec.PLACA || '' }));
  }, [form.tecnico, tecnicos]);

  const handleChange = (e) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  };

  const limpar = () => {
    setForm({ data: today, tecnico: '', placa: '', produto: '', quantidade: '', status: '', obs: '' });
    setFeedback(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.data || !form.tecnico || !form.produto || !form.quantidade || !form.status) {
      setFeedback({ tipo: 'error', msg: 'Preencha todos os campos obrigatórios' });
      return;
    }

    setLoading(true);
    setFeedback(null);

    try {
      const dados = {
        acao: 'registrarSaida',
        data: form.data,
        tecnico: form.tecnico,
        placa: form.placa,
        produto: form.produto,
        quantidade: form.quantidade,
        status: form.status,
        observacoes: form.obs,
      };
      const resultado = await SheetsService.salvarMovimentacao(dados);
      if (!resultado.success) throw new Error(resultado.error || 'Falha ao salvar');
      setFeedback({ tipo: 'success', msg: 'Saída registrada com sucesso!' });
      limpar();
      await carregarDados();
    } catch (err) {
      setFeedback({ tipo: 'error', msg: 'Erro ao salvar: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageHeader title="Nova Saída" subtitle="Registrar saída de materiais" />
      <div className="page-content">
        <div className="form-card">
          <h3><i className="fas fa-plus-circle"></i> Registrar Nova Saída</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>Data *</label>
                <input type="date" name="data" value={form.data} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label>Técnico *</label>
                <select name="tecnico" value={form.tecnico} onChange={handleChange} required>
                  <option value="">Selecione...</option>
                  {tecnicosAtivos.map((t, i) => (
                    <option key={i} value={t['NOME COMPLETO'] || t.NOME}>
                      {t['NOME COMPLETO'] || t.NOME}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Placa *</label>
                <input type="text" name="placa" value={form.placa} onChange={handleChange} placeholder="ABC1234" required />
              </div>
              <div className="form-group">
                <label>Produto *</label>
                <select name="produto" value={form.produto} onChange={handleChange} required>
                  <option value="">Selecione...</option>
                  {produtos.map((p, i) => (
                    <option key={i} value={p.PRODUTO}>{p.PRODUTO}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Quantidade *</label>
                <input type="number" name="quantidade" value={form.quantidade} onChange={handleChange} min="1" required />
              </div>
              <div className="form-group">
                <label>Status *</label>
                <select name="status" value={form.status} onChange={handleChange} required>
                  <option value="">Selecione...</option>
                  {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>Observações</label>
              <textarea name="obs" value={form.obs} onChange={handleChange} rows="3" placeholder="Detalhes adicionais..." />
            </div>
            <div className="form-actions">
              <button type="button" className="btn-secondary" onClick={limpar}>
                <i className="fas fa-eraser"></i> Limpar
              </button>
              <button type="submit" className="btn-primary" disabled={loading}>
                <i className="fas fa-save"></i> {loading ? 'Salvando...' : 'Registrar Saída'}
              </button>
            </div>
          </form>
          {feedback && (
            <div className={`feedback ${feedback.tipo}`} style={{ marginTop: 16 }}>
              {feedback.msg}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
