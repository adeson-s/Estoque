// src/App.jsx
import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import { AppProvider, useApp }   from './AppContext';
import { AuthProvider, useAuth } from './auth/AuthContext';

import Layout              from './components/Layout';
import Dashboard           from './pages/Dashboard';
import NovaSaida           from './pages/NovaSaida';
import Movimentacoes       from './pages/Movimentacoes';
import Tecnicos            from './pages/Tecnicos';
import Produtos            from './pages/Produtos';
import Relatorios          from './pages/Relatorios';
import Config              from './pages/Config';
import TransferenciaInterna from './pages/TransferenciaInterna';
import Conferencia         from './pages/Conferenciaestoque';
import Login               from './pages/Login';

// ─── Inicialização de dados ───────────────────────────────────────────────────
function AppInit() {
  const { carregarDados, iniciarAutoRefresh } = useApp();
  useEffect(() => {
    carregarDados().then(() => iniciarAutoRefresh());
  }, []);
  return null;
}

// ─── Proteção de rota ─────────────────────────────────────────────────────────
// carregando é sempre false agora (leitura síncrona), mas mantemos a prop
// por compatibilidade caso o AppContext ainda emita algum estado assíncrono.
function PrivateRoute({ children }) {
  const { usuario } = useAuth();
  return usuario ? children : <Navigate to="/login" replace />;
}

// ─── Guarda da rota de login ──────────────────────────────────────────────────
// Se já estiver logado e tentar acessar /login → vai pro dashboard
function LoginRoute() {
  const { usuario } = useAuth();
  return usuario ? <Navigate to="/dashboard" replace /> : <Login />;
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <BrowserRouter>
          <AppInit />
          <Routes>

            {/* Pública */}
            <Route path="/login" element={<LoginRoute />} />

            {/* Protegidas */}
            <Route
              element={
                <PrivateRoute>
                  <Layout />
                </PrivateRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard"    element={<Dashboard />} />
              <Route path="/saida"        element={<NovaSaida />} />
              <Route path="/movimentacoes" element={<Movimentacoes />} />
              <Route path="/tecnicos"     element={<Tecnicos />} />
              <Route path="/produtos"     element={<Produtos />} />
              <Route path="/relatorios"   element={<Relatorios />} />
              <Route path="/config"       element={<Config />} />
              <Route path="/transferencia" element={<TransferenciaInterna />} />
              <Route path="/conferencia"  element={<Conferencia />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />

          </Routes>
        </BrowserRouter>
      </AppProvider>
    </AuthProvider>
  );
}