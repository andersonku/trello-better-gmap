// Matches all common Google Maps URL forms, including short links
const GOOGLE_MAPS_RE = /https?:\/\/(www\.)?(google\.com\/maps|maps\.google\.com|goo\.gl\/maps|maps\.app\.goo\.gl)/;

function isGoogleMapsUrl(url) {
  return GOOGLE_MAPS_RE.test(url);
}

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

TrelloPowerUp.initialize({
  // Overrides the attachment thumbnail for Google Maps URLs.
  // Takes priority over Trello's native Maps preview.
  'attachment-thumbnail': function (t, options) {
    if (!isGoogleMapsUrl(options.url)) return;
    return getVenuePhoto(t, options.url).then(function (photo) {
      if (!photo) return;
      return { url: photo.url, title: photo.name || 'Venue Photo' };
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
        image: {
          url: photo.url,
          title: photo.name || 'Venue Photo',
        },
      };
    });
  },
});
