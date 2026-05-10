# LexiLand Dyslexia Research Project Setup Guide

This guide explains how to set up and run the LexiLand / Dyslexia Research Project on Windows using both PowerShell and Git Bash.

The project has three local parts:

- `backend/` - Node.js / Express / MongoDB API
- `frontend/` - React / Vite web application
- `.venv/` - Python virtual environment for Speech Processing ML audio model dependencies

## 1. Prerequisites

Install these first:

- Node.js LTS with npm
- MongoDB running locally or a MongoDB Atlas connection string
- Python 3.10, 3.11, or 3.12 for the Speech Processing ML dependencies
- Git Bash for Git Bash commands

This machine also has Python 3.14, but the project `.venv` was created with Python 3.10 because the current audio/ML package stack is more reliable on Python 3.10.

## 2. Project Location

PowerShell:

```powershell
cd "E:\PROJECTS\Out Source Project\Dyslexia-Research-Project"
```

Git Bash:

```bash
cd "/e/PROJECTS/Out Source Project/Dyslexia-Research-Project"
```

Note: in Git Bash, use `cd ..` with a space. Do not use `cd..`.

## 3. Backend Environment File

Create or update:

```text
backend/.env
```

Required backend variables:

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/lexiland
JWT_SECRET=replace_with_a_secure_local_secret
```

Optional Speech Processing variables:

```env
PYTHON_BIN=E:\PROJECTS\Out Source Project\Dyslexia-Research-Project\.venv\Scripts\python.exe
LEXILAND_PRONUNCIATION_MODEL_DIR=E:\PROJECTS\Out Source Project\Dyslexia-Research-Project\ML_Model\lexiland_pronunciation_support_model_artifacts
LEXILAND_DEV_UNLOCK=true
```

`LEXILAND_DEV_UNLOCK=true` is only for local testing of Leo's Training Safari. Do not use it as a production rule.

## 4. Frontend Environment File

If needed, create:

```text
frontend/.env.local
```

Optional local frontend variable:

```env
VITE_LEXILAND_DEV_UNLOCK=true
```

## 5. Create Python Virtual Environment

The project uses `.venv` at the repo root for Speech Processing ML dependencies.

PowerShell:

```powershell
cd "E:\PROJECTS\Out Source Project\Dyslexia-Research-Project"
py -3.10 -m venv .venv
.\.venv\Scripts\python.exe -m pip install --upgrade pip
.\.venv\Scripts\python.exe -m pip install -r backend\src\modules\speechProcessing\ml\requirements.txt
```

If PowerShell blocks activation scripts:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
```

Git Bash:

```bash
cd "/e/PROJECTS/Out Source Project/Dyslexia-Research-Project"
py -3.10 -m venv .venv
source .venv/Scripts/activate
python -m pip install --upgrade pip
python -m pip install -r backend/src/modules/speechProcessing/ml/requirements.txt
```

If `py -3.10` is not available, install Python 3.10, 3.11, or 3.12 and recreate the `.venv`.

## 6. Install Backend Dependencies

PowerShell:

```powershell
cd "E:\PROJECTS\Out Source Project\Dyslexia-Research-Project\backend"
npm.cmd install
```

Git Bash:

```bash
cd "/e/PROJECTS/Out Source Project/Dyslexia-Research-Project/backend"
npm.cmd install
```

## 7. Install Frontend Dependencies

PowerShell:

```powershell
cd "E:\PROJECTS\Out Source Project\Dyslexia-Research-Project\frontend"
npm.cmd install
```

Git Bash:

```bash
cd "/e/PROJECTS/Out Source Project/Dyslexia-Research-Project/frontend"
npm.cmd install
```

## 8. Run Backend

Open a terminal for the backend.

PowerShell:

```powershell
cd "E:\PROJECTS\Out Source Project\Dyslexia-Research-Project"
$env:PYTHON_BIN = "$PWD\.venv\Scripts\python.exe"
cd backend
npm.cmd start
```

Git Bash:

```bash
cd "/e/PROJECTS/Out Source Project/Dyslexia-Research-Project"
export PYTHON_BIN="$PWD/.venv/Scripts/python.exe"
cd backend
npm.cmd start
```

Expected output:

```text
MongoDB Connected
Server running on port 5000
```

## 9. Run Frontend

Open a second terminal for the frontend.

PowerShell:

```powershell
cd "E:\PROJECTS\Out Source Project\Dyslexia-Research-Project\frontend"
npm.cmd run dev -- --host 127.0.0.1 --port 5173
```

Git Bash:

```bash
cd "/e/PROJECTS/Out Source Project/Dyslexia-Research-Project/frontend"
npm.cmd run dev -- --host 127.0.0.1 --port 5173
```

Open:

```text
http://127.0.0.1:5173
```

## 10. Build and Import Verification

Backend import check:

PowerShell:

```powershell
cd "E:\PROJECTS\Out Source Project\Dyslexia-Research-Project\backend"
node -e "require('./src/app'); console.log('backend app import ok'); process.exit(0)"
```

Git Bash:

```bash
cd "/e/PROJECTS/Out Source Project/Dyslexia-Research-Project/backend"
node -e "require('./src/app'); console.log('backend app import ok'); process.exit(0)"
```

Frontend build check:

PowerShell:

```powershell
cd "E:\PROJECTS\Out Source Project\Dyslexia-Research-Project\frontend"
npm.cmd run build
```

Git Bash:

```bash
cd "/e/PROJECTS/Out Source Project/Dyslexia-Research-Project/frontend"
npm.cmd run build
```

Python ML dependency check:

PowerShell:

```powershell
cd "E:\PROJECTS\Out Source Project\Dyslexia-Research-Project"
.\.venv\Scripts\python.exe -c "import numpy, pandas, librosa, soundfile, sklearn, joblib; print('ml deps import ok')"
.\.venv\Scripts\python.exe backend\src\modules\speechProcessing\ml\predict_pronunciation_support.py --help
```

Git Bash:

```bash
cd "/e/PROJECTS/Out Source Project/Dyslexia-Research-Project"
source .venv/Scripts/activate
python -c "import numpy, pandas, librosa, soundfile, sklearn, joblib; print('ml deps import ok')"
python backend/src/modules/speechProcessing/ml/predict_pronunciation_support.py --help
```

## 11. Browser Manual Test Checklist

After backend and frontend are running:

1. Open `http://127.0.0.1:5173`.
2. Confirm the LexiLand frontend loads without a blank screen.
3. Log in as a guardian and open the Guardian Console.
4. Check:
   - My Children
   - Subscription
   - Speech Overview
   - Identification Result
   - Improvement Progress
   - Session History
5. Log in as a child.
6. Open Leo's Sound Safari.
7. Open Leo's First Sound Check.
8. Click the Start button and confirm the game modal opens.
9. Record an audio attempt.
10. Confirm invalid audio gives a child-safe retry message and valid audio moves to the next level.
11. Open Leo's Training Safari and confirm the activity map/game UI loads.

## 12. Common Troubleshooting

### MongoDB connection fails

Check `backend/.env`:

```env
MONGO_URI=mongodb://127.0.0.1:27017/lexiland
```

Make sure MongoDB is running, or replace the value with a valid Atlas connection string.

### `npm` command is blocked in PowerShell

Use `npm.cmd` instead of `npm`.

### Python ML packages fail to install

Use Python 3.10, 3.11, or 3.12. Then recreate `.venv`:

```powershell
Remove-Item -Recurse -Force .venv
py -3.10 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend\src\modules\speechProcessing\ml\requirements.txt
```

### Microphone does not work in the browser

Use `http://127.0.0.1:5173` or `http://localhost:5173`. Modern browsers allow microphone access on localhost, but may block it on arbitrary insecure origins.

### Speech model does not run

Confirm the model artifacts exist under:

```text
ML_Model/lexiland_pronunciation_support_model_artifacts/
```

Then confirm `PYTHON_BIN` points to the `.venv` Python executable.

### Frontend dependency audit warnings

Run this to inspect them:

```powershell
cd "E:\PROJECTS\Out Source Project\Dyslexia-Research-Project\frontend"
npm.cmd audit
```

Do not run forced dependency upgrades without checking for React/Vite breaking changes.

