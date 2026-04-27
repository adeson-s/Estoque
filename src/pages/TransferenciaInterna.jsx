// src/pages/TransferenciaInterna.jsx
import React, { useState, useRef } from 'react';
import { useApp } from '../AppContext';
import PageHeader from '../components/PageHeader';
import LocalStepper from '../components/Localstepper';
import SheetsService from '../services/SheetsService';
import { LOCAIS_MAP } from '../data/localHierarchy';

/* ─── helpers ─────────────────────────────────────────── */
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
function hoje() { return new Date().toISOString().split('T')[0]; }
function fmtData(d) {
  if (!d) return '—';
  const [y,m,day] = d.split('-');
  return `${day}/${m}/${y}`;
}



/* ─── styles ───────────────────────────────────────────── */
const s = {
  /* layout */
  root: { padding: '0 16px 60px', maxWidth: 1320, margin: '0 auto', fontFamily: "'DM Sans', system-ui, sans-serif" },
  /* tabs */
  tabBar: { display: 'flex', gap: 0, marginBottom: 24, borderBottom: '2px solid #e5e7eb', userSelect: 'none' },
  tab: (active) => ({
    padding: '10px 22px',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    border: 'none',
    background: 'none',
    color: active ? '#185FA5' : '#888',
    borderBottom: active ? '2.5px solid #185FA5' : '2.5px solid transparent',
    marginBottom: -2,
    transition: 'all 0.15s',
    letterSpacing: '-0.01em',
    display: 'flex',
    alignItems: 'center',
    gap: 7,
  }),
  /* cards */
  card: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '20px', marginBottom: 18, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' },
  /* row */
  topRow: { display: 'flex', gap: 14, alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: 18 },
  field: (flex = 1, minW = 160) => ({ display: 'flex', flexDirection: 'column', gap: 5, flex, minWidth: minW }),
  label: { fontSize: 11, fontWeight: 700, color: '#666', textTransform: 'uppercase', letterSpacing: '0.06em' },
  input: (highlight) => ({
    padding: '8px 12px',
    borderRadius: 8,
    border: `1.5px solid ${highlight ? '#185FA580' : '#e0e0e0'}`,
    fontSize: 13,
    background: highlight ? '#F0F7FF' : '#f9f9f9',
    color: '#111',
    outline: 'none',
    fontFamily: 'inherit',
    width: '100%',
    boxSizing: 'border-box',
  }),
  /* locais row */
  locaisRow: { display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 16, alignItems: 'start' },
  localBox: (c, bg) => ({ border: `1.5px solid ${c}`, borderRadius: 12, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10, background: bg }),
  localBoxLabel: (c) => ({ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: c }),
  arrowCol: { display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 16, flexShrink: 0 },
  arrowCircle: { width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, #185FA5, #1a7fd4)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(24,95,165,0.3)' },
  /* route bar */
  routeBar: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', background: 'linear-gradient(135deg,#FFF8E1,#E8F5E9)', borderRadius: 10, border: '1px solid #e0e0e0', marginBottom: 20, flexWrap: 'wrap' },
  routePill: (bg, bc, c) => ({ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 16, fontSize: 12, fontWeight: 700, background: bg, border: `1.5px solid ${bc}`, color: c }),
  /* body grid */
  body: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' },
  /* prod col */
  prodCol: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' },
  prodColHead: { padding: '14px 16px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, background: '#fafafa' },
  colTitle: { fontSize: 13, fontWeight: 800, color: '#111', display: 'flex', alignItems: 'center', gap: 8, letterSpacing: '-0.01em' },
  countBadge: { background: '#185FA5', color: '#fff', borderRadius: 10, padding: '2px 9px', fontSize: 11, fontWeight: 800 },
  searchRow: { padding: '10px 12px', borderBottom: '1px solid #f0f0f0', position: 'relative' },
  searchIcon: { position: 'absolute', left: 24, top: '50%', transform: 'translateY(-50%)', color: '#aaa', pointerEvents: 'none' },
  searchInput: { width: '100%', padding: '8px 32px 8px 38px', borderRadius: 8, border: '1.5px solid #ebebeb', fontSize: 13, background: '#f7f7f7', color: '#111', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' },
  searchClear: { position: 'absolute', right: 20, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#bbb', cursor: 'pointer', fontSize: 14, padding: 3, borderRadius: 4, lineHeight: 1 },
  prodList: { maxHeight: 500, overflowY: 'auto', padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 5 },
  /* dest col */
  destCol: { display: 'flex', flexDirection: 'column', gap: 14 },
  dropCard: (over, hasItems) => ({ border: `2px dashed ${over ? '#185FA5' : hasItems ? '#185FA545' : '#ddd'}`, borderRadius: 14, overflow: 'hidden', minHeight: 280, display: 'flex', flexDirection: 'column', background: over ? '#EAF2FC' : hasItems ? '#F8FBFF' : '#fff', transition: 'all 0.15s', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }),
  dropHead: (over, hasItems) => ({ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, background: over ? '#D6E9F8' : hasItems ? '#EFF6FF' : '#fafafa', borderBottom: hasItems ? '1px solid #185FA520' : '1px solid transparent' }),
  dropEmpty: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '36px 24px', textAlign: 'center', gap: 12 },
  dropList: { padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 7, overflowY: 'auto', maxHeight: 460 },
  destItem: { display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', borderRadius: 9, background: '#fff', border: '1.5px solid #185FA525' },
  destNome: { flex: 1, fontSize: 12, fontWeight: 700, color: '#111', lineHeight: 1.3, minWidth: 0 },
  /* qty group with manual input */
  qtyGroup: { display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 },
  qtyBtn: { width: 26, height: 26, borderRadius: 7, border: '1.5px solid #e0e0e0', background: '#f5f5f5', color: '#333', cursor: 'pointer', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, transition: 'all 0.1s', fontWeight: 600 },
  qtyInput: { width: 44, height: 26, borderRadius: 7, border: '1.5px solid #185FA540', textAlign: 'center', fontSize: 13, fontWeight: 800, color: '#185FA5', background: '#F0F7FF', outline: 'none', fontFamily: 'inherit', padding: '0 4px' },
  rmBtn: { width: 24, height: 24, borderRadius: 6, border: 'none', background: '#E24B4A18', color: '#E24B4A', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, marginLeft: 2, transition: 'background 0.1s', flexShrink: 0 },
  /* confirm card */
  confirmCard: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '16px', display: 'flex', flexDirection: 'column', gap: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' },
  metaRow: { display: 'flex', gap: 8, fontSize: 12, flexWrap: 'wrap', alignItems: 'center' },
  metaChip: (bg, c) => ({ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 8, background: bg, color: c, fontWeight: 700, fontSize: 12 }),
  textarea: { width: '100%', padding: '9px 12px', borderRadius: 9, border: '1.5px solid #e5e5e5', fontSize: 13, background: '#f9f9f9', color: '#111', outline: 'none', resize: 'none', boxSizing: 'border-box', fontFamily: 'inherit', lineHeight: 1.5 },
  confirmBtn: (loading) => ({ padding: '12px 24px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#185FA5,#1a7fd4)', color: '#fff', fontSize: 13, fontWeight: 800, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.75 : 1, letterSpacing: '0.02em', boxShadow: '0 3px 10px rgba(24,95,165,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.15s' }),
  feedback: (ok) => ({ padding: '12px 16px', borderRadius: 10, border: `1.5px solid ${ok ? '#1D9E75' : '#E24B4A'}`, fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, background: ok ? '#1D9E7514' : '#E24B4A14', color: ok ? '#0F6E56' : '#A32D2D' }),
  /* history */
  histTable: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  histTh: { padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#666', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '2px solid #e5e7eb', background: '#fafafa', whiteSpace: 'nowrap' },
  histTd: { padding: '10px 14px', borderBottom: '1px solid #f0f0f0', color: '#222', verticalAlign: 'middle' },
  histBadge: (c, bg) => ({ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 8, fontSize: 11, fontWeight: 700, color: c, background: bg, whiteSpace: 'nowrap' }),
  filterRow: { display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' },
  filterInput: { padding: '8px 12px', borderRadius: 8, border: '1.5px solid #e0e0e0', fontSize: 13, background: '#f9f9f9', color: '#111', outline: 'none', fontFamily: 'inherit', minWidth: 180 },
  emptyState: { padding: '56px 24px', textAlign: 'center', color: '#aaa', fontSize: 14 },
};

/* ─── ProdCard ────────────────────────────────────────── */
function ProdCard({ produto, estoque, isDragging, onDragStart, onDragEnd, onAdd, inCart }) {
  const [hover, setHover] = useState(false);
  const cor = corEstoque(estoque);
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 9,
        border: `1.5px solid ${inCart ? '#185FA550' : hover ? '#185FA530' : '#eee'}`,
        background: inCart ? '#F0F7FF' : hover ? '#FAFCFF' : '#fff',
        cursor: 'grab', userSelect: 'none', transition: 'all 0.12s ease',
        opacity: isDragging ? 0.35 : 1,
        boxShadow: hover && !isDragging ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
        transform: hover && !isDragging ? 'translateY(-1px)' : 'none',
      }}
    >
      <span style={{ color: '#ccc', fontSize: 14, letterSpacing: '-1px', flexShrink: 0, cursor: 'grab' }}>⠿</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#111', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={produto}>{produto}</div>
        <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 800, marginTop: 3, background: cor + '18', color: cor }}>
          {estoque > 0 ? `${estoque} un.` : 'Sem estoque'}
        </span>
      </div>
      <button
        style={{ width: 28, height: 28, borderRadius: 7, border: `1.5px solid ${inCart ? '#185FA5' : '#185FA540'}`, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.12s', fontWeight: 700, padding: 0, background: inCart ? '#185FA5' : '#EAF2FC', color: inCart ? '#fff' : '#185FA5' }}
        onClick={onAdd}
        title={inCart ? 'Adicionar mais 1' : 'Adicionar à transferência'}
      >+</button>
    </div>
  );
}

/* ─── ProdCardGrid (view = card com foto) ────────────── */
function ProdCardGrid({ produto, foto, estoque, isDragging, onDragStart, onDragEnd, onAdd, inCart }) {
  const [hover, setHover] = useState(false);
  const [imgErr, setImgErr] = useState(false);
  const cor = corEstoque(estoque);
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        borderRadius: 12,
        border: `1.5px solid ${inCart ? '#185FA560' : hover ? '#185FA530' : '#eee'}`,
        background: inCart ? '#F0F7FF' : hover ? '#FAFCFF' : '#fff',
        cursor: 'grab',
        userSelect: 'none',
        opacity: isDragging ? 0.35 : 1,
        boxShadow: hover && !isDragging ? '0 4px 14px rgba(0,0,0,0.10)' : '0 1px 3px rgba(0,0,0,0.04)',
        transform: hover && !isDragging ? 'translateY(-2px)' : 'none',
        transition: 'all 0.14s ease',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* foto */}
      <div style={{ width: '100%', aspectRatio: '1', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative', flexShrink: 0 }}>
        {foto && !imgErr ? (
          <img src={foto} alt={produto} onError={() => setImgErr(true)}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        ) : (
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.18 }}>
            <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.5"/>
            <circle cx="8.5" cy="8.5" r="1.5" stroke="currentColor" strokeWidth="1.2"/>
            <path d="M3 15l5-4 4 3 3-2.5 6 5.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
        {/* badge estoque sobre a foto */}
        <span style={{ position: 'absolute', top: 6, left: 6, padding: '2px 7px', borderRadius: 6, fontSize: 10, fontWeight: 800, background: cor + 'ee', color: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.15)' }}>
          {estoque > 0 ? `${estoque} un.` : 'Sem estoque'}
        </span>
        {inCart && (
          <span style={{ position: 'absolute', top: 6, right: 6, width: 18, height: 18, borderRadius: '50%', background: '#185FA5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </span>
        )}
      </div>
      {/* info */}
      <div style={{ padding: '8px 10px 10px', display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#111', lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }} title={produto}>{produto}</div>
        <button
          onClick={onAdd}
          style={{ marginTop: 'auto', width: '100%', padding: '6px 0', borderRadius: 7, border: `1.5px solid ${inCart ? '#185FA5' : '#185FA540'}`, background: inCart ? '#185FA5' : '#EAF2FC', color: inCart ? '#fff' : '#185FA5', fontSize: 12, fontWeight: 800, cursor: 'pointer', transition: 'all 0.12s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}
          title={inCart ? 'Adicionar mais 1' : 'Adicionar à transferência'}
        >
          <span style={{ fontSize: 15, lineHeight: 1 }}>+</span>
          {inCart ? 'Mais 1' : 'Adicionar'}
        </button>
      </div>
    </div>
  );
}

/* ─── QtyInput com edição manual ─────────────────────── */
function QtyInput({ value, onChange }) {
  const [editing, setEditing] = useState(false);
  const [raw, setRaw] = useState(String(value));
  const ref = useRef(null);

  function startEdit() { setRaw(String(value)); setEditing(true); setTimeout(() => ref.current?.select(), 10); }
  function commit() {
    const n = parseInt(raw, 10);
    if (!isNaN(n) && n >= 0) onChange(n);
    setEditing(false);
  }

  return (
    <div style={s.qtyGroup}>
      <button style={s.qtyBtn} onClick={() => onChange(value - 1)}
        onMouseEnter={e => e.currentTarget.style.background='#e0e0e0'}
        onMouseLeave={e => e.currentTarget.style.background='#f5f5f5'}>−</button>
      {editing ? (
        <input
          ref={ref}
          type="number"
          min={0}
          value={raw}
          onChange={e => setRaw(e.target.value)}
          onBlur={commit}
          onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false); }}
          style={s.qtyInput}
        />
      ) : (
        <span
          style={{ ...s.qtyInput, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'text', lineHeight: 1 }}
          title="Clique para editar quantidade"
          onClick={startEdit}
        >{value}</span>
      )}
      <button style={s.qtyBtn} onClick={() => onChange(value + 1)}
        onMouseEnter={e => e.currentTarget.style.background='#e0e0e0'}
        onMouseLeave={e => e.currentTarget.style.background='#f5f5f5'}>+</button>
    </div>
  );
}

/* ─── DropZone ────────────────────────────────────────── */
function DropZone({ items, onDrop, onChangeQty, onRemove, destino }) {
  const [over, setOver] = useState(false);
  const destInfo = destino ? LOCAIS_MAP[destino] : null;
  const hasItems = items.length > 0;
  return (
    <div
      onDragOver={e => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={e => { e.preventDefault(); setOver(false); onDrop(); }}
      style={s.dropCard(over, hasItems)}
    >
      <div style={s.dropHead(over, hasItems)}>
        <span style={s.colTitle}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12l7-7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          {destInfo ? (destInfo.shortLabel || destInfo.label) : 'Destino'}
          {hasItems && <span style={s.countBadge}>{items.length}</span>}
        </span>
        {over && <span style={{ fontSize: 11, color: '#185FA5', fontWeight: 700 }}>↓ Soltar aqui</span>}
      </div>
      {hasItems ? (
        <div style={s.dropList}>
          {items.map(([nome, qty]) => (
            <div key={nome} style={s.destItem}>
              <div style={s.destNome} title={nome}>{nome}</div>
              <QtyInput value={qty} onChange={v => onChangeQty(nome, v)} />
              <button style={s.rmBtn} onClick={() => onRemove(nome)}
                onMouseEnter={e => e.currentTarget.style.background='#E24B4A35'}
                onMouseLeave={e => e.currentTarget.style.background='#E24B4A18'}>✕</button>
            </div>
          ))}
        </div>
      ) : (
        <div style={s.dropEmpty}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.18 }}>
            <rect x="3" y="8" width="18" height="13" rx="2" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M8 8V6a4 4 0 018 0v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M12 12v4M10 14h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <p style={{ fontSize: 12, color: '#aaa', lineHeight: 1.5, maxWidth: 200, margin: 0 }}>
            {destInfo
              ? `Arraste ou clique em "+" para adicionar itens em ${destInfo.label || destInfo.shortLabel}`
              : 'Selecione um destino acima, depois arraste ou clique em "+" nos produtos'}
          </p>
        </div>
      )}
    </div>
  );
}

/* ─── Histórico ───────────────────────────────────────── */
function Historico({ historico }) {
  const [busca, setBusca] = useState('');
  const [dataFiltro, setDataFiltro] = useState('');

  const filtrado = historico.filter(h => {
    const texto = `${h.auxiliar} ${h.produto} ${h.origem} ${h.destino} ${h.tituloEmail}`.toLowerCase();
    const okBusca = !busca || texto.includes(busca.toLowerCase());
    const okData  = !dataFiltro || h.data === dataFiltro;
    return okBusca && okData;
  });

  return (
    <div>
      <div style={s.filterRow}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#aaa', pointerEvents: 'none' }}>
            <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.3"/>
            <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
          <input
            type="text"
            placeholder="Buscar por auxiliar, produto, local..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            style={{ ...s.filterInput, paddingLeft: 36, width: '100%', boxSizing: 'border-box' }}
          />
        </div>
        <input type="date" value={dataFiltro} onChange={e => setDataFiltro(e.target.value)} style={s.filterInput} />
        {(busca || dataFiltro) && (
          <button onClick={() => { setBusca(''); setDataFiltro(''); }}
            style={{ padding: '8px 14px', borderRadius: 8, border: '1.5px solid #e0e0e0', background: '#f9f9f9', color: '#666', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
            Limpar filtros
          </button>
        )}
        <span style={{ marginLeft: 'auto', fontSize: 12, color: '#888', fontWeight: 600 }}>{filtrado.length} registro(s)</span>
      </div>

      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
        {filtrado.length === 0 ? (
          <div style={s.emptyState}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.15, display: 'block', margin: '0 auto 12px' }}>
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            {historico.length === 0 ? 'Nenhuma transferência registrada ainda.' : 'Nenhum resultado para os filtros aplicados.'}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={s.histTable}>
              <thead>
                <tr>
                  {['Data','Título / E-mail','Auxiliar','Produto','Quantidade','Origem','Destino'].map(h => (
                    <th key={h} style={s.histTh}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtrado.map((h, i) => {
                  const origemInfo  = LOCAIS_MAP[h.origem];
                  const destinoInfo = LOCAIS_MAP[h.destino];
                  return (
                    <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#fafbfc' }}>
                      <td style={s.histTd}><span style={{ fontVariantNumeric: 'tabular-nums', fontSize: 12, fontWeight: 600, color: '#555' }}>{fmtData(h.data)}</span></td>
                      <td style={s.histTd}>
                        {h.tituloEmail ? (
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#185FA5', maxWidth: 200, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={h.tituloEmail}>
                            📧 {h.tituloEmail}
                          </span>
                        ) : <span style={{ color: '#ccc', fontSize: 12 }}>—</span>}
                      </td>
                      <td style={s.histTd}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700 }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.5"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                          {h.auxiliar}
                        </span>
                      </td>
                      <td style={s.histTd}><span style={{ fontSize: 12, fontWeight: 600 }}>{h.produto}</span></td>
                      <td style={s.histTd}>
                        <span style={s.histBadge('#185FA5','#EAF2FC')}>{h.quantidade} un.</span>
                      </td>
                      <td style={s.histTd}>
                        <span style={s.histBadge('#7A4F00', '#FFF3E0')}>
                          {origemInfo?.icon || '📦'} {origemInfo?.shortLabel || origemInfo?.label || h.origem}
                        </span>
                      </td>
                      <td style={s.histTd}>
                        <span style={s.histBadge('#0A5E3A', '#E8F5E9')}>
                          {destinoInfo?.icon || '📥'} {destinoInfo?.shortLabel || destinoInfo?.label || h.destino}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}


/* ─── Main ────────────────────────────────────────────── */
export default function TransferenciaInterna() {
  const { dados } = useApp();
  const [aba, setAba]           = useState('transferencia'); // 'transferencia' | 'historico'
  const [data, setData]         = useState(hoje());
  const [tituloEmail, setTituloEmail] = useState('');
  const [auxiliar, setAuxiliar] = useState('');
  const [origem, setOrigem]     = useState('');
  const [destino, setDestino]   = useState('');
  const [busca, setBusca]       = useState('');
  const [itens, setItens]       = useState({});
  const [dragProd, setDragProd] = useState(null);
  const [obs, setObs]           = useState('');
  const [loading, setLoading]   = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [historico, setHistorico] = useState([]);
  const [viewMode, setViewMode] = useState('lista'); // 'lista' | 'card'

  const movimentacoes = dados?.movimentacoes || [];
  const produtos      = dados?.produtos      || [];

  const estoqueMap = {};
  produtos.forEach(p => { if (p.PRODUTO) estoqueMap[p.PRODUTO] = calcEstoque(p.PRODUTO, movimentacoes); });

  const prodsFiltrados = produtos.filter(p =>
    p.PRODUTO && (!busca || p.PRODUTO.toLowerCase().includes(busca.toLowerCase()))
  );

  const itensArr  = Object.entries(itens).filter(([, q]) => q > 0);
  const totalUnid = itensArr.reduce((a, [, q]) => a + q, 0);

  function addItem(nome) { setItens(prev => ({ ...prev, [nome]: (prev[nome] || 0) + 1 })); setFeedback(null); }
  function updateQty(nome, qty) {
    if (qty <= 0) { setItens(prev => { const n = { ...prev }; delete n[nome]; return n; }); }
    else { setItens(prev => ({ ...prev, [nome]: qty })); }
  }
  function removeItem(nome) { setItens(prev => { const n = { ...prev }; delete n[nome]; return n; }); }

  function getLocalLabel(loc) {
    if (!loc) return '';
    return LOCAIS_MAP[loc]?.fullLabel || LOCAIS_MAP[loc]?.label || loc;
  }

  async function handleConfirmar() {
    if (!auxiliar.trim())      return setFeedback({ ok: false, msg: 'Informe o nome do auxiliar.' });
    if (!origem)               return setFeedback({ ok: false, msg: 'Selecione o local de origem.' });
    if (!destino)              return setFeedback({ ok: false, msg: 'Selecione o local de destino.' });
    if (origem === destino)    return setFeedback({ ok: false, msg: 'Origem e destino não podem ser iguais.' });
    if (itensArr.length === 0) return setFeedback({ ok: false, msg: 'Adicione ao menos um produto.' });
    setLoading(true); setFeedback(null);

    const origemLabel  = getLocalLabel(origem);
    const destinoLabel = getLocalLabel(destino);
    const descricao    = obs || `Transferência de ${origemLabel} para ${destinoLabel}`;
    const tecnicoStr   = `TRANSFERÊNCIA: ${origemLabel} → ${destinoLabel}`;
    const titulo       = tituloEmail.trim();

    try {
      for (const [nome, qty] of itensArr) {
        const base = { acao:'salvarMovimentacao', data, tecnico: tecnicoStr, auxiliar: auxiliar.trim(), placa:'', produto: nome, quantidade: qty, status:'TRANSFERÊNCIA', observacoes: descricao, localOrigem: origem, localDestino: destino, ...(titulo ? { tituloEmail: titulo } : {}) };
        const r1 = await SheetsService.salvarMovimentacao({ ...base, tipo:'SAIDA' });
        if (!r1.success) throw new Error(r1.error || `Falha saída "${nome}"`);
        const r2 = await SheetsService.salvarMovimentacao({ ...base, tipo:'ENTRADA' });
        if (!r2.success) throw new Error(r2.error || `Falha entrada "${nome}"`);
      }

      // salvar no histórico local
      const novasEntradas = itensArr.map(([nome, qty]) => ({
        data, tituloEmail: titulo, auxiliar: auxiliar.trim(),
        produto: nome, quantidade: qty,
        origem, destino,
      }));
      setHistorico(prev => [...novasEntradas, ...prev]);

      setFeedback({ ok: true, msg: `✓ ${itensArr.length} produto(s) · ${totalUnid} un. transferidos com sucesso!` });
      setItens({}); setObs(''); SheetsService.clearCache();
    } catch(err) {
      setFeedback({ ok: false, msg: 'Erro: ' + err.message });
    } finally { setLoading(false); }
  }

  const origemInfo  = origem  ? LOCAIS_MAP[origem]  : null;
  const destinoInfo = destino ? LOCAIS_MAP[destino] : null;

  const getOrigemColors  = () => origemInfo  ? { border:'#EF9F2780', bg:'#FFFBF0',  labelColor:'#8B5000'  } : { border:'#e5e5e5', bg:'#f7f8fa', labelColor:'#aaa' };
  const getDestinoColors = () => destinoInfo ? { border:'#1D9E7580', bg:'#F0FBF6',  labelColor:'#0A5E3A'  } : { border:'#e5e5e5', bg:'#f7f8fa', labelColor:'#aaa' };
  const oc = getOrigemColors();
  const dc = getDestinoColors();

  return (
    <>
      <PageHeader title="Transferência Interna" subtitle="Mover itens entre locais, prateleiras ou estoques" />
      <div style={s.root}>

        {/* ── Abas ── */}
        <div style={s.tabBar}>
          <button style={s.tab(aba==='transferencia')} onClick={() => setAba('transferencia')}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Nova Transferência
          </button>
          <button style={s.tab(aba==='historico')} onClick={() => setAba('historico')}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            Histórico
            {historico.length > 0 && <span style={{ background:'#185FA5', color:'#fff', borderRadius:10, padding:'1px 7px', fontSize:10, fontWeight:800 }}>{historico.length}</span>}
          </button>
        </div>

        {aba === 'transferencia' && (
          <>
            {/* ── Card do topo ── */}
            <div style={s.card}>
              <div style={s.topRow}>
                {/* Data */}
                <div style={s.field(0, 140)}>
                  <label style={s.label}>Data</label>
                  <input type="date" value={data} onChange={e => setData(e.target.value)} style={s.input(false)} />
                </div>

                {/* Auxiliar */}
                <div style={s.field(1, 200)}>
                  <label style={s.label}>Auxiliar de estoque *</label>
                  <div style={{ position: 'relative' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'#aaa', pointerEvents:'none' }}>
                      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.5"/>
                      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                    <input type="text" value={auxiliar} onChange={e => { setAuxiliar(e.target.value); setFeedback(null); }}
                      placeholder="Nome de quem faz a transferência..."
                      style={{ ...s.input(!!auxiliar.trim()), paddingLeft: 32 }} />
                  </div>
                </div>

                {/* Título do E-mail */}
                <div style={s.field(1.5, 240)}>
                  <label style={s.label}>📧 Título do E-mail <span style={{ fontWeight:400, textTransform:'none', fontSize:10, color:'#bbb' }}>(opcional)</span></label>
                  <div style={{ position: 'relative' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'#aaa', pointerEvents:'none' }}>
                      <rect x="2" y="4" width="20" height="16" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                      <path d="M2 8l10 6 10-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                    <input type="text" value={tituloEmail} onChange={e => setTituloEmail(e.target.value)}
                      placeholder="Ex: Transferência semana 18 – Maricá Galpão..."
                      style={{ ...s.input(!!tituloEmail.trim()), paddingLeft: 32 }} />
                    {tituloEmail && <button onClick={() => setTituloEmail('')} style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'#bbb', cursor:'pointer', fontSize:13, padding:2 }}>✕</button>}
                  </div>
                </div>
              </div>

              {/* Locais */}
              <div style={s.locaisRow}>
                <div style={s.localBox(oc.border, oc.bg)}>
                  <span style={s.localBoxLabel(oc.labelColor)}>📤 Origem</span>
                  <LocalStepper value={origem} onChange={v => { setOrigem(v); setFeedback(null); }} exclude={destino} />
                </div>
                <div style={s.arrowCol}>
                  <div style={s.arrowCircle}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                </div>
                <div style={s.localBox(dc.border, dc.bg)}>
                  <span style={s.localBoxLabel(dc.labelColor)}>📥 Destino</span>
                  <LocalStepper value={destino} onChange={v => { setDestino(v); setFeedback(null); }} exclude={origem} />
                </div>
              </div>
            </div>

            {/* ── Barra de rota ── */}
            {origemInfo && destinoInfo && (
              <div style={s.routeBar}>
                <div style={s.routePill('#FFF3E0','#EF9F27','#7A4F00')}>
                  <span>{origemInfo.icon}</span>
                  <span>{origemInfo.shortLabel || origemInfo.label}</span>
                </div>
                <svg width="20" height="16" viewBox="0 0 24 16" fill="none" style={{ flexShrink:0 }}>
                  <path d="M2 8h20M16 2l6 6-6 6" stroke="#185FA5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <div style={s.routePill('#E8F5E9','#1D9E75','#0A5E3A')}>
                  <span>{destinoInfo.icon}</span>
                  <span>{destinoInfo.shortLabel || destinoInfo.label}</span>
                </div>
                {tituloEmail && (
                  <span style={{ fontSize:12, color:'#185FA5', fontWeight:700, display:'flex', alignItems:'center', gap:5 }}>
                    📧 {tituloEmail}
                  </span>
                )}
                {itensArr.length > 0 && (
                  <span style={{ marginLeft:'auto', fontSize:12, color:'#555', fontWeight:600 }}>
                    {itensArr.length} produto(s) · {totalUnid} un.
                  </span>
                )}
              </div>
            )}

            {/* ── Corpo ── */}
            <div style={s.body}>
              {/* Produtos */}
              <div style={s.prodCol}>
                <div style={s.prodColHead}>
                  <span style={s.colTitle}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5"/></svg>
                    Produtos
                    {prodsFiltrados.length > 0 && <span style={s.countBadge}>{prodsFiltrados.length}</span>}
                  </span>
                  {/* toggle lista / card */}
                  <div style={{ display: 'flex', gap: 3, background: '#f0f0f0', borderRadius: 8, padding: 3 }}>
                    <button
                      onClick={() => setViewMode('lista')}
                      title="Visualização em lista"
                      style={{ padding: '4px 8px', borderRadius: 6, border: 'none', cursor: 'pointer', background: viewMode === 'lista' ? '#fff' : 'transparent', color: viewMode === 'lista' ? '#185FA5' : '#999', boxShadow: viewMode === 'lista' ? '0 1px 3px rgba(0,0,0,0.12)' : 'none', transition: 'all 0.13s', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700 }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                      Lista
                    </button>
                    <button
                      onClick={() => setViewMode('card')}
                      title="Visualização em cards"
                      style={{ padding: '4px 8px', borderRadius: 6, border: 'none', cursor: 'pointer', background: viewMode === 'card' ? '#fff' : 'transparent', color: viewMode === 'card' ? '#185FA5' : '#999', boxShadow: viewMode === 'card' ? '0 1px 3px rgba(0,0,0,0.12)' : 'none', transition: 'all 0.13s', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700 }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2"/><rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2"/><rect x="3" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2"/><rect x="14" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2"/></svg>
                      Cards
                    </button>
                  </div>
                </div>
                <div style={s.searchRow}>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={s.searchIcon}><circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.3"/><path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
                  <input type="text" placeholder="Buscar produto..." value={busca} onChange={e => setBusca(e.target.value)} style={s.searchInput} />
                  {busca && <button style={s.searchClear} onClick={() => setBusca('')}>✕</button>}
                </div>
                {viewMode === 'lista' ? (
                  <div style={s.prodList}>
                    {prodsFiltrados.length === 0
                      ? <div style={{ padding:'32px 16px', textAlign:'center', color:'#aaa', fontSize:13 }}>Nenhum produto encontrado.</div>
                      : prodsFiltrados.map((p, i) => {
                        const nome = p.PRODUTO;
                        return <ProdCard key={i} produto={nome} estoque={estoqueMap[nome] ?? 0} inCart={!!itens[nome]} isDragging={dragProd === nome} onDragStart={() => setDragProd(nome)} onDragEnd={() => setDragProd(null)} onAdd={() => addItem(nome)} />;
                      })
                    }
                  </div>
                ) : (
                  <div style={{ maxHeight: 500, overflowY: 'auto', padding: '10px 10px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                    {prodsFiltrados.length === 0
                      ? <div style={{ gridColumn: '1/-1', padding:'32px 16px', textAlign:'center', color:'#aaa', fontSize:13 }}>Nenhum produto encontrado.</div>
                      : prodsFiltrados.map((p, i) => {
                        const nome = p.PRODUTO;
                        return <ProdCardGrid key={i} produto={nome} foto={p.FOTO || p.foto || p.imagem || p.IMAGEM || null} estoque={estoqueMap[nome] ?? 0} inCart={!!itens[nome]} isDragging={dragProd === nome} onDragStart={() => setDragProd(nome)} onDragEnd={() => setDragProd(null)} onAdd={() => addItem(nome)} />;
                      })
                    }
                  </div>
                )}
              </div>

              {/* Destino + Confirmar */}
              <div style={s.destCol}>
                <DropZone items={itensArr} onDrop={() => { if (dragProd) addItem(dragProd); }} onChangeQty={updateQty} onRemove={removeItem} destino={destino} />

                {itensArr.length > 0 && (
                  <div style={s.confirmCard}>
                    <div style={s.metaRow}>
                      <span style={s.metaChip('#185FA510','#185FA5')}>{itensArr.length} produto{itensArr.length!==1?'s':''}</span>
                      <span style={s.metaChip('#185FA510','#185FA5')}>{totalUnid} unidade{totalUnid!==1?'s':''}</span>
                      {auxiliar.trim() && (
                        <span style={s.metaChip('#1D9E7510','#0A5E3A')}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.5"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                          {auxiliar.trim()}
                        </span>
                      )}
                      <button style={{ marginLeft:'auto', background:'none', border:'none', fontSize:12, color:'#E24B4A', cursor:'pointer', padding:'4px 8px', borderRadius:6, fontWeight:700 }} onClick={() => setItens({})}>Limpar tudo</button>
                    </div>

                    <div>
                      <label style={{ ...s.label, display:'block', marginBottom:6 }}>Observações (opcional)</label>
                      <textarea value={obs} onChange={e => setObs(e.target.value)}
                        placeholder="Ex: Material recebido de Itaboraí para reposição..."
                        style={s.textarea} rows={2} />
                    </div>

                    <button style={s.confirmBtn(loading)} onClick={handleConfirmar} disabled={loading}
                      onMouseEnter={e => { if(!loading) e.currentTarget.style.filter='brightness(1.1)'; }}
                      onMouseLeave={e => { e.currentTarget.style.filter='none'; }}>
                      {loading ? (
                        <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ animation:'spin 0.8s linear infinite' }}><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" strokeDasharray="40" strokeDashoffset="10" strokeLinecap="round"/></svg>Salvando...</>
                      ) : (
                        <><svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>Confirmar transferência</>
                      )}
                    </button>
                  </div>
                )}

                {feedback && (
                  <div style={s.feedback(feedback.ok)}>
                    {feedback.ok
                      ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5"/><path d="M8 12l2.5 2.5L16 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      : <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5"/><path d="M12 7v5M12 16h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                    }
                    {feedback.msg}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {aba === 'historico' && (
          <Historico historico={historico} />
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}