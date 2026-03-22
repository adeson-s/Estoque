import React, { useState, useRef } from 'react';
import { useApp } from '../AppContext';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import SheetsService from '../services/SheetsService';
import { QRCodeCanvas } from 'qrcode.react';

const unidades = ['PACOTE', 'UN', 'MT', 'KG', 'LT'];

function statusEstoque(atual, minimo) {
  if (atual <= minimo)     return { cls: 'danger',  text: 'CRÍTICO' };
  if (atual <= minimo * 2) return { cls: 'warning', text: 'ALERTA' };
  return                          { cls: 'success', text: 'OK' };
}

export default function Produtos() {
  const { dados, carregarDados } = useApp();
  const { produtos } = dados;

  // ── Modal novo produto ──
  const [showModal, setShowModal]         = useState(false);
  const [busca, setBusca]                 = useState('');
  const [filtroStatus, setFiltroStatus]   = useState('TODOS');
  const [filtroUnidade, setFiltroUnidade] = useState('TODOS');
  const [activeStep, setActiveStep]       = useState(1);
  const [form, setForm] = useState({
    nome: '', unidade: '', estoque: '', minimo: '', codigoBarra: ''
  });
  const [loading, setLoading]   = useState(false);
  const [feedback, setFeedback] = useState(null);

  // ── Modal edição ──
  const [showEditModal, setShowEditModal]     = useState(false);
  const [produtoEditando, setProdutoEditando] = useState(null);
  const [formEdit, setFormEdit] = useState({
    nome: '', unidade: '', estoque: '', minimo: '', codigoBarra: ''
  });
  const [loadingEdit, setLoadingEdit]   = useState(false);
  const [feedbackEdit, setFeedbackEdit] = useState(null);

  const qrPrintRefs = useRef({});

  // ── Handlers novo produto ──
  const handleChange = e =>
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const resetModal = () => {
    setShowModal(false);
    setForm({ nome: '', unidade: '', estoque: '', minimo: '', codigoBarra: '' });
    setFeedback(null);
    setActiveStep(1);
  };

  const stepValid = (step) => {
    if (step === 1) return form.nome.trim() !== '' && form.unidade !== '';
    if (step === 2) return form.estoque !== '' && form.minimo !== '';
    return true;
  };

  const salvar = async () => {
    if (!form.nome || !form.unidade || form.estoque === '' || form.minimo === '') {
      setFeedback('Preencha todos os campos obrigatórios');
      return;
    }
    setLoading(true);
    setFeedback(null);
    try {
      const qrCode = `PROD-${Date.now().toString(36).toUpperCase()}`;
      const res = await SheetsService.salvarProduto({
        acao: 'salvarProduto',
        codigo: form.codigoBarra || '',
        nome: form.nome,
        unidade: form.unidade,
        estoque: form.estoque,
        minimo: form.minimo,
        QR_CODE: qrCode
      });
      if (!res.success) throw new Error(res.error || 'Erro ao salvar');
      resetModal();
      await carregarDados();
    } catch (err) {
      setFeedback('Erro: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Handlers edição ──
  const abrirEdicao = (produto) => {
    setProdutoEditando(produto);
    setFormEdit({
      nome:        produto.PRODUTO           || '',
      unidade:     produto.UNIDADE           || '',
      estoque:     produto['ESTOQUE ATUAL']  || '',
      minimo:      produto['ESTOQUE MÍNIMO'] || '',
      codigoBarra: produto['CÓDIGO']         || '',
    });
    setFeedbackEdit(null);
    setShowEditModal(true);
  };

  const fecharEdicao = () => {
    setShowEditModal(false);
    setProdutoEditando(null);
    setFeedbackEdit(null);
  };

  const salvarEdicao = async () => {
    if (!formEdit.nome.trim() || !formEdit.unidade) {
      setFeedbackEdit('Preencha nome e unidade obrigatórios');
      return;
    }
    setLoadingEdit(true);
    setFeedbackEdit(null);
    try {
      const res = await SheetsService.salvarProduto({
        acao:    'editarProduto',
        qrCode:  produtoEditando.QR_CODE,
        codigo:  formEdit.codigoBarra || '',
        nome:    formEdit.nome,
        unidade: formEdit.unidade,
        estoque: formEdit.estoque,
        minimo:  formEdit.minimo,
      });
      if (!res.success) throw new Error(res.error || 'Erro ao salvar');
      fecharEdicao();
      await carregarDados();
    } catch (err) {
      setFeedbackEdit('Erro: ' + err.message);
    } finally {
      setLoadingEdit(false);
    }
  };

  // ── Impressão QR ──
  const imprimirQR = (produto) => {
    const canvas = qrPrintRefs.current[produto.QR_CODE];
    if (!canvas) { alert('QR Code não encontrado na tela'); return; }
    const dataUrl = canvas.toDataURL('image/png');
    const janela  = window.open('', '_blank');
    janela.document.write(`
      <!DOCTYPE html><html><head><meta charset="utf-8"/><title>QR Code</title>
      <style>
        body { font-family: Arial; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
        .card { border: 2px solid #000; padding: 16px; border-radius: 10px; text-align: center; width: 220px; }
        img { width: 150px; image-rendering: pixelated; }
        .title { font-size: 13px; font-weight: bold; margin-bottom: 6px; }
        .code  { font-size: 10px; color: #555; margin-bottom: 10px; }
      </style></head><body>
      <div class="card">
        <div class="title">${produto.PRODUTO}</div>
        <div class="code">${produto.QR_CODE}</div>
        <img src="${dataUrl}" />
      </div>
      <script>
        document.querySelector('img').onload = () => { setTimeout(() => { window.print(); window.close(); }, 300); };
      </script></body></html>
    `);
    janela.document.close();
  };

  // ── Filtros ──
  const listaFiltrada = produtos.filter(p => {
    const texto = busca.toLowerCase();
    const matchBusca =
      (p.PRODUTO  || '').toLowerCase().includes(texto) ||
      (p.QR_CODE  || '').toLowerCase().includes(texto) ||
      (p['CÓDIGO'] || '').toLowerCase().includes(texto);
    const atual   = parseInt(p['ESTOQUE ATUAL'])  || 0;
    const minimo  = parseInt(p['ESTOQUE MÍNIMO']) || 0;
    const st      = statusEstoque(atual, minimo);
    const matchStatus  = filtroStatus  === 'TODOS' || st.text === filtroStatus;
    const matchUnidade = filtroUnidade === 'TODOS' || (p.UNIDADE || '') === filtroUnidade;
    return matchBusca && matchStatus && matchUnidade;
  });

  const contadores = {
    TODOS:   produtos.length,
    OK:      produtos.filter(p => statusEstoque(parseInt(p['ESTOQUE ATUAL'])||0, parseInt(p['ESTOQUE MÍNIMO'])||0).text === 'OK').length,
    ALERTA:  produtos.filter(p => statusEstoque(parseInt(p['ESTOQUE ATUAL'])||0, parseInt(p['ESTOQUE MÍNIMO'])||0).text === 'ALERTA').length,
    CRÍTICO: produtos.filter(p => statusEstoque(parseInt(p['ESTOQUE ATUAL'])||0, parseInt(p['ESTOQUE MÍNIMO'])||0).text === 'CRÍTICO').length,
  };

  return (
    <>
      <style>{`

      .table-responsive {
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}
  @media (max-width: 600px) {
  table th,
  table td {
    font-size: 12px;
    padding: 8px;
  }

  .action-btn {
    padding: 5px 8px;
    font-size: 11px;
  }
}
        /* ─── Barra de pesquisa e filtros ─── */
        .search-bar-wrapper { display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px; }
        .search-input-group { position: relative; flex: 1; }
        .search-input-group svg.search-icon {
          position: absolute; left: 14px; top: 50%; transform: translateY(-50%);
          color: #94a3b8; pointer-events: none; width: 18px; height: 18px;
        }
        .search-input-group input {
          width: 100%; padding: 11px 16px 11px 42px;
          border: 1.5px solid #e2e8f0; border-radius: 10px;
          font-size: 14px; background: #f8fafc;
          transition: border-color .2s, box-shadow .2s; outline: none;
        }
        .search-input-group input:focus {
          border-color: var(--primary, #2563eb); background: #fff;
          box-shadow: 0 0 0 3px rgba(37,99,235,.1);
        }
        .search-input-group .clear-btn {
          position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
          background: none; border: none; cursor: pointer; color: #94a3b8;
          display: flex; align-items: center; padding: 2px; border-radius: 4px;
        }
        .search-input-group .clear-btn:hover { color: #ef4444; }

        .filter-row { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
        .filter-label { font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: .05em; margin-right: 4px; }
        .filter-chip {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 5px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;
          cursor: pointer; border: 1.5px solid transparent; transition: all .15s;
          background: #f1f5f9; color: #475569;
        }
        .filter-chip:hover { background: #e2e8f0; }
        .filter-chip.active-all    { background: #1e293b; color: #fff; border-color: #1e293b; }
        .filter-chip.active-ok     { background: #dcfce7; color: #166534; border-color: #16a34a; }
        .filter-chip.active-warn   { background: #fef9c3; color: #854d0e; border-color: #ca8a04; }
        .filter-chip.active-danger { background: #fee2e2; color: #991b1b; border-color: #dc2626; }
        .filter-chip .chip-count   { background: rgba(0,0,0,.12); border-radius: 10px; padding: 1px 6px; font-size: 10px; }
        .filter-divider { width: 1px; height: 24px; background: #e2e8f0; margin: 0 4px; }
        .filter-select {
          padding: 5px 10px; border-radius: 8px; border: 1.5px solid #e2e8f0;
          font-size: 12px; font-weight: 600; color: #475569;
          background: #f1f5f9; cursor: pointer; outline: none;
        }
        .filter-select:focus { border-color: var(--primary, #2563eb); }

        .results-count { font-size: 13px; color: #94a3b8; margin-bottom: 8px; }

        /* ─── Modal Steps ─── */
        .modal-steps { display: flex; align-items: center; gap: 0; margin-bottom: 28px; }
        .step-item { display: flex; flex-direction: column; align-items: center; gap: 4px; flex: 1; position: relative; }
        .step-item:not(:last-child)::after {
          content: ''; position: absolute; top: 14px;
          left: calc(50% + 14px); right: calc(-50% + 14px);
          height: 2px; background: #e2e8f0; z-index: 0;
        }
        .step-item.done:not(:last-child)::after,
        .step-item.active:not(:last-child)::after { background: var(--primary, #2563eb); }
        .step-circle {
          width: 28px; height: 28px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 12px; font-weight: 700; border: 2px solid #e2e8f0;
          background: #fff; color: #94a3b8; position: relative; z-index: 1; transition: all .2s;
        }
        .step-item.active .step-circle { border-color: var(--primary, #2563eb); background: var(--primary, #2563eb); color: #fff; }
        .step-item.done  .step-circle  { border-color: #16a34a; background: #16a34a; color: #fff; }
        .step-label { font-size: 11px; font-weight: 600; color: #94a3b8; text-align: center; white-space: nowrap; }
        .step-item.active .step-label { color: var(--primary, #2563eb); }
        .step-item.done  .step-label  { color: #16a34a; }

        /* ─── Form ─── */
        .form-section-title {
          font-size: 13px; font-weight: 700; color: #64748b;
          text-transform: uppercase; letter-spacing: .06em;
          margin-bottom: 16px; padding-bottom: 8px; border-bottom: 1px solid #f1f5f9;
        }
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .form-group label {
          font-size: 12px; font-weight: 600; color: #374151;
          display: block; margin-bottom: 6px; text-transform: uppercase; letter-spacing: .04em;
        }
        .form-group input,
        .form-group select {
          width: 100%; padding: 10px 12px; border: 1.5px solid #e2e8f0;
          border-radius: 8px; font-size: 14px; background: #f8fafc;
          transition: border-color .2s, box-shadow .2s; outline: none; color: #1e293b;
        }
        .form-group input:focus,
        .form-group select:focus {
          border-color: var(--primary, #2563eb); background: #fff;
          box-shadow: 0 0 0 3px rgba(37,99,235,.1);
        }
        .required-mark { color: #ef4444; margin-left: 2px; }

        /* ─── QR Preview ─── */
        .qr-preview-box {
          background: linear-gradient(135deg, #f8fafc 0%, #f0f4ff 100%);
          border: 1.5px dashed #cbd5e1; border-radius: 12px;
          padding: 20px; text-align: center; margin-top: 16px;
        }
        .qr-preview-box p { font-size: 12px; color: #64748b; margin-top: 10px; font-weight: 500; }
        .qr-preview-box .qr-label { font-size: 11px; color: #94a3b8; margin-top: 4px; font-family: monospace; }

        /* ─── Modal nav ─── */
        .modal-nav {
          display: flex; justify-content: space-between; align-items: center;
          margin-top: 24px; padding-top: 16px; border-top: 1px solid #f1f5f9;
        }
        .btn-step {
          padding: 9px 20px; border-radius: 8px; font-size: 13px; font-weight: 600;
          cursor: pointer; border: 1.5px solid #e2e8f0; background: #f8fafc;
          color: #475569; transition: all .15s;
        }
        .btn-step:hover { background: #e2e8f0; }
        .btn-step.primary { background: var(--primary, #2563eb); border-color: var(--primary, #2563eb); color: #fff; }
        .btn-step.primary:hover { opacity: .9; }
        .btn-step.success { background: #16a34a; border-color: #16a34a; color: #fff; }
        .btn-step.success:hover { opacity: .9; }
        .btn-step:disabled { opacity: .5; cursor: not-allowed; }

        .feedback.error {
          background: #fee2e2; color: #991b1b; padding: 10px 14px;
          border-radius: 8px; font-size: 13px; margin-bottom: 14px; border: 1px solid #fca5a5;
        }

        /* ─── Stock bar ─── */
        .stock-bar { display: flex; align-items: center; gap: 8px; }
        .stock-bar-track { flex: 1; height: 6px; background: #f1f5f9; border-radius: 3px; overflow: hidden; min-width: 60px; }
        .stock-bar-fill  { height: 100%; border-radius: 3px; transition: width .3s; }

        /* ─── Ações ─── */
        .action-btn {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 6px 12px; border-radius: 7px;
          border: 1.5px solid #e2e8f0; background: #f8fafc;
          font-size: 12px; font-weight: 600; cursor: pointer;
          color: #475569; transition: all .15s; white-space: nowrap;
        }
        .action-btn:hover.print-btn  { background: #1e293b; color: #fff; border-color: #1e293b; }
        .action-btn:hover.edit-btn   { background: #2563eb; color: #fff; border-color: #2563eb; }

        /* ─── Mobile ─── */
         
          .step-label  { display: none; }
          .modal-steps { margin-bottom: 18px; }
          .form-row    { grid-template-columns: 1fr !important; }
          .confirmation-flex { flex-direction: column !important; }
          .qr-preview-box    { width: 100% !important; }
          .modal-nav {
            flex-direction: column-reverse;
            gap: 8px;
          }
          .btn-step {
            width: 100%;
            text-align: center;
            justify-content: center;
          }
        }
      `}</style>

      <PageHeader title="Produtos" subtitle="Gestão de estoque" />

      <div className="page-content">

        {/* ─── BUSCA + FILTROS ─── */}
        <div className="search-bar-wrapper">
          <div style={{ display: 'flex', gap: 10 }}>
            <div className="search-input-group" style={{ flex: 1 }}>
              <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                type="text"
                placeholder="Buscar por nome, código ou QR..."
                value={busca}
                onChange={e => setBusca(e.target.value)}
              />
              {busca && (
                <button className="clear-btn" onClick={() => setBusca('')}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              )}
            </div>
          </div>

          <div className="filter-row">
            <span className="filter-label">Status:</span>
            {[
              { key: 'TODOS',   label: 'Todos',   cls: 'active-all'    },
              { key: 'OK',      label: 'OK',      cls: 'active-ok'     },
              { key: 'ALERTA',  label: 'Alerta',  cls: 'active-warn'   },
              { key: 'CRÍTICO', label: 'Crítico', cls: 'active-danger' },
            ].map(({ key, label, cls }) => (
              <button
                key={key}
                className={`filter-chip ${filtroStatus === key ? cls : ''}`}
                onClick={() => setFiltroStatus(key)}
              >
                {label}
                <span className="chip-count">{contadores[key] ?? 0}</span>
              </button>
            ))}

            <div className="filter-divider" />

            <span className="filter-label">Unidade:</span>
            <select
              className="filter-select"
              value={filtroUnidade}
              onChange={e => setFiltroUnidade(e.target.value)}
            >
              <option value="TODOS">Todas</option>
              {unidades.map(u => <option key={u}>{u}</option>)}
            </select>
          </div>
        </div>

        {/* ─── TABELA ─── */}
        <div className="table-card">
          <div className="table-header">
            <div>
              <h3>Produtos</h3>
              <p className="results-count">
                {listaFiltrada.length} produto{listaFiltrada.length !== 1 ? 's' : ''} encontrado{listaFiltrada.length !== 1 ? 's' : ''}
              </p>
            </div>
            <button className="btn-primary" onClick={() => setShowModal(true)}>
              + Novo Produto
            </button>
          </div>

          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Produto</th>
                  <th>Unidade</th>
                  <th>Estoque</th>
                  <th>Mínimo</th>
                  <th>Status</th>
                  <th>QR Code</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {listaFiltrada.map((p, i) => {
                  const atual   = parseInt(p['ESTOQUE ATUAL'])  || 0;
                  const minimo  = parseInt(p['ESTOQUE MÍNIMO']) || 0;
                  const st      = statusEstoque(atual, minimo);
                  const pct     = minimo > 0 ? Math.min((atual / (minimo * 3)) * 100, 100) : 100;
                  const barColor = st.cls === 'danger' ? '#ef4444' : st.cls === 'warning' ? '#f59e0b' : '#22c55e';

                  return (
                    <tr key={i}>
                      <td style={{ fontFamily: 'monospace', fontSize: 12, color: '#94a3b8' }}>
                        {p['CÓDIGO'] || `#${String(i + 1).padStart(3, '0')}`}
                      </td>
                      <td style={{ fontWeight: 600, color: '#1e293b' }}>{p.PRODUTO}</td>
                      <td>
                        <span style={{
                          background: '#f1f5f9', borderRadius: 6, padding: '2px 8px',
                          fontSize: 11, fontWeight: 700, color: '#475569', letterSpacing: '.04em'
                        }}>
                          {p.UNIDADE || '—'}
                        </span>
                      </td>
                      <td>
                        <div className="stock-bar">
                          <span style={{
                            fontWeight: 700, minWidth: 28, textAlign: 'right',
                            color: st.cls === 'danger' ? '#ef4444' : st.cls === 'warning' ? '#d97706' : '#16a34a'
                          }}>{atual}</span>
                          <div className="stock-bar-track">
                            <div className="stock-bar-fill" style={{ width: `${pct}%`, background: barColor }} />
                          </div>
                        </div>
                      </td>
                      <td style={{ color: '#64748b' }}>{minimo}</td>
                      <td><span className={`badge ${st.cls}`}>{st.text}</span></td>
                      <td>
                        {p.QR_CODE && (
                          <QRCodeCanvas
                            value={p.QR_CODE}
                            size={52}
                            level="M"
                            ref={el => (qrPrintRefs.current[p.QR_CODE] = el)}
                          />
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {/* Imprimir QR */}
                          <button
                            className="action-btn print-btn"
                            onClick={() => imprimirQR(p)}
                            onMouseEnter={e => { e.currentTarget.style.background = '#1e293b'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = '#1e293b'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#475569'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                              <polyline points="6 9 6 2 18 2 18 9"/>
                              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                              <rect x="6" y="14" width="12" height="8"/>
                            </svg>
                            Imprimir QR
                          </button>

                          {/* Editar */}
                          <button
                            className="action-btn edit-btn"
                            onClick={() => abrirEdicao(p)}
                            onMouseEnter={e => { e.currentTarget.style.background = '#2563eb'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = '#2563eb'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#475569'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                            Editar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {listaFiltrada.length === 0 && (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', color: '#94a3b8', padding: '32px 0', fontSize: 14 }}>
                      Nenhum produto encontrado
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ─── MODAL NOVO PRODUTO ─── */}
      {showModal && (
        <Modal title="Novo Produto" onClose={resetModal} footer={null}>

          <div className="modal-steps">
            {[
              { n: 1, label: 'Identificação' },
              { n: 2, label: 'Estoque' },
              { n: 3, label: 'Confirmação' },
            ].map(({ n, label }) => (
              <div key={n} className={`step-item ${activeStep === n ? 'active' : activeStep > n ? 'done' : ''}`}>
                <div className="step-circle">
                  {activeStep > n
                    ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                    : n
                  }
                </div>
                <span className="step-label">{label}</span>
              </div>
            ))}
          </div>

          {feedback && <div className="feedback error">{feedback}</div>}

          {/* Step 1 */}
          {activeStep === 1 && (
            <div>
              <div className="form-section-title">Informações do Produto</div>
              <div className="form-group" style={{ marginBottom: 14 }}>
                <label>Nome do Produto <span className="required-mark">*</span></label>
                <input
                  name="nome"
                  value={form.nome}
                  onChange={handleChange}
                  placeholder="Ex: Cimento Portland CP-II"
                  autoFocus
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Unidade <span className="required-mark">*</span></label>
                  <select name="unidade" value={form.unidade} onChange={handleChange}>
                    <option value="">Selecione...</option>
                    {unidades.map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Código de Barras <span style={{ color: '#94a3b8', fontWeight: 400 }}>(opcional)</span></label>
                  <input name="codigoBarra" value={form.codigoBarra} onChange={handleChange} placeholder="EAN / SKU" />
                </div>
              </div>
            </div>
          )}

          {/* Step 2 */}
          {activeStep === 2 && (
            <div>
              <div className="form-section-title">Configuração de Estoque</div>
              <div className="form-row">
                <div className="form-group">
                  <label>Estoque Inicial <span className="required-mark">*</span></label>
                  <input type="number" name="estoque" value={form.estoque} onChange={handleChange} placeholder="0" min="0" autoFocus />
                </div>
                <div className="form-group">
                  <label>Estoque Mínimo <span className="required-mark">*</span></label>
                  <input type="number" name="minimo" value={form.minimo} onChange={handleChange} placeholder="0" min="0" />
                </div>
              </div>
              {form.estoque !== '' && form.minimo !== '' && (
                <div style={{ background: '#f8fafc', borderRadius: 10, padding: '14px 16px', marginTop: 14, border: '1px solid #e2e8f0' }}>
                  {(() => {
                    const st = statusEstoque(parseInt(form.estoque)||0, parseInt(form.minimo)||0);
                    return (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
                        <span>Status inicial:</span>
                        <span className={`badge ${st.cls}`}>{st.text}</span>
                        {st.cls === 'danger' && <span style={{ color: '#ef4444', fontSize: 12 }}>⚠️ Estoque abaixo do mínimo</span>}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

          {/* Step 3 */}
          {activeStep === 3 && (
            <div>
              <div className="form-section-title">Resumo e QR Code</div>
              <div className="confirmation-flex" style={{ display: 'flex', gap: 20 }}>
                <div style={{ flex: 1 }}>
                  {[
                    { label: 'Nome',            val: form.nome },
                    { label: 'Unidade',         val: form.unidade },
                    { label: 'Estoque Inicial', val: form.estoque },
                    { label: 'Estoque Mínimo',  val: form.minimo },
                    { label: 'Cód. Barras',     val: form.codigoBarra || '—' },
                  ].map(({ label, val }) => (
                    <div key={label} style={{
                      display: 'flex', justifyContent: 'space-between',
                      padding: '8px 0', borderBottom: '1px solid #f1f5f9', fontSize: 13
                    }}>
                      <span style={{ color: '#64748b', fontWeight: 600 }}>{label}</span>
                      <span style={{ color: '#1e293b', fontWeight: 600 }}>{val}</span>
                    </div>
                  ))}
                </div>
                <div className="qr-preview-box" style={{ width: 140, flexShrink: 0 }}>
                  <QRCodeCanvas value={`PRE-${form.nome}`} size={300} level="M" />
                  <p>QR Code</p>
                  <div className="qr-label">gerado ao salvar</div>
                </div>
              </div>
            </div>
          )}

          <div className="modal-nav">
            <button className="btn-step" onClick={activeStep === 1 ? resetModal : () => setActiveStep(s => s - 1)}>
              {activeStep === 1 ? 'Cancelar' : '← Voltar'}
            </button>
            {activeStep < 3 ? (
              <button className="btn-step primary" disabled={!stepValid(activeStep)} onClick={() => setActiveStep(s => s + 1)}>
                Próximo →
              </button>
            ) : (
              <button className="btn-step success" onClick={salvar} disabled={loading}>
                {loading ? 'Salvando...' : '✓ Salvar Produto'}
              </button>
            )}
          </div>
        </Modal>
      )}

      {/* ─── MODAL EDITAR PRODUTO ─── */}
      {showEditModal && produtoEditando && (
        <Modal title="Editar Produto" onClose={fecharEdicao} footer={null}>

          {/* Cabeçalho com info do produto */}
          <div style={{
            background: '#f8fafc', borderRadius: 10, padding: '10px 14px',
            marginBottom: 20, border: '1px solid #e2e8f0',
            display: 'flex', alignItems: 'center', gap: 10
          }}>
            <div style={{
              width: 34, height: 34, borderRadius: 8, background: '#e0e7ff',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2">
                <rect x="2" y="3" width="20" height="14" rx="2"/>
                <line x1="8" y1="21" x2="16" y2="21"/>
                <line x1="12" y1="17" x2="12" y2="21"/>
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>
                {produtoEditando.PRODUTO}
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace' }}>
                {produtoEditando.QR_CODE}
              </div>
            </div>
          </div>

          {feedbackEdit && <div className="feedback error">{feedbackEdit}</div>}

          {/* Identificação */}
          <div className="form-section-title">Identificação</div>
          <div className="form-group" style={{ marginBottom: 14 }}>
            <label>Nome do Produto <span className="required-mark">*</span></label>
            <input
              value={formEdit.nome}
              onChange={e => setFormEdit(f => ({ ...f, nome: e.target.value }))}
              placeholder="Nome do produto"
              autoFocus
            />
          </div>
          <div className="form-row" style={{ marginBottom: 20 }}>
            <div className="form-group">
              <label>Unidade <span className="required-mark">*</span></label>
              <select value={formEdit.unidade} onChange={e => setFormEdit(f => ({ ...f, unidade: e.target.value }))}>
                <option value="">Selecione...</option>
                {unidades.map(u => <option key={u}>{u}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Código de Barras <span style={{ color: '#94a3b8', fontWeight: 400 }}>(opcional)</span></label>
              <input
                value={formEdit.codigoBarra}
                onChange={e => setFormEdit(f => ({ ...f, codigoBarra: e.target.value }))}
                placeholder="EAN / SKU"
              />
            </div>
          </div>

          {/* Estoque */}
          <div className="form-section-title">Estoque</div>
          <div className="form-row" style={{ marginBottom: 14 }}>
            <div className="form-group">
              <label>Estoque Atual <span className="required-mark">*</span></label>
              <input
                type="number" min="0"
                value={formEdit.estoque}
                onChange={e => setFormEdit(f => ({ ...f, estoque: e.target.value }))}
                placeholder="0"
              />
            </div>
            <div className="form-group">
              <label>Estoque Mínimo <span className="required-mark">*</span></label>
              <input
                type="number" min="0"
                value={formEdit.minimo}
                onChange={e => setFormEdit(f => ({ ...f, minimo: e.target.value }))}
                placeholder="0"
              />
            </div>
          </div>

          {/* Preview status */}
          {formEdit.estoque !== '' && formEdit.minimo !== '' && (() => {
            const st = statusEstoque(parseInt(formEdit.estoque)||0, parseInt(formEdit.minimo)||0);
            return (
              <div style={{
                background: '#f8fafc', borderRadius: 8, padding: '10px 14px',
                border: '1px solid #e2e8f0', marginBottom: 4,
                display: 'flex', alignItems: 'center', gap: 8, fontSize: 13
              }}>
                <span style={{ color: '#64748b' }}>Status após salvar:</span>
                <span className={`badge ${st.cls}`}>{st.text}</span>
              </div>
            );
          })()}

          <div className="modal-nav">
            <button className="btn-step" onClick={fecharEdicao}>Cancelar</button>
            <button className="btn-step success" onClick={salvarEdicao} disabled={loadingEdit}>
              {loadingEdit ? 'Salvando...' : '✓ Salvar Alterações'}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}