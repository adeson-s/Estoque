// src/auth/AuthContext.jsx

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback
} from 'react';

const API_KEY =
  "AIzaSyCR8ARygudTzb3_L2D4VUaH6V9zWPOysik";

/* =========================================================
   PLANILHA MASTER (USUÁRIOS)
========================================================= */

const MASTER_SHEET_ID =
  '1-Ih5DR3RBk0rGb3ZfMVZhZHXlOf_ez1vu7kyI4mW_j0';

/* =========================================================
   ESTOQUES / CIDADES
========================================================= */

export const CIDADES = {

  ITABORAI: {
    label: 'Itaboraí',
    sheetId: '1f-tVaomtn0WvVMR6AleEa5npzFs7KUhwvib8-wEmIcY'
  },
  
  MARICA: {
    label: 'Maricá',
    sheetId: '1-Ih5DR3RBk0rGb3ZfMVZhZHXlOf_ez1vu7kyI4mW_j0'
  },

  SANTAROSA: {
    label: 'Santa Rosa',
    sheetId: '1WiDxRVQ6Jd_mTHfFDrU-StJRGVEDws033DROH4D4J8U'
  },
  
  PIRATININGA: {
    label: 'Piratininga',
    sheetId: '1RzEMh6GBJA8SbKFkcLVqkgatgsZHhzTwBaJIvEnT67E'
  },
};

/* =========================================================
   PERMISSÕES
========================================================= */

export const PERMISSOES = {

  gerente: {
    verDashboard: true,
    verMovimentacoes: true,
    verProdutos: true,
    editarProdutos: true,
    excluirProdutos: true,
    criarProdutos: true,
    novaReposicao: true,
    verTecnicos: true,
    editarTecnicos: true,
    transferencia: true,
    conferencia: true,
    verRelatorios: true,
    exportarDados: true,
    gerenciarUsuarios: true,
  },

  supervisor: {
    verDashboard: true,
    verMovimentacoes: true,
    verProdutos: true,
    editarProdutos: true,
    excluirProdutos: false,
    criarProdutos: true,
    novaReposicao: true,
    verTecnicos: true,
    editarTecnicos: true,
    transferencia: true,
    conferencia: true,
    verRelatorios: true,
    exportarDados: true,
    gerenciarUsuarios: false,
  },

  auxiliar: {
    verDashboard: true,
    verMovimentacoes: true,
    verProdutos: true,
    editarProdutos: false,
    excluirProdutos: false,
    criarProdutos: false,
    novaReposicao: true,
    verTecnicos: true,
    editarTecnicos: false,
    transferencia: true,
    conferencia: true,
    verRelatorios: true,
    exportarDados: false,
    gerenciarUsuarios: false,
  },
};

/* =========================================================
   SESSION
========================================================= */

const SESSION_KEY = 'leste_auth_session';

const SESSION_HOURS = 8;

/* =========================================================
   HELPERS
========================================================= */

function lerSessaoSincrona() {
  try {

    const raw =
      localStorage.getItem(SESSION_KEY);

    if (!raw) return null;

    const sessao = JSON.parse(raw);

    if (Date.now() > sessao.expiraEm) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }

    return sessao.usuario || null;

  } catch (_) {

    localStorage.removeItem(SESSION_KEY);

    return null;
  }
}

/* =========================================================
   BUSCAR USUÁRIO
========================================================= */

async function buscarUsuario(username, password) {

  try {

    const url =
      `https://sheets.googleapis.com/v4/spreadsheets/${MASTER_SHEET_ID}/values/USUARIOS?key=${API_KEY}&t=${Date.now()}`;

    const res = await fetch(url);

    if (!res.ok) return null;

    const data = await res.json();

    const valores = data.values || [];

    if (valores.length === 0) {
      return null;
    }

    /* =====================================================
       CABEÇALHOS
    ===================================================== */

    const headers =
      valores[0].map(h =>
        String(h).toUpperCase().trim()
      );

    const usuarios =
      valores.slice(1).map(row => {

        const obj = {};

        headers.forEach((h, i) => {
          obj[h] = String(row[i] ?? '').trim();
        });

        return obj;
      });

    /* =====================================================
       LOCALIZA USUÁRIO
    ===================================================== */

    const found = usuarios.find(u =>

      u.USERNAME?.toLowerCase() ===
      username.toLowerCase()

      &&

      String(u.PASSWORD) ===
      String(password)

      &&

      u.ATIVO !== 'NAO'
    );

    if (!found) return null;

    /* =====================================================
       ESTOQUES
    ===================================================== */

    let estoquesPermitidos = [];

    if (found.ESTOQUES === '*') {

      estoquesPermitidos =
        Object.keys(CIDADES);

    } else {

      estoquesPermitidos =
        String(found.ESTOQUES || '')
          .split(',')
          .map(v => v.trim())
          .filter(Boolean);
    }

    /* =====================================================
       ESTOQUE ATUAL
    ===================================================== */

    const estoqueAtual =
      estoquesPermitidos[0] || null;

    const sheetId =
      estoqueAtual
        ? CIDADES[estoqueAtual]?.sheetId
        : null;

    return {

      username:
        found.USERNAME,

      name:
        found.NAME,

      role:
        (found.ROLE || 'auxiliar')
          .toLowerCase(),

      estoquesPermitidos,

      estoqueAtual,

      sheetId,

      global:
        found.ESTOQUES === '*',
    };

  } catch (_) {

    return null;
  }
}

/* =========================================================
   CONTEXT
========================================================= */

const AuthContext =
  createContext(null);

/* =========================================================
   PROVIDER
========================================================= */

export function AuthProvider({ children }) {

  const [usuario, setUsuario] =
    useState(() => lerSessaoSincrona());

  const [carregando, setCarregando] =
    useState(false);

  /* =====================================================
     RENOVAR SESSÃO
  ===================================================== */

  useEffect(() => {

    if (!usuario) return;

    const renovar = () => {

      try {

        const raw =
          localStorage.getItem(SESSION_KEY);

        if (raw) {

          const s = JSON.parse(raw);

          s.expiraEm =
            Date.now() +
            SESSION_HOURS * 3600 * 1000;

          localStorage.setItem(
            SESSION_KEY,
            JSON.stringify(s)
          );
        }

      } catch (_) {}
    };

    window.addEventListener('click', renovar);

    window.addEventListener('keydown', renovar);

    return () => {

      window.removeEventListener(
        'click',
        renovar
      );

      window.removeEventListener(
        'keydown',
        renovar
      );
    };

  }, [usuario]);

  /* =====================================================
     LOGIN
  ===================================================== */

  const login = useCallback(async (
    username,
    password
  ) => {

    setCarregando(true);

    try {

      const found =
        await buscarUsuario(
          username.trim(),
          password
        );

      if (!found) {

        return {
          ok: false,
          erro: 'Usuário ou senha incorretos.',
        };
      }

      localStorage.setItem(
        SESSION_KEY,
        JSON.stringify({

          usuario: found,

          expiraEm:
            Date.now() +
            SESSION_HOURS * 3600 * 1000,

          loginEm:
            Date.now(),
        })
      );

      setUsuario(found);

      return { ok: true };

    } catch (_) {

      return {
        ok: false,
        erro: 'Erro de conexão.',
      };

    } finally {

      setCarregando(false);
    }

  }, []);

  /* =====================================================
     TROCAR ESTOQUE
  ===================================================== */

  const trocarEstoque = useCallback((novo) => {

    if (!usuario) return;

    if (
      !usuario.estoquesPermitidos.includes(novo)
    ) {
      return;
    }

    const atualizado = {

      ...usuario,

      estoqueAtual: novo,

      sheetId:
        CIDADES[novo]?.sheetId || null,
    };

    setUsuario(atualizado);

    try {

      const raw =
        localStorage.getItem(SESSION_KEY);

      if (raw) {

        const sessao =
          JSON.parse(raw);

        sessao.usuario = atualizado;

        localStorage.setItem(
          SESSION_KEY,
          JSON.stringify(sessao)
        );
      }

    } catch (_) {}

  }, [usuario]);

  /* =====================================================
     LOGOUT
  ===================================================== */

  const logout = useCallback(() => {

    localStorage.removeItem(
      SESSION_KEY
    );

    setUsuario(null);

  }, []);

  /* =====================================================
     PERMISSÃO
  ===================================================== */

  const pode = useCallback((permissao) => {

    if (!usuario) return false;

    return (
      PERMISSOES[usuario.role]?.[permissao]
      ?? false
    );

  }, [usuario]);

  /* =====================================================
     PROVIDER
  ===================================================== */

  return (

    <AuthContext.Provider
      value={{

        usuario,

        carregando,

        login,

        logout,

        pode,

        trocarEstoque,

        cidades: CIDADES,

        isGerente:
          usuario?.role === 'gerente',

        isSupervisor:
          usuario?.role === 'supervisor',

        isAuxiliar:
          usuario?.role === 'auxiliar',
      }}
    >

      {children}

    </AuthContext.Provider>
  );
}

/* =========================================================
   HOOK
========================================================= */

export function useAuth() {

  const ctx =
    useContext(AuthContext);

  if (!ctx) {

    throw new Error(
      'useAuth deve ser usado dentro de <AuthProvider>'
    );
  }

  return ctx;
}