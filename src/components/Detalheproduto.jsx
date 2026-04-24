// src/pages/DetalheProduto.jsx
// Página de detalhes de produto — acesso via clique na lista ou leitura de QR Code
// Props esperadas: produto (objeto), onClose (fn), onIrTransferencia (fn), onIrReposicao (fn)

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useApp } from '../AppContext';
import { QRCodeCanvas } from 'qrcode.react';
import SheetsService from '../services/SheetsService';
import { LOCAIS_MAP } from '../data/localHierarchy';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hoje() { return new Date(); }

function subDias(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

function parseData(val) {
  if (!val) return null;
  if (val instanceof Date) return val;
  if (typeof val === 'number') {
    const utc = new Date((val - 25569) * 86400 * 1000);
    return new Date(utc.getUTCFullYear(), utc.getUTCMonth(), utc.getUTCDate());
  }
  if (typeof val === 'string') {
    if (val.includes('/')) {
      const [d, m, y] = val.split('/');
      return new Date(Number(y), Number(m) - 1, Number(d));
    }
    if (val.includes('-')) {
      const [y, m, d] = val.split('-').map(Number);
      return new Date(y, m - 1, d);
    }
  }
  return new Date(val);
}

function fmtData(val) {
  const d = parseData(val);
  if (!d || isNaN(d)) return '—';
  return d.toLocaleDateString('pt-BR');
}

function statusEstoque(atual, minimo) {
  if (atual <= 0)           return { cls: 'danger',  label: 'SEM ESTOQUE', cor: '#E24B4A' };
  if (atual <= minimo)      return { cls: 'danger',  label: 'CRÍTICO',     cor: '#E24B4A' };
  if (atual <= minimo * 2)  return { cls: 'warning', label: 'ALERTA',      cor: '#EF9F27' };
  return                           { cls: 'ok',      label: 'OK',          cor: '#1D9E75' };
}

// Calcula movimentos de um produto dentro de um período
function movsPeriodo(movimentacoes, nomeProd, diasAtras) {
  const limite = subDias(diasAtras);
  return movimentacoes.filter(m => {
    if (m.PRODUTO !== nomeProd) return false;
    const d = parseData(m.DATA);
    return d && d >= limite;
  });
}

// Agrupa movimentos por localOrigem/localDestino para mostrar onde está o estoque
function calcEstoquePorLocal(movimentacoes, nomeProd) {
  const map = {};
  movimentacoes.forEach(m => {
    if (m.PRODUTO !== nomeProd) return;
    const qty = Number(m.QUANTIDADE) || 0;
    if (m.TIPO === 'ENTRADA' && m.localDestino) {
      map[m.localDestino] = (map[m.localDestino] || 0) + qty;
    } else if (m.TIPO === 'SAIDA' && m.localOrigem) {
      map[m.localOrigem] = (map[m.localOrigem] || 0) - qty;
    }
  });
  return map;
}

// Calcula estoque total simples
function calcEstoqueTotal(movimentacoes, nomeProd) {
  return movimentacoes.reduce((acc, m) => {
    if (m.PRODUTO !== nomeProd) return acc;
    const qty = Number(m.QUANTIDADE) || 0;
    if (m.TIPO === 'ENTRADA') return acc + qty;
    if (m.TIPO === 'SAIDA')   return acc - qty;
    return acc;
  }, 0);
}

// Agrupa movimentos por dia para sparkline
function movsPorDia(movs, dias) {
  const result = [];
  for (let i = dias - 1; i >= 0; i--) {
    const d = subDias(i);
    const dStr = d.toISOString().split('T')[0];
    const saidas = movs.filter(m => {
      const md = parseData(m.DATA);
      return md && md.toISOString().split('T')[0] === dStr && m.TIPO === 'SAIDA';
    }).reduce((a, m) => a + (Number(m.QUANTIDADE) || 0), 0);
    result.push({ label: d.toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit' }), saidas });
  }
  return result;
}

// ─── QR Scanner inline ────────────────────────────────────────────────────────

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
      animRef.current = requestAnimationFrame(scanFrame); return;
    }
    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    if ('BarcodeDetector' in window) {
      try {
        const det = new window.BarcodeDetector({ formats: ['qr_code','code_128','ean_13'] });
        const res = await det.detect(canvas);
        if (res.length > 0) { stopCamera(); onDetected(res[0].rawValue); return; }
      } catch (_) {}
    }
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
        if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play().then(scanFrame); }
      })
      .catch(err => setErro('Câmera indisponível: ' + err.message));
    return stopCamera;
  }, [scanFrame, stopCamera]);

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ background:'#fff', borderRadius:16, overflow:'hidden', width:340, boxShadow:'0 20px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ padding:'14px 16px', display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:'1px solid #f0f0f0' }}>
          <span style={{ fontSize:14, fontWeight:700 }}>📷 Leitor de QR Code</span>
          <button onClick={() => { stopCamera(); onClose(); }} style={{ background:'none', border:'none', cursor:'pointer', fontSize:18, color:'#888', padding:4 }}>✕</button>
        </div>
        {erro ? (
          <div style={{ padding:32, textAlign:'center', color:'#E24B4A', fontSize:13 }}>{erro}</div>
        ) : (
          <div style={{ position:'relative', background:'#000' }}>
            <video ref={videoRef} style={{ width:'100%', display:'block' }} playsInline muted />
            <canvas ref={canvasRef} style={{ display:'none' }} />
            <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', pointerEvents:'none' }}>
              <div style={{ width:160, height:160, border:'3px solid #185FA5', borderRadius:12, boxShadow:'0 0 0 9999px rgba(0,0,0,0.35)' }} />
            </div>
          </div>
        )}
        <p style={{ fontSize:12, color:'#888', textAlign:'center', padding:'10px 16px', margin:0 }}>Aponte a câmera para o QR Code do produto</p>
      </div>
    </div>
  );
}

// ─── Mini sparkline SVG ───────────────────────────────────────────────────────

function Sparkline({ data, cor = '#185FA5', altura = 40 }) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data.map(d => d.saidas), 1);
  const W = 200, H = altura, pad = 4;
  const pts = data.map((d, i) => {
    const x = pad + (i / (data.length - 1)) * (W - pad * 2);
    const y = H - pad - (d.saidas / max) * (H - pad * 2);
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width:'100%', height: altura }}>
      <polyline points={pts} fill="none" stroke={cor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      {data.map((d, i) => {
        const x = pad + (i / (data.length - 1)) * (W - pad * 2);
        const y = H - pad - (d.saidas / max) * (H - pad * 2);
        return d.saidas > 0
          ? <circle key={i} cx={x} cy={y} r="3" fill={cor} />
          : null;
      })}
    </svg>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const s = {
  overlay: { position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:1000, display:'flex', alignItems:'flex-start', justifyContent:'flex-end', padding:16 },
  drawer: { width:'min(620px, 100vw)', height:'calc(100vh - 32px)', background:'var(--color-background-primary,#fff)', borderRadius:16, boxShadow:'0 20px 60px rgba(0,0,0,0.2)', display:'flex', flexDirection:'column', overflow:'hidden', animation:'slideIn 0.22s ease' },
  drawerHead: { padding:'18px 20px 14px', borderBottom:'1px solid var(--color-border-secondary,#f0f0f0)', display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12, flexShrink:0 },
  drawerBody: { flex:1, overflowY:'auto', padding:'20px' },
  closeBtn: { width:32, height:32, border:'none', borderRadius:8, background:'var(--color-background-secondary,#f5f5f5)', color:'var(--color-text-secondary,#666)', cursor:'pointer', fontSize:16, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 },

  // Seções
  section: { marginBottom:24 },
  sectionTitle: { fontSize:11, fontWeight:800, color:'var(--color-text-secondary,#999)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:12, display:'flex', alignItems:'center', gap:6 },
  sectionLine: { flex:1, height:1, background:'var(--color-border-secondary,#f0f0f0)' },

  // Cards de stat
  statsRow: { display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 },
  statCard: { padding:'12px 14px', borderRadius:12, border:'1.5px solid', display:'flex', flexDirection:'column', gap:4 },
  statVal: { fontSize:22, fontWeight:900, letterSpacing:'-0.03em' },
  statLabel: { fontSize:11, fontWeight:600, opacity:0.7 },

  // Período tabs
  periodTabs: { display:'flex', gap:4, padding:3, background:'var(--color-background-secondary,#f5f5f5)', borderRadius:10, marginBottom:14, width:'fit-content' },
  periodTab: { padding:'5px 14px', borderRadius:8, border:'none', fontSize:12, fontWeight:700, cursor:'pointer', transition:'all 0.12s' },

  // Barras de atividade
  actRow: { display:'flex', flexDirection:'column', gap:6 },
  actItem: { display:'flex', alignItems:'center', gap:10 },
  actLabel: { fontSize:12, color:'var(--color-text-secondary,#888)', width:80, flexShrink:0 },
  actBar: { flex:1, height:8, borderRadius:4, background:'var(--color-background-secondary,#f0f0f0)', overflow:'hidden' },
  actFill: { height:'100%', borderRadius:4, transition:'width 0.4s ease' },
  actVal: { fontSize:12, fontWeight:700, width:30, textAlign:'right' },

  // Locais
  locaisGrid: { display:'flex', flexDirection:'column', gap:6 },
  localRow: { display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:10, background:'var(--color-background-secondary,#f8f8f8)', border:'1px solid var(--color-border-secondary,#efefef)' },
  localIcon: { fontSize:16, flexShrink:0 },
  localInfo: { flex:1, minWidth:0 },
  localNome: { fontSize:12, fontWeight:700, color:'var(--color-text-primary,#111)' },
  localSub: { fontSize:11, color:'var(--color-text-secondary,#999)', marginTop:1 },
  localQty: { fontSize:15, fontWeight:900, color:'#185FA5' },

  // Histórico
  histList: { display:'flex', flexDirection:'column', gap:5 },
  histItem: { display:'flex', alignItems:'center', gap:10, padding:'9px 12px', borderRadius:9, background:'var(--color-background-secondary,#f9f9f9)', border:'1px solid var(--color-border-secondary,#efefef)' },
  histType: { width:52, flexShrink:0, textAlign:'center', padding:'3px 0', borderRadius:6, fontSize:10, fontWeight:800 },
  histInfo: { flex:1, minWidth:0 },
  histProd: { fontSize:11, color:'var(--color-text-secondary,#888)' },
  histData: { fontSize:11, color:'var(--color-text-secondary,#aaa)', width:72, flexShrink:0, textAlign:'right' },
  histQty: { fontSize:13, fontWeight:900, width:28, textAlign:'right', flexShrink:0 },

  // Botões de ação
  actionsRow: { display:'flex', gap:8, flexWrap:'wrap' },
  actionBtn: { flex:1, minWidth:120, padding:'11px 16px', borderRadius:10, border:'none', fontSize:13, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:7, transition:'all 0.12s', boxShadow:'0 2px 6px rgba(0,0,0,0.08)' },

  // QR code box
  qrBox: { display:'flex', alignItems:'center', gap:16, padding:'14px 16px', background:'var(--color-background-secondary,#f8f8f8)', borderRadius:12, border:'1px solid var(--color-border-secondary,#efefef)' },
  qrInfo: { flex:1, minWidth:0 },
  qrLabel: { fontSize:11, color:'var(--color-text-secondary,#888)', marginBottom:2 },
  qrCode: { fontSize:12, fontWeight:700, fontFamily:'monospace', color:'var(--color-text-primary,#111)', wordBreak:'break-all' },

  // Cabeçalho do produto
  prodHead: { flex:1, minWidth:0 },
  prodNome: { fontSize:17, fontWeight:900, color:'var(--color-text-primary,#111)', lineHeight:1.2, marginBottom:6 },
  prodMeta: { display:'flex', gap:6, flexWrap:'wrap', alignItems:'center' },
  badge: { display:'inline-flex', alignItems:'center', padding:'3px 9px', borderRadius:6, fontSize:11, fontWeight:800, border:'1.5px solid' },
};

// ─── Componente Principal ─────────────────────────────────────────────────────

export default function DetalheProduto({ produto, onClose, onIrTransferencia, onIrReposicao }) {
  const { dados, carregarDados } = useApp();
  const movimentacoes = dados?.movimentacoes || [];

  const [periodo, setPeriodo]     = useState(7);
  const [showQR, setShowQR]       = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [formEdit, setFormEdit] = useState({
    nome: '', unidade: '', estoque: '', minimo: '', codigoBarra: ''
  });
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [feedbackEdit, setFeedbackEdit] = useState(null);
  const qrRef = useRef(null);

  // Navegar por QR Code
  function handleQRDetected(code) {
    setShowScanner(false);
    // Aqui você pode redirecionar via router ou chamar um callback externo
    // Ex: onBuscarProduto(code)
    console.log('QR lido:', code);
  }

  const nomeProd = produto?.PRODUTO || '';  
  const estoqueSala  = parseInt(produto?.['ESTOQUE_SALA']) || calcEstoqueTotal(movimentacoes, nomeProd);
  const estoqueAtual  = parseInt(produto?.['ESTOQUE_GALPAO']) || 0;
  const estoqueMinimo = parseInt(produto?.['ESTOQUE MÍNIMO']) || 0;
  const estoqueDispo = parseInt(produto?.['ESTOQUE_SALA + ESTOQUE_GALPAO']) || 0;
  const status = statusEstoque(estoqueAtual, estoqueMinimo);

  // Abrir edição
  const abrirEdicao = () => {
    setFormEdit({
      nome:        produto.PRODUTO           || '',
      unidade:     produto.UNIDADE           || '',
      estoque:     produto['ESTOQUE_GALPAO']  || '',
      minimo:      produto['ESTOQUE MÍNIMO'] || '',
      codigoBarra: produto['CÓDIGO']         || '',
    });
    setFeedbackEdit(null);
    setShowEditModal(true);
  };

  // Salvar edição
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
        qrCode:  produto.QR_CODE,
        codigo:  formEdit.codigoBarra || '',
        nome:    formEdit.nome,
        unidade: formEdit.unidade,
        estoque: formEdit.estoque,
        minimo:  formEdit.minimo,
      });
      if (!res.success) throw new Error(res.error || 'Erro ao salvar');
      setShowEditModal(false);
      await carregarDados();
    } catch (err) {
      setFeedbackEdit('Erro: ' + err.message);
    } finally {
      setLoadingEdit(false);
    }
  };

  // Movimentos por período
  const movs7  = useMemo(() => movsPeriodo(movimentacoes, nomeProd, 7),  [movimentacoes, nomeProd]);
  const movs15 = useMemo(() => movsPeriodo(movimentacoes, nomeProd, 15), [movimentacoes, nomeProd]);
  const movs30 = useMemo(() => movsPeriodo(movimentacoes, nomeProd, 30), [movimentacoes, nomeProd]);

  const movsAtual = periodo === 7 ? movs7 : periodo === 15 ? movs15 : movs30;

  const entradas = movsAtual.filter(m => m.TIPO === 'ENTRADA').reduce((a, m) => a + (Number(m.QUANTIDADE)||0), 0);
  const saidas   = movsAtual.filter(m => m.TIPO === 'SAIDA').reduce((a, m) => a + (Number(m.QUANTIDADE)||0), 0);
  const transf   = movsAtual.filter(m => m.STATUS === 'TRANSFERÊNCIA').length;

  // Sparkline (saídas por dia no período selecionado)
  const sparkData = useMemo(() => movsPorDia(movsAtual, periodo), [movsAtual, periodo]);

  // Estoque por local (baseado em movimentações com localDestino/localOrigem)
  const estoquePorLocal = useMemo(() => calcEstoquePorLocal(movimentacoes, nomeProd), [movimentacoes, nomeProd]);
  const locaisComEstoque = Object.entries(estoquePorLocal)
    .filter(([, q]) => q > 0)
    .sort(([, a], [, b]) => b - a);

  // Últimas movimentações (mais recente primeiro)
  const ultimasMovs = [...movimentacoes]
    .filter(m => m.PRODUTO === nomeProd)
    .sort((a, b) => {
      const da = parseData(a.DATA), db = parseData(b.DATA);
      return (db || 0) - (da || 0);
    })
    .slice(0, 8);

  // Técnicos que mais usam este produto
  const tecnicoMap = {};
  movs30.filter(m => m.TIPO === 'SAIDA').forEach(m => {
    const t = m.TÉCNICO || m.tecnico || '—';
    tecnicoMap[t] = (tecnicoMap[t] || 0) + (Number(m.QUANTIDADE)||0);
  });
  const topTecnicos = Object.entries(tecnicoMap).sort(([,a],[,b]) => b - a).slice(0, 4);
  const maxTec = topTecnicos[0]?.[1] || 1;

  // Imprimir QR
  function imprimirQR() {
    const canvas = qrRef.current?.querySelector('canvas');
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const janela  = window.open('', '_blank');
    janela.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/><title>QR Code</title>
      <style>body{font-family:Arial;display:flex;align-items:center;justify-content:center;height:100vh;margin:0}
      .card{border:2px solid #000;padding:16px;border-radius:10px;text-align:center;width:220px}
      img{width:150px;image-rendering:pixelated}.title{font-size:13px;font-weight:bold;margin-bottom:6px}
      .code{font-size:10px;color:#555;margin-bottom:10px}</style></head><body>
      <div class="card"><div class="title">${nomeProd}</div>
      <div class="code">${produto?.QR_CODE || ''}</div>
      <img src="${dataUrl}"/></div>
      <script>document.querySelector('img').onload=()=>{setTimeout(()=>{window.print();window.close();},300);}</script>
      </body></html>`);
    janela.document.close();
  }

  if (!produto) return null;

  const pct = estoqueDispo > 0 ? Math.min((estoqueDispo / (estoqueMinimo * 2)) * 100, 100) : 100;

  return (
    <>
      <div style={s.overlay} onClick={onClose}>
        <div style={s.drawer} onClick={e => e.stopPropagation()}>

          {/* ── Cabeçalho ── */}
          <div style={s.drawerHead}>
            <div style={s.prodHead}>
              <div style={s.prodNome}>{nomeProd}</div>
              <div style={s.prodMeta}>
                <span style={{ ...s.badge, background: status.cor + '18', borderColor: status.cor + '60', color: status.cor }}>
                  {status.label}
                </span>
                <span style={{ ...s.badge, background:'#f0f0f0', borderColor:'#e0e0e0', color:'#666' }}>
                  {produto.UNIDADE || 'UN'}
                </span>
                {produto['CÓDIGO'] && (
                  <span style={{ ...s.badge, background:'#f0f0f0', borderColor:'#e0e0e0', color:'#666' }}>
                    {produto['CÓDIGO']}
                  </span>
                )}
              </div>
            </div>
            <button style={s.closeBtn} onClick={onClose}>✕</button>
          </div>

          {/* ── Corpo ── */}
          <div style={s.drawerBody}>

            {/* ── Botões de ação ── */}
            <div style={{ ...s.actionsRow, marginBottom: 24 }}>
              <button
                style={{ ...s.actionBtn, background:'linear-gradient(135deg,#185FA5,#1a7fd4)', color:'#fff' }}
                onClick={() => onIrTransferencia && onIrTransferencia(produto)}
                onMouseEnter={e => e.currentTarget.style.filter='brightness(1.1)'}
                onMouseLeave={e => e.currentTarget.style.filter='none'}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Transferir
              </button>
              <button
                style={{ ...s.actionBtn, background:'linear-gradient(135deg,#1D9E75,#16c489)', color:'#fff' }}
                onClick={() => onIrReposicao && onIrReposicao(produto)}
                onMouseEnter={e => e.currentTarget.style.filter='brightness(1.1)'}
                onMouseLeave={e => e.currentTarget.style.filter='none'}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12l7-7 7 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Nova Entrada
              </button>
              <button
                style={{ ...s.actionBtn, background:'linear-gradient(135deg,#f59e0b,#d97706)', color:'#fff' }}
                onClick={abrirEdicao}
                onMouseEnter={e => e.currentTarget.style.filter='brightness(1.1)'}
                onMouseLeave={e => e.currentTarget.style.filter='none'}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                Editar
              </button>
            </div>

            {/* ── Estoque atual ── */}
            <div style={s.section}>
              <div style={s.sectionTitle}>
                <span>📊 Estoque atual</span>
                <div style={s.sectionLine} />
              </div>
              <div style={s.statsRow}>
                <div style={{ ...s.statCard, borderColor:'#185FA530', background:'#185FA508' }}>
                  <div style={{ ...s.statVal, color:'#185FA5' }}>{estoqueSala}</div>
                  <div style={{ ...s.statLabel, color:'#185FA5' }}>Estoque na Sala</div>
                </div>
                <div style={{ ...s.statCard, borderColor: status.cor + '50', background: status.cor + '0D' }}>
                  <div style={{ ...s.statVal, color: status.cor }}>{estoqueAtual}</div>
                  <div style={{ ...s.statLabel, color: status.cor }}>Estoque no Galpão</div>
                </div>
                 {/* <div style={{ ...s.statCard, borderColor:'#e0e0e0', background:'var(--color-background-secondary,#f9f9f9)' }}>
                  <div style={{ ...s.statVal, color:'#888' }}>{estoqueMinimo}</div>
                  <div style={s.statLabel}>Mínimo</div>
                </div> */}
                <div style={{ ...s.statCard, borderColor:'#185FA530', background:'#185FA508' }}>
                  <div style={{ ...s.statVal, color:'#185FA5' }}>{Math.max(0, estoqueAtual + estoqueSala )}</div>
                  <div style={{ ...s.statLabel, color:'#185FA5' }}>Disponível</div>
                </div>
              </div>

              {/* Barra de nível */}
              <div style={{ marginTop:12 }}>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'#aaa', marginBottom:4 }}>
                  <span>Nível de estoque</span>
                  <span>{Math.round(pct)}%</span>
                </div>
                <div style={{ height:8, borderRadius:4, background:'#f0f0f0', overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${pct}%`, borderRadius:4, background: pct < 33 ? '#E24B4A' : pct < 66 ? '#EF9F27' : '#1D9E75', transition:'width 0.5s ease' }} />
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'#ccc', marginTop:3 }}>
                  <span>0</span>
                  <span>Mín: {estoqueMinimo}</span>
                  <span>Meta: {estoqueMinimo * 2}</span>
                </div>
              </div>
            </div>

            {/* ── Resumo de movimentações ── */}
            <div style={s.section}>
              <div style={s.sectionTitle}>
                <span>📈 Movimentações</span>
                <div style={s.sectionLine} />
              </div>

              {/* Seletor de período */}
              <div style={s.periodTabs}>
                {[7, 15, 30].map(p => (
                  <button
                    key={p}
                    style={{
                      ...s.periodTab,
                      background: periodo === p ? '#185FA5' : 'transparent',
                      color: periodo === p ? '#fff' : 'var(--color-text-secondary,#888)',
                    }}
                    onClick={() => setPeriodo(p)}
                  >
                    {p}d
                  </button>
                ))}
              </div>

              <div style={s.statsRow}>
                <div style={{ ...s.statCard, borderColor:'#1D9E7540', background:'#1D9E7508' }}>
                  <div style={{ ...s.statVal, color:'#1D9E75' }}>{entradas}</div>
                  <div style={{ ...s.statLabel, color:'#1D9E75' }}>Entradas</div>
                </div>
                <div style={{ ...s.statCard, borderColor:'#E24B4A40', background:'#E24B4A08' }}>
                  <div style={{ ...s.statVal, color:'#E24B4A' }}>{saidas}</div>
                  <div style={{ ...s.statLabel, color:'#E24B4A' }}>Saídas</div>
                </div>
                <div style={{ ...s.statCard, borderColor:'#185FA540', background:'#185FA508' }}>
                  <div style={{ ...s.statVal, color:'#185FA5' }}>{transf}</div>
                  <div style={{ ...s.statLabel, color:'#185FA5' }}>Transf.</div>
                </div>
              </div>

              {/* Gráfico sparkline */}
              {sparkData.some(d => d.saidas > 0) && (
                <div style={{ marginTop:12, padding:'10px 12px', background:'var(--color-background-secondary,#f9f9f9)', borderRadius:10, border:'1px solid var(--color-border-secondary,#f0f0f0)' }}>
                  <div style={{ fontSize:10, color:'#bbb', marginBottom:4, fontWeight:600 }}>SAÍDAS POR DIA — ÚLTIMOS {periodo} DIAS</div>
                  <Sparkline data={sparkData} cor="#E24B4A" altura={38} />
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:9, color:'#ccc', marginTop:2 }}>
                    <span>{sparkData[0]?.label}</span>
                    <span>Hoje</span>
                  </div>
                </div>
              )}

              {movsAtual.length === 0 && (
                <div style={{ padding:'20px', textAlign:'center', color:'#ccc', fontSize:12 }}>
                  Nenhuma movimentação nos últimos {periodo} dias
                </div>
              )}
            </div>

            {/* ── Onde está armazenado ── */}
            <div style={s.section}>
              <div style={s.sectionTitle}>
                <span>📍 Localização no estoque</span>
                <div style={s.sectionLine} />
              </div>
              {locaisComEstoque.length === 0 ? (
                <div style={{ padding:'16px', textAlign:'center', color:'#ccc', fontSize:12, background:'var(--color-background-secondary,#f9f9f9)', borderRadius:10 }}>
                  Nenhuma localização registrada nas movimentações.<br/>
                  <span style={{ fontSize:11, marginTop:4, display:'block' }}>Use "Transferir" para registrar onde o item está.</span>
                </div>
              ) : (
                <div style={s.locaisGrid}>
                  {locaisComEstoque.map(([localId, qty]) => {
                    const info = LOCAIS_MAP[localId];
                    return (
                      <div key={localId} style={s.localRow}>
                        <span style={s.localIcon}>{info?.icon || '📦'}</span>
                        <div style={s.localInfo}>
                          <div style={s.localNome}>{info?.label || localId}</div>
                          {info?.breadcrumb && info.breadcrumb.length > 1 && (
                            <div style={s.localSub}>{info.breadcrumb.slice(0, -1).join(' › ')}</div>
                          )}
                        </div>
                        <div style={s.localQty}>{qty} <span style={{ fontSize:10, color:'#aaa', fontWeight:600 }}>{produto.UNIDADE || 'un'}</span></div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── Top técnicos (últimos 30d) ── */}
            {topTecnicos.length > 0 && (
              <div style={s.section}>
                <div style={s.sectionTitle}>
                  <span>👷 Mais utilizaram (30d)</span>
                  <div style={s.sectionLine} />
                </div>
                <div style={s.actRow}>
                  {topTecnicos.map(([nome, qty]) => (
                    <div key={nome} style={s.actItem}>
                      <div style={s.actLabel} title={nome}>{nome.split(' ')[0]}</div>
                      <div style={s.actBar}>
                        <div style={{ ...s.actFill, width:`${(qty/maxTec)*100}%`, background:'#185FA5' }} />
                      </div>
                      <div style={s.actVal}>{qty}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Histórico recente ── */}
            <div style={s.section}>
              <div style={s.sectionTitle}>
                <span>🕑 Histórico recente</span>
                <div style={s.sectionLine} />
              </div>
              {ultimasMovs.length === 0 ? (
                <div style={{ padding:'16px', textAlign:'center', color:'#ccc', fontSize:12 }}>Sem histórico</div>
              ) : (
                <div style={s.histList}>
                  {ultimasMovs.map((m, i) => {
                    const isEntrada = m.TIPO === 'ENTRADA';
                    const isTransf  = m.STATUS === 'TRANSFERÊNCIA';
                    const cor = isTransf ? '#185FA5' : isEntrada ? '#1D9E75' : '#E24B4A';
                    const label = isTransf ? 'TRANSF' : isEntrada ? 'ENTRADA' : 'SAÍDA';
                    return (
                      <div key={i} style={s.histItem}>
                        <div style={{ ...s.histType, background: cor + '18', color: cor, border:`1px solid ${cor}50` }}>{label}</div>
                        <div style={s.histInfo}>
                          <div style={{ fontSize:12, fontWeight:700, color:'var(--color-text-primary,#111)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                            {m.TÉCNICO || m.tecnico || '—'}
                          </div>
                          {m.STATUS && m.STATUS !== 'TRANSFERÊNCIA' && (
                            <div style={s.histProd}>{m.STATUS}</div>
                          )}
                          {m.OBSERVAÇÕES && (
                            <div style={{ ...s.histProd, fontSize:10 }}>{m.OBSERVAÇÕES}</div>
                          )}
                        </div>
                        <div style={{ ...s.histQty, color: isEntrada ? '#1D9E75' : '#E24B4A' }}>
                          {isEntrada ? '+' : '-'}{Number(m.QUANTIDADE)||0}
                        </div>
                        <div style={s.histData}>{fmtData(m.DATA)}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── QR Code ── */}
            <div style={s.section}>
              <div style={s.sectionTitle}>
                <span>🔲 QR Code</span>
                <div style={s.sectionLine} />
              </div>
              <div style={s.qrBox}>
                <div ref={qrRef} style={{ flexShrink:0 }}>
                  {produto.QR_CODE && (
                    <QRCodeCanvas value={produto.QR_CODE} size={80} level="M" />
                  )}
                </div>
                <div style={s.qrInfo}>
                  <div style={s.qrLabel}>Código QR do produto</div>
                  <div style={s.qrCode}>{produto.QR_CODE || '—'}</div>
                  {produto['CÓDIGO'] && (
                    <>
                      <div style={{ ...s.qrLabel, marginTop:6 }}>Código de barras</div>
                      <div style={s.qrCode}>{produto['CÓDIGO']}</div>
                    </>
                  )}
                </div>
                <button
                  style={{ ...s.actionBtn, flex:'none', padding:'8px 14px', fontSize:12, background:'var(--color-background-secondary,#f5f5f5)', color:'var(--color-text-primary,#333)' }}
                  onClick={imprimirQR}
                  title="Imprimir QR Code"
                  onMouseEnter={e => e.currentTarget.style.background='#e8e8e8'}
                  onMouseLeave={e => e.currentTarget.style.background='var(--color-background-secondary,#f5f5f5)'}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><polyline points="6 9 6 2 18 2 18 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><rect x="6" y="14" width="12" height="8" rx="1" stroke="currentColor" strokeWidth="1.8"/></svg>
                  Imprimir
                </button>
              </div>
            </div>

            {/* ── Informações adicionais ── */}
            <div style={s.section}>
              <div style={s.sectionTitle}>
                <span>ℹ️ Informações</span>
                <div style={s.sectionLine} />
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
                {[
                  { label:'ID',             val: produto.ID            || '—' },
                  { label:'Nome',           val: nomeProd                     },
                  { label:'Unidade',        val: produto.UNIDADE       || '—' },
                  { label:'Estoque atual',  val: estoqueAtual                 },
                  { label:'Estoque mínimo', val: estoqueMinimo                },
                  { label:'Status',         val: status.label                 },
                  { label:'Cód. QR',        val: produto.QR_CODE       || '—' },
                  { label:'Cód. Barras',    val: produto['CÓDIGO']     || '—' },
                ].map(({ label, val }) => (
                  <div key={label} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid var(--color-border-secondary,#f5f5f5)', fontSize:12 }}>
                    <span style={{ color:'var(--color-text-secondary,#888)', fontWeight:600 }}>{label}</span>
                    <span style={{ color:'var(--color-text-primary,#111)', fontWeight:700 }}>{val}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>{/* fim drawerBody */}
        </div>{/* fim drawer */}
      </div>{/* fim overlay */}

      {/* Scanner QR */}
      {showScanner && <QRScanner onDetected={handleQRDetected} onClose={() => setShowScanner(false)} />}

      {/* ── MODAL EDITAR PRODUTO ── */}
      {showEditModal && (
        <div style={{ ...s.overlay, alignItems:'center', justifyContent:'center' }} onClick={() => setShowEditModal(false)}>
          <div style={{ ...s.drawer, height:'auto', maxHeight:'90vh', width:'min(500px, 100vw)' }} onClick={e => e.stopPropagation()}>
            <div style={{ ...s.drawerHead, borderBottom:'1px solid var(--color-border-secondary,#f0f0f0)' }}>
              <div style={{ fontSize:16, fontWeight:800, color:'var(--color-text-primary,#111)' }}>Editar Produto</div>
              <button style={s.closeBtn} onClick={() => setShowEditModal(false)}>✕</button>
            </div>
            <div style={{ ...s.drawerBody, padding:'20px 24px' }}>
              {feedbackEdit && <div className="feedback error" style={{ marginBottom:16 }}>{feedbackEdit}</div>}

              {/* Identificação */}
              <div className="form-section-title" style={{ marginBottom:14 }}>Identificação</div>
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
                    {['PACOTE', 'UN', 'MT', 'KG', 'LT'].map(u => <option key={u}>{u}</option>)}
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
              <div className="form-section-title" style={{ marginBottom:14 }}>Estoque</div>
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

              <div className="modal-nav" style={{ marginTop:24 }}>
                <button className="btn-step" onClick={() => setShowEditModal(false)}>Cancelar</button>
                <button className="btn-step success" onClick={salvarEdicao} disabled={loadingEdit}>
                  {loadingEdit ? 'Salvando...' : '✓ Salvar Alterações'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(32px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </>
  );
}