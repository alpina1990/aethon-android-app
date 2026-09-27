# Aethon Health — Mobile App for iOS and Android (React Native / Expo)

The Aethon mobile app for iOS and Android, built from one Expo codebase.

## 📁 Project Structure

```
aethon-app/
├── App.tsx                          # Root entry point with providers
├── app.json                        # Expo configuration
├── src/
│   ├── components/                  # Reusable UI Components
│   │   └── ui/
│   │       ├── Badge.tsx            # Status label pills
│   │       ├── Button.tsx           # Variant buttons (primary, outline, ghost, danger)
│   │       ├── Card.tsx             # Content cards with variant styles
│   │       ├── StatCard.tsx         # Dashboard metric cards
│   │       └── index.ts            # Barrel exports
│   ├── constants/
│   │   ├── config.ts               # Supabase URL + API keys
│   │   └── theme.ts                # Colors, Spacing, Radius, Fonts, Shadows
│   ├── lib/
│   │   └── supabase.ts             # Supabase client (shared backend with aethon-web)
│   ├── navigation/
│   │   ├── RootNavigator.tsx        # Auth → Role-based tab switching
│   │   ├── FamilyTabs.tsx           # Bottom tabs: Home, Vitals, Messages
│   │   └── CaregiverTabs.tsx        # Bottom tabs: Shift, Alerts
│   ├── screens/
│   │   ├── auth/
│   │   │   └── RoleSelectorScreen.tsx   # Welcome screen with role selection
│   │   ├── family/
│   │   │   ├── HomeScreen.tsx           # Updates feed + vitals strip
│   │   │   ├── MessagesScreen.tsx       # WhatsApp-style messaging
│   │   │   └── VitalsScreen.tsx         # Weekly trends + medication schedule
│   │   └── caregiver/
│   │       └── HomeScreen.tsx           # Shift dashboard + quick actions
│   └── types/
│       ├── database.ts              # TypeScript types matching Supabase schema
│       └── index.ts                 # Barrel exports
└── assets/                          # App icons, splash images
```

## 🛠️ Tech Stack

| Layer          | Technology                                      |
|----------------|------------------------------------------------|
| Framework      | React Native (Expo SDK 57)                      |
| Language       | TypeScript                                      |
| Navigation     | React Navigation (Stack + Bottom Tabs)          |
| Backend        | Supabase (shared with aethon-web)               |
| Animations     | React Native Reanimated                         |
| Haptics        | Expo Haptics                                    |
| Safe Areas     | react-native-safe-area-context                  |
| Gestures       | react-native-gesture-handler                    |
| Storage        | @react-native-async-storage/async-storage       |

## 🚀 Getting Started

```bash
cd aethon-android
npm install
npm start          # Scan QR with Expo Go app on your phone
npm run web        # Preview in browser
```

## 🔗 Shared Backend with aethon-web

This app connects to the **exact same Supabase project** as the Next.js web app. All RLS policies, database tables, and authentication flows are shared. Update `src/constants/config.ts` with your Supabase credentials.
