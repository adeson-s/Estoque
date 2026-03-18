import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './AppContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import NovaSaida from './pages/NovaSaida';
import Movimentacoes from './pages/Movimentacoes';
import Tecnicos from './pages/Tecnicos';
import Produtos from './pages/Produtos';
import Relatorios from './pages/Relatorios';
import Config from './pages/Config';

function AppInit() {
  const { carregarDados, iniciarAutoRefresh } = useApp();

  useEffect(() => {
    carregarDados().then(() => iniciarAutoRefresh());
  }, []);

  return null;
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <AppInit />
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard"     element={<Dashboard />} />
            <Route path="/saida"         element={<NovaSaida />} />
            <Route path="/movimentacoes" element={<Movimentacoes />} />
            <Route path="/tecnicos"      element={<Tecnicos />} />
            <Route path="/produtos"      element={<Produtos />} />
            <Route path="/relatorios"    element={<Relatorios />} />
            <Route path="/config"        element={<Config />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}
