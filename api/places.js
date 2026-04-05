/**
 * GET /api/places?url=<encoded-google-maps-url>
 *
 * Serverless proxy that resolves a Google Maps URL to a venue photo URL
 * using the Google Places API. The API key is kept server-side via the
 * GOOGLE_PLACES_API_KEY environment variable and never exposed to the client.
 *
 * Responses are cached for 24 hours at the CDN and browser level.
 */
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
      placeId = await searchPlaceId(placeQuery.query, apiKey);
      if (!placeId) {
        return res.status(404).json({ error: 'Place not found' });
      }
    }

    const { photoRef, placeName } = await fetchPlaceDetails(placeId, apiKey);
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function resolveUrl(url) {
  const isShort =
    url.includes('goo.gl/maps') || url.includes('maps.app.goo.gl');
  if (!isShort) return url;
  const res = await fetch(url, { redirect: 'follow' });
  return res.url;
}

function extractPlaceQuery(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  // ?q=place_id:ChIJ... or ?q=Place+Name
  const q = parsed.searchParams.get('q') || '';
  if (q.startsWith('place_id:')) {
    return { placeId: q.replace('place_id:', '') };
  }

  // /maps/place/Place+Name/@lat,lng,...
  const placeMatch = parsed.pathname.match(/\/maps\/place\/([^/@]+)/);
  if (placeMatch) {
    return { query: decodeURIComponent(placeMatch[1].replace(/\+/g, ' ')) };
  }

  // /maps/search/Place+Name/...
  const searchMatch = parsed.pathname.match(/\/maps\/search\/([^/@]+)/);
  if (searchMatch) {
    return { query: decodeURIComponent(searchMatch[1].replace(/\+/g, ' ')) };
  }

  if (q) {
    return { query: q };
  }

  return null;
}

async function searchPlaceId(query, apiKey) {
  const url =
    'https://maps.googleapis.com/maps/api/place/textsearch/json' +
    '?query=' + encodeURIComponent(query) +
    '&key=' + apiKey;
  const res = await fetch(url);
  const data = await res.json();
  return data.results && data.results[0] ? data.results[0].place_id : null;
}

async function fetchPlaceDetails(placeId, apiKey) {
  const url =
    'https://maps.googleapis.com/maps/api/place/details/json' +
    '?place_id=' + encodeURIComponent(placeId) +
    '&fields=name,photos' +
    '&key=' + apiKey;
  const res = await fetch(url);
  const data = await res.json();
  const result = data.result || {};
  const photoRef =
    result.photos && result.photos[0]
      ? result.photos[0].photo_reference
      : null;
  return { photoRef, placeName: result.name || '' };
}

async function resolvePhotoUrl(photoRef, apiKey) {
  const photoApiUrl =
    'https://maps.googleapis.com/maps/api/place/photo' +
    '?maxwidth=1200' +
    '&photoreference=' + encodeURIComponent(photoRef) +
    '&key=' + apiKey;
  // Follow the redirect — the final URL is a public CDN URL with no API key.
  const res = await fetch(photoApiUrl, { redirect: 'follow' });
  return res.url;
}
