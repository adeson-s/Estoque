import { useState, useMemo, useCallback } from 'react';
import {
  HIERARQUIA_LOCAIS,
  LOCAIS_LEGACY,
  getCidades,
  getAreas,
  getEstantes,
  getPalites,
  getPosicoes,
} from '../data/localHierarchy';

/**
 * Hook para gerenciar seleção hierárquica de locais
 * 
 * @param {Object} options
 * @param {string} options.initialValue - ID inicial do local (plano)
 * @param {string} options.exclude - ID do local a excluir
 * @returns {Object} Métodos e estados para seleção de locais
 */
export function useLocais({ initialValue = '', exclude = '' } = {}) {
  // Parse do valor inicial
  const initialLocal = initialValue ? LOCAIS_LEGACY[initialValue] : null;
  const initialHierarquia = initialLocal?.hierarquia || {};

  // Estados da hierarquia
  const [cidadeId, setCidadeId] = useState(initialHierarquia.cidade || '');
  const [areaId, setAreaId] = useState(initialHierarquia.area || '');
  const [parentId, setParentId] = useState(initialHierarquia.estante || initialHierarquia.palite || '');
  const [posicaoId, setPosicaoId] = useState(initialHierarquia.posicao || '');

  // Dados hierárquicos memoizados
  const cidades = useMemo(() => getCidades(), []);
  const areas = useMemo(() => getAreas(cidadeId), [cidadeId]);
  const estantes = useMemo(() => getEstantes(cidadeId, areaId), [cidadeId, areaId]);
  const palites = useMemo(() => getPalites(cidadeId, areaId), [cidadeId, areaId]);
  const posicoes = useMemo(() => getPosicoes(cidadeId, areaId, parentId), [cidadeId, areaId, parentId]);

  // Área atual
  const areaAtual = useMemo(() => {
    return areas.find(a => a.id === areaId);
  }, [areas, areaId]);

  const tipoArea = areaAtual?.tipo || 'posicoes';
  const temNivelIntermediario = tipoArea === 'estantes' || tipoArea === 'palites';

  // Local selecionado completo
  const localSelecionado = useMemo(() => {
    if (!posicaoId) return null;
    return LOCAIS_LEGACY[posicaoId] || null;
  }, [posicaoId]);

  // Valor plano para compatibilidade
  const value = posicaoId;

  // Verifica se está completo
  const isComplete = !!posicaoId;

  // Handlers
  const setCidade = useCallback((id) => {
    setCidadeId(id || '');
    setAreaId('');
    setParentId('');
    setPosicaoId('');
  }, []);

  const setArea = useCallback((id) => {
    setAreaId(id || '');
    setParentId('');
    setPosicaoId('');
  }, []);

  const setParent = useCallback((id) => {
    setParentId(id || '');
    setPosicaoId('');
  }, []);

  const setPosicao = useCallback((id) => {
    setPosicaoId(id || '');
  }, []);

  // Reset completo
  const reset = useCallback(() => {
    setCidadeId('');
    setAreaId('');
    setParentId('');
    setPosicaoId('');
  }, [setCidadeId, setAreaId, setParentId, setPosicaoId]);

  // Define valor a partir de ID plano
  const setValue = useCallback((id) => {
    const local = LOCAIS_LEGACY[id];
    if (local?.hierarquia) {
      const { cidade, area, estante, palite, posicao } = local.hierarquia;
      setCidadeId(cidade || '');
      setAreaId(area || '');
      setParentId(estante || palite || '');
      setPosicaoId(posicao || '');
    } else {
      reset();
    }
  }, [reset]);

  // Breadcrumb para display
  const breadcrumb = useMemo(() => {
    const result = [];
    if (cidadeId) {
      const cidade = HIERARQUIA_LOCAIS[cidadeId];
      result.push({ level: 'cidade', id: cidadeId, label: cidade?.label, icon: cidade?.icon });
    }
    if (areaId) {
      const area = areas.find(a => a.id === areaId);
      result.push({ level: 'area', id: areaId, label: area?.label, icon: area?.icon });
    }
    if (parentId && temNivelIntermediario) {
      const parent = (tipoArea === 'estantes' ? estantes : palites).find(p => p.id === parentId);
      result.push({ level: 'parent', id: parentId, label: parent?.label, icon: parent?.icon });
    }
    if (posicaoId) {
      const pos = posicoes.find(p => p.id === posicaoId);
      result.push({ level: 'posicao', id: posicaoId, label: pos?.label, icon: pos?.icon });
    }
    return result;
  }, [cidadeId, areaId, parentId, posicaoId, areas, estantes, palites, posicoes, temNivelIntermediario, tipoArea]);

  return {
    // Estados
    cidadeId,
    areaId,
    parentId,
    posicaoId,
    value,
    localSelecionado,
    isComplete,

    // Dados
    cidades,
    areas,
    estantes,
    palites,
    posicoes,
    areaAtual,
    tipoArea,
    temNivelIntermediario,
    breadcrumb,

    // Handlers
    setCidade,
    setArea,
    setParent,
    setPosicao,
    setValue,
    reset,
  };
}

/**
 * Hook para buscar local por ID
 */
export function useLocal(id) {
  return useMemo(() => {
    if (!id) return null;
    return LOCAIS_LEGACY[id] || null;
  }, [id]);
}

/**
 * Hook para listar todos os locais (modo plano)
 */
export function useTodosLocais() {
  return useMemo(() => {
    return Object.values(LOCAIS_LEGACY);
  }, []);
}

/**
 * Hook para filtrar locais por cidade
 */
export function useLocaisPorCidade(cidadeId) {
  return useMemo(() => {
    if (!cidadeId) return [];
    const cidade = HIERARQUIA_LOCAIS[cidadeId];
    if (!cidade) return [];
    
    const result = [];
    Object.values(cidade.areas).forEach(area => {
      if (area.tipo === 'posicoes') {
        Object.values(area.posicoes || {}).forEach(pos => {
          const id = pos.id;
          if (LOCAIS_LEGACY[id]) result.push(LOCAIS_LEGACY[id]);
        });
      } else if (area.tipo === 'estantes') {
        Object.values(area.estantes || {}).forEach(estante => {
          Object.values(estante.posicoes || {}).forEach(pos => {
            const id = pos.id;
            if (LOCAIS_LEGACY[id]) result.push(LOCAIS_LEGACY[id]);
          });
        });
      } else if (area.tipo === 'palites') {
        Object.values(area.palites || {}).forEach(palete => {
          Object.values(palete.posicoes || {}).forEach(pos => {
            const id = pos.id;
            if (LOCAIS_LEGACY[id]) result.push(LOCAIS_LEGACY[id]);
          });
        });
      }
    });
    return result;
  }, [cidadeId]);
}

export default useLocais;
