const express = require("express");
const EmailJob = require("../models/EmailJob");
const ProviderCounter = require("../models/ProviderCounter");
const scheduleEmailJob = require("../utils/scheduleEmail");
const auth = require("../middleware/authMiddleware");

const router = express.Router();

// ── Provider rotation lists ──────────────────────────────────────────────────
const COMPREHENSIVE_PROVIDERS = ["tangerine-comprehensive", "existing", "nsia"];

const THIRD_PARTY_PROVIDERS = ["existing", "tangerine-third-party"];
// const THIRD_PARTY_PROVIDERS = [
//   "existing",
//   "tangerine-third-party",
//   "staging-third-party",
// ];

// ── Get next provider (rotates automatically, persisted in MongoDB) ───────────
router.get("/next-provider", auth, async (req, res) => {
  try {
    const { coverType } = req.query;

    const isComprehensive = coverType === "Comprehensive";
    const counterName = isComprehensive ? "comprehensive" : "third-party";
    const providerList = isComprehensive
      ? COMPREHENSIVE_PROVIDERS
      : THIRD_PARTY_PROVIDERS;

    const counter = await ProviderCounter.findOneAndUpdate(
      { name: counterName },
      { $inc: { current: 1 } },
      { upsert: true, new: false },
    );

    const index = (counter?.current ?? 0) % providerList.length;
    const provider = providerList[index];

    console.log(
      `[Provider] coverType=${coverType} → ${provider} (index ${index})`,
    );

    res.json({ provider });
  } catch (err) {
    console.error("Error getting next provider:", err);
    res.status(500).json({ error: "Could not determine provider" });
  }
});

// ── Submit policy ─────────────────────────────────────────────────────────────
router.post("/submit", auth, async (req, res) => {
  try {
    let { additionalData, proxyData } = req.body;

    if (Array.isArray(additionalData) && Array.isArray(proxyData)) {
      const jobs = [];

      for (let i = 0; i < additionalData.length; i++) {
        const newJob = new EmailJob({
          userId: req.userId,
          additionalData: additionalData[i],
          proxyData: proxyData[i],
          status: "pending",
        });

        await newJob.save();
        const { scheduledFor } = await scheduleEmailJob(newJob._id);
        jobs.push({ jobId: newJob._id, scheduledFor });
      }

      return res.json({ success: true, count: jobs.length, jobs });
    }

    const newJob = new EmailJob({
      userId: req.userId,
      additionalData,
      proxyData,
      status: "pending",
    });

    await newJob.save();
    const { scheduledFor } = await scheduleEmailJob(newJob._id);

    return res.json({ success: true, jobId: newJob._id, scheduledFor });
  } catch (error) {
    console.error("Error saving EmailJob:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ── My documents ──────────────────────────────────────────────────────────────
router.get("/my-documents", auth, async (req, res) => {
  try {
    const docs = await EmailJob.find({
      userId: req.userId,
      documentUrl: { $ne: null },
    });
    res.json(docs);
  } catch (err) {
    console.error("Error fetching documents:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ── Customer details by phone ─────────────────────────────────────────────────
router.get("/customer-details", async (req, res) => {
  try {
    const { phone } = req.query;

    if (!phone) {
      return res.status(400).json({ error: "Phone number is required." });
    }

    const normalizedPhone = phone.replace(/[\s\-]/g, "");

    const jobs = await EmailJob.find({
      "proxyData.phone": {
        $regex: new RegExp(normalizedPhone.split("").join("\\s*")),
        $options: "i",
      },
    });

    if (jobs.length === 0) {
      return res.status(404).json({ error: "Phone number not found." });
    }

    res.status(200).json(jobs);
  } catch (err) {
    console.error("Error querying email jobs by phone:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
