// src/auth/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export const PERMISSOES = {
  admin: {
    verDashboard:     true,
    verMovimentacoes: true,
    verProdutos:      true,
    editarProdutos:   true,
    excluirProdutos:  true,
    criarProdutos:    true,
    novaReposicao:    true,
    verTecnicos:      true,
    editarTecnicos:   true,
    transferencia:    true,
    conferencia:      true,
    verRelatorios:    true,
    exportarDados:    true,
  },
  auxiliar: {
    verDashboard:     true,
    verMovimentacoes: true,
    verProdutos:      true,
    editarProdutos:   false,
    excluirProdutos:  false,
    criarProdutos:    false,
    novaReposicao:    true,
    verTecnicos:      true,
    editarTecnicos:   false,
    transferencia:    true,
    conferencia:      true,
    verRelatorios:    true,
    exportarDados:    false,
  },
};

function carregarUsuarios() {
  const lista = [];

  // Admin principal
  const aUser = import.meta.env.VITE_ADMIN_USER;
  const aPass = import.meta.env.VITE_ADMIN_PASS;
  const aName = import.meta.env.VITE_ADMIN_NAME || 'Administrador';
  if (aUser && aPass) lista.push({ username: aUser.trim(), password: aPass, name: aName, role: 'admin' });

  // Admins extras VITE_ADMIN1_USER … VITE_ADMIN5_USER
  for (let i = 1; i <= 5; i++) {
    const u = import.meta.env[`VITE_ADMIN${i}_USER`];
    const p = import.meta.env[`VITE_ADMIN${i}_PASS`];
    const n = import.meta.env[`VITE_ADMIN${i}_NAME`] || `Admin ${i}`;
    if (u && p) lista.push({ username: u.trim(), password: p, name: n, role: 'admin' });
  }

  // Auxiliares VITE_AUX1_USER … VITE_AUX10_USER
  for (let i = 1; i <= 10; i++) {
    const u = import.meta.env[`VITE_AUX${i}_USER`];
    const p = import.meta.env[`VITE_AUX${i}_PASS`];
    const n = import.meta.env[`VITE_AUX${i}_NAME`] || `Auxiliar ${i}`;
    if (u && p) lista.push({ username: u.trim(), password: p, name: n, role: 'auxiliar' });
  }

  return lista;
}

const USUARIOS      = carregarUsuarios();
const SESSION_KEY   = 'leste_auth_session';
const SESSION_HOURS = Number(import.meta.env.VITE_SESSION_HOURS) || 8;

// Lê sessão de forma SÍNCRONA — evita o "carregando forever"
function lerSessaoSincrona() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
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

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // ✅ Leitura SÍNCRONA no useState — nunca trava em "carregando"
  const [usuario, setUsuario] = useState(() => lerSessaoSincrona());

  // Renovar expiração a cada clique/tecla
  useEffect(() => {
    if (!usuario) return;
    const renovar = () => {
      try {
        const raw = localStorage.getItem(SESSION_KEY);
        if (raw) {
          const s = JSON.parse(raw);
          s.expiraEm = Date.now() + SESSION_HOURS * 3600 * 1000;
          localStorage.setItem(SESSION_KEY, JSON.stringify(s));
        }
      } catch (_) {}
    };
    window.addEventListener('click',   renovar);
    window.addEventListener('keydown', renovar);
    return () => {
      window.removeEventListener('click',   renovar);
      window.removeEventListener('keydown', renovar);
    };
  }, [usuario]);

  const login = useCallback((username, password) => {
    const digitado = username.toLowerCase().trim();
    const user = USUARIOS.find(
      u => u.username.toLowerCase() === digitado && u.password === password
    );
    if (!user) return { ok: false, erro: 'Usuário ou senha incorretos.' };

    const dadosUsuario = { username: user.username, name: user.name, role: user.role };
    localStorage.setItem(SESSION_KEY, JSON.stringify({
      usuario:  dadosUsuario,
      expiraEm: Date.now() + SESSION_HOURS * 3600 * 1000,
      loginEm:  Date.now(),
    }));
    setUsuario(dadosUsuario);
    return { ok: true };
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    setUsuario(null);
  }, []);

  const pode = useCallback((permissao) => {
    if (!usuario) return false;
    return PERMISSOES[usuario.role]?.[permissao] ?? false;
  }, [usuario]);

  return (
    <AuthContext.Provider value={{
      usuario,
      carregando: false,   // nunca trava — leitura é síncrona
      login,
      logout,
      pode,
      isAdmin: usuario?.role === 'admin',
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>');
  return ctx;
}