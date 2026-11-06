# BrandGuard AI — Team Hack a thon 💀
*One Brand DNA. Two layers of protection. Zero guesswork.*

Team: George Stephenson Kundu (lead, backend, architecture) · Aanchal Srivastav (AI, RAG, claim verification) · Samiya Ali (frontend, UI/UX)

## Status (honest)
| Part | Status |
|---|---|
| FastAPI backend: Brand DNA, Prevent, Campaign DNA compare, reviews, stats | Built, 2 automated tests pass |
| Deterministic checks (brand name, prohibited words, superlatives, guarantees, terminology) | Built, tested |
| React + Tailwind frontend (Dashboard, Brand DNA, Prevent, Results, Protect, Campaign DNA, History, Settings) | Built. Production build passes; every API call the pages make was verified through the dev proxy |
| Gemini contextual analysis + simple RAG retrieval | Code written, **not tested live** (needs your key) |
| Firestore storage | Code written, **not tested live** (needs your credentials). In-memory fallback is tested |
| Protect image analysis: OCR (RapidOCR), detail extraction, comparison with Brand/Campaign DNA | Built. Tested with generated images (real OCR) and through the frontend proxy |
| Protect Gemini Vision (observations + findings) | Code written; request/response handling tested with a **mocked** HTTP call, **not tested live** (needs your key) |
| Logo authenticity / visual forgery detection | **Not built.** No reference-logo comparison exists, and the UI says so |
| Browser click-through testing of the UI | **Not done** (only build + API round trips were verified) |
| Deployment, GitHub repo, updated PDF | **Not done** (need your accounts) |

Without `GEMINI_API_KEY` results are labelled `rules-only (demo)`. Without `FIREBASE_CREDENTIALS` data is kept in memory and is lost when the backend restarts. The Settings page shows both.

## Image analysis (Protect)
`POST /api/protect/analyse-image` (multipart: `file`, optional `approved_discount`, `approved_website`). PNG/JPEG/WebP, max 5 MB. Steps: validate → OCR → extract discounts and websites → compare with approved values and Brand DNA → Gemini Vision (only if `GEMINI_API_KEY` is set). Findings come only from OCR text, comparisons with your saved values, or the Gemini response; nothing is simulated. Unreadable images return a clear error. OCR can misread characters, so always have a person verify. Python 3.11 or 3.12 is recommended (the OCR runtime needs a compatible wheel).

## Run on Windows (two terminals)
Install once: **Python 3.11+** (tick "Add python.exe to PATH") from python.org, and **Node.js 20 LTS** from nodejs.org. Then open the project folder in File Explorer, click the address bar, type `powershell` and press Enter.

**Terminal 1: backend**
```
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload
```
If PowerShell blocks the activate script, run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` once and retry. API docs: http://127.0.0.1:8000/docs

**Terminal 2: frontend** (open a new PowerShell in the project folder)
```
cd frontend
npm install
npm run dev
```
Open **http://localhost:5173**. Keep both terminals open.

First test: Brand DNA → Load ABC Technologies sample → Save → Prevent → Example content → Analyse Content.

Optional: put your key in `backend\.env` (`GEMINI_API_KEY=...`) and restart the backend. Run backend tests: `python -m pytest tests` from the project folder.

## Push to GitHub
```
git init && git add . && git commit -m "BrandGuard AI backend"
git branch -M main && git remote add origin <YOUR_REPO_URL> && git push -u origin main
```
