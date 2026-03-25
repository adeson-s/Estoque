
import React, { useState } from 'react';
import { useRelatorioPDF } from '../hooks/useRelatorioPDF';

export default function RelatorioPDFButton({
  filtrados     = [],
  metricas      = {},
  periodo       = null,
  customRange   = {},
  tecnicoFiltro = '',
  statusFiltro  = 'TODOS',
  busca         = '',
}) {
  const { gerarPDF } = useRelatorioPDF();
  const [gerando, setGerando] = useState(false);

  // Monta a lista de filtros ativos (exibida no cabeçalho do PDF)
  function buildFiltrosAtivos() {
    const f = [];
    if (periodo !== null) {
      f.push(`Últimos ${periodo} dias`);
    } else if (customRange.start || customRange.end) {
      const s = customRange.start || '…';
      const e = customRange.end   || '…';
      f.push(`${s} → ${e}`);
    }
    if (tecnicoFiltro) f.push(`Técnico: ${tecnicoFiltro}`);
    if (statusFiltro !== 'TODOS') f.push(`Status: ${statusFiltro}`);
    if (busca) f.push(`Busca: "${busca}"`);
    return f;
  }

  // Monta nome do arquivo baseado nos filtros
  function buildNomeArquivo() {
    const partes = ['relatorio'];
    if (tecnicoFiltro) partes.push(tecnicoFiltro.replace(/\s+/g, '_').toLowerCase());
    if (statusFiltro !== 'TODOS') partes.push(statusFiltro.toLowerCase());
    if (periodo !== null) {
      partes.push(`${periodo}d`);
    } else if (customRange.start) {
      partes.push(customRange.start);
      if (customRange.end) partes.push('a_' + customRange.end);
    }
    partes.push(new Date().toISOString().slice(0, 10));
    return partes.join('_') + '.pdf';
  }

  async function handleGerar() {
    if (!filtrados.length) {
      alert('Nenhum registro para gerar relatório. Ajuste os filtros e tente novamente.');
      return;
    }
    setGerando(true);
    try {
      // Pequena pausa para o estado de "Gerando..." renderizar antes do processamento pesado
      await new Promise(r => setTimeout(r, 60));
      gerarPDF({
        filtrados,
        metricas: {
          total:       metricas.total       ?? filtrados.length,
          perdidos:    metricas.perdidos     ?? 0,
          sobras:      metricas.sobras       ?? 0,
          trocas:      metricas.trocas       ?? 0,
          naoAssociou: metricas.naoAssociou  ?? 0,
          pendentes:   metricas.pendentes    ?? 0,
        },
        filtrosAtivos: buildFiltrosAtivos(),
        nomeArquivo:   buildNomeArquivo(),
      });
    } finally {
      setGerando(false);
    }
  }

  return (
    <button
      className="btn-relatorio-pdf"
      onClick={handleGerar}
      disabled={gerando || !filtrados.length}
      title={filtrados.length ? `Gerar PDF com ${filtrados.length} registro(s)` : 'Sem registros para exportar'}
    >
      {gerando ? (
        <>
          <svg className="btn-relatorio-pdf__spinner" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
          </svg>
          Gerando…
        </>
      ) : (
        <>
          {/* ícone PDF */}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
            <polyline points="10 9 9 9 8 9"/>
          </svg>
          Relatório PDF
        </>
      )}
    </button>
  );
}