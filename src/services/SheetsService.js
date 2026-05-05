// Feito por Adeson Souza
// Serviço de integração com Google Sheets

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzL4mXREOI4GR3TwNFarg8VDf8eKkhxuNWpHQYn2LyHOnqbzzKJVO2HgDs4KY62hfD2/exec";

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

  const res = await fetch(SCRIPT_URL, {
    method: "POST",
    body: formData
  });

  return res.json();
}

async function salvarProduto(produto) {
  const formData = new URLSearchParams();

  formData.append("dados", JSON.stringify({
    acao: "salvarProduto",
    ...produto
  }));

  const res = await fetch('/api/salvarProduto', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(produto)
});

  return res.json();
}


async function salvarConferencia(relatorio) {
  const formData = new URLSearchParams();
  formData.append("dados", JSON.stringify({
    acao: "salvarConferencia",
    ...relatorio,
  }));
  const res = await fetch(SCRIPT_URL, { method: "POST", body: formData });
  return res.json();
}

async function listarConferencias() {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.sheetId}/values/CONFERENCIAS?key=${CONFIG.apiKey}&t=${Date.now()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Erro ao acessar planilha: ${res.status}`);
  const data = await res.json();
  const valores = data.values || [];
  if (valores.length === 0) return [];

  // Mapeia por posição (sem depender de cabeçalho)
  return valores.map(row => {
    let itens = [];
    try { itens = JSON.parse(row[10] || '[]'); } catch { itens = []; }
    return {
      id:         row[0]  || '',
      data:       row[1]  || '',
      estoque:    row[2]  || '',
      tecnico:    row[3]  || '',
      carro:      row[4]  || '',
      estoquista: row[5]  || '',
      itens,
    };
  }).reverse();
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

  // Já está em BR
  if (typeof val === 'string' && val.includes('/')) return val;

  let date;

  // 🧮 Número do Sheets
  if (!isNaN(val)) {
    const utc = new Date((Number(val) - 25569) * 86400 * 1000);
    date = new Date(
      utc.getUTCFullYear(),
      utc.getUTCMonth(),
      utc.getUTCDate()
    );
  }

  // 📄 ISO (yyyy-MM-dd) → CORRETO (SEM UTC)
  else if (typeof val === 'string' && val.includes('-')) {
    const [ano, mes, dia] = val.split('-').map(Number);
    date = new Date(ano, mes - 1, dia);
  }

  // fallback
  else {
    const d = new Date(val);
    if (isNaN(d)) return val;

    date = new Date(
      d.getFullYear(),
      d.getMonth(),
      d.getDate()
    );
  }

  return date.toLocaleDateString('pt-BR');
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
   salvarConferencia,
  listarConferencias,
};
