// src/data/localHierarchy.js
// Hierarquia completa de locais de estoque

export const HIERARCHY = [
  {
    id: 'MARICA',
    label: 'Maricá',
    icon: '🏠',
    tipo: 'cidade',
    children: [
      {
        id: 'SALA',
        label: 'Sala',
        icon: '🗄️',
        tipo: 'ambiente',
        children: [1, 2,].map(e => ({
          id: `SALA_E${e}`,
          label: `Estante ${e}`,
          icon: '📦',
          tipo: 'estante',
          children: [1, 2, 3, 4].map(p => ({
            id: `SALA_E${e}_P${p}`,
            label: `Prateleira ${p}`,
            icon: '▤',
            tipo: 'prateleira',
            children: [],
          })),
        })),
      },
      {
        id: 'GALPAO',
        label: 'Galpão',
        icon: '🏗️',
        tipo: 'ambiente',
        children: [
          // Estantes 1–4
          ...[1, 2, 3, 4].map(e => ({
            id: `GALPAO_E${e}`,
            label: `Estante ${e}`,
            icon: '📦',
            tipo: 'estante',
            children: [1, 2, 3, 4].map(p => ({
              id: `GALPAO_E${e}_P${p}`,
              label: `Prateleira ${p}`,
              icon: '▤',
              tipo: 'prateleira',
              children: [],
            })),
          })),
          // Ruas 1–3
          ...[1, 2, 3].map(r => ({
            id: `GALPAO_RUA${r}`,
            label: `Rua ${r}`,
            icon: '🛣️',
            tipo: 'rua',
            children: [1, 2, 3, 4].map(p => ({
              id: `GALPAO_RUA${r}_PAL${p}`,
              label: `Palete ${p}`,
              icon: '📋',
              tipo: 'palete',
              children: [],
            })),
          })),
          // Área Restrita
          {
            id: 'GALPAO_RESTRITA',
            label: 'Área Restrita',
            icon: '🔒',
            tipo: 'ambiente',
            children: [
              ...[1, 2].map(e => ({
                id: `GALPAO_RESTRITA_E${e}`,
                label: `Estante ${e}`,
                icon: '📦',
                tipo: 'estante',
                children: [1, 2, 3, 4].map(p => ({
                  id: `GALPAO_RESTRITA_E${e}_P${p}`,
                  label: `Prateleira ${p}`,
                  icon: '▤',
                  tipo: 'prateleira',
                  children: [],
                })),
              })),
              ...['A', 'B'].map(r => ({
                id: `GALPAO_RESTRITA_RUA${r}`,
                label: `Rua ${r}`,
                icon: '🛣️',
                tipo: 'rua',
                children: [1, 2].map(p => ({
                  id: `GALPAO_RESTRITA_RUA${r}_PAL${p}`,
                  label: `Rua ${r}${p}`,
                  icon: '📋',
                  tipo: 'palete',
                  children: [],
                })),
              })),
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'ITABORAI',
    label: 'Itaboraí',
    icon: '🏭',
    tipo: 'cidade',
    children: [],
  },
  {
    id: 'SANTA_ROSA',
    label: 'Santa Rosa',
    icon: '🏭',
    tipo: 'cidade',
    children: [],
  },
  {
    id: 'PIRATININGA',
    label: 'Piratininga',
    icon: '🏭',
    tipo: 'cidade',
    children: [],
  },
];

// ── Mapa plano: id → { id, label, icon, tipo, breadcrumb } ─────────────────

function flatten(nodes, path = []) {
  const map = {};
  for (const node of nodes) {
    const breadcrumb = [...path, node.label];
    map[node.id] = {
      id: node.id,
      label: node.label,
      icon: node.icon,
      tipo: node.tipo,
      breadcrumb,
      shortLabel: breadcrumb.slice(-2).join(' › '),
      fullLabel: breadcrumb.join(' › '),
      hasChildren: node.children && node.children.length > 0,
    };
    if (node.children && node.children.length > 0) {
      Object.assign(map, flatten(node.children, breadcrumb));
    }
  }
  return map;
}

export const LOCAIS_MAP = flatten(HIERARCHY);

// Compatibilidade com código anterior
export const LOCAIS_LEGACY = LOCAIS_MAP;
export const GRUPOS_LABEL_LEGACY = {};