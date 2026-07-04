# Lost and Found

Project workspace layout:

```text
Lost_and_Found/
  frontend/   React 18 + TypeScript + Vite mobile web app
  backend/    Backend service workspace and Python virtual environment
  database/   Database schema, migrations, seed data, and related notes
```

Frontend uses Node.js dependencies from `frontend/node_modules`; it does not need a Python virtual environment.

Backend Python virtual environment:

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
```

Frontend commands:

```powershell
cd frontend
npm install
npm run dev
```
