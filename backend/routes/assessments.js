const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db');

// GET /api/assessments — list all assessments
router.get('/', (req, res) => {
  try {
    const db = getDb();
    const assessments = db.get('assessments').value();

    const result = assessments
      .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
      .map(a => {
        const components = a.components || {};
        const weights = a.component_weights || {};

        let totalWeight = 0, weightedHc = 0, weightedPu = 0;
        for (const [comp, data] of Object.entries(components)) {
          const w = weights[comp] || 20;
          totalWeight += w;
          weightedHc += (data.hc_score || 0) * w;
          weightedPu += (data.pu_score || 0) * w;
        }

        return {
          id: a.id,
          customer_name: a.customer_name,
          customer_domain: a.customer_domain,
          assessor_name: a.assessor_name,
          assessment_date: a.assessment_date,
          created_at: a.created_at,
          updated_at: a.updated_at,
          overall_hc_score: totalWeight > 0 ? Math.round(weightedHc / totalWeight) : 0,
          overall_pu_score: totalWeight > 0 ? Math.round(weightedPu / totalWeight) : 0,
          component_count: Object.keys(components).length
        };
      });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/assessments — create new assessment
router.post('/', (req, res) => {
  try {
    const db = getDb();
    const { customer_name, customer_domain, assessor_name, assessment_date, component_weights } = req.body;

    if (!customer_name) {
      return res.status(400).json({ error: 'customer_name is required' });
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    const assessment = {
      id,
      customer_name,
      customer_domain: customer_domain || '',
      assessor_name: assessor_name || '',
      assessment_date: assessment_date || now.split('T')[0],
      component_weights: component_weights || { adaudit: 20, dataSecurity: 20, eventlog: 20, log360: 20, log360cloud: 20 },
      components: {},
      created_at: now,
      updated_at: now
    };

    db.get('assessments').push(assessment).write();

    res.status(201).json({ id, message: 'Assessment created' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/assessments/:id — get single assessment
router.get('/:id', (req, res) => {
  try {
    const db = getDb();
    const assessment = db.get('assessments').find({ id: req.params.id }).value();

    if (!assessment) {
      return res.status(404).json({ error: 'Assessment not found' });
    }

    res.json(assessment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/assessments/:id — update assessment
router.put('/:id', (req, res) => {
  try {
    const db = getDb();
    const existing = db.get('assessments').find({ id: req.params.id }).value();

    if (!existing) {
      return res.status(404).json({ error: 'Assessment not found' });
    }

    const now = new Date().toISOString();
    const updates = { ...req.body, updated_at: now };

    // Merge components rather than replace if only partial update
    if (req.body.components && existing.components) {
      updates.components = { ...existing.components, ...req.body.components };
    }

    db.get('assessments')
      .find({ id: req.params.id })
      .assign(updates)
      .write();

    res.json({ message: 'Assessment updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/assessments/:id — delete assessment
router.delete('/:id', (req, res) => {
  try {
    const db = getDb();
    const existing = db.get('assessments').find({ id: req.params.id }).value();

    if (!existing) {
      return res.status(404).json({ error: 'Assessment not found' });
    }

    db.get('assessments').remove({ id: req.params.id }).write();

    res.json({ message: 'Assessment deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
