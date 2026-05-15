/**
 * app.js — Main application logic for assessment.html
 */

// ============================================================
// Global State
// ============================================================
let state = {
  assessmentId: null,
  assessment:   null,
  templates:    {},   // { comp: criteriaTemplate }
  statuses:     {},   // { comp: { criteriaId: status } }
  notes:        {},   // { comp: { criteriaId: note } }
  customRecs:   {},   // { comp: { criteriaId: text } }
  scores:       {},   // { comp: { hcScore, puScore } }
  weights:      { adaudit: 20, dataSecurity: 20, eventlog: 20, log360: 20, log360cloud: 20 },
  activeComponent: null,
  charts: {},
  saveTimer: null,
  dirty: false
};

const COMPONENTS = ['adaudit', 'dataSecurity', 'eventlog', 'log360', 'log360cloud'];
const COMP_NAMES = {
  adaudit:      'ADAudit Plus',
  dataSecurity: 'DataSecurity Plus',
  eventlog:     'EventLog Analyzer',
  log360:       'Log360',
  log360cloud:  'Log360 Cloud'
};
const COMP_ICONS = {
  adaudit:      '🛡️',
  dataSecurity: '🔒',
  eventlog:     '📋',
  log360:       '🖥️',
  log360cloud:  '☁️'
};
const STATUS_OPTIONS = [
  { value: 'configured',     label: '✅ Configured' },
  { value: 'partial',        label: '⚠️ Partially Configured' },
  { value: 'not_configured', label: '❌ Not Configured' },
  { value: 'na',             label: '➖ Not Applicable' }
];

// ============================================================
// Bootstrap
// ============================================================
document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const id = urlParams.get('id');

  if (!id) {
    window.location.href = 'dashboard.html';
    return;
  }

  state.assessmentId = id;

  try {
    await loadAssessment(id);
    await loadAllTemplates();
    buildUI();
    switchComponent('adaudit');
    showToast('Assessment loaded', 'success');
  } catch (err) {
    showToast('Failed to load assessment: ' + err.message, 'error');
    console.error(err);
  }
});

// ============================================================
// Data Loading
// ============================================================
async function loadAssessment(id) {
  state.assessment = await Api.getAssessment(id);
  state.weights = state.assessment.component_weights || state.weights;

  // Load existing component data into state
  const components = state.assessment.components || {};
  COMPONENTS.forEach(comp => {
    const data = components[comp] || {};
    state.statuses[comp]   = data.criteria_statuses || {};
    state.notes[comp]      = data.criteria_notes    || {};
    state.customRecs[comp] = {};  // will be populated from custom_recommendations
    (data.custom_recommendations || []).forEach(r => {
      state.customRecs[comp][r.criteriaId] = r.text;
    });
  });
}

async function loadAllTemplates() {
  const promises = COMPONENTS.map(async comp => {
    try {
      state.templates[comp] = await Api.getCriteria(comp);
    } catch (e) {
      console.warn(`Failed to load criteria for ${comp}:`, e);
    }
  });
  await Promise.all(promises);
}

// ============================================================
// UI Construction
// ============================================================
function buildUI() {
  const a = state.assessment;

  // Header
  document.getElementById('customer-name').textContent = a.customer_name;
  document.getElementById('customer-domain').textContent = a.customer_domain ? `(${a.customer_domain})` : '';
  document.getElementById('assessment-date').textContent = a.assessment_date;
  document.getElementById('assessor-name').textContent   = a.assessor_name || '—';

  // Build component tabs
  const tabBar = document.getElementById('component-tabs');
  tabBar.innerHTML = COMPONENTS.map(comp => `
    <button class="component-tab" data-comp="${comp}" id="tab-${comp}">
      <span>${COMP_ICONS[comp]}</span>
      <span>${COMP_NAMES[comp]}</span>
    </button>`).join('');

  tabBar.addEventListener('click', e => {
    const tab = e.target.closest('[data-comp]');
    if (tab) switchComponent(tab.dataset.comp);
  });

  // Overall score cards
  updateOverallScores();
}

function switchComponent(comp) {
  if (!state.templates[comp]) {
    showToast(`Template not available for ${COMP_NAMES[comp]}`, 'error');
    return;
  }

  state.activeComponent = comp;

  // Update tab active state
  document.querySelectorAll('.component-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.comp === comp);
  });

  renderComponentPanel(comp);
}

function renderComponentPanel(comp) {
  const template = state.templates[comp];
  const container = document.getElementById('component-panel');

  // Build info banner
  const bi = template.buildInfo || {};
  const buildHtml = `
    <div class="build-banner">
      <div>
        <h2>${COMP_ICONS[comp]} ${template.name}</h2>
        <div style="font-size:0.8rem;opacity:0.85;">Build: ${bi.latestBuild || 'Latest'}</div>
      </div>
      <div class="build-meta">
        <div class="build-meta-item">
          <span>📖</span>
          <a href="${bi.releaseNotesUrl || '#'}" target="_blank" style="color:rgba(255,255,255,0.9);">Release Notes</a>
        </div>
        <div class="build-meta-item">
          <span>📚</span>
          <a href="${bi.documentationUrl || '#'}" target="_blank" style="color:rgba(255,255,255,0.9);">Documentation</a>
        </div>
      </div>
    </div>`;

  // Score cards for this component
  const scores = state.scores[comp] || { hcScore: 0, puScore: 0 };
  const scoreHtml = `
    <div class="score-grid" id="score-grid-${comp}">
      <div class="score-card score-hc">
        <div class="score-label">Health Check</div>
        <div class="score-value ${Scoring.scoreClass(scores.hcScore)}" id="hc-score-${comp}">${scores.hcScore}%</div>
        <div class="score-progress"><div class="score-progress-fill" id="hc-bar-${comp}" style="width:${scores.hcScore}%"></div></div>
      </div>
      <div class="score-card score-pu">
        <div class="score-label">Product Utilization</div>
        <div class="score-value score-pu ${Scoring.scoreClass(scores.puScore)}" id="pu-score-${comp}">${scores.puScore}%</div>
        <div class="score-progress"><div class="score-progress-fill score-pu" id="pu-bar-${comp}" style="width:${scores.puScore}%"></div></div>
      </div>
      <div class="score-card" style="grid-column:span 1;">
        <canvas id="chart-${comp}" style="max-height:100px;"></canvas>
      </div>
    </div>`;

  // Build criteria sections
  let sectionsHtml = '';
  template.sections.forEach(section => {
    const sectionId = `section-${comp}-${section.id}`;
    sectionsHtml += buildSection(comp, section, sectionId);
  });

  // Recommendations panel
  const recsHtml = buildRecommendationsPanel(comp);

  container.innerHTML = `
    ${buildHtml}
    ${scoreHtml}
    <div id="sections-${comp}">${sectionsHtml}</div>
    ${recsHtml}`;

  // Wire up section accordions
  container.querySelectorAll('.section-header').forEach(hdr => {
    hdr.addEventListener('click', () => toggleSection(hdr));
  });

  // Wire up status selects
  container.querySelectorAll('.status-select').forEach(sel => {
    sel.addEventListener('change', (e) => {
      const critId = e.target.dataset.critId;
      handleStatusChange(comp, critId, e.target.value);
    });
  });

  // Wire up notes inputs
  container.querySelectorAll('.notes-input').forEach(inp => {
    inp.addEventListener('input', (e) => {
      const critId = e.target.dataset.critId;
      if (!state.notes[comp]) state.notes[comp] = {};
      state.notes[comp][critId] = e.target.value;
      scheduleSave();
    });
  });

  // Render chart
  requestAnimationFrame(() => renderComponentChart(comp));
  recomputeAndUpdate(comp);

  // Open first section
  const firstHeader = container.querySelector('.section-header');
  if (firstHeader) toggleSection(firstHeader, true);
}

function buildSection(comp, section, sectionId) {
  const rowsHtml = section.criteria.map(crit => buildCriteriaRow(comp, crit)).join('');

  return `
    <div class="section-accordion" id="${sectionId}">
      <button class="section-header" data-section="${sectionId}">
        <div class="section-header-left">
          <span class="section-title">${section.name}</span>
          <span class="section-progress text-small text-muted" id="prog-${sectionId}"></span>
        </div>
        <span class="section-toggle">▼</span>
      </button>
      <div class="section-body">
        <table class="criteria-table">
          <thead>
            <tr>
              <th style="width:55px;">Type</th>
              <th>Criteria</th>
              <th style="width:160px;">Status</th>
              <th style="width:180px;">Notes</th>
              <th style="width:70px;">Help</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
    </div>`;
}

function buildCriteriaRow(comp, crit) {
  const status = (state.statuses[comp] || {})[crit.id] || 'not_configured';
  const note   = (state.notes[comp]    || {})[crit.id] || '';

  const optionsHtml = STATUS_OPTIONS.map(o =>
    `<option value="${o.value}" ${o.value === status ? 'selected' : ''}>${o.label}</option>`
  ).join('');

  const badgeClass = 'badge-' + crit.type.replace('/', '\\/');

  return `
    <tr class="status-${status}" id="row-${crit.id}">
      <td><span class="criteria-type-badge badge-${crit.type.replace(/\//g, '-')}">${crit.type}</span></td>
      <td class="criteria-text">${escHtml(crit.text)}</td>
      <td>
        <select class="status-select" data-crit-id="${crit.id}">
          ${optionsHtml}
        </select>
      </td>
      <td>
        <textarea class="notes-input" data-crit-id="${crit.id}" rows="1" placeholder="Notes…">${escHtml(note)}</textarea>
      </td>
      <td>
        ${crit.helpLink
          ? `<a href="${crit.helpLink}" target="_blank" class="help-link" title="Documentation">📖 Docs</a>`
          : ''}
      </td>
    </tr>`;
}

function buildRecommendationsPanel(comp) {
  const template = state.templates[comp];
  if (!template) return '';

  const statuses = state.statuses[comp] || {};
  const customRecs = state.customRecs[comp] || {};
  const recs = Recommendations.generateRecommendations(template.sections, statuses, customRecs);

  if (recs.length === 0) {
    return `
      <div class="recommendations-panel card mt-3">
        <div class="card-header"><h3>🔧 Areas for Improvement</h3></div>
        <div class="card-body">
          <div class="empty-state">
            <div class="empty-icon">✅</div>
            <h3>All items configured!</h3>
            <p>No recommendations for this component.</p>
          </div>
        </div>
      </div>`;
  }

  const summary = Recommendations.buildSummary(recs, COMP_NAMES[comp]);

  const recItems = recs.map(r => `
    <div class="rec-item severity-${r.severity}" id="rec-${r.criteriaId}">
      <div class="rec-header">
        <div>
          <div class="rec-title">${r.severity === 'high' ? '❌' : '⚠️'} ${escHtml(r.title)}</div>
          <div class="text-small text-muted">${r.section} &bull; ${r.type}</div>
        </div>
        ${r.helpLink
          ? `<a href="${r.helpLink}" target="_blank" class="btn btn-secondary btn-sm" title="Docs">📖 Docs</a>`
          : ''}
      </div>
      <textarea class="rec-text" rows="3" data-crit-id="${r.criteriaId}" placeholder="Edit recommendation…">${escHtml(r.text)}</textarea>
    </div>`).join('');

  return `
    <div class="recommendations-panel card mt-3" id="recs-panel-${comp}">
      <div class="card-header">
        <h3>🔧 Areas for Improvement</h3>
        <span class="text-small text-muted">${recs.filter(r=>r.severity==='high').length} critical &bull; ${recs.filter(r=>r.severity==='medium').length} partial</span>
      </div>
      <div class="card-body">
        <p class="text-muted text-small mb-2">${escHtml(summary)}</p>
        ${recItems}
      </div>
    </div>`;
}

// ============================================================
// Event Handlers
// ============================================================
function handleStatusChange(comp, critId, newStatus) {
  if (!state.statuses[comp]) state.statuses[comp] = {};
  state.statuses[comp][critId] = newStatus;

  // Update row class
  const row = document.getElementById(`row-${critId}`);
  if (row) {
    row.className = row.className.replace(/status-\S+/g, '');
    row.classList.add(`status-${newStatus}`);
  }

  recomputeAndUpdate(comp);
  refreshRecommendations(comp);
  scheduleSave();
}

function recomputeAndUpdate(comp) {
  const template = state.templates[comp];
  if (!template) return;

  const result = Scoring.computeComponentScore(template.sections, state.statuses[comp] || {});
  state.scores[comp] = result;

  // Update score display
  const hcEl  = document.getElementById(`hc-score-${comp}`);
  const puEl  = document.getElementById(`pu-score-${comp}`);
  const hcBar = document.getElementById(`hc-bar-${comp}`);
  const puBar = document.getElementById(`pu-bar-${comp}`);

  if (hcEl) {
    hcEl.textContent = result.hcScore + '%';
    hcEl.className = `score-value ${Scoring.scoreClass(result.hcScore)}`;
  }
  if (puEl) {
    puEl.textContent = result.puScore + '%';
    puEl.className = `score-value ${Scoring.scoreClass(result.puScore)}`;
  }
  if (hcBar) hcBar.style.width = result.hcScore + '%';
  if (puBar) puBar.style.width = result.puScore + '%';

  // Update section progress
  updateSectionProgress(comp);

  // Update chart
  renderComponentChart(comp);

  // Update overall scores
  updateOverallScores();
}

function updateSectionProgress(comp) {
  const template = state.templates[comp];
  if (!template) return;

  template.sections.forEach(section => {
    const sectionId = `section-${comp}-${section.id}`;
    const progEl = document.getElementById(`prog-${sectionId}`);
    if (!progEl) return;

    let configured = 0, total = 0;
    section.criteria.forEach(crit => {
      const st = (state.statuses[comp] || {})[crit.id] || 'not_configured';
      if (st !== 'na') {
        total++;
        if (st === 'configured') configured++;
        else if (st === 'partial') configured += 0.5;
      }
    });

    const pct = total > 0 ? Math.round((configured / total) * 100) : 0;
    progEl.textContent = `${pct}% (${Math.round(configured)}/${total})`;
  });
}

function refreshRecommendations(comp) {
  const panelId = `recs-panel-${comp}`;
  const existing = document.getElementById(panelId);

  // Save current custom rec text before refresh
  if (existing) {
    existing.querySelectorAll('.rec-text').forEach(ta => {
      const critId = ta.dataset.critId;
      if (!state.customRecs[comp]) state.customRecs[comp] = {};
      state.customRecs[comp][critId] = ta.value;
    });
  }

  const newRecsHtml = buildRecommendationsPanel(comp);
  const container = document.getElementById('component-panel');

  if (existing) {
    const tmp = document.createElement('div');
    tmp.innerHTML = newRecsHtml;
    existing.replaceWith(tmp.firstElementChild);
  } else {
    container.insertAdjacentHTML('beforeend', newRecsHtml);
  }

  // Wire up rec text edit handlers
  document.querySelectorAll('.rec-text').forEach(ta => {
    ta.addEventListener('input', (e) => {
      const critId = e.target.dataset.critId;
      if (!state.customRecs[comp]) state.customRecs[comp] = {};
      state.customRecs[comp][critId] = e.target.value;
      scheduleSave();
    });
  });
}

// ============================================================
// Charts
// ============================================================
function renderComponentChart(comp) {
  const canvas = document.getElementById(`chart-${comp}`);
  if (!canvas) return;

  const scores = state.scores[comp] || { hcScore: 0, puScore: 0 };

  if (state.charts[comp]) {
    state.charts[comp].destroy();
  }

  state.charts[comp] = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: ['HC%', 'PU%'],
      datasets: [{
        data: [scores.hcScore, scores.puScore],
        backgroundColor: ['#2a5298', '#2d9e59'],
        borderWidth: 2,
        borderColor: '#fff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '65%',
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.label}: ${ctx.raw}%`
          }
        }
      }
    }
  });
}

function updateOverallScores() {
  const { overallHC, overallPU } = Scoring.computeOverallScore(state.scores, state.weights);

  const ohcEl = document.getElementById('overall-hc');
  const opuEl = document.getElementById('overall-pu');
  if (ohcEl) {
    ohcEl.textContent = overallHC + '%';
    ohcEl.className = `score-value ${Scoring.scoreClass(overallHC)}`;
  }
  if (opuEl) {
    opuEl.textContent = overallPU + '%';
    opuEl.className = `score-value ${Scoring.scoreClass(overallPU)}`;
  }

  const ohcBar = document.getElementById('overall-hc-bar');
  const opuBar = document.getElementById('overall-pu-bar');
  if (ohcBar) ohcBar.style.width = overallHC + '%';
  if (opuBar) opuBar.style.width = overallPU + '%';

  // Update per-component rows in header if present
  COMPONENTS.forEach(comp => {
    const s = state.scores[comp] || { hcScore: 0, puScore: 0 };
    const miniHc = document.getElementById(`mini-hc-${comp}`);
    const miniPu = document.getElementById(`mini-pu-${comp}`);
    if (miniHc) miniHc.textContent = s.hcScore + '%';
    if (miniPu) miniPu.textContent = s.puScore + '%';
  });

  // Render overall chart
  renderOverallChart(overallHC, overallPU);
}

function renderOverallChart(hc, pu) {
  const canvas = document.getElementById('overall-chart');
  if (!canvas) return;

  if (state.charts['_overall']) state.charts['_overall'].destroy();

  state.charts['_overall'] = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: ['HC', 'PU', 'Gap'],
      datasets: [{
        data: [hc, pu, Math.max(0, 100 - Math.max(hc, pu))],
        backgroundColor: ['#2a5298', '#2d9e59', '#eef1f7'],
        borderWidth: 2,
        borderColor: '#fff'
      }]
    },
    options: {
      responsive: true,
      cutout: '65%',
      plugins: {
        legend: { position: 'bottom', labels: { font: { size: 11 } } },
        tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${ctx.raw}%` } }
      }
    }
  });
}

// ============================================================
// Accordion
// ============================================================
function toggleSection(hdr, forceOpen = false) {
  const body = hdr.nextElementSibling;
  const isOpen = body.classList.contains('open');

  if (forceOpen) {
    hdr.classList.add('open');
    body.classList.add('open');
  } else {
    hdr.classList.toggle('open', !isOpen);
    body.classList.toggle('open', !isOpen);
  }
}

// ============================================================
// Auto-Save
// ============================================================
function scheduleSave() {
  state.dirty = true;
  if (state.saveTimer) clearTimeout(state.saveTimer);
  state.saveTimer = setTimeout(() => saveAssessment(), 2000);
}

async function saveAssessment() {
  if (!state.dirty) return;
  state.dirty = false;

  try {
    const components = {};
    COMPONENTS.forEach(comp => {
      const scores = state.scores[comp] || { hcScore: 0, puScore: 0 };
      const customRecsArr = Object.entries(state.customRecs[comp] || {}).map(([k, v]) => ({ criteriaId: k, text: v }));

      components[comp] = {
        criteria_statuses:     state.statuses[comp]  || {},
        criteria_notes:        state.notes[comp]     || {},
        custom_recommendations: customRecsArr,
        hc_score:              scores.hcScore,
        pu_score:              scores.puScore
      };
    });

    await Api.updateAssessment(state.assessmentId, { components });
    updateSaveIndicator('saved');
  } catch (err) {
    updateSaveIndicator('error');
    console.error('Auto-save failed:', err);
  }
}

function updateSaveIndicator(status) {
  const el = document.getElementById('save-status');
  if (!el) return;
  el.className = `save-indicator ${status}`;
  el.textContent = status === 'saved' ? '✓ Saved' : status === 'error' ? '⚠ Save failed' : 'Saving…';
}

// ============================================================
// Export handlers (wired up from HTML)
// ============================================================
window.handleExportCSV = function() {
  if (!state.assessment) return;
  ExportUtils.exportCSV(state.assessment, state.templates);
  showToast('CSV exported!', 'success');
};

window.handleExportHTML = function() {
  if (!state.assessment) return;
  // Build full assessment data with current scores
  const assessmentData = {
    ...state.assessment,
    components: {}
  };
  COMPONENTS.forEach(comp => {
    assessmentData.components[comp] = {
      criteria_statuses: state.statuses[comp] || {},
      criteria_notes:    state.notes[comp]    || {}
    };
  });
  ExportUtils.exportHTML(assessmentData, state.templates, state.scores);
  showToast('HTML report exported!', 'success');
};

window.handleExportPDF = async function() {
  const el = document.getElementById('component-panel');
  if (!el) return;
  const fn = `Log360-HealthCheck-${state.assessment?.customer_name || 'Report'}.pdf`;
  await ExportUtils.exportPDF(el, fn);
};

window.handleSaveNow = function() {
  state.dirty = true;
  saveAssessment();
  showToast('Saving…', 'info');
};

// ============================================================
// Utilities
// ============================================================
function escHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container') || createToastContainer();
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
  toast.innerHTML = `<span>${icon}</span><span>${escHtml(message)}</span>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

function createToastContainer() {
  const div = document.createElement('div');
  div.id = 'toast-container';
  div.className = 'toast-container';
  document.body.appendChild(div);
  return div;
}

window.showToast = showToast;

// Hamburger menu
const hamburger = document.getElementById('hamburger');
if (hamburger) {
  hamburger.addEventListener('click', () => {
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) sidebar.classList.toggle('open');
  });
}
