# Aethon product rules for this app

This app is the Aethon mobile app for Android (and later iOS), built with
Expo. The product specification is `docs/BUILD_GUIDE.txt`, a text copy of
"Aethon Build Guide v1.0". The guide was written for a plain React Native
iOS app, so adapt its instructions to this Expo project as described below.
AGENTS.md covers how to work with Expo; this file covers what to build.

## Keep the existing project as it is

- Navigation: keep the existing React Navigation setup in `src/navigation`.
  Do not migrate to Expo Router, even though AGENTS.md mentions it, unless
  I ask for it explicitly.
- Design: use the existing theme in `src/constants/theme.ts` and the
  components in `src/components/ui`. Match the style of existing screens.
- Data: the app talks to Supabase directly through `src/lib/supabase.ts`.
  Types for the database are in `src/types/database.ts`.
- Do not rename, move or rewrite existing screens unless the feature
  requires it, and say why when it does.

## Workflow for every feature

1. I will name one feature (usually a guide increment such as 6.1).
   Read it in `docs/BUILD_GUIDE.txt`, including its "Done when" list.
2. Before writing code, tell me: which screens change, which Supabase
   tables and columns it needs, and whether any are missing.
3. Never assume a table or column exists. If something is missing, write
   the SQL to `docs/sql/NNN_feature_name.sql` (additive only: no drop,
   rename, truncate, delete or type change; "if not exists" throughout;
   enable row level security on every new table; include the policies it
   needs with a comment explaining each). Do not run it. I am working
   alone for now, against my own Supabase project for development, and I
   run SQL on it myself after reading it. Divesh will merge my work into
   his repo later and run the same SQL files, in number order, on his
   database — so every database change must be a numbered file in
   docs/sql/ (001_..., 002_...), additive only, and never edited once it
   has been run: a new change always goes in a new file.
4. Implement the feature. Install packages only with `npx expo install`.
5. Run `npx tsc --noEmit` and `npx expo lint` and fix every error.
6. Tell me whether it still runs in Expo Go or now needs a development
   build, and how to test each "Done when" item on an Android phone.
7. Stop and wait for me to confirm before the next feature. Suggest a
   commit message and a pull request description; do not commit.

## Library choices (Expo equivalents of the guide's libraries)

- Audio recording (5.1): `expo-audio`.
- Clipboard (7.1, 7.3): `expo-clipboard`.
- PDF export and sharing (7.3): `expo-print` and `expo-sharing`.
- Local medication reminders (10.4): `expo-notifications`, local
  scheduled notifications only. No push tokens yet.
- On-device transcription (5.2): `whisper.rn`. This needs a development
  build, so it is built last. Ask me before adding it.
- Prefer Expo modules that run in Expo Go. Ask me before adding anything
  that needs a development build.

## Rules that must not be relaxed

- Display, do not evaluate (guide 1.4): no thresholds, scores, automatic
  alerts or recommendations derived from health observations. Documented
  exceptions: band colours for recorded pain and mood values (6.1, 6.2),
  and the medication streak line (10.3), shown whenever a run exists, with
  no minimum-day threshold and no failure state.
- If an existing screen already evaluates health values against thresholds
  (for example automatic alerts), do not extend it. Tell me, so the team
  can decide.
- Families see structure, never clinical prose (guide 8): never show
  visit note transcripts or escalation reasons in family screens.
- Notes are never confirmed automatically (5.3).
- Follow-up prompts are worded "Ask about ..." (6.3).
- Report honestly: an escalation is "recorded", not "sent" (7.1); a failed
  assistance request shows the failure message and the emergency number
  (10.5).
- Audio never leaves the device and is deleted after transcription (5.2).
- Resident-facing screens (chapter 10): no text below 22pt, no control
  below 80pt, no swipe or long-press, no tab bar or menu. Handle the
  Android back button and back gesture explicitly on every resident screen.
- The required sentences in guide 11.2 appear exactly where specified.

## Never

- Put a service role key, database password or OAuth client secret in the
  app. Only the Supabase URL and anon key belong in the app.
- Run SQL against the database, or change Supabase settings.
- Edit generated `ios/` or `android/` folders by hand.
- Commit secrets or large model files.
