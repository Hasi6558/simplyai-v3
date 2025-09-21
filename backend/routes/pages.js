import express from "express";
import { pool } from "../db.js";

const app = express.Router();

app.post("/:id", async (req, res) => {
  const { id } = req.params;
  const { title, content } = req.body;

  await pool.query(
    "INSERT INTO pages (id, title, content) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE title = VALUES(title), content = VALUES(content)",
    [id, title, content]
  );

  res.json({ success: true });
});

// Fetch page content
app.get("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await pool.query("SELECT * FROM pages WHERE id = ?", [id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: "Page not found" });
    }

    console.log(rows[0]);

    res.json({ data: rows[0] }); // wrap in {data: ...} so frontend works
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Update page content
app.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { title, content } = req.body;

  await pool.query("UPDATE pages SET title = ?, content = ? WHERE id = ?", [
    title,
    content,
    id,
  ]);

  res.json({ success: true });
});

export default app;
