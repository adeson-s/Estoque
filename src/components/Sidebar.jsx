import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../AppContext';

const navItems = [
  { page: '/dashboard',     icon: 'fas fa-chart-line', label: 'Dashboard' },
  { page: '/saida',         icon: 'fas fa-box-open',   label: 'Nova Reposição' },  
   { page: '/transferencia',icon: 'fas fa-exchange-alt',       label: 'Transferencia' },
  { page: '/movimentacoes', icon: 'fas fa-list',        label: 'Movimentações' },
  { page: '/tecnicos',      icon: 'fas fa-users',       label: 'Técnicos' },
  { page: '/produtos',      icon: 'fas fa-boxes',       label: 'Produtos' },
  { page: '/relatorios',    icon: 'fas fa-file-alt',    label: 'Relatórios' },
];

const syncConfig = {
  carregando: { label: 'Sincronizando...', icon: 'fas fa-sync-alt fa-spin', color: '#f59e0b' },
  error:      { label: 'Erro na sincronização', icon: 'fas fa-exclamation-circle', color: '#ef4444' },
  synced:     { label: 'Sincronizado', icon: 'fas fa-check-circle', color: '#10b981' },
};

export default function Sidebar() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { syncStatus } = useApp();

  const isActive = (page) =>
    location.pathname === page ||
    (location.pathname === '/' && page === '/dashboard');

  const sync = syncConfig[syncStatus] ?? syncConfig.synced;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600&display=swap');

        .sidebar {
          display: flex;
          flex-direction: column;
          width: 190px;
          min-width: 190px;
          height: 100vh;
          background: #1a2e28;
          border-right: 1px solid rgba(0,0,0,0.25);
          font-family: 'Sora', sans-serif;
          padding: 0;
          position: fixed;
          top: 0;
          left: 0;
          z-index: 100;
          overflow: hidden;
          flex-shrink: 0;
        }

        /* subtle texture */
        .sidebar::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(255,255,255,.018) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,.018) 1px, transparent 1px);
          background-size: 28px 28px;
          pointer-events: none;
        }

        /* glow orb verde */
        .sidebar::after {
          content: '';
          position: absolute;
          top: -60px;
          left: -40px;
          width: 220px;
          height: 220px;
          background: radial-gradient(circle, rgba(16,185,129,.12) 0%, transparent 70%);
          pointer-events: none;
        }

        /* ── Logo ── */
        .sidebar-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 24px 20px 20px;
          position: relative;
          z-index: 1;
        }

        .sidebar-logo img {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          object-fit: cover;
          box-shadow: 0 0 0 1px rgba(255,255,255,.1), 0 4px 12px rgba(0,0,0,.4);
        }

        .sidebar-logo-text {
          font-size: 14px;
          font-weight: 600;
          color: #f1f5f9;
          letter-spacing: .3px;
        }

        .sidebar-logo-sub {
          font-size: 10px;
          font-weight: 400;
          color: rgba(255,255,255,.35);
          letter-spacing: .5px;
          text-transform: uppercase;
        }

        /* ── Divider ── */
        .sidebar-divider {
          height: 1px;
          margin: 0 20px 16px;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,.08) 40%, transparent);
          position: relative;
          z-index: 1;
        }

        /* ── Section label ── */
        .sidebar-section-label {
          padding: 0 20px 8px;
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 1.4px;
          text-transform: uppercase;
          color: rgba(255,255,255,.25);
          position: relative;
          z-index: 1;
        }

        /* ── Nav ── */
        .sidebar-nav {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
          padding: 0 10px;
          position: relative;
          z-index: 1;
        }

        .nav-item {
          display: flex;
          align-items: center;
          gap: 11px;
          width: 100%;
          padding: 10px 12px;
          border: none;
          border-radius: 10px;
          background: transparent;
          color: rgba(255,255,255,.45);
          font-family: 'Sora', sans-serif;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          text-align: left;
          transition: background 0.18s ease, color 0.18s ease, transform 0.12s ease;
          position: relative;
          overflow: hidden;
        }

        .nav-item::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 10px;
          background: linear-gradient(135deg, rgba(16,185,129,.12), rgba(5,150,105,.06));
          opacity: 0;
          transition: opacity 0.18s ease;
        }

        .nav-item:hover {
          color: rgba(255,255,255,.85);
          background: rgba(255,255,255,.05);
          transform: translateX(2px);
        }

        .nav-item:hover::before { opacity: 1; }

        .nav-item:active { transform: translateX(1px) scale(0.99); }

        .nav-item.active {
          color: #fff;
          background: linear-gradient(135deg, rgba(16,185,129,.30), rgba(5,150,105,.20));
          box-shadow: inset 0 0 0 1px rgba(16,185,129,.30), 0 2px 12px rgba(16,185,129,.15);
        }

        .nav-item.active::before { opacity: 1; }

        .nav-item.active .nav-icon { color: #6ee7b7; }

        .nav-icon {
          width: 16px;
          text-align: center;
          font-size: 13px;
          flex-shrink: 0;
          transition: color 0.18s ease;
        }

        /* active left bar */
        .nav-item.active::after {
          content: '';
          position: absolute;
          left: 0;
          top: 20%;
          height: 60%;
          width: 3px;
          border-radius: 0 3px 3px 0;
          background: linear-gradient(180deg, #6ee7b7, #10b981);
          box-shadow: 0 0 8px rgba(16,185,129,.7);
        }

        /* ── Sync badge ── */
        .sidebar-sync {
          margin: 16px 10px 20px;
          padding: 10px 14px;
          border-radius: 10px;
          background: rgba(0,0,0,.15);
          border: 1px solid rgba(255,255,255,.08);
          display: flex;
          align-items: center;
          gap: 9px;
          position: relative;
          z-index: 1;
          transition: border-color 0.3s ease;
        }

        .sync-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          flex-shrink: 0;
          background: var(--sync-color, #10b981);
          box-shadow: 0 0 6px var(--sync-color, #10b981);
        }

        .sync-dot.pulse {
          animation: pulse-ring 1.4s ease infinite;
        }

        @keyframes pulse-ring {
          0%   { box-shadow: 0 0 0 0 var(--sync-color); opacity: 1; }
          70%  { box-shadow: 0 0 0 6px transparent; opacity: .6; }
          100% { box-shadow: 0 0 0 0 transparent; opacity: 1; }
        }

        .sync-text {
          display: flex;
          flex-direction: column;
          gap: 1px;
        }

        .sync-label {
          font-size: 11px;
          font-weight: 500;
          color: rgba(255,255,255,.6);
        }

        .sync-status-text {
          font-size: 10px;
          font-weight: 600;
          color: var(--sync-color, #10b981);
          letter-spacing: .3px;
        }
      `}</style>

      <div className="sidebar">
        {/* Logo */}
        <div className="sidebar-logo">
          <img
            src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTNy2vYtxATpymkS7R_AgJ0cmO-z6eKd6AsMA&s"
            alt="Logo Leste"
          />
          <div>
            <div className="sidebar-logo-text">Leste</div>
            <div className="sidebar-logo-sub">Estoque Maricá</div>
          </div>
        </div>

        <div className="sidebar-divider" />
        <div className="sidebar-section-label">Menu</div>

        {/* Nav */}
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <button
              key={item.page}
              className={`nav-item ${isActive(item.page) ? 'active' : ''}`}
              onClick={() => navigate(item.page)}
            >
              <i className={`${item.icon} nav-icon`} />
              {item.label}
            </button>
          ))}
        </nav>

        {/* Sync */}
        <div
          className="sidebar-sync"
          style={{ '--sync-color': sync.color }}
        >
          <div className={`sync-dot ${syncStatus === 'carregando' ? 'pulse' : ''}`} />
          <div className="sync-text">
            <span className="sync-label">Status</span>
            <span className="sync-status-text">{sync.label}</span>
          </div>
        </div>
      </div>
    </>
  );
}