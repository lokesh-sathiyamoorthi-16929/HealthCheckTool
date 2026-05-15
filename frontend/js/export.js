/**
 * export.js — Export to PDF, HTML, and CSV/Excel
 * Uses jsPDF + html2canvas (loaded via CDN) for PDF
 */

const STATUS_DISPLAY = {
  configured:     { label: '✅ Configured',           weight: 1.0 },
  partial:        { label: '⚠️ Partially Configured', weight: 0.5 },
  not_configured: { label: '❌ Not Configured',        weight: 0.0 },
  na:             { label: '➖ Not Applicable',        weight: null },
  info:           { label: 'ℹ️ Informational',        weight: null },
  yes:            { label: '✅ Yes',                   weight: 1.0 },
  no:             { label: '❌ No',                    weight: 0.0 },
  latest:         { label: '✅ Latest',                weight: 1.0 },
  one_behind:     { label: '⚠️ 1 Build Behind',       weight: 0.5 },
  outdated:       { label: '❌ Outdated',              weight: 0.0 },
  all:            { label: '✅ All',                   weight: 1.0 },
  some:           { label: '⚠️ Some',                 weight: 0.5 },
  none:           { label: '❌ None',                  weight: 0.0 },
  correct:        { label: '✅ Correct',               weight: 1.0 },
  incorrect:      { label: '❌ Incorrect',             weight: 0.0 },
};

const ABBR_GLOSSARY = {
  'HC':    'Health Check',
  'PU':    'Product Utilization',
  'PU/HC': 'Product Utilization & Health Check',
  'HC/PU': 'Health Check & Product Utilization',
  'INFO':  'Informational (not scored)',
  'SACL':  'System Access Control List',
  'FIM':   'File Integrity Monitoring',
  'DC':    'Domain Controller',
  'SIEM':  'Security Information and Event Management',
  'DLP':   'Data Loss Prevention',
  'MFA':   'Multi-Factor Authentication',
  'GDPR':  'General Data Protection Regulation',
  'SMTP':  'Simple Mail Transfer Protocol',
  'SMS':   'Short Message Service',
  'NAT':   'Network Address Translation',
  'AD':    'Active Directory',
  'ROT':   'Redundant/Obsolete/Trivial',
  'CASB':  'Cloud Access Security Broker',
  'ITDR':  'Identity Threat Detection and Response',
  'HA':    'High Availability',
  'SSL':   'Secure Sockets Layer',
  'TLS':   'Transport Layer Security',
};

window.STATUS_DISPLAY = STATUS_DISPLAY;
window.ABBR_GLOSSARY  = ABBR_GLOSSARY;

const ExportUtils = {

  /* ===== CSV Export ===== */
  exportCSV(assessmentData, criteriaByComponent, componentScores, selectedComponents) {
    const rows = [
      ['Customer', 'Component', 'Section', 'Criteria ID', 'Criteria Text', 'Type', 'Status', 'HC Weight', 'PU Weight', 'Notes', 'Recommendation']
    ];

    const COMPONENTS = selectedComponents || ['adaudit', 'dataSecurity', 'eventlog', 'log360', 'log360cloud'];
    const NAMES = {
      adaudit:      'ADAudit Plus',
      dataSecurity: 'DataSecurity Plus',
      eventlog:     'EventLog Analyzer',
      log360:       'Log360',
      log360cloud:  'Log360 Cloud'
    };

    COMPONENTS.forEach(comp => {
      const template = criteriaByComponent[comp];
      if (!template) {
        console.warn(`[exportCSV] No criteria template found for component: ${comp}`);
        return;
      }
      const compData = (assessmentData.components || {})[comp] || {};
      const statuses = compData.criteria_statuses || {};
      const notes    = compData.criteria_notes    || {};

      template.sections.forEach(section => {
        section.criteria.forEach(crit => {
          const status = statuses[crit.id] || (crit.statusOptions?.[0] || 'not_configured');
          const statusLabel = STATUS_DISPLAY[status]?.label || status;

          rows.push([
            assessmentData.customer_name,
            NAMES[comp] || comp,
            section.name.replace(/[\u{1F000}-\u{EFFFF}]/gu, '').trim(),
            crit.id,
            crit.text,
            crit.type,
            statusLabel,
            crit.type !== 'INFO' && crit.type.includes('HC') ? '1' : '0',
            crit.type !== 'INFO' && crit.type.includes('PU') ? '1' : '0',
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
      `HCT-${assessmentData.customer_name}-${assessmentData.assessment_date}.csv`,
      'text/csv'
    );
  },

  /* ===== Standalone HTML Export ===== */
  exportHTML(assessmentData, criteriaByComponent, componentScores, selectedComponents) {
    const NAMES = {
      adaudit:      'ADAudit Plus',
      dataSecurity: 'DataSecurity Plus',
      eventlog:     'EventLog Analyzer',
      log360:       'Log360',
      log360cloud:  'Log360 Cloud'
    };

    const COMPONENTS = selectedComponents || ['adaudit', 'dataSecurity', 'eventlog', 'log360', 'log360cloud'];

    let compSectionsHtml = '';

    COMPONENTS.forEach(comp => {
      const template = criteriaByComponent[comp];
      if (!template) {
        console.warn(`[exportHTML] No criteria template found for component: ${comp}`);
        return;
      }
      const scores = componentScores[comp] || { hcScore: 0, puScore: 0 };
      const compData = (assessmentData.components || {})[comp] || {};
      const statuses = compData.criteria_statuses || {};
      const notes    = compData.criteria_notes    || {};

      let sectHtml = '';
      template.sections.forEach(section => {
        let rowsHtml = '';
        section.criteria.forEach(crit => {
          const st = statuses[crit.id] || (crit.statusOptions?.[0] || 'not_configured');
          const noteText = notes[crit.id] || '';
          const stInfo = STATUS_DISPLAY[st] || { label: st };
          const typeLabel = crit.type === 'INFO' ? 'ℹ️ INFO' : crit.type;
          rowsHtml += `
            <tr class="status-${st}">
              <td>${this._esc(typeLabel)}</td>
              <td>${this._esc(crit.text)}</td>
              <td>${this._esc(stInfo.label)}</td>
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
      const recs = Recommendations.generateRecommendations(template.sections, statuses, {});

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
            ${NAMES[comp] || comp}
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

    // Build glossary section
    const glossaryRows = Object.entries(ABBR_GLOSSARY).map(([abbr, def]) =>
      `<tr><td style="padding:4px 8px;border:1px solid #dde3ef;font-weight:600;width:80px;">${this._esc(abbr)}</td>` +
      `<td style="padding:4px 8px;border:1px solid #dde3ef;">${this._esc(def)}</td></tr>`
    ).join('');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>HCT Health Check Report — ${this._esc(assessmentData.customer_name)}</title>
<style>
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1c2a3a; margin: 0; padding: 0; font-size: 13px; }
  .cover { background: linear-gradient(135deg, #1a3e72, #2a5298); color: #fff; padding: 60px 40px; text-align: center; }
  .cover h1 { font-size: 28px; margin-bottom: 10px; }
  .cover .sub { font-size: 16px; opacity: 0.85; }
  .meta-table { margin: 20px auto; border-collapse: collapse; }
  .meta-table td { padding: 6px 14px; border: 1px solid rgba(255,255,255,0.3); font-size: 13px; }
  .meta-table td:first-child { font-weight: 600; background: rgba(0,0,0,0.15); }
  .content { padding: 30px 40px; }
  tr.status-configured, tr.status-yes, tr.status-latest, tr.status-all, tr.status-correct { background: rgba(45,158,89,0.05); }
  tr.status-not_configured, tr.status-no, tr.status-outdated, tr.status-none, tr.status-incorrect { background: rgba(220,53,69,0.05); }
  tr.status-partial, tr.status-one_behind, tr.status-some { background: rgba(232,156,40,0.07); }
  tr.status-na, tr.status-info { opacity: 0.6; }
  abbr { text-decoration: underline dotted; cursor: help; }
  @media print { .cover { page-break-after: always; } }
</style>
</head>
<body>
<div class="cover">
  <div style="font-size:36px;margin-bottom:16px;">🛡️</div>
  <h1>HCT Health Check &amp; Scorecard</h1>
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
        <div style="font-weight:700;font-size:13px;margin-bottom:8px;">${NAMES[c] || c}</div>
        <div style="font-size:22px;font-weight:700;color:#2a5298;">${s.hcScore}%</div>
        <div style="font-size:11px;color:#6b7a9a;">Health Check</div>
        <div style="font-size:22px;font-weight:700;color:#2d9e59;margin-top:4px;">${s.puScore}%</div>
        <div style="font-size:11px;color:#6b7a9a;">Product Utilization</div>
      </div>`;
    }).join('')}
  </div>
</div>

<div style="padding:0 40px 40px;">${compSectionsHtml}</div>

<div style="padding:30px 40px;border-top:2px solid #dde3ef;">
  <h3 style="color:#1a3e72;margin-bottom:12px;">📖 Abbreviation Glossary</h3>
  <table style="border-collapse:collapse;font-size:12px;">
    ${glossaryRows}
  </table>
</div>

<div style="padding:20px 40px;background:#f8f9fc;border-top:1px solid #dde3ef;font-size:11px;color:#6b7a9a;text-align:center;">
  Generated by HCT — Health Check Tool &bull; ManageEngine &bull; ${new Date().toLocaleDateString()}
</div>
</body>
</html>`;

    this._downloadFile(
      html,
      `HCT-${assessmentData.customer_name}-${assessmentData.assessment_date}.html`,
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
