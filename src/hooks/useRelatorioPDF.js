// useRelatorioPDF.js
// Gera um PDF profissional a partir dos dados filtrados de Movimentações.
// Dependências: jsPDF  →  npm install jspdf
//               jspdf-autotable  →  npm install jspdf-autotable

import { useCallback } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// ── Paleta ──────────────────────────────────────────────────────────────────
const C = {
  primary:    [0,   147, 115],  // #009373 verde principal
  accent:     [112, 173, 71],   // #70AD47 verde secundário
  danger:     [220, 53,  69],
  success:    [34,  197, 94],
  info:       [14,  165, 210],
  purple:     [139, 92,  246],
  warning:    [234, 179, 8],
  white:      [255, 255, 255],
  lightGray:  [245, 247, 250],
  midGray:    [203, 213, 225],
  darkGray:   [71,  85,  105],
  black:      [15,  23,  42],
};

const STATUS_COLOR = {
  PERDIDO:        C.danger,
  SOBRA:          C.success,
  TROCA:          C.info,
  'NÃO ASSOCIOU': C.purple,
  PENDENTE:       C.warning,
};

// ── Utilitários ─────────────────────────────────────────────────────────────

function formatDate(val) {
  if (!val) return '—';
  if (typeof val === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(val)) return val;
  const d = new Date(val);
  if (isNaN(d)) return String(val);
  return d.toLocaleDateString('pt-BR');
}

function ptBR(n) {
  return Number(n).toLocaleString('pt-BR');
}

function pct(part, total) {
  if (!total) return '0%';
  return ((part / total) * 100).toFixed(1) + '%';
}

// ── Mini gráfico de barras horizontal (canvas → dataURL) ────────────────────

function buildBarChart(metricas) {
  const canvas = document.createElement('canvas');
  canvas.width  = 520;
  canvas.height = 220;
  const ctx = canvas.getContext('2d');

  const items = [
    { label: 'Perdidos',      value: metricas.perdidos,    color: `rgb(${C.danger.join(',')})` },
    { label: 'Sobras',        value: metricas.sobras,      color: `rgb(${C.success.join(',')})` },
    { label: 'Trocas',        value: metricas.trocas,      color: `rgb(${C.info.join(',')})` },
    { label: 'Não associou',  value: metricas.naoAssociou, color: `rgb(${C.purple.join(',')})` },
    { label: 'Pendentes',     value: metricas.pendentes,   color: `rgb(${C.warning.join(',')})` },
  ].filter(i => i.value > 0);

  if (!items.length) return null;

  const maxVal = Math.max(...items.map(i => i.value));
  const rowH   = 36;
  const labelW = 120;
  const barMaxW = 300;
  const padTop  = 10;

  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  items.forEach((item, idx) => {
    const y      = padTop + idx * rowH;
    const barW   = (item.value / maxVal) * barMaxW;
    const barH   = 22;
    const barY   = y + (rowH - barH) / 2;

    // label
    ctx.fillStyle = `rgb(${C.darkGray.join(',')})`;
    ctx.font      = '13px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(item.label, labelW - 8, barY + 15);

    // barra
    ctx.fillStyle = item.color;
    const radius  = 4;
    ctx.beginPath();
    ctx.moveTo(labelW + radius, barY);
    ctx.lineTo(labelW + barW - radius, barY);
    ctx.quadraticCurveTo(labelW + barW, barY, labelW + barW, barY + radius);
    ctx.lineTo(labelW + barW, barY + barH - radius);
    ctx.quadraticCurveTo(labelW + barW, barY + barH, labelW + barW - radius, barY + barH);
    ctx.lineTo(labelW + radius, barY + barH);
    ctx.quadraticCurveTo(labelW, barY + barH, labelW, barY + barH - radius);
    ctx.lineTo(labelW, barY + radius);
    ctx.quadraticCurveTo(labelW, barY, labelW + radius, barY);
    ctx.closePath();
    ctx.fill();

    // valor
    ctx.fillStyle = `rgb(${C.black.join(',')})`;
    ctx.font      = 'bold 12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${ptBR(item.value)}`, labelW + barW + 8, barY + 15);
  });

  return canvas.toDataURL('image/png');
}

// ── Logo (base64 embutida) ───────────────────────────────────────────────────
const LOGO_BASE64 = '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bnMjIj4KICA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIgogICAgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iCiAgICB4bWxuczpzdEV2dD0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL3NUeXBlL1Jlc291cmNlRXZlbnQjIgogICAgeG1sbnM6ZGM9Imh0dHA6Ly9wdXJsLm9yZy9kYy9lbGVtZW50cy8xLjEvIgogICAgeG1sbnM6R0lNUD0iaHR0cDovL3d3dy5naW1wLm9yZy94bXAvIgogICAgeG1sbnM6dGlmZj0iaHR0cDovL25zLmFkb2JlLmNvbS90aWZmLzEuMC8iCiAgICB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iCiAgIHhtcE1NOkRvY3VtZW50SUQ9ImdpbXA6ZG9jaWQ6Z2ltcDo0YmE2ZDQ3MC02ODkxLTRkNWMtODU5OC0wNDJmNDYyN2MwZDkiCiAgIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6ZjRjZGFkNzEtMWJlMy00NTAzLThlMDUtZmMyZjBjMTk3MWZhIgogICB4bXBNTTpPcmlnaW5hbERvY3VtZW50SUQ9InhtcC5kaWQ6YzQzZDM4OTItYjhhZS00OTQzLThiYzgtMjkxMzBjYmJkODNjIgogICBkYzpGb3JtYXQ9ImltYWdlL3BuZyIKICAgR0lNUDpBUEk9IjIuMCIKICAgR0lNUDpQbGF0Zm9ybT0iV2luZG93cyIKICAgR0lNUDpUaW1lU3RhbXA9IjE2NDk2ODY5NzgwMDY3OTAiCiAgIEdJTVA6VmVyc2lvbj0iMi4xMC4zMCIKICAgdGlmZjpPcmllbnRhdGlvbj0iMSIKICAgeG1wOkNyZWF0b3JUb29sPSJHSU1QIDIuMTAiPgogICA8eG1wTU06SGlzdG9yeT4KICAgIDxyZGY6U2VxPgogICAgIDxyZGY6bGkKICAgICAgc3RFdnQ6YWN0aW9uPSJzYXZlZCIKICAgICAgc3RFdnQ6Y2hhbmdlZD0iLyIKICAgICAgc3RFdnQ6aW5zdGFuY2VJRD0ieG1wLmlpZDo4M2EwN2JkNy1kZGFjLTQ1YTgtOGJkMi0yNGY5N2MwNDY1NmEiCiAgICAgIHN0RXZ0OnNvZnR3YXJlQWdlbnQ9IkdpbXAgMi4xMCAoV2luZG93cykiCiAgICAgIHN0RXZ0OndoZW49IjIwMjItMDQtMTFUMTE6MjI6NTgiLz4KICAgIDwvcmRmOlNlcT4KICAgPC94bXBNTTpIaXN0b3J5PgogIDwvcmRmOkRlc2NyaXB0aW9uPgogPC9yZGY6UkRGPgo8L3g6eG1wbWV0YT4KICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgIAo8P3hwYWNrZXQgZW5kPSJ3Ij8+QhgeWQAAAAZiS0dEAP8A/wD/oL2nkwAAAAlwSFlzAAALEwAACxMBAJqcGAAAAAd0SU1FB+YECw4WOWdLYysAACAASURBVHja7Z13mJ1Vtf8/eyaTXiCkQkJCSOhVQBEQBVFBsSvYUezXrveqP/Veveq1172KggX0gkoTwQsoAgoC0ntJIAQC6b0nk0kyM+v3x9rHTGJCppw57773fD/Pc56xZJL37LLe7157FRBCCCGEEEIIIYQQQgghhBBCCCGEEEIIIYQQQnQkaQi6h5mNBD4PHAdYgR+1Hfgq8LeUUptmTgghhBBlpZ+GoNvsCZwAvLDgz7kaMIlaIYQQQpSdBg1Bj4TtqADPOR9YpekSQgghhIStiC5s5+BeWyGEEEIICVuxLWbWkIXt8ACPOxdYo1kTQgghhISt2BHDgL2AxgDPOg9YpykTQgghhISt2BG7AxMCOONaYGFKaYumTAghhBAStmJHjAwibJcBizVdQgghhJCwFc8lbPcK8JxL8kcIIYQQQsJWbEtOHBsH7CFhK4QQQgghYRuZgcDexGhusRhYoSkTQgghhISt2BFDgCkBnnMjMD+ltFlTJoQQQggJW7EzYbtv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';

// ── Hook principal ───────────────────────────────────────────────────────────

export function useRelatorioPDF() {

  const gerarPDF = useCallback(({ filtrados, metricas, filtrosAtivos, nomeArquivo }) => {

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const PW  = doc.internal.pageSize.getWidth();   // 210
    const PH  = doc.internal.pageSize.getHeight();  // 297
    const ML  = 14;   // margem esquerda
    const MR  = 14;   // margem direita
    const CW  = PW - ML - MR;

    let y = 0; // cursor vertical

    // ── Função: nova página ─────────────────────────────────────────────────
    function novaPagina() {
      doc.addPage();
      desenharRodape();
      y = 20;
    }

    function checkarEspaco(needed) {
      if (y + needed > PH - 20) novaPagina();
    }

    // ── Cabeçalho ──────────────────────────────────────────────────────────
    function desenharCabecalho() {
      // Faixa superior
      doc.setFillColor(...C.primary);
      doc.rect(0, 0, PW, 48, 'F');

      // Faixa inferior do cabeçalho (acento verde secundário)
      doc.setFillColor(...C.accent);
      doc.rect(0, 44, PW, 4, 'F');

      // Logo — canto direito
      try {
        doc.addImage(LOGO_BASE64, 'PNG', PW - MR - 34, 4, 34, 34);
      } catch (_) { /* logo opcional */ }

      // Título
      doc.setTextColor(...C.white);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(17);
      doc.text('Relatório de Movimentações', ML, 18);

      // Subtítulo / filtros ativos
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(200, 240, 230);
      const subText = filtrosAtivos.length
        ? `Filtros: ${filtrosAtivos.join('  •  ')}`
        : 'Todos os registros';
      doc.text(subText, ML, 28);

      // Data de geração
      const agora = new Date().toLocaleString('pt-BR');
      doc.setFontSize(7);
      doc.setTextColor(160, 220, 200);
      doc.text(`Gerado em ${agora}`, ML, 37);

      y = 56;
    }

    // ── Rodapé ─────────────────────────────────────────────────────────────
    function desenharRodape() {
      const pageNum = doc.internal.getCurrentPageInfo().pageNumber;
      const total   = doc.internal.pages.length - 1;

      doc.setFillColor(...C.lightGray);
      doc.rect(0, PH - 12, PW, 12, 'F');

      doc.setDrawColor(...C.midGray);
      doc.setLineWidth(0.3);
      doc.line(0, PH - 12, PW, PH - 12);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(...C.darkGray);
      doc.text('Relatório de Movimentações — Gerado automaticamente', ML, PH - 4.5);
      doc.text(`Página ${pageNum}`, PW - MR, PH - 4.5, { align: 'right' });
    }

    // ── Cards de métricas ──────────────────────────────────────────────────
    function desenharMetricas() {
      checkarEspaco(38);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...C.primary);
      doc.text('Resumo do Período', ML, y);
      y += 5;

      // linha decorativa
      doc.setDrawColor(...C.accent);
      doc.setLineWidth(0.8);
      doc.line(ML, y, ML + 38, y);
      y += 5;

      const cards = [
        { label: 'Total',        value: metricas.total,       pct: '100%',                             cor: C.primary  },
        { label: 'Perdidos',     value: metricas.perdidos,    pct: pct(metricas.perdidos,    metricas.total), cor: C.danger   },
        { label: 'Sobras',       value: metricas.sobras,      pct: pct(metricas.sobras,      metricas.total), cor: C.success  },
        { label: 'Trocas',       value: metricas.trocas,      pct: pct(metricas.trocas,      metricas.total), cor: C.info     },
        { label: 'Não Associou', value: metricas.naoAssociou, pct: pct(metricas.naoAssociou, metricas.total), cor: C.purple   },
        { label: 'Pendentes',    value: metricas.pendentes,   pct: pct(metricas.pendentes,   metricas.total), cor: C.warning  },
      ];

      const cols      = 3;
      const cardW     = (CW - (cols - 1) * 4) / cols;
      const cardH     = 22;
      const cardGapX  = 4;
      const cardGapY  = 4;

      cards.forEach((card, idx) => {
        const col = idx % cols;
        const row = Math.floor(idx / cols);
        const cx  = ML + col * (cardW + cardGapX);
        const cy  = y  + row * (cardH + cardGapY);

        // sombra simulada
        doc.setFillColor(220, 225, 235);
        doc.roundedRect(cx + 0.7, cy + 0.7, cardW, cardH, 3, 3, 'F');

        // fundo
        doc.setFillColor(...C.white);
        doc.roundedRect(cx, cy, cardW, cardH, 3, 3, 'F');

        // borda colorida superior
        doc.setFillColor(...card.cor);
        doc.roundedRect(cx, cy, cardW, 2.5, 1, 1, 'F');

        // label
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(...C.darkGray);
        doc.text(card.label.toUpperCase(), cx + 5, cy + 8);

        // valor
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(...C.black);
        doc.text(ptBR(card.value), cx + 5, cy + 17);

        // percentual
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(...C.darkGray);
        doc.text(card.pct, cx + cardW - 5, cy + 17, { align: 'right' });
      });

      const rows = Math.ceil(cards.length / cols);
      y += rows * (cardH + cardGapY) + 8;
    }

    // ── Gráfico de barras ──────────────────────────────────────────────────
    function desenharGrafico() {
      const imgData = buildBarChart(metricas);
      if (!imgData) return;

      checkarEspaco(65);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...C.primary);
      doc.text('Distribuição por Status', ML, y);
      y += 5;

      doc.setDrawColor(...C.accent);
      doc.setLineWidth(0.8);
      doc.line(ML, y, ML + 46, y);
      y += 4;

      // fundo do gráfico
      doc.setFillColor(...C.lightGray);
      doc.roundedRect(ML, y, CW, 52, 3, 3, 'F');

      doc.addImage(imgData, 'PNG', ML + 4, y + 2, CW - 8, 48);
      y += 58;
    }

    // ── Ranking de técnicos ────────────────────────────────────────────────
    function desenharRankingTecnicos() {
      const mapa = {};
      filtrados.forEach(m => {
        const tec = m['TÉCNICO'] || m.TECNICO || 'Sem técnico';
        if (!mapa[tec]) mapa[tec] = { total: 0, perdidos: 0, sobras: 0, trocas: 0, naoAssociou: 0 };
        mapa[tec].total++;
        if (m.STATUS === 'PERDIDO')        mapa[tec].perdidos++;
        if (m.STATUS === 'SOBRA')          mapa[tec].sobras++;
        if (m.STATUS === 'TROCA')          mapa[tec].trocas++;
        if (m.STATUS === 'NÃO ASSOCIOU')   mapa[tec].naoAssociou++;
      });

      const ranking = Object.entries(mapa)
        .map(([nome, v]) => ({ nome, ...v }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 15);

      if (!ranking.length) return;

      checkarEspaco(20);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...C.primary);
      doc.text('Ranking de Técnicos', ML, y);
      y += 5;

      doc.setDrawColor(...C.accent);
      doc.setLineWidth(0.8);
      doc.line(ML, y, ML + 38, y);
      y += 4;

      autoTable(doc, {
        startY: y,
        margin: { left: ML, right: MR },
        tableWidth: 'auto',
        head: [['#', 'Técnico', 'Total', 'Perdidos', 'Sobras', 'Trocas', 'Não Assoc.']],
        body: ranking.map((r, i) => [
          i + 1,
          r.nome,
          ptBR(r.total),
          ptBR(r.perdidos),
          ptBR(r.sobras),
          ptBR(r.trocas),
          ptBR(r.naoAssociou),
        ]),
        headStyles: {
          fillColor:   C.primary,
          textColor:   C.white,
          fontStyle:   'bold',
          fontSize:    7.5,
          halign:      'center',
        },
        bodyStyles: {
          fontSize:    7.5,
          textColor:   C.black,
          cellPadding: 2.5,
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 8  },
          1: { cellWidth: 'auto' },
          2: { halign: 'center', cellWidth: 18 },
          3: { halign: 'center', cellWidth: 22, textColor: C.danger  },
          4: { halign: 'center', cellWidth: 18, textColor: C.success },
          5: { halign: 'center', cellWidth: 18, textColor: C.info    },
          6: { halign: 'center', cellWidth: 24, textColor: C.purple  },
        },
        alternateRowStyles: { fillColor: C.lightGray },
        didDrawPage: (data) => { desenharRodape(); y = data.cursor?.y ?? y; },
      });

      y = (doc.lastAutoTable?.finalY ?? y) + 12;
    }

    // ── Tabela de movimentações ────────────────────────────────────────────
    function desenharTabela() {
      checkarEspaco(20);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...C.primary);
      doc.text('Detalhamento das Movimentações', ML, y);
      y += 5;

      doc.setDrawColor(...C.accent);
      doc.setLineWidth(0.8);
      doc.line(ML, y, ML + 60, y);
      y += 4;

      const rows = filtrados.map(m => [
        formatDate(m.DATA),
        m['TÉCNICO'] || m.TECNICO || '—',
        m.PLACA     || '—',
        m.PRODUTO   || '—',
        m.QUANTIDADE != null ? String(m.QUANTIDADE) : '—',
        m.STATUS    || '—',
        m['OBSERVAÇÕES'] || m.OBSERVACOES || '—',
      ]);

      autoTable(doc, {
        startY: y,
        margin: { left: ML, right: MR },
        head: [['Data', 'Técnico', 'Placa', 'Produto', 'Qtd', 'Status', 'Observações']],
        body: rows,
        headStyles: {
          fillColor:  C.primary,
          textColor:  C.white,
          fontStyle:  'bold',
          fontSize:   7.5,
          halign:     'center',
        },
        bodyStyles: {
          fontSize:    7,
          textColor:   C.black,
          cellPadding: 2.5,
          overflow:    'ellipsize',
        },
        columnStyles: {
          0: { cellWidth: 20, halign: 'center' },
          1: { cellWidth: 30 },
          2: { cellWidth: 20, halign: 'center', font: 'courier' },
          3: { cellWidth: 45 },
          4: { cellWidth: 10, halign: 'center' },
          5: { cellWidth: 22, halign: 'center' },
          6: { cellWidth: 'auto' },
        },
        alternateRowStyles: { fillColor: C.lightGray },
        // colorir célula de status
        didParseCell(data) {
          if (data.section === 'body' && data.column.index === 5) {
            const status = data.cell.raw;
            const cor    = STATUS_COLOR[status];
            if (cor) {
              data.cell.styles.textColor   = cor;
              data.cell.styles.fontStyle   = 'bold';
            }
          }
        },
        didDrawPage: (data) => {
          desenharRodape();
          y = data.cursor?.y ?? y;
        },
      });

      y = (doc.lastAutoTable?.finalY ?? y) + 8;
    }

    // ── Montar documento ───────────────────────────────────────────────────
    desenharCabecalho();
    desenharRodape();
    desenharMetricas();
    desenharGrafico();
    desenharRankingTecnicos();
    desenharTabela();

    // ── Salvar ─────────────────────────────────────────────────────────────
    const fileName = nomeArquivo || `relatorio_movimentacoes_${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(fileName);

  }, []);

  return { gerarPDF };
}