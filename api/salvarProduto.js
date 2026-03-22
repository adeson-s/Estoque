// src/api/salvarProduto.js
export default async function handler(req, res) {
  // ✅ Só aceitar POST
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Método não permitido' });
  }

  try {
    // ✅ Pegar os dados enviados do frontend (JSON)
    const dados = req.body;
    if (!dados) {
      return res.status(400).json({ success: false, error: 'Dados não fornecidos' });
    }

    // URL do seu Apps Script
    const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxCEXr9UDG9NB1tH90wPv1UTMT7_8Op8DA0_JJcg2H0j_uzB-RDZkusZ-TNLvbkj2zg/exec";

    // 🔹 Chamar Apps Script via fetch (proxy) - evita CORS
    const response = await fetch(SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ dados: JSON.stringify(dados) })
    });

    const json = await response.json();

    // ✅ Retorna a resposta do Apps Script para o frontend
    return res.status(200).json(json);

  } catch (erro) {
    console.error('Erro ao salvar produto:', erro);
    return res.status(500).json({ success: false, error: erro.message || 'Erro interno do servidor' });
  }
}