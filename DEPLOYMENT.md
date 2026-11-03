# 🚀 ClubPost Deployment & Real Live Match Testing Guide

This guide walks you through deploying **ClubPost** to the internet and connecting a **real live football data provider** to track real-world matches happening today.

---

## 🔑 1. Free API Keys Needed

To test on the live internet with real live football matches and AI content generation, you need two **free** API keys:

| Service | Purpose | How to get (Free) |
| :--- | :--- | :--- |
| **Football-Data.org** | Real-time live scores, minutes, goals, cards, subs, and lineups | Register in 30 seconds at [football-data.org/client/register](https://www.football-data.org/client/register) (no credit card needed). Copy your `X-Auth-Token`. |
| **Google Gemini AI** | Social post generation across 3 formats & tone variations | Get your free key at [Google AI Studio](https://aistudio.google.com/app/apikey). |

> **Note:** If `FOOTBALL_DATA_API_KEY` is omitted, ClubPost automatically runs with built-in mock football data so you can still test anytime.

---

## 🌐 2. Deployment Options

### Option A: Render.com (Recommended — 1-Click Free Hosting)

Render provides free hosting with HTTPS and automatic CI/CD from your GitHub repository.

1. **Push your code to GitHub:**
   ```bash
   git add .
   git commit -m "Deploy ClubPost to production"
   git remote add origin https://github.com/YOUR_USERNAME/clubpost.git
   git branch -M main
   git push -u origin main
   ```
2. **Create Web Service on Render:**
   - Log into [dashboard.render.com](https://dashboard.render.com/).
   - Click **New +** → **Web Service**.
   - Select **Build and deploy from a Git repository** and connect your repository.
   - Configure:
     - **Name:** `clubpost` (or your chosen name)
     - **Runtime:** `Docker` (Render automatically uses the root `Dockerfile`)
     - **Instance Type:** `Free`
3. **Add Environment Variables:**
   Under **Environment Variables**, add:
   - `SECRET_KEY` = (Click "Generate" or enter a random 32-character string)
   - `DATABASE_URL` = `sqlite:///./clubpost.db`
   - `GEMINI_API_KEY` = `your_google_gemini_api_key`
   - `FOOTBALL_DATA_API_KEY` = `your_football_data_org_key`
   - `FOOTBALL_PROVIDER` = `auto`
   - `CORS_ORIGINS` = `*`
4. **Deploy:**
   - Click **Create Web Service**.
   - In 2–3 minutes, Render builds the frontend bundle, starts FastAPI, and gives you a live URL: `https://clubpost.onrender.com`.

---

### Option B: Railway.app (1-Click Deployment)

1. Log into [railway.app](https://railway.app/).
2. Click **New Project** → **Deploy from GitHub repo**.
3. Select your repository. Railway will detect the `Dockerfile` and `railway.json`.
4. In the **Variables** tab, add:
   - `SECRET_KEY` = `your_secret_key`
   - `GEMINI_API_KEY` = `your_gemini_key`
   - `FOOTBALL_DATA_API_KEY` = `your_football_data_key`
   - `FOOTBALL_PROVIDER` = `auto`
5. Click **Settings** → **Generate Domain** to get your public HTTPS URL.

---

### Option C: Single-Command Docker (VPS, DigitalOcean, AWS, or Local)

Run anywhere Docker is installed:

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/clubpost.git
cd clubpost

# Set your API keys in environment or .env
export GEMINI_API_KEY="your_key"
export FOOTBALL_DATA_API_KEY="your_key"

# Build and start in background
docker compose up -d --build
```
Your full-stack application will be live at `http://YOUR_SERVER_IP:8000`.

---

## ⚽ 3. Testing with a Real Live Match

Once deployed:

1. **Sign In:**
   - Go to your live URL (e.g. `https://clubpost.onrender.com/login`).
   - Default login: `admin@clubpost.dev` / `password123` (or register a fresh account).
2. **Select Your Tracked Club:**
   - Go to **Tracked Teams** (`/workspace/1/teams`).
   - Search for any top club currently playing (e.g. `Arsenal`, `Manchester City`, `Liverpool`, `Real Madrid`, `Barcelona`, `Bayern Munich`).
   - Click **Track this Club** and set as **Primary**.
3. **Monitor Live Real-Time Events:**
   - Whenever your tracked club plays a real match:
     - The Dashboard displays the **Live Match Hero Card** showing the current minute and live score.
     - Click the card to enter the **Match Center**.
     - Real events (goals, yellow/red cards, substitutions) appear on the timeline as they occur in the real stadium.
     - One-click post generation prepares short tweets, storytelling posts, and fan discussion prompts matching your club's tone.
4. **Lineup & Post-Match Gating:**
   - **Starting XI:** Drops 45 minutes before actual kickoff.
   - **Half-Time Summary:** Unlocks at minute 45’ of the live match.
   - **Full-Time Result & Tactical Analysis:** Unlocks at minute 90’ when the referee blows the final whistle.
