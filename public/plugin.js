// Matches all common Google Maps URL forms, including short links
const GOOGLE_MAPS_RE = /https?:\/\/(www\.)?(google\.com\/maps|maps\.google\.com|goo\.gl\/maps|maps\.app\.goo\.gl)/;

function isGoogleMapsUrl(url) {
  return GOOGLE_MAPS_RE.test(url);
}

// Fetch venue photo from the Vercel proxy and cache it in Trello card data.
// Returns { photoUrl, placeName } or null on failure.
async function fetchAndCacheVenuePhoto(t, mapsUrl) {
  try {
    const res = await fetch('/api/places?url=' + encodeURIComponent(mapsUrl));
    if (!res.ok) return null;
    const { photoUrl, placeName } = await res.json();
    if (!photoUrl) return null;
    const photo = { url: photoUrl, name: placeName || '' };
    await t.set('card', 'shared', 'venuePhoto', photo);
    return photo;
  } catch {
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
