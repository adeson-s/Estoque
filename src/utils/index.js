// ─── Exportações de Utilitários ───────────────────────────────────────────────
// Use este arquivo para importar utilitários de forma centralizada

export { default as dateUtils } from './date';

// Utilitários de locais
export {
  default as localUtils,
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
} from './localUtils';

// Futuros utilitários:
// export { default as stringUtils } from './stringUtils';
// export { default as validationUtils } from './validationUtils';
