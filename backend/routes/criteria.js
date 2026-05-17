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
  log360cloud: 'criteria-log360cloud.json',
  ad360: 'criteria-ad360.json',
  admanager: 'criteria-admanager.json',
  adselfservice: 'criteria-adselfservice.json',
  m365manager: 'criteria-m365manager.json',
  recoverymanager: 'criteria-recoverymanager.json',
  exchangereporter: 'criteria-exchangereporter.json',
  sharepointmanager: 'criteria-sharepointmanager.json'
};

const descriptions = {
  adaudit: 'ADAudit Plus',
  dataSecurity: 'DataSecurity Plus',
  eventlog: 'EventLog Analyzer',
  log360: 'Log360',
  log360cloud: 'Log360 Cloud (placeholder criteria)',
  ad360: 'AD360',
  admanager: 'ADManager Plus',
  adselfservice: 'ADSelfService Plus',
  m365manager: 'M365 Manager Plus',
  recoverymanager: 'RecoveryManager Plus',
  exchangereporter: 'Exchange Reporter Plus',
  sharepointmanager: 'SharePoint Manager Plus (placeholder criteria)'
};

router.get('/:component', (req, res) => {
  const { component } = req.params;
  const filename = COMPONENT_FILES[component];

  if (!filename) {
    return res.status(404).json({
      error: `Unknown component: ${component}. Valid components: ${Object.keys(COMPONENT_FILES).join(', ')}`
    });
  }

  try {
    const data = fs.readFileSync(path.join(DATA_DIR, filename), 'utf8');
    res.json(JSON.parse(data));
  } catch (err) {
    res.status(500).json({ error: `Failed to load criteria for ${component}: ${err.message}` });
  }
});

router.get('/', (req, res) => {
  res.json({
    components: Object.keys(COMPONENT_FILES),
    descriptions
  });
});

module.exports = router;
