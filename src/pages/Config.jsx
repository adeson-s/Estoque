import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../AppContext';
import PageHeader from '../components/PageHeader';
import SheetsService from '../services/SheetsService';

export default function Config() {
  const { carregarDados } = useApp();
  const navigate = useNavigate();
  const [sheetId, setSheetId] = useState(SheetsService.CONFIG.sheetId || '');
  const [apiKey, setApiKey]   = useState(SheetsService.CONFIG.apiKey || '');
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading]   = useState(false);

  const salvar = async () => {
    if (!sheetId || !apiKey) {
      setFeedback({ tipo: 'error', msg: 'Preencha todos os campos' });
      return;
    }
    SheetsService.CONFIG.sheetId = sheetId;
    SheetsService.CONFIG.apiKey  = apiKey;
    setFeedback({ tipo: 'success', msg: 'Configuração salva! Carregando dados...' });
    setTimeout(async () => {
      await carregarDados();
      navigate('/dashboard');
    }, 1200);
  };

  const testar = async () => {
    if (!sheetId || !apiKey) {
      setFeedback({ tipo: 'error', msg: 'Preencha os campos primeiro' });
      return;
    }
    setLoading(true);
    SheetsService.CONFIG.sheetId = sheetId;
    SheetsService.CONFIG.apiKey  = apiKey;
    const res = await SheetsService.testarConexao();
    setFeedback({ tipo: res.success ? 'success' : 'error', msg: res.message });
    setLoading(false);
  };

  return (
    <>
      <PageHeader title="Configurações" subtitle="Conexão com Google Sheets" />
      <div className="page-content">
        <div className="form-card">
          <h3><i className="fas fa-cog"></i> Configurações do Google Sheets</h3>
          <div className="config-section">
            <h4>ID da Planilha do Google Sheets</h4>
            <p className="config-help">
              <i className="fas fa-info-circle"></i>{' '}
              Copie o ID da URL da sua planilha (entre /d/ e /edit)
            </p>
            <input
              type="text"
              className="input-large"
              placeholder="1A2B3C4D5E6F7G8H9I0J..."
              value={sheetId}
              onChange={e => setSheetId(e.target.value)}
            />

            <h4 style={{ marginTop: 20 }}>API Key do Google</h4>
            <p className="config-help">
              <i className="fas fa-info-circle"></i>{' '}
              <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer">
                Obtenha sua API Key aqui
              </a>
            </p>
            <input
              type="password"
              className="input-large"
              placeholder="AIzaSy..."
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
            />

            {feedback && (
              <div className={`feedback ${feedback.tipo}`}>{feedback.msg}</div>
            )}

            <div className="form-actions" style={{ marginTop: 24 }}>
              <button className="btn-primary" onClick={salvar}>
                <i className="fas fa-save"></i> Salvar Configuração
              </button>
              <button className="btn-secondary" onClick={testar} disabled={loading}>
                <i className="fas fa-plug"></i> {loading ? 'Testando...' : 'Testar Conexão'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
