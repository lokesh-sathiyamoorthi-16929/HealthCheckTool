/**
 * api.js — Centralized API calls to the backend
 */

const API_BASE = '/api';

const Api = {
  async request(method, path, body) {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    if (body) opts.body = JSON.stringify(body);

    const resp = await fetch(API_BASE + path, opts);
    const data = await resp.json();

    if (!resp.ok) {
      throw new Error(data.error || `HTTP ${resp.status}`);
    }
    return data;
  },

  // Assessments
  listAssessments()             { return this.request('GET',    '/assessments'); },
  createAssessment(data)        { return this.request('POST',   '/assessments', data); },
  getAssessment(id)             { return this.request('GET',    `/assessments/${id}`); },
  updateAssessment(id, data)    { return this.request('PUT',    `/assessments/${id}`, data); },
  deleteAssessment(id)          { return this.request('DELETE', `/assessments/${id}`); },

  // Criteria templates
  getCriteria(component)        { return this.request('GET',    `/criteria/${component}`); },
  listComponents()              { return this.request('GET',    '/criteria'); },
};

window.Api = Api;
