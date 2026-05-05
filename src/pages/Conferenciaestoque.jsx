// src/pages/ConferenciaEstoque.jsx
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useApp } from '../AppContext';
import PageHeader from '../components/PageHeader';
import SheetsService from '../services/SheetsService';

// ─── Kits inline (equivalente ao kits.json) ───────────────────────────────────

const KITS = {
  BASE: {
    caixa_box: [
      { material: 'ABRAÇADEIRA NYLON 100 X 2,5mm',                            padrao: 20 },
      { material: 'ABRAÇADEIRA DE IDENTIFICAÇÃO DE FIBRA OPTICA',              padrao: 5  },
      { material: 'CONECTOR FAST SC/APC - SM (Q1) NAZDA P/ FIBRA OPTICA',     padrao: 10 },
      { material: 'EMENDA APC',                                                padrao: 6  },
      { material: 'GRAMPO CLAMP C2 - FTTH',                                    padrao: 30 },
      { material: 'BUCHA 8',                                                   padrao: 1  },
      { material: 'PARAFUSO 8',                                                padrao: 1  },
      { material: 'MARCADOR PARA RETRO PROJETOR',                              padrao: 1  },
      { material: 'CORDAO OPTICO SC UPC/SC APC 2M',                           padrao: 5  },
      { material: 'CORDAO OPTICO SC APC/SC APC 2M',                           padrao: 5  },
      { material: 'CAIXA TERMINAÇÃO PTO FTTH',                                 padrao: 4  },
      { material: 'BUCHA DE ACABAMENTO',                                       padrao: 8  },
      { material: 'PROTETOR DE EMENDA JACARÉ',                                 padrao: 2  },
    ],
    caixa_ferragem: [
      { material: 'ALÇA PREFORMADA P/ FIO FE 100/160', padrao: 50 },
      { material: 'ABRAÇADEIRA BAP',                   padrao: 4  },
      { material: 'PARAFUSO DE BAP',                   padrao: 4  },
      { material: 'AGFE-PRO (ANEL)',                   padrao: 8  },
    ],
    bobina:       [{ material: 'Bobina',       padrao: 1 }],
    equipamentos: [{ material: 'Equipamentos', padrao: 1 }],
  },
  Cidades: {
    niteroi: {
      override: {
        caixa_box: [{ material: 'SLIMBOX - CEIF 08 FLEX - 1X8 - SC/APC', padrao: 2 }],
      },
    }
  },
};

// Mapeamento cidade → chave do JSON
const ESTOQUES = [
  { label: 'MARICÁ',       key: 'marica'        },
  { label: 'ITABORAÍ',     key: 'itaborai'      },  
  { label: 'NITERÓI',      key: 'niteroi'       },
];

// Rótulos amigáveis das seções
const SECAO_LABELS = {
  caixa_box:      { label: 'Caixa Box',      icon: '📦', cor: '#185FA5' },
  caixa_ferragem: { label: 'Caixa Ferragem', icon: '🔩', cor: '#D97706' },
  bobina:         { label: 'Bobina',          icon: '🎞️', cor: '#7C3AED' },
  equipamentos:   { label: 'Equipamentos',    icon: '🔧', cor: '#1D9E75' },
};

// ─── Constantes ───────────────────────────────────────────────────────────────

const STATUS_MAP = {
  SOBRANDO: { cor: '#1D9E75', bg: '#E8F5F0', label: 'SOBRANDO', icon: '↑' },
  FALTANDO: { cor: '#E24B4A', bg: '#FDE8E8', label: 'FALTANDO', icon: '↓' },
  OK:       { cor: '#185FA5', bg: '#EAF2FC', label: 'OK',       icon: '✓' },
};

const STORAGE_KEY = 'conferencias_estoque_v2';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hoje() {
  return new Date().toLocaleDateString('pt-BR');
}
function calcStatus(d) {
  const n = Number(d);
  if (n > 0) return 'SOBRANDO';
  if (n < 0) return 'FALTANDO';
  return 'OK';
}
function calcDif(fisico, sos) {
  return (Number(fisico) || 0) - (Number(sos) || 0);
}
function fmtDif(d) {
  const n = Number(d);
  if (n > 0) return `+${n}`;
  if (n < 0) return `${n}`;
  return '0';
}
function salvarLocal(lista) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(lista)); } catch (_) {}
}
function carregarLocal() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch (_) { return []; }
}

let _nextId = 1;
function newId() { return _nextId++; }

// ─── Monta itens a partir do kit da cidade ────────────────────────────────────

function montarItensDoKit(cidadeKey) {
  const base   = KITS.BASE;
  const cidade = KITS.Cidades?.[cidadeKey] || {};
  const override = cidade.override || {};

  const itens = [];
  for (const secao of Object.keys(base)) {
    const baseItens     = base[secao]     || [];
    const overrideItens = override[secao] || [];
    // Mescla: base + extras do override
    const todos = [...baseItens, ...overrideItens];
    const secLabel = SECAO_LABELS[secao] || { label: secao, icon: '📋', cor: '#666' };

    // separador de seção
    itens.push({ _secao: true, secao, label: secLabel.label, icon: secLabel.icon, cor: secLabel.cor });

    todos.forEach(item => {
      itens.push({
        id:        newId(),
        secao,
        material:  item.material,
        padrao:    item.padrao,
        sos:       '',
        fisico:    '',
        diferenca: 0,
        status:    'OK',
        origem:    'kit',  // 'kit' | 'manual'
      });
    });
  }
  return itens;
}

// ─── Gerador de HTML para impressão ──────────────────────────────────────────

function gerarHTMLRelatorio(rel) {
  const itensReais = (rel.itens || []).filter(i => !i._secao);
  const ok       = itensReais.filter(i => i.status === 'OK').length;
  const sobrando = itensReais.filter(i => i.status === 'SOBRANDO').length;
  const faltando = itensReais.filter(i => i.status === 'FALTANDO').length;

  // Agrupar por seção para o PDF
  const secoes = {};
  itensReais.forEach(item => {
    const s = item.secao || 'outros';
    if (!secoes[s]) secoes[s] = [];
    secoes[s].push(item);
  });

  const secoesHTML = Object.entries(secoes).map(([secKey, items]) => {
    const secLabel = SECAO_LABELS[secKey] || { label: secKey, icon: '📋', cor: '#185FA5' };
    const rows = items.map((item, idx) => {
      const dif = Number(item.diferenca);
      const difStr = dif > 0 ? `+${dif}` : String(dif);
      const st = STATUS_MAP[item.status] || STATUS_MAP.OK;
      const temFisico = item.fisico !== '';
      return `<tr>
        <td class="num" style="color:#aaa">${idx + 1}</td>
        <td class="mat">${item.material || '—'}</td>
        <td class="num center" style="color:#185FA5;font-weight:800">${item.padrao ?? '—'}</td>
        <td class="num center">${item.sos !== '' ? item.sos : '—'}</td>
        <td class="num center" style="font-weight:800;color:#111">${temFisico ? item.fisico : '—'}</td>
        <td class="num center" style="color:${temFisico ? st.cor : '#ccc'};font-weight:900">${temFisico ? difStr : '—'}</td>
        <td class="center">${temFisico ? `<span class="badge" style="background:${st.bg};color:${st.cor};border:1px solid ${st.cor}40">${st.icon} ${item.status}</span>` : '<span style="color:#ccc;font-size:9px">aguardando</span>'}</td>
      </tr>`;
    }).join('');

    return `<div class="secao-block">
      <div class="secao-header" style="border-left:4px solid ${secLabel.cor}">
        <span>${secLabel.icon}</span> <strong>${secLabel.label}</strong>
        <span class="secao-count">${items.length} iten${items.length !== 1 ? 's' : ''}</span>
      </div>
      <table>
        <thead><tr>
          <th class="center" style="width:30px">#</th>
          <th class="left">MATERIAL / ITEM</th>
          <th class="center" style="width:70px">PADRÃO</th>
          <th class="center" style="width:60px">SOS</th>
          <th class="center" style="width:70px">FÍSICO</th>
          <th class="center" style="width:80px">DIFERENÇA</th>
          <th class="center" style="width:90px">STATUS</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
  }).join('');

  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"/>
<title>Conferência – ${rel.tecnico} – ${rel.data}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800;900&family=DM+Mono:wght@500&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'DM Sans',system-ui,sans-serif;font-size:11px;color:#111;background:#fff;padding:24px 28px}
  .page-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;padding-bottom:14px;border-bottom:3px solid #185FA5}
  .header-title{font-size:22px;font-weight:900;color:#111;letter-spacing:-0.04em}
  .header-sub{font-size:11px;color:#888;margin-top:3px}
  .header-right{text-align:right;font-size:10px;color:#aaa;line-height:1.8}
  .header-right strong{color:#185FA5}
  .meta-bar{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-bottom:16px;background:#f8f9fa;border:1.5px solid #e2e8f0;border-radius:10px;padding:12px 16px}
  .meta-item label{display:block;font-size:9px;font-weight:800;color:#aaa;text-transform:uppercase;letter-spacing:.06em;margin-bottom:2px}
  .meta-item span{font-size:12px;font-weight:800;color:#111}
  .resumo{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:20px}
  .res-card{padding:10px 14px;border-radius:8px;border:1.5px solid}
  .res-val{font-size:22px;font-weight:900;letter-spacing:-.04em;line-height:1}
  .res-lbl{font-size:9px;font-weight:700;opacity:.7;text-transform:uppercase;letter-spacing:.04em;margin-top:3px}
  .secao-block{margin-bottom:20px;break-inside:avoid}
  .secao-header{display:flex;align-items:center;gap:8px;padding:8px 12px;background:#f8f9fa;border-radius:8px;margin-bottom:8px;font-size:12px;font-weight:700;color:#333}
  .secao-count{margin-left:auto;font-size:10px;color:#888;font-weight:600}
  table{width:100%;border-collapse:collapse}
  thead tr{background:#f1f5f9}
  th{padding:7px 9px;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;color:#555;border-bottom:1.5px solid #e2e8f0}
  th.left{text-align:left}
  th.center{text-align:center}
  tbody tr:nth-child(even){background:#fafbfc}
  td{padding:7px 9px;border-bottom:1px solid #f0f0f0;vertical-align:middle}
  td.num{font-family:'DM Mono',monospace}
  td.mat{font-weight:600;color:#111;max-width:260px}
  td.center{text-align:center}
  .badge{display:inline-flex;align-items:center;gap:3px;padding:3px 8px;border-radius:6px;font-size:9px;font-weight:800;white-space:nowrap}
  .assinaturas{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;margin-top:28px;padding-top:16px;border-top:1px solid #e2e8f0}
  .ass{text-align:center}
  .ass-line{border-bottom:1px solid #bbb;margin-bottom:5px;height:36px}
  .ass-title{font-size:9px;font-weight:700;color:#aaa;text-transform:uppercase;letter-spacing:.06em}
  .ass-name{font-size:11px;font-weight:700;color:#111;margin-top:3px}
  .footer{margin-top:14px;text-align:center;font-size:9px;color:#bbb;padding-top:10px;border-top:1px solid #f0f0f0}
  @media print{body{padding:12px 14px}@page{size:A4;margin:1cm}tr{break-inside:avoid}}
</style></head><body>
  <div class="page-header">
    <div>
      <div class="header-title">CONFERÊNCIA DE ESTOQUE</div>
      <div class="header-sub">Relatório de conferência física do veículo técnico</div>
    </div>
    <div class="header-right">
      Gerado em <strong>${new Date().toLocaleDateString('pt-BR')}</strong><br/>
      ${itensReais.length} iten${itensReais.length !== 1 ? 's' : ''} conferido${itensReais.length !== 1 ? 's' : ''}
    </div>
  </div>
  <div class="meta-bar">
    ${[['Data', rel.data],['Carro / Placa', rel.carro],['Técnico', rel.tecnico],['Estoquista', rel.estoquista],['Estoque / Cidade', rel.estoque]]
      .map(([k,v]) => `<div class="meta-item"><label>${k}</label><span>${v || '—'}</span></div>`).join('')}
  </div>
  <div class="resumo">
    <div class="res-card" style="background:#EAF2FC;border-color:#185FA540"><div class="res-val" style="color:#185FA5">${itensReais.length}</div><div class="res-lbl" style="color:#185FA5">Total Itens</div></div>
    <div class="res-card" style="background:#EAF2FC;border-color:#185FA540"><div class="res-val" style="color:#185FA5">${ok}</div><div class="res-lbl" style="color:#185FA5">✓ OK</div></div>
    <div class="res-card" style="background:#E8F5F0;border-color:#1D9E7540"><div class="res-val" style="color:#1D9E75">${sobrando}</div><div class="res-lbl" style="color:#1D9E75">↑ Sobrando</div></div>
    <div class="res-card" style="background:#FDE8E8;border-color:#E24B4A40"><div class="res-val" style="color:#E24B4A">${faltando}</div><div class="res-lbl" style="color:#E24B4A">↓ Faltando</div></div>
  </div>
  ${secoesHTML}
  <div class="assinaturas">
    <div class="ass"><div class="ass-line"></div><div class="ass-title">Técnico</div><div class="ass-name">${rel.tecnico || ' '}</div></div>
    <div class="ass"><div class="ass-line"></div><div class="ass-title">Estoquista Responsável</div><div class="ass-name">${rel.estoquista || ' '}</div></div>
    <div class="ass"><div class="ass-line"></div><div class="ass-title">Aprovação / Supervisor</div><div class="ass-name">&nbsp;</div></div>
  </div>
  <div class="footer">Relatório gerado automaticamente · ${rel.estoque} · ${rel.data}</div>
  <script>window.onload=()=>setTimeout(()=>window.print(),500)</script>
</body></html>`;
}

// ─── Componentes de UI ────────────────────────────────────────────────────────

function StatusBadge({ status, small }) {
  const st = STATUS_MAP[status] || STATUS_MAP.OK;
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding: small ? '3px 7px' : '4px 9px', borderRadius:7, fontSize: small ? 10 : 11, fontWeight:800, color:st.cor, background:st.bg, border:`1px solid ${st.cor}40`, whiteSpace:'nowrap' }}>
      {st.icon} {st.label}
    </span>
  );
}

function SecaoHeader({ icon, label, cor, count, onAddItem }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 16px', background:`linear-gradient(135deg,${cor}10,${cor}06)`, borderBottom:`1px solid ${cor}20`, borderTop:'1px solid #f0f0f0', marginTop:4 }}>
      <span style={{ fontSize:16 }}>{icon}</span>
      <span style={{ fontSize:12, fontWeight:800, color:cor, flex:1, letterSpacing:'-0.01em' }}>{label}</span>
      <span style={{ fontSize:11, color:'#aaa', fontWeight:600, background:'#fff', padding:'2px 8px', borderRadius:6, border:'1px solid #e5e7eb' }}>{count} iten{count !== 1 ? 's' : ''}</span>
      <button onClick={onAddItem}
        style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 10px', borderRadius:7, border:`1.5px dashed ${cor}50`, background:'transparent', color:cor, fontSize:11, fontWeight:700, cursor:'pointer', whiteSpace:'nowrap', fontFamily:'inherit', transition:'all 0.12s' }}
        onMouseEnter={e => { e.currentTarget.style.background = cor+'15'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>
        Adicionar item
      </button>
    </div>
  );
}

function ItemRow({ item, idx, onUpdate, onRemove, isOdd }) {
  const st     = STATUS_MAP[item.status] || STATUS_MAP.OK;
  const temFis = item.fisico !== '';
  const temSos = item.sos !== '' || item.padrao !== '';

  // Highlight de fundo por status
  const rowBg = !temFis
    ? (isOdd ? '#fafafa' : '#fff')
    : item.status === 'OK'       ? '#F0FBF4'
    : item.status === 'FALTANDO' ? '#FFF5F5'
    : '#F0FBF4';

  return (
    <div style={{ display:'grid', gridTemplateColumns:'28px 1fr 80px 80px 90px 90px 110px 36px', gap:4, padding:'6px 16px', alignItems:'center', borderBottom:'1px solid #f3f4f6', background:rowBg, transition:'background 0.15s' }}>
      {/* Nº */}
      <span style={{ fontSize:11, color:'#ccc', fontWeight:700, textAlign:'center' }}>{idx + 1}</span>

      {/* Material */}
      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
        {item.origem === 'kit' && (
          <span title="Item do kit padrão" style={{ fontSize:9, color:'#185FA5', background:'#EFF6FF', borderRadius:4, padding:'1px 5px', fontWeight:800, flexShrink:0, letterSpacing:'0.04em' }}>KIT</span>
        )}
        <input
          value={item.material}
          onChange={e => onUpdate(item.id, 'material', e.target.value)}
          placeholder="Nome do material..."
          style={{ padding:'6px 8px', borderRadius:7, border:'1.5px solid transparent', fontSize:12, fontWeight:600, background:'transparent', color:'#111', outline:'none', fontFamily:'inherit', width:'100%', boxSizing:'border-box', transition:'all 0.15s' }}
          onFocus={e => { e.target.style.border='1.5px solid #185FA5'; e.target.style.background='#fff'; e.target.style.boxShadow='0 0 0 3px rgba(24,95,165,0.08)'; }}
          onBlur={e => { e.target.style.border='1.5px solid transparent'; e.target.style.background='transparent'; e.target.style.boxShadow='none'; }}
        />
      </div>

      {/* Padrão — com destaque visual */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center' }}>
        {item.origem === 'kit' ? (
          <div style={{ display:'flex', alignItems:'center', gap:4 }}>
            <input
              type="number"
              value={item.padrao}
              onChange={e => onUpdate(item.id, 'padrao', e.target.value)}
              min="0"
              style={{ width:54, padding:'5px 6px', borderRadius:7, border:'1.5px solid #185FA530', fontSize:13, fontWeight:900, color:'#185FA5', background:'#EFF6FF', outline:'none', textAlign:'center', fontFamily:'inherit', cursor:'default' }}
              onFocus={e => e.target.style.borderColor='#185FA5'}
              onBlur={e => e.target.style.borderColor='#185FA530'}
              title="Valor padrão do kit"
            />
          </div>
        ) : (
          <input type="number" value={item.padrao} onChange={e => onUpdate(item.id, 'padrao', e.target.value)} min="0"
            style={{ width:54, padding:'5px 6px', borderRadius:7, border:'1.5px solid #e0e0e0', fontSize:12, background:'#f9f9f9', color:'#555', outline:'none', textAlign:'center', fontFamily:'inherit' }}
            onFocus={e => e.target.style.borderColor='#185FA5'}
            onBlur={e => e.target.style.borderColor='#e0e0e0'}
          />
        )}
      </div>

      {/* SOS */}
      <input type="number" value={item.sos} onChange={e => onUpdate(item.id, 'sos', e.target.value)} min="0" placeholder="—"
        style={{ padding:'6px 8px', borderRadius:7, border:'1.5px solid #e8e8e8', fontSize:12, background:'#f9f9f9', color:'#111', outline:'none', textAlign:'center', fontFamily:'inherit', width:'100%', boxSizing:'border-box' }}
        onFocus={e => e.target.style.borderColor='#185FA5'}
        onBlur={e => e.target.style.borderColor='#e8e8e8'}
      />

      {/* Físico — campo principal */}
      <input type="number" value={item.fisico} onChange={e => onUpdate(item.id, 'fisico', e.target.value)} min="0" placeholder="0"
        style={{ padding:'6px 8px', borderRadius:7, border:`1.5px solid ${temFis ? '#185FA580' : '#e8e8e8'}`, fontSize:13, fontWeight:800, background: temFis ? '#F0F7FF' : '#f9f9f9', color:'#111', outline:'none', textAlign:'center', fontFamily:'inherit', width:'100%', boxSizing:'border-box', transition:'all 0.15s' }}
        onFocus={e => { e.target.style.borderColor='#185FA5'; e.target.style.boxShadow='0 0 0 3px rgba(24,95,165,0.1)'; }}
        onBlur={e => { e.target.style.borderColor = temFis ? '#185FA580' : '#e8e8e8'; e.target.style.boxShadow='none'; }}
      />

      {/* Diferença */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:'4px 0', borderRadius:7, fontSize:13, fontWeight:900, color: temFis ? st.cor : '#ccc', background: temFis ? st.bg : 'transparent', letterSpacing:'-0.02em', transition:'all 0.2s' }}>
        {temFis ? fmtDif(item.diferenca) : '—'}
      </div>

      {/* Status */}
      <div style={{ display:'flex', justifyContent:'center' }}>
        {temFis ? <StatusBadge status={item.status} small /> : (
          <span style={{ fontSize:10, color:'#ccc', fontStyle:'italic' }}>aguardando</span>
        )}
      </div>

      {/* Remover */}
      <button onClick={() => onRemove(item.id)}
        style={{ width:28, height:28, border:'none', borderRadius:7, background:'#E24B4A12', color:'#E24B4A', cursor:'pointer', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center', transition:'background 0.12s', padding:0, flexShrink:0 }}
        onMouseEnter={e => e.currentTarget.style.background='#E24B4A30'}
        onMouseLeave={e => e.currentTarget.style.background='#E24B4A12'}
        title="Remover item">✕</button>
    </div>
  );
}

function ResumoCards({ itens }) {
  const reais = itens.filter(i => !i._secao);
  const ok       = reais.filter(i => i.status === 'OK').length;
  const sobrando = reais.filter(i => i.status === 'SOBRANDO').length;
  const faltando = reais.filter(i => i.status === 'FALTANDO').length;
  const total    = reais.length;

  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
      {[
        { label:'Total de Itens', val:total,    cor:'#185FA5', bg:'#EAF2FC', border:'#185FA530', icon:'📋' },
        { label:'✓ OK',           val:ok,       cor:'#185FA5', bg:'#EAF2FC', border:'#185FA530', icon:'✅' },
        { label:'↑ Sobrando',     val:sobrando, cor:'#1D9E75', bg:'#E8F5F0', border:'#1D9E7540', icon:'📈' },
        { label:'↓ Faltando',     val:faltando, cor:'#E24B4A', bg:'#FDE8E8', border:'#E24B4A40', icon:'📉' },
      ].map(c => (
        <div key={c.label} style={{ padding:'16px', borderRadius:12, border:`1.5px solid ${c.border}`, background:c.bg, display:'flex', flexDirection:'column', gap:4 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontSize:10, fontWeight:800, color:c.cor, opacity:.7, textTransform:'uppercase', letterSpacing:'.06em' }}>{c.label}</span>
            <span style={{ fontSize:18 }}>{c.icon}</span>
          </div>
          <div style={{ fontSize:32, fontWeight:900, color:c.cor, letterSpacing:'-0.04em', lineHeight:1 }}>{c.val}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Preview Modal ────────────────────────────────────────────────────────────

function PreviewRelatorio({ rel, onClose }) {
  if (!rel) return null;
  const itensReais = (rel.itens || []).filter(i => !i._secao);
  const ok       = itensReais.filter(i => i.status === 'OK').length;
  const sobrando = itensReais.filter(i => i.status === 'SOBRANDO').length;
  const faltando = itensReais.filter(i => i.status === 'FALTANDO').length;

  // Agrupar por seção para preview
  const secoes = {};
  itensReais.forEach(item => {
    const s = item.secao || 'outros';
    if (!secoes[s]) secoes[s] = [];
    secoes[s].push(item);
  });

  function exportar() {
    const html = gerarHTMLRelatorio(rel);
    const blob = new Blob([html], { type:'text/html' });
    window.open(URL.createObjectURL(blob), '_blank');
  }

  useEffect(() => {
    const fn = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [onClose]);

  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:16, backdropFilter:'blur(4px)' }}>
      <div onClick={e => e.stopPropagation()} style={{ width:'min(960px,100vw)', maxHeight:'calc(100vh - 32px)', background:'#fff', borderRadius:16, boxShadow:'0 32px 80px rgba(0,0,0,0.25)', display:'flex', flexDirection:'column', overflow:'hidden', animation:'ceSlide 0.2s ease' }}>
        {/* Header */}
        <div style={{ padding:'14px 20px', background:'linear-gradient(135deg,#0f2544,#185FA5)', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
          <div>
            <div style={{ fontSize:15, fontWeight:900, color:'#fff' }}>Conferência — {rel.tecnico || 'Sem técnico'}</div>
            <div style={{ fontSize:11, color:'rgba(255,255,255,.6)', marginTop:2 }}>{rel.estoque} · {rel.carro} · {rel.data}</div>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={exportar} style={{ padding:'8px 16px', borderRadius:8, border:'1px solid rgba(255,255,255,.3)', background:'rgba(255,255,255,.15)', color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:6, fontFamily:'inherit' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><polyline points="6 9 6 2 18 2 18 9" stroke="currentColor" strokeWidth="2"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" stroke="currentColor" strokeWidth="2"/><rect x="6" y="14" width="12" height="8" stroke="currentColor" strokeWidth="2"/></svg>
              Imprimir / PDF
            </button>
            <button onClick={onClose} style={{ width:32, height:32, borderRadius:8, border:'1px solid rgba(255,255,255,.25)', background:'rgba(255,255,255,.12)', color:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>✕</button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex:1, overflowY:'auto', padding:24 }}>
          {/* Métricas */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:20 }}>
            {[{l:'Total',v:itensReais.length,c:'#185FA5',bg:'#EAF2FC'},{l:'OK',v:ok,c:'#185FA5',bg:'#EAF2FC'},{l:'Sobrando',v:sobrando,c:'#1D9E75',bg:'#E8F5F0'},{l:'Faltando',v:faltando,c:'#E24B4A',bg:'#FDE8E8'}].map(card => (
              <div key={card.l} style={{ padding:'12px 16px', borderRadius:10, background:card.bg, textAlign:'center' }}>
                <div style={{ fontSize:26, fontWeight:900, color:card.c, letterSpacing:'-0.04em', lineHeight:1 }}>{card.v}</div>
                <div style={{ fontSize:10, fontWeight:700, color:card.c, opacity:.7, textTransform:'uppercase', marginTop:4 }}>{card.l}</div>
              </div>
            ))}
          </div>

          {/* Meta */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:10, padding:'12px 16px', background:'#f8f9fa', borderRadius:10, marginBottom:20 }}>
            {[['Data',rel.data],['Carro/Placa',rel.carro],['Técnico',rel.tecnico],['Estoquista',rel.estoquista],['Estoque',rel.estoque]].map(([k,v]) => (
              <div key={k}>
                <div style={{ fontSize:9, fontWeight:700, color:'#aaa', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:2 }}>{k}</div>
                <div style={{ fontSize:12, fontWeight:800, color:'#111' }}>{v || '—'}</div>
              </div>
            ))}
          </div>

          {/* Tabela por seção */}
          {Object.entries(secoes).map(([secKey, secItens]) => {
            const secLabel = SECAO_LABELS[secKey] || { label: secKey, icon: '📋', cor: '#185FA5' };
            return (
              <div key={secKey} style={{ marginBottom:20, border:`1px solid ${secLabel.cor}20`, borderRadius:12, overflow:'hidden' }}>
                <div style={{ padding:'10px 16px', background:`${secLabel.cor}10`, display:'flex', alignItems:'center', gap:8, borderBottom:`1px solid ${secLabel.cor}20` }}>
                  <span style={{ fontSize:16 }}>{secLabel.icon}</span>
                  <span style={{ fontSize:13, fontWeight:800, color:secLabel.cor, flex:1 }}>{secLabel.label}</span>
                  <span style={{ fontSize:11, color:'#888', fontWeight:600 }}>{secItens.length} itens</span>
                </div>
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <thead>
                    <tr style={{ background:'#f8f9fa' }}>
                      {['#','Material','Padrão','SOS','Físico','Diferença','Status'].map((h,i) => (
                        <th key={h} style={{ padding:'8px 10px', fontSize:9, fontWeight:800, color:'#666', textTransform:'uppercase', letterSpacing:'.05em', textAlign: i<=1 ? 'left' : 'center', borderBottom:'1.5px solid #e5e7eb' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {secItens.map((item, idx) => {
                      const st = STATUS_MAP[item.status] || STATUS_MAP.OK;
                      const temFis = item.fisico !== '';
                      const dif = Number(item.diferenca);
                      return (
                        <tr key={idx} style={{ background: idx % 2 ? '#fafafa' : '#fff', borderBottom:'1px solid #f0f0f0' }}>
                          <td style={{ padding:'7px 10px', fontSize:11, color:'#ccc', textAlign:'center' }}>{idx+1}</td>
                          <td style={{ padding:'7px 10px', fontSize:12, fontWeight:600, color:'#111' }}>
                            {item.origem === 'kit' && <span style={{ fontSize:9, color:'#185FA5', background:'#EFF6FF', borderRadius:4, padding:'1px 5px', fontWeight:800, marginRight:6 }}>KIT</span>}
                            {item.material || '—'}
                          </td>
                          <td style={{ padding:'7px 10px', textAlign:'center', fontWeight:800, color:'#185FA5', fontSize:13 }}>{item.padrao ?? '—'}</td>
                          <td style={{ padding:'7px 10px', textAlign:'center', color:'#888', fontSize:12 }}>{item.sos !== '' ? item.sos : '—'}</td>
                          <td style={{ padding:'7px 10px', textAlign:'center', fontWeight:800, color:'#111', fontSize:13 }}>{temFis ? item.fisico : '—'}</td>
                          <td style={{ padding:'7px 10px', textAlign:'center', fontWeight:900, color: temFis ? st.cor : '#ccc', fontSize:13 }}>{temFis ? fmtDif(dif) : '—'}</td>
                          <td style={{ padding:'7px 10px', textAlign:'center' }}>
                            {temFis ? <StatusBadge status={item.status} small /> : <span style={{ fontSize:10, color:'#ddd', fontStyle:'italic' }}>aguardando</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })}

          {/* Assinaturas */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:24, marginTop:24, paddingTop:16, borderTop:'1px solid #f0f0f0' }}>
            {[['Técnico', rel.tecnico],['Estoquista Responsável', rel.estoquista],['Aprovação / Supervisor','']].map(([t,n]) => (
              <div key={t} style={{ textAlign:'center' }}>
                <div style={{ height:36, borderBottom:'1px solid #ccc', marginBottom:6 }} />
                <div style={{ fontSize:9, fontWeight:700, color:'#aaa', textTransform:'uppercase', letterSpacing:'.06em' }}>{t}</div>
                <div style={{ fontSize:11, fontWeight:700, color:'#111', marginTop:2 }}>{n || '\u00a0'}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <style>{`@keyframes ceSlide{from{opacity:0;transform:scale(.97) translateY(8px)}to{opacity:1;transform:none}}`}</style>
    </div>
  );
}

// ─── Componente Principal ─────────────────────────────────────────────────────

export default function ConferenciaEstoque() {
  const { dados } = useApp();
  const tecnicos = dados?.tecnicos || [];

  const [aba, setAba]                 = useState('novo');
  const [relatorios, setRelatorios]     = useState([]);
const [loadingHist, setLoadingHist]   = useState(false);
const [erroHist, setErroHist]         = useState(null);

  const [previewRel, setPreviewRel]   = useState(null);
  const [feedback, setFeedback]       = useState(null);
  const [kitCarregado, setKitCarregado] = useState(false);

  const [cabecalho, setCabecalho] = useState({
    estoque: '', data: hoje(), carro: '', tecnico: '', estoquista: '',
  });
  const [itens, setItens] = useState([]);

  useEffect(() => { salvarLocal(relatorios); }, [relatorios]);

  const setCab = (campo, val) => setCabecalho(prev => ({ ...prev, [campo]: val }));

  // ── Quando muda a cidade: carregar kit automaticamente ──
  function handleEstoqueChange(novaEstoque) {
    setCab('estoque', novaEstoque);
    if (!novaEstoque) { setItens([]); setKitCarregado(false); return; }

    const estObj = ESTOQUES.find(e => e.label === novaEstoque);
    if (!estObj) { setItens([]); setKitCarregado(false); return; }

    // Confirma se já tem itens preenchidos
    const temFisico = itens.filter(i => !i._secao).some(i => i.fisico !== '');
    if (temFisico) {
      if (!window.confirm('Trocar a cidade vai substituir os itens atuais. Deseja continuar?')) return;
    }

    const novosItens = montarItensDoKit(estObj.key);
    setItens(novosItens);
    setKitCarregado(true);
    setFeedback({ tipo:'info', msg:`✓ Kit de ${novaEstoque} carregado — ${novosItens.filter(i=>!i._secao).length} itens.` });
    setTimeout(() => setFeedback(null), 3000);
  }

const carregarHistorico = useCallback(async () => {
  setLoadingHist(true);
  setErroHist(null);
  try {
    const lista = await SheetsService.listarConferencias();
    setRelatorios(lista);
  } catch (err) {
    setErroHist('Não foi possível carregar o histórico: ' + err.message);
  } finally {
    setLoadingHist(false);
  }
}, []);

// Carrega ao montar e ao trocar para a aba histórico
useEffect(() => {
  if (aba === 'historico') carregarHistorico();
}, [aba, carregarHistorico]);

  // ── Handlers de itens ──
  function updateItem(id, campo, valor) {
    setItens(prev => prev.map(item => {
      if (item._secao || item.id !== id) return item;
      const updated = { ...item, [campo]: valor };
      if (campo === 'fisico' || campo === 'sos') {
        const dif = calcDif(
          campo === 'fisico' ? valor : item.fisico,
          campo === 'sos' ? valor : item.sos,
        );
        updated.diferenca = dif;
        updated.status    = calcStatus(dif);
      }
      return updated;
    }));
  }

  function removeItem(id) {
    setItens(prev => prev.filter(i => i._secao || i.id !== id));
  }

  function addItemNaSecao(secao) {
    const novId = newId();
    const novoItem = { id:novId, secao, material:'', padrao:'', sos:'', fisico:'', diferenca:0, status:'OK', origem:'manual' };
    // Inserir logo após o último item desta seção
    setItens(prev => {
      const idx = [...prev].map((x,i) => (!x._secao && x.secao === secao) ? i : -1).filter(i => i >= 0).pop();
      if (idx === undefined || idx < 0) return [...prev, novoItem];
      const next = [...prev];
      next.splice(idx + 1, 0, novoItem);
      return next;
    });
  }

  function limparForm() {
    setItens([]);
    setKitCarregado(false);
    setCabecalho({ estoque:'', data:hoje(), carro:'', tecnico:'', estoquista:'' });
    setFeedback(null);
  }

  async function salvarRelatorio() {
  const itensReais = itens.filter(i => !i._secao);
  if (!cabecalho.tecnico.trim() || !cabecalho.carro.trim() || !cabecalho.estoque) {
    setFeedback({ tipo: 'error', msg: 'Preencha Estoque, Carro e Técnico antes de salvar.' });
    return;
  }
  if (itensReais.length === 0) {
    setFeedback({ tipo: 'error', msg: 'Adicione ao menos um item ao relatório.' });
    return;
  }

  setFeedback({ tipo: 'info', msg: 'Salvando na planilha...' });

  const novoRel = {
    id: Date.now(),
    criadoEm: new Date().toISOString(),
    ...cabecalho,
    itens,
  };

  try {
    const result = await SheetsService.salvarConferencia(novoRel);
    if (!result.success) throw new Error(result.error || 'Falha ao salvar');

    setFeedback({ tipo: 'success', msg: `✓ Salvo na planilha com ${itensReais.length} itens!` });
    setTimeout(() => { setPreviewRel(novoRel); setAba('historico'); }, 800);
  } catch (err) {
    setFeedback({ tipo: 'error', msg: 'Erro ao salvar: ' + err.message });
  }
}

  function excluirRelatorio(id, e) {
    e.stopPropagation();
    if (!window.confirm('Excluir este relatório?')) return;
    setRelatorios(prev => prev.filter(r => r.id !== id));
  }

  function duplicarRelatorio(rel) {
    setCabecalho({ estoque:rel.estoque, data:hoje(), carro:rel.carro, tecnico:rel.tecnico, estoquista:rel.estoquista });
    const novosItens = (rel.itens || []).map(item => {
      if (item._secao) return item;
      return { ...item, id:newId(), fisico:'', diferenca:0, status:'OK' };
    });
    setItens(novosItens);
    setKitCarregado(novosItens.filter(i => !i._secao).length > 0);
    setAba('novo'); setFeedback(null);
  }

  function selecionarTecnico(nome) {
    const tec = tecnicos.find(t => (t['NOME COMPLETO'] || t.NOME) === nome);
    setCabecalho(prev => ({ ...prev, tecnico:nome, carro: tec?.PLACA || prev.carro }));
  }

  // ── Renderização agrupada ──
  const nomesTecnicos = tecnicos.map(t => t['NOME COMPLETO'] || t.NOME).filter(Boolean);
  const itensReaisCount = itens.filter(i => !i._secao).length;

  // Agrupa para renderizar separadores de seção
  const renderItens = useMemo(() => {
    const result = [];
    let itemCountInSecao = {};
    itens.filter(i => !i._secao).forEach(i => {
      itemCountInSecao[i.secao] = (itemCountInSecao[i.secao] || 0) + 1;
    });
    itens.forEach(item => {
      if (item._secao) {
        result.push({ tipo:'secao', data:item, count: itemCountInSecao[item.secao] || 0 });
      } else {
        result.push({ tipo:'item', data:item });
      }
    });
    return result;
  }, [itens]);

  const feedbackCores = {
    success: { bg:'#1D9E7514', border:'#1D9E75', color:'#0F6E56' },
    error:   { bg:'#E24B4A14', border:'#E24B4A', color:'#A32D2D' },
    info:    { bg:'#185FA514', border:'#185FA5', color:'#0D3D6B' },
  };

  return (
    <>
      <PageHeader title="Conferência de Estoque" subtitle="Geração de relatórios de conferência física dos veículos técnicos" />

      <div style={{ padding:'0 16px 60px', maxWidth:1400, margin:'0 auto', fontFamily:"'DM Sans',system-ui,sans-serif" }}>

        {/* ── Navegação ── */}
        <div style={{ display:'flex', gap:0, borderBottom:'2px solid #efefef', marginBottom:24 }}>
          {[{id:'novo',icon:'＋',label:'Novo Relatório'},{id:'historico',icon:'📋',label:`Histórico${relatorios.length > 0 ? ` (${relatorios.length})` : ''}`}].map(a => (
            <button key={a.id} onClick={() => setAba(a.id)}
              style={{ padding:'11px 24px', border:'none', background:'none', fontSize:13, fontWeight:700, cursor:'pointer', color: aba===a.id ? '#185FA5' : '#888', borderBottom:`3px solid ${aba===a.id ? '#185FA5' : 'transparent'}`, marginBottom:-2, transition:'all 0.15s', display:'flex', alignItems:'center', gap:7, fontFamily:'inherit' }}>
              <span>{a.icon}</span>{a.label}
            </button>
          ))}
        </div>

        {/* ════════ ABA NOVO ════════ */}
        {aba === 'novo' && (
          <>
            {/* Cabeçalho */}
            <div style={{ background:'#fff', border:'1px solid #e5e7eb', borderRadius:14, padding:'20px 24px', marginBottom:20, boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }}>
              <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:18 }}>
                <div>
                  <div style={{ fontSize:14, fontWeight:800, color:'#111' }}>Dados da Conferência</div>
                  <div style={{ fontSize:12, color:'#888', marginTop:2 }}>Selecione a cidade para carregar o kit automaticamente</div>
                </div>
                <button onClick={limparForm} style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', borderRadius:9, border:'1.5px solid #e0e0e0', background:'#f5f5f5', color:'#555', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M3 12a9 9 0 109-9M3 3v4h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  Limpar
                </button>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:16 }}>
                {/* Estoque / Cidade — campo principal que carrega o kit */}
                <div>
                  <label style={{ fontSize:11, fontWeight:700, color:'#666', textTransform:'uppercase', letterSpacing:'.06em', display:'block', marginBottom:5 }}>
                    Estoque / Cidade *
                    {kitCarregado && <span style={{ marginLeft:8, fontSize:9, background:'#1D9E7518', color:'#1D9E75', padding:'1px 6px', borderRadius:4, fontWeight:800, letterSpacing:'.04em', textTransform:'uppercase' }}>Kit carregado ✓</span>}
                  </label>
                  <select value={cabecalho.estoque} onChange={e => handleEstoqueChange(e.target.value)}
                    style={{ width:'100%', padding:'9px 12px', borderRadius:9, border:`1.5px solid ${cabecalho.estoque ? '#185FA580' : '#e0e0e0'}`, fontSize:13, background: cabecalho.estoque ? '#F0F7FF' : '#f9f9f9', color:'#111', outline:'none', fontFamily:'inherit', cursor:'pointer', boxSizing:'border-box' }}>
                    <option value="">Selecione a cidade...</option>
                    {ESTOQUES.map(e => <option key={e.label} value={e.label}>{e.label}</option>)}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize:11, fontWeight:700, color:'#666', textTransform:'uppercase', letterSpacing:'.06em', display:'block', marginBottom:5 }}>Data</label>
                  <input type="text" value={cabecalho.data} onChange={e => setCab('data', e.target.value)}
                    style={{ width:'100%', padding:'9px 12px', borderRadius:9, border:'1.5px solid #e0e0e0', fontSize:13, background:'#f9f9f9', color:'#111', outline:'none', fontFamily:'inherit', boxSizing:'border-box' }}
                    placeholder="DD/MM/AAAA" />
                </div>

                <div>
                  <label style={{ fontSize:11, fontWeight:700, color:'#666', textTransform:'uppercase', letterSpacing:'.06em', display:'block', marginBottom:5 }}>Carro / Placa *</label>
                  <input type="text" value={cabecalho.carro} onChange={e => setCab('carro', e.target.value.toUpperCase())}
                    style={{ width:'100%', padding:'9px 12px', borderRadius:9, border:`1.5px solid ${cabecalho.carro ? '#185FA580' : '#e0e0e0'}`, fontSize:13, fontWeight:700, background: cabecalho.carro ? '#F0F7FF' : '#f9f9f9', color:'#111', outline:'none', fontFamily:'monospace', letterSpacing:'.04em', boxSizing:'border-box' }}
                    placeholder="ABC1D23" />
                </div>

                <div>
                  <label style={{ fontSize:11, fontWeight:700, color:'#666', textTransform:'uppercase', letterSpacing:'.06em', display:'block', marginBottom:5 }}>Técnico *</label>
                  {nomesTecnicos.length > 0 ? (
                    <select value={cabecalho.tecnico} onChange={e => selecionarTecnico(e.target.value)}
                      style={{ width:'100%', padding:'9px 12px', borderRadius:9, border:`1.5px solid ${cabecalho.tecnico ? '#185FA580' : '#e0e0e0'}`, fontSize:13, background: cabecalho.tecnico ? '#F0F7FF' : '#f9f9f9', color:'#111', outline:'none', fontFamily:'inherit', cursor:'pointer', boxSizing:'border-box' }}>
                      <option value="">Selecione...</option>
                      {nomesTecnicos.map(n => <option key={n}>{n}</option>)}
                    </select>
                  ) : (
                    <input type="text" value={cabecalho.tecnico} onChange={e => setCab('tecnico', e.target.value)}
                      style={{ width:'100%', padding:'9px 12px', borderRadius:9, border:'1.5px solid #e0e0e0', fontSize:13, background:'#f9f9f9', color:'#111', outline:'none', fontFamily:'inherit', boxSizing:'border-box' }}
                      placeholder="Nome do técnico" />
                  )}
                </div>

                <div>
                  <label style={{ fontSize:11, fontWeight:700, color:'#666', textTransform:'uppercase', letterSpacing:'.06em', display:'block', marginBottom:5 }}>Estoquista</label>
                  <input type="text" value={cabecalho.estoquista} onChange={e => setCab('estoquista', e.target.value)}
                    style={{ width:'100%', padding:'9px 12px', borderRadius:9, border:'1.5px solid #e0e0e0', fontSize:13, background:'#f9f9f9', color:'#111', outline:'none', fontFamily:'inherit', boxSizing:'border-box' }}
                    placeholder="Nome do estoquista" />
                </div>
              </div>
            </div>

            {/* Resumo */}
            {itensReaisCount > 0 && <ResumoCards itens={itens} />}

            {/* ── Tabela de itens ── */}
            {itens.length === 0 ? (
              /* Empty state: cidade não selecionada */
              <div style={{ background:'#fff', border:'2px dashed #e5e7eb', borderRadius:16, padding:'56px 24px', textAlign:'center' }}>
                <div style={{ fontSize:48, marginBottom:12 }}>🏙️</div>
                <div style={{ fontSize:16, fontWeight:800, color:'#111', marginBottom:8 }}>Selecione uma cidade para começar</div>
                <div style={{ fontSize:13, color:'#888', marginBottom:20 }}>O kit padrão de materiais será carregado automaticamente conforme a cidade selecionada.</div>
                <div style={{ display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap' }}>
                  {ESTOQUES.map(e => (
                    <button key={e.label} onClick={() => {
                        setCab('estoque', e.label);
                        handleEstoqueChange(e.label);
                      }}
                      style={{ padding:'10px 18px', borderRadius:10, border:'1.5px solid #185FA530', background:'#EFF6FF', color:'#185FA5', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit', transition:'all 0.13s' }}
                      onMouseEnter={e2 => { e2.currentTarget.style.background='#185FA5'; e2.currentTarget.style.color='#fff'; }}
                      onMouseLeave={e2 => { e2.currentTarget.style.background='#EFF6FF'; e2.currentTarget.style.color='#185FA5'; }}>
                      {e.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ background:'#fff', border:'1px solid #e5e7eb', borderRadius:14, overflow:'hidden', boxShadow:'0 1px 4px rgba(0,0,0,0.05)', marginBottom:16 }}>
                {/* Header da tabela */}
                <div style={{ padding:'14px 20px', background:'#fafafa', borderBottom:'1px solid #f0f0f0', display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
                  <div>
                    <div style={{ fontSize:13, fontWeight:800, color:'#111' }}>Itens da Conferência</div>
                    <div style={{ fontSize:11, color:'#888', marginTop:2 }}>
                      {itensReaisCount} iten{itensReaisCount !== 1 ? 's' : ''} · Preencha o campo <strong>Físico</strong> com a quantidade encontrada
                    </div>
                  </div>
                  {relatorios.length > 0 && (
                    <button onClick={() => { if (window.confirm(`Copiar itens do último relatório (${relatorios[0].tecnico})?`)) duplicarRelatorio(relatorios[0]); }}
                      style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:9, border:'1.5px solid #e0e0e0', background:'#f5f5f5', color:'#555', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                      Copiar último
                    </button>
                  )}
                </div>

                {/* Cabeçalho das colunas */}
                <div style={{ display:'grid', gridTemplateColumns:'28px 1fr 80px 80px 90px 90px 110px 36px', gap:4, padding:'8px 16px', background:'linear-gradient(135deg,#0f2544,#185FA5)', alignItems:'center' }}>
                  {[['#','center'],['Material / Item','left'],['Padrão','center'],['SOS','center'],['Físico','center'],['Diferença','center'],['Status','center'],['','center']].map(([h, align]) => (
                    <div key={h} style={{ fontSize:9, fontWeight:800, color:'rgba(255,255,255,0.8)', textTransform:'uppercase', letterSpacing:'.07em', textAlign:align }}>{h}</div>
                  ))}
                </div>

                {/* Linhas */}
                {renderItens.map((row, renderIdx) => {
                  if (row.tipo === 'secao') {
                    const sec = row.data;
                    return (
                      <SecaoHeader key={`secao_${sec.secao}`}
                        icon={sec.icon} label={sec.label} cor={sec.cor} count={row.count}
                        onAddItem={() => addItemNaSecao(sec.secao)} />
                    );
                  }
                  // Conta apenas itens reais para o isOdd
                  const itemsAntes = renderItens.slice(0, renderIdx).filter(r => r.tipo === 'item').length;
                  return (
                    <ItemRow key={row.data.id}
                      item={row.data} idx={itemsAntes}
                      onUpdate={updateItem} onRemove={removeItem}
                      isOdd={itemsAntes % 2 === 1} />
                  );
                })}

                {/* Adicionar item genérico ao final */}
                <div style={{ padding:'8px 16px 12px' }}>
                  <button onClick={() => {
                    const ultimaSecao = [...itens].filter(i => !i._secao).pop()?.secao || 'caixa_box';
                    addItemNaSecao(ultimaSecao);
                  }}
                    style={{ display:'flex', alignItems:'center', gap:7, padding:'9px 18px', borderRadius:9, border:'1.5px dashed #ddd', background:'transparent', color:'#888', fontSize:13, fontWeight:600, cursor:'pointer', width:'100%', justifyContent:'center', transition:'all 0.12s', fontFamily:'inherit' }}
                    onMouseEnter={e => { e.currentTarget.style.background='#f0f7ff'; e.currentTarget.style.borderColor='#185FA550'; e.currentTarget.style.color='#185FA5'; }}
                    onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.borderColor='#ddd'; e.currentTarget.style.color='#888'; }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>
                    Adicionar item ao final
                  </button>
                </div>
              </div>
            )}

            {/* Feedback */}
            {feedback && (() => {
              const fc = feedbackCores[feedback.tipo] || feedbackCores.info;
              return (
                <div style={{ padding:'12px 16px', borderRadius:10, border:`1.5px solid ${fc.border}`, fontSize:13, fontWeight:600, display:'flex', alignItems:'center', gap:8, background:fc.bg, color:fc.color, marginBottom:12 }}>
                  {feedback.tipo === 'success' ? '✓' : feedback.tipo === 'error' ? '⚠' : 'ℹ'} {feedback.msg}
                </div>
              );
            })()}

            {/* Ações */}
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end', flexWrap:'wrap' }}>
              <button onClick={() => {
                  if (itensReaisCount > 0) setPreviewRel({ id:0, ...cabecalho, itens });
                }}
                style={{ display:'flex', alignItems:'center', gap:7, padding:'11px 20px', borderRadius:10, border:'1.5px solid #e0e0e0', background:'#f5f5f5', color:'#333', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3"/><path d="M20.188 10.934C21.196 11.768 21.196 12.232 20.188 13.066 18.768 14.242 15.636 16 12 16c-3.636 0-6.768-1.758-8.188-2.934C2.804 12.232 2.804 11.768 3.812 10.934 5.232 9.758 8.364 8 12 8c3.636 0 6.768 1.758 8.188 2.934z" stroke="currentColor" strokeWidth="2" fill="none"/></svg>
                Pré-visualizar
              </button>
              <button onClick={salvarRelatorio}
                style={{ display:'flex', alignItems:'center', gap:7, padding:'11px 22px', borderRadius:10, border:'none', background:'linear-gradient(135deg,#185FA5,#1a7fd4)', color:'#fff', fontSize:13, fontWeight:800, cursor:'pointer', boxShadow:'0 3px 10px rgba(24,95,165,0.3)', fontFamily:'inherit' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><polyline points="17 21 17 13 7 13 7 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><polyline points="7 3 7 8 15 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Salvar Relatório
              </button>
            </div>
          </>
        )}

        {/* ════════ ABA HISTÓRICO ════════ */}
        {aba === 'historico' && (
          <>
{/* Botão recarregar */}
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
      <div style={{ fontSize:13, color:'#888', fontWeight:600 }}>
        {loadingHist ? 'Carregando...' : `${relatorios.length} relatório(s) na planilha`}
      </div>
      <div style={{ display:'flex', gap:8 }}>
        <button onClick={carregarHistorico}
          style={{ display:'flex', alignItems:'center', gap:6, padding:'9px 16px', borderRadius:9, border:'1.5px solid #e0e0e0', background:'#f5f5f5', color:'#555', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M3 12a9 9 0 109-9M3 3v4h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Atualizar
        </button>
        <button onClick={() => setAba('novo')}
          style={{ display:'flex', alignItems:'center', gap:7, padding:'9px 18px', borderRadius:9, border:'none', background:'linear-gradient(135deg,#185FA5,#1a7fd4)', color:'#fff', fontSize:13, fontWeight:800, cursor:'pointer', boxShadow:'0 3px 10px rgba(24,95,165,0.3)', fontFamily:'inherit' }}>
          + Novo Relatório
        </button>
      </div>
    </div>

    {erroHist && (
      <div style={{ padding:'12px 16px', borderRadius:10, border:'1.5px solid #E24B4A', background:'#E24B4A14', color:'#A32D2D', fontSize:13, fontWeight:600, marginBottom:16 }}>
        ⚠ {erroHist}
      </div>
    )}

    {loadingHist ? (
      <div style={{ padding:'60px 20px', textAlign:'center', color:'#bbb', fontSize:14 }}>
        Buscando da planilha...
      </div>
    ) : relatorios.length === 0 ? (
              <div style={{ padding:'60px 20px', textAlign:'center', color:'#bbb' }}>
                <div style={{ fontSize:48, marginBottom:12 }}>📋</div>
                <div style={{ fontSize:15, fontWeight:700, color:'#888', marginBottom:8 }}>Nenhum relatório salvo ainda</div>
                <button onClick={() => setAba('novo')} style={{ background:'none', border:'none', color:'#185FA5', cursor:'pointer', fontWeight:700, fontSize:13, fontFamily:'inherit' }}>Criar o primeiro relatório →</button>
              </div>
            ) : (
              <>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
                  <div style={{ fontSize:13, color:'#888', fontWeight:600 }}>{relatorios.length} relatório{relatorios.length !== 1 ? 's' : ''} salvos</div>
                  <button onClick={() => setAba('novo')} style={{ display:'flex', alignItems:'center', gap:7, padding:'9px 18px', borderRadius:9, border:'none', background:'linear-gradient(135deg,#185FA5,#1a7fd4)', color:'#fff', fontSize:13, fontWeight:800, cursor:'pointer', boxShadow:'0 3px 10px rgba(24,95,165,0.3)', fontFamily:'inherit' }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>
                    Novo Relatório
                  </button>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {relatorios.map(rel => {
                    const itensR = (rel.itens || []).filter(i => !i._secao);
                    const sob = itensR.filter(i => i.status === 'SOBRANDO').length;
                    const fal = itensR.filter(i => i.status === 'FALTANDO').length;
                    const okR = itensR.length - sob - fal;

                    return (
                      <div key={rel.id} onClick={() => setPreviewRel(rel)}
                        style={{ background:'#fff', border:'1.5px solid #e5e7eb', borderRadius:14, padding:'16px 20px', display:'flex', alignItems:'center', gap:16, cursor:'pointer', transition:'all 0.15s', boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor='#185FA560'; e.currentTarget.style.boxShadow='0 4px 16px rgba(24,95,165,0.1)'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor='#e5e7eb'; e.currentTarget.style.boxShadow='0 1px 4px rgba(0,0,0,0.04)'; }}>

                        {/* Ícone */}
                        <div style={{ width:44, height:44, borderRadius:12, background:'linear-gradient(135deg,#0f2544,#185FA5)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="rgba(255,255,255,.9)" strokeWidth="1.5"/><polyline points="14 2 14 8 20 8" stroke="rgba(255,255,255,.9)" strokeWidth="1.5"/><line x1="16" y1="13" x2="8" y2="13" stroke="rgba(255,255,255,.9)" strokeWidth="1.5" strokeLinecap="round"/></svg>
                        </div>

                        {/* Info */}
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:14, fontWeight:800, color:'#111', marginBottom:4, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                            {rel.tecnico || 'Sem técnico'} — {rel.carro || '—'}
                          </div>
                          <div style={{ fontSize:12, color:'#888', display:'flex', gap:10, flexWrap:'wrap' }}>
                            <span>📅 {rel.data}</span>
                            <span>🏭 {rel.estoque}</span>
                            {rel.estoquista && <span>👤 {rel.estoquista}</span>}
                            <span>📦 {itensR.length} iten{itensR.length !== 1 ? 's' : ''}</span>
                          </div>
                        </div>

                        {/* Pills */}
                        <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                          {okR > 0  && <span style={{ padding:'4px 10px', borderRadius:8, background:'#EAF2FC', border:'1.5px solid #185FA540', color:'#185FA5', fontSize:11, fontWeight:800 }}>✓ {okR}</span>}
                          {sob > 0  && <span style={{ padding:'4px 10px', borderRadius:8, background:'#E8F5F0', border:'1.5px solid #1D9E7540', color:'#1D9E75', fontSize:11, fontWeight:800 }}>↑ {sob}</span>}
                          {fal > 0  && <span style={{ padding:'4px 10px', borderRadius:8, background:'#FDE8E8', border:'1.5px solid #E24B4A40', color:'#E24B4A', fontSize:11, fontWeight:800 }}>↓ {fal}</span>}
                        </div>

                        {/* Ações */}
                        <div style={{ display:'flex', gap:6, flexShrink:0 }} onClick={e => e.stopPropagation()}>
                          <button onClick={() => duplicarRelatorio(rel)}
                            style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 12px', borderRadius:8, border:'1.5px solid #e0e0e0', background:'#f9f9f9', color:'#555', fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                            Replicar
                          </button>
                          <button onClick={e => excluirRelatorio(rel.id, e)}
                            style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 12px', borderRadius:8, border:'1.5px solid #E24B4A40', background:'#E24B4A10', color:'#E24B4A', fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><polyline points="3 6 5 6 21 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            Excluir
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {previewRel && <PreviewRelatorio rel={previewRel} onClose={() => setPreviewRel(null)} />}
    </>
  );
}