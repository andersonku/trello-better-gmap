// Matches all common Google Maps URL forms, including short links
export const GOOGLE_MAPS_RE = /https?:\/\/(www\.)?(google\.com\/maps|maps\.google\.com|goo\.gl\/maps|maps\.app\.goo\.gl)/;

export function isGoogleMapsUrl(url) {
  return GOOGLE_MAPS_RE.test(url);
}
