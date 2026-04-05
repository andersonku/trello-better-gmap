import { isGoogleMapsUrl } from './maps-url.js';

console.log('BUHAHA plugin.js loaded');

// Fetch venue photo from the Vercel proxy and cache it in Trello card data.
// Returns { url, name } or null on failure.
async function fetchAndCacheVenuePhoto(t, mapsUrl) {
  console.log('BUHAHA fetchAndCacheVenuePhoto', mapsUrl);
  try {
    const res = await fetch('/api/places?url=' + encodeURIComponent(mapsUrl));
    console.log('BUHAHA response status', res.status);
    if (!res.ok) {
      const text = await res.text();
      console.error('BUHAHA api error', res.status, text);
      return null;
    }
    const data = await res.json();
    console.log('BUHAHA api data', data);
    const { photoUrl, placeName } = data;
    if (!photoUrl) {
      console.warn('BUHAHA no photoUrl in response');
      return null;
    }
    const photo = { url: photoUrl, name: placeName || '' };
    await t.set('card', 'shared', 'venuePhoto', photo);
    return photo;
  } catch (err) {
    console.error('BUHAHA fetch failed', err);
    return null;
  }
}

// Return cached venue photo, or fetch it if not cached yet.
async function getVenuePhoto(t, mapsUrl) {
  const cached = await t.get('card', 'shared', 'venuePhoto');
  if (cached && cached.url) return cached;
  return fetchAndCacheVenuePhoto(t, mapsUrl);
}

window.TrelloPowerUp.initialize({
  // Claims Google Maps attachments and renders a venue photo section
  // on the card back. attachment-thumbnail is not called by Trello for
  // Google Maps URLs since Trello handles those natively.
  'attachment-sections': function (t, options) {
    console.log('BUHAHA attachment-sections called', options.entries);
    var claimed = options.entries.filter(function (a) {
      return isGoogleMapsUrl(a.url);
    });
    if (!claimed.length) return [];
    return claimed.map(function (attachment) {
      return {
        id: attachment.id,
        claimed: [attachment],
        icon: 'https://www.google.com/favicon.ico',
        title: 'Venue Photo',
        content: {
          type: 'iframe',
          url: t.signUrl('./section.html', { url: attachment.url }),
          height: 260,
        },
      };
    });
  },

  // When a Google Maps URL is pasted/dropped to create a new card,
  // automatically sets the card name to the venue name.
  'card-from-url': function (t, options) {
    console.log('BUHAHA card-from-url called', options.url);
    if (!isGoogleMapsUrl(options.url)) {
      throw t.NotHandled();
    }
    return fetchAndCacheVenuePhoto(t, options.url).then(function (photo) {
      if (!photo) throw t.NotHandled();
      return { name: photo.name };
    });
  },

  // Handles Google Maps URLs appearing in descriptions and comments.
  'format-url': function (t, options) {
    console.log('BUHAHA format-url called', options.url);
    if (!isGoogleMapsUrl(options.url)) return;
    return getVenuePhoto(t, options.url).then(function (photo) {
      if (!photo) return;
      return {
        icon: 'https://www.google.com/favicon.ico',
        text: photo.name || 'Google Maps',
        image: {
          url: photo.url,
          title: photo.name || 'Venue Photo',
        },
      };
    });
  },
});
