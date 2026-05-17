# HCT v3 — Health Check Tool

## Run

```bash
cd backend
npm install
npm start
```

Open `http://localhost:3000`.

## v3 structure

- Wizard flow:
  - `frontend/index.html` (landing)
  - `frontend/customer-details.html` (step 1)
  - `frontend/product-picker.html` (step 2)
  - `frontend/assessment.html` (step 3)
- Criteria files:
  - `backend/data/criteria-adaudit.json`
  - `backend/data/criteria-dataSecurity.json`
  - `backend/data/criteria-eventlog.json`
  - `backend/data/criteria-log360.json`
  - `backend/data/criteria-ad360.json`
  - `backend/data/criteria-admanager.json`
  - `backend/data/criteria-adselfservice.json`
  - `backend/data/criteria-m365manager.json`
  - `backend/data/criteria-recoverymanager.json`
  - `backend/data/criteria-exchangereporter.json`
  - `backend/data/criteria-sharepointmanager.json` (placeholder)
  - `backend/data/criteria-log360cloud.json` (placeholder)

## Notes

- Build values are intentionally blank and rendered as `Build: —`.
- Help links are left blank unless verified.
- Placeholder components are flagged with `pending_user_verification: true`.
- Unverified doc targets are tracked in `docs-to-verify.md`.
