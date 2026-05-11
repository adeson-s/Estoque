// src/pages/GerenciamentoUsuarios.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth, CIDADES, PERMISSOES } from '../auth/AuthContext';
import PageHeader from '../components/PageHeader';
import SheetsService from '../services/SheetsService';

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */

function iniciaisNome(nome = '') {
  return nome
    .trim()
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0].toUpperCase())
    .join('');
}

function corCidade(cidade) {
  const map = {
    MARICA: '#3B6D11',
    NITEROI: '#085041',
    ITABORAI: '#D97706',
    PIRATININGA: '#7C3AED',
  };
  return map[cidade] || '#888';
}

function bgCidade(cidade) {
  const map = {
    MARICA: '#EAF3DE',
    NITEROI: '#E1F5EE',
    ITABORAI: '#FEF3C7',
    PIRATININGA: '#EDE9FE',
  };
  return map[cidade] || '#f0f0f0';
}

/* ─────────────────────────────────────────────
   ESTILOS
───────────────────────────────────────────── */

const s = {
  root: {
    padding: '0 16px 60px',
    maxWidth: 1100,
    margin: '0 auto',
    fontFamily: "'DM Sans', system-ui, sans-serif",
  },

  topBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    gap: 10,
    flexWrap: 'wrap',
  },

  btnPrimary: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '10px 18px',
    borderRadius: 10,
    border: 'none',
    background: '#3B6D11',
    color: '#fff',
    fontWeight: 700,
    cursor: 'pointer',
  },

  card: {
    background: '#fff',
    borderRadius: 14,
    border: '1px solid #c6e6c6',
    overflow: 'hidden',
  },

  tableHead: {
    display: 'grid',
    gridTemplateColumns: '44px 1fr 240px 100px 120px',
    gap: 14,
    padding: '10px 18px',
    background: '#EAF3DE',
    borderBottom: '1px solid #c6e6c6',
  },

  tableHeadCell: {
    fontSize: 10,
    fontWeight: 700,
    color: '#3B6D11',
    textTransform: 'uppercase',
    letterSpacing: '.6px',
  },

  userRow: {
    display: 'grid',
    gridTemplateColumns: '44px 1fr 240px 100px 120px',
    gap: 14,
    alignItems: 'center',
    padding: '14px 18px',
    borderBottom: '1px solid #f0f7ee',
  },

  avatar: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    background: '#EAF3DE',
    color: '#3B6D11',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 800,
    fontSize: 12,
  },

  pill: (cor, bg) => ({
    display: 'inline-flex',
    padding: '4px 10px',
    borderRadius: 999,
    background: bg,
    color: cor,
    fontWeight: 700,
    fontSize: 11,
    marginRight: 5,
    marginBottom: 5,
  }),

  rolePill: role => ({
    display: 'inline-flex',
    padding: '4px 10px',
    borderRadius: 999,
    background: role === 'admin' ? '#EAF3DE' : '#f3f4f6',
    color: role === 'admin' ? '#3B6D11' : '#555',
    fontWeight: 700,
    fontSize: 11,
  }),

  actions: {
    display: 'flex',
    gap: 8,
  },

  actionBtn: {
    padding: '7px 12px',
    borderRadius: 8,
    border: '1px solid #c6e6c6',
    background: '#fff',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: 12,
    color: '#3B6D11',
  },

  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,.45)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
    padding: 16,
  },

  modal: {
    width: '100%',
    maxWidth: 520,
    background: '#fff',
    borderRadius: 18,
    overflow: 'hidden',
    border: '1px solid #c6e6c6',
  },

  modalHead: {
    background: '#3B6D11',
    color: '#fff',
    padding: '16px 20px',
    fontWeight: 800,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  modalBody: {
    padding: 20,
  },

  formGroup: {
    marginBottom: 14,
  },

  formLabel: {
    display: 'block',
    marginBottom: 5,
    fontSize: 11,
    fontWeight: 700,
    color: '#3B6D11',
    textTransform: 'uppercase',
    letterSpacing: '.5px',
  },

  formInput: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 10,
    border: '1.5px solid #c6e6c6',
    background: '#f8fdf5',
    fontSize: 13,
    boxSizing: 'border-box',
    outline: 'none',
  },

  formSelect: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 10,
    border: '1.5px solid #c6e6c6',
    background: '#f8fdf5',
    fontSize: 13,
    boxSizing: 'border-box',
  },

  formRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 12,
  },

  passwordWrap: {
    position: 'relative',
  },

  passwordToggle: {
    position: 'absolute',
    right: 10,
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#7aaa7a',
    fontSize: 16,
    padding: 0,
    lineHeight: 1,
    display: 'flex',
    alignItems: 'center',
  },

  modalFoot: {
    padding: 18,
    borderTop: '1px solid #e6f0e6',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 10,
  },

  btnCancel: {
    padding: '10px 18px',
    borderRadius: 10,
    border: '1px solid #c6e6c6',
    background: '#fff',
    cursor: 'pointer',
  },

  btnSave: {
    padding: '10px 18px',
    borderRadius: 10,
    border: 'none',
    background: '#3B6D11',
    color: '#fff',
    fontWeight: 700,
    cursor: 'pointer',
  },
};

/* ─────────────────────────────────────────────
   ÍCONES SVG inline
───────────────────────────────────────────── */

function IconeOlho({ aberto }) {
  return aberto ? (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

/* ─────────────────────────────────────────────
   MODAL
───────────────────────────────────────────── */

function ModalUsuario({ usuario, onSalvar, onFechar }) {
  const editando = !!usuario;

  const [form, setForm] = useState({
    username: usuario?.USERNAME || '',
    password: '',
    name: usuario?.NAME || '',
    role: usuario?.ROLE || 'auxiliar',
    ativo: usuario?.ATIVO !== 'NAO',
    estoques:
      usuario?.ESTOQUES
        ? usuario.ESTOQUES.split(',').map(e => e.trim())
        : [],
  });

  const [mostrarSenha, setMostrarSenha] = useState(false);

  function set(campo, val) {
    setForm(prev => ({ ...prev, [campo]: val }));
  }

  function toggleEstoque(cidade) {
    setForm(prev => {
      const existe = prev.estoques.includes(cidade);
      return {
        ...prev,
        estoques: existe
          ? prev.estoques.filter(e => e !== cidade)
          : [...prev.estoques, cidade],
      };
    });
  }

  function handleSalvar() {
    onSalvar(form, editando);
  }

  return (
    <div style={s.overlay} onClick={onFechar}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>

        <div style={s.modalHead}>
          <span>{editando ? 'Editar usuário' : 'Novo usuário'}</span>
          <button
            onClick={onFechar}
            style={{ background: 'none', border: 'none', color: '#fff', fontSize: 18, cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>

        <div style={s.modalBody}>

          <div style={s.formGroup}>
            <label style={s.formLabel}>Nome completo</label>
            <input
              value={form.name}
              onChange={e => set('name', e.target.value)}
              style={s.formInput}
            />
          </div>

          <div style={s.formRow}>

            <div style={s.formGroup}>
              <label style={s.formLabel}>Usuário</label>
              <input
                value={form.username}
                disabled={editando}
                onChange={e =>
                  set('username', e.target.value.toLowerCase().replace(/\s/g, ''))
                }
                style={s.formInput}
              />
            </div>

            <div style={s.formGroup}>
              <label style={s.formLabel}>{editando ? 'Nova senha' : 'Senha'}</label>
              <div style={s.passwordWrap}>
                <input
                  type={mostrarSenha ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => set('password', e.target.value)}
                  style={{ ...s.formInput, paddingRight: 38 }}
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha(v => !v)}
                  style={s.passwordToggle}
                  aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  <IconeOlho aberto={mostrarSenha} />
                </button>
              </div>
            </div>

          </div>

          <div style={s.formRow}>

            <div style={s.formGroup}>
              <label style={s.formLabel}>Perfil</label>
              <select
                value={form.role}
                onChange={e => set('role', e.target.value)}
                style={s.formSelect}
              >
                <option value="auxiliar">Auxiliar</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div style={s.formGroup}>
              <label style={s.formLabel}>Status</label>
              <select
                value={form.ativo ? 'SIM' : 'NAO'}
                onChange={e => set('ativo', e.target.value === 'SIM')}
                style={s.formSelect}
              >
                <option value="SIM">Ativo</option>
                <option value="NAO">Inativo</option>
              </select>
            </div>

          </div>

          {/* ESTOQUES */}
          <div style={s.formGroup}>
            <label style={s.formLabel}>Estoques permitidos</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 10 }}>
              {Object.entries(CIDADES).map(([key, cidade]) => {
                const ativo = form.estoques.includes(key);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleEstoque(key)}
                    style={{
                      padding: '8px 14px',
                      borderRadius: 10,
                      border: ativo ? '2px solid #3B6D11' : '1px solid #c6e6c6',
                      background: ativo ? '#EAF3DE' : '#fff',
                      color: ativo ? '#3B6D11' : '#555',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {cidade.label}
                  </button>
                );
              })}
            </div>
          </div>

        </div>

        <div style={s.modalFoot}>
          <button style={s.btnCancel} onClick={onFechar}>Cancelar</button>
          <button style={s.btnSave} onClick={handleSalvar}>Salvar</button>
        </div>

      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   PAGE
───────────────────────────────────────────── */

export default function GerenciamentoUsuarios() {
  const { usuario: usuarioLogado } = useAuth();

  const [usuarios, setUsuarios] = useState([]);
  const [modal, setModal] = useState(null);

  const carregarUsuarios = useCallback(async () => {
    try {
      const lista = await SheetsService.buscarUsuarios();
      setUsuarios(lista || []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    carregarUsuarios();
  }, [carregarUsuarios]);

  async function handleSalvar(form, editando) {
    try {
      await SheetsService.salvarUsuario({
        username: form.username,
        password: form.password,
        name: form.name,
        role: form.role,
        ESTOQUES: form.estoques.join(','),
        ativo: form.ativo,
        editando,
      });
      setModal(null);
      await carregarUsuarios();
    } catch (err) {
      alert(err.message);
    }
  }

  async function excluir(username) {
    if (!window.confirm('Excluir usuário?')) return;
    try {
      await SheetsService.excluirUsuario(username);
      await carregarUsuarios();
    } catch (err) {
      alert(err.message);
    }
  }

  if (!usuarioLogado || usuarioLogado.role !== 'admin') {
    return null;
  }

  return (
    <>
      <PageHeader title="Usuários" subtitle="Controle de acessos" />

      <div style={s.root}>

        <div style={s.topBar}>
          <div />
          <button style={s.btnPrimary} onClick={() => setModal({})}>
            + Novo usuário
          </button>
        </div>

        <div style={s.card}>

          <div style={s.tableHead}>
            <span style={s.tableHeadCell} />
            <span style={s.tableHeadCell}>Usuário</span>
            <span style={s.tableHeadCell}>Estoques</span>
            <span style={s.tableHeadCell}>Perfil</span>
            <span style={s.tableHeadCell}>Ações</span>
          </div>

          {usuarios.map((u, i) => {
            const estoques = u.ESTOQUES ? u.ESTOQUES.split(',') : [];

            return (
              <div key={i} style={s.userRow}>

                <div style={s.avatar}>
                  {iniciaisNome(u.NAME)}
                </div>

                <div>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{u.NAME}</div>
                  <div style={{ fontSize: 11, color: '#7aaa7a' }}>@{u.USERNAME}</div>
                </div>

                <div>
                  {estoques.map(est => (
                    <span key={est} style={s.pill(corCidade(est), bgCidade(est))}>
                      {CIDADES[est]?.label || est}
                    </span>
                  ))}
                </div>

                <div>
                  <span style={s.rolePill(u.ROLE)}>{u.ROLE}</span>
                </div>

                <div style={s.actions}>
                  <button
                    style={s.actionBtn}
                    onClick={() => setModal({ usuario: u })}
                  >
                    Editar
                  </button>
                  <button
                    style={{ ...s.actionBtn, color: '#A32D2D', borderColor: '#f5c0c0' }}
                    onClick={() => excluir(u.USERNAME)}
                  >
                    Excluir
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      </div>

      {modal && (
        <ModalUsuario
          usuario={modal.usuario}
          onSalvar={handleSalvar}
          onFechar={() => setModal(null)}
        />
      )}
    </>
  );
}