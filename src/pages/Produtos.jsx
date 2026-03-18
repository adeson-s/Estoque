import React, { useState } from 'react';
import { useApp } from '../AppContext';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import SheetsService from '../services/SheetsService';
import { QRCodeCanvas } from 'qrcode.react';

const unidades = ['PACOTE', 'UN', 'MT', 'KG', 'LT'];

function statusEstoque(atual, minimo) {
  if (atual <= minimo)     return { cls: 'danger',  text: 'CRÍTICO' };
  if (atual <= minimo * 2) return { cls: 'warning', text: 'ALERTA' };
  return                          { cls: 'success', text: 'OK' };
}

export default function Produtos() {
  const { dados, carregarDados } = useApp();
  const { produtos, movimentacoes } = dados;

  const [showModal, setShowModal] = useState(false);
  const [busca, setBusca] = useState('');
  const [form, setForm] = useState({
    nome: '',
    unidade: '',
    estoque: '',
    minimo: ''
  });

  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const handleChange = e =>
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const gerarQR = (produto) => {
    return `PROD:${produto.codigo}`;
  };

  const salvar = async () => {
  if (!form.nome || !form.unidade || form.estoque === '' || form.minimo === '') {
    setFeedback('Preencha todos os campos');
    return;
  }

  setLoading(true);
  setFeedback(null);

  try {
    // 1️⃣ Gerar código único (timestamp)
    const codigo = Date.now();

    // 2️⃣ Gerar QR_CODE a partir do código
    const QR_CODE = codigo;

    // 3️⃣ Enviar para Google Sheets
    const res = await SheetsService.salvarProduto({
      codigo,
      nome: form.nome,
      unidade: form.unidade,
      estoque: form.estoque,
      minimo: form.minimo,
      QR_CODE // ✅ garante que o QR_CODE vai para o Apps Script
    });

    if (!res.success) throw new Error(res.error || 'Erro ao salvar');

    setShowModal(false);
    setForm({ nome: '', unidade: '', estoque: '', minimo: '' });

    await carregarDados();
  } catch (err) {
    setFeedback('Erro: ' + err.message);
  } finally {
    setLoading(false);
  }
};

  const imprimirQR = (produto) => {
    const janela = window.open('', '_blank');

    janela.document.write(`
      <html>
        <body style="text-align:center;font-family:Arial;">
          <h4>${produto.PRODUTO}</h4>
          <div id="qrcode"></div>

          <script src="https://cdn.jsdelivr.net/npm/qrcode/build/qrcode.min.js"></script>
          <script>
            QRCode.toCanvas(
              document.getElementById('qrcode'),
              '${produto.QR_CODE}',
              { width: 150 }
            );
            setTimeout(() => window.print(), 500);
          </script>
        </body>
      </html>
    `);
  };

  const listaFiltrada = produtos.filter(p => {
    const texto = busca.toLowerCase();
    return (
      (p.PRODUTO || '').toLowerCase().includes(texto) ||
      (p.QR_CODE || '').toLowerCase().includes(texto)
    );
  });

  return (
    <>
      <PageHeader title="Produtos" subtitle="Gestão de estoque" />

      <div className="page-content">

        {/* BUSCA */}
        <input
          type="text"
          placeholder="Buscar por nome ou código..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          style={{ marginBottom: 15 }}
        />

        <div className="table-card">
          <div className="table-header">
            <h3>Produtos</h3>
            <button className="btn-primary" onClick={() => setShowModal(true)}>
              + Novo Produto
            </button>
          </div>

          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Produto</th>
                  <th>Estoque</th>
                  <th>Mínimo</th>
                  <th>Status</th>
                  <th>QR Code</th>
                  <th>Ações</th>
                </tr>
              </thead>

              <tbody>
                {listaFiltrada.map((p, i) => {
                  const atual = parseInt(p['ESTOQUE ATUAL']) || 0;
                  const minimo = parseInt(p['ESTOQUE MÍNIMO']) || 0;
                  const st = statusEstoque(atual, minimo);

                  return (
                    <tr key={i}>
                      <td>{p['CÓDIGO'] || i + 1}</td>
                      <td>{p.PRODUTO}</td>

                      <td style={{ color: st.cls === 'danger' ? '#DC2626' : '' }}>
                        {atual}
                      </td>

                      <td>{minimo}</td>

                      <td>
                        <span className={`badge ${st.cls}`}>
                          {st.text}
                        </span>
                      </td>

                      <td>
                        {p.QR_CODE && (
                          <QRCodeCanvas value={p.QR_CODE} size={60} />
                        )}
                      </td>

                      <td>
                        <button onClick={() => imprimirQR(p)}>
                          Imprimir
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {listaFiltrada.length === 0 && (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center' }}>
                      Nenhum produto encontrado
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL */}
      {showModal && (
        <Modal
          title="Novo Produto"
          onClose={() => setShowModal(false)}
          footer={
            <>
              <button onClick={() => setShowModal(false)}>Cancelar</button>
              <button onClick={salvar} disabled={loading}>
                {loading ? 'Salvando...' : 'Salvar'}
              </button>
            </>
          }
        >
          {feedback && <div className="feedback error">{feedback}</div>}

          <div className="form-group">
            <label>Nome</label>
            <input name="nome" value={form.nome} onChange={handleChange} />
          </div>

          <div className="form-group">
            <label>Unidade</label>
            <select name="unidade" value={form.unidade} onChange={handleChange}>
              <option value="">Selecione</option>
              {unidades.map(u => <option key={u}>{u}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label>Estoque</label>
            <input type="number" name="estoque" value={form.estoque} onChange={handleChange} />
          </div>

          <div className="form-group">
            <label>Mínimo</label>
            <input type="number" name="minimo" value={form.minimo} onChange={handleChange} />
          </div>

          {/* PREVIEW QR */}
          {form.nome && (
            <div style={{ textAlign: 'center', marginTop: 20 }}>
              <QRCodeCanvas
                value={`PROD:PREVIEW`}
                size={100}
              />
              <p>QR será gerado automaticamente</p>
            </div>
          )}
        </Modal>
      )}
    </>
  );
}