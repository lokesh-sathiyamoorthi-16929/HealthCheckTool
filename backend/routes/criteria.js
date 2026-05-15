const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, '../data');

const COMPONENT_FILES = {
  adaudit: 'criteria-adaudit.json',
  dataSecurity: 'criteria-dataSecurity.json',
  eventlog: 'criteria-eventlog.json',
  log360: 'criteria-log360.json',
  log360cloud: 'criteria-log360cloud.json'
};

// GET /api/criteria/:component
router.get('/:component', (req, res) => {
  const { component } = req.params;
  const filename = COMPONENT_FILES[component];

  if (!filename) {
    return res.status(404).json({
      error: `Unknown component: ${component}. Valid components: ${Object.keys(COMPONENT_FILES).join(', ')}`
    });
  }

  const filePath = path.join(DATA_DIR, filename);

  try {
    const data = fs.readFileSync(filePath, 'utf8');
    res.json(JSON.parse(data));
  } catch (err) {
    res.status(500).json({ error: `Failed to load criteria for ${component}: ${err.message}` });
  }
});

// GET /api/criteria — list all available components
router.get('/', (req, res) => {
  res.json({
    components: Object.keys(COMPONENT_FILES),
    descriptions: {
      adaudit: 'ADAudit Plus - Active Directory Auditing',
      dataSecurity: 'DataSecurity Plus - Data Loss Prevention & File Security',
      eventlog: 'EventLog Analyzer - Log Management & SIEM (Build 13000 series)',
      log360: 'Log360 - Unified SIEM with UEBA (Build 13000 series)',
      log360cloud: 'Log360 Cloud - Cloud-native SIEM'
    }
  });
});

module.exports = router;
