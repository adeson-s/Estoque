// src/pages/Login.jsx
import React, { useState } from 'react';
import { useAuth } from '../auth/AuthContext';

export default function Login() {
  const { login } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [erro,     setErro]     = useState('');
  const [loading,  setLoading]  = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!username.trim() || !password) {
      setErro('Preencha usuário e senha.');
      return;
    }
    setLoading(true);
    setErro('');
    await new Promise(r => setTimeout(r, 400));
    const result = login(username, password);
    if (!result.ok) {
      setErro(result.erro);
      setLoading(false);
    }
    // Se ok → AuthContext atualiza → App redireciona automaticamente
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #FFF; font-family: 'DM Sans', system-ui, sans-serif; }

        .login-bg {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #FFF;
          padding: 20px;
        }

        .login-card {
          width: 100%;
          max-width: 400px;
          background: #fff;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 20px 60px rgba(0,0,0,0.35);
        }

        .login-top {
          background: #0d1f14;
          padding: 32px 36px 28px;
          border-bottom: 3px solid #22c55e;
        }

        .login-logo {
          display: flex;
          align-items: center;
          gap: 11px;
          margin-bottom: 22px;
        }

        .login-logo-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: #22c55e;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .login-logo-name {
          font-size: 20px;
          font-weight: 800;
          color: #fff;
          letter-spacing: -0.03em;
          line-height: 1;
        }

        .login-logo-sub {
          font-size: 10px;
          font-weight: 600;
          color: #4ade80;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          margin-top: 3px;
        }

        .login-title {
          font-size: 22px;
          font-weight: 800;
          color: #fff;
          letter-spacing: -0.03em;
          margin-bottom: 4px;
        }

        .login-subtitle {
          font-size: 13px;
          color: rgba(255,255,255,0.45);
        }

        .login-body {
          padding: 28px 36px 32px;
        }

        .field {
          margin-bottom: 16px;
        }

        .field label {
          display: block;
          font-size: 11px;
          font-weight: 700;
          color: #666;
          text-transform: uppercase;
          letter-spacing: 0.07em;
          margin-bottom: 7px;
        }

        .input-wrap {
          position: relative;
        }

        .input-wrap input {
          width: 100%;
          padding: 11px 14px;
          border-radius: 9px;
          border: 1.5px solid #e5e7eb;
          font-size: 14px;
          font-family: 'DM Sans', system-ui, sans-serif;
          color: #111;
          background: #f9fafb;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
        }

        .input-wrap input:focus {
          border-color: #22c55e;
          background: #fff;
          box-shadow: 0 0 0 3px rgba(34,197,94,0.12);
        }

        .input-wrap input::placeholder { color: #bbb; }

        .pass-toggle {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: #aaa;
          cursor: pointer;
          padding: 4px;
          display: flex;
          align-items: center;
          border-radius: 5px;
          transition: color 0.12s;
        }
        .pass-toggle:hover { color: #22c55e; }

        .erro-msg {
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 10px 13px;
          border-radius: 9px;
          background: #fef2f2;
          border: 1.5px solid #fecaca;
          color: #dc2626;
          font-size: 13px;
          font-weight: 500;
          margin-bottom: 16px;
        }

        .btn-entrar {
          width: 100%;
          padding: 13px;
          border-radius: 10px;
          border: none;
          background: #16a34a;
          color: #fff;
          font-size: 14px;
          font-weight: 700;
          font-family: 'DM Sans', system-ui, sans-serif;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: background 0.15s, transform 0.12s;
          margin-top: 4px;
        }
        .btn-entrar:hover:not(:disabled) {
          background: #15803d;
          transform: translateY(-1px);
        }
        .btn-entrar:disabled { opacity: 0.65; cursor: not-allowed; }

        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.65s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .login-footer-note {
          margin-top: 20px;
          padding-top: 16px;
          border-top: 1px solid #f0f0f0;
          font-size: 11.5px;
          color: #aaa;
          text-align: center;
          line-height: 1.5;
        }
      `}</style>

      <div className="login-bg">
        <div className="login-card">

          {/* Topo */}
          <div className="login-top">
            <div className="login-logo">
              <div className="login-logo-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"
                    stroke="#0d1f14" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <polyline points="9 22 9 12 15 12 15 22"
                    stroke="#0d1f14" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div>
                <div className="login-logo-name">Leste</div>
                <div className="login-logo-sub">Estoque Maricá</div>
              </div>
            </div>
            <div className="login-title">Acesse o sistema</div>
            <div className="login-subtitle">Entre com suas credenciais para continuar</div>
          </div>

          {/* Formulário */}
          <div className="login-body">
            <form onSubmit={handleSubmit} noValidate>

              {erro && (
                <div className="erro-msg">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  {erro}
                </div>
              )}

              <div className="field">
                <label htmlFor="u">Usuário</label>
                <div className="input-wrap">
                  <input
                    id="u"
                    type="text"
                    autoComplete="username"
                    placeholder="seu.usuario"
                    value={username}
                    onChange={e => { setUsername(e.target.value); setErro(''); }}
                    disabled={loading}
                    autoFocus
                  />
                </div>
              </div>

              <div className="field">
                <label htmlFor="p">Senha</label>
                <div className="input-wrap">
                  <input
                    id="p"
                    type={showPass ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => { setPassword(e.target.value); setErro(''); }}
                    disabled={loading}
                    style={{ paddingRight: 40 }}
                  />
                  <button
                    type="button"
                    className="pass-toggle"
                    onClick={() => setShowPass(s => !s)}
                    tabIndex={-1}
                  >
                    {showPass ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
                        <line x1="1" y1="1" x2="23" y2="23"/>
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <button type="submit" className="btn-entrar" disabled={loading}>
                {loading ? (
                  <><div className="spinner" /> Verificando...</>
                ) : (
                  <>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4"/>
                      <polyline points="10 17 15 12 10 7"/>
                      <line x1="15" y1="12" x2="3" y2="12"/>
                    </svg>
                    Entrar
                  </>
                )}
              </button>
            </form>

            <div className="login-footer-note">
              Sistema restrito · Contate o administrador se não conseguir acessar
            </div>
          </div>
        </div>
      </div>
    </>
  );
}