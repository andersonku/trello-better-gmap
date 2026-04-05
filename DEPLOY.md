# Deploying to Vercel

This guide walks through deploying the Power-Up from scratch — no prior Vercel experience needed.

---

## Prerequisites

- A [GitHub](https://github.com) account (the repo must be pushed there)
- A [Google Cloud](https://console.cloud.google.com) account to obtain a Places API key
- A [Trello](https://trello.com) account to register the Power-Up

---

## Step 1 — Get a Google Places API key

1. Go to [console.cloud.google.com](https://console.cloud.google.com) and sign in.
2. Create a new project (top-left dropdown → **New Project**), or select an existing one.
3. In the left sidebar go to **APIs & Services → Library**.
4. Search for **Places API (New)** and click **Enable**.
5. Go to **APIs & Services → Credentials → Create Credentials → API key**.
6. Copy the key. Optionally click **Restrict key** and limit it to **Places API (New)** for security.

---

## Step 2 — Deploy to Vercel

### 2a. Create a Vercel account

Go to [vercel.com](https://vercel.com) and sign up with your GitHub account.

### 2b. Import the repository

1. From the Vercel dashboard click **Add New… → Project**.
2. Under **Import Git Repository**, find and select this repo.
3. Leave all build settings at their defaults — Vercel will detect the project automatically.
4. Click **Deploy**. The first deploy will fail because the API key isn't set yet — that's fine.

### 2c. Add environment variables

1. Go to your project in the Vercel dashboard → **Settings → Environment Variables**.
2. Add the following variables. Set the **Environment** to **Production** (and optionally Preview/Development if you want them there too).

| Name | Value |
|---|---|
| `GOOGLE_PLACES_API_KEY` | The key from Step 1 |
| `PLACES_LANGUAGE` | `ja` for Japanese · `en` for English · `zh-TW` for Traditional Chinese |

3. Click **Save** for each variable.

### 2d. Redeploy

Go to **Deployments**, click the three-dot menu on the latest deployment, and select **Redeploy**. This time it will succeed.

### 2e. Note your deployment URL

Once deployed, Vercel assigns a URL like:

```
https://your-project-name.vercel.app
```

You can find it on the project's **Overview** tab. Copy it — you'll need it in the next step.

---

## Step 3 — Register the Trello Power-Up

1. Go to [trello.com/power-ups/admin](https://trello.com/power-ups/admin) and click **New**.
2. Fill in the form:
   - **Name**: anything you like, e.g. `Better Google Maps`
   - **Workspace**: select the workspace where you want to use it
   - **Iframe connector URL**: `https://your-project-name.vercel.app/index.html`
3. Under **Capabilities**, enable:
   - `attachment-sections`
   - `format-url`
4. Click **Save**.
5. You'll land on the Power-Up's page — copy the **Power-Up ID** shown there (you may need it later).

---

## Step 4 — Enable the Power-Up on a board

1. Open any board in the workspace you selected above.
2. Click **Power-Ups** in the board menu.
3. Switch to the **Custom** tab and find your Power-Up by name.
4. Click **Add**.

---

## Verification

Add a Google Maps link as a card attachment (any format — short `maps.app.goo.gl` links work too). The card thumbnail and cover should automatically update to show a venue photo within a few seconds.

---

## Updating the deployment

Any push to the `main` branch of the GitHub repo will automatically trigger a new Vercel deployment — no manual steps needed.

---

## Local development

To run locally and test the API endpoint before deploying:

```bash
# Install the Vercel CLI
npm i -g vercel

# Run the dev server (reads .env.local automatically)
vercel dev
```

The CLI tool can also be used to test a URL directly without a running server:

```bash
node lookup.mjs "https://maps.app.goo.gl/cPFYjn1Hn7wS8SLN6"
```
