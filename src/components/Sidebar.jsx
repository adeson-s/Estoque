import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../AppContext';

const navItems = [
  { page: '/dashboard', icon: 'fas fa-chart-line', label: 'Dashboard' },
  { page: '/saida',     icon: 'fas fa-box-open',   label: 'Nova Saída' },
  { page: '/movimentacoes', icon: 'fas fa-list',   label: 'Movimentações' },
  { page: '/tecnicos',  icon: 'fas fa-users',       label: 'Técnicos' },
  { page: '/produtos',  icon: 'fas fa-boxes',       label: 'Produtos' },
  { page: '/relatorios',icon: 'fas fa-file-alt',    label: 'Relatórios' },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { syncStatus } = useApp();

  return (
    <div className="sidebar">
      <div className="logo">
        <img
          src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTNy2vYtxATpymkS7R_AgJ0cmO-z6eKd6AsMA&s"
          alt="Logo Leste"
        />
      </div>

      <nav>
        {navItems.map(item => (
          <button
            key={item.page}
            className={`nav-item ${location.pathname === item.page || (location.pathname === '/' && item.page === '/dashboard') ? 'active' : ''}`}
            onClick={() => navigate(item.page)}
          >
            <i className={item.icon}></i>
            {item.label}
          </button>
        ))}
      </nav>

      <div className={`sync-status ${syncStatus === 'synced' ? 'synced' : ''}`}>
        <i className="fas fa-sync-alt"></i>
        <span>
          {syncStatus === 'carregando' ? 'Sincronizando...' :
           syncStatus === 'error' ? 'Erro na sincronização' :
           'Sincronizado'}
        </span>
      </div>
    </div>
  );
}
