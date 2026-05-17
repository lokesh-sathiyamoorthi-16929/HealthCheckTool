const Api={
  async listAssessments(){const r=await fetch('/api/assessments');if(!r.ok)throw new Error('Failed');return r.json();},
  async getAssessment(id){const r=await fetch(`/api/assessments/${id}`);if(!r.ok)throw new Error('Failed');return r.json();},
  async createAssessment(payload){const r=await fetch('/api/assessments',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});if(!r.ok)throw new Error(await r.text());return r.json();},
  async updateAssessment(id,payload){const r=await fetch(`/api/assessments/${id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});if(!r.ok)throw new Error(await r.text());return r.json();},
  async getCriteria(component){const r=await fetch(`/api/criteria/${component}`);if(!r.ok)throw new Error(`Missing ${component}`);return r.json();}
};
