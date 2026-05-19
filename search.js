export default async function handler(req, res) {
  const { q, id } = req.query;

  const API_KEY = "PKKKM6QRKV6ED2ZKNULS43NRG4";
  const BASE = "https://api.golfcourseapi.com/v1";

  try {
    let url;
    if (id) {
      // Fetch full course detail by ID
      url = `${BASE}/courses/${id}`;
    } else if (q) {
      // Search by name
      url = `${BASE}/search?search_query=${encodeURIComponent(q)}`;
    } else {
      return res.status(400).json({ error: "Missing query parameter" });
    }

    const response = await fetch(url, {
      headers: { Authorization: `Key ${API_KEY}` },
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: `API error ${response.status}` });
    }

    const data = await response.json();

    // Allow CORS from your app
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET");

    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
