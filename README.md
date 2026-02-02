# Aside

A local-first, minimalist to-do app for iOS/Android that functions like a native notepad.

## Quick Start

### Prerequisites
- Node.js 20+ (LTS)
- Docker Desktop running
- Expo Go app on your phone (for testing)

### 1. Start the Backend
```powershell
cd c:\Users\YOUSSEF\Documents\GitHub\Aside
docker compose up -d
```

### 2. Install Dependencies
```powershell
npm install
```

### 3. Start the App
```powershell
npm start
```

Scan the QR code with Expo Go to run on your device.

## Project Structure
```
├── app/                 # Expo Router screens
│   ├── _layout.tsx     # Root layout
│   └── index.tsx       # Main notepad screen
├── src/
│   ├── components/     # UI components
│   ├── hooks/          # Custom hooks (useSmartDate, useDebounce)
│   ├── store/          # Legend-State store
│   ├── db/             # PowerSync configuration
│   └── types/          # TypeScript types
├── docker/             # Backend configuration
│   ├── powersync.yaml  # Sync rules
│   └── postgres-init.sql
└── .maestro/           # E2E test flows
```

## Tech Stack
- **Expo SDK 53** + React Native 0.79
- **Legend-State** for reactive state
- **PowerSync** for local-first sync
- **FlashList** for performance
- **chrono-node** for date parsing
