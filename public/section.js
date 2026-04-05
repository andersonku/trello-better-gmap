const t = window.TrelloPowerUp.iframe();

const mapsUrl = t.arg('url');

async function render() {
  const root = document.getElementById('root');

  if (!mapsUrl) {
    root.innerHTML = '<p id="error">No URL provided.</p>';
    t.sizeTo(root);
    return;
  }

  // Try cache first
  let photo = await t.get('card', 'shared', 'venuePhoto');

  // Fetch if not cached
  if (!photo || !photo.url) {
    try {
      const res = await fetch('/api/places?url=' + encodeURIComponent(mapsUrl));
      if (res.ok) {
        const data = await res.json();
        if (data.photoUrl) {
          photo = { url: data.photoUrl, name: data.placeName || '' };
          await t.set('card', 'shared', 'venuePhoto', photo);
        }
      }
    } catch (err) {
      console.error('section: fetch failed', err);
    }
  }

  if (photo && photo.url) {
    root.innerHTML = `
      <img id="photo" src="${photo.url}" alt="${photo.name}" />
      <div id="name">${photo.name}</div>
    `;
  } else {
    root.innerHTML = '<p id="error">Could not load venue photo.</p>';
  }

  t.sizeTo(root);
}

render();
