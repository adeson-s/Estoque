// src/pages/GerenciamentoUsuarios.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth, CIDADES, PERMISSOES } from '../auth/AuthContext';
import PageHeader from '../components/PageHeader';
import SheetsService from '../services/SheetsService';

/* ─── helpers ─────────────────────────────────────────── */
function iniciaisNome(nome = '') {
  return nome.trim().split(' ').filter(Boolean).slice(0, 2).map(p => p[0].toUpperCase()).join('');
}
function corCidade(cidade) {
  const map = {
    MARICA:      '#185FA5',
    NITEROI:     '#1D9E75',
    ITABORAI:    '#D97706',
    PIRATININGA: '#7C3AED',
  };
  return map[cidade] || '#888';
}
function bgCidade(cidade) {
  const map = {
    MARICA:      '#EAF2FC',
    NITEROI:     '#E8F5F0',
    ITABORAI:    '#FEF3C7',
    PIRATININGA: '#EDE9FE',
  };
  return map[cidade] || '#f0f0f0';
}

/* ─── estilos ─────────────────────────────────────────── */
const s = {
  root: { padding: '0 16px 60px', maxWidth: 1100, margin: '0 auto', fontFamily: "'DM Sans', system-ui, sans-serif" },
  topBar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 },
  filtros: { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' },
  searchWrap: { position: 'relative' },
  searchInput: { padding: '8px 12px 8px 36px', borderRadius: 9, border: '1.5px solid #e0e0e0', fontSize: 13, background: '#f9f9f9', color: '#111', outline: 'none', fontFamily: 'inherit', width: 220 },
  searchIcon: { position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#bbb', pointerEvents: 'none' },
  select: { padding: '8px 12px', borderRadius: 9, border: '1.5px solid #e0e0e0', fontSize: 13, background: '#f9f9f9', color: '#111', outline: 'none', fontFamily: 'inherit', cursor: 'pointer' },
  btnPrimary: { display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 9, border: 'none', background: 'linear-gradient(135deg,#185FA5,#1a7fd4)', color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 3px 10px rgba(24,95,165,0.25)' },
  btnSecondary: { display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 9, border: '1.5px solid #e0e0e0', background: '#f5f5f5', color: '#555', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' },
  card: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', marginBottom: 10 },
  userRow: (ativo) => ({ display: 'grid', gridTemplateColumns: '44px 1fr 130px 110px 90px 110px', gap: 12, padding: '14px 18px', alignItems: 'center', opacity: ativo === 'NAO' ? 0.55 : 1, transition: 'background 0.12s' }),
  avatar: (cor, bg) => ({ width: 36, height: 36, borderRadius: '50%', background: bg, border: `2px solid ${cor}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: cor, flexShrink: 0 }),
  nameBlock: { minWidth: 0 },
  userName: { fontSize: 13, fontWeight: 800, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  userLogin: { fontSize: 11, color: '#999', marginTop: 2 },
  pill: (cor, bg) => ({ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 800, color: cor, background: bg, whiteSpace: 'nowrap' }),
  rolePill: (role) => ({
    display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 800,
    color: role === 'admin' ? '#0D3D6B' : '#555',
    background: role === 'admin' ? '#EAF2FC' : '#f0f0f0',
    border: `1px solid ${role === 'admin' ? '#185FA540' : '#e0e0e0'}`,
  }),
  statusPill: (ativo) => ({ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 800, color: ativo !== 'NAO' ? '#0A5E3A' : '#A32D2D', background: ativo !== 'NAO' ? '#E8F5F0' : '#FDE8E8' }),
  actions: { display: 'flex', gap: 6, justifyContent: 'flex-end' },
  iconBtn: (cor) => ({ width: 30, height: 30, borderRadius: 8, border: `1.5px solid ${cor}30`, background: `${cor}10`, color: cor, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, padding: 0, transition: 'all 0.12s' }),
  divider: { height: 1, background: '#f3f4f6', margin: '0 18px' },
  emptyState: { padding: '56px 24px', textAlign: 'center', color: '#bbb' },
  feedback: (ok) => ({ padding: '12px 16px', borderRadius: 10, border: `1.5px solid ${ok ? '#1D9E75' : '#E24B4A'}`, fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, background: ok ? '#1D9E7514' : '#E24B4A14', color: ok ? '#0A5E3A' : '#A32D2D', marginBottom: 16 }),
  resumo: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 20 },
  resumoCard: (cor, bg) => ({ padding: '14px 16px', borderRadius: 12, background: bg, border: `1.5px solid ${cor}30` }),
  resumoVal: (cor) => ({ fontSize: 28, fontWeight: 900, color: cor, letterSpacing: '-0.04em', lineHeight: 1 }),
  resumoLabel: { fontSize: 10, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 4 },
  tableHead: { display: 'grid', gridTemplateColumns: '44px 1fr 130px 110px 90px 110px', gap: 12, padding: '10px 18px', background: '#fafafa', borderBottom: '1px solid #f0f0f0' },
  thLabel: { fontSize: 10, fontWeight: 800, color: '#999', textTransform: 'uppercase', letterSpacing: '0.07em' },

  /* Modal */
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, backdropFilter: 'blur(4px)' },
  modal: { width: 'min(520px, 100%)', background: '#fff', borderRadius: 16, boxShadow: '0 24px 64px rgba(0,0,0,0.18)', overflow: 'hidden', animation: 'guSlide 0.2s ease' },
  modalHead: { padding: '16px 20px', background: 'linear-gradient(135deg,#0f2544,#185FA5)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  modalTitle: { fontSize: 15, fontWeight: 800, color: '#fff' },
  modalClose: { width: 30, height: 30, borderRadius: 8, border: '1px solid rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.12)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 },
  modalBody: { padding: '20px' },
  formGroup: { marginBottom: 14 },
  formLabel: { fontSize: 11, fontWeight: 700, color: '#666', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 5 },
  formInput: (highlight) => ({ width: '100%', padding: '9px 12px', borderRadius: 9, border: `1.5px solid ${highlight ? '#185FA580' : '#e0e0e0'}`, fontSize: 13, background: highlight ? '#F0F7FF' : '#f9f9f9', color: '#111', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }),
  formSelect: { width: '100%', padding: '9px 12px', borderRadius: 9, border: '1.5px solid #e0e0e0', fontSize: 13, background: '#f9f9f9', color: '#111', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', cursor: 'pointer' },
  formRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  modalFoot: { padding: '14px 20px', borderTop: '1px solid #f0f0f0', display: 'flex', gap: 8, justifyContent: 'flex-end' },
  btnCancel: { padding: '9px 18px', borderRadius: 9, border: '1.5px solid #e0e0e0', background: '#f5f5f5', color: '#555', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' },
  btnSave: (loading) => ({ padding: '9px 20px', borderRadius: 9, border: 'none', background: 'linear-gradient(135deg,#185FA5,#1a7fd4)', color: '#fff', fontSize: 13, fontWeight: 800, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 7 }),
};

/* ─── Modal de criar/editar usuário ──────────────────── */
function ModalUsuario({ usuario, cidadeAtual, sheetIdAtual, onSalvar, onFechar, loading, erro }) {
  const editando = !!usuario;
  const [form, setForm] = useState({
    username:  usuario?.USERNAME  || '',
    password:  '',
    name:      usuario?.NAME      || '',
    role:      usuario?.ROLE      || 'auxiliar',
    ativo:     usuario?.ATIVO !== 'NAO',
  });

  function set(campo, val) { setForm(p => ({ ...p, [campo]: val })); }

  function handleSalvar() {
    onSalvar({
      ...form,
      editando,
      cidade:  cidadeAtual,
    });
  }

  useEffect(() => {
    const fn = e => { if (e.key === 'Escape') onFechar(); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [onFechar]);

  return (
    <div style={s.overlay} onClick={onFechar}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>
        <div style={s.modalHead}>
          <span style={s.modalTitle}>{editando ? 'Editar usuário' : 'Novo usuário'}</span>
          <button style={s.modalClose} onClick={onFechar}>✕</button>
        </div>
        <div style={s.modalBody}>
          {erro && (
            <div style={{ ...s.feedback(false), marginBottom: 14 }}>⚠ {erro}</div>
          )}

          <div style={s.formGroup}>
            <label style={s.formLabel}>Nome completo *</label>
            <input value={form.name} onChange={e => set('name', e.target.value)}
              placeholder="Ex: João Silva" style={s.formInput(!!form.name)} />
          </div>

          <div style={{ ...s.formRow, ...s.formGroup }}>
            <div>
              <label style={s.formLabel}>Usuário (login) *</label>
              <input value={form.username} onChange={e => set('username', e.target.value.toLowerCase().replace(/\s/g,''))}
                placeholder="ex: joao.silva" style={s.formInput(!!form.username)}
                disabled={editando} />
              {editando && <span style={{ fontSize: 10, color: '#bbb', display: 'block', marginTop: 3 }}>Usuário não pode ser alterado</span>}
            </div>
            <div>
              <label style={s.formLabel}>{editando ? 'Nova senha' : 'Senha *'} {editando && <span style={{ fontWeight: 400, textTransform: 'none', fontSize: 10, color: '#bbb' }}>(deixe em branco para manter)</span>}</label>
              <input type="password" value={form.password} onChange={e => set('password', e.target.value)}
                placeholder={editando ? 'Manter senha atual' : 'Senha...'} style={s.formInput(!!form.password)} />
            </div>
          </div>

          <div style={{ ...s.formRow, ...s.formGroup }}>
            <div>
              <label style={s.formLabel}>Perfil *</label>
              <select value={form.role} onChange={e => set('role', e.target.value)} style={s.formSelect}>
                <option value="auxiliar">Auxiliar</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label style={s.formLabel}>Status</label>
              <select value={form.ativo ? 'SIM' : 'NAO'} onChange={e => set('ativo', e.target.value === 'SIM')} style={s.formSelect}>
                <option value="SIM">Ativo</option>
                <option value="NAO">Inativo</option>
              </select>
            </div>
          </div>

          {/* Preview permissões */}
          <div style={{ background: '#f8f9fa', borderRadius: 10, padding: '12px 14px', marginTop: 4 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Permissões do perfil</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {Object.entries(PERMISSOES[form.role] || {})
                .filter(([, v]) => v)
                .map(([k]) => (
                  <span key={k} style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: '#185FA510', color: '#185FA5' }}>
                    {k}
                  </span>
                ))}
            </div>
          </div>
        </div>

        <div style={s.modalFoot}>
          <button style={s.btnCancel} onClick={onFechar}>Cancelar</button>
          <button style={s.btnSave(loading)} onClick={handleSalvar} disabled={loading}>
            {loading
              ? <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ animation: 'guSpin 0.8s linear infinite' }}><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" strokeDasharray="40" strokeDashoffset="10" strokeLinecap="round"/></svg>Salvando...</>
              : <><svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>{editando ? 'Salvar alterações' : 'Criar usuário'}</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main ────────────────────────────────────────────── */
export default function GerenciamentoUsuarios() {
  const { usuario: usuarioLogado } = useAuth();

  // cidade padrão = cidade do admin logado
  const cidadeInicial = usuarioLogado?.cidade || Object.keys(CIDADES)[0];

  const [cidadeSelecionada, setCidadeSelecionada] = useState(cidadeInicial);
  const [usuarios, setUsuarios]     = useState([]);
  const [loading, setLoading]       = useState(false);
  const [salvando, setSalvando]     = useState(false);
  const [feedback, setFeedback]     = useState(null);
  const [erroModal, setErroModal]   = useState(null);
  const [busca, setBusca]           = useState('');
  const [filtroRole, setFiltroRole] = useState('');
  const [filtroAtivo, setFiltroAtivo] = useState('');
  const [modal, setModal]           = useState(null); // null | { modo: 'novo' | 'editar', usuario?: obj }

  const cidadeInfo = CIDADES[cidadeSelecionada];

  const carregarUsuarios = useCallback(async () => {
    if (!cidadeInfo?.sheetId) return;
    setLoading(true);
    setFeedback(null);
    try {
      const lista = await SheetsService.buscarUsuarios(cidadeInfo.sheetId);
      setUsuarios(lista);
    } catch (err) {
      setFeedback({ ok: false, msg: 'Erro ao carregar usuários: ' + err.message });
    } finally {
      setLoading(false);
    }
  }, [cidadeInfo]);

  useEffect(() => { carregarUsuarios(); }, [carregarUsuarios]);

  // Filtragem
  const usuariosFiltrados = usuarios.filter(u => {
    const texto = `${u.NAME} ${u.USERNAME}`.toLowerCase();
    const okBusca = !busca || texto.includes(busca.toLowerCase());
    const okRole  = !filtroRole  || u.ROLE  === filtroRole;
    const okAtivo = !filtroAtivo || (filtroAtivo === 'SIM' ? u.ATIVO !== 'NAO' : u.ATIVO === 'NAO');
    return okBusca && okRole && okAtivo;
  });

  // Resumo
  const total   = usuarios.length;
  const ativos  = usuarios.filter(u => u.ATIVO !== 'NAO').length;
  const admins  = usuarios.filter(u => u.ROLE === 'admin').length;
  const inativos = total - ativos;

  async function handleSalvar(form) {
    setErroModal(null);
    if (!form.name.trim())     return setErroModal('Informe o nome completo.');
    if (!form.username.trim()) return setErroModal('Informe o usuário.');
    if (!form.editando && !form.password) return setErroModal('Informe a senha.');

    setSalvando(true);
    try {
      const res = await SheetsService.salvarUsuario(form);
      if (!res.success) throw new Error(res.error || 'Falha ao salvar');
      setModal(null);
      setFeedback({ ok: true, msg: form.editando ? `✓ Usuário ${form.name} atualizado!` : `✓ Usuário ${form.name} criado com sucesso!` });
      await carregarUsuarios();
    } catch (err) {
      setErroModal('Erro: ' + err.message);
    } finally {
      setSalvando(false);
    }
  }

  async function handleExcluir(u) {
    if (!window.confirm(`Excluir o usuário "${u.NAME}"? Esta ação não pode ser desfeita.`)) return;
    try {
      const res = await SheetsService.excluirUsuario(u.USERNAME, cidadeInfo.sheetId);
      if (!res.success) throw new Error(res.error);
      setFeedback({ ok: true, msg: `✓ Usuário ${u.NAME} excluído.` });
      await carregarUsuarios();
    } catch (err) {
      setFeedback({ ok: false, msg: 'Erro ao excluir: ' + err.message });
    }
  }

  async function handleToggleAtivo(u) {
    const novoAtivo = u.ATIVO === 'NAO' ? 'SIM' : 'NAO';
    try {
      const res = await SheetsService.salvarUsuario({
        editando: true,
        username: u.USERNAME,
        name:     u.NAME,
        role:     u.ROLE,
        ativo:    novoAtivo !== 'NAO',
        cidade:   cidadeSelecionada,
      });
      if (!res.success) throw new Error(res.error);
      setFeedback({ ok: true, msg: `✓ ${u.NAME} ${novoAtivo === 'NAO' ? 'desativado' : 'ativado'}.` });
      await carregarUsuarios();
    } catch (err) {
      setFeedback({ ok: false, msg: 'Erro: ' + err.message });
    }
  }

  // Não exibe para não-admins
  if (!usuarioLogado || usuarioLogado.role !== 'admin') {
    return (
      <div style={{ padding: '60px 24px', textAlign: 'center', color: '#bbb' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🔒</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#888' }}>Acesso restrito a administradores.</div>
      </div>
    );
  }

  return (
    <>
      <PageHeader title="Gerenciamento de Usuários" subtitle="Crie, edite e controle os acessos por cidade" />

      <div style={s.root}>

       

        {/* ── Resumo ── */}
        <div style={s.resumo}>
          {[
            { label: 'Total',     val: total,    cor: '#185FA5', bg: '#EAF2FC' },
            { label: 'Ativos',    val: ativos,   cor: '#1D9E75', bg: '#E8F5F0' },
            { label: 'Inativos',  val: inativos, cor: '#E24B4A', bg: '#FDE8E8' },
            { label: 'Admins',    val: admins,   cor: '#7C3AED', bg: '#EDE9FE' },
          ].map(c => (
            <div key={c.label} style={s.resumoCard(c.cor, c.bg)}>
              <div style={s.resumoVal(c.cor)}>{c.val}</div>
              <div style={s.resumoLabel}>{c.label}</div>
            </div>
          ))}
        </div>

        {/* ── Feedback ── */}
        {feedback && (
          <div style={s.feedback(feedback.ok)}>
            {feedback.ok
              ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5"/><path d="M8 12l2.5 2.5L16 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              : <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5"/><path d="M12 7v5M12 16h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            }
            {feedback.msg}
            <button onClick={() => setFeedback(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: 14 }}>✕</button>
          </div>
        )}

        {/* ── Top bar ── */}
        <div style={s.topBar}>
          <div style={s.filtros}>
            <div style={s.searchWrap}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={s.searchIcon}>
                <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.3"/>
                <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
              <input type="text" placeholder="Buscar usuário..." value={busca}
                onChange={e => setBusca(e.target.value)} style={s.searchInput} />
            </div>
            <select value={filtroRole} onChange={e => setFiltroRole(e.target.value)} style={s.select}>
              <option value="">Todos os perfis</option>
              <option value="admin">Admin</option>
              <option value="auxiliar">Auxiliar</option>
            </select>
            <select value={filtroAtivo} onChange={e => setFiltroAtivo(e.target.value)} style={s.select}>
              <option value="">Todos os status</option>
              <option value="SIM">Ativos</option>
              <option value="NAO">Inativos</option>
            </select>
            {(busca || filtroRole || filtroAtivo) && (
              <button onClick={() => { setBusca(''); setFiltroRole(''); setFiltroAtivo(''); }}
                style={{ ...s.btnSecondary, fontSize: 12 }}>
                Limpar
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={carregarUsuarios} style={s.btnSecondary}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M3 12a9 9 0 109-9M3 3v4h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Atualizar
            </button>
            <button onClick={() => { setErroModal(null); setModal({ modo: 'novo' }); }} style={s.btnPrimary}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>
              Novo usuário
            </button>
          </div>
        </div>

        {/* ── Tabela ── */}
        <div style={s.card}>
          {/* Cabeçalho */}
          <div style={s.tableHead}>
            <div />
            <div style={s.thLabel}>Nome / Usuário</div>
            <div style={s.thLabel}>Cidade</div>
            <div style={s.thLabel}>Perfil</div>
            <div style={s.thLabel}>Status</div>
            <div style={{ ...s.thLabel, textAlign: 'right' }}>Ações</div>
          </div>

          {loading ? (
            <div style={{ padding: '48px 24px', textAlign: 'center', color: '#bbb', fontSize: 13 }}>
              Carregando usuários...
            </div>
          ) : usuariosFiltrados.length === 0 ? (
            <div style={s.emptyState}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.15, display: 'block', margin: '0 auto 12px' }}>
                <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#888', marginBottom: 6 }}>
                {usuarios.length === 0 ? 'Nenhum usuário cadastrado ainda.' : 'Nenhum resultado para os filtros.'}
              </div>
              {usuarios.length === 0 && (
                <button onClick={() => { setErroModal(null); setModal({ modo: 'novo' }); }}
                  style={{ ...s.btnPrimary, display: 'inline-flex', marginTop: 12 }}>
                  Criar primeiro usuário
                </button>
              )}
            </div>
          ) : (
            usuariosFiltrados.map((u, i) => {
              const cor = corCidade(u.CIDADE || cidadeSelecionada);
              const bg  = bgCidade(u.CIDADE  || cidadeSelecionada);
              const ativo = u.ATIVO !== 'NAO';
              return (
                <React.Fragment key={u.USERNAME || i}>
                  {i > 0 && <div style={s.divider} />}
                  <div style={s.userRow(u.ATIVO)}
                    onMouseEnter={e => e.currentTarget.style.background = '#fafcff'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}>
                    {/* Avatar */}
                    <div style={s.avatar(cor, bg)}>{iniciaisNome(u.NAME)}</div>

                    {/* Nome */}
                    <div style={s.nameBlock}>
                      <div style={s.userName}>{u.NAME || '—'}</div>
                      <div style={s.userLogin}>@{u.USERNAME}</div>
                    </div>

                    {/* Cidade */}
                    <div>
                      <span style={s.pill(cor, bg)}>
                        {CIDADES[u.CIDADE || cidadeSelecionada]?.label || u.CIDADE || cidadeSelecionada}
                      </span>
                    </div>

                    {/* Role */}
                    <div>
                      <span style={s.rolePill(u.ROLE)}>
                        {u.ROLE === 'admin' ? '★ Admin' : 'Auxiliar'}
                      </span>
                    </div>

                    {/* Status */}
                    <div>
                      <span style={s.statusPill(u.ATIVO)}>
                        {ativo ? '● Ativo' : '○ Inativo'}
                      </span>
                    </div>

                    {/* Ações */}
                    <div style={s.actions}>
                      <button title={ativo ? 'Desativar' : 'Ativar'}
                        style={s.iconBtn(ativo ? '#E24B4A' : '#1D9E75')}
                        onClick={() => handleToggleAtivo(u)}
                        onMouseEnter={e => e.currentTarget.style.background = ativo ? '#E24B4A25' : '#1D9E7525'}
                        onMouseLeave={e => e.currentTarget.style.background = ativo ? '#E24B4A10' : '#1D9E7510'}>
                        {ativo
                          ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5"/><path d="M8 8l8 8M16 8l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                          : <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5"/><path d="M8 12l2.5 2.5L16 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        }
                      </button>
                      <button title="Editar"
                        style={s.iconBtn('#185FA5')}
                        onClick={() => { setErroModal(null); setModal({ modo: 'editar', usuario: u }); }}
                        onMouseEnter={e => e.currentTarget.style.background = '#185FA525'}
                        onMouseLeave={e => e.currentTarget.style.background = '#185FA510'}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </button>
                      <button title="Excluir"
                        style={s.iconBtn('#E24B4A')}
                        onClick={() => handleExcluir(u)}
                        onMouseEnter={e => e.currentTarget.style.background = '#E24B4A25'}
                        onMouseLeave={e => e.currentTarget.style.background = '#E24B4A10'}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><polyline points="3 6 5 6 21 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                      </button>
                    </div>
                  </div>
                </React.Fragment>
              );
            })
          )}

          {/* Rodapé da tabela */}
          {usuariosFiltrados.length > 0 && (
            <div style={{ padding: '10px 18px', borderTop: '1px solid #f3f4f6', fontSize: 11, color: '#bbb', fontWeight: 600 }}>
              {usuariosFiltrados.length} usuário(s) exibido(s) de {total} total
            </div>
          )}
        </div>
      </div>

      {/* ── Modal ── */}
      {modal && (
        <ModalUsuario
          usuario={modal.modo === 'editar' ? modal.usuario : null}
          cidadeAtual={cidadeSelecionada}
          onSalvar={handleSalvar}
          onFechar={() => setModal(null)}
          loading={salvando}
          erro={erroModal}
        />
      )}

      <style>{`
        @keyframes guSlide { from { opacity:0; transform:scale(.97) translateY(8px) } to { opacity:1; transform:none } }
        @keyframes guSpin   { to { transform: rotate(360deg) } }
      `}</style>
    </>
  );
}