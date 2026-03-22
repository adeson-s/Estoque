
export const parseDate = (data) => {
 if (!data) return null;

  // 🧮 Número do Sheets
  if (!isNaN(data)) {
    const utc = new Date((Number(data) - 25569) * 86400 * 1000);
    return new Date(
      utc.getUTCFullYear(),
      utc.getUTCMonth(),
      utc.getUTCDate()
    );
  }

  // 📄 Formato BR (dd/MM/yyyy)
  if (typeof data === 'string' && data.includes('/')) {
    const [dia, mes, ano] = data.split('/').map(Number);
    return new Date(ano, mes - 1, dia);
  }

  // 🚨 FORMATO ISO (yyyy-MM-dd) → CORREÇÃO AQUI
  if (typeof data === 'string' && data.includes('-')) {
    const [ano, mes, dia] = data.split('-').map(Number);
    return new Date(ano, mes - 1, dia); // 👈 FORÇA LOCAL (SEM UTC)
  }

  // fallback
  const d = new Date(data);
  return isNaN(d)
    ? null
    : new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
};