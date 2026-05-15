# Log360 Health Check & Product Utilization Scorecard Tool

A professional web application for ManageEngine consultants and customer success engineers to assess customer deployments of **Log360** and its components, generate scored health checks, create editable recommendations, and export shareable reports.

---

## 🚀 Quick Start

### Prerequisites
- Node.js v18+ ([download](https://nodejs.org/))
- npm v8+

### Install & Run

```bash
# 1. Install backend dependencies
cd backend
npm install

# 2. Start the server
npm start
```

Open your browser at: **http://localhost:3000**

### Development Mode (auto-restart on changes)
```bash
cd backend
npm run dev
```

---

## 📦 Project Structure

```
HealthCheckTool/
├── backend/
│   ├── server.js              # Express server entry point
│   ├── db.js                  # Database (lowdb/JSON file-based)
│   ├── healthcheck.json       # Database file (auto-created on first run)
│   ├── routes/
│   │   ├── assessments.js     # CRUD API for assessments
│   │   └── criteria.js        # Criteria template API
│   ├── data/
│   │   ├── criteria-adaudit.json        # ADAudit Plus criteria
│   │   ├── criteria-dataSecurity.json   # DataSecurity Plus criteria
│   │   ├── criteria-eventlog.json       # EventLog Analyzer criteria
│   │   ├── criteria-log360.json         # Log360 criteria
│   │   └── criteria-log360cloud.json    # Log360 Cloud criteria
│   └── package.json
├── frontend/
│   ├── index.html             # Home / landing page
│   ├── dashboard.html         # Customers dashboard
│   ├── assessment.html        # Assessment & scoring page
│   ├── css/styles.css         # Main stylesheet
│   ├── js/
│   │   ├── api.js             # Backend API client
│   │   ├── app.js             # Main assessment page logic
│   │   ├── scoring.js         # HC & PU score computation
│   │   ├── recommendations.js # Auto-recommendation engine
│   │   └── export.js          # PDF, HTML, CSV export
│   └── assets/
└── README.md
```

---

## 🎯 Components Covered

| Component | Latest Build | Key Features |
|---|---|---|
| 🛡️ **ADAudit Plus** | 7.5 (Build 7500+) | ITDR, Attack Surface Analyzer, AI Anomaly Detection, Azure AD/Entra ID, MITRE ATT&CK |
| 🔒 **DataSecurity Plus** | 6.2 (Build 6200+) | AI Content Classification, Ransomware Detection, CASB, DLP, ROT Analysis |
| 📋 **EventLog Analyzer** | 13000 Series | AI Log Parser, Enhanced Correlation, Cloud Sources, MITRE ATT&CK, Threat Intelligence |
| 🖥️ **Log360** | 13000 Series | AI Alert Investigation Agent, Zia AI, Native SOAR, Re-architected Detection, Native UEBA |
| ☁️ **Log360 Cloud** | Cloud 2025/2026 | AI Agent, SOAR Playbooks, Centralized Integrations, Agent Health Monitoring |

> **Note:** Log360 UEBA is natively integrated into Log360 in the 13000-series build — there is no separate UEBA section.

---

## 📊 How Scoring Works

### Status Values
| Status | Display | Score Weight |
|---|---|---|
| ✅ Configured | Green | 1.0 |
| ⚠️ Partially Configured | Amber | 0.5 |
| ❌ Not Configured | Red | 0.0 |
| ➖ Not Applicable | Grey | *Excluded from denominator* |

### Score Formula
```
HC% = (SUM of HC-applicable weights) / (COUNT of HC-applicable criteria) × 100
PU% = (SUM of PU-applicable weights) / (COUNT of PU-applicable criteria) × 100
```

### Criterion Types
- **HC** — Health Check: Validates that the product is correctly installed, configured, and operational
- **PU** — Product Utilization: Validates that product features are actively being used
- **PU/HC** — Both apply to this criterion

### Overall Suite Score
A weighted average across all components. Default weights are 20% per component (equal weighting). Configurable per assessment via the UI.

---

## 🔧 Updating Criteria

### Update Build Numbers
Edit the `buildInfo` section in the relevant JSON file:

```json
// backend/data/criteria-log360.json
{
  "buildInfo": {
    "latestBuild": "5.3.7 (Build 5370)",
    "releaseNotesUrl": "...",
    "documentationUrl": "..."
  }
}
```

### Add a New Criterion
Add an entry to the `criteria` array in the relevant section:

```json
{
  "id": "l360_new_001",
  "text": "New feature is configured and tested",
  "type": "PU",
  "helpLink": "https://www.manageengine.com/...",
  "recommendation": "Enable this feature by navigating to Settings > ..."
}
```

**ID naming convention:** `{component_prefix}_{section_short}_{sequence}`
- Prefixes: `adaudit_`, `dsp_`, `ela_`, `l360_`, `l360c_`
- Examples: `adaudit_itdr_001`, `l360_soar_003`, `ela_ls_004`

### Add a New Section
Add an entry to the `sections` array:

```json
{
  "id": "new_section",
  "name": "🆕 New Section Name",
  "criteria": [ ... ]
}
```

---

## 🌐 REST API Reference

### Base URL
```
http://localhost:3000/api
```

### Assessments

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/assessments` | List all assessments |
| `POST` | `/api/assessments` | Create new assessment |
| `GET` | `/api/assessments/:id` | Get single assessment |
| `PUT` | `/api/assessments/:id` | Update assessment |
| `DELETE` | `/api/assessments/:id` | Delete assessment |

#### Create Assessment (POST)
```json
{
  "customer_name": "Acme Corporation",
  "customer_domain": "acme.com",
  "assessor_name": "Jane Smith",
  "assessment_date": "2025-05-15"
}
```

#### Update Assessment (PUT)
```json
{
  "components": {
    "log360": {
      "criteria_statuses": {
        "l360_svc_001": "configured",
        "l360_ai_001": "partial"
      },
      "criteria_notes": {
        "l360_ai_001": "LLM provider configured but agent not tuned yet"
      },
      "hc_score": 72,
      "pu_score": 58
    }
  }
}
```

### Criteria

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/criteria` | List available components |
| `GET` | `/api/criteria/adaudit` | Get ADAudit Plus criteria |
| `GET` | `/api/criteria/dataSecurity` | Get DataSecurity Plus criteria |
| `GET` | `/api/criteria/eventlog` | Get EventLog Analyzer criteria |
| `GET` | `/api/criteria/log360` | Get Log360 criteria |
| `GET` | `/api/criteria/log360cloud` | Get Log360 Cloud criteria |

---

## 📤 Export Formats

### HTML Export
- Standalone self-contained HTML file
- Professional branded layout
- Includes all criteria, statuses, notes, and recommendations
- Can be emailed directly to customers
- Opens in any modern browser

### CSV Export
- Full criteria-level breakdown
- Columns: Customer, Component, Section, Criteria ID, Text, Type, Status, HC/PU flags, Notes, Recommendation
- Compatible with Excel, Google Sheets, and BI tools

### PDF Export
- Uses browser print functionality
- Open the HTML export and print to PDF for best quality
- Or use the browser's built-in PDF export from the assessment page (Ctrl+P)

---

## 🏗️ Architecture

```
Browser → Express Server (port 3000)
              ├── GET /api/criteria/:comp  → Read JSON files from backend/data/
              ├── GET/POST/PUT/DELETE /api/assessments → lowdb JSON database
              └── Static files → frontend/
```

**Database:** `backend/healthcheck.json` (auto-created, JSON file-based via lowdb)
- No external database required
- Easy to backup (just copy the JSON file)
- Easy to migrate (copy to new server)

---

## 🔒 Security Considerations

- This tool is designed for **internal consultant use** — do not expose it directly to the internet
- For external sharing, use the HTML/PDF export functionality
- The database file (`healthcheck.json`) contains customer assessment data — protect it accordingly
- For production deployment, add authentication middleware and HTTPS termination

---

## 📝 Changelog

### v1.0.0 (2025-05)
- Initial release with all 5 components
- Full HC & PU scoring with configurable weights
- Auto-generated expert recommendations
- Export to HTML, CSV
- Multi-customer backend with CRUD
- Customers dashboard with search and filtering

---

## 🤝 Contributing

To add new criteria or update build information:
1. Edit the relevant JSON file in `backend/data/`
2. Follow the existing naming conventions
3. Add proper `helpLink` URLs pointing to official ManageEngine documentation
4. Write actionable `recommendation` text (specific steps, navigation paths, best practice references)

---

*Built for ManageEngine Log360 Customer Success Engineering*

