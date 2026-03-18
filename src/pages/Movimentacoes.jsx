import React, { useState } from 'react';
import { useApp } from '../AppContext';
import PageHeader from '../components/PageHeader';
import SheetsService from '../services/SheetsService';

const badgeClass = (status) =>
  status === 'PERDIDO' ? 'danger' :
  status === 'SOBRA'   ? 'success' :
  status === 'TROCA'   ? 'info' : 'warning';

export default function Movimentacoes() {
  const { dados, exportarExcel } = useApp();
  const { movimentacoes } = dados;
  const [busca, setBusca] = useState('');

  const filtrados = [...movimentacoes].reverse().filter(m =>
    !busca || JSON.stringify(m).toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <>
      <PageHeader title="Movimentações" subtitle="Histórico completo" />
      <div className="page-content">
        <div className="table-card">
          <div className="table-header">
            <h3>Histórico de Movimentações</h3>
            <div className="table-actions">
              <input
                type="text"
                placeholder="Buscar..."
                className="search-input"
                value={busca}
                onChange={e => setBusca(e.target.value)}
              />
              <button className="btn-icon" onClick={exportarExcel}>
                <i className="fas fa-download"></i> Exportar
              </button>
            </div>
          </div>
          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Técnico</th>
                  <th>Placa</th>
                  <th>Produto</th>
                  <th>Qtd</th>
                  <th>Status</th>
                  <th>Observações</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((m, i) => (
                  <tr key={i}>
                    <td>{SheetsService.formatDate(m.DATA)}</td>
                    <td>{m['TÉCNICO'] || m.TECNICO || '—'}</td>
                    <td>{m.PLACA || '—'}</td>
                    <td style={{ maxWidth: 300 }}>{m.PRODUTO || '—'}</td>
                    <td>{m.QUANTIDADE || '—'}</td>
                    <td><span className={`badge ${badgeClass(m.STATUS)}`}>{m.STATUS || '—'}</span></td>
                    <td style={{ maxWidth: 200 }}>{m['OBSERVAÇÕES'] || m.OBSERVACOES || '—'}</td>
                  </tr>
                ))}
                {filtrados.length === 0 && (
                  <tr><td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-light)' }}>Nenhum registro encontrado</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
