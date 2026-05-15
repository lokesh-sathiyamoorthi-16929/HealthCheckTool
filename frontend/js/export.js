/**
 * export.js — Export to PDF, HTML, and CSV/Excel
 * Uses jsPDF + html2canvas (loaded via CDN) for PDF
 */

const ExportUtils = {

  /* ===== CSV Export ===== */
  exportCSV(assessmentData, criteriaByComponent) {
    const rows = [
      ['Customer', 'Component', 'Section', 'Criteria ID', 'Criteria Text', 'Type', 'Status', 'HC Weight', 'PU Weight', 'Notes', 'Recommendation']
    ];

    const COMPONENTS = ['adaudit', 'dataSecurity', 'eventlog', 'log360', 'log360cloud'];
    const NAMES = {
      adaudit:      'ADAudit Plus',
      dataSecurity: 'DataSecurity Plus',
      eventlog:     'EventLog Analyzer',
      log360:       'Log360',
      log360cloud:  'Log360 Cloud'
    };

    COMPONENTS.forEach(comp => {
      const template = criteriaByComponent[comp];
      if (!template) return;
      const compData = (assessmentData.components || {})[comp] || {};
      const statuses = compData.criteria_statuses || {};
      const notes    = compData.criteria_notes    || {};
      const customRecs = {};

      template.sections.forEach(section => {
        section.criteria.forEach(crit => {
          const status = statuses[crit.id] || 'not_configured';
          const statusLabel = {
            configured:     '✅ Configured',
            partial:        '⚠️ Partial',
            not_configured: '❌ Not Configured',
            na:             '➖ N/A'
          }[status] || status;

          rows.push([
            assessmentData.customer_name,
            NAMES[comp],
            section.name.replace(/[\u{1F000}-\u{EFFFF}]/gu, '').trim(),
            crit.id,
            crit.text,
            crit.type,
            statusLabel,
            crit.type.includes('HC') ? '1' : '0',
            crit.type.includes('PU') ? '1' : '0',
            (notes[crit.id] || '').replace(/[\n\r]/g, ' '),
            (crit.recommendation || '').replace(/[\n\r]/g, ' ')
          ]);
        });
      });
    });

    const csv = rows.map(r =>
      r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\n');

    this._downloadFile(
      csv,
      `Log360-HealthCheck-${assessmentData.customer_name}-${assessmentData.assessment_date}.csv`,
      'text/csv'
    );
  },

  /* ===== Standalone HTML Export ===== */
  exportHTML(assessmentData, criteriaByComponent, componentScores) {
    const NAMES = {
      adaudit:      'ADAudit Plus',
      dataSecurity: 'DataSecurity Plus',
      eventlog:     'EventLog Analyzer',
      log360:       'Log360',
      log360cloud:  'Log360 Cloud'
    };

    const statusEmoji = {
      configured:     '✅',
      partial:        '⚠️',
      not_configured: '❌',
      na:             '➖'
    };

    const statusLabel = {
      configured:     'Configured',
      partial:        'Partially Configured',
      not_configured: 'Not Configured',
      na:             'Not Applicable'
    };

    const COMPONENTS = ['adaudit', 'dataSecurity', 'eventlog', 'log360', 'log360cloud'];

    let compSectionsHtml = '';

    COMPONENTS.forEach(comp => {
      const template = criteriaByComponent[comp];
      if (!template) return;
      const scores = componentScores[comp] || { hcScore: 0, puScore: 0 };
      const compData = (assessmentData.components || {})[comp] || {};
      const statuses = compData.criteria_statuses || {};
      const notes    = compData.criteria_notes    || {};

      let sectHtml = '';
      template.sections.forEach(section => {
        let rowsHtml = '';
        section.criteria.forEach(crit => {
          const st = statuses[crit.id] || 'not_configured';
          const noteText = notes[crit.id] || '';
          rowsHtml += `
            <tr class="status-${st}">
              <td>${crit.type}</td>
              <td>${this._esc(crit.text)}</td>
              <td>${statusEmoji[st]} ${statusLabel[st]}</td>
              <td>${this._esc(noteText)}</td>
            </tr>`;
        });

        sectHtml += `
          <h4 style="margin:16px 0 8px;font-size:14px;color:#1a3e72;">${this._esc(section.name)}</h4>
          <table style="width:100%;border-collapse:collapse;margin-bottom:12px;font-size:12px;">
            <thead>
              <tr style="background:#f0f4fa;">
                <th style="padding:6px 8px;border:1px solid #dde3ef;text-align:left;width:60px;">Type</th>
                <th style="padding:6px 8px;border:1px solid #dde3ef;text-align:left;">Criteria</th>
                <th style="padding:6px 8px;border:1px solid #dde3ef;text-align:left;width:160px;">Status</th>
                <th style="padding:6px 8px;border:1px solid #dde3ef;text-align:left;width:200px;">Notes</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>`;
      });

      // Recommendations for this component
      const recs = Recommendations.generateRecommendations(
        template.sections,
        statuses,
        {}
      );

      let recsHtml = recs.length === 0
        ? '<p style="color:#2d9e59;">✅ No recommendations — all items configured.</p>'
        : recs.map(r => `
            <div style="border-left:4px solid ${r.severity === 'high' ? '#dc3545' : '#e89c28'};padding:10px 14px;margin-bottom:8px;background:#fafafa;">
              <strong style="font-size:12px;">${r.severity === 'high' ? '❌' : '⚠️'} ${this._esc(r.title)}</strong>
              <p style="font-size:11px;color:#444;margin:4px 0 0;">${this._esc(r.text)}</p>
              ${r.helpLink ? `<a href="${r.helpLink}" style="font-size:11px;color:#2a5298;">📖 Documentation</a>` : ''}
            </div>`).join('');

      compSectionsHtml += `
        <div style="page-break-before:always;">
          <h3 style="background:#1a3e72;color:#fff;padding:12px 16px;border-radius:6px;margin-bottom:16px;font-size:16px;">
            ${NAMES[comp]}
            <span style="float:right;font-size:13px;font-weight:normal;">
              HC: ${scores.hcScore}% &nbsp;|&nbsp; PU: ${scores.puScore}%
            </span>
          </h3>
          <div style="display:flex;gap:20px;margin-bottom:16px;">
            <div style="flex:1;background:#f0f4fa;padding:14px;border-radius:8px;text-align:center;">
              <div style="font-size:28px;font-weight:700;color:#2a5298;">${scores.hcScore}%</div>
              <div style="font-size:11px;color:#6b7a9a;text-transform:uppercase;font-weight:600;">Health Check</div>
            </div>
            <div style="flex:1;background:#f0f4fa;padding:14px;border-radius:8px;text-align:center;">
              <div style="font-size:28px;font-weight:700;color:#2d9e59;">${scores.puScore}%</div>
              <div style="font-size:11px;color:#6b7a9a;text-transform:uppercase;font-weight:600;">Product Utilization</div>
            </div>
          </div>
          ${sectHtml}
          <h4 style="margin:20px 0 10px;color:#e63946;">🔧 Areas for Improvement</h4>
          ${recsHtml}
        </div>`;
    });

    const overallHC = this._weightedAvg(componentScores, 'hcScore', assessmentData.component_weights || {});
    const overallPU = this._weightedAvg(componentScores, 'puScore', assessmentData.component_weights || {});

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Log360 Health Check Report — ${this._esc(assessmentData.customer_name)}</title>
<style>
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1c2a3a; margin: 0; padding: 0; font-size: 13px; }
  .cover { background: linear-gradient(135deg, #1a3e72, #2a5298); color: #fff; padding: 60px 40px; text-align: center; }
  .cover h1 { font-size: 28px; margin-bottom: 10px; }
  .cover .sub { font-size: 16px; opacity: 0.85; }
  .meta-table { margin: 20px auto; border-collapse: collapse; }
  .meta-table td { padding: 6px 14px; border: 1px solid rgba(255,255,255,0.3); font-size: 13px; }
  .meta-table td:first-child { font-weight: 600; background: rgba(0,0,0,0.15); }
  .overall-scores { background: #f0f4fa; padding: 30px 40px; display: flex; gap: 20px; justify-content: center; }
  .score-box { background: #fff; border-radius: 10px; padding: 20px 30px; text-align: center; min-width: 160px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
  .content { padding: 30px 40px; }
  tr.status-configured   { background: rgba(45,158,89,0.05); }
  tr.status-not_configured { background: rgba(220,53,69,0.05); }
  tr.status-partial      { background: rgba(232,156,40,0.07); }
  tr.status-na           { opacity: 0.6; }
  @media print { .cover { page-break-after: always; } }
</style>
</head>
<body>
<div class="cover">
  <div style="font-size:36px;margin-bottom:16px;">🛡️</div>
  <h1>Log360 Health Check &amp; Scorecard</h1>
  <div class="sub">Product Utilization &amp; Security Assessment Report</div>
  <table class="meta-table">
    <tr><td>Customer</td><td>${this._esc(assessmentData.customer_name)}</td></tr>
    <tr><td>Domain</td><td>${this._esc(assessmentData.customer_domain || 'N/A')}</td></tr>
    <tr><td>Assessor</td><td>${this._esc(assessmentData.assessor_name || 'N/A')}</td></tr>
    <tr><td>Date</td><td>${this._esc(assessmentData.assessment_date)}</td></tr>
    <tr><td>Overall HC Score</td><td><strong>${overallHC}%</strong></td></tr>
    <tr><td>Overall PU Score</td><td><strong>${overallPU}%</strong></td></tr>
  </table>
</div>

<div style="padding:30px 40px;">
  <h2 style="color:#1a3e72;border-bottom:2px solid #1a3e72;padding-bottom:8px;">Overall Scores</h2>
  <div style="display:flex;gap:20px;flex-wrap:wrap;margin-top:16px;">
    ${COMPONENTS.map(c => {
      const s = componentScores[c] || { hcScore: 0, puScore: 0 };
      return `<div style="background:#f8f9fc;border:1px solid #dde3ef;border-radius:8px;padding:14px 20px;min-width:140px;text-align:center;">
        <div style="font-weight:700;font-size:13px;margin-bottom:8px;">${NAMES[c]}</div>
        <div style="font-size:22px;font-weight:700;color:#2a5298;">${s.hcScore}%</div>
        <div style="font-size:11px;color:#6b7a9a;">Health Check</div>
        <div style="font-size:22px;font-weight:700;color:#2d9e59;margin-top:4px;">${s.puScore}%</div>
        <div style="font-size:11px;color:#6b7a9a;">Product Utilization</div>
      </div>`;
    }).join('')}
  </div>
</div>

<div style="padding:0 40px 40px;">${compSectionsHtml}</div>

<div style="padding:20px 40px;background:#f8f9fc;border-top:1px solid #dde3ef;font-size:11px;color:#6b7a9a;text-align:center;">
  Generated by Log360 Health Check Tool &bull; ManageEngine Log360 &bull; ${new Date().toLocaleDateString()}
</div>
</body>
</html>`;

    this._downloadFile(
      html,
      `Log360-HealthCheck-${assessmentData.customer_name}-${assessmentData.assessment_date}.html`,
      'text/html'
    );
  },

  /* ===== PDF Export (using jsPDF + html2canvas) ===== */
  async exportPDF(reportContainerEl, filename) {
    if (!window.jspdf || !window.html2canvas) {
      alert('PDF export requires jsPDF and html2canvas. Please ensure the page is fully loaded.');
      return;
    }

    try {
      showToast('Generating PDF…', 'info');
      const canvas = await html2canvas(reportContainerEl, {
        scale: 1.5,
        useCORS: true,
        logging: false
      });

      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF('p', 'mm', 'a4');

      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const usableW = pageW - margin * 2;
      const usableH = pageH - margin * 2;

      const canvasH = canvas.height;
      const canvasW = canvas.width;
      const ratio = canvasW / usableW;
      const scaledH = canvasH / ratio;

      let yPos = 0;
      let pageNum = 0;

      while (yPos < canvasH) {
        if (pageNum > 0) pdf.addPage();

        const sliceH = Math.min(usableH * ratio, canvasH - yPos);
        const sliceCanvas = document.createElement('canvas');
        sliceCanvas.width = canvasW;
        sliceCanvas.height = sliceH;
        const ctx = sliceCanvas.getContext('2d');
        ctx.drawImage(canvas, 0, -yPos);

        const imgData = sliceCanvas.toDataURL('image/jpeg', 0.85);
        pdf.addImage(imgData, 'JPEG', margin, margin, usableW, sliceH / ratio);

        yPos += sliceH;
        pageNum++;
      }

      pdf.save(filename);
      showToast('PDF exported successfully!', 'success');
    } catch (e) {
      console.error('PDF export error:', e);
      showToast('PDF export failed: ' + e.message, 'error');
    }
  },

  /* ===== Helpers ===== */
  _esc(str) {
    return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  },

  _downloadFile(content, filename, type) {
    const blob = new Blob([content], { type });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  },

  _weightedAvg(componentScores, field, weights) {
    let total = 0, weighted = 0;
    for (const [comp, scores] of Object.entries(componentScores)) {
      const w = weights[comp] !== undefined ? weights[comp] : 20;
      total   += w;
      weighted += (scores[field] || 0) * w;
    }
    return total > 0 ? Math.round(weighted / total) : 0;
  }
};

window.ExportUtils = ExportUtils;
