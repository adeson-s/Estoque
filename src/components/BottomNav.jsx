import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../AppContext';

const navItems = [
  { page: '/dashboard',     icon: 'fas fa-chart-line', label: 'Início',    cta: false },
  { page: '/saida',         icon: 'fas fa-plus',        label: 'Nova Saída',cta: true  },
  { page: '/movimentacoes', icon: 'fas fa-list',         label: 'Histórico', cta: false },
  { page: '/produtos',      icon: 'fas fa-boxes',        label: 'Estoque',   cta: false },
  { page: '/relatorios',    icon: 'fas fa-file-alt',     label: 'Relatórios',cta: false },
];

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { dados } = useApp();

  const estoquesCriticos = dados.produtos.filter(p =>
    (parseInt(p['ESTOQUE ATUAL']) || 0) <= (parseInt(p['ESTOQUE MÍNIMO']) || 0)
  ).length;

  const isActive = (page) =>
    location.pathname === page ||
    (location.pathname === '/' && page === '/dashboard');

  return (
    <nav className="bottom-nav">
      {navItems.map(item => (
        <button
          key={item.page}
          className={`bnav-item ${isActive(item.page) ? 'active' : ''}`}
          onClick={() => navigate(item.page)}
        >
          <span className="bnav-indicator"></span>
          <span className={`bnav-icon-wrap ${item.cta ? 'bnav-cta' : ''}`}>
            <i className={item.icon}></i>
          </span>
          <span className="bnav-label">{item.label}</span>
          {item.page === '/produtos' && estoquesCriticos > 0 && (
            <span className="bnav-badge">
              {estoquesCriticos > 9 ? '9+' : estoquesCriticos}
            </span>
          )}
        </button>
      ))}
    </nav>
  );
}
