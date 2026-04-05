// Matches all common Google Maps URL forms, including short links
const GOOGLE_MAPS_RE = /https?:\/\/(www\.)?(google\.com\/maps|maps\.google\.com|goo\.gl\/maps|maps\.app\.goo\.gl)/;

function isGoogleMapsUrl(url) {
  return GOOGLE_MAPS_RE.test(url);
}

// Fetch venue photo from the Vercel proxy and cache it in Trello card data.
// Returns the photo object { url, name } or null on failure.
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
  // Replace the attachment preview thumbnail for any Google Maps URL.
  // This is also responsible for populating the per-card cache so that
  // card-cover can read from it on subsequent renders.
  'attachment-thumbnail': function (t, options) {
    if (!isGoogleMapsUrl(options.url)) return;
    return getVenuePhoto(t, options.url).then(function (photo) {
      if (!photo) return;
      return { url: photo.url, title: photo.name || 'Venue Photo' };
    });
  },

  // Automatically set the venue photo as the card cover for any card that
  // has a Google Maps URL attachment. Reads from the cache written above;
  // falls back to querying card attachments directly if the cache is cold.
  'card-cover': function (t) {
    return t.get('card', 'shared', 'venuePhoto').then(function (cached) {
      if (cached && cached.url) {
        return { url: cached.url };
      }

      // Cache is cold — try to find a Maps URL in the card's attachments
      // and fetch the photo on-demand.
      return t.card('attachments').then(function (card) {
        var attachments = (card && card.attachments) || [];
        var mapsAttachment = attachments.find(function (a) {
          return isGoogleMapsUrl(a.url);
        });
        if (!mapsAttachment) return;
        return fetchAndCacheVenuePhoto(t, mapsAttachment.url).then(function (photo) {
          if (!photo) return;
          return { url: photo.url };
        });
      }).catch(function () {
        // t.card('attachments') is not available in all contexts; ignore.
      });
    });
  },
});
