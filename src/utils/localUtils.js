// ─── Utilitários para Locais ──────────────────────────────────────────────────

import { HIERARQUIA_LOCAIS, LOCAIS_LEGACY } from '../data/localHierarchy';

/**
 * Formata um ID de local em uma string legível
 * @param {string} localId - ID plano do local
 * @returns {string} Label formatado
 */
export function formatarLocal(localId) {
  const local = LOCAIS_LEGACY[localId];
  return local?.label || localId;
}

/**
 * Extrai apenas o nome da cidade a partir de um ID de local
 * @param {string} localId - ID plano do local
 * @returns {string} Nome da cidade
 */
export function getCidadeFromLocal(localId) {
  const local = LOCAIS_LEGACY[localId];
  const hierarquia = local?.hierarquia;
  if (!hierarquia?.cidade) return '';
  
  const cidade = HIERARQUIA_LOCAIS[hierarquia.cidade];
  return cidade?.label || '';
}

/**
 * Extrai o nome da área a partir de um ID de local
 * @param {string} localId - ID plano do local
 * @returns {string} Nome da área
 */
export function getAreaFromLocal(localId) {
  const local = LOCAIS_LEGACY[localId];
  const hierarquia = local?.hierarquia;
  if (!hierarquia?.area) return '';
  
  const cidade = HIERARQUIA_LOCAIS[hierarquia.cidade];
  const area = cidade?.areas?.[hierarquia.area];
  return area?.label || '';
}

/**
 * Verifica se um local é de Maricá
 * @param {string} localId - ID plano do local
 * @returns {boolean}
 */
export function isMarica(localId) {
  const local = LOCAIS_LEGACY[localId];
  return local?.hierarquia?.cidade === 'MARICA';
}

/**
 * Verifica se um local é de uma cidade externa
 * @param {string} localId - ID plano do local
 * @returns {boolean}
 */
export function isExterno(localId) {
  const local = LOCAIS_LEGACY[localId];
  const cidade = local?.hierarquia?.cidade;
  return cidade && cidade !== 'MARICA';
}

/**
 * Obtém o tipo de área (estantes, palites, posicoes)
 * @param {string} localId - ID plano do local
 * @returns {string} Tipo da área
 */
export function getTipoArea(localId) {
  const local = LOCAIS_LEGACY[localId];
  const hierarquia = local?.hierarquia;
  if (!hierarquia?.cidade || !hierarquia?.area) return 'desconhecido';
  
  const cidade = HIERARQUIA_LOCAIS[hierarquia.cidade];
  const area = cidade?.areas?.[hierarquia.area];
  return area?.tipo || 'desconhecido';
}

/**
 * Gera um caminho completo hierárquico
 * @param {string} localId - ID plano do local
 * @returns {string} Caminho formatado (ex: "Maricá / Sala / Estante 1 / Prateleira 1")
 */
export function getCaminhoCompleto(localId) {
  const local = LOCAIS_LEGACY[localId];
  const hierarquia = local?.hierarquia;
  if (!hierarquia) return localId;

  const partes = [];
  
  // Cidade
  const cidade = HIERARQUIA_LOCAIS[hierarquia.cidade];
  if (cidade) partes.push(`${cidade.icon} ${cidade.label}`);
  
  // Área
  const area = cidade?.areas?.[hierarquia.area];
  if (area) partes.push(`${area.icon} ${area.label}`);
  
  // Estante ou Palete
  if (hierarquia.estante) {
    const estante = area?.estantes?.[hierarquia.estante];
    if (estante) partes.push(`${estante.icon} ${estante.label}`);
  }
  if (hierarquia.palite) {
    const palete = area?.palites?.[hierarquia.palite];
    if (palete) partes.push(`${palete.icon} ${palete.label}`);
  }
  
  // Posição
  if (hierarquia.posicao) {
    const cidade2 = HIERARQUIA_LOCAIS[hierarquia.cidade];
    const area2 = cidade2?.areas?.[hierarquia.area];
    
    let posicao;
    if (area2?.tipo === 'estantes' && hierarquia.estante) {
      posicao = area2.estantes?.[hierarquia.estante]?.posicoes?.[hierarquia.posicao];
    } else if (area2?.tipo === 'palites' && hierarquia.palite) {
      posicao = area2.palites?.[hierarquia.palite]?.posicoes?.[hierarquia.posicao];
    } else {
      posicao = area2?.posicoes?.[hierarquia.posicao];
    }
    
    if (posicao) partes.push(`${posicao.icon} ${posicao.label}`);
  }
  
  return partes.join(' / ');
}

/**
 * Agrupa locais por cidade
 * @returns {Object} Objeto com cidades como chaves e arrays de locais como valores
 */
export function agruparLocaisPorCidade() {
  const resultado = {};
  
  Object.values(LOCAIS_LEGACY).forEach(local => {
    const cidadeId = local.hierarquia?.cidade;
    if (!cidadeId) return;
    
    if (!resultado[cidadeId]) {
      resultado[cidadeId] = [];
    }
    resultado[cidadeId].push(local);
  });
  
  return resultado;
}

/**
 * Agrupa locais por área dentro de uma cidade
 * @param {string} cidadeId - ID da cidade
 * @returns {Object} Objeto com áreas como chaves e arrays de locais como valores
 */
export function agruparLocaisPorArea(cidadeId) {
  const resultado = {};
  
  Object.values(LOCAIS_LEGACY)
    .filter(local => local.hierarquia?.cidade === cidadeId)
    .forEach(local => {
      const areaId = local.hierarquia?.area;
      if (!areaId) return;
      
      if (!resultado[areaId]) {
        resultado[areaId] = [];
      }
      resultado[areaId].push(local);
    });
  
  return resultado;
}

/**
 * Busca locais por termo (busca em labels)
 * @param {string} termo - Termo de busca
 * @returns {Array} Lista de locais encontrados
 */
export function buscarLocais(termo) {
  if (!termo) return Object.values(LOCAIS_LEGACY);
  
  const termoLower = termo.toLowerCase();
  return Object.values(LOCAIS_LEGACY).filter(local =>
    local.label.toLowerCase().includes(termoLower)
  );
}

/**
 * Valida se um ID de local existe
 * @param {string} localId - ID a validar
 * @returns {boolean}
 */
export function localExiste(localId) {
  return !!LOCAIS_LEGACY[localId];
}

/**
 * Compara dois locais para verificar se são da mesma cidade
 * @param {string} localId1 - Primeiro local
 * @param {string} localId2 - Segundo local
 * @returns {boolean}
 */
export function mesmaCidade(localId1, localId2) {
  const local1 = LOCAIS_LEGACY[localId1];
  const local2 = LOCAIS_LEGACY[localId2];
  
  if (!local1 || !local2) return false;
  
  return local1.hierarquia?.cidade === local2.hierarquia?.cidade;
}

/**
 * Compara dois locais para verificar se são da mesma área
 * @param {string} localId1 - Primeiro local
 * @param {string} localId2 - Segundo local
 * @returns {boolean}
 */
export function mesmaArea(localId1, localId2) {
  const local1 = LOCAIS_LEGACY[localId1];
  const local2 = LOCAIS_LEGACY[localId2];
  
  if (!local1 || !local2) return false;
  
  return (
    local1.hierarquia?.cidade === local2.hierarquia?.cidade &&
    local1.hierarquia?.area === local2.hierarquia?.area
  );
}

export default {
  formatarLocal,
  getCidadeFromLocal,
  getAreaFromLocal,
  isMarica,
  isExterno,
  getTipoArea,
  getCaminhoCompleto,
  agruparLocaisPorCidade,
  agruparLocaisPorArea,
  buscarLocais,
  localExiste,
  mesmaCidade,
  mesmaArea,
};
