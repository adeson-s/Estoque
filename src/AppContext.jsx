import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import SheetsService from '../src/services/SheetsService';
import * as XLSX from 'xlsx';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [dados, setDados] = useState({ movimentacoes: [], tecnicos: [], produtos: [] });
  const [syncStatus, setSyncStatus] = useState('synced'); // 'synced' | 'carregando' | 'error'
  const autoRefreshRef = useRef(null);

  const carregarDados = useCallback(async () => {
    if (!SheetsService.isConfigured()) return;
    setSyncStatus('carregando');
    try {
      SheetsService.clearCache();
      const novos = await SheetsService.carregarTodos();
      setDados(novos);
      setSyncStatus('synced');
    } catch (err) {
      console.error(err);
      setSyncStatus('error');
    }
  }, []);

  const iniciarAutoRefresh = useCallback(() => {
    if (autoRefreshRef.current) clearInterval(autoRefreshRef.current);
    autoRefreshRef.current = setInterval(carregarDados, SheetsService.CONFIG.AUTO_REFRESH);
  }, [carregarDados]);

  // Exportar Excel
  const exportarExcel = useCallback(() => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(dados.movimentacoes), 'Movimentações');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(dados.tecnicos), 'Técnicos');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(dados.produtos), 'Produtos');
    XLSX.writeFile(wb, `Almoxarifado_${new Date().toISOString().split('T')[0]}.xlsx`);
  }, [dados]);

  const gerarRelatorio = useCallback((tipo) => {
    const wb = XLSX.utils.book_new();
    if (tipo === 'tecnicos') {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(dados.tecnicos), 'Técnicos');
      XLSX.writeFile(wb, 'Relatorio_Tecnicos.xlsx');
    } else if (tipo === 'produtos') {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(dados.produtos), 'Produtos');
      XLSX.writeFile(wb, 'Relatorio_Produtos.xlsx');
    } else if (tipo === 'estoque') {
      const criticos = dados.produtos.filter(p =>
        (parseInt(p['ESTOQUE ATUAL']) || 0) <= (parseInt(p['ESTOQUE MÍNIMO']) || 0) * 2
      );
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(criticos), 'Estoque Crítico');
      XLSX.writeFile(wb, 'Relatorio_Estoque.xlsx');
    } else if (tipo === 'mensal') {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(dados.movimentacoes), 'Movimentações');
      XLSX.writeFile(wb, 'Relatorio_Mensal.xlsx');
    }
  }, [dados]);

  return (
    <AppContext.Provider value={{
      dados,
      syncStatus,
      carregarDados,
      iniciarAutoRefresh,
      exportarExcel,
      gerarRelatorio,
      SheetsService,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
