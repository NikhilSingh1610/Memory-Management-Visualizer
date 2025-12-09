# Firebase Deployment Guide

## Prerequisites
- Node.js 18+ installed
- Firebase CLI installed (`npm install -g firebase-tools`)
- Your Firebase account configured

## Setup Steps

### 1. Install Dependencies

```bash
# Install React dependencies
cd memory-viz-web
npm install

# Install Firebase Functions dependencies
cd ../firebase/functions
npm install
```

### 2. Build the React App

```bash
cd memory-viz-web
npm run build
```

The built files will be in `memory-viz-web/dist/`

### 3. Deploy to Firebase

```bash
# From the project root directory
firebase deploy
```

This will:
- Deploy Cloud Functions to Firebase
- Deploy the React app to Firebase Hosting

### 4. Access Your App

After deployment, your app will be available at:
```
https://oslab-00.firebaseapp.com
```

## Local Testing (Firebase Emulator)

To test locally before deploying:

```bash
# Start the Firebase emulator
firebase emulators:start

# In another terminal, run the React development server
cd memory-viz-web
npm run dev
```

Update `src/firebase.ts` to connect to emulator during development:

```typescript
import { connectFunctionsEmulator } from 'firebase/functions';

// After initializing functions, add:
if (location.hostname === 'localhost') {
  connectFunctionsEmulator(functions, 'localhost', 5001);
}
```

## Environment Setup

Your Firebase project credentials are in `src/firebase.ts`:
- Project ID: `oslab-00`
- API Key: `AIzaSyD8z9KTIKfq-8hoP0NFenkfvF6jHT26CH0`

## Troubleshooting

### Cloud Function Not Found
Make sure `firebase/functions/index.js` exports the `simulate` function correctly.

### CORS Issues
The Cloud Function includes CORS middleware to handle requests from the frontend.

### Build Errors
Ensure all dependencies are installed:
```bash
npm install
cd firebase/functions && npm install
```

## Project Structure

```
osproject/
├── memory-viz-web/          # React frontend
│   ├── src/
│   │   ├── firebase.ts      # Firebase config
│   │   ├── App.tsx          # Main component
│   │   └── ...
│   ├── dist/                # Build output (after npm run build)
│   └── package.json
├── firebase/
│   └── functions/           # Cloud Functions
│       ├── index.js         # simulate() function
│       └── package.json
├── firebase.json            # Firebase configuration
└── .firebaserc              # Firebase project settings
```

## Cloud Function API

The `simulate` Cloud Function expects a POST request with:

```json
{
  "trace": "1 0\n1 1\n2 0\n...",
  "frameCount": 4
}
```

Returns:
```json
{
  "summary": {
    "totalAccesses": 11,
    "hits": 2,
    "faults": 9,
    "hitRate": "18.18%"
  },
  "steps": [...],
  "processes": [...]
}
```
