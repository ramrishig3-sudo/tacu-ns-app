# CyberShield Pro — Complete Setup Guide

## Prerequisites
- Node.js 18+ and npm
- Android Studio (for APK builds)
- Accounts: Supabase, Firebase, Vercel, VirusTotal, AlienVault OTX

---

## Step 1: Install Dependencies

```bash
cd cybershield-pro

# Install existing + new packages
npm install @supabase/supabase-js firebase-admin @capacitor/push-notifications

# Dev dependency for Vercel functions
npm install -D @vercel/node
```

---

## Step 2: Supabase Setup

### 2.1 Create Supabase Project
1. Go to [supabase.com](https://supabase.com) → New Project
2. Name: `cybershield-pro`
3. Set a strong database password
4. Region: Choose closest to your users

### 2.2 Create Tables
1. Go to **SQL Editor** in Supabase Dashboard
2. Paste the contents of `supabase-schema.sql` (in project root)
3. Click **Run** — this creates `ip_scans`, `scan_logs`, and `device_tokens` tables

### 2.3 Get Keys
1. Go to **Settings → API**
2. Copy:
   - **Project URL** → `SUPABASE_URL` + `VITE_SUPABASE_URL`
   - **anon public key** → `VITE_SUPABASE_ANON_KEY` (safe for frontend)
   - **service_role key** → `SUPABASE_SERVICE_KEY` (⚠️ server-only, never expose)

---

## Step 3: Firebase Setup

### 3.1 Create Firebase Project
1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Create new project: `cybershield-pro`
3. Enable **Google Analytics** (optional)

### 3.2 Enable Cloud Messaging
1. Go to **Project Settings → Cloud Messaging**
2. Ensure FCM is enabled

### 3.3 Get Service Account Key
1. Go to **Project Settings → Service Accounts**
2. Click **Generate New Private Key**
3. This downloads a JSON file. Extract:
   - `project_id` → `FIREBASE_PROJECT_ID`
   - `private_key` → `FIREBASE_PRIVATE_KEY`
   - `client_email` → `FIREBASE_CLIENT_EMAIL`

### 3.4 Android Setup
1. In Firebase Console → **Add App → Android**
2. Package name: `com.cybershield.pro`
3. Download `google-services.json`
4. Place in `android/app/` (after running `npx cap add android`)

---

## Step 4: Get API Keys

### VirusTotal
1. Sign up at [virustotal.com](https://www.virustotal.com)
2. Go to your profile → API Key
3. Copy to `VIRUSTOTAL_API_KEY`
4. Free tier: 4 requests/minute, 500/day

### AlienVault OTX
1. Sign up at [otx.alienvault.com](https://otx.alienvault.com)
2. Go to Settings → API Key
3. Copy to `OTX_API_KEY`
4. Free tier: generous limits

### Groq AI
1. Sign up at [console.groq.com](https://console.groq.com)
2. Go to API Keys → Create
3. Copy to `GROQ_API_KEY`
4. Free tier: 30 requests/minute

---

## Step 5: Environment Variables

### Local Development
Create `.env` in project root:
```env
VITE_API_BASE_URL=
VIRUSTOTAL_API_KEY=your_key_here
OTX_API_KEY=your_key_here
GROQ_API_KEY=your_key_here
ABUSEIPDB_API_KEY=your_key_here
IPINFO_TOKEN=your_token_here
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOi...
FIREBASE_PROJECT_ID=cybershield-pro
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@cybershield-pro.iam.gserviceaccount.com
```

### Vercel Production
```bash
# Set each variable in Vercel Dashboard → Settings → Environment Variables
# Or use CLI:
vercel env add VIRUSTOTAL_API_KEY
vercel env add OTX_API_KEY
vercel env add GROQ_API_KEY
vercel env add SUPABASE_URL
vercel env add SUPABASE_SERVICE_KEY
vercel env add FIREBASE_PROJECT_ID
vercel env add FIREBASE_PRIVATE_KEY
vercel env add FIREBASE_CLIENT_EMAIL
```

---

## Step 6: Run Locally

```bash
# Start development server
npm run dev

# App runs on http://localhost:3000
# API routes available at http://localhost:3000/api/*
```

---

## Step 7: Deploy to Vercel

```bash
npm install -g vercel

# Deploy
vercel

# Set environment variables
vercel env add VIRUSTOTAL_API_KEY production
# ... repeat for all variables

# Deploy to production
vercel --prod
```

---

## Step 8: Build Android APK

```bash
# 1. Build the web app
npm run build

# 2. Add Android platform (first time only)
npx cap add android

# 3. Sync web assets to Android
npx cap sync android

# 4. Open in Android Studio
npx cap open android

# 5. In Android Studio:
#    - Build → Generate Signed Bundle / APK
#    - Choose APK or AAB (AAB for Play Store)
#    - Create/select keystore
#    - Build release version
```

### Important: Set API Base URL for Android
Before building the APK, set the Vercel URL in your `.env`:
```env
VITE_API_BASE_URL=https://your-app.vercel.app
```
Then rebuild: `npm run build && npx cap sync android`

---

## Step 9: Testing

### Test IP Scan
```bash
# Clean IP
curl -X POST http://localhost:3000/api/scan-ip \
  -H "Content-Type: application/json" \
  -d '{"ip": "8.8.8.8"}'

# Expected: { "success": true, "data": { "risk_level": "low", ... } }

# Invalid IP
curl -X POST http://localhost:3000/api/scan-ip \
  -H "Content-Type: application/json" \
  -d '{"ip": "not-an-ip"}'

# Expected: { "success": false, "error": "Invalid IP address format" }
```

### Test AI Chat
```bash
curl -X POST http://localhost:3000/api/ai-chat \
  -H "Content-Type: application/json" \
  -d '{"message": "How do I secure my SSH server?", "mode": "beginner"}'
```

---

## Folder Structure (After Setup)

```
cybershield-pro/
├── api/                    # Vercel serverless functions
│   ├── _lib/               # Shared server utilities
│   │   ├── validate.ts
│   │   ├── supabaseServer.ts
│   │   └── firebaseAdmin.ts
│   ├── scan-ip.ts          # POST /api/scan-ip
│   └── ai-chat.ts          # POST /api/ai-chat
├── src/
│   ├── components/         # React UI components
│   ├── services/           # Frontend services
│   │   ├── api.ts          # Centralized API client
│   │   ├── supabase.ts     # Client-side Supabase
│   │   └── notifications.ts # Push notifications
│   ├── types.ts            # TypeScript interfaces
│   └── ...
├── server.ts               # Express local dev server
├── vercel.json             # Vercel deployment config
├── supabase-schema.sql     # Database schema
├── .env.example            # Environment template
└── docs/
    ├── SETUP_GUIDE.md      # This file
    └── PRIVACY_POLICY.md   # Privacy policy
```
