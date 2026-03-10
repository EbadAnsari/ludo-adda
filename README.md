# LudoBattle 🎲

A real-money 1v1 Ludo King betting platform. Dark, premium, fintech-style UI.

## Tech Stack
- **Frontend**: React 18 + Vite + Tailwind CSS + Framer Motion
- **Backend**: Firebase (Auth, Firestore, Storage, Realtime DB, Cloud Functions, FCM)
- **State**: Zustand
- **Routing**: React Router v6

## Quick Start

```bash
# 1. Install dependencies
npm install
cd functions && npm install && cd ..

# 2. Copy env file and fill in your Firebase config
cp .env.example .env

# 3. Login to Firebase
firebase login
firebase use --add  # Select your Firebase project

# 4. Deploy rules + functions
firebase deploy --only firestore:rules,storage,functions

# 5. Run locally
npm run dev
```

## Project Structure
```
src/
├── components/      UI components (Button, Card, FlipTimer, etc.)
├── pages/           Route-level page components
├── store/           Zustand state stores
├── firebase/        Firebase service helpers
└── utils/           Currency, time, validators, deep links

functions/
└── index.js         All 8 Cloud Functions
```

## Setting Up Admin Access
After signing up in the app, go to Firebase Console → Firestore → users → your doc → add field `isAdmin = true`.

## Environment Variables
See `.env.example` for all required variables.

## Deploy
```bash
npm run build
firebase deploy --only hosting
```
