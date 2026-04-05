/**
 * GET /api/places?url=<encoded-google-maps-url>
 *
 * Serverless proxy that resolves a Google Maps URL to a venue photo URL
 * using the Google Places API. The API key is kept server-side via the
 * GOOGLE_PLACES_API_KEY environment variable and never exposed to the client.
 *
 * Responses are cached for 24 hours at the CDN and browser level.
 */
import {
  resolveUrl,
  extractPlaceQuery,
  searchPlaceId,
  fetchPlaceDetails,
  resolvePhotoUrl,
} from './places-core.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url } = req.query;
  if (!url) {
    return res.status(400).json({ error: 'Missing url parameter' });
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  const language = process.env.PLACES_LANGUAGE || 'ja';

  try {
    // Resolve short URLs (goo.gl/maps or maps.app.goo.gl) by following redirects
    const resolvedUrl = await resolveUrl(url);

    const placeQuery = extractPlaceQuery(resolvedUrl);
    if (!placeQuery) {
      return res.status(400).json({ error: 'Could not extract place info from URL' });
    }

    // If we already have a place_id, skip the search step
    let placeId = placeQuery.placeId;
    if (!placeId) {
      placeId = await searchPlaceId(placeQuery.query, apiKey, language);
      if (!placeId) {
        return res.status(404).json({ error: 'Place not found' });
      }
    }

    const { photoRef, placeName } = await fetchPlaceDetails(placeId, apiKey, language);
    if (!photoRef) {
      return res.status(404).json({ error: 'No photos found for this place' });
    }

    // The Places photo endpoint redirects to a public CDN URL (no key in the final URL).
    // We follow the redirect server-side so the API key is never sent to the client.
    const photoUrl = await resolvePhotoUrl(photoRef, apiKey);

    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400');
    return res.status(200).json({ photoUrl, placeName, placeId });
  } catch (err) {
    console.error('[places] error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
