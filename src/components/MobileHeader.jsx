import React from 'react';
import { useApp } from '../AppContext';

const pageTitles = {
  '/dashboard':     'Dashboard',
  '/saida':         'Nova Saída',
  '/movimentacoes': 'Movimentações',
  '/tecnicos':      'Técnicos',
  '/produtos':      'Produtos',
  '/relatorios':    'Relatórios',
  '/config':        'Configurações',
};

export default function MobileHeader({ pathname }) {
  const { carregarDados } = useApp();
  const title = pageTitles[pathname] || 'Dashboard';

  return (
    <header className="mobile-header">
      <div className="mobile-header-logo">
        <img
          src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTNy2vYtxATpymkS7R_AgJ0cmO-z6eKd6AsMA&s"
          alt="Logo"
        />
      </div>
      <div className="mobile-header-center">
        <h1>{title}</h1>
      </div>
      <button className="mobile-header-action" onClick={carregarDados}>
        <i className="fas fa-sync-alt"></i>
      </button>
    </header>
  );
}
