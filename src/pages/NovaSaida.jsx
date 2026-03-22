import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useApp } from '../AppContext';
import PageHeader from '../components/PageHeader';
import SheetsService from '../services/SheetsService';
import {s } from '../css/estiloNovaSaida';

// ─── Constantes ───────────────────────────────────────────────────────────────
const STATUS_OPTIONS = ['NÃO ASSOCIOU', 'TROCA', 'SOBRA', 'PERDIDO'];
const STATUS_COLORS = {
  'NÃO ASSOCIOU': '#E24B4A',
  'TROCA':        '#EF9F27',
  'SOBRA':        '#1D9E75',
  'PERDIDO':      '#888780',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Calcula o estoque disponível de um produto.
 * Adapte os nomes dos campos conforme a estrutura real de `movimentacoes`.
 */
function calcEstoque(nomeProduto, movimentacoes = []) {
  return movimentacoes.reduce((acc, m) => {
    if (m.PRODUTO !== nomeProduto) return acc;
    const qty = Number(m.QUANTIDADE) || 0;
    if (m.TIPO === 'ENTRADA') return acc + qty;
    if (m.TIPO === 'SAIDA')   return acc - qty;
    return acc;
  }, 0);
}

function corEstoque(qty) {
  if (qty <= 0) return '#E24B4A';
  if (qty <= 5) return '#EF9F27';
  return '#1D9E75';
}

function labelEstoque(qty) {
  if (qty <= 0) return 'Sem estoque';
  if (qty <= 5) return `${qty} (baixo)`;
  return `${qty} un.`;
}

// ─── QR Scanner ───────────────────────────────────────────────────────────────
function QRScanner({ onDetected, onClose }) {
  const videoRef  = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const animRef   = useRef(null);
  const [erro, setErro] = useState(null);

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(animRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
  }, []);

  const scanFrame = useCallback(async () => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) {
      animRef.current = requestAnimationFrame(scanFrame);
      return;
    }
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);

    // Tenta BarcodeDetector nativo (Chrome/Android)
    if ('BarcodeDetector' in window) {
      try {
        const det = new window.BarcodeDetector({ formats: ['qr_code', 'code_128', 'ean_13'] });
        const res = await det.detect(canvas);
        if (res.length > 0) { stopCamera(); onDetected(res[0].rawValue); return; }
      } catch (_) {}
    }

    // Fallback jsQR
    if (window.jsQR) {
      const img  = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = window.jsQR(img.data, canvas.width, canvas.height);
      if (code) { stopCamera(); onDetected(code.data); return; }
    }

    animRef.current = requestAnimationFrame(scanFrame);
  }, [onDetected, stopCamera]);

  useEffect(() => {
    if (!window.jsQR) {
      const sc = document.createElement('script');
      sc.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js';
      document.head.appendChild(sc);
    }
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      .then(stream => {
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().then(() => scanFrame());
        }
      })
      .catch(err => setErro('Câmera indisponível: ' + err.message));

    return stopCamera;
  }, [scanFrame, stopCamera]);

  return (
    <div style={s.qrBackdrop}>
      <div style={s.qrModal}>
        <div style={s.qrHeader}>
          <span style={s.qrTitle}>Leitor de QR Code</span>
          <button style={s.qrCloseBtn} onClick={() => { stopCamera(); onClose(); }}>✕</button>
        </div>
        {erro
          ? <div style={s.qrErro}>{erro}</div>
          : (
            <div style={s.qrVideoWrap}>
              <video ref={videoRef} style={s.qrVideo} playsInline muted />
              <canvas ref={canvasRef} style={{ display: 'none' }} />
              <div style={s.qrFinder} />
            </div>
          )
        }
        <p style={s.qrDica}>Aponte para o QR Code ou código de barras do produto</p>
      </div>
    </div>
  );
}

// ─── Status Dropdown ──────────────────────────────────────────────────────────
function StatusDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const cor   = value ? STATUS_COLORS[value] : '#B4B2A9';
  const label = value || 'definir status';

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          ...s.statusBadge,
          background:  cor + '18',
          color:       cor,
          borderColor: cor + '50',
        }}
      >
        {label}
        <span style={{ fontSize: 9, opacity: 0.7, marginLeft: 3 }}>▾</span>
      </button>
      {open && (
        <div style={s.statusDrop}>
          {STATUS_OPTIONS.map(opt => (
            <button
              key={opt}
              style={s.statusOpt}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--color-background-secondary)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              onClick={() => { onChange(opt); setOpen(false); }}
            >
              <span style={{ ...s.statusDot, background: STATUS_COLORS[opt] }} />
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Card de produto ──────────────────────────────────────────────────────────
function ProdCard({ produto, estoque, added, qty, onAdd, onChangeQty }) {
  const cor = corEstoque(estoque);
  return (
    <div
      onClick={() => !added && onAdd()}
      style={{
        ...s.prodCard,
        borderColor: added ? '#185FA5' : 'var(--color-border-tertiary)',
        background:  added ? '#E6F1FB' : 'var(--color-background-primary)',
        cursor:      added ? 'default' : 'pointer',
      }}
    >
      <div style={{ fontSize: 10, color: cor, fontWeight: 500 }}>
        {labelEstoque(estoque)}
      </div>
      <div style={s.prodNome}>{produto}</div>
      {added ? (
        <div style={s.prodQtyRow} onClick={e => e.stopPropagation()}>
          <button style={s.qtyBtn} onClick={() => onChangeQty(qty - 1)}>−</button>
          <span style={s.qtyVal}>{qty}</span>
          <button style={s.qtyBtn} onClick={() => onChangeQty(qty + 1)}>+</button>
        </div>
      ) : (
        <div style={s.prodHint}>clique para add</div>
      )}
    </div>
  );
}

// ─── Item do carrinho ─────────────────────────────────────────────────────────
function CartItem({ nome, qty, status, obs, onChangeQty, onStatus, onObs, onRemove }) {
  const taRef = useRef(null);

  function autoResize() {
    if (!taRef.current) return;
    taRef.current.style.height = 'auto';
    taRef.current.style.height = taRef.current.scrollHeight + 'px';
  }

  return (
    <div style={s.cartItem}>
      <div style={s.cartItemTop}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={s.cartItemNome}>{nome}</div>
          <div style={s.cartItemQtyRow}>
            <button style={s.qtyBtn} onClick={() => onChangeQty(qty - 1)}>−</button>
            <span style={{ ...s.qtyVal, fontSize: 12 }}>{qty}</span>
            <button style={s.qtyBtn} onClick={() => onChangeQty(qty + 1)}>+</button>
            <span style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginLeft: 2 }}>
              unidade{qty > 1 ? 's' : ''}
            </span>
          </div>
        </div>
        <div style={s.cartItemRight}>
          <StatusDropdown value={status} onChange={onStatus} />
          <button style={s.delBtn} onClick={onRemove}>✕</button>
        </div>
      </div>
      <div style={{ padding: '0 14px 10px' }}>
        <textarea
          ref={taRef}
          rows={1}
          value={obs}
          placeholder="Observação (opcional)..."
          onChange={e => { onObs(e.target.value); autoResize(); }}
          style={s.obsTextarea}
        />
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function NovaSaida() {
  const { dados, carregarDados } = useApp();
  const { tecnicos = [], produtos = [], movimentacoes = [] } = dados;

  const today = new Date().toISOString().split('T')[0];

  const [data,     setData]     = useState(today);
  const [tecnico,  setTecnico]  = useState('');
  const [placa,    setPlaca]    = useState('');
  const [busca,    setBusca]    = useState('');
  const [cart,     setCart]     = useState({});   // { [nomeProduto]: { qty, status, obs } }
  const [showQR,   setShowQR]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [feedback, setFeedback] = useState(null); // { tipo, msg }

  const tecnicosAtivos = tecnicos.filter(t => t.STATUS === 'ATIVO');

  // Auto-preenche placa ao selecionar técnico
  useEffect(() => {
    const tec = tecnicos.find(t => (t['NOME COMPLETO'] || t.NOME) === tecnico);
    if (tec) setPlaca(tec.PLACA || '');
  }, [tecnico, tecnicos]);

  // Mapa de estoque calculado
 const estoqueMap = {};

produtos.forEach(p => {
  const nome = p.PRODUTO;

  const estoque = Number(
    p['ESTOQUE ATUAL'] || 0
  );

  estoqueMap[nome] = estoque;
});

  // Produtos filtrados pela busca
  const prodsFiltrados = busca
    ? produtos.filter(p => p.PRODUTO.toLowerCase().includes(busca.toLowerCase()))
    : produtos;

  // ── Ações do carrinho ──────────────────────────────────────────────────────
  const addToCart = useCallback((nome) => {
    setCart(prev => {
      if (prev[nome]?.qty > 0) return prev;
      return { ...prev, [nome]: { qty: 1, status: '', obs: '' } };
    });
    setFeedback({ tipo: 'success', msg: `"${nome}" adicionado` });
    setTimeout(() => setFeedback(null), 2500);
  }, []);

  const updateQty = (nome, novaQty) => {
    if (novaQty <= 0) {
      setCart(prev => { const n = { ...prev }; delete n[nome]; return n; });
    } else {
      setCart(prev => ({ ...prev, [nome]: { ...prev[nome], qty: novaQty } }));
    }
  };

  const updateStatus = (nome, status) =>
    setCart(prev => ({ ...prev, [nome]: { ...prev[nome], status } }));

  const updateObs = (nome, obs) =>
    setCart(prev => ({ ...prev, [nome]: { ...prev[nome], obs } }));

  const removeItem = (nome) =>
    setCart(prev => { const n = { ...prev }; delete n[nome]; return n; });

  // QR detectado → encontra produto correspondente
  const handleQR = useCallback((rawValue) => {
    setShowQR(false);
    const match = produtos.find(p =>
      p.PRODUTO === rawValue ||
      (p.CODIGO && p.CODIGO === rawValue) ||
      rawValue.toLowerCase().includes(p.PRODUTO.toLowerCase())
    );
    if (match) {
      addToCart(match.PRODUTO);
    } else {
      setFeedback({ tipo: 'warning', msg: `QR lido: "${rawValue}" — produto não encontrado.` });
      setTimeout(() => setFeedback(null), 4000);
    }
  }, [produtos, addToCart]);

  // ── Confirmar saída ────────────────────────────────────────────────────────
  const handleConfirmar = async () => {
    const itens = Object.entries(cart).filter(([, v]) => v.qty > 0);

    if (!tecnico) {
      setFeedback({ tipo: 'error', msg: 'Selecione o técnico.' }); return;
    }
    if (itens.length === 0) {
      setFeedback({ tipo: 'error', msg: 'Adicione pelo menos um produto.' }); return;
    }
    const semStatus = itens.find(([, v]) => !v.status);
    if (semStatus) {
      setFeedback({ tipo: 'error', msg: `Defina o status de "${semStatus[0]}".` }); return;
    }

    setLoading(true);
    setFeedback(null);
    try {
      for (const [nome, item] of itens) {
        const payload = {
          acao:        'salvarMovimentacao',
          data,
          tecnico,
          placa,
          produto:     nome,
          quantidade:  item.qty,
          status:      item.status,
          observacoes: item.obs || '',
        };
        const res = await SheetsService.salvarMovimentacao(payload);
        if (!res.success) throw new Error(res.error || `Falha em "${nome}"`);
      }
      setFeedback({ tipo: 'success', msg: `${itens.length} item(ns) registrado(s) com sucesso!` });
      setCart({});
      await carregarDados();
    } catch (err) {
      setFeedback({ tipo: 'error', msg: 'Erro: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  

  // ── Derivados ──────────────────────────────────────────────────────────────
  const cartItens = Object.entries(cart).filter(([, v]) => v.qty > 0);
  const totalUnid = cartItens.reduce((a, [, v]) => a + v.qty, 0);
  const semStatus = cartItens.filter(([, v]) => !v.status).length;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <PageHeader title="Saída Rápida" subtitle="Registrar saída de materiais" />

      <div style={s.root}>

        {/* Topo: técnico + data + placa */}
        <div style={s.topBar}>
          <div style={s.topField}>
            <label style={s.label}>Data</label>
            <input
              type="date"
              value={data}
              onChange={e => setData(e.target.value)}
              style={s.input}
            />
          </div>
          <div style={{ ...s.topField, flex: 2 }}>
            <label style={s.label}>Técnico *</label>
            <select value={tecnico} onChange={e => setTecnico(e.target.value)} style={s.input}>
              <option value="">Selecione o técnico...</option>
              {tecnicosAtivos.map((t, i) => {
                const nome = t['NOME COMPLETO'] || t.NOME;
                return <option key={i} value={nome}>{nome}</option>;
              })}
            </select>
          </div>
          <div style={s.topField}>
            <label style={s.label}>Placa</label>
            <input
              type="text"
              value={placa}
              onChange={e => setPlaca(e.target.value)}
              placeholder="ABC1234"
              style={s.input}
            />
          </div>
        </div>

        {/* Corpo: grade de produtos + carrinho */}
        <div style={s.body}>

          {/* ── Esquerda: grade de produtos ── */}
          <div style={s.leftCol}>
            <div style={s.colHeader}>
              <span style={s.colTitle}>
                Produtos
                {prodsFiltrados.length > 0 && (
                  <span style={s.countPill}>{prodsFiltrados.length}</span>
                )}
              </span>
              <button style={s.btnQR} onClick={() => setShowQR(true)}>
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
                  <rect x="1" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3"/>
                  <rect x="10" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3"/>
                  <rect x="1" y="10" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3"/>
                  <rect x="10" y="10" width="2" height="2" fill="currentColor"/>
                  <rect x="13" y="10" width="2" height="2" fill="currentColor"/>
                  <rect x="10" y="13" width="2" height="2" fill="currentColor"/>
                  <rect x="13" y="13" width="2" height="2" fill="currentColor"/>
                </svg>
                QR Code
              </button>
            </div>

            <div style={s.searchWrap}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" style={s.searchIcon}>
                <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.3"/>
                <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
              <input
                type="text"
                placeholder="Buscar produto..."
                value={busca}
                onChange={e => setBusca(e.target.value)}
                style={s.searchInput}
              />
              {busca && (
                <button style={s.searchClear} onClick={() => setBusca('')}>✕</button>
              )}
            </div>

            <div style={s.prodGrid}>
              {prodsFiltrados.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', gridColumn: '1/-1' }}>
                  Nenhum produto encontrado.
                </p>
              ) : (
                prodsFiltrados.map((p, i) => {
                  const nome  = p.PRODUTO;
                  const added = !!(cart[nome]?.qty > 0);
                  return (
                    <ProdCard
                      key={i}
                      produto={nome}
                      estoque={estoqueMap[nome] ?? 0}
                      added={added}
                      qty={cart[nome]?.qty || 0}
                      onAdd={() => addToCart(nome)}
                      onChangeQty={v => updateQty(nome, v)}
                    />
                  );
                })
              )}
            </div>
          </div>

          {/* ── Direita: carrinho ── */}
          <div style={s.rightCol}>
            <div style={s.colHeader}>
              <span style={s.colTitle}>Itens da saída</span>
              {cartItens.length > 0 && (
                <span style={s.cartBadge}>{cartItens.length}</span>
              )}
            </div>

            {cartItens.length === 0 ? (
              <div style={s.emptyCart}>
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.25, marginBottom: 10 }}>
                  <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" stroke="currentColor" strokeWidth="1.5"/>
                  <line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" strokeWidth="1.5"/>
                </svg>
                <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: 0 }}>
                  Clique em um produto para adicionar
                </p>
              </div>
            ) : (
              <div style={s.cartList}>
                {cartItens.map(([nome, item]) => (
                  <CartItem
                    key={nome}
                    nome={nome}
                    qty={item.qty}
                    status={item.status}
                    obs={item.obs}
                    onChangeQty={v  => updateQty(nome, v)}
                    onStatus={v     => updateStatus(nome, v)}
                    onObs={v        => updateObs(nome, v)}
                    onRemove={()    => removeItem(nome)}
                  />
                ))}
              </div>
            )}

            {cartItens.length > 0 && (
              <div style={s.cartFooter}>
                <div style={s.cartMeta}>
                  <span>{cartItens.length} produto{cartItens.length > 1 ? 's' : ''}</span>
                  <span>{totalUnid} unidade{totalUnid > 1 ? 's' : ''}</span>
                  {semStatus > 0 && (
                    <span style={{ color: '#E24B4A' }}>{semStatus} sem status</span>
                  )}
                </div>
                <button
                  style={{
                    ...s.btnConfirmar,
                    opacity: loading ? 0.7 : 1,
                    cursor:  loading ? 'not-allowed' : 'pointer',
                  }}
                  onClick={handleConfirmar}
                  disabled={loading}
                >
                  {loading ? 'Salvando...' : `Confirmar saída`}
                </button>
              </div>
            )}

            {feedback && (
              <div style={{
                ...s.feedback,
                background:  feedback.tipo === 'success' ? '#1D9E7518' : feedback.tipo === 'warning' ? '#EF9F2718' : '#E24B4A18',
                borderColor: feedback.tipo === 'success' ? '#1D9E75'   : feedback.tipo === 'warning' ? '#EF9F27'   : '#E24B4A',
                color:       feedback.tipo === 'success' ? '#0F6E56'   : feedback.tipo === 'warning' ? '#854F0B'   : '#A32D2D',
              }}>
                {feedback.msg}
              </div>
            )}
          </div>

        </div>
      </div>

      {showQR && <QRScanner onDetected={handleQR} onClose={() => setShowQR(false)} />}
    </>
  );
}
