// Feito por Adeson Souza
// Serviço de integração com Google Sheets

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxCEXr9UDG9NB1tH90wPv1UTMT7_8Op8DA0_JJcg2H0j_uzB-RDZkusZ-TNLvbkj2zg/exec";

const CONFIG = {
  SHEETS: {
    MOVIMENTACOES: 'MOVIMENTACOES',
    TECNICOS: 'CADASTRO_TECNICOS',
    PRODUTOS: 'CADASTRO_PRODUTOS',
  },
  AUTO_REFRESH: 30000,
  sheetId: '1-Ih5DR3RBk0rGb3ZfMVZhZHXlOf_ez1vu7kyI4mW_j0',
  apiKey: 'AIzaSyCR8ARygudTzb3_L2D4VUaH6V9zWPOysik',
};

const cache = {};
const CACHE_TIMEOUT = 10000;

function isConfigured() {
  return CONFIG.sheetId !== '' && CONFIG.apiKey !== '';
}

function sheetToObjects(sheetData) {
  if (!sheetData || sheetData.length < 2) return [];
  const headers = sheetData[0];
  return sheetData.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i] || ''; });
    return obj;
  });
}

async function readSheet(sheetName) {
  const cacheKey = `${CONFIG.sheetId}_${sheetName}`;
  if (cache[cacheKey] && (Date.now() - cache[cacheKey].timestamp < CACHE_TIMEOUT)) {
    return cache[cacheKey].data;
  }
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.sheetId}/values/${encodeURIComponent(sheetName)}?key=${CONFIG.apiKey}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Erro ao acessar Google Sheets: ${res.status}`);
  const data = await res.json();
  const values = data.values || [];
  cache[cacheKey] = { data: values, timestamp: Date.now() };
  return values;
}

async function carregarTodos() {
  const [movRaw, tecRaw, prodRaw] = await Promise.all([
    readSheet(CONFIG.SHEETS.MOVIMENTACOES),
    readSheet(CONFIG.SHEETS.TECNICOS),
    readSheet(CONFIG.SHEETS.PRODUTOS),
  ]);
  return {
    movimentacoes: sheetToObjects(movRaw),
    tecnicos: sheetToObjects(tecRaw),
    produtos: sheetToObjects(prodRaw),
  };
}

async function salvarMovimentacao(dados) {
  const formData = new URLSearchParams();
  formData.append("dados", JSON.stringify(dados));
  const res = await fetch(SCRIPT_URL, { method: "POST", body: formData });
  return res.json();
}

async function salvarProduto(produto) {
  const res = await fetch('/pages/api/salvarProduto', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ acao: 'salvarProduto', ...produto })
  });
  return res.json();
}

async function testarConexao() {
  try {
    await readSheet(CONFIG.SHEETS.MOVIMENTACOES);
    return { success: true, message: 'Conexão estabelecida com sucesso!' };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

function formatDate(val) {
  if (!val) return '';
  if (val.includes('/')) return val;
  try { return new Date(val).toLocaleDateString('pt-BR'); } catch { return val; }
}

function clearCache() { Object.keys(cache).forEach(k => delete cache[k]); }

export default {
  CONFIG,
  isConfigured,
  carregarTodos,
  salvarMovimentacao,
  salvarProduto,
  testarConexao,
  formatDate,
  clearCache,
};
