/**
 * GET /api/config
 *
 * Returns public client-side config. Only non-secret values here —
 * the Trello API key is a public key safe to expose to the browser.
 */
export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.status(200).json({
    trelloApiKey: process.env.TRELLO_API_KEY || '',
  });
}
