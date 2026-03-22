import React, { useState } from 'react';
import { useApp } from '../AppContext';

export default function PageHeader({ title, subtitle }) {
  const { carregarDados } = useApp();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await carregarDados();
    setTimeout(() => setRefreshing(false), 800);
  };

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
          letter-spacing: -0.2px;
        }

        .header-divider {
          width: 1px;
          height: 14px;
          background: #d1d5db;
          flex-shrink: 0;
        }

        .header-left p {
          font-family: 'Inter', 'Segoe UI', sans-serif;
          font-size: 12.5px;
          color: #6b7280;
          margin: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }

        .btn-refresh {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 5px 12px;
          font-family: 'Inter', 'Segoe UI', sans-serif;
          font-size: 12.5px;
          font-weight: 500;
          color: #374151;
          background: #f3f4f6;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.15s ease;
          white-space: nowrap;
        }

        .btn-refresh:hover {
          background: #e9eaec;
          border-color: #d1d5db;
          color: #111827;
        }

        .btn-refresh:active {
          transform: scale(0.97);
        }

        .btn-refresh i {
          font-size: 11px;
          transition: transform 0.6s ease;
        }

        .btn-refresh.spinning i {
          animation: spin 0.6s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
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
          transition: background 0.15s ease;
        }

        .user-info:hover {
          background: #f3f4f6;
        }

        .user-avatar {
          width: 26px;
          height: 26px;
          border-radius: 50%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .user-avatar i {
          font-size: 13px;
          color: #fff;
        }

        .user-details {
          display: flex;
          flex-direction: column;
          line-height: 1;
        }

        .user-name {
          font-family: 'Inter', 'Segoe UI', sans-serif;
          font-size: 12.5px;
          font-weight: 500;
          color: #111827;
        }

        .user-role {
          font-family: 'Inter', 'Segoe UI', sans-serif;
          font-size: 10.5px;
          color: #9ca3af;
          margin-top: 1px;
        }

        .header-chevron {
          font-size: 10px;
          color: #9ca3af;
          margin-left: 2px;
        }

        @media (max-width: 600px) {
          .desktop-header {
            padding: 0 16px;
          }
          .header-left p,
          .header-divider {
            display: none;
          }
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

          <div className="user-info">
            <div className="user-avatar">
              <i className="fas fa-user" />
            </div>
            <div className="user-details">
              <span className="user-name">Admin</span>
              <span className="user-role">Administrador</span>
            </div>
            <i className="fas fa-chevron-down header-chevron" />
          </div>
        </div>
      </header>
    </>
  );
}