const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const axios = require("axios");
const FormData = require("form-data");
require("dotenv").config();
const cookieParser = require("cookie-parser");

const authRoutes = require("./routes/auth");
const policyRoutes = require("./routes/policy");

const app = express();

// ── CORS (must be before everything else) ─────────────────────────────────────
// const allowedOrigins = [
//   "http://localhost:3000",
//   "http://localhost:5500",
//   "http://127.0.0.1:5500",
//   "http://localhost:8080",
//   "https://yourdomain.com",
//   "https://www.yourdomain.com",
//   "https://go-mega.onrender.com",
// ];

const allowedOrigins = ["http://localhost", "https://mib.pra.insure"];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS: " + origin));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
};

app.use(cors(corsOptions));
app.options("/{*any}", cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("[Server] MongoDB connected"));

app.use("/api/auth", authRoutes);
app.use("/api/policy", policyRoutes);

app.get("/keep-alive", (req, res) => res.status(200).send("Service is awake!"));

// ── Gadget ────────────────────────────────────────────────────────────────────
app.post("/api/cors/gadget", async (req, res) => {
  try {
    const response = await axios.post(
      "https://staging-api.myinsurebank.com/api/policies/accident",
      req.body,
      { headers: { "Content-Type": "application/json" } },
    );
    res.json(response.data);
  } catch (error) {
    console.error("Gadget error:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Travel local ────────────────────────────────────────────────────────────────────
app.post("/api/cors/travel-local", async (req, res) => {
  console.log(req.body);
  try {
    const response = await axios.post(
      "https://staging-api.myinsurebank.com/api/travel-insurance/local/policy",
      req.body,
      { headers: { "Content-Type": "application/json" } },
    );
    res.json(response.data);
  } catch (error) {
    console.error("Travel error:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

// -----------NEM--------------------------------------------------
app.post("/api/cors/health", async (req, res) => {
  console.log(req.body);

  try {
    const formData = new FormData();

    Object.entries(req.body).forEach(([key, value]) => {
      formData.append(key, String(value));
    });

    const response = await axios.post(
      "https://staging-api.myinsurebank.com/api/medicloud/enrollee/register",
      formData,
      {
        headers: {
          ...formData.getHeaders(),
        },
      },
    );

    console.log("res", response.data);
    res.json(response.data);
  } catch (error) {
    console.error("Health error:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Travel Foreign
app.post("/api/cors/travel-foreign", async (req, res) => {
  console.log(req.body);
  try {
    const response = await axios.post(
      "https://staging-api.myinsurebank.com/api/travel-insurance/foreign/policy",
      req.body,
      { headers: { "Content-Type": "application/json" } },
    );
    res.json(response.data);
  } catch (error) {
    console.error("Travel error:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Motor (MIB staging) ───────────────────────────────────────────────────────
app.post("/api/cors/motor", async (req, res) => {
  console.log(req.body);
  try {
    const response = await axios.post(
      "https://staging-api.myinsurebank.com/api/policies/motor",
      req.body,
      { headers: { "Content-Type": "application/json" } },
    );
    console.log(response);
    res.json(response.data);
  } catch (error) {
    console.error("Motor error:", error.message);
    res.status(500).json({ error: error });
  }
});

// ── Tangerine Comprehensive ───────────────────────────────────────────────────
app.post("/api/cors/tangerine-comprehensive", async (req, res) => {
  try {
    const fixedBody = {
      ...req.body,
      valuation:
        Number(req.body.valuation) > 0 ? Number(req.body.valuation) : 2800000,
    };

    console.log(
      "[Tangerine Comp] Payload sent:",
      JSON.stringify(fixedBody, null, 2),
    );

    const response = await axios.post(
      `https://staging-api.myinsurebank.com/api/comprehensive-motor/generate-policy`,
      fixedBody,
      { headers: { "Content-Type": "application/json" } },
    );
    console.log("[Tangerine Comp] Success:", response.data);
    res.json(response.data);
  } catch (error) {
    const errBody = error.response?.data;
    console.error("[Tangerine Comp] Status:", error.response?.status);
    console.error("[Tangerine Comp] Body:", JSON.stringify(errBody, null, 2));
    res
      .status(500)
      .json({ error: "Tangerine comprehensive failed", detail: errBody });
  }
});

// ── Tangerine Third Party ─────────────────────────────────────────────────────
app.post("/api/cors/tangerine-third-party", async (req, res) => {
  try {
    const response = await axios.post(
      `https://staging-api.myinsurebank.com/api/third-party/generate-policy`,
      req.body,
      { headers: { "Content-Type": "application/json" } },
    );
    res.json(response.data);
    console.log(response);
  } catch (error) {
    console.error("Tangerine Third Party error:", error.message);
    res.status(500).json({ error: "Tangerine third party request failed" });
  }
});

// ── Staging Third Party ───────────────────────────────────────────────────────
app.post("/api/cors/staging-third-party", async (req, res) => {
  try {
    const response = await axios.post(
      "https://staging-api.myinsurebank.com/api/third-party/generate-policy",
      req.body,
      { headers: { "Content-Type": "application/json" } },
    );
    res.json(response.data);
    console.log(response);
  } catch (error) {
    console.error("Staging Third Party error:", error.message);
    res.status(500).json({ error: "Third party request failed" });
  }
});

// ── NSIA Motor (multipart/form-data) ─────────────────────────────────────────
app.post("/api/cors/nsia-motor", async (req, res) => {
  try {
    const form = new FormData();
    Object.entries(req.body).forEach(([key, value]) => {
      if (value !== undefined && value !== null) form.append(key, value);
    });
    const response = await axios.post(
      `https://staging-api.myinsurebank.com/api/nsia/motor/create`,
      form,
      { headers: { ...form.getHeaders(), Accept: "application/json" } },
    );
    res.json(response.data);
    console.log(response);
  } catch (error) {
    const errBody = error.response?.data;
    console.error("[NSIA] Status:", error.response?.status);
    console.error("[NSIA] Body:", JSON.stringify(errBody, null, 2));
    res.status(500).json({ error: "NSIA request failed", detail: errBody });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`[Server] Listening on port ${PORT}`));
