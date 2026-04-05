import { isGoogleMapsUrl } from './maps-url.js';

console.log('BUHAHA plugin.js loaded');

// Fetch venue photo from the Vercel proxy. Returns { url, name } or null.
async function fetchVenuePhoto(mapsUrl) {
  console.log('BUHAHA fetchVenuePhoto', mapsUrl);
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
    return { url: photoUrl, name: placeName || '' };
  } catch (err) {
    console.error('BUHAHA fetch failed', err);
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

window.TrelloPowerUp.initialize({
  // Claims Google Maps attachments and renders a venue photo section
  // on the card back. attachment-thumbnail is not called by Trello for
  // Google Maps URLs since Trello handles those natively.
  // 'attachment-sections': function (t, options) {
  //   console.log('BUHAHA attachment-sections called', options.entries);
  //   var claimed = options.entries.filter(function (a) {
  //     return isGoogleMapsUrl(a.url);
  //   });
  //   if (!claimed.length) return [];
  //   return claimed.map(function (attachment) {
  //     return {
  //       id: attachment.id,
  //       claimed: [attachment],
  //       icon: 'https://www.google.com/favicon.ico',
  //       title: 'Venue Photo',
  //       content: {
  //         type: 'iframe',
  //         url: t.signUrl('./section.html', { url: attachment.url }),
  //         height: 260,
  //       },
  //     };
  //   });
  // },

  // When a Google Maps URL is pasted/dropped to create a new card,
  // automatically sets the card name to the venue name.
  'card-from-url': function (t, options) {
    console.log('BUHAHA card-from-url called', options.url);
    if (!isGoogleMapsUrl(options.url)) {
      throw t.NotHandled();
    }
    return fetchVenuePhoto(options.url).then(function (photo) {
      if (!photo) throw t.NotHandled();

      t.cards("all").then(function (cards) {
        console.log(JSON.stringify(cards, null, 2));
      });


      t.api('/cards', 'POST', {
        idList: t.board.lists[0].id,   // required
        name: 'My New Card',         // optional
        desc: 'Created by Power-Up', // optional
        pos: 'bottom',                  // optional: 'top', 'bottom', or a number
        urlSource: photo.url,
      });

      return {
        name: photo.name,
        url: photo.url,
        urlSource: photo.url,
        attachments: [
          {
            url: photo.url
          }
        ],
        cover: {
          date: "2026-04-04T21:51:26.635Z",
          edgeColor: "#c2b28e",
          id: "69d187dea3249afdd4e72a3c",
          idMember: "60ba172537c4e06b86edfcf6",
          name: "AHVAwerHkzZCmxwQqwF-H936C_lZSaIYd1jn53X61IUHjSXcbgXwU40ULAL-kvZY-NzXOL85YU2Z2HwGxoOyg8ndse1LugsOMlw-Zo1u4DDPurpdPfYWY3jqiIj3Q8GIjBpqclTRZoQgtQ=w426-h240-k-no.jpeg",
          previews: [],
          url: photo.url
        },
        desc: photo.name,
        image: {
          url: photo.url,
        }
      };
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
        attach: {
          url: photo.url,
        },
        image: {
          url: photo.url,
          title: photo.name || 'Venue Photo',
          size: 'cover',
        },
      };
    });
  },
});
