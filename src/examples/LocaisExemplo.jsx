import React from 'react';
import {
  LocalStepper,
  LocalMap,
  LocalBadge,
} from '../components';
import {
  useLocais,
  useLocal,
  useTodosLocais,
  useLocaisPorCidade,
} from '../hooks';
import {
  formatarLocal,
  getCaminhoCompleto,
  buscarLocais,
  isMarica,
} from '../utils';

/**
 * Exemplos de uso dos componentes e hooks de locais
 * Copie e adapte conforme necessário
 */

// ─── Exemplo 1: Usando LocalStepper em um formulário ─────────────────────────

function FormularioTransferencia() {
  const [origem, setOrigem] = React.useState('');
  const [destino, setDestino] = React.useState('');

  return (
    <div style={{ display: 'flex', gap: 20, padding: 20 }}>
      <LocalStepper
        label="Origem"
        value={origem}
        onChange={setOrigem}
        exclude={destino}
      />
      
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M5 12h14M13 6l6 6-6 6" stroke="#185FA5" strokeWidth="2"/>
        </svg>
      </div>
      
      <LocalStepper
        label="Destino"
        value={destino}
        onChange={setDestino}
        exclude={origem}
      />
    </div>
  );
}

// ─── Exemplo 2: Usando o hook useLocais ──────────────────────────────────────

function ComponenteComHook() {
  const {
    value,
    breadcrumb,
    cidades,
    areas,
    setCidade,
    setArea,
    isComplete,
  } = useLocais({ initialValue: '' });

  return (
    <div style={{ padding: 20 }}>
      <h3>Seleção Manual com Hook</h3>
      
      {/* Renderizar selects manualmente */}
      <select value={value.cidadeId} onChange={e => setCidade(e.target.value)}>
        <option value="">Cidade...</option>
        {cidades.map(c => (
          <option key={c.id} value={c.id}>{c.label}</option>
        ))}
      </select>
      
      <select value={value.areaId} onChange={e => setArea(e.target.value)}>
        <option value="">Área...</option>
        {areas.map(a => (
          <option key={a.id} value={a.id}>{a.label}</option>
        ))}
      </select>
      
      {/* Breadcrumb */}
      <div style={{ marginTop: 10 }}>
        {breadcrumb.map((item, idx) => (
          <span key={item.id}>
            {idx > 0 && ' / '}
            {item.icon} {item.label}
          </span>
        ))}
      </div>
      
      <p>Completo: {isComplete ? 'Sim' : 'Não'}</p>
    </div>
  );
}

// ─── Exemplo 3: Listando locais com filtros ──────────────────────────────────

function ListaLocaisFiltrados() {
  const todosLocais = useTodosLocais();
  const locaisMarica = useLocaisPorCidade('MARICA');
  const [busca, setBusca] = React.useState('');

  const filtrados = React.useMemo(() => {
    if (!busca) return todosLocais;
    return buscarLocais(busca);
  }, [busca, todosLocais]);

  return (
    <div style={{ padding: 20 }}>
      <input
        type="text"
        placeholder="Buscar local..."
        value={busca}
        onChange={e => setBusca(e.target.value)}
        style={{ padding: 8, borderRadius: 6, border: '1px solid #ddd', width: '100%' }}
      />
      
      <div style={{ marginTop: 16, display: 'grid', gap: 8 }}>
        <h4>Todos ({todosLocais.length})</h4>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {todosLocais.slice(0, 10).map(local => (
            <LocalBadge key={local.id} localId={local.id} />
          ))}
        </div>
        
        <h4 style={{ marginTop: 16 }}>Maricá ({locaisMarica.length})</h4>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {locaisMarica.slice(0, 10).map(local => (
            <LocalBadge key={local.id} localId={local.id} showCidade />
          ))}
        </div>
        
        <h4 style={{ marginTop: 16 }}>Filtrados ({filtrados.length})</h4>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {filtrados.slice(0, 10).map(local => (
            <LocalBadge key={local.id} localId={local.id} compact />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Exemplo 4: Mapa de Locais ───────────────────────────────────────────────

function PaginaMapaLocais() {
  return (
    <div style={{ padding: 20 }}>
      <h2>Mapa de Locais</h2>
      <LocalMap />
      
      <h3 style={{ marginTop: 24 }}>Versão Compacta</h3>
      <LocalMap compact />
    </div>
  );
}

// ─── Exemplo 5: Badges com diferentes variantes ──────────────────────────────

function GaleriaBadges() {
  return (
    <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h3>Badges de Locais</h3>
      
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <LocalBadge localId="SALA_E1_P1" />
        <LocalBadge localId="GALPAO_E1_P1" />
        <LocalBadge localId="RUA_A_P1" />
        <LocalBadge localId="AR_P1" />
        <LocalBadge localId="ITABORAI_P1" />
      </div>
      
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <LocalBadge localId="SALA_E1_P1" showCidade showArea />
        <LocalBadge localId="GALPAO_E1_P1" showCidade showArea />
      </div>
      
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <LocalBadge localId="SALA_E1_P1" compact />
        <LocalBadge localId="GALPAO_E1_P1" compact />
        <LocalBadge localId="RUA_A_P1" compact />
      </div>
      
      <h4 style={{ marginTop: 16 }}>Variantes Específicas</h4>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <LocalBadgeSala localId="SALA_E1_P1" />
        <LocalBadgeGalpao localId="GALPAO_E1_P1" />
        <LocalBadgeRuas localId="RUA_A_P1" />
        <LocalBadgeRestrita localId="AR_P1" />
        <LocalBadgeExterno localId="ITABORAI_P1" />
      </div>
    </div>
  );
}

// ─── Exemplo 6: Integrando com Transferência Inteira ─────────────────────────

function TransferenciaComBadges({ origem, destino }) {
  return (
    <div style={{ padding: '12px', background: '#f5f5f5', borderRadius: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <LocalBadge localId={origem} showCidade showArea />
        <span>→</span>
        <LocalBadge localId={destino} showCidade showArea />
      </div>
      
      {origem && destino && !isMarica(origem) && isMarica(destino) && (
        <div style={{ 
          marginTop: 8, 
          padding: 8, 
          background: '#185FA510', 
          borderRadius: 6,
          fontSize: 12,
          color: '#185FA5',
        }}>
          ℹ️ Transferência externa para Maricá
        </div>
      )}
    </div>
  );
}

// ─── Exemplo 7: Validação de Locais ──────────────────────────────────────────

function ValidadorLocais() {
  const [input, setInput] = React.useState('');
  const local = useLocal(input);

  return (
    <div style={{ padding: 20 }}>
      <h3>Validador de Local</h3>
      <input
        type="text"
        placeholder="Digite um ID (ex: SALA_E1_P1)"
        value={input}
        onChange={e => setInput(e.target.value.toUpperCase())}
        style={{ padding: 8, borderRadius: 6, border: '1px solid #ddd' }}
      />
      
      {local ? (
        <div style={{ marginTop: 12, padding: 12, background: '#1D9E7518', borderRadius: 8 }}>
          <p style={{ margin: 0, color: '#0F6E56' }}>
            ✓ Local válido
          </p>
          <p style={{ margin: '4px 0 0', fontSize: 13 }}>
            {local.icon} {local.label}
          </p>
          <p style={{ margin: '4px 0 0', fontSize: 11, color: '#666' }}>
            {getCaminhoCompleto(input)}
          </p>
        </div>
      ) : input ? (
        <div style={{ marginTop: 12, padding: 12, background: '#E24B4A18', borderRadius: 8 }}>
          <p style={{ margin: 0, color: '#A32D2D' }}>
            ✗ Local inválido
          </p>
        </div>
      ) : null}
    </div>
  );
}

// ─── Exportações ──────────────────────────────────────────────────────────────

export {
  FormularioTransferencia,
  ComponenteComHook,
  ListaLocaisFiltrados,
  PaginaMapaLocais,
  GaleriaBadges,
  TransferenciaComBadges,
  ValidadorLocais,
};

export default {
  FormularioTransferencia,
  ComponenteComHook,
  ListaLocaisFiltrados,
  PaginaMapaLocais,
  GaleriaBadges,
  TransferenciaComBadges,
  ValidadorLocais,
};
