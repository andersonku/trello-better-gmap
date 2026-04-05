import { isGoogleMapsUrl } from './maps-url.js';

console.log('BUHAHA plugin.js loaded');

// ---------------------------------------------------------------------------
// Venue photo helpers
// ---------------------------------------------------------------------------

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

async function fetchAndCacheVenuePhoto(t, mapsUrl) {
  const photo = await fetchVenuePhoto(mapsUrl);
  if (photo) await t.set('card', 'shared', 'venuePhoto', photo);
  return photo;
}

async function getVenuePhoto(t, mapsUrl) {
  const cached = await t.get('card', 'shared', 'venuePhoto');
  if (cached && cached.url) return cached;
  return fetchAndCacheVenuePhoto(t, mapsUrl);
}

// ---------------------------------------------------------------------------
// Trello REST API helpers
// ---------------------------------------------------------------------------

function trelloFetch(path, method, body, apiKey, token) {
  const sep = path.includes('?') ? '&' : '?';
  const url = 'https://api.trello.com/1' + path + sep +
    'key=' + apiKey + '&token=' + token;
  return fetch(url, {
    method: method || 'GET',
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  }).then(function (r) { return r.json(); });
}

// ---------------------------------------------------------------------------
// Board button callback: Fix Google Maps
// ---------------------------------------------------------------------------

function makeFixGoogleMaps(apiKey) {
  return async function fixGoogleMaps(t) {
    console.log('BUHAHA fixGoogleMaps start');

    const api = t.getRestApi();
    const isAuthorized = await api.isAuthorized();
    console.log('BUHAHA isAuthorized:', isAuthorized);

    if (!isAuthorized) {
      return t.popup({
        title: 'Authorize Better Google Maps',
        url: t.signUrl('./authorize.html'),
        height: 140,
      });
    }

    const token = await api.getToken();
    console.log('BUHAHA token obtained:', !!token);

    const boardId = t.getContext().board;
    console.log('BUHAHA boardId:', boardId);

    const cards = await trelloFetch(
      '/boards/' + boardId + '/cards?attachments=true',
      'GET', null, apiKey, token
    );
    console.log('BUHAHA cards fetched:', Array.isArray(cards) ? cards.length : cards);
    console.log('BUHAHA cards:', JSON.stringify(cards, null, 2));

    let fixed = 0;
    for (const card of cards) {
      const mapsAttachment = (card.attachments || []).find(function (a) {
        return isGoogleMapsUrl(a.url);
      });
      if (!mapsAttachment) continue;

      // Skip if the card already has an uploaded image as its cover
      const coverAttachmentId = card.cover && card.cover.idAttachment;
      if (coverAttachmentId) {
        const coverAttachment = (card.attachments || []).find(function (a) {
          return a.id === coverAttachmentId;
        });
        if (coverAttachment && coverAttachment.isUpload && coverAttachment.mimeType && coverAttachment.mimeType.startsWith('image/')) {
          console.log('BUHAHA skipping card (cover already set):', card.name);
          continue;
        }
      }

      console.log('BUHAHA processing card:', card.name, mapsAttachment.url);

      const photo = await fetchVenuePhoto(mapsAttachment.url);
      console.log('BUHAHA venue photo:', photo);
      if (!photo) continue;

      // 1. Add venue photo as an attachment
      const attachment = await trelloFetch(
        '/cards/' + card.id + '/attachments',
        'POST',
        { url: photo.url, name: photo.name },
        apiKey, token
      );
      console.log('BUHAHA attachment created:', attachment.id);

      // 2. Set it as the card cover
      const updated = await trelloFetch(
        '/cards/' + card.id,
        'PUT',
        { cover: { idAttachment: attachment.id, size: 'full' } },
        apiKey, token
      );
      console.log('BUHAHA cover updated:', updated.cover);

      fixed++;
    }

    t.alert({
      message: fixed
        ? 'Done! Updated ' + fixed + ' card' + (fixed === 1 ? '' : 's') + '.'
        : 'No cards with Google Maps attachments found.',
      duration: 5,
    });
  };
}

// ---------------------------------------------------------------------------
// Boot: fetch config then initialize
// ---------------------------------------------------------------------------

fetch('/api/config')
  .then(function (r) { return r.json(); })
  .then(function (cfg) {
    const apiKey = cfg.trelloApiKey;
    console.log('BUHAHA config loaded, apiKey present:', !!apiKey);

    window.TrelloPowerUp.initialize(
      {
        'board-buttons': function () {
          return [{
            icon: {
              dark: 'https://www.google.com/favicon.ico',
              light: 'https://www.google.com/favicon.ico',
            },
            text: 'Fix Google Maps',
            callback: makeFixGoogleMaps(apiKey),
            condition: 'edit',
          }];
        },

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
      },
      {
        appKey: apiKey,
        appName: 'Better Google Maps',
      }
    );
  });
