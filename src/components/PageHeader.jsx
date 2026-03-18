import React from 'react';
import { useApp } from '../AppContext';

export default function PageHeader({ title, subtitle }) {
  const { carregarDados } = useApp();

  return (
    <header className="desktop-header">
      <div className="header-left">
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      <div className="header-right">
        <button className="btn-refresh" onClick={carregarDados}>
          <i className="fas fa-sync-alt"></i> Atualizar
        </button>
        <div className="user-info">
          <i className="fas fa-user-circle"></i>
          <span>Admin</span>
        </div>
      </div>
    </header>
  );
}
