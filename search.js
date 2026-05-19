export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET");

  const { q, id, lat, lon } = req.query;
  const API_KEY = "PKKKM6QRKV6ED2ZKNULS43NRG4";
  const BASE = "https://api.golfcourseapi.com/v1";

  try {
    let url;
    if (id) {
      url = `${BASE}/courses/${id}`;
    } else if (lat && lon) {
      // Search by location
      url = `${BASE}/search?latitude=${lat}&longitude=${lon}&radius=25`;
    } else if (q) {
      url = `${BASE}/search?search_query=${encodeURIComponent(q)}`;
    } else {
      return res.status(400).json({ error: "Missing parameters" });
    }

    const response = await fetch(url, {
      headers: { Authorization: `Key ${API_KEY}` },
    });

    const data = await response.json();
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
