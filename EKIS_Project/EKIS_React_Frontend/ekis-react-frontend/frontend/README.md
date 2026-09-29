# EKIS React Frontend

React/Vite frontend for the EKIS Enterprise Knowledge Intelligence System.

## 1. Project layout

The frontend and backend are separate applications in this repository:

This service lives in `frontend/`; the FastAPI service is a sibling directory at `../backend/`.

## 2. Frontend setup

```bash
npm install
copy .env.example .env
npm run dev
```

On macOS/Linux use:

```bash
cp .env.example .env
```

Set the backend URL in `.env`:

```env
VITE_API_BASE_URL=/api/v1
```

For local development, use `VITE_API_BASE_URL=/api/v1`. Vite proxies `/api` to `http://127.0.0.1:8000`, so browser requests remain same-origin and do not trigger CORS errors.

Run the frontend from this directory:

```bash
npm run dev
```

## 3. Backend setup

See [backend/README.md](backend/README.md). In a second terminal:

```powershell
cd backend
py -3 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

The frontend Axios client is already configured for `http://127.0.0.1:8000/api/v1` and attaches the JWT returned by `/auth/login`.

## 4. Backend API contract used

- POST `/auth/login`
- POST `/auth/register`
- POST `/chat/query`
- POST `/search/semantic`
- POST `/documents/upload`
- GET `/documents/list`
- DELETE `/documents/{id}`
- GET `/analytics/dashboard`
- GET `/admin/users`

JWT is attached through an Axios request interceptor.

The frontend does not send `company_id` for normal operations.

## 5. Upload

The upload modal sends `multipart/form-data`:

- `department_id`
- `file`

Allowed file types: PDF, TXT, CSV, DOCX.
Maximum frontend-validated size: 50 MB.

The backend remains authoritative for validation.

## 6. Notes about undocumented backend contracts

The supplied requirements specify no department-list endpoint and no settings update endpoint. Therefore:
- Upload asks for `department_id` rather than inventing a department API.
- Settings controls are displayed but not falsely connected to nonexistent APIs.
- Dashboard/analytics use the fields returned by the backend where recognizable; missing values display `—` instead of fake business data.

If your actual FastAPI response field names differ, update the small mapping sections in the relevant page.

## 7. Structure

```text
src/
├── api/
│   ├── client.js
│   ├── auth.js
│   ├── documents.js
│   ├── chat.js
│   ├── search.js
│   ├── analytics.js
│   └── admin.js
├── components/
├── context/
├── pages/
├── App.jsx
├── main.jsx
└── styles.css
```
