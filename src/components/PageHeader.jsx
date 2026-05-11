import React, { useState, useEffect } from 'react';
import { useApp } from '../AppContext';
import { useAuth, CIDADES } from '../auth/AuthContext';

export default function PageHeader({ title, subtitle }) {

  const { carregarDados } = useApp();

  const { usuario, logout } = useAuth();

  const [refreshing, setRefreshing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  /* =========================================================
     TROCAR ESTOQUE
  ========================================================= */

  function trocarEstoque(novoEstoque) {
    try {
      const raw = localStorage.getItem('leste_auth_session');
      if (!raw) return;

      const sessao = JSON.parse(raw);
      sessao.usuario.estoqueAtual = novoEstoque;
      sessao.usuario.sheetId = CIDADES[novoEstoque]?.sheetId || '';

      localStorage.setItem('leste_auth_session', JSON.stringify(sessao));
      window.location.reload();
    } catch (err) {
      console.error(err);
    }
  }

  /* =========================================================
     REFRESH
  ========================================================= */

  const handleRefresh = async () => {
    setRefreshing(true);
    await carregarDados();
    setTimeout(() => setRefreshing(false), 800);
  };

  /* =========================================================
     FECHAR MENU AO CLICAR FORA
  ========================================================= */

  useEffect(() => {
    const handleClickOutside = () => setMenuOpen(false);
    if (menuOpen) window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, [menuOpen]);

  /* =========================================================
     INICIAIS DO USUÁRIO
  ========================================================= */

  const getInitials = (name = '') => {
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  /* =========================================================
     ESTOQUES DISPONÍVEIS
  ========================================================= */

  const estoquesDisponiveis = usuario?.estoquesPermitidos || [];

  return (
    <>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .ph-root {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 24px;
          height: 56px;
          background: #ffffff;
          border-bottom: 0.5px solid #e5e7eb;
          position: sticky;
          top: 0;
          z-index: 100;
          gap: 16px;
        }

        /* ---- LEFT ---- */

        .ph-left {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
        }

        .ph-title {
          font-family: 'Inter', 'Segoe UI', sans-serif;
          font-size: 14px;
          font-weight: 600;
          color: #111827;
          margin: 0;
          white-space: nowrap;
        }

        .ph-pipe {
          width: 1px;
          height: 14px;
          background: #e5e7eb;
          flex-shrink: 0;
        }

        .ph-subtitle {
          font-size: 12px;
          color: #9ca3af;
          margin: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* ---- RIGHT ---- */

        .ph-right {
          display: flex;
          align-items: center;
          gap: 4px;
          position: relative;
          flex-shrink: 0;
        }

        .ph-vsep {
          width: 1px;
          height: 20px;
          background: #f3f4f6;
          margin: 0 4px;
          flex-shrink: 0;
        }

        /* ---- ESTOQUE BADGE ---- */

        .ph-estoque-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 10px;
          border-radius: 8px;
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          font-size: 12px;
          font-weight: 600;
          color: #166534;
          white-space: nowrap;
        }

        .ph-estoque-badge svg {
          flex-shrink: 0;
        }

        /* ---- ESTOQUE SELECT ---- */

        .ph-estoque-select {
          height: 32px;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
          background: #f9fafb;
          padding: 0 10px;
          font-size: 12px;
          font-weight: 600;
          color: #374151;
          outline: none;
          cursor: pointer;
          transition: border-color 0.15s, box-shadow 0.15s;
        }

        .ph-estoque-select:focus {
          border-color: #86efac;
          box-shadow: 0 0 0 3px rgba(134,239,172,0.25);
        }

        /* ---- REFRESH BUTTON ---- */

        .ph-refresh-btn {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
          background: transparent;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: #9ca3af;
          transition: background 0.15s, color 0.15s, border-color 0.15s;
          flex-shrink: 0;
        }

        .ph-refresh-btn:hover {
          background: #f3f4f6;
          color: #374151;
          border-color: #d1d5db;
        }

        .ph-refresh-btn:active {
          background: #e5e7eb;
        }

        .ph-refresh-icon {
          display: block;
          transition: transform 0.15s;
        }

        .ph-refresh-icon.spinning {
          animation: spin 0.8s linear infinite;
        }

        /* ---- USER BUTTON ---- */

        .ph-user-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 4px 8px 4px 4px;
          border-radius: 8px;
          border: 1px solid transparent;
          background: transparent;
          cursor: pointer;
          transition: background 0.15s, border-color 0.15s;
        }

        .ph-user-btn:hover {
          background: #f9fafb;
          border-color: #e5e7eb;
        }

        .ph-avatar {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: #ede9fe;
          border: 1px solid #c4b5fd;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: 700;
          color: #5b21b6;
          flex-shrink: 0;
          font-family: 'Inter', 'Segoe UI', sans-serif;
          letter-spacing: 0.5px;
        }

        .ph-user-col {
          display: flex;
          flex-direction: column;
          text-align: left;
        }

        .ph-user-name {
          font-size: 12px;
          font-weight: 600;
          color: #111827;
          line-height: 1.3;
        }

        .ph-user-role {
          font-size: 10px;
          color: #9ca3af;
          line-height: 1.3;
        }

        .ph-chevron {
          font-size: 10px;
          color: #9ca3af;
          transition: transform 0.2s;
          flex-shrink: 0;
        }

        .ph-chevron.open {
          transform: rotate(180deg);
        }

        /* ---- DROPDOWN ---- */

        .ph-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          padding: 6px;
          min-width: 160px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.04);
          z-index: 200;
        }

        .ph-dropdown-item {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
          padding: 8px 10px;
          font-size: 13px;
          font-family: 'Inter', 'Segoe UI', sans-serif;
          color: #374151;
          border-radius: 6px;
          border: none;
          background: transparent;
          cursor: pointer;
          text-align: left;
          transition: background 0.12s;
        }

        .ph-dropdown-item:hover {
          background: #f3f4f6;
        }

        .ph-dropdown-item.danger {
          color: #dc2626;
        }

        .ph-dropdown-item.danger:hover {
          background: #fef2f2;
        }

        .ph-dropdown-sep {
          height: 1px;
          background: #f3f4f6;
          margin: 4px 0;
        }

        /* ---- RESPONSIVE ---- */

        @media (max-width: 560px) {
          .ph-user-col { display: none; }
          .ph-subtitle { display: none; }
          .ph-estoque-select { max-width: 110px; }
        }
      `}</style>

      <header className="ph-root">

        {/* LEFT */}
        <div className="ph-left">
          <h1 className="ph-title">{title}</h1>
          {subtitle && (
            <>
              <div className="ph-pipe" />
              <p className="ph-subtitle">{subtitle}</p>
            </>
          )}
        </div>

        {/* RIGHT */}
        <div className="ph-right">

          {/* Estoque */}
          {estoquesDisponiveis.length <= 1 ? (
            <div className="ph-estoque-badge">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
              <span>
                {CIDADES[usuario?.estoqueAtual]?.label
                  || usuario?.estoqueAtual
                  || 'Sem estoque'}
              </span>
            </div>
          ) : (
            <select
              className="ph-estoque-select"
              value={usuario?.estoqueAtual || ''}
              onChange={(e) => trocarEstoque(e.target.value)}
            >
              {estoquesDisponiveis.map((estoque) => (
                <option key={estoque} value={estoque}>
                  {CIDADES[estoque]?.label || estoque}
                </option>
              ))}
            </select>
          )}

          <div className="ph-vsep" />

          {/* Refresh */}
          <button
            className="ph-refresh-btn"
            onClick={handleRefresh}
            title="Atualizar dados"
            aria-label="Atualizar dados"
          >
            <svg
              className={`ph-refresh-icon${refreshing ? ' spinning' : ''}`}
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="23 4 23 10 17 10"/>
              <polyline points="1 20 1 14 7 14"/>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
            </svg>
          </button>

          <div className="ph-vsep" />

          {/* User */}
          <button
            className="ph-user-btn"
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((prev) => !prev);
            }}
            aria-haspopup="true"
            aria-expanded={menuOpen}
          >
            <div className="ph-avatar">
              {getInitials(usuario?.name)}
            </div>

            <div className="ph-user-col">
              <span className="ph-user-name">{usuario?.name || 'Usuário'}</span>
              <span className="ph-user-role">
                {usuario?.role === 'admin' ? 'Administrador' : 'Auxiliar'}
              </span>
            </div>

            <svg
              className={`ph-chevron${menuOpen ? ' open' : ''}`}
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>

          {/* Dropdown */}
          {menuOpen && (
            <div className="ph-dropdown" role="menu">
             
              <div className="ph-dropdown-sep" />
              <button className="ph-dropdown-item danger" role="menuitem" onClick={logout}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16 17 21 12 16 7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
                Sair
              </button>
            </div>
          )}

        </div>
      </header>
    </>
  );
}