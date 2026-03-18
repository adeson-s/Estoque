// /api/salvarProduto.js
import { google } from 'googleapis';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Método não permitido' });
  }

  try {
    const dados = req.body;

    // Aqui você poderia usar a Google Sheets API com service account
    // Ou chamar seu Google Apps Script via fetch

    // Exemplo simples de log:
    console.log('Recebido dados:', dados);

    // Simulação de sucesso
    return res.status(200).json({ success: true });
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ success: false, error: erro.message });
  }
}