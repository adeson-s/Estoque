import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
} from 'react';

import SheetsService from './services/SheetsService';
import { useAuth } from './auth/AuthContext';

import * as XLSX from 'xlsx';

const AppContext = createContext(null);

export function AppProvider({ children }) {

  const { usuario } = useAuth();

  const [dados, setDados] = useState({
    movimentacoes: [],
    tecnicos: [],
    produtos: [],
  });

  const [syncStatus, setSyncStatus] = useState('synced');

  // 'synced' | 'carregando' | 'error'

  const autoRefreshRef = useRef(null);

  /* =========================================================
     CARREGAR DADOS
  ========================================================= */

  const carregarDados = useCallback(async () => {

    if (!SheetsService.isConfigured()) {
      return;
    }

    setSyncStatus('carregando');

    try {

      // limpa cache antigo
      SheetsService.clearCache();

      const novos = await SheetsService.carregarTodos();

      setDados(novos);

      setSyncStatus('synced');

      console.log(
        'Dados carregados da planilha:',
        usuario?.sheetId
      );

    } catch (err) {

      console.error(err);

      setSyncStatus('error');
    }

  }, [usuario?.sheetId]);

  /* =========================================================
     AUTO REFRESH
  ========================================================= */

  const iniciarAutoRefresh = useCallback(() => {

    // limpa refresh antigo
    if (autoRefreshRef.current) {
      clearInterval(autoRefreshRef.current);
    }

    autoRefreshRef.current = setInterval(() => {

      carregarDados();

    }, SheetsService.CONFIG.AUTO_REFRESH);

  }, [carregarDados]);

  /* =========================================================
     TROCA DE USUÁRIO / PLANILHA
  ========================================================= */

  useEffect(() => {

    async function atualizarSistema() {

      // sem usuário
      if (!usuario) {

        setDados({
          movimentacoes: [],
          tecnicos: [],
          produtos: [],
        });

        if (autoRefreshRef.current) {
          clearInterval(autoRefreshRef.current);
        }

        return;
      }

      try {

        console.log(
          'Trocando para planilha:',
          usuario.sheetId
        );

        // limpa cache
        SheetsService.clearCache();

        // limpa dados antigos imediatamente
        setDados({
          movimentacoes: [],
          tecnicos: [],
          produtos: [],
        });

        // carrega novos dados
        const novosDados =
          await SheetsService.carregarTodos();

        setDados(novosDados);

        setSyncStatus('synced');

        // reinicia auto refresh
        if (autoRefreshRef.current) {
          clearInterval(autoRefreshRef.current);
        }

        autoRefreshRef.current = setInterval(() => {

          carregarDados();

        }, SheetsService.CONFIG.AUTO_REFRESH);

      } catch (err) {

        console.error(err);

        setSyncStatus('error');
      }
    }

    atualizarSistema();

    return () => {

      if (autoRefreshRef.current) {
        clearInterval(autoRefreshRef.current);
      }
    };

  }, [usuario?.sheetId]);

  /* =========================================================
     EXPORTAR EXCEL
  ========================================================= */

  const exportarExcel = useCallback(() => {

    const wb = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(dados.movimentacoes),
      'Movimentações'
    );

    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(dados.tecnicos),
      'Técnicos'
    );

    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(dados.produtos),
      'Produtos'
    );

    XLSX.writeFile(
      wb,
      `Almoxarifado_${new Date().toISOString().split('T')[0]}.xlsx`
    );

  }, [dados]);

  /* =========================================================
     RELATÓRIOS
  ========================================================= */

  const gerarRelatorio = useCallback((tipo) => {

    const wb = XLSX.utils.book_new();

    if (tipo === 'tecnicos') {

      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.json_to_sheet(dados.tecnicos),
        'Técnicos'
      );

      XLSX.writeFile(wb, 'Relatorio_Tecnicos.xlsx');

    }

    else if (tipo === 'produtos') {

      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.json_to_sheet(dados.produtos),
        'Produtos'
      );

      XLSX.writeFile(wb, 'Relatorio_Produtos.xlsx');

    }

    else if (tipo === 'estoque') {

      const criticos = dados.produtos.filter(p =>

        (parseInt(p['ESTOQUE ATUAL']) || 0) <=
        (parseInt(p['ESTOQUE MÍNIMO']) || 0) * 2
      );

      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.json_to_sheet(criticos),
        'Estoque Crítico'
      );

      XLSX.writeFile(wb, 'Relatorio_Estoque.xlsx');

    }

    else if (tipo === 'mensal') {

      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.json_to_sheet(dados.movimentacoes),
        'Movimentações'
      );

      XLSX.writeFile(wb, 'Relatorio_Mensal.xlsx');
    }

  }, [dados]);

  /* =========================================================
     PROVIDER
  ========================================================= */

  return (

    <AppContext.Provider
      value={{

        dados,

        syncStatus,

        carregarDados,

        iniciarAutoRefresh,

        exportarExcel,

        gerarRelatorio,

        SheetsService,
      }}
    >

      {children}

    </AppContext.Provider>
  );
}

export function useApp() {

  return useContext(AppContext);
}