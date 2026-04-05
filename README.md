# Trello Better Google Maps

A Trello Power-Up that enriches cards containing Google Maps links by automatically fetching venue photos from the Google Places API and setting them as card covers.

## Features

- **Automatic venue photos** — paste a Google Maps URL as a card attachment and the venue photo is shown via `format-url`
- **"Fix Google Maps" board button** — one click processes every card on the board:
  - Cards with a Google Maps attachment → venue photo set as full card cover
  - Cards whose name is a Maps URL → card renamed to the venue name, URL preserved as an attachment, venue photo set as cover
  - Already-covered cards (uploaded image) are skipped
- **`card-from-url`** — drag or paste a Maps URL to create a new card and the venue name is automatically used as the card title
- Supports Japanese (`ja`), English (`en`), and Traditional Chinese (`zh-TW`) via `PLACES_LANGUAGE`

---

## Setup

You will need accounts on Google Cloud, Vercel, and Trello.

### 1. Google Places API key

1. Go to [console.cloud.google.com](https://console.cloud.google.com) and sign in.
2. Create or select a project.
3. Go to **APIs & Services → Library**, search for **Places API (New)**, and click **Enable**.
4. Go to **APIs & Services → Credentials → Create Credentials → API key**.
5. Copy the key. Optionally restrict it to **Places API (New)**.

### 2. Trello API key

1. Go to [trello.com/power-ups/admin](https://trello.com/power-ups/admin).
2. Click **New** to create a Power-Up (fill in any name and workspace for now).
3. Go to the **API Key** tab and click **Generate a new API Key**.
4. Copy the key.
5. Under **Allowed Origins**, add your Vercel deployment URL (e.g. `https://your-project.vercel.app`). You can update this after deploying.

### 3. Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) and sign up with your GitHub account.
2. Click **Add New… → Project** and import this repository.
3. Leave build settings at defaults and click **Deploy**.
4. Go to **Settings → Environment Variables** and add:

| Variable | Value |
|---|---|
| `GOOGLE_PLACES_API_KEY` | From step 1 |
| `TRELLO_API_KEY` | From step 2 |
| `PLACES_LANGUAGE` | `ja` · `en` · `zh-TW` (default: `ja`) |

5. Go to **Deployments** and **Redeploy** to pick up the env vars.
6. Note your deployment URL — e.g. `https://your-project.vercel.app`.

### 4. Register the Power-Up in Trello

1. Go back to [trello.com/power-ups/admin](https://trello.com/power-ups/admin) and open the Power-Up you created.
2. Set the **Iframe connector URL** to:
   ```
   https://your-project.vercel.app/index.html
   ```
3. Under **Capabilities**, enable:
   - `board-buttons`
   - `card-from-url`
   - `format-url`
4. Click **Save**.

### 5. Enable on a board

1. Open a Trello board.
2. Click **Power-Ups** in the board menu.
3. Go to the **Custom** tab, find your Power-Up, and click **Add**.

---

## Usage

### Fix Google Maps button

Click **Fix Google Maps** in the board header. On first use it will ask you to authorize Trello access (read + write). After authorizing, click the button again and it will process all cards on the board.

### Adding cards manually

- **Paste a Maps URL as an attachment** on any card — `format-url` will display the venue name and photo inline.
- **Drag a Maps URL onto a list** — `card-from-url` will create a new card with the venue name as the title.

---

## Local development

```bash
# Install the Vercel CLI
npm i -g vercel

# Run the dev server (reads .env.local automatically)
vercel dev
```

Test a Maps URL directly from the terminal:

```bash
node lookup.mjs "https://maps.app.goo.gl/cPFYjn1Hn7wS8SLN6"
```

Run the test suite:

```bash
npm test
```

---

## Project structure

```
api/
  config.js          # Returns public config (Trello API key) to the browser
  places.js          # Serverless proxy: resolves Maps URL → venue photo URL
  places-core.js     # Shared Places API (New) logic
public/
  index.html         # Power-Up connector iframe
  plugin.js          # Power-Up capabilities
  maps-url.js        # Google Maps URL regex (shared with tests)
  authorize.html     # OAuth callback popup
  section.html/js    # attachment-sections iframe (unused by default)
lookup.mjs           # CLI tool for testing
test/
  plugin.test.mjs    # URL regex unit tests
```
