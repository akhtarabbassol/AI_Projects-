# EKIS Full Stack

EKIS is split into two separate applications:

```text
ekis-react-frontend/
├── frontend/    # React + Vite application
└── backend/     # FastAPI application
```

## Run frontend

```powershell
cd frontend
npm install
Copy-Item .env.example .env
npm run dev
```

Frontend URL: `http://127.0.0.1:5173/`

## Run backend

Open a second terminal:

```powershell
cd backend
py -3 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
uvicorn main:app --reload --port 8000
```

Backend URL: `http://127.0.0.1:8000/`

## Run both together

From the project root, run:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\run-all.ps1
```

This opens separate PowerShell windows for the backend and frontend. The backend window runs `backend/run.ps1`; the frontend window runs the Vite app from `frontend/`.

The frontend is configured to call `http://127.0.0.1:8000/api/v1`. See [frontend/README.md](frontend/README.md) and [backend/README.md](backend/README.md) for service details.
