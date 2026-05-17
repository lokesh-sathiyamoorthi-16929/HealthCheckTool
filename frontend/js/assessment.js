const PRODUCTS = [
  { id: 'adaudit',          name: 'ADAudit Plus' },
  { id: 'dataSecurity',     name: 'DataSecurity Plus' },
  { id: 'eventlog',         name: 'EventLog Analyzer' },
  { id: 'log360',           name: 'Log360' },
  { id: 'ad360',            name: 'AD360' },
  { id: 'admanager',        name: 'ADManager Plus' },
  { id: 'adselfservice',    name: 'ADSelfService Plus' },
  { id: 'm365manager',      name: 'M365 Manager Plus' },
  { id: 'recoverymanager',  name: 'RecoveryManager Plus' },
  { id: 'exchangereporter', name: 'Exchange Reporter Plus' },
  { id: 'sharepointmanager',name: 'SharePoint Manager Plus' },
  { id: 'log360cloud',      name: 'Log360 Cloud' }
];

const STATUS = [
  ['configured',     'Configured'],
  ['partial',        'Partial'],
  ['not_configured', 'Not Configured'],
  ['na',             'N/A'],
  ['info',           'Info']
];

const qp = new URLSearchParams(location.search);
const id = qp.get('id');
if (!id) location.href = 'index.html';

let assessment, templates = {}, active;
const data = { statuses: {} };

init();

async function init() {
  assessment = await Api.getAssessment(id);
  document.getElementById('customer-line').textContent =
    `${assessment.customer_name} · ${assessment.customer_domain || '—'}`;
  for (const c of (assessment.selected_components || [])) {
    try { templates[c] = await Api.getCriteria(c); }
    catch (e) { templates[c] = { component: c, name: c, sections: [] }; }
    data.statuses[c] = assessment.components?.[c]?.criteria_statuses || {};
  }
  buildNav();
  active = (assessment.selected_components || [])[0];
  render();
  bindTools();
  updateOverall();
}

function buildNav() {
  const nav = document.getElementById('component-nav');
  const selected = assessment.selected_components || [];
  nav.innerHTML = selected.map(c => {
    const p = PRODUCTS.find(x => x.id === c);
    const sc = Scoring.scoreFor(templates[c], data.statuses[c]);
    return `<button class="nav-item" data-c="${c}"><span class="nav-name">${p?.name || c}</span><span class="nav-score">${sc.overall}%</span></button>`;
  }).join('');
  nav.onclick = e => {
    const b = e.target.closest('[data-c]');
    if (!b) return;
    active = b.dataset.c;
    render();
  };
}

function render() {
  document.querySelectorAll('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.c === active));
  const t = templates[active];
  const panel = document.getElementById('component-panel');
  const banner = document.getElementById('banner');
  if (t?.pending_user_verification) {
    banner.className = 'card banner warn';
    banner.textContent = t.banner || 'Criteria pending official source from user.';
  } else {
    banner.className = '';
    banner.textContent = '';
  }
  const sc = Scoring.scoreFor(t, data.statuses[active]);
  panel.innerHTML = `<div class="card">
    <div class="component-header">
      <div><h2>${t.name}</h2><div class="muted">Build: —</div></div>
      <div class="component-scores">
        <div class="score-badge"><span class="score-label">HC</span><span class="score-val ${scoreClass(sc.hc)}">${sc.hc}%</span></div>
        <div class="score-badge"><span class="score-label">PU</span><span class="score-val ${scoreClass(sc.pu)}">${sc.pu}%</span></div>
      </div>
    </div>
    ${(t.sections || []).length ? accordionHtml(t) : '<p class="muted">No criteria available for this component.</p>'}
  </div>`;
  panel.querySelectorAll('.accordion-head').forEach(h => h.addEventListener('click', () => {
    const item = h.parentElement;
    const isOpen = item.classList.contains('open');
    panel.querySelectorAll('.accordion-item').forEach(i => i.classList.remove('open'));
    if (!isOpen) item.classList.add('open');
  }));
  panel.querySelectorAll('select[data-id]').forEach(s => s.addEventListener('change', async () => {
    data.statuses[active][s.dataset.id] = s.value;
    await persist();
    updateOverall();
    updateNavScore(active);
    showToast('Saved');
  }));
}

function scoreClass(v) { return v > 80 ? 'status-ok' : v >= 60 ? 'status-mid' : 'status-bad'; }

function accordionHtml(t) {
  return `<div class="accordion">${t.sections.map((s, idx) =>
    `<article class="accordion-item ${idx === 0 ? 'open' : ''}"><div class="accordion-head"><strong>${s.name}</strong><span class="chevron">›</span></div><div class="accordion-body">${(s.criteria || []).map(c => criterionHtml(c)).join('')}</div></article>`
  ).join('')}</div>`;
}

function criterionHtml(c) {
  const cis = c.cis_mapping || {};
  const cur = data.statuses[active][c.id] || 'na';
  return `<div class="criterion"><div class="criterion-main"><span class="criterion-text">${c.text}</span><span class="pill pill-${c.type.toLowerCase().replace('/', '-')}">${c.type}</span></div><div class="cis">${cis.control ? `${cis.control} · ` : ''}${cis.name || 'Operational hygiene'}</div><select data-id="${c.id}">${STATUS.map(([v, l]) => `<option value="${v}" ${cur === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>`;
}

function updateNavScore(comp) {
  const el = document.querySelector(`.nav-item[data-c="${comp}"] .nav-score`);
  if (el) { const sc = Scoring.scoreFor(templates[comp], data.statuses[comp]); el.textContent = `${sc.overall}%`; }
}

function updateOverall() {
  const selected = assessment.selected_components || [];
  let total = 0, count = 0;
  for (const c of selected) { const sc = Scoring.scoreFor(templates[c], data.statuses[c]); total += sc.overall; count++; }
  const v = count ? Math.round(total / count) : 0;
  const el = document.getElementById('overall-score');
  el.textContent = `${v}%`;
  el.className = 'score-big ' + scoreClass(v);
}

async function persist() {
  const comp = active;
  const sc = Scoring.scoreFor(templates[comp], data.statuses[comp]);
  assessment.components = { ...(assessment.components || {}), [comp]: { criteria_statuses: data.statuses[comp], hc_score: sc.hc, pu_score: sc.pu, overall_score: sc.overall } };
  await Api.updateAssessment(id, { components: assessment.components, selected_components: assessment.selected_components });
}

function bindTools() {
  document.getElementById('save-btn').onclick = async () => { await persist(); showToast('Saved'); };
  document.getElementById('export-btn').onclick = () => ExportPdf.generate(assessment, templates, data.statuses, PRODUCTS);
  const dlg = document.getElementById('component-modal');
  const mp = document.getElementById('modal-picker');
  document.getElementById('manage-components').onclick = () => {
    const set = new Set(assessment.selected_components || []);
    const draw = () => { mp.innerHTML = PRODUCTS.map(p => `<article class="pick-card ${set.has(p.id) ? 'active' : ''}" data-id="${p.id}"><div class="pick-name">${p.name}</div></article>`).join(''); };
    draw();
    mp.onclick = e => { const c = e.target.closest('[data-id]'); if (!c) return; set.has(c.dataset.id) ? set.delete(c.dataset.id) : set.add(c.dataset.id); draw(); };
    dlg.showModal();
    document.getElementById('modal-apply').onclick = async () => {
      assessment.selected_components = [...set];
      await Api.updateAssessment(id, { selected_components: assessment.selected_components });
      dlg.close(); buildNav(); active = assessment.selected_components[0]; render(); updateOverall(); showToast('Saved');
    };
    document.getElementById('modal-cancel').onclick = () => dlg.close();
  };
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2000);
}
