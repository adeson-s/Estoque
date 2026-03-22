import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../AppContext';
import PageHeader from '../components/PageHeader';
import SheetsService from '../services/SheetsService';

// ─── helpers ─────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  PERDIDO:         { cls: 'danger',  label: 'Perdido'       },
  SOBRA:           { cls: 'success', label: 'Sobra'         },
  TROCA:           { cls: 'info',    label: 'Troca'         },
  'NÃO ASSOCIOU':  { cls: 'purple',  label: 'Não associou'  },
  PENDENTE:        { cls: 'warning', label: 'Pendente'      },
};

const badgeClass     = (s) => STATUS_CONFIG[s]?.cls ?? 'warning';
const STATUS_OPTIONS = ['TODOS', 'PERDIDO', 'SOBRA', 'TROCA', 'NÃO ASSOCIOU', 'PENDENTE'];
const PAGE_SIZE      = 20;

const toDateStr    = (d) => d.toISOString().split('T')[0];
const subtractDays = (n) => { const d = new Date(); d.setDate(d.getDate() - n); d.setHours(0, 0, 0, 0); return d; };
const parseDate    = (raw) => { if (!raw) return null; const d = new Date(raw); return isNaN(d) ? null : d; };

// ─── DetalheModal ─────────────────────────────────────────────────────────────

function DetalheModal({ mov, onClose }) {
  useEffect(() => {
    const fn = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [onClose]);

  if (!mov) return null;

  const status = mov.STATUS || 'PENDENTE';
  const cfg    = STATUS_CONFIG[status] ?? { cls: 'warning', label: status };
  const obs    = mov['OBSERVAÇÕES'] || mov.OBSERVACOES || null;

  const fields = [
    { label: 'Data',       value: SheetsService.formatDate(mov.DATA) },
    { label: 'Técnico',    value: mov['TÉCNICO'] || mov.TECNICO || '—' },
    { label: 'Placa',      value: mov.PLACA || '—', mono: true },
    { label: 'Quantidade', value: String(mov.QUANTIDADE || '—') },
    { label: 'OS / Ref.',  value: mov.OS || mov['O.S'] || mov.ORDEM || '—' },
  ].filter(f => f.value && f.value !== '—');

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>

        <div className="modal-header">
          <div className="modal-header__left">
            <span className={`modal-pill modal-pill--${cfg.cls}`}>
              <span className={`modal-dot modal-dot--${cfg.cls}`} />
              {cfg.label}
            </span>
            <h2 className="modal-title">Detalhes da movimentação</h2>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Fechar">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {mov.PRODUTO && (
          <div className="modal-produto">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
            </svg>
            <span>{mov.PRODUTO}</span>
          </div>
        )}

        <div className="modal-grid">
          {fields.map(({ label, value, mono }) => (
            <div key={label} className="modal-field">
              <span className="modal-field__label">{label}</span>
              <span className={`modal-field__value${mono ? ' modal-field__value--mono' : ''}`}>{value}</span>
            </div>
          ))}
        </div>

        <div className="modal-obs-section">
          <span className="modal-obs-label">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            Observações
          </span>
          {obs
            ? <p className="modal-obs">{obs}</p>
            : <p className="modal-obs modal-obs--vazia">Nenhuma observação registrada.</p>}
        </div>

        <div className="modal-footer">
          <button className="modal-btn" onClick={onClose}>Fechar</button>
        </div>
      </div>
    </div>
  );
}

// ─── MetricCard ───────────────────────────────────────────────────────────────

function MetricCard({ label, value, sub, variant }) {
  return (
    <div className={`metric-card metric-card--${variant}`}>
      <span className="metric-card__label">{label}</span>
      <span className="metric-card__value">{value.toLocaleString('pt-BR')}</span>
      {sub && <span className="metric-card__sub">{sub}</span>}
    </div>
  );
}

// ─── PeriodSelector ───────────────────────────────────────────────────────────

function PeriodSelector({ periodo, onPeriodo, customRange, onCustomRange }) {
  const presets = [
    { label: '7 dias',  days: 7  },
    { label: '30 dias', days: 30 },
    { label: '90 dias', days: 90 },
  ];
  return (
    <div className="period-selector">
      <div className="period-presets">
        {presets.map(({ label, days }) => (
          <button key={days}
            className={`period-btn${periodo === days ? ' period-btn--active' : ''}`}
            onClick={() => onPeriodo(days)}>
            {label}
          </button>
        ))}
        <button className={`period-btn${periodo === null ? ' period-btn--active' : ''}`}
          onClick={() => onPeriodo(null)}>
          Período
        </button>
      </div>
      {periodo === null && (
        <div className="custom-range">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          <input type="date" value={customRange.start} max={customRange.end || toDateStr(new Date())}
            onChange={e => onCustomRange({ ...customRange, start: e.target.value })} />
          <span className="custom-range__sep">→</span>
          <input type="date" value={customRange.end} min={customRange.start} max={toDateStr(new Date())}
            onChange={e => onCustomRange({ ...customRange, end: e.target.value })} />
        </div>
      )}
    </div>
  );
}

// ─── Movimentacoes ────────────────────────────────────────────────────────────

export default function Movimentacoes() {
  const { dados, exportarExcel } = useApp();
  const { movimentacoes } = dados;

  const [busca,          setBusca]          = useState('');
  const [periodo,        setPeriodo]        = useState(7);
  const [customRange,    setCustomRange]    = useState({ start: toDateStr(subtractDays(30)), end: toDateStr(new Date()) });
  const [statusFiltro,   setStatusFiltro]   = useState('TODOS');
  const [tecnicoFiltro,  setTecnicoFiltro]  = useState('');
  const [pagina,         setPagina]         = useState(1);
  const [ordenacao,      setOrdenacao]      = useState({ campo: 'DATA', asc: false });
  const [movSelecionado, setMovSelecionado] = useState(null);

  const tecnicos = useMemo(() => {
    const s = new Set(movimentacoes.map(m => m['TÉCNICO'] || m.TECNICO).filter(Boolean));
    return [...s].sort();
  }, [movimentacoes]);

  const { dateStart, dateEnd } = useMemo(() => {
    if (periodo !== null) return { dateStart: subtractDays(periodo), dateEnd: new Date() };
    return {
      dateStart: customRange.start ? new Date(customRange.start) : null,
      dateEnd:   customRange.end   ? new Date(customRange.end + 'T23:59:59') : null,
    };
  }, [periodo, customRange]);

  const filtrados = useMemo(() => {
    const low = busca.toLowerCase();
    return [...movimentacoes]
      .filter(m => {
        const data = parseDate(m.DATA);
        if (dateStart && data && data < dateStart) return false;
        if (dateEnd   && data && data > dateEnd)   return false;
        if (statusFiltro !== 'TODOS' && m.STATUS !== statusFiltro) return false;
        const tec = m['TÉCNICO'] || m.TECNICO || '';
        if (tecnicoFiltro && tec !== tecnicoFiltro) return false;
        if (low && !JSON.stringify(m).toLowerCase().includes(low)) return false;
        return true;
      })
      .sort((a, b) => {
        const { campo, asc } = ordenacao;
        const va = a[campo] ?? ''; const vb = b[campo] ?? '';
        const cmp = va < vb ? -1 : va > vb ? 1 : 0;
        return asc ? cmp : -cmp;
      });
  }, [movimentacoes, dateStart, dateEnd, statusFiltro, tecnicoFiltro, busca, ordenacao]);

  const metricas = useMemo(() => ({
    total:       filtrados.length,
    perdidos:    filtrados.filter(m => m.STATUS === 'PERDIDO').length,
    sobras:      filtrados.filter(m => m.STATUS === 'SOBRA').length,
    trocas:      filtrados.filter(m => m.STATUS === 'TROCA').length,
    naoAssociou: filtrados.filter(m => m.STATUS === 'NÃO ASSOCIOU').length,
  }), [filtrados]);

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / PAGE_SIZE));
  const paginaAtual  = Math.min(pagina, totalPaginas);
  const paginados    = filtrados.slice((paginaAtual - 1) * PAGE_SIZE, paginaAtual * PAGE_SIZE);
  const mudarPagina  = (p) => { if (p >= 1 && p <= totalPaginas) setPagina(p); };

  const toggleOrdem = (campo) => {
    setOrdenacao(o => o.campo === campo ? { campo, asc: !o.asc } : { campo, asc: true });
    setPagina(1);
  };

  const SortIcon = ({ campo }) => ordenacao.campo !== campo
    ? <span className="sort-icon sort-icon--idle">↕</span>
    : <span className="sort-icon sort-icon--active">{ordenacao.asc ? '↑' : '↓'}</span>;

  const pageNums = useMemo(() => {
    const pages = [];
    for (let i = 1; i <= totalPaginas; i++)
      if (i === 1 || i === totalPaginas || (i >= paginaAtual - 2 && i <= paginaAtual + 2)) pages.push(i);
    const out = []; let prev = null;
    for (const p of pages) { if (prev !== null && p - prev > 1) out.push('...'); out.push(p); prev = p; }
    return out;
  }, [totalPaginas, paginaAtual]);

  return (
    <>
      <PageHeader title="Movimentações" subtitle="Histórico completo" />

      <div className="page-content">

        {/* métricas */}
        <div className="metrics-grid">
          <MetricCard label="Total no período" value={metricas.total}       sub="registros filtrados" variant="neutral"  />
          <MetricCard label="Perdidos"          value={metricas.perdidos}    sub="no período"          variant="danger"   />
          <MetricCard label="Sobras"            value={metricas.sobras}      sub="no período"          variant="success"  />
          <MetricCard label="Trocas"            value={metricas.trocas}      sub="no período"          variant="info"     />
          <MetricCard label="Não associou"      value={metricas.naoAssociou} sub="no período"          variant="purple"   />
        </div>

        <div className="table-card">
          <div className="table-header">
            <h3>Histórico de Movimentações</h3>
          </div>

          {/* toolbar */}
          <div className="toolbar">
            <div className="search-input-wrap">
              <svg className="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input type="text" className="search-input search-input--icon"
                placeholder="Buscar por técnico, placa, produto..."
                value={busca} onChange={e => { setBusca(e.target.value); setPagina(1); }} />
              {busca && (
                <button className="search-clear" onClick={() => { setBusca(''); setPagina(1); }}>✕</button>
              )}
            </div>

            <PeriodSelector
              periodo={periodo}
              onPeriodo={p => { setPeriodo(p); setPagina(1); }}
              customRange={customRange}
              onCustomRange={r => { setCustomRange(r); setPagina(1); }} />

            <select className="filter-select" value={tecnicoFiltro}
              onChange={e => { setTecnicoFiltro(e.target.value); setPagina(1); }}>
              <option value="">Todos os técnicos</option>
              {tecnicos.map(t => <option key={t} value={t}>{t}</option>)}
            </select>

            <button className="btn-icon" onClick={exportarExcel}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Exportar
            </button>
          </div>

          {/* chips */}
          <div className="chip-row">
            <span className="chip-row__label">Status:</span>
            {STATUS_OPTIONS.map(s => (
              <button key={s}
                className={`chip${statusFiltro === s ? ' chip--active' : ''}`}
                onClick={() => { setStatusFiltro(s); setPagina(1); }}>
                {s === 'TODOS' ? 'Todos' : STATUS_CONFIG[s]?.label ?? s}
              </button>
            ))}
            <span className="chip-row__count">
              {filtrados.length.toLocaleString('pt-BR')} registro{filtrados.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* tabela */}
          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th className="th-sortable" onClick={() => toggleOrdem('DATA')}>Data <SortIcon campo="DATA" /></th>
                  <th className="th-sortable" onClick={() => toggleOrdem('TÉCNICO')}>Técnico <SortIcon campo="TÉCNICO" /></th>
                  <th>Placa</th>
                  <th>Produto</th>
                  <th style={{ textAlign: 'center' }}>Qtd</th>
                  <th className="th-sortable" onClick={() => toggleOrdem('STATUS')}>Status <SortIcon campo="STATUS" /></th>
                  <th>Observações</th>
                </tr>
              </thead>
              <tbody>
                {paginados.map((m, i) => (
                  <tr key={i} className="tr-clickable" onClick={() => setMovSelecionado(m)} title="Clique para ver detalhes">
                    <td className="td-muted">{SheetsService.formatDate(m.DATA)}</td>
                    <td>{m['TÉCNICO'] || m.TECNICO || '—'}</td>
                    <td>{m.PLACA ? <code className="placa-badge">{m.PLACA}</code> : <span className="td-muted">—</span>}</td>
                    <td style={{ maxWidth: 260 }} className="td-truncate">{m.PRODUTO || '—'}</td>
                    <td style={{ textAlign: 'center' }}>{m.QUANTIDADE || '—'}</td>
                    <td><span className={`badge ${badgeClass(m.STATUS)}`}>{m.STATUS || '—'}</span></td>
                    <td style={{ maxWidth: 180 }} className="td-truncate td-muted">
                      {m['OBSERVAÇÕES'] || m.OBSERVACOES || '—'}
                    </td>
                  </tr>
                ))}
                {paginados.length === 0 && (
                  <tr>
                    <td colSpan="7" className="td-empty">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                      </svg>
                      Nenhum registro encontrado
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* paginação */}
          {totalPaginas > 1 && (
            <div className="pagination">
              <span className="pagination__info">
                {((paginaAtual - 1) * PAGE_SIZE + 1).toLocaleString('pt-BR')}–
                {Math.min(paginaAtual * PAGE_SIZE, filtrados.length).toLocaleString('pt-BR')} de{' '}
                {filtrados.length.toLocaleString('pt-BR')}
              </span>
              <div className="pagination__pages">
                <button className="pg-btn" onClick={() => mudarPagina(paginaAtual - 1)} disabled={paginaAtual === 1}>‹</button>
                {pageNums.map((p, i) =>
                  p === '...'
                    ? <span key={`e${i}`} className="pg-ellipsis">…</span>
                    : <button key={p} className={`pg-btn${p === paginaAtual ? ' pg-btn--active' : ''}`}
                        onClick={() => mudarPagina(p)}>{p}</button>
                )}
                <button className="pg-btn" onClick={() => mudarPagina(paginaAtual + 1)} disabled={paginaAtual === totalPaginas}>›</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* modal */}
      {movSelecionado && (
        <DetalheModal mov={movSelecionado} onClose={() => setMovSelecionado(null)} />
      )}

      <style>{`
        /* métricas */
        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(5, minmax(0,1fr));
          gap: 10px; margin-bottom: 1rem;
        }
        @media (max-width: 900px) { .metrics-grid { grid-template-columns: repeat(3, minmax(0,1fr)); } }
        @media (max-width: 560px) { .metrics-grid { grid-template-columns: repeat(2, minmax(0,1fr)); } }

        .metric-card { background: var(--bg-secondary,#f7f8fa); border-radius: 10px; padding: .8rem 1rem; border: 1px solid transparent; }
        .metric-card__label { display: block; font-size: 12px; color: var(--text-light,#888); margin-bottom: 4px; }
        .metric-card__value { display: block; font-size: 24px; font-weight: 600; line-height: 1.1; }
        .metric-card__sub   { display: block; font-size: 11px; color: var(--text-light,#aaa); margin-top: 3px; }
        .metric-card--danger  { border-color: rgba(229,62,62,.18); }
        .metric-card--success { border-color: rgba(56,161,105,.18); }
        .metric-card--info    { border-color: rgba(49,130,206,.18); }
        .metric-card--purple  { border-color: rgba(128,90,213,.18); }
        .metric-card--danger  .metric-card__value { color: var(--danger,#e53e3e); }
        .metric-card--success .metric-card__value { color: var(--success,#38a169); }
        .metric-card--info    .metric-card__value { color: var(--info,#3182ce); }
        .metric-card--purple  .metric-card__value { color: #805ad5; }

        /* toolbar */
        .toolbar { display: flex; flex-wrap: wrap; gap: 8px; align-items: flex-start; padding: .75rem 1.25rem; border-bottom: 1px solid var(--border-color,#e2e8f0); }
        .search-input-wrap { position: relative; display: flex; align-items: center; flex: 1; min-width: 180px; }
        .search-icon { position: absolute; left: 10px; color: var(--text-light,#aaa); pointer-events: none; }
        .search-input--icon { padding-left: 32px !important; padding-right: 28px !important; }
        .search-clear { position: absolute; right: 8px; background: none; border: none; cursor: pointer; font-size: 11px; color: var(--text-light,#aaa); padding: 0; }
        .search-clear:hover { color: var(--text-color,#333); }

        .period-selector { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
        .period-presets { display: flex; border: 1px solid var(--border-color,#e2e8f0); border-radius: 8px; overflow: hidden; }
        .period-btn { padding: 6px 12px; font-size: 12px; font-weight: 500; background: transparent; color: var(--text-light,#888); cursor: pointer; border: none; border-right: 1px solid var(--border-color,#e2e8f0); white-space: nowrap; transition: background .1s,color .1s; }
        .period-btn:last-child { border-right: none; }
        .period-btn:hover { background: var(--bg-secondary,#f5f5f5); color: var(--text-color,#333); }
       .custom-range { display: flex; align-items: center; gap: 6px; padding: 5px 10px; background: var(--bg-secondary,#f5f5f5); border: 1px solid var(--border-color,#e2e8f0); border-radius: 8px; color: var(--text-light,#888); }
        .custom-range input[type=date] { border: none; background: transparent; font-size: 12px; color: var(--text-color,#333); outline: none; cursor: pointer; padding: 2px 0; }
        .custom-range__sep { font-size: 12px; color: var(--text-light,#aaa); }
        .filter-select { border: 1px solid var(--border-color,#e2e8f0); border-radius: 8px; padding: 6px 10px; font-size: 12px; background: var(--bg-secondary,#f5f5f5); color: var(--text-color,#333); outline: none; cursor: pointer; }

        /* chips */
        .chip-row { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; padding: .5rem 1.25rem; border-bottom: 1px solid var(--border-color,#e2e8f0); }
        .chip-row__label { font-size: 11px; color: var(--text-light,#aaa); margin-right: 2px; }
        .chip-row__count { margin-left: auto; font-size: 11px; color: var(--text-light,#aaa); }
        .chip { font-size: 11px; padding: 3px 10px; border-radius: 99px; border: 1px solid var(--border-color,#e2e8f0); cursor: pointer; background: transparent; color: var(--text-light,#888); transition: background .1s,color .1s; }
        .chip:hover { background: var(--bg-secondary,#f5f5f5); color: var(--text-color,#333); }
        .chip--active { background: var(,#888); color: var(--primary,#3182ce); border-color: var(--primary,#3182ce); font-weight: 500; }

        /* table */
        .th-sortable { cursor: pointer; user-select: none; white-space: nowrap; }
        .th-sortable:hover { color: var(--text-color,#333); }
        .sort-icon { font-size: 10px; margin-left: 3px; }
        .sort-icon--idle   { opacity: .35; }
        .sort-icon--active { color: var(--primary,#3182ce); }
        .tr-clickable { cursor: pointer; transition: background .1s; }
        .tr-clickable:hover td { background: var(--primary-light,#ebf8ff) !important; }
        .td-muted    { color: var(--text-light,#aaa); }
        .td-truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .td-empty    { text-align: center; padding: 2.5rem !important; color: var(--text-light,#aaa); }
        .placa-badge { font-size: 11px; background: var(--bg-secondary,#f5f5f5); padding: 2px 7px; border-radius: 4px; font-family: monospace; letter-spacing: .04em; }
        .badge.purple { background: #f3e8ff; color: #6b21a8; }

        /* paginação */
        .pagination { display: flex; align-items: center; justify-content: space-between; padding: .75rem 1.25rem; border-top: 1px solid var(--border-color,#e2e8f0); flex-wrap: wrap; gap: 8px; }
        .pagination__info { font-size: 12px; color: var(--text-light,#888); }
        .pagination__pages { display: flex; gap: 4px; align-items: center; }
        .pg-btn { border: 1px solid var(--border-color,#e2e8f0); border-radius: 6px; padding: 4px 10px; font-size: 12px; background: transparent; color: var(--text-color,#333); cursor: pointer; transition: background .1s; }
        .pg-btn:hover:not(:disabled) { background: var(--bg-secondary,#f5f5f5); }
        .pg-btn:disabled { opacity: .35; cursor: default; }
        .pg-btn--active { background: var(--primary-light,#ebf8ff); color: var(--primary,#3182ce); border-color: var(--primary,#3182ce); font-weight: 500; }
        .pg-ellipsis { font-size: 12px; color: var(--text-light,#aaa); padding: 0 4px; }

        /* modal overlay */
        .modal-overlay {
          position: fixed; inset: 0; z-index: 1000;
          background: rgba(15,15,20,.55);
          backdrop-filter: blur(6px);
          display: flex; align-items: center; justify-content: center;
          padding: 1rem;
          animation: moFadeIn .18s ease;
        }
        @keyframes moFadeIn { from { opacity: 0; } to { opacity: 1; } }

        /* modal box */
        .modal-box {
          background: var(--bg-primary,#fff);
          border-radius: 18px;
          width: 100%; max-width: 500px;
          box-shadow: 0 32px 80px rgba(0,0,0,.22), 0 2px 8px rgba(0,0,0,.06);
          border: 1px solid var(--border-color,#e2e8f0);
          animation: moSlideUp .24s cubic-bezier(.22,1,.36,1);
          overflow: hidden;
        }
        @keyframes moSlideUp {
          from { opacity: 0; transform: translateY(24px) scale(.96); }
          to   { opacity: 1; transform: none; }
        }

        /* modal header */
        .modal-header { display: flex; align-items: flex-start; justify-content: space-between; padding: 1.2rem 1.2rem .8rem; border-bottom: 1px solid var(--border-color,#e2e8f0); }
        .modal-header__left { display: flex; flex-direction: column; gap: 6px; }
        .modal-title { font-size: 16px; font-weight: 600; margin: 0; color: var(--text-color,#1a202c); }

        .modal-pill {
          display: inline-flex; align-items: center; gap: 5px;
          font-size: 11px; font-weight: 700; letter-spacing: .05em; text-transform: uppercase;
          padding: 3px 10px; border-radius: 99px; width: fit-content;
        }
        .modal-pill--danger  { background: #fff5f5; color: #c53030; }
        .modal-pill--success { background: #f0fff4; color: #276749; }
        .modal-pill--info    { background: #ebf8ff; color: #2b6cb0; }
        .modal-pill--warning { background: #fffaf0; color: #c05621; }
        .modal-pill--purple  { background: #faf5ff; color: #6b21a8; }

        .modal-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
        .modal-dot--danger  { background: #e53e3e; }
        .modal-dot--success { background: #38a169; }
        .modal-dot--info    { background: #3182ce; }
        .modal-dot--warning { background: #dd6b20; }
        .modal-dot--purple  { background: #805ad5; }

        .modal-close {
          background: var(--bg-secondary,#f5f5f5); border: none; border-radius: 8px;
          width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;
          cursor: pointer; color: var(--text-light,#999); flex-shrink: 0; margin-top: 2px;
          transition: background .12s, color .12s;
        }
        .modal-close:hover { background: var(--border-color,#e2e8f0); color: var(--text-color,#333); }

        /* produto destaque */
        .modal-produto {
          display: flex; align-items: center; gap: 9px;
          margin: 1rem 1.2rem .5rem;
          padding: .75rem 1rem;
          background: var(--bg-secondary,#f7f8fa);
          border-radius: 10px;
          border: 1px solid var(--border-color,#e2e8f0);
          font-size: 13px; font-weight: 500; color: var(--text-color,#2d3748);
          line-height: 1.4;
        }
        .modal-produto svg { flex-shrink: 0; opacity: .45; }

        /* grid de campos */
        .modal-grid {
          display: grid; grid-template-columns: 1fr 1fr;
          margin: .5rem 1.2rem .8rem;
          border: 1px solid var(--border-color,#e2e8f0);
          border-radius: 10px; overflow: hidden;
        }
        .modal-field {
          display: flex; flex-direction: column; gap: 3px;
          padding: .65rem .9rem;
          border-bottom: 1px solid var(--border-color,#e2e8f0);
          border-right: 1px solid var(--border-color,#e2e8f0);
        }
        .modal-field:nth-child(even)       { border-right: none; }
        .modal-field:nth-last-child(-n+2)  { border-bottom: none; }
        .modal-field:last-child:nth-child(odd) { border-bottom: none; grid-column: span 2; }
        .modal-field__label { font-size: 10px; font-weight: 600; color: var(--text-light,#aaa); text-transform: uppercase; letter-spacing: .06em; }
        .modal-field__value { font-size: 13px; font-weight: 500; color: var(--text-color,#2d3748); }
        .modal-field__value--mono { font-family: monospace; letter-spacing: .05em; }

        /* observações */
        .modal-obs-section { margin: 0 1.2rem .9rem; }
        .modal-obs-label {
          display: flex; align-items: center; gap: 5px; margin-bottom: .4rem;
          font-size: 10px; font-weight: 600; color: var(--text-light,#aaa);
          text-transform: uppercase; letter-spacing: .06em;
        }
        .modal-obs {
          font-size: 13px; line-height: 1.65;
          color: var(--text-color,#2d3748);
          background: var(--bg-secondary,#f7f8fa);
          border-radius: 8px; padding: .75rem 1rem;
          border: 1px solid var(--border-color,#e2e8f0);
          margin: 0; white-space: pre-wrap; word-break: break-word;
          min-height: 60px;
        }
        .modal-obs--vazia { color: var(--text-light,#bbb); font-style: italic; }

        /* footer */
        .modal-footer {
          display: flex; justify-content: flex-end;
          padding: .85rem 1.2rem;
          border-top: 1px solid var(--border-color,#e2e8f0);
          background: var(--bg-secondary,#fafafa);
        }
        .modal-btn {
          padding: 7px 24px; font-size: 13px; font-weight: 500;
          border-radius: 8px; cursor: pointer;
          border: 1px solid var(--border-color,#e2e8f0);
          background: var(--bg-primary,#fff);
          color: var(--text-color,#333);
          transition: background .12s;
        }
        .modal-btn:hover { background: var(--bg-secondary,#f5f5f5); }

/* ================= MOBILE FILTER FIX ================= */

@media (max-width: 768px) {

  .toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .search-input-wrap {
    width: 100%;
  }

  .period-selector {
    width: 100%;
    justify-content: space-between;
  }

  .period-presets {
    width: 100%;
    flex-wrap: wrap;
  }

  .period-btn {
    flex: 1;
    text-align: center;
  }

  .custom-range {
    width: 100%;
    justify-content: space-between;
  }

  .custom-range input {
    flex: 1;
    min-width: 0;
  }

  .filter-select {
    width: 100%;
  }

  .btn-icon {
    width: 100%;
    justify-content: center;
  }

  /* chips */
  .chip-row {
    flex-wrap: nowrap;
    overflow-x: auto;
    padding-bottom: 6px;
  }

  .chip-row::-webkit-scrollbar {
    height: 4px;
  }

  .chip {
    flex-shrink: 0;
  }

  .chip-row__count {
    display: none; /* opcional: tira no mobile */
  }
}


      `}</style>
    </>
  );
}