/**
 * Shared logic for resolving a Google Maps URL to Places API data.
 * Uses the Places API (New) — v1 endpoints on places.googleapis.com.
 * Used by both the serverless handler (api/places.js) and the CLI (lookup.mjs).
 */

export async function resolveUrl(url) {
  const isShort =
    url.includes('goo.gl/maps') || url.includes('maps.app.goo.gl');
  if (!isShort) return url;
  const res = await fetch(url, { redirect: 'follow' });
  return res.url;
}

export function extractPlaceQuery(url) {
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

export async function searchPlaceId(query, apiKey, languageCode = 'ja') {
  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'places.id',
    },
    body: JSON.stringify({ textQuery: query, languageCode }),
  });
  const data = await res.json();
  return data.places?.[0]?.id ?? null;
}

export async function fetchPlaceDetails(placeId, apiKey, languageCode = 'ja') {
  const res = await fetch(
    `https://places.googleapis.com/v1/places/${placeId}?languageCode=${languageCode}`,
    {
      headers: {
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'displayName,photos',
      },
    }
  );
  const data = await res.json();
  // photos[].name is the full resource path used by the photo media endpoint
  const photoRef = data.photos?.[0]?.name ?? null;
  return { photoRef, placeName: data.displayName?.text || '' };
}

export async function resolvePhotoUrl(photoRef, apiKey) {
  // skipHttpRedirect=true returns JSON { photoUri } instead of a redirect,
  // keeping the API key server-side.
  const res = await fetch(
    `https://places.googleapis.com/v1/${photoRef}/media?maxWidthPx=1200&skipHttpRedirect=true`,
    { headers: { 'X-Goog-Api-Key': apiKey } }
  );
  const data = await res.json();
  return data.photoUri;
}
