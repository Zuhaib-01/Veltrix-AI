# Veltrix AI - Deployment Guide

## Architecture

```
Chrome Extension  -->  FastAPI Backend  -->  ML Model (model.pkl)
    (Gmail UI)          (REST API)           (TF-IDF + LogReg)
```

---

## 1. Backend Deployment

### Prerequisites

- Python 3.10+
- pip / virtualenv

### Local Development

```bash
cd veltrix-backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
# venv\Scripts\activate   # Windows

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env:
#   ENV=development
#   PORT=8000
#   HOST=0.0.0.0

# Train the ML model (first time only)
python ml_training/train_model.py

# Start the server
python main.py
```

The API will be available at `http://localhost:8000`.

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MODEL_PATH` | `./ml_models/model.pkl` | Path to trained model |
| `VECTORIZER_PATH` | `./ml_models/vectorizer.pkl` | Path to TF-IDF vectorizer |
| `HOST` | `0.0.0.0` | Server bind address |
| `PORT` | `8000` | Server port |
| `ENV` | `development` | `development` or `production` |
| `ALLOWED_ORIGINS` | `http://localhost:3000` | Comma-separated CORS origins |

### Production Deployment (VPS / Cloud)

1. **Provision a server** (Ubuntu 22.04+ recommended)

2. **Install Python and dependencies:**
   ```bash
   sudo apt update && sudo apt install python3.10 python3.10-venv python3-pip
   ```

3. **Clone and setup:**
   ```bash
   git clone <your-repo> veltrix
   cd veltrix/veltrix-backend
   python3.10 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

4. **Configure for production:**
   ```bash
   cp .env.example .env
   ```
   Edit `.env`:
   ```
   ENV=production
   PORT=8000
   HOST=0.0.0.0
   ALLOWED_ORIGINS=chrome-extension://*
   ```

5. **Train the model** (if not already trained):
   ```bash
   python ml_training/train_model.py
   ```

6. **Run with systemd:**

   Create `/etc/systemd/system/veltrix.service`:
   ```ini
   [Unit]
   Description=Veltrix AI API
   After=network.target

   [Service]
   User=ubuntu
   WorkingDirectory=/home/ubuntu/veltrix/veltrix-backend
   Environment=PATH=/home/ubuntu/veltrix/veltrix-backend/venv/bin
   ExecStart=/home/ubuntu/veltrix/veltrix-backend/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000
   Restart=always
   RestartSec=3

   [Install]
   WantedBy=multi-user.target
   ```

   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable veltrix
   sudo systemctl start veltrix
   ```

7. **Reverse proxy with Nginx:**

   ```nginx
   server {
       listen 443 ssl;
       server_name api.yourdomain.com;

       ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
       ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;

       location / {
           proxy_pass http://127.0.0.1:8000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```

   ```bash
   sudo apt install nginx certbot python3-certbot-nginx
   sudo certbot --nginx -d api.yourdomain.com
   sudo systemctl restart nginx
   ```

### Docker Deployment (Alternative)

Create `Dockerfile` in `veltrix-backend/`:
```dockerfile
FROM python:3.10-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .

EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

```bash
docker build -t veltrix-api .
docker run -d -p 8000:8000 --env-file .env --name veltrix veltrix-api
```

### Verify Backend

```bash
curl http://localhost:8000/health
# {"status":"ok","service":"Veltrix AI","version":"1.0.0"}

curl -X POST http://localhost:8000/analyze-text \
  -H "Content-Type: application/json" \
  -d '{"text":"Your account has been suspended. Verify now."}'
# {"label":"phishing","score":...}
```

---

## 2. Extension Deployment

### Development / Sideload

1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer mode** (top right toggle)
3. Click **Load unpacked**
4. Select the `veltrix-extension/` folder
5. Open Gmail - the extension will begin scanning automatically

### Configure Backend URL

The extension defaults to `http://localhost:8000`.

To point to a production backend:
1. Open Chrome DevTools on any page
2. Run in Console:
   ```js
   chrome.storage.local.set({ veltrix_api_url: "https://api.yourdomain.com" })
   ```

### Chrome Web Store (Production)

1. **Prepare the package:**
   ```bash
   cd veltrix-extension
   zip -r veltrix-ai-v1.0.0.zip . -x "*.DS_Store" -x "__MACOSX/*"
   ```

2. **Submit to Chrome Web Store:**
   - Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
   - Click "New Item"
   - Upload `veltrix-ai-v1.0.0.zip`
   - Fill in listing details:
     - Name: Veltrix AI - Phishing Shield
     - Description: AI-powered phishing detection for Gmail
     - Category: Productivity
     - Privacy policy URL (required)
   - Submit for review

3. **After approval**, users install directly from the Chrome Web Store.

---

## 3. Production Checklist

### Backend
- [ ] ML model trained and `model.pkl` + `vectorizer.pkl` present in `ml_models/`
- [ ] `.env` configured with `ENV=production`
- [ ] CORS origins set to your Chrome extension ID
- [ ] HTTPS enabled via Nginx + Let's Encrypt
- [ ] systemd service running and enabled
- [ ] Firewall allows port 443 only (block direct 8000 access)

### Extension
- [ ] `config.js` default URL updated OR users configure via storage
- [ ] All icons present in `icons/` directory (16, 48, 128 px)
- [ ] Tested on a clean Chrome profile
- [ ] Privacy policy written and hosted
- [ ] Extension submitted to Chrome Web Store

### ML Model
- [ ] Trained on all 11 datasets from `Dataset/`
- [ ] Accuracy > 90% on test set
- [ ] Sanity tests pass (16/16)
- [ ] Model file size < 50 MB

---

## 4. API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| POST | `/analyze-text` | Analyze email text |
| POST | `/analyze-url` | Analyze a URL |
| POST | `/analyze-batch` | Batch analyze (up to 20) |
| POST | `/block-sender` | Add sender to blocklist |
| POST | `/unblock-sender` | Remove sender from blocklist |
| POST | `/block-url` | Add URL to blocklist |
| GET | `/check-block?url=...&sender=...` | Check if blocked |
| GET | `/alerts?limit=50` | Get recent alerts |
| GET | `/blocked` | Get all blocked items |
