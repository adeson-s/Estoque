// Feito por Adeson Souza
// Serviço de integração com Google Sheets

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbz8er9VsbTFFLSu27waNsh270sPvlpUCp95iN8M_Zahc5px3XtWNO0ZOwgaYL2Zjt5w/exec";

const CONFIG = {
  SHEETS: {
    MOVIMENTACOES: 'MOVIMENTACOES',
    TECNICOS: 'CADASTRO_TECNICOS',
    PRODUTOS: 'CADASTRO_PRODUTOS',
  },

  AUTO_REFRESH: 30000,

  // Agora o sheetId vem do usuário logado
  sheetId: '',

  apiKey: 'AIzaSyCR8ARygudTzb3_L2D4VUaH6V9zWPOysik',
};

const cache = {};
const CACHE_TIMEOUT = 10000;

/* =========================================================
   SESSION / SHEET
========================================================= */

function getSession() {
  try {
    const raw = localStorage.getItem('leste_auth_session');

    if (!raw) return null;

    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function getSheetId() {
  try {
    const sessao = getSession();

    return sessao?.usuario?.sheetId || '';
  } catch {
    return '';
  }
}

function withSheet(data = {}) {
  return {
    ...data,
    sheetId: getSheetId(),
  };
}

/* =========================================================
   CONFIG
========================================================= */

function isConfigured() {
  return getSheetId() !== '' && CONFIG.apiKey !== '';
}

/* =========================================================
   HELPERS
========================================================= */

function sheetToObjects(sheetData) {
  if (!sheetData || sheetData.length < 2) return [];

  const headers = sheetData[0];

  return sheetData.slice(1).map(row => {
    const obj = {};

    headers.forEach((h, i) => {
      obj[h] = row[i] || '';
    });

    return obj;
  });
}

/* =========================================================
   READ SHEETS
========================================================= */

async function readSheet(sheetName) {
  const sheetId = getSheetId();

  if (!sheetId) {
    throw new Error('SheetId não encontrado.');
  }

  const cacheKey = `${sheetId}_${sheetName}`;

  // Cache
  if (
    cache[cacheKey] &&
    (Date.now() - cache[cacheKey].timestamp < CACHE_TIMEOUT)
  ) {
    return cache[cacheKey].data;
  }

  const url =
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(sheetName)}?key=${CONFIG.apiKey}`;

  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Erro ao acessar Google Sheets: ${res.status}`);
  }

  const data = await res.json();

  const values = data.values || [];

  cache[cacheKey] = {
    data: values,
    timestamp: Date.now(),
  };

  return values;
}

/* =========================================================
   LOAD ALL
========================================================= */

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

/* =========================================================
   SALVAR MOVIMENTAÇÃO
========================================================= */

async function salvarMovimentacao(dados) {
  const formData = new URLSearchParams();

  formData.append(
    "dados",
    JSON.stringify(
      withSheet(dados)
    )
  );

  const res = await fetch(SCRIPT_URL, {
    method: "POST",
    body: formData,
  });

  return res.json();
}

/* =========================================================
   SALVAR PRODUTO
========================================================= */

async function salvarProduto(produto) {
  const formData = new URLSearchParams();

  formData.append(
    "dados",
    JSON.stringify(
      withSheet({
        acao: "salvarProduto",
        ...produto,
      })
    )
  );

  const res = await fetch(SCRIPT_URL, {
    method: "POST",
    body: formData,
  });

  return res.json();
}

/* =========================================================
   SALVAR CONFERÊNCIA
========================================================= */

async function salvarConferencia(relatorio) {
  const formData = new URLSearchParams();

  formData.append(
    "dados",
    JSON.stringify(
      withSheet({
        acao: "salvarConferencia",
        ...relatorio,
      })
    )
  );

  const res = await fetch(SCRIPT_URL, {
    method: "POST",
    body: formData,
  });

  return res.json();
}

/* =========================================================
   LISTAR CONFERÊNCIAS
========================================================= */

async function listarConferencias() {
  const sheetId = getSheetId();

  const url =
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/CONFERENCIAS?key=${CONFIG.apiKey}&t=${Date.now()}`;

  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Erro ao acessar planilha: ${res.status}`);
  }

  const data = await res.json();

  const valores = data.values || [];

  if (valores.length === 0) return [];

  return valores.map(row => {
    let itens = [];

    try {
      itens = JSON.parse(row[10] || '[]');
    } catch {
      itens = [];
    }

    return {
      id:         row[0] || '',
      data:       row[1] || '',
      estoque:    row[2] || '',
      tecnico:    row[3] || '',
      carro:      row[4] || '',
      estoquista: row[5] || '',
      itens,
    };
  }).reverse();
}

/* =========================================================
   USUÁRIOS
========================================================= */

async function buscarUsuarios() {
  const sheetId = getSheetId();

  const url =
    `${SCRIPT_URL}?acao=buscarUsuarios&sheetId=${sheetId}&t=${Date.now()}`;

  const res = await fetch(url);

  const json = await res.json();

  if (!json.success) {
    throw new Error(json.error);
  }

  return json.data;
}

async function salvarUsuario(dados) {
  const formData = new URLSearchParams();

  formData.append(
    "dados",
    JSON.stringify(
      withSheet({
        acao: "salvarUsuario",
        ...dados,
      })
    )
  );

  const res = await fetch(SCRIPT_URL, {
    method: "POST",
    body: formData,
  });

  return res.json();
}

async function excluirUsuario(username) {
  const formData = new URLSearchParams();

  formData.append(
    "dados",
    JSON.stringify({
      acao: "excluirUsuario",
      username,
      sheetId: getSheetId(),
    })
  );

  const res = await fetch(SCRIPT_URL, {
    method: "POST",
    body: formData,
  });

  return res.json();
}

/* =========================================================
   TESTAR CONEXÃO
========================================================= */

async function testarConexao() {
  try {
    await readSheet(CONFIG.SHEETS.MOVIMENTACOES);

    return {
      success: true,
      message: 'Conexão estabelecida com sucesso!',
    };
  } catch (e) {
    return {
      success: false,
      message: e.message,
    };
  }
}

/* =========================================================
   FORMAT DATE
========================================================= */

function formatDate(val) {
  if (!val) return '';

  // Já está em BR
  if (typeof val === 'string' && val.includes('/')) {
    return val;
  }

  let date;

  // Número do Sheets
  if (!isNaN(val)) {
    const utc = new Date(
      (Number(val) - 25569) * 86400 * 1000
    );

    date = new Date(
      utc.getUTCFullYear(),
      utc.getUTCMonth(),
      utc.getUTCDate()
    );
  }

  // ISO yyyy-MM-dd
  else if (
    typeof val === 'string' &&
    val.includes('-')
  ) {
    const [ano, mes, dia] =
      val.split('-').map(Number);

    date = new Date(
      ano,
      mes - 1,
      dia
    );
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

/* =========================================================
   CACHE
========================================================= */

function clearCache() {
  Object.keys(cache).forEach(k => delete cache[k]);
}

/* =========================================================
   EXPORT
========================================================= */

export default {
  CONFIG,

  isConfigured,

  carregarTodos,

  salvarMovimentacao,

  salvarProduto,

  salvarConferencia,

  listarConferencias,

  buscarUsuarios,

  salvarUsuario,

  excluirUsuario,

  testarConexao,

  formatDate,

  clearCache,
};