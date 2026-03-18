import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto'; // ✅ resolve registro automático
import { useApp } from '../AppContext';
import PageHeader from '../components/PageHeader';
import SheetsService from '../services/SheetsService';

export default function Dashboard() {
  const { dados } = useApp();
  const { movimentacoes, tecnicos, produtos } = dados;

  const chartStatusRef = useRef(null);
  const chartProdutosRef = useRef(null);

  const chartStatusInstance = useRef(null);
  const chartProdutosInstance = useRef(null);

  // KPIs
  const totalSaidas = movimentacoes.length;
  const tecnicosAtivos = tecnicos.filter(t => t.STATUS === 'ATIVO').length;
  const totalProdutos = produtos.length;

  const estoquesCriticos = produtos.filter(p =>
    (parseInt(p['ESTOQUE ATUAL']) || 0) <=
    (parseInt(p['ESTOQUE MÍNIMO']) || 0)
  ).length;

  const alertas = produtos.filter(p =>
    (parseInt(p['ESTOQUE ATUAL']) || 0) <=
    (parseInt(p['ESTOQUE MÍNIMO']) || 0)
  );

  const recentes = [...movimentacoes].slice(-5).reverse();

  // 🔵 Gráfico Status
  useEffect(() => {
    if (!chartStatusRef.current) return;

    // 🔥 destruir corretamente
    if (chartStatusInstance.current) {
      chartStatusInstance.current.destroy();
      chartStatusInstance.current = null;
    }

    const statusCount = {};
    movimentacoes.forEach(m => {
      const s = m.STATUS || 'Sem Status';
      statusCount[s] = (statusCount[s] || 0) + 1;
    });

    const ctx = chartStatusRef.current.getContext('2d');

    chartStatusInstance.current = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: Object.keys(statusCount),
        datasets: [
          {
            data: Object.values(statusCount),
            backgroundColor: ['#667eea', '#f093fb', '#4facfe', '#43e97b'],
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { position: 'bottom' },
        },
      },
    });

    return () => {
      if (chartStatusInstance.current) {
        chartStatusInstance.current.destroy();
        chartStatusInstance.current = null;
      }
    };
  }, [movimentacoes]);

  // 🟣 Gráfico Produtos
  useEffect(() => {
    if (!chartProdutosRef.current) return;

    if (chartProdutosInstance.current) {
      chartProdutosInstance.current.destroy();
      chartProdutosInstance.current = null;
    }

    const prodCount = {};
    movimentacoes.forEach(m => {
      const p = m.PRODUTO || 'Sem Produto';
      prodCount[p] =
        (prodCount[p] || 0) + (parseInt(m.QUANTIDADE) || 0);
    });

    const top5 = Object.entries(prodCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const ctx = chartProdutosRef.current.getContext('2d');

    chartProdutosInstance.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: top5.map(p => p[0].substring(0, 30)),
        datasets: [
          {
            label: 'Quantidade',
            data: top5.map(p => p[1]),
            backgroundColor: '#667eea',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { display: false },
        },
        scales: {
          y: { beginAtZero: true },
        },
      },
    });

    return () => {
      if (chartProdutosInstance.current) {
        chartProdutosInstance.current.destroy();
        chartProdutosInstance.current = null;
      }
    };
  }, [movimentacoes]);

  const iconClass = (status) =>
    status === 'PERDIDO'
      ? 'danger'
      : status === 'SOBRA'
      ? 'success'
      : 'warning';

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Visão geral do sistema" />

      <div className="page-content">

        {/* KPIs */}
        <div className="kpi-grid">
          <div className="kpi-card blue">
            <p>Total de Saídas</p>
            <h2>{totalSaidas}</h2>
          </div>

          <div className="kpi-card orange">
            <p>Estoque Crítico</p>
            <h2>{estoquesCriticos}</h2>
          </div>

          <div className="kpi-card green">
            <p>Técnicos Ativos</p>
            <h2>{tecnicosAtivos}</h2>
          </div>

          <div className="kpi-card purple">
            <p>Produtos</p>
            <h2>{totalProdutos}</h2>
          </div>
        </div>

        {/* Gráficos */}
        <div className="charts-row">
          <div className="chart-card">
            <h3>Saídas por Status</h3>
            <canvas ref={chartStatusRef}></canvas>
          </div>

          <div className="chart-card">
            <h3>Top 5 Produtos</h3>
            <canvas ref={chartProdutosRef}></canvas>
          </div>
        </div>

        {/* Atividades */}
        <div className="activity-card">
          <h3>Últimas Movimentações</h3>

          {recentes.length === 0 ? (
            <p>Nenhuma movimentação registrada</p>
          ) : (
            recentes.map((m, i) => (
              <div key={i}>
                <strong>{m['TÉCNICO'] || m.TECNICO}</strong> — {m.PRODUTO}
                <p>Qtd: {m.QUANTIDADE} | Status: {m.STATUS}</p>
                <small>{SheetsService.formatDate(m.DATA)}</small>
              </div>
            ))
          )}
        </div>

        {/* Alertas */}
        {alertas.length > 0 && (
          <div className="alerts-section">
            <h3>Alertas</h3>

            {alertas.map((p, i) => (
              <div key={i}>
                <strong>{p.PRODUTO}</strong> — Estoque: {p['ESTOQUE ATUAL']}
              </div>
            ))}
          </div>
        )}

      </div>
    </>
  );
}