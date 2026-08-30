# LexiLand Deployment Setup

This guide explains how to clone and run the LexiLand Dyslexia Research Project on Windows using Git Bash.

The application has three local runtime parts:

- `backend/`: Node.js, Express, and MongoDB API
- `frontend/`: React and Vite web application
- `.venv/`: Python environment used by Whisper ASR and the pronunciation-support model

## 1. Prerequisites

Install the following software before cloning the project:

- Git for Windows, including Git Bash
- Node.js `20.19+` or `22.12+` with npm
- Python `3.10`, `3.11`, or `3.12`
- MongoDB Community Server, or access to a MongoDB Atlas database
- A Chromium-based browser with microphone access

Confirm the installations in Git Bash:

```bash
git --version
node --version
npm --version
py --list
```

## 2. Clone the Deployment Branch

Open Git Bash in the folder where you want to keep the project, then run:

```bash
git clone --branch deployment --single-branch https://github.com/MrAlfaa/Dyslexia-Web-Application.git
cd Dyslexia-Web-Application
git branch --show-current
```

The final command should print:

```text
deployment
```

If the repository is already cloned, update it with:

```bash
git fetch origin
git switch deployment
git pull --ff-only origin deployment
```

## 3. Install Node.js Dependencies

Run these commands from the repository root:

```bash
npm --prefix backend install
npm --prefix frontend install
```

## 4. Create the Python Environment

Run these commands from the repository root:

```bash
py -3.10 -m venv .venv
source .venv/Scripts/activate
python -m pip install --upgrade pip
python -m pip install -r backend/src/modules/speechProcessing/ml/requirements.txt
```

If Python 3.10 is unavailable, use Python 3.11 or 3.12 instead.

Download the small English Whisper model once so the first child recording does not wait for the model download:

```bash
python -c "from faster_whisper import WhisperModel; WhisperModel('tiny.en', device='cpu', compute_type='int8')"
deactivate
```

## 5. Configure the Backend

Create the local backend environment file:

```bash
touch backend/.env
notepad backend/.env
```

Add the following configuration and replace the example MongoDB URI and JWT secret:

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/lexiland
JWT_SECRET=replace_with_a_long_random_secret

PYTHON_BIN=.venv/Scripts/python.exe
WHISPER_MODEL_SIZE=tiny.en
WHISPER_DEVICE=cpu
WHISPER_COMPUTE_TYPE=int8
WHISPER_TIMEOUT_MS=45000

MEDIA_STORAGE_PROVIDER=local
SPEECH_BACKGROUND_PROCESSING=true
SPEECH_ASR_SYNC_MODE=background
PRONUNCIATION_MODEL_CALIBRATED=false
LEXILAND_DEV_UNLOCK=false
```

Important:

- Never commit `backend/.env`.
- Keep `PRONUNCIATION_MODEL_CALIBRATED=false` until the model has passed a speaker-disjoint calibration audit.
- Keep `LEXILAND_DEV_UNLOCK=false` for normal use. Training activities unlock after identification.
- For MongoDB Atlas, replace `MONGO_URI` with the Atlas connection string.
- The default local media provider stores recordings under `backend/uploads/`, which is ignored by Git.

For an existing database created before the speech snapshot revision feature, run this migration once:

```bash
cd backend
npm run migrate:speech-snapshots
cd ..
```

## 6. Start the Backend: Terminal 1

Open the first Git Bash terminal and run:

```bash
cd /path/to/Dyslexia-Web-Application
cd backend
npm start
```

Replace `/path/to/Dyslexia-Web-Application` with the location where the repository was cloned.

Expected output:

```text
MongoDB Connected
Server running on port 5000
```

Keep Terminal 1 open while using the application.

## 7. Start the Frontend: Terminal 2

Open a second Git Bash terminal and run:

```bash
cd /path/to/Dyslexia-Web-Application
cd frontend
npm run dev -- --host 127.0.0.1 --port 5173
```

Open this URL in Chrome or Edge:

```text
http://127.0.0.1:5173
```

Keep Terminal 2 open while using the application.

## 8. Verify the Installation

Run backend tests from a separate Git Bash terminal:

```bash
cd /path/to/Dyslexia-Web-Application/backend
npm test
```

Verify the frontend production build:

```bash
cd /path/to/Dyslexia-Web-Application/frontend
npm run build
```

Verify the Python ML runtime:

```bash
cd /path/to/Dyslexia-Web-Application
.venv/Scripts/python.exe -c "import numpy, pandas, librosa, soundfile, sklearn, joblib; print('ML runtime OK')"
.venv/Scripts/python.exe backend/src/modules/speechProcessing/ml/predict_pronunciation_support.py --help
```

## 9. First Manual Test

1. Open `http://127.0.0.1:5173`.
2. Register or log in as a guardian.
3. Create a child profile.
4. Log in with the child username.
5. Complete Leo's identification activity.
6. Confirm that the Training Safari unlocks.
7. Record one improvement activity and confirm that valid speech advances while empty or invalid audio requests a retry.
8. Return to the Guardian Console and verify Identification Result, Improvement Progress, Speech Support Results, and Session History.

## 10. Troubleshooting

### MongoDB connection error

Confirm that MongoDB is running and that `MONGO_URI` in `backend/.env` is valid.

### `spawn .venv/Scripts/python.exe ENOENT`

The root Python environment is missing. From the repository root, run:

```bash
py -3.10 -m venv .venv
source .venv/Scripts/activate
python -m pip install -r backend/src/modules/speechProcessing/ml/requirements.txt
```

### Microphone permission denied

Open the application through `http://127.0.0.1:5173` or `http://localhost:5173`, then allow microphone access in the browser site settings.

### Port already in use

Stop the older Node.js or Vite process using that port. The backend expects port `5000`, and the documented frontend URL uses port `5173`.

### Whisper is slow on the first recording

Run the one-time Whisper download command in Section 4 before testing. Later recordings use the local model cache.

## 11. Stop the Application

Press `Ctrl+C` once in Terminal 1 and Terminal 2.
