#!/usr/bin/env node
/**
 * Usage: node lookup.mjs "<google-maps-url>"
 *
 * Resolves a Google Maps URL and prints the Places API result as JSON.
 * Reads GOOGLE_PLACES_API_KEY from .env.local or the environment.
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  resolveUrl,
  extractPlaceQuery,
  searchPlaceId,
  fetchPlaceDetails,
  resolvePhotoUrl,
} from './api/places-core.js';

// Load .env.local without requiring dotenv
const __dir = dirname(fileURLToPath(import.meta.url));
try {
  const lines = readFileSync(resolve(__dir, '.env.local'), 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
} catch { /* rely on process.env */ }

const url = process.argv[2];
if (!url) {
  console.error('Usage: node lookup.mjs "<google-maps-url>"');
  process.exit(1);
}

const apiKey = process.env.GOOGLE_PLACES_API_KEY;
if (!apiKey) {
  console.error('Error: GOOGLE_PLACES_API_KEY is not set');
  process.exit(1);
}

const language = process.env.PLACES_LANGUAGE || 'ja';

const resolvedUrl = await resolveUrl(url);
const placeQuery = extractPlaceQuery(resolvedUrl);
if (!placeQuery) {
  console.error('Error: Could not extract place info from URL');
  process.exit(1);
}

let placeId = placeQuery.placeId;
if (!placeId) {
  placeId = await searchPlaceId(placeQuery.query, apiKey, language);
  if (!placeId) {
    console.error('Error: Place not found');
    process.exit(1);
  }
}

const { photoRef, placeName } = await fetchPlaceDetails(placeId, apiKey, language);
const photoUrl = photoRef ? await resolvePhotoUrl(photoRef, apiKey) : null;

console.log(JSON.stringify({ photoUrl, placeName, placeId }, null, 2));
