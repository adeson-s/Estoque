// src/components/LocalStepper.jsx
// Seletor de local em cascata (passo a passo)

import React, { useState, useEffect } from 'react';
import { HIERARCHY, LOCAIS_MAP } from '../data/localHierarchy';

const ss = {
  wrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    flex: 1,
  },
  label: {
    fontSize: 11,
    fontWeight: 700,
    color: 'var(--color-text-secondary, #666)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  stepsRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  stepChip: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  // Botão de cada nível
  chipBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    padding: '5px 11px',
    borderRadius: 20,
    border: '1.5px solid',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    background: 'transparent',
    transition: 'all 0.12s ease',
    whiteSpace: 'nowrap',
  },
  chipArrow: {
    color: 'var(--color-text-secondary, #bbb)',
    fontSize: 13,
    lineHeight: 1,
    padding: '0 2px',
  },
  // Grid de opções
  optGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
    paddingTop: 4,
  },
  optBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    padding: '6px 12px',
    borderRadius: 8,
    border: '1.5px solid var(--color-border-secondary, #e0e0e0)',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    background: 'var(--color-background-secondary, #f7f7f7)',
    color: 'var(--color-text-primary, #222)',
    transition: 'all 0.12s ease',
    whiteSpace: 'nowrap',
  },
  optBtnHover: {
    borderColor: '#185FA5',
    background: '#E6F1FB',
    color: '#185FA5',
  },
  selectedDisplay: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '7px 12px',
    borderRadius: 8,
    border: '1.5px solid #185FA5',
    background: '#EAF2FC',
    color: '#185FA5',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
    flexWrap: 'wrap',
  },
  clearBtn: {
    marginLeft: 'auto',
    background: 'none',
    border: 'none',
    color: '#888',
    cursor: 'pointer',
    fontSize: 13,
    padding: '0 2px',
    lineHeight: 1,
    borderRadius: 4,
  },
};

// Dado um id selecionado, retorna o caminho de ids desde a raiz
function buildPath(targetId, nodes, path = []) {
  for (const node of nodes) {
    const newPath = [...path, node.id];
    if (node.id === targetId) return newPath;
    if (node.children && node.children.length > 0) {
      const found = buildPath(targetId, node.children, newPath);
      if (found) return found;
    }
  }
  return null;
}

// Dado um path de ids, retorna o nó final e seus filhos
function getNodeAt(ids, nodes) {
  let current = nodes;
  let node = null;
  for (const id of ids) {
    node = current.find(n => n.id === id);
    if (!node) return null;
    current = node.children || [];
  }
  return node;
}

export default function LocalStepper({ label, value, onChange, exclude }) {
  // path = array de ids selecionados em cada nível, ex: ['MARICA', 'SALA', 'SALA_E1']
  const [path, setPath] = useState([]);
  const [hoverId, setHoverId] = useState(null);

  // Sincroniza path quando value muda externamente (ex: ao limpar)
  useEffect(() => {
    if (!value) {
      setPath([]);
    } else {
      const p = buildPath(value, HIERARCHY);
      if (p) setPath(p);
    }
  }, [value]);

  // Nó atual no caminho
  const currentNode = path.length > 0 ? getNodeAt(path, HIERARCHY) : null;
  const currentChildren = currentNode?.children || HIERARCHY;
  const hasChildren = currentChildren.length > 0;

  // Se o nó selecionado não tem filhos → é um local final
  const isFinal = currentNode && (!currentNode.children || currentNode.children.length === 0);

  function selectLevel(id, depth) {
    const newPath = [...path.slice(0, depth), id];
    const node = getNodeAt(newPath, HIERARCHY);
    setPath(newPath);

    // Se não tem filhos, é seleção final
    if (!node?.children || node.children.length === 0) {
      onChange(id);
    } else {
      // Ainda tem filhos, limpa o value (nenhum local final selecionado)
      onChange('');
    }
  }

  function goBack(depth) {
    const newPath = path.slice(0, depth);
    setPath(newPath);
    onChange('');
  }

  function clearAll() {
    setPath([]);
    onChange('');
  }

  // Filtra opções excluindo o local proibido e toda a sua subárvore
  function isExcluded(nodeId) {
    if (!exclude) return false;
    if (nodeId === exclude) return true;
    // Verifica se exclude está dentro deste nó
    const excludePath = buildPath(exclude, HIERARCHY);
    return excludePath ? excludePath.includes(nodeId) : false;
  }

  const finalInfo = value ? LOCAIS_MAP[value] : null;

  return (
    <div style={ss.wrapper}>
      {label && <label style={ss.label}>{label}</label>}

      <div style={ss.stepsRow}>
        {/* Breadcrumb dos níveis já selecionados */}
        {path.length > 0 && (
          <div style={ss.stepChip}>
            <button style={ss.clearBtn} onClick={clearAll} title="Limpar seleção">✕</button>
            {path.map((id, depth) => {
              const node = getNodeAt(path.slice(0, depth + 1), HIERARCHY);
              const isLast = depth === path.length - 1;
              return (
                <React.Fragment key={id}>
                  {depth > 0 && <span style={ss.chipArrow}>›</span>}
                  <button
                    style={{
                      ...ss.chipBtn,
                      borderColor: isLast ? '#185FA5' : '#ccc',
                      color: isLast ? '#185FA5' : 'var(--color-text-secondary, #666)',
                      background: isLast ? '#EAF2FC' : 'transparent',
                    }}
                    onClick={() => goBack(depth)}
                    title={`Voltar para ${node?.label}`}
                  >
                    <span>{node?.icon}</span>
                    <span>{node?.label}</span>
                    {!isLast && <span style={{ fontSize: 10, opacity: 0.6 }}>◂</span>}
                  </button>
                </React.Fragment>
              );
            })}
          </div>
        )}

        {/* Grid de opções do nível atual (somente se não é final) */}
        {!isFinal && (
          <div style={ss.optGrid}>
            {(path.length === 0 ? HIERARCHY : currentNode?.children || [])
              .filter(n => !isExcluded(n.id))
              .map(node => (
                <button
                  key={node.id}
                  style={{
                    ...ss.optBtn,
                    ...(hoverId === node.id ? ss.optBtnHover : {}),
                    opacity: isExcluded(node.id) ? 0.35 : 1,
                  }}
                  onMouseEnter={() => setHoverId(node.id)}
                  onMouseLeave={() => setHoverId(null)}
                  onClick={() => selectLevel(node.id, path.length)}
                  disabled={isExcluded(node.id)}
                >
                  <span>{node.icon}</span>
                  <span>{node.label}</span>
                  {node.children && node.children.length > 0 && (
                    <span style={{ fontSize: 10, opacity: 0.55 }}>›</span>
                  )}
                </button>
              ))
            }
          </div>
        )}

        {/* Confirmação quando local final selecionado */}
        {isFinal && finalInfo && (
          <div style={ss.selectedDisplay}>
            <span>{finalInfo.icon}</span>
            <span>{finalInfo.fullLabel}</span>
            <button style={ss.clearBtn} onClick={clearAll} title="Alterar local">✕</button>
          </div>
        )}

        {/* Placeholder quando nada selecionado */}
        {path.length === 0 && (
          <span style={{ fontSize: 12, color: 'var(--color-text-secondary, #aaa)', paddingTop: 2 }}>
            Selecione acima ↑
          </span>
        )}
      </div>
    </div>
  );
}