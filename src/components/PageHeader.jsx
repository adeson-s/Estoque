import React, { useState, useEffect } from 'react';
import { useApp } from '../AppContext';
import { useAuth } from '../auth/AuthContext';

export default function PageHeader({ title, subtitle }) {
  const { carregarDados } = useApp();
  const { usuario, logout } = useAuth();

  const [refreshing, setRefreshing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await carregarDados();
    setTimeout(() => setRefreshing(false), 800);
  };

  // fechar menu ao clicar fora
  useEffect(() => {
    const handleClickOutside = () => setMenuOpen(false);
    if (menuOpen) {
      window.addEventListener('click', handleClickOutside);
    }
    return () => window.removeEventListener('click', handleClickOutside);
  }, [menuOpen]);

  return (
    <>
      <style>{`
        .desktop-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 24px;
          height: 52px;
          background: #ffffff;
          border-bottom: 1px solid #e8eaed;
          box-shadow: 0 1px 3px rgba(0,0,0,0.06);
          position: sticky;
          top: 0;
          z-index: 100;
          gap: 16px;
        }

        .header-left {
          display: flex;
          align-items: baseline;
          gap: 10px;
          min-width: 0;
        }

        .header-left h1 {
          font-family: 'Inter', 'Segoe UI', sans-serif;
          font-size: 15px;
          font-weight: 600;
          color: #111827;
          margin: 0;
          white-space: nowrap;
        }

        .header-divider {
          width: 1px;
          height: 14px;
          background: #d1d5db;
        }

        .header-left p {
          font-size: 12.5px;
          color: #6b7280;
          margin: 0;
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: 8px;
          position: relative;
        }

        .header-separator {
          width: 1px;
          height: 20px;
          background: #e5e7eb;
        }

        .user-info {
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 4px 10px;
          border-radius: 6px;
          cursor: pointer;
        }

        .user-info:hover {
          background: #f3f4f6;
        }

        .user-avatar {
          width: 26px;
          height: 26px;
          border-radius: 50%;
          background: linear-gradient(135deg, #667eea, #764ba2);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .user-avatar i {
          color: white;
          font-size: 13px;
        }

        .user-details {
          display: flex;
          flex-direction: column;
        }

        .user-name {
          font-size: 12.5px;
          font-weight: 500;
          color: #111827;
        }

        .user-role {
          font-size: 10.5px;
          color: #9ca3af;
        }

        .header-chevron {
          font-size: 10px;
          color: #9ca3af;
        }

        .user-menu {
          position: absolute;
          top: 56px;
          right: 0;
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          box-shadow: 0 6px 14px rgba(0,0,0,0.08);
          padding: 6px;
          z-index: 200;
          min-width: 140px;
        }

        .user-menu button {
          display: flex;
          align-items: center;
          gap: 6px;
          width: 100%;
          background: none;
          border: none;
          padding: 8px 12px;
          font-size: 12.5px;
          cursor: pointer;
        }

        .user-menu button:hover {
          background: #f3f4f6;
        }

        @media (max-width: 600px) {
          .user-details {
            display: none;
          }
        }
      `}</style>

      <header className="desktop-header">
        <div className="header-left">
          <h1>{title}</h1>
          {subtitle && (
            <>
              <div className="header-divider" />
              <p>{subtitle}</p>
            </>
          )}
        </div>

        <div className="header-right">

          <div className="header-separator" />

          <div
            className="user-info"
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen(prev => !prev);
            }}
          >
            <div className="user-avatar">
              <i className="fas fa-user" />
            </div>

            <div className="user-details">
              <span className="user-name">
                {usuario?.name || 'Usuário'}
              </span>
              <span className="user-role">
                {usuario?.role === 'admin' ? 'Administrador' : 'Auxiliar'}
              </span>
            </div>

            <i className="fas fa-chevron-down header-chevron" />
          </div>

          {menuOpen && (
            <div className="user-menu">
              <button onClick={logout}>
                <i className="fas fa-sign-out-alt" />
                Sair
              </button>
            </div>
          )}
        </div>
      </header>
    </>
  );
}