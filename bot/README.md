# FreePDF AI Telegram Bot (`@hscfreepdf`)

Zero-database Telegram group search bot powered by **Gemini AI** + this repo's local Bangla/English search engine (`lib/search.ts`).

## How It Works Without a Database (No Channel Admin Needed!)
1. **Uses Your CSV Data (`bot/data/index.json`):** Seeded directly from `data/source/HSCFreePDF_Complete_Index.csv` (~1,153 posts + PDF filenames) and kept in memory for instant search.
2. **Discussion Group Only (`DELIVERY_MODE=link`, default):** You do **not** need to add the bot as an Admin in `@hscfreepdf`! Just add it as Admin in your **Discussion Group**. Gemini AI finds the exact + similar PDFs and replies with a clean result card and **1-tap buttons** that open the exact PDF post in `@hscfreepdf` directly inside Telegram.
3. **Optional Direct File Copy & Auto-Sync (for later):** If you ever add the bot as Admin in `@hscfreepdf` later, set `DELIVERY_MODE=copy` and `AUTO_INDEX=true` in `.env` to copy PDF files directly and auto-index new channel posts in real time.

---

## Quick Setup (2 Minutes)

### 1. Create the Bot & Keys
- **Telegram Bot Token:** Message [@BotFather](https://t.me/BotFather) → `/newbot` → copy the token.
- **Gemini API Key:** Get a free key from [Google AI Studio](https://aistudio.google.com/apikey).

### 2. Configure `.env`
Paste your 2 keys into `.env`:
```env
TELEGRAM_BOT_TOKEN=123456:ABC...
GEMINI_API_KEY=AIza...
CHANNEL_ID=@hscfreepdf
CHANNEL_USERNAME=hscfreepdf
DELIVERY_MODE=link
AUTO_INDEX=false
```

### 3. Add the Bot to Your Discussion Group
- Add the bot as an **Admin** in your **Discussion Group** (making it Group Admin automatically allows `/pdf`, `@YourBotName <query>` mentions, and reply follow-ups!).
- No channel admin needed!

### 4. Seed & Run
```bash
# Build bot/data/index.json from the existing channel index + CSV filenames
npm run bot:seed

# Test search locally (works with or without GEMINI_API_KEY)
npm run bot:test -- "topon sir physics 2nd paper dagano"

# Start the bot (development with auto-reload)
npm run bot:dev

# Start the bot (production)
npm run bot:start
```

---

## Group Usage
- `/pdf <book name>` or `/search <book name>` — Finds the best PDF and sends it with clickable **Similar PDF** buttons.
- `@YourBotName <query>` — Natural Bangla, Banglish, or English search (e.g., `@YourBotName hazari chem 1st paper dagano boi`).
- **Reply to any bot result** — Ask follow-ups like *"1st paper ta dao"* or *"similar aro dao"*.
- **Direct Message (DM)** — Send any query directly without `/pdf`.
- `/stats` — Shows indexed post/PDF counts and AI engine status.
- `/exportindex` — (Admin only, via `ADMIN_USER_IDS`) Sends `index.json` backup directly in Telegram.

---

## Deploying Always-On (Railway / Render / Koyeb / VPS)
A ready-to-use `Dockerfile` and `/health` HTTP endpoint are included:
- **Railway / Render / Koyeb:** Connect this repo using `Dockerfile`, add `TELEGRAM_BOT_TOKEN`, `GEMINI_API_KEY`, and `CHANNEL_ID` in environment variables.
  - If your host provides a persistent volume (e.g., mounted at `/data`), set `INDEX_PATH=/data/index.json` so auto-indexed posts persist across redeploys.
  - On ephemeral free tiers without a volume, set `BACKUP_CHAT_ID` to a private channel/chat to receive automatic `index.json` backups whenever you post new PDFs.
- **VPS (Ubuntu / Debian):** Run with `pm2 start "npm run bot:start" --name freepdf-bot`.
