import express from "express";
import { query } from "../services/db";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const leads = await query("SELECT COUNT(*) FROM leads");
    const closures = await query("SELECT COUNT(*) FROM leads WHERE etapa='cerrado'");

    res.json({
      leads: Number(leads.rows[0].count),
      closures: Number(closures.rows[0].count),
      agents: 7,
      responseRate: 78,
      conversionRate: 12
    });
  } catch (err) {
    res.status(500).json({ error: "dashboard error" });
  }
});

export default router;