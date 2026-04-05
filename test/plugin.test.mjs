import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isGoogleMapsUrl } from '../public/maps-url.js';

// --- should match ---
const MATCHING = [
  'https://maps.app.goo.gl/kt37Ug9pFKpmDoLv8',
  'https://maps.app.goo.gl/cPFYjn1Hn7wS8SLN6',
  'https://goo.gl/maps/abc123',
  'https://www.google.com/maps/place/Eiffel+Tower/@48.8584,2.2945,17z',
  'https://google.com/maps/place/SomePlace',
  'https://maps.google.com/maps?q=sydney+opera+house',
  'http://maps.app.goo.gl/shortlink',
];

// --- should NOT match ---
const NON_MATCHING = [
  'https://google.com',
  'https://docs.google.com/maps',
  'https://example.com/maps',
  'https://notgooglemaps.com',
  'just some text',
  '',
];

for (const url of MATCHING) {
  test(`matches: ${url}`, () => {
    assert.ok(isGoogleMapsUrl(url), `expected to match: ${url}`);
  });
}

for (const url of NON_MATCHING) {
  test(`does not match: ${url}`, () => {
    assert.ok(!isGoogleMapsUrl(url), `expected NOT to match: ${url}`);
  });
}
