import React, { useState, useRef } from 'react';
import { useApp } from '../AppContext';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import SheetsService from '../services/SheetsService';
import { QRCodeCanvas } from 'qrcode.react';
import DetalheProduto from '../components/Detalheproduto';
import '../css/estiloProdutos.css';

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

  // ── Detalhe do produto ──
  const [produtoDetalhe, setProdutoDetalhe] = useState(null);

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
    const atual   = parseInt(p['ESTOQUE_GALPAO'])  || 0;
    const minimo  = parseInt(p['ESTOQUE MÍNIMO']) || 0;
    const st      = statusEstoque(atual, minimo);
    const matchStatus  = filtroStatus  === 'TODOS' || st.text === filtroStatus;
    const matchUnidade = filtroUnidade === 'TODOS' || (p.UNIDADE || '') === filtroUnidade;
    return matchBusca && matchStatus && matchUnidade;
  });

  const contadores = {
    TODOS:   produtos.length,
    OK:      produtos.filter(p => statusEstoque(parseInt(p['ESTOQUE_GALPAO'])||0, parseInt(p['ESTOQUE MÍNIMO'])||0).text === 'OK').length,
    ALERTA:  produtos.filter(p => statusEstoque(parseInt(p['ESTOQUE_GALPAO'])||0, parseInt(p['ESTOQUE MÍNIMO'])||0).text === 'ALERTA').length,
    CRÍTICO: produtos.filter(p => statusEstoque(parseInt(p['ESTOQUE_GALPAO'])||0, parseInt(p['ESTOQUE MÍNIMO'])||0).text === 'CRÍTICO').length,
  };

  return (
    <>
      
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
                  const atual   = parseInt(p['ESTOQUE_GALPAO'])  || 0;
                  const minimo  = parseInt(p['ESTOQUE MÍNIMO']) || 0;
                  const st      = statusEstoque(atual, minimo);
                  const pct     = minimo > 0 ? Math.min((atual / (minimo * 3)) * 100, 100) : 100;
                  const barColor = st.cls === 'danger' ? '#ef4444' : st.cls === 'warning' ? '#f59e0b' : '#22c55e';

                  return (
                    <tr
                      key={i}
                      style={{ cursor: 'pointer' }}
                      onClick={() => setProdutoDetalhe(p)}
                    >
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
                            onClick={e => { e.stopPropagation(); imprimirQR(p); }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#1e293b'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = '#1e293b'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#475569'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                              <polyline points="6 9 6 2 18 2 18 9"/>
                              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                              <rect x="6" y="14" width="12" height="8"/>
                            </svg>
                            Imprimir
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
                  <QRCodeCanvas value={`PRE-${form.nome}`}  size={300} level="M" style={{ width: 100, height: 100, }} />
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

      {/* ─── DETALHE DO PRODUTO (drawer lateral) ─── */}
      {produtoDetalhe && (
        <DetalheProduto
          produto={produtoDetalhe}
          onClose={() => setProdutoDetalhe(null)}
          onIrTransferencia={(p) => {
            setProdutoDetalhe(null);
            // Navegue para a página de transferência com o produto pré-selecionado
            // Ex: navigate('/transferencia', { state: { produto: p } })
            console.log('Ir para transferência com produto:', p.PRODUTO);
          }}
          onIrReposicao={(p) => {
            setProdutoDetalhe(null);
            // Navegue para nova entrada com o produto pré-selecionado
            // Ex: navigate('/nova-entrada', { state: { produto: p } })
            console.log('Ir para nova entrada com produto:', p.PRODUTO);
          }}
        />
      )}
    </>
  );
}