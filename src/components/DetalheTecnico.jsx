// src/components/DetalheTecnico.jsx
// Dashboard completo do técnico — abre como modal/drawer sobre a página de Técnicos

import React, { useState, useMemo } from 'react';
import { useApp } from '../AppContext';

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
      return new Date(+y, +m - 1, +d);
    }
    if (val.includes('-')) {
      const [y, m, d] = val.split('-').map(Number);
      return new Date(y, m - 1, d);
    }
  }
  const dt = new Date(val);
  return isNaN(dt) ? null : dt;
}

function fmtData(val) {
  const d = parseData(val);
  if (!d || isNaN(d)) return '—';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function nomeCurto(nome = '') {
  const parts = nome.trim().split(' ');
  if (parts.length <= 1) return nome;
  return `${parts[0]} ${parts[parts.length - 1]}`;
}

function iniciais(nome = '') {
  const parts = nome.trim().split(' ').filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function movsPeriodo(movimentacoes, nomeTec, diasAtras) {
  const limite = subDias(diasAtras);

  return movimentacoes.filter(m => {
    const nomeMov = (m.TÉCNICO || '').trim().toLowerCase();
    const nomeSel = (nomeTec || '').trim().toLowerCase();

    if (nomeMov !== nomeSel) return false;

    if (m.TIPO && m.TIPO !== 'SAIDA') return false;
    if (m.STATUS === 'TRANSFERÊNCIA') return false;

    const d = parseData(m.DATA);
    return d && d >= limite;
  });
}

function todasMovs(movimentacoes, nomeTec) {
  return movimentacoes.filter(m => {
    const nomeMov = (m.TÉCNICO || '').trim().toLowerCase();
    const nomeSel = (nomeTec || '').trim().toLowerCase();

    return (
      nomeMov === nomeSel &&
      m.TIPO !== 'TRANSFERÊNCIA'
    );
  });
}

// Gera pontos do gráfico de barras por semana (últimos N dias)
function movsPorDia(movs, dias) {
  const result = [];
  for (let i = dias - 1; i >= 0; i--) {
    const d = subDias(i);
    const dStr = d.toISOString().split('T')[0];
    const qty = movs.filter(m => {
      const md = parseData(m.DATA);
      return md && md.toISOString().split('T')[0] === dStr;
    }).reduce((a, m) => a + (Number(m.QUANTIDADE) || 0), 0);
    result.push({
      label: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      dia: d,
      qty,
    });
  }
  return result;
}

// ─── Gráfico de barras SVG ────────────────────────────────────────────────────

function BarChart({ data, cor = '#185FA5', altura = 80 }) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data.map(d => d.qty), 1);
  const W = 560, H = altura, padX = 2, padY = 6;
  const barW = (W - padX * 2) / data.length - 3;

  return (
    <svg viewBox={`0 0 ${W} ${H + 18}`} style={{ width: '100%', height: altura + 18 }}>
      {data.map((d, i) => {
        const barH = Math.max((d.qty / max) * (H - padY), d.qty > 0 ? 3 : 0);
        const x = padX + i * ((W - padX * 2) / data.length);
        const y = H - barH;
        const isToday = i === data.length - 1;
        return (
          <g key={i}>
            <rect
              x={x + 1} y={y} width={barW} height={barH}
              rx={3}
              fill={isToday ? cor : cor + '70'}
            >
              <title>{d.label}: {d.qty} un.</title>
            </rect>
            {/* Label dias selecionados */}
            {(i === 0 || i === Math.floor(data.length / 2) || i === data.length - 1) && (
              <text x={x + barW / 2} y={H + 14} textAnchor="middle" fontSize="8" fill="#bbb">
                {d.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ─── Anel de progresso SVG ────────────────────────────────────────────────────

function RingProgress({ pct, cor, size = 56, stroke = 6 }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(pct, 1));
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f0f0f0" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={cor} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
      />
    </svg>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const s = {
  overlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(10,14,26,0.55)',
    backdropFilter: 'blur(3px)',
    zIndex: 1000,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 16,
  },
  modal: {
    width: 'min(780px, 100vw)',
    maxHeight: 'calc(100vh - 32px)',
    background: 'var(--color-background-primary, #fff)',
    borderRadius: 20,
    boxShadow: '0 32px 80px rgba(0,0,0,0.22)',
    display: 'flex', flexDirection: 'column',
    overflow: 'hidden',
    animation: 'dtFadeIn 0.22s ease',
  },

  // ── Cabeçalho ──
  head: {
    padding: '0 24px',
    background: 'linear-gradient(135deg, #0f2544 0%, #185FA5 100%)',
    flexShrink: 0,
    position: 'relative',
    overflow: 'hidden',
  },
  headBg: {
    position: 'absolute', inset: 0,
    backgroundImage: 'radial-gradient(circle at 80% 50%, rgba(255,255,255,0.06) 0%, transparent 60%)',
    pointerEvents: 'none',
  },
  headContent: {
    position: 'relative', zIndex: 1,
    paddingTop: 24, paddingBottom: 20,
    display: 'flex', alignItems: 'flex-start', gap: 18,
  },
  avatar: {
    width: 64, height: 64, borderRadius: 18,
    background: 'rgba(255,255,255,0.15)',
    border: '2px solid rgba(255,255,255,0.25)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 22, fontWeight: 900, color: '#fff',
    flexShrink: 0, letterSpacing: '-0.02em',
    backdropFilter: 'blur(4px)',
  },
  headInfo: { flex: 1, minWidth: 0 },
  headNome: {
    fontSize: 20, fontWeight: 900, color: '#fff',
    lineHeight: 1.15, marginBottom: 6, letterSpacing: '-0.02em',
  },
  headMeta: { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' },
  headPill: {
    display: 'inline-flex', alignItems: 'center', gap: 5,
    padding: '3px 10px', borderRadius: 12,
    fontSize: 11, fontWeight: 700,
    background: 'rgba(255,255,255,0.14)',
    color: 'rgba(255,255,255,0.9)',
    border: '1px solid rgba(255,255,255,0.2)',
  },
  headClose: {
    width: 32, height: 32, borderRadius: 9,
    background: 'rgba(255,255,255,0.12)',
    border: '1px solid rgba(255,255,255,0.2)',
    color: 'rgba(255,255,255,0.8)', cursor: 'pointer',
    fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, transition: 'background 0.15s',
  },

  // ── Abas ──
  tabs: {
    display: 'flex', gap: 0,
    padding: '0 24px',
    borderBottom: '1px solid var(--color-border-secondary, #f0f0f0)',
    flexShrink: 0,
    background: 'var(--color-background-primary, #fff)',
  },
  tab: {
    padding: '13px 16px', border: 'none', background: 'none',
    fontSize: 12, fontWeight: 700, cursor: 'pointer',
    color: 'var(--color-text-secondary, #888)',
    borderBottom: '2.5px solid transparent',
    transition: 'all 0.15s', letterSpacing: '0.01em',
  },
  tabActive: { color: '#185FA5', borderBottomColor: '#185FA5' },

  // ── Corpo ──
  body: { flex: 1, overflowY: 'auto', padding: '20px 24px 28px' },

  // ── Período ──
  periodRow: { display: 'flex', gap: 4, marginBottom: 20, width: 'fit-content' },
  periodBtn: {
    padding: '6px 16px', borderRadius: 8, border: 'none',
    fontSize: 12, fontWeight: 700, cursor: 'pointer',
    transition: 'all 0.12s',
    background: 'var(--color-background-secondary, #f5f5f5)',
    color: 'var(--color-text-secondary, #888)',
  },
  periodBtnActive: { background: '#185FA5', color: '#fff', boxShadow: '0 2px 8px rgba(24,95,165,0.3)' },

  // ── Grid de cards de stat ──
  statGrid: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 },
  statCard: {
    padding: '16px', borderRadius: 14, border: '1.5px solid',
    display: 'flex', flexDirection: 'column', gap: 6,
    position: 'relative', overflow: 'hidden',
  },
  statCardBg: { position: 'absolute', inset: 0, opacity: 0.04, pointerEvents: 'none' },
  statVal: { fontSize: 28, fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1 },
  statLabel: { fontSize: 11, fontWeight: 700, opacity: 0.65, letterSpacing: '0.04em', textTransform: 'uppercase' },
  statSub: { fontSize: 11, opacity: 0.5, marginTop: 2 },

  // ── Seção ──
  section: { marginBottom: 22 },
  sectionHead: {
    display: 'flex', alignItems: 'center', gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 11, fontWeight: 800, color: 'var(--color-text-secondary, #999)',
    textTransform: 'uppercase', letterSpacing: '0.08em',
  },
  sectionLine: { flex: 1, height: 1, background: 'var(--color-border-secondary, #f0f0f0)' },

  // ── Gráfico container ──
  chartBox: {
    padding: '14px 16px 8px',
    background: 'var(--color-background-secondary, #f9f9f9)',
    borderRadius: 12,
    border: '1px solid var(--color-border-secondary, #efefef)',
  },
  chartLegend: {
    display: 'flex', justifyContent: 'space-between',
    fontSize: 10, color: '#bbb', marginTop: 4,
  },

  // ── Top produtos ──
  prodRow: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '9px 12px', borderRadius: 10,
    background: 'var(--color-background-secondary, #f9f9f9)',
    border: '1px solid var(--color-border-secondary, #efefef)',
    marginBottom: 5,
  },
  prodRank: {
    width: 22, height: 22, borderRadius: 7,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 11, fontWeight: 900, flexShrink: 0,
  },
  prodNome: { flex: 1, fontSize: 12, fontWeight: 700, color: 'var(--color-text-primary, #111)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  prodBarWrap: { width: 100, flexShrink: 0 },
  prodBar: { height: 6, borderRadius: 3, background: '#f0f0f0', overflow: 'hidden' },
  prodBarFill: { height: '100%', borderRadius: 3, transition: 'width 0.5s ease' },
  prodQty: { width: 36, textAlign: 'right', fontSize: 12, fontWeight: 900, color: '#185FA5', flexShrink: 0 },

  // ── Status por produto (donuts) ──
  statusGrid: { display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10 },
  statusCard: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '12px 14px', borderRadius: 12,
    background: 'var(--color-background-secondary, #f9f9f9)',
    border: '1px solid var(--color-border-secondary, #efefef)',
  },
  statusInfo: { flex: 1, minWidth: 0 },
  statusLabel: { fontSize: 11, fontWeight: 800, color: 'var(--color-text-secondary, #888)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 },
  statusVal: { fontSize: 20, fontWeight: 900, letterSpacing: '-0.03em' },
  statusSub: { fontSize: 10, color: 'var(--color-text-secondary, #aaa)', marginTop: 1 },

  // ── Histórico ──
  histItem: {
    display: 'flex', alignItems: 'flex-start', gap: 10,
    padding: '10px 12px', borderRadius: 10,
    background: 'var(--color-background-secondary, #f9f9f9)',
    border: '1px solid var(--color-border-secondary, #efefef)',
    marginBottom: 5,
  },
  histDot: { width: 8, height: 8, borderRadius: '50%', flexShrink: 0, marginTop: 4 },
  histInfo: { flex: 1, minWidth: 0 },
  histProd: { fontSize: 12, fontWeight: 700, color: 'var(--color-text-primary, #111)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  histMeta: { fontSize: 11, color: 'var(--color-text-secondary, #aaa)', marginTop: 2 },
  histRight: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, flexShrink: 0 },
  histQty: { fontSize: 13, fontWeight: 900, color: '#E24B4A' },
  histData: { fontSize: 10, color: '#bbb' },

  // ── Empty state ──
  empty: {
    padding: '40px 20px', textAlign: 'center',
    color: 'var(--color-text-secondary, #ccc)', fontSize: 13,
  },
};

// ─── CORES por status ──────────────────────────────────────────────────────────

const STATUS_CORES = {
  'NÃO ASSOCIOU': '#E24B4A',
  'TROCA':        '#EF9F27',
  'SOBRA':        '#1D9E75',
  'PERDIDO':      '#888780',
};

// ─── Componente ───────────────────────────────────────────────────────────────

export default function DetalheTecnico({ tecnico, onClose }) {
  const { dados } = useApp();
  const movimentacoes = dados?.movimentacoes || [];

  const [periodo, setPeriodo] = useState(7);
  const [aba, setAba]         = useState('dashboard');

  const nomeTec = tecnico?.['NOME COMPLETO'] || tecnico?.TÉCNICO || '';
const idTec   = tecnico?.ID;
  const placa   = tecnico?.PLACA   || '—';
  const status  = tecnico?.STATUS  || '—';

  // ── Dados calculados por período ──────────────────────────────────────────

 const movsP  = useMemo(
  () => movsPeriodo(movimentacoes, nomeTec, periodo),
  [movimentacoes, nomeTec, periodo] 
);

const movs7  = useMemo(
  () => movsPeriodo(movimentacoes, nomeTec, 7),
  [movimentacoes, nomeTec]
);

const movs15 = useMemo(
  () => movsPeriodo(movimentacoes, nomeTec, 15),
  [movimentacoes, nomeTec]
);

const movs30 = useMemo(
  () => movsPeriodo(movimentacoes, nomeTec, 30),
  [movimentacoes, nomeTec]
);

const todasP = useMemo(
  () => todasMovs(movimentacoes, nomeTec),
  [movimentacoes, nomeTec]
);
  const totalUnidP    = movsP.reduce((a, m) => a + (Number(m.QUANTIDADE) || 0), 0);
  const totalItensP   = movsP.length;
  const diasComMovP   = new Set(movsP.map(m => parseData(m.DATA)?.toISOString().split('T')[0])).size;
  const mediadiaria   = diasComMovP > 0 ? (totalUnidP / diasComMovP).toFixed(1) : '0';

  // totais comparativos
  const total7  = movs7.reduce((a, m)  => a + (Number(m.QUANTIDADE) || 0), 0);
  const total15 = movs15.reduce((a, m) => a + (Number(m.QUANTIDADE) || 0), 0);
  const total30 = movs30.reduce((a, m) => a + (Number(m.QUANTIDADE) || 0), 0);

  // Gráfico de barras (saídas por dia)
  const barData = useMemo(() => movsPorDia(movsP, periodo), [movsP, periodo]);

  // Top produtos mais retirados
  const prodMap = {};
  movsP.forEach(m => {
    const p = m.PRODUTO || '—';
    prodMap[p] = (prodMap[p] || 0) + (Number(m.QUANTIDADE) || 0);
  });
  const topProdutos = Object.entries(prodMap).sort(([, a], [, b]) => b - a).slice(0, 8);
  const maxProd = topProdutos[0]?.[1] || 1;

  // Distribuição de status
  const statusMap = {};
  movsP.forEach(m => {
    const st = m.STATUS || 'SEM STATUS';
    statusMap[st] = (statusMap[st] || 0) + (Number(m.QUANTIDADE) || 0);
  });
  const totalStatus = Object.values(statusMap).reduce((a, b) => a + b, 0) || 1;

  // Histórico completo (recente)
  const historico = [...todasP]
    .sort((a, b) => {
      const da = parseData(a.DATA), db = parseData(b.DATA);
      return (db || 0) - (da || 0);
    })
    .slice(0, 40);

  // Histórico filtrado pelo período (para aba histórico)
  const historicoP = [...movsP]
    .sort((a, b) => {
      const da = parseData(a.DATA), db = parseData(b.DATA);
      return (db || 0) - (da || 0);
    });

  // Dias ativo (dias distintos com saída, ever)
  const diasAtivo = new Set(todasP.map(m => parseData(m.DATA)?.toISOString().split('T')[0]).filter(Boolean)).size;

  // Produto favorito
  const prodFav = topProdutos[0]?.[0] || '—';

  if (!tecnico) return null;

  const abas = [
    { id: 'dashboard', label: '📊 Dashboard' },
    { id: 'produtos',  label: '📦 Produtos'  },
    { id: 'historico', label: '🕑 Histórico'  },
  ];

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>

        {/* ── Cabeçalho ── */}
        <div style={s.head}>
          <div style={s.headBg} />
          <div style={s.headContent}>
            <div style={s.avatar}>{iniciais(nomeTec)}</div>
            <div style={s.headInfo}>
              <div style={s.headNome}>{nomeTec}</div>
              <div style={s.headMeta}>
                <span style={s.headPill}>🚗 {placa}</span>
                <span style={{
                  ...s.headPill,
                  background: status === 'ATIVO' ? 'rgba(29,158,117,0.3)' : 'rgba(226,75,74,0.3)',
                  borderColor: status === 'ATIVO' ? 'rgba(29,158,117,0.5)' : 'rgba(226,75,74,0.5)',
                }}>
                  {status === 'ATIVO' ? '✓' : '✗'} {status}
                </span>
                <span style={s.headPill}>🗓️ {diasAtivo} dia{diasAtivo !== 1 ? 's' : ''} ativo</span>
                <span style={s.headPill}>📦 {todasP.reduce((a, m) => a + (Number(m.QUANTIDADE)||0), 0)} un. total</span>
              </div>
            </div>
            <button style={s.headClose} onClick={onClose}
              onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.22)'}
              onMouseLeave={e => e.currentTarget.style.background='rgba(255,255,255,0.12)'}
            >✕</button>
          </div>

          {/* Mini comparativo rápido no header 
          <div style={{ position:'relative', zIndex:1, display:'flex', gap:0, paddingBottom:16 }}>
            {[
              { label: '7 dias', val: total7  },
              { label: '15 dias', val: total15 },
              { label: '30 dias', val: total30 },
            ].map(({ label, val }) => (
              <div key={label} style={{ flex:1, textAlign:'center', padding:'8px 0', borderRight:'1px solid rgba(255,255,255,0.1)', ':last-child':{ borderRight:'none' } }}>
                <div style={{ fontSize:18, fontWeight:900, color:'#fff', letterSpacing:'-0.03em' }}>{val}</div>
                <div style={{ fontSize:10, color:'rgba(255,255,255,0.5)', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', marginTop:1 }}>un. {label}</div>
              </div>
            ))}
          </div>*/}
        </div>

        {/* ── Abas ── */}
        <div style={s.tabs}>
          {abas.map(a => (
            <button
              key={a.id}
              style={{ ...s.tab, ...(aba === a.id ? s.tabActive : {}) }}
              onClick={() => setAba(a.id)}
            >
              {a.label}
            </button>
          ))}
        </div>

        {/* ── Corpo ── */}
        <div style={s.body}>

          {/* Seletor de período (aparece em todas as abas) */}
          <div style={s.periodRow}>
            {[7, 15, 30].map(p => (
              <button
                key={p}
                style={{ ...s.periodBtn, ...(periodo === p ? s.periodBtnActive : {}) }}
                onClick={() => setPeriodo(p)}
              >
                {p} dias
              </button>
            ))}
          </div>

          {/* ═══════════════════════════════════════════════ ABA DASHBOARD */}
          {aba === 'dashboard' && (
            <>
              {/* Cards de resumo 
              <div style={s.statGrid}>
                <div style={{ ...s.statCard, borderColor:'#185FA530', background:'#185FA508' }}>
                  <div style={{ ...s.statVal, color:'#185FA5' }}>{totalUnidP}</div>
                  <div style={{ ...s.statLabel, color:'#185FA5' }}>Unidades retiradas</div>
                  <div style={s.statSub}>{totalItensP} retirada{totalItensP !== 1 ? 's' : ''} no período</div>
                </div>
                <div style={{ ...s.statCard, borderColor:'#1D9E7530', background:'#1D9E7508' }}>
                  <div style={{ ...s.statVal, color:'#1D9E75' }}>{diasComMovP}</div>
                  <div style={{ ...s.statLabel, color:'#1D9E75' }}>Dias com atividade</div>
                  <div style={s.statSub}>Média {mediadiaria} un./dia</div>
                </div>
                <div style={{ ...s.statCard, borderColor:'#EF9F2730', background:'#EF9F2708' }}>
                  <div style={{ ...s.statVal, color:'#EF9F27' }}>{topProdutos.length}</div>
                  <div style={{ ...s.statLabel, color:'#EF9F27' }}>Produtos diferentes</div>
                  <div style={s.statSub}>Mais usado: {nomeCurto(prodFav)}</div>
                </div>
              </div>
*/}
              {/* Gráfico de barras diário 
              <div style={s.section}>
                <div style={s.sectionHead}>
                  <span style={s.sectionTitle}>📅 Retiradas por dia</span>
                  <div style={s.sectionLine} />
                </div>
                <div style={s.chartBox}>
                  {barData.some(d => d.qty > 0) ? (
                    <>
                      <BarChart data={barData} cor="#185FA5" altura={72} />
                      <div style={s.chartLegend}>
                        <span>{barData[0]?.label}</span>
                        <span>Hoje</span>
                      </div>
                    </>
                  ) : (
                    <div style={{ padding:'24px', textAlign:'center', color:'#ccc', fontSize:12 }}>
                      Nenhuma retirada nos últimos {periodo} dias
                    </div>
                  )}
                </div>
              </div>
*/}
              {/* Distribuição de status */}
              <div style={s.section}>
                <div style={s.sectionHead}>
                  <span style={s.sectionTitle}>🏷️ Distribuição por status</span>
                  <div style={s.sectionLine} />
                </div>
                {Object.keys(statusMap).length === 0 ? (
                  <div style={s.empty}>Sem dados no período</div>
                ) : (
                  <div style={s.statusGrid}>
                    {Object.entries(statusMap).map(([st, qty]) => {
                      const cor = STATUS_CORES[st] || '#888';
                      const pct = qty / totalStatus;
                      return (
                        <div key={st} style={s.statusCard}>
                          <RingProgress pct={pct} cor={cor} size={52} stroke={5} />
                          <div style={s.statusInfo}>
                            <div style={s.statusLabel}>{st}</div>
                            <div style={{ ...s.statusVal, color: cor }}>{qty}</div>
                            <div style={s.statusSub}>{(pct * 100).toFixed(0)}% do total</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Top 5 produtos */}
              <div style={s.section}>
                <div style={s.sectionHead}>
                  <span style={s.sectionTitle}>🏆 Top produtos retirados</span>
                  <div style={s.sectionLine} />
                </div>
                {topProdutos.length === 0 ? (
                  <div style={s.empty}>Sem dados no período</div>
                ) : (
                  topProdutos.slice(0, 5).map(([nome, qty], i) => {
                    const cores = ['#185FA5', '#1D9E75', '#EF9F27', '#E24B4A', '#7C4DFF'];
                    const cor = cores[i % cores.length];
                    return (
                      <div key={nome} style={s.prodRow}>
                        <div style={{ ...s.prodRank, background: cor + '18', color: cor }}>
                          {i + 1}
                        </div>
                        <div style={s.prodNome} title={nome}>{nome}</div>
                        <div style={s.prodBarWrap}>
                          <div style={s.prodBar}>
                            <div style={{ ...s.prodBarFill, width: `${(qty / maxProd) * 100}%`, background: cor }} />
                          </div>
                        </div>
                        <div style={s.prodQty}>{qty}</div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}

          {/* ═══════════════════════════════════════════════ ABA PRODUTOS */}
          {aba === 'produtos' && (
            <>
              <div style={s.section}>
                <div style={s.sectionHead}>
                  <span style={s.sectionTitle}>📦 Todos os produtos retirados</span>
                  <div style={s.sectionLine} />
                  <span style={{ fontSize:11, color:'#aaa', fontWeight:600 }}>{topProdutos.length} produto{topProdutos.length !== 1 ? 's' : ''}</span>
                </div>
                {topProdutos.length === 0 ? (
                  <div style={s.empty}>Nenhum produto retirado nos últimos {periodo} dias</div>
                ) : (
                  topProdutos.map(([nome, qty], i) => {
                    const cores = ['#185FA5', '#1D9E75', '#EF9F27', '#E24B4A', '#7C4DFF', '#00BCD4', '#FF5722', '#9C27B0'];
                    const cor = cores[i % cores.length];
                    return (
                      <div key={nome} style={s.prodRow}>
                        <div style={{ ...s.prodRank, background: cor + '18', color: cor }}>{i + 1}</div>
                        <div style={s.prodNome} title={nome}>{nome}</div>
                        <div style={{ ...s.prodBarWrap, width: 140 }}>
                          <div style={s.prodBar}>
                            <div style={{ ...s.prodBarFill, width:`${(qty/maxProd)*100}%`, background: cor }} />
                          </div>
                        </div>
                        <div style={s.prodQty}>{qty} <span style={{ fontSize:10, color:'#ccc', fontWeight:600 }}>un</span></div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Gráfico de barras por produto (top 8) */}
              {topProdutos.length > 0 && (
                <div style={s.section}>
                  <div style={s.sectionHead}>
                    <span style={s.sectionTitle}>📅 Volume por dia</span>
                    <div style={s.sectionLine} />
                  </div>
                  <div style={s.chartBox}>
                    {barData.some(d => d.qty > 0) ? (
                      <>
                        <BarChart data={barData} cor="#1D9E75" altura={72} />
                        <div style={s.chartLegend}>
                          <span>{barData[0]?.label}</span>
                          <span>Hoje</span>
                        </div>
                      </>
                    ) : (
                      <div style={{ padding:'24px', textAlign:'center', color:'#ccc', fontSize:12 }}>
                        Sem movimentação no período
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ═══════════════════════════════════════════════ ABA HISTÓRICO */}
          {aba === 'historico' && (
            <div style={s.section}>
              <div style={s.sectionHead}>
                <span style={s.sectionTitle}>🕑 Histórico de retiradas</span>
                <div style={s.sectionLine} />
                <span style={{ fontSize:11, color:'#aaa', fontWeight:600 }}>{historicoP.length} registro{historicoP.length !== 1 ? 's' : ''}</span>
              </div>
              {historicoP.length === 0 ? (
                <div style={s.empty}>Nenhuma retirada nos últimos {periodo} dias</div>
              ) : (
                historicoP.map((m, i) => {
                  const st = m.STATUS || '—';
                  const cor = STATUS_CORES[st] || '#888';
                  return (
                    <div key={i} style={s.histItem}>
                      <div style={{ ...s.histDot, background: cor }} />
                      <div style={s.histInfo}>
                        <div style={s.histProd}>{m.PRODUTO || '—'}</div>
                        <div style={s.histMeta}>
                          <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'2px 7px', borderRadius:5, background: cor+'18', color: cor, fontSize:10, fontWeight:800 }}>
                            {st}
                          </span>
                          {m.PLACA && <span style={{ color:'#ccc', fontSize:10, marginLeft:4 }}>🚗 {m.PLACA}</span>}
                          {m.OBSERVAÇÕES && <span style={{ color:'#bbb', fontSize:10, marginLeft:4, fontStyle:'italic' }}>"{m.OBSERVAÇÕES}"</span>}
                        </div>
                      </div>
                      <div style={s.histRight}>
                        <div style={s.histQty}>−{Number(m.QUANTIDADE)||0}</div>
                        <div style={s.histData}>{fmtData(m.DATA)}</div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

        </div>{/* fim body */}
      </div>{/* fim modal */}

      <style>{`
        @keyframes dtFadeIn {
          from { opacity: 0; transform: scale(0.97) translateY(10px); }
          to   { opacity: 1; transform: scale(1)    translateY(0); }
        }
      `}</style>
    </div>
  );
}