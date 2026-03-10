# LudoBattle — Complete Setup Guide

> A step-by-step guide for someone with no coding experience to set up, run, and deploy LudoBattle.

---

## What You Need Before Starting

### Tools to Install

1. **Node.js v18 or higher**
   - What it is: The engine that runs JavaScript on your computer (needed to build and serve the app).
   - Download: https://nodejs.org — click "LTS" (the recommended version)
   - After installing, verify it worked by opening a terminal and typing:
     ```bash
     node -v
     ```
   - You should see something like `v18.19.0`. If you see a lower number, re-download from nodejs.org.

2. **npm** (comes automatically with Node.js — nothing extra to install)
   - Verify with: `npm -v`

3. **Git** (optional but recommended)
   - What it is: A tool to download and manage code.
   - Download: https://git-scm.com
   - Verify with: `git --version`

4. **A Google Account** — needed for Firebase (the database and backend).

5. **Terminal / Command Prompt**
   - **Windows**: Press `Windows key`, search "cmd" or "Windows Terminal", open it.
   - **Mac**: Press `Cmd + Space`, search "Terminal", open it.
   - This is the black/white window where you type commands.

6. **A Code Editor** (to edit config files)
   - **Recommended for beginners**: [Cursor](https://cursor.com) — has built-in AI to help fix errors.
   - **Alternative**: [VS Code](https://code.visualstudio.com) — free and popular.

---

## Step 1 — Create Your Firebase Project

1. Go to https://console.firebase.google.com and sign in with your Google account.
2. Click **"Add project"**. Enter project name: `LudoBattle`. Click Continue.
3. Google Analytics: optional, you can enable or skip. Click **Create project**.
4. Wait ~30 seconds for the project to be created. Click **Continue**.
5. On the project home page, click the **web icon `</>`** to add a web app.
6. App nickname: `LudoBattle`. Check **"Also set up Firebase Hosting"**. Click **Register app**.
7. You'll see a `firebaseConfig` block like this:
   ```js
   const firebaseConfig = {
     apiKey: "AIzaSy...",
     authDomain: "ludobattle-xxxx.firebaseapp.com",
     projectId: "ludobattle-xxxx",
     storageBucket: "ludobattle-xxxx.appspot.com",
     messagingSenderId: "123456789",
     appId: "1:123456789:web:abcdef",
     measurementId: "G-XXXXXX"
   };
   ```
   **Copy this entire block and save it** — you'll need these values in Step 4.
8. Click **Continue to console**.

### Enable Firebase Services

**Authentication (Phone OTP):**
- Left menu → **Authentication** → **Get started**
- Click **Sign-in method** tab → Click **Phone** → Toggle **Enable** → **Save**

**Firestore Database:**
- Left menu → **Firestore Database** → **Create database**
- Choose **Start in production mode** → Click **Next**
- Region: Select **asia-south1 (Mumbai)** → Click **Done**
- Wait for database to be created.

**Storage (for screenshots):**
- Left menu → **Storage** → **Get started**
- **Start in production mode** → **Next** → Same region (asia-south1) → **Done**

**Realtime Database:**
- Left menu → **Realtime Database** → **Create database**
- Region: **Singapore (asia-southeast1)** → **Start in locked mode** → **Done**

**Cloud Functions:**
- Left menu → **Functions** → **Get started**
- This requires the **Blaze (pay-as-you-go)** plan. See below.

---

### Why the Blaze Plan is Required

Firebase has a free Spark plan, but **Cloud Functions** (the automated logic that handles wallet deductions, battle results, and payment approvals) require Blaze.

**Good news: It's essentially free for small scale.**
- Free allowance: 2 million function calls/month, 400,000 GB-seconds compute
- For 100 battles/day you'll use roughly 800 calls/day = ~24,000/month → **₹0**
- You only pay if you scale to thousands of battles per day

**How to enable Blaze:**
1. In Firebase Console, click **"Spark"** in the bottom-left → **Upgrade to Blaze**
2. Add a billing account: it will take you to Google Cloud
3. Enter your credit/debit card details (you won't be charged unless you exceed free limits)
4. **Strongly recommended**: Set a budget alert:
   - Go to https://console.cloud.google.com → **Billing** → **Budgets & alerts** → **Create budget**
   - Set amount: ₹500. You'll get an email if spending approaches this.

---

## Step 2 — Enable Phone Authentication (India)

1. In Firebase Console → **Authentication** → **Settings** tab
2. Click **Authorized domains**
3. For now, `localhost` is automatically there (for local testing). 
4. After you deploy (Step 9), come back and add your live domain (e.g. `ludobattle.web.app`).
5. **Important**: If you use a custom domain, you must add it here or OTP will not work on the live site.

---

## Step 3 — Install Required Tools

Open your terminal and run these commands one at a time:

```bash
# Check Node.js version (must be 18 or higher)
node -v

# Check npm
npm -v

# Install Firebase CLI globally
npm install -g firebase-tools

# Verify Firebase CLI installed
firebase --version
```

If `node -v` shows a version lower than 18, download the latest LTS from https://nodejs.org and re-install.

---

## Step 4 — Download and Configure the Project

```bash
# If using Git, clone the project:
git clone <your-repo-url> ludobattle
cd ludobattle

# OR if you downloaded a zip file, unzip it and navigate to the folder:
cd path/to/ludobattle

# Install all project dependencies (this may take 2-3 minutes)
npm install

# Go into the functions folder and install dependencies there too
cd functions
npm install
cd ..
```

### Create the .env File

The `.env` file holds your Firebase config. It must **never** be shared publicly or uploaded to GitHub.

1. In the project root folder (`ludobattle/`), create a new file named exactly **`.env`** (with the dot, no .txt extension).
2. In VS Code or Cursor: File → New File → name it `.env`
3. Paste this template and fill in values from the `firebaseConfig` you copied in Step 1:

```
VITE_FIREBASE_API_KEY=paste-your-apiKey-here
VITE_FIREBASE_AUTH_DOMAIN=paste-your-authDomain-here
VITE_FIREBASE_PROJECT_ID=paste-your-projectId-here
VITE_FIREBASE_STORAGE_BUCKET=paste-your-storageBucket-here
VITE_FIREBASE_MESSAGING_SENDER_ID=paste-your-messagingSenderId-here
VITE_FIREBASE_APP_ID=paste-your-appId-here
VITE_FIREBASE_MEASUREMENT_ID=paste-your-measurementId-here
VITE_ADMIN_UPI_ID=yourname@paytm
VITE_ADMIN_UPI_QR_URL=https://link-to-your-qr-image.png
VITE_FIREBASE_VAPID_KEY=
```

**`VITE_ADMIN_UPI_ID`**: The UPI ID users will send money to when adding funds. Example: `ludobattle@ybl`

**`VITE_ADMIN_UPI_QR_URL`**: 
- Generate your UPI QR code from your UPI app (PhonePe, Google Pay, etc.)
- Upload it to a free image host like https://imgur.com
- Right-click the image → "Copy image address"
- Paste that URL here

**`VITE_FIREBASE_VAPID_KEY`**: For push notifications. Get it from:
- Firebase Console → Project Settings → Cloud Messaging tab → Web Push certificates → Generate key pair → Copy

### Update .firebaserc

Open `.firebaserc` in your editor and replace `YOUR_FIREBASE_PROJECT_ID` with your actual project ID (found in Firebase Console → Project settings → General → Project ID):

```json
{
  "projects": {
    "default": "your-actual-project-id"
  }
}
```

---

## Step 5 — Deploy Firestore Security Rules

These rules protect your database so users can only access their own data.

```bash
# Login to Firebase (opens browser for Google sign-in)
firebase login

# Connect this folder to your Firebase project
firebase use --add
# Select your project from the list. Enter alias: default

# Deploy security rules
firebase deploy --only firestore:rules

# Deploy storage rules
firebase deploy --only storage

# Deploy Firestore indexes (needed for queries to work)
firebase deploy --only firestore:indexes
```

---

## Step 6 — Deploy Cloud Functions

```bash
firebase deploy --only functions
```

This deploys all 8 automated functions that handle:
- Wallet deductions when battles start
- Auto-forfeit if opponent doesn't join in time
- Crediting winners automatically
- Processing deposit/withdrawal approvals
- Resolving disputes

This step takes **3–7 minutes**. You'll see each function being deployed.

**If you get a billing error**: Go back to Step 1 and enable the Blaze plan.

After deployment, verify in Firebase Console → **Functions** → all 8 functions should show as "Active".

---

## Step 7 — Make Yourself Admin

After deploying, you need to give your own account admin access so you can approve payments.

### Easy Method (Firebase Console):
1. Run the app locally first (Step 8), sign up with your phone number.
2. Go to **Firebase Console** → **Firestore Database** → Click on **users** collection.
3. Find your user document (click on documents until you find yours by phone number or username).
4. Click the **pencil/edit icon**.
5. Click **"Add field"**:
   - Field name: `isAdmin`
   - Type: `boolean`
   - Value: `true`
6. Click **Update**.

Now when you open the app and go to Profile → **Admin Panel**, you'll have full admin access.

### Alternative Method (Script):
1. Get your Service Account key:
   - Firebase Console → Project Settings (gear icon) → **Service accounts** tab
   - Click **"Generate new private key"** → Download the JSON file
   - Rename it to `serviceAccountKey.json` and place it in the `ludobattle/` folder
   
2. Find your User UID:
   - Firebase Console → **Authentication** → **Users** tab
   - Copy the **User UID** (long string like `abc123def456...`)

3. Create a file `grant-admin.js` in the project root:
```js
const admin = require('firebase-admin')
const serviceAccount = require('./serviceAccountKey.json')

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) })

const uid = 'PASTE-YOUR-UID-HERE'

admin.firestore().collection('users').doc(uid).update({ isAdmin: true })
  .then(() => {
    console.log('Done! You are now admin.')
    process.exit()
  })
  .catch(err => {
    console.error('Error:', err)
    process.exit(1)
  })
```

4. Run it:
```bash
node grant-admin.js
```

---

## Step 8 — Run Locally (Testing)

```bash
npm run dev
```

Open your browser at **http://localhost:5173**

**Test the full flow:**
1. Sign up with your phone number (real OTP will be sent)
2. Create a battle with ₹50 entry fee
3. Open a second browser window (incognito), sign up with another number
4. Join the battle from the second window
5. Test the room code flow, result submission
6. Go to Profile → Admin Panel → approve a mock deposit

### Firebase Emulators (Optional — for offline testing)

```bash
firebase emulators:start
```

This runs a local fake Firebase so you can test without sending real OTPs or using real data. 
The emulator UI is at http://localhost:4000.

---

## Step 9 — Build and Deploy to Production

```bash
# Create optimized production build
npm run build

# Deploy to Firebase Hosting
firebase deploy --only hosting
```

Your app will be live at: **https://YOUR-PROJECT-ID.web.app**

After deploying, go back to Firebase Console → **Authentication** → **Settings** → **Authorized domains** → Add your `.web.app` domain.

---

## Step 10 — Add Custom Domain (Optional)

1. Firebase Console → **Hosting** → **Add custom domain**
2. Enter your domain (e.g. `ludobattle.in`)
3. Follow the DNS verification steps. You'll need to add TXT and A records to your domain registrar.
4. Wait 24–48 hours for DNS to propagate globally.
5. Once verified, add the domain to Firebase Auth authorized domains.
6. Update `.env`: change `VITE_FIREBASE_AUTH_DOMAIN` to your custom domain, then redeploy:
   ```bash
   npm run build && firebase deploy --only hosting
   ```

**Recommended domain registrars for India:**
- GoDaddy.in
- BigRock.in  
- Namecheap.com

Cost: approximately ₹800–1,200/year for a `.in` domain.

---

## Step 11 — FCM Push Notifications

1. Firebase Console → **Project Settings** (gear icon) → **Cloud Messaging** tab
2. Scroll to **Web Push certificates** section → Click **Generate key pair**
3. Copy the key
4. Add to your `.env`:
   ```
   VITE_FIREBASE_VAPID_KEY=your-key-here
   ```
5. Redeploy:
   ```bash
   npm run build && firebase deploy --only hosting
   ```

---

## Step 12 — Going Live Checklist

Complete every item before accepting real money:

- [ ] Blaze billing plan enabled with budget alert set at ₹500
- [ ] Phone Auth enabled in Firebase Console
- [ ] Live domain added to Firebase Auth → Authorized Domains
- [ ] Firestore security rules deployed (`firebase deploy --only firestore:rules`)
- [ ] Storage rules deployed (`firebase deploy --only storage`)
- [ ] All 8 Cloud Functions deployed and showing Active in Firebase Console
- [ ] `VITE_ADMIN_UPI_ID` set to your actual UPI ID in `.env`
- [ ] `VITE_ADMIN_UPI_QR_URL` set to your QR code image URL
- [ ] Tested full battle flow: create → join → room code → result → wallet credit
- [ ] Tested deposit request → admin approval → wallet credit
- [ ] Tested withdrawal request → admin approval
- [ ] Your account has `isAdmin: true` in Firestore
- [ ] HTTPS confirmed (Firebase Hosting provides this automatically)
- [ ] FCM VAPID key configured for push notifications

---

## Common Errors and Fixes

### 1. "Firebase: Error (auth/billing-not-enabled)"
**Fix**: Enable Blaze plan in Firebase Console. Cloud Functions require it.

### 2. "Firebase: Error (auth/invalid-phone-number)"
**Fix**: Include country code. Use `+91XXXXXXXXXX` format. The app adds +91 automatically.

### 3. "Firebase: Error (auth/too-many-requests)"
**Fix**: Firebase rate-limits OTP requests. Wait 1 hour, or use a different phone number for testing.

### 4. "Missing or insufficient permissions"
**Fix**: Firestore rules not deployed. Run:
```bash
firebase deploy --only firestore:rules
```

### 5. Functions deploy fails
**Fix**: Check that Node.js version matches. Run `node -v` — must be 18+. Also verify Blaze plan is active.

### 6. OTP not received on live site
**Fix**: Your live domain is not in Firebase Auth authorized domains. Go to Firebase Console → Authentication → Settings → Authorized Domains → Add your domain.

### 7. "VITE_FIREBASE_API_KEY is not defined"
**Fix**: `.env` file is missing or in the wrong folder. Make sure it's in the root `ludobattle/` folder, named exactly `.env` (not `.env.txt`).

### 8. App shows blank white screen
**Fix**: Open browser DevTools (press F12) → Console tab → Read the red error. Almost always a missing `.env` variable.

### 9. Admin Panel not showing in Profile
**Fix**: Your user document doesn't have `isAdmin: true`. Go to Step 7 and follow the instructions to set it.

### 10. Cloud Functions timeout or billing error
**Fix**: Ensure Blaze plan is active. Functions cannot deploy on the free Spark plan.

---

## Cost Estimate

| Usage Level         | Monthly Cost (Approx) |
|---------------------|----------------------|
| 0–100 battles/day   | ₹0 (free tier)       |
| 100–500 battles/day | ₹50–200              |
| 500+ battles/day    | ₹200–800             |
| Custom domain       | ₹800–1,200/year      |

Firebase Hosting, Firestore reads/writes, Authentication, and Storage all have generous free tiers. The main cost at scale is Cloud Function invocations (~₹0.04 per 1,000 calls beyond free tier).

---

## Daily Admin Tasks

**Every morning:**
- Open Admin Panel → **Deposits** tab
- Review pending deposit requests. Check UTR number against your UPI app's transaction history.
- Approve genuine payments. Reject fake ones with a reason.

**For withdrawals:**
- Go to Admin Panel → **Withdrawals** tab
- Manually transfer the money via UPI to the user's UPI ID shown
- Once transferred, click "Mark Paid & Approve" (double-confirm button)

**For disputes:**
- Go to Admin Panel → **Disputes** tab
- Review screenshots from both players
- Declare the winner fairly, or refund both if the result is unclear

---

## Weekly Tasks

- Check Firebase Console → **Usage and billing** dashboard
- Review Firestore → battles collection for stuck battles (running for >24 hours with no result). Manually update status to 'cancelled'.
- Monitor Authentication → Users for suspicious accounts. Use Admin Panel → Users to block if needed.

---

## Backups

Firebase automatically backs up Firestore data daily. For additional safety:
- Firebase Console → Firestore → **Import/Export** tab
- Click **Export** → choose a Cloud Storage bucket → Schedule automatic exports

