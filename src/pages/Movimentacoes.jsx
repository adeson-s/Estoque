import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../AppContext';
import PageHeader from '../components/PageHeader';
import SheetsService from '../services/SheetsService';
import '../css/estiloMovimentaçoes.css';
import { parseDate } from '../services/date';
import RelatorioPDFButton from '../components/RelatorioPDFButton';

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

  let va = a[campo];
  let vb = b[campo];

  // 🔥 TRATAMENTO CORRETO PARA DATA
  if (campo === 'DATA') {
    va = parseDate(va) || new Date(0);
    vb = parseDate(vb) || new Date(0);
  }

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

            <RelatorioPDFButton
  filtrados={filtrados}
  metricas={metricas}
  periodo={periodo}
  customRange={customRange}
  tecnicoFiltro={tecnicoFiltro}
  statusFiltro={statusFiltro}
  busca={busca}
/>
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

    </>
  );
}