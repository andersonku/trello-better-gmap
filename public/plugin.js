import { isGoogleMapsUrl } from './maps-url.js';

console.log('BUHAHA plugin.js loaded');

// ---------------------------------------------------------------------------
// Config — fetch public Trello API key from server
// ---------------------------------------------------------------------------

let trelloApiKey = '';
fetch('/api/config')
  .then(function (r) { return r.json(); })
  .then(function (cfg) {
    trelloApiKey = cfg.trelloApiKey;
    console.log('BUHAHA config loaded, trelloApiKey present:', !!trelloApiKey);
  });

// ---------------------------------------------------------------------------
// Venue photo helpers
// ---------------------------------------------------------------------------

// Fetch venue photo from the Vercel proxy. Returns { url, name } or null.
async function fetchVenuePhoto(mapsUrl) {
  try {
    const res = await fetch('/api/places?url=' + encodeURIComponent(mapsUrl));
    if (!res.ok) return null;
    const { photoUrl, placeName } = await res.json();
    if (!photoUrl) return null;
    return { url: photoUrl, name: placeName || '' };
  } catch {
    return null;
  }
}

// Fetch and cache venue photo on the card. Requires a card context.
async function fetchAndCacheVenuePhoto(t, mapsUrl) {
  const photo = await fetchVenuePhoto(mapsUrl);
  if (photo) await t.set('card', 'shared', 'venuePhoto', photo);
  return photo;
}

// Return cached venue photo, or fetch it if not cached yet.
async function getVenuePhoto(t, mapsUrl) {
  const cached = await t.get('card', 'shared', 'venuePhoto');
  if (cached && cached.url) return cached;
  return fetchAndCacheVenuePhoto(t, mapsUrl);
}

// ---------------------------------------------------------------------------
// Trello REST API helpers
// ---------------------------------------------------------------------------

function trelloFetch(path, method, body, token) {
  const sep = path.includes('?') ? '&' : '?';
  const url = 'https://api.trello.com/1' + path + sep +
    'key=' + trelloApiKey + '&token=' + token;
  return fetch(url, {
    method: method || 'GET',
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  }).then(function (r) { return r.json(); });
}

async function getOrAuthorize(t) {
  let token = await t.loadSecret('token').catch(function () { return null; });
  if (token) return token;

  const returnUrl = window.location.origin + '/authorize.html';
  const authUrl = 'https://trello.com/1/authorize?' + [
    'expiration=never',
    'name=Better+Google+Maps',
    'scope=read%2Cwrite',
    'response_type=token',
    'key=' + trelloApiKey,
    'callback_method=postMessage',
    'return_url=' + encodeURIComponent(returnUrl),
  ].join('&');
  console.log('BUHAHA authUrl:', authUrl);

  token = await t.authorize(authUrl, { height: 680, width: 580 });
  await t.storeSecret('token', token);
  return token;
}

// ---------------------------------------------------------------------------
// Board button callback: Fix Google Maps
// ---------------------------------------------------------------------------

async function fixGoogleMaps(t) {
  console.log('BUHAHA fixGoogleMaps start');
  const token = await getOrAuthorize(t);
  console.log('BUHAHA token obtained:', !!token);

  const boardId = t.getContext().board;
  console.log('BUHAHA boardId:', boardId);

  // Fetch all cards on the board with their attachments
  const cards = await trelloFetch(
    '/boards/' + boardId + '/cards?attachments=true',
    'GET', null, token
  );
  console.log('BUHAHA cards fetched:', cards.length, Array.isArray(cards) ? 'array' : cards);

  let fixed = 0;
  for (const card of cards) {
    const mapsAttachment = (card.attachments || []).find(function (a) {
      return isGoogleMapsUrl(a.url);
    });
    if (!mapsAttachment) continue;
    console.log('BUHAHA processing card:', card.name, 'maps url:', mapsAttachment.url);

    const photo = await fetchVenuePhoto(mapsAttachment.url);
    console.log('BUHAHA venue photo:', photo);
    if (!photo) continue;

    // 1. Add the venue photo URL as an attachment on the card
    const attachment = await trelloFetch(
      '/cards/' + card.id + '/attachments',
      'POST',
      { url: photo.url, name: photo.name },
      token
    );
    console.log('BUHAHA attachment created:', attachment.id, attachment);

    // 2. Set that attachment as the card cover
    const updated = await trelloFetch(
      '/cards/' + card.id,
      'PUT',
      { cover: { idAttachment: attachment.id, size: 'full' } },
      token
    );
    console.log('BUHAHA card cover updated:', updated.id, updated.cover);

    fixed++;
  }

  t.alert({
    message: fixed
      ? 'Done! Updated ' + fixed + ' card' + (fixed === 1 ? '' : 's') + '.'
      : 'No cards with Google Maps attachments found.',
    duration: 5,
  });
}

// ---------------------------------------------------------------------------
// Power-Up initialization
// ---------------------------------------------------------------------------

window.TrelloPowerUp.initialize({
  'board-buttons': function () {
    return [{
      icon: {
        dark: 'https://www.google.com/favicon.ico',
        light: 'https://www.google.com/favicon.ico',
      },
      text: 'Fix Google Maps',
      callback: fixGoogleMaps,
      condition: 'edit',
    }];
  },

  // When a Google Maps URL is pasted/dropped to create a new card,
  // automatically sets the card name and image to the venue.
  'card-from-url': function (t, options) {
    if (!isGoogleMapsUrl(options.url)) throw t.NotHandled();
    return fetchVenuePhoto(options.url).then(function (photo) {
      if (!photo) throw t.NotHandled();
      return {
        name: photo.name,
        desc: photo.name,
        url: photo.url,
        image: { url: photo.url },
      };
    });
  },

  // Handles Google Maps URLs appearing in descriptions and comments.
  'format-url': function (t, options) {
    if (!isGoogleMapsUrl(options.url)) return;
    return getVenuePhoto(t, options.url).then(function (photo) {
      if (!photo) return;
      return {
        icon: 'https://www.google.com/favicon.ico',
        text: photo.name || 'Google Maps',
        image: { url: photo.url, title: photo.name || 'Venue Photo' },
      };
    });
  },
});
