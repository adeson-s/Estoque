import React from 'react';
import { useApp } from '../AppContext';
import PageHeader from '../components/PageHeader';

const cards = [
  { tipo: 'tecnicos',  icon: 'fas fa-users',        title: 'Relatório de Técnicos',  desc: 'Performance individual detalhada' },
  { tipo: 'produtos',  icon: 'fas fa-boxes',         title: 'Relatório de Produtos',  desc: 'Análise de consumo por item' },
  { tipo: 'estoque',   icon: 'fas fa-warehouse',     title: 'Status do Estoque',       desc: 'Alertas e níveis críticos' },
  { tipo: 'mensal',    icon: 'fas fa-calendar-alt',  title: 'Relatório Mensal',        desc: 'Resumo do período' },
];

export default function Relatorios() {
  const { gerarRelatorio } = useApp();

  return (
    <>
      <PageHeader title="Relatórios" subtitle="Análises e exportações" />
      <div className="page-content">
        <div className="reports-grid">
          {cards.map(c => (
            <div className="report-card" key={c.tipo} onClick={() => gerarRelatorio(c.tipo)}>
              <i className={c.icon}></i>
              <h3>{c.title}</h3>
              <p>{c.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
