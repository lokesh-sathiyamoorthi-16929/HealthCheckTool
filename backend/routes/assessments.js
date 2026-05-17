const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db');

const DEFAULT_COMPONENTS = [
  'adaudit',
  'dataSecurity',
  'eventlog',
  'log360',
  'ad360',
  'admanager',
  'adselfservice',
  'm365manager',
  'recoverymanager',
  'exchangereporter',
  'sharepointmanager',
  'log360cloud'
];

const DEFAULT_WEIGHTS = DEFAULT_COMPONENTS.reduce((acc, key) => {
  acc[key] = 1;
  return acc;
}, {});

router.get('/', (req, res) => {
  try {
    const db = getDb();
    const assessments = db.get('assessments').value();

    const result = assessments
      .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
      .map(a => {
        const components = a.components || {};
        const weights = a.component_weights || DEFAULT_WEIGHTS;

        let totalWeight = 0, weightedOverall = 0;
        for (const [comp, data] of Object.entries(components)) {
          const w = weights[comp] || 1;
          totalWeight += w;
          weightedOverall += (data.overall_score || 0) * w;
        }

        return {
          id: a.id,
          customer_name: a.customer_name,
          customer_domain: a.customer_domain,
          assessor_name: a.assessor_name,
          assessment_date: a.assessment_date,
          created_at: a.created_at,
          updated_at: a.updated_at,
          overall_score: totalWeight > 0 ? Math.round(weightedOverall / totalWeight) : 0,
          component_count: Object.keys(components).length
        };
      });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', (req, res) => {
  try {
    const db = getDb();
    const { customer_name, customer_domain, assessor_name, assessment_date, component_weights, selected_components } = req.body;

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
      component_weights: component_weights || DEFAULT_WEIGHTS,
      selected_components: selected_components || DEFAULT_COMPONENTS,
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

router.put('/:id', (req, res) => {
  try {
    const db = getDb();
    const existing = db.get('assessments').find({ id: req.params.id }).value();

    if (!existing) {
      return res.status(404).json({ error: 'Assessment not found' });
    }

    const now = new Date().toISOString();
    const updates = { ...req.body, updated_at: now };

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
