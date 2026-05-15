const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const path = require('path');

const DB_PATH = path.join(__dirname, 'healthcheck.json');

let db;

function getDb() {
  if (!db) {
    const adapter = new FileSync(DB_PATH);
    db = low(adapter);
    db.defaults({ assessments: [] }).write();
  }
  return db;
}

module.exports = { getDb };
