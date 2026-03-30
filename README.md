# Kana Flow

**Kana Flow** is a mobile application for learning Japanese (Hiragana and Katakana). The application focuses on quick recall through flashcards, memory checking with a question card system, cloud (or local offline) data synchronization capabilities, and a bilingual interface (Vietnamese / English).

## 🛠 Technology Stack
- **React 19 + Vite + TypeScript**
- **React Router v7**
- **Tailwind CSS v4**
- **Zustand** (State Management)
- **TanStack Query**
- **Framer Motion** (Smooth card flipping animations)
- **react-i18next** (Multilingual system)
- **Supabase** (Cloud database storage & authentication)
- **vite-plugin-pwa** (Installs app as a Progressive Web App, supports saving on iOS/Android devices)
- **Agentation** (Visual UI development tool)

## 🌟 Key Features

### 1. Alphabet Learning
- **Hiragana**: 46 basic characters, dakuten/handakuten (voiced/half-voiced), youon (contracted sounds), sokuon (double consonants), and long vowels.
- **Katakana**: Similar to Hiragana, plus extended katakana (loanwords/long vowels).
- **Flexible Character Selection**:
  - Select individual characters.
  - Quick select an entire horizontal row.
  - Select by broad categories (basic characters, voiced sounds, contracted sounds...).
  - Select all with a single click.
  - Live summary indicating the number of selected flashcards.

### 2. Study Mode
- Learn sequentially through flashcards with eye-catching flip animations.
- Supports customizable keyboard shortcuts for the Desktop layout, making flipping and skipping questions faster and more convenient.

### 3. Review Mode
- Multiple-choice quizzing (4 options) from the current vocabulary pool.
- Randomizes the board order.
- **Smart Reminder Mechanism**: 
  - By default, each question needs to be answered correctly 5 times (`remaining = 5`).
  - Correct answer (-1 remaining), incorrect answer results in a penalty (+3 remaining added).
  - The review session only ends when all selected words reach the target of `0` remaining correct answers.
- Option to toggle visibility and view the correct answer immediately if answered incorrectly.

### 4. Progress Statistics
- Displays memory level through a statistics dashboard.
- Analyzes and reports on struggling characters (weak items).
- Tracks the history of your study / review sessions and correct/incorrect attempt counts.
- Displays proficiency breakdown by groups (Hiragana/Katakana) or detailed character categories.

### 5. Personalization Settings
- Theme adjustments (Light / Dark / System Auto).
- Display language (Default: Vietnamese, supports English).
- Detailed customization of keyboard shortcuts.
- Monitors database synchronization status (Cloud Persistence <-> Local Fallback).
- Install the App (PWA Shortcut) to your phone screen just like a Native app.

## 🚀 Installation & Local Development setup

### Development Environment Requirements
- Node.js.
- Supabase account (if you want to test cloud storage features).

### Project Setup Steps
1. **Install Dependencies**:
   ```bash
   npm install
   ```
2. **Set up project environment variables**:
   Copy the reference `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   *(For Windows PowerShell)*:
   ```powershell
   Copy-Item .env.example .env
   ```
3. **Start the Development Server**:
   ```bash
   npm run dev
   ```
4. **Build source code for Production**:
   ```bash
   npm run build
   ```
5. **Run the System Test script**:
   ```bash
   npm run test
   ```

## ☁️ Supabase Configuration (Optional)

If you want the App to function with Cloud Save (to sync learning progress between PC and phone):
1. Initialize a new project on the Supabase platform.
2. Enable *Anonymous* Auth (Automatic login without identity).
3. Add your Web URL to the "Auth redirect URLs" to later upgrade Identity linking.
4. Read/run the table structure SQL file at `supabase/migrations/001_initial.sql`.
5. Generate the Kana Seed Database data file using the integrated local command:
   ```bash
   npm run seed:generate
   ```
6. Paste the generated query inside `supabase/seed.sql` directly into Supabase's SQL Editor and run it.
7. Update and save the `.env` file with API contents:
   - `VITE_SUPABASE_URL=...`
   - `VITE_SUPABASE_ANON_KEY=...`
   - `VITE_APP_URL=http://localhost:5173`
   - `VITE_AGENTATION_ENDPOINT=` (Used exclusively for internal VM UI Tools)

*🚨 System note: The `supabase/seed.sql` file is an automated render extracted from the Data Master code file `src/lib/kana-data.ts`. Any changes or modifications to the Romaji/Japanese character structure within it must be accompanied by re-running the `npm run seed:generate` command.*

If **not using the Supabase DB configuration**, the app will default to operating in **Offline Persistence Mode** via the device's Local Storage memory.

## 🧬 Core Directory Structure
- `src/components`: Reusable components/General UI Layouts (`layout.tsx`, `ui.tsx`).
- `src/pages`: All functional Routing pages (Main screen, alphabet board, review, progress, settings,...).
- `src/lib`: The application's business logic suite:
  - `kana-data.ts`: Comprehensive Master Data for Romaji, Vi-En definitions, character info.
  - `review-engine.ts`: Contains the algorithm for generating 4-option tests and sorting study Review loops.
  - `progress.ts`: Updates logic to increase character memory streaks, navigate saving status items...
  - `storage.ts`: Data Access Layer station with full control over sync states with Supabase / Offline Local Web Storage.
  - `i18n.ts`: App localization setup logic.
- `src/store`: Global App State sharing system via Zustand library to manage user flow and cache configuration states (`use-app-store.ts`).
- `supabase/`: Stores DB Model definitions and queries related to the Cloud Backend.