# ClubPost — Football Club Content Assistant & AI Content Studio

ClubPost is an AI-assisted football club content studio web application. It turns live football matches, fixtures, results, and verified RSS news & transfer rumors into high-engagement, ready-to-review social media posts using Google Gemini Flash (100% free tier), custom tone engines, and direct source links.

---

## 🌟 Key Capabilities

1. **Dual-Zone Control Center:**
   - **Match Center (Left):** Real-time match scores, live match status with auto-updates (or clean "No live match in progress" status), **Next 3 Upcoming Matches**, and **Last 3 Recent Results**. Clicking any match opens its dedicated split-screen Match Center!
   - **News & Transfer Center (Right):** Curated RSS feeds (BBC Sport, Sky Sports, The Guardian) categorized into `Club News` and `🔄 Transfer Rumors` with credibility badges (`Tier 1 Verified`, `Trusted Report`) and direct `[Source Link ↗]` buttons to inspect the original story.
2. **Dedicated Split-Screen Match Center (`/workspace/:id/match/:matchId`):**
   - **Right Side:** Scoreboard, venue, league, and chronological Key Moments timeline (⚽ Goals, 🟨 Cards, ⏱️ Half-Time, 🏁 Full-Time).
   - **Left Side:** Post Draft Studio with live editable preview, tone & language selectors, `[📋 Copy Post]`, and `[💾 Save as Draft]`. Click any event on the right to immediately load its draft on the left!
   - **Smart On-Demand Generation:** For past or upcoming matches, click `[✨ Generate Draft with Gemini]` on demand without wasting tokens.
3. **Dedicated Club Journey & Performance Page (`/workspace/:id/club`):**
   - **1-Time Cached Records:** Previous season summary (Finish, Points, W-D-L, Top Scorer) cached in SQLite with zero extra API overhead.
   - **"Then vs. Now" Comparison:** Side-by-side points pace, offensive output, and defensive solidity for fan storylines.
   - **Club Switcher:** Change your tracked club anytime without a separate gatekeeper screen.
4. **1-Month Database Retention Policy:**
   - Automatically purges post drafts older than 30 days, keeping your database lean and snappy.
5. **AI Content Studio (Modal & Page):**
   - **3 Post Tones:** `🔥 Hype` (bold & electric), `😂 Banter` (playful & cheeky), and `👔 Professional` (calm & journalistic).
   - **3 Languages:** `🇬🇧 English`, `💬 Banglish` (phonetic Romanized), and `🇧🇩 Bengali` (বাংলা script).
   - **100% Free-Tier Safe:** A single Gemini request bundles 3 post variations (`⚡ Short & Punchy`, `🔥 Narrative Story`, `💬 Facebook Comment Debate Question`), strictly preserving the 1,500 free daily request limit.
   - **Zero Hallucinated Hashtags:** Workspace-level default hashtags (e.g. `#COYG #Arsenal #PremierLeague`) are appended deterministically.
   - **One-Click Actions:** Direct copy to clipboard (`📋 Copy Post`) and queue storage (`💾 Save to Drafts`).
3. **Upfront Club Onboarding:**
   - Pre-configured club presets (Arsenal, Barcelona, Real Madrid, Manchester City, Liverpool, Chelsea, Manchester United, Bayern Munich) or custom clubs with instant hashtag mapping.
4. **API Quota Protection & Fallbacks:**
   - Real-time quota tracking with visual indicators and deterministic AI fallbacks whenever a Gemini key is omitted.

---

## 🚀 Quick Start & Manual Testing Guide

Follow these simple steps to run the backend and test all features yourself using your browser or terminal.

### 1. Prerequisites & Setup

Open PowerShell in the project directory:

```powershell
cd "c:\Users\raada\OneDrive\Documents\sports post assistant\backend"
```

Install requirements (if not already installed):
```powershell
pip install -r requirements.txt



```

#### Optional: Instant Seed Data
You can populate the database with a pre-configured admin user, two club workspaces (Arsenal & Barcelona), fixtures, past results, an active live match, and sample drafts by running:
```powershell
python seed.py
```
* **Email:** `admin@clubpost.dev`
* **Password:** `password123`
*(Or you can register your own account via the UI!)*

### 2. Start the Backend & Frontend Servers

#### Terminal 1 — Backend (FastAPI):
```powershell
cd "c:\Users\raada\OneDrive\Documents\sports post assistant\backend"
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

#### Terminal 2 — Frontend (React + Vite):
```powershell
cd "c:\Users\raada\OneDrive\Documents\sports post assistant\frontend"
npm run dev
```

Open your browser to: **[http://localhost:5173](http://localhost:5173)**

---

## 🎨 Method 1: Test the Complete Web Application in Your Browser

Open **[http://localhost:5173](http://localhost:5173)** to experience the full ClubPost application:

1. **Register & Log In**:
   * Navigate to `http://localhost:5173/register` and create an account.
2. **Create Club Workspaces**:
   * Create "Arsenal Hub", then "FC Barcelona Page".
   * Note how you can switch between them instantly in the top navigation bar!
3. **Select Your Tracked Club**:
   * Go to **Tracked Team** or search for "Arsenal" or "Barcelona".
   * Click **Select Club**.
4. **View Workspace Dashboard**:
   * Inspect the upcoming fixture card, recent result card, and the live match banner.
5. **Live Matchday Monitoring & "Fetch now" Button**:
   * Go to **Live Match** tab.
   * Click the **"Fetch now"** button -> see instant event detection & post drafts generated!
   * Click it again immediately -> notice the **45-second countdown timer** protecting your API quota.
6. **Drafts Queue & One-Click Copy**:
   * Go to **Drafts Queue** tab.
   * Filter drafts by status (New, Edited, Copied, Used) or by type (Goal, Red Card, Halftime, Fulltime).
   * Click **"✏️ Edit"** to tweak post wording directly inline.
   * Click **"📋 Copy Post"** to copy the ready-to-post text directly to your clipboard for Facebook!
7. **Workspace Settings & Tenant Isolation**:
   * Go to **Settings** to rename the workspace or view daily quota limits.
   * Log out, register a second user, and confirm you cannot see or tamper with the first user's workspaces.

---

## 🌐 Method 2: Test API Visually via Swagger UI (Backend Direct)

FastAPI provides an interactive visual dashboard where you can test everything directly from your browser.

1. Open your browser and go to: **[http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)**
2. You will see all API endpoints organized by category: **auth**, **workspaces**, **usage**, and **health**.

### Step-by-step Walkthrough:

#### A. Register User 1 (e.g. Raad)
- Click on **`POST /api/auth/register`** -> click **Try it out**.
- Fill in the JSON body:
  ```json
  {
    "email": "raad@clubpost.dev",
    "password": "mypassword123"
  }
  ```
- Click **Execute**. You will see `201 Created` with your new user ID.

#### B. Log in & Authorize
- Click on **`POST /api/auth/login`** -> click **Try it out**.
- Submit the same email and password.
- Click **Execute**. Copy the `access_token` string from the response.
- Scroll to the top right of the page and click the green **Authorize** 🔓 button.
- In the "Value" box, paste your token and click **Authorize**, then **Close**. (Now all your requests are authenticated!)

#### C. Verify Profile
- Click on **`GET /api/auth/me`** -> **Try it out** -> **Execute**.
- You will see your user profile: `raad@clubpost.dev`.

#### D. Create Multiple Workspaces (Multi-Club Management)
- Click on **`POST /api/workspaces`** -> **Try it out**.
- Request body for Workspace 1:
  ```json
  {
    "workspace_name": "Arsenal Fan Page"
  }
  ```
- Click **Execute**. Note the `id` (e.g. `1`).
- Repeat for Workspace 2:
  ```json
  {
    "workspace_name": "Barcelona Global"
  }
  ```
- Click **Execute**. Note the `id` (e.g. `2`).

#### E. List Your Workspaces
- Click on **`GET /api/workspaces`** -> **Try it out** -> **Execute**.
- You will see both `Arsenal Fan Page` and `Barcelona Global` under your account!

#### F. Rename a Workspace
- Click on **`PATCH /api/workspaces/{workspace_id}`** -> **Try it out**.
- `workspace_id`: `1`
- Request body:
  ```json
  {
    "workspace_name": "Arsenal Official Updates"
  }
  ```
- Click **Execute**. The workspace is updated to "Arsenal Official Updates".

#### G. ⚽ Team Search & Selection (Milestone 3)
1. **Search for clubs**:
   - Click on **`GET /api/workspaces/{workspace_id}/teams/search`** -> **Try it out**.
   - `workspace_id`: `1` (or your created workspace ID).
   - `q`: `barcelona` (or leave blank to see all clubs).
   - Click **Execute** -> You will see matching clubs: `FC Barcelona` (Spain, La Liga).
2. **Select your tracked club**:
   - Click on **`POST /api/workspaces/{workspace_id}/tracked-team`** -> **Try it out**.
   - `workspace_id`: `1`
   - Request body:
     ```json
     {
       "provider_name": "mock",
       "provider_team_id": "mock-arsenal",
       "team_name": "Arsenal FC",
       "league_id": "PL",
       "country": "England"
     }
     ```
   - Click **Execute**. The club is now tracked for Workspace 1.
3. **View Workspace Dashboard**:
   - Click on **`GET /api/workspaces/{workspace_id}/dashboard`** -> **Try it out**.
   - `workspace_id`: `1`
   - Click **Execute**!
   - You will see the complete aggregated dashboard:
     - `tracked_team`: Arsenal FC
     - `next_fixture`: Arsenal vs Manchester City (Emirates Stadium)
     - `recent_result`: Arsenal 2 - 1 Liverpool
     - `live_match`: Arsenal 1 - 0 Chelsea (Minute 38, Bukayo Saka 23' goal)
     - `api_usage`: Quota status

#### H. ⚡ Live Match Monitoring, Cooldown & Post Draft Queue (Milestone 4)
1. **Trigger Manual Match Fetch**:
   - Click on **`POST /api/workspaces/{workspace_id}/matches/live/fetch-now`** -> **Try it out**.
   - `workspace_id`: `1`
   - Click **Execute**.
   - You will see:
     ```json
     {
       "new_drafts_count": 1,
       "message": "Live match refreshed. 1 new draft(s) created.",
       "new_drafts": [
         {
           "id": 1,
           "post_type": "goal",
           "content": "⚽ GOAL!\n\nBukayo Saka puts Arsenal FC ahead in the 23rd minute.\n\nArsenal FC 1-0 Chelsea FC.",
           "status": "new"
         }
       ]
     }
     ```
2. **Test 45-Second Cooldown**:
   - Immediately click **Execute** again!
   - Response is `429 Too Many Requests`:
     ```json
     {
       "detail": "Please wait 43 seconds before fetching again."
     }
     ```
   - The system protects your API quota from repeated accidental button clicks!
3. **Inspect the Drafts Queue**:
   - Click on **`GET /api/workspaces/{workspace_id}/drafts`** -> **Try it out**.
   - `workspace_id`: `1`
   - Click **Execute** -> see all generated drafts with `status: "new"`.
4. **Edit Draft Text & Change Status**:
   - Click on **`PATCH /api/drafts/{draft_id}`** -> **Try it out**.
   - `draft_id`: `1`
   - Request body to edit content:
     ```json
     {
       "content": "⚽ WHAT A GOAL! Bukayo Saka with a world-class finish! Arsenal 1-0 Chelsea!"
     }
     ```
   - Click **Execute** -> status automatically transitions to `"edited"`.
   - Update status to `"copied"`:
     ```json
     {
       "status": "copied"
     }
     ```
   - Click **Execute** -> status is now `"copied"`.
5. **Check API Quota Usage**:
   - Click on **`GET /api/usage`** -> **Try it out** -> **Execute**.
   - Live quota stats returned (e.g. `used_today: 1`, `remaining: 99`, `status: "ok"`).

#### I. 🛡️ Test Tenant Isolation (Cross-User Security)
To verify that another user **cannot** see or tamper with your workspaces:
1. Click the green **Authorize** button at top right -> click **Logout**.
2. Register a second user:
   - `POST /api/auth/register` with `{"email": "hacker@evil.com", "password": "password123"}`
3. Log in as user 2:
   - `POST /api/auth/login` with `hacker@evil.com` -> copy the new token.
4. Click **Authorize** -> paste user 2's token.
5. Click **`GET /api/workspaces`** -> **Execute**:
   - Response is `[]` (empty list! User 2 cannot see User 1's workspaces).
6. Try to access User 1's workspace:
   - Click **`GET /api/workspaces/1`** -> `workspace_id`: `1` -> **Execute**.
   - Response is `404 Not Found` with `{"detail": "Workspace not found"}`.
7. Try to delete User 1's workspace:
   - Click **`DELETE /api/workspaces/1`** -> **Execute**.
   - Response is `404 Not Found`. User 1's data remains 100% secure!

---

## 💻 Method 2: Test via PowerShell (Automated Script)

If you prefer testing directly in your PowerShell terminal, run this test script:

```powershell
$BASE = "http://127.0.0.1:8000"

# 1. Register User 1
$user1 = Invoke-RestMethod -Uri "$BASE/api/auth/register" -Method Post -ContentType "application/json" -Body '{"email":"raad_test@test.com","password":"password123"}'
Write-Host "Registered User 1: $($user1.email) (ID: $($user1.id))" -ForegroundColor Green

# 2. Login User 1
$login1 = Invoke-RestMethod -Uri "$BASE/api/auth/login" -Method Post -ContentType "application/json" -Body '{"email":"raad_test@test.com","password":"password123"}'
$token1 = $login1.access_token
$headers1 = @{ Authorization = "Bearer $token1" }

# 3. Create 2 Workspaces for User 1
$ws1 = Invoke-RestMethod -Uri "$BASE/api/workspaces" -Method Post -Headers $headers1 -ContentType "application/json" -Body '{"workspace_name":"Arsenal Hub"}'
$ws2 = Invoke-RestMethod -Uri "$BASE/api/workspaces" -Method Post -Headers $headers1 -ContentType "application/json" -Body '{"workspace_name":"Real Madrid Central"}'
Write-Host "Created Workspaces: '$($ws1.workspace_name)' (ID: $($ws1.id)) and '$($ws2.workspace_name)' (ID: $($ws2.id))" -ForegroundColor Cyan

# 4. List Workspaces for User 1
$myWorkspaces = Invoke-RestMethod -Uri "$BASE/api/workspaces" -Method Get -Headers $headers1
Write-Host "User 1 owns $($myWorkspaces.Count) workspaces:" -ForegroundColor Yellow
$myWorkspaces | ForEach-Object { Write-Host " - ID $($_.id): $($_.workspace_name)" }

# 5. Register User 2
$user2 = Invoke-RestMethod -Uri "$BASE/api/auth/register" -Method Post -ContentType "application/json" -Body '{"email":"other_user@test.com","password":"password123"}'
$login2 = Invoke-RestMethod -Uri "$BASE/api/auth/login" -Method Post -ContentType "application/json" -Body '{"email":"other_user@test.com","password":"password123"}'
$headers2 = @{ Authorization = "Bearer $($login2.access_token)" }

# 6. Verify User 2 sees 0 workspaces
$user2Workspaces = Invoke-RestMethod -Uri "$BASE/api/workspaces" -Method Get -Headers $headers2
Write-Host "User 2 sees $($user2Workspaces.Count) workspaces (Expected: 0)" -ForegroundColor Green

# 7. Verify User 2 gets 404 trying to access User 1's workspace
try {
    Invoke-RestMethod -Uri "$BASE/api/workspaces/$($ws1.id)" -Method Get -Headers $headers2
} catch {
    Write-Host "Tenant isolation check passed: User 2 was blocked with status $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Green
}
```

---

## 🧪 Method 3: Run the Automated Pytest Suite

Run all unit and tenant isolation tests anytime:

```powershell
cd "c:\Users\raada\OneDrive\Documents\sports post assistant\backend"
python -m pytest -v
```

All 11 tests will run and report green checkmarks!

---

## 📁 Completed Milestones

- [x] **Milestone 1:** Backend Core Foundation, SQLite Models, Password Hashing, JWT Auth.
- [x] **Milestone 2:** Workspace Management, Multi-Workspace Switching, Strict Tenant Isolation.
- [x] **Milestone 3:** Football Provider Adapter (Mock Provider), Team Search, Tracked Club Selection, and Workspace Dashboard.
- [x] **Milestone 4:** Match Monitoring, Snapshot Differ, Event Detection & Draft Generation (with Cooldown, Quota Manager & APScheduler Background Polling).
- [x] **Milestone 5:** React + Vite + TypeScript + Tailwind Frontend (Full modular UI with router, hooks, components, pages, live polling & copy-to-clipboard).
- [x] **Milestone 6:** Seed Data (`seed.py`), Full End-to-End Test Suite Verification (25 tests passing in pytest), and Documentation.

