const mongoose = require("mongoose");
const Agenda = require("agenda");
const EmailJob = require("../models/EmailJob");
const uploadToCloudinary = require("../utils/uploadToCloudinary");

const createComprehensivePDF = require("../templates/comprehensive");
const createThirdPartyPDF = require("../templates/thirdparty");
const createGadgetPDF = require("../templates/gadget");
const createHealthPDF = require("../templates/health");

require("dotenv").config();
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("[Worker] MongoDB connected"));

const agenda = new Agenda({
  db: { address: process.env.MONGO_URI, collection: "emailJobsQueue" },
});

const mailjet = require("node-mailjet").apiConnect(
  process.env.MJ_APIKEY_PUBLIC,
  process.env.MJ_APIKEY_PRIVATE,
);

// ── Helper: send email with PDF attachment ────────────────────────────────────
async function sendEmailWithPDF(toEmail, toName, pdfBuffer) {
  await mailjet.post("send", { version: "v3.1" }).request({
    Messages: [
      {
        From: { Email: process.env.MJ_SENDER_EMAIL, Name: "MIB" },
        To: [{ Email: toEmail, Name: toName || "Customer" }],
        Subject: "Your Policy Document",
        TextPart: `Hi ${toName || "Customer"},\n\nAttached is your policy document.\n\nThank you for choosing MyInsure Bank.`,
        Attachments: [
          {
            ContentType: "application/pdf",
            Filename: "Policy-document.pdf",
            Base64Content: pdfBuffer.toString("base64"),
          },
        ],
      },
    ],
  });
}

// ── Helper: send email with document URL (no PDF generation needed) ───────────
async function sendEmailWithURL(
  toEmail,
  toName,
  policyNo,
  documentUrl,
  viewUrl,
) {
  await mailjet.post("send", { version: "v3.1" }).request({
    Messages: [
      {
        From: { Email: process.env.MJ_SENDER_EMAIL, Name: "MIB" },
        To: [{ Email: toEmail, Name: toName || "Customer" }],
        Subject: "Your Policy Document is Ready",
        HTMLPart: `
        <p>Hi ${toName || "Customer"},</p>
        <p>Your insurance policy has been created successfully.</p>
        <table style="border-collapse:collapse; width:100%; max-width:500px;">
          <tr>
            <td style="padding:8px; border:1px solid #ddd; font-weight:bold;">Policy Number</td>
            <td style="padding:8px; border:1px solid #ddd;">${policyNo || "N/A"}</td>
          </tr>
          ${
            documentUrl
              ? `
          <tr>
            <td style="padding:8px; border:1px solid #ddd; font-weight:bold;">Policy Document</td>
            <td style="padding:8px; border:1px solid #ddd;">
              <a href="${documentUrl}" style="color:#007bff;">Download / View Document</a>
            </td>
          </tr>`
              : ""
          }
          ${
            viewUrl
              ? `
          <tr>
            <td style="padding:8px; border:1px solid #ddd; font-weight:bold;">View Policy</td>
            <td style="padding:8px; border:1px solid #ddd;">
              <a href="${viewUrl}" style="color:#007bff;">View Policy Online</a>
            </td>
          </tr>`
              : ""
          }
        </table>
        <p style="margin-top:20px;">Thank you for choosing MyInsure Bank.</p>
      `,
        TextPart: `Hi ${toName || "Customer"},\n\nYour policy (${policyNo || "N/A"}) is ready.\nDocument: ${documentUrl || "N/A"}\n\nThank you for choosing MyInsure Bank.`,
      },
    ],
  });
}

// ── Main job handler ──────────────────────────────────────────────────────────
agenda.define("send-email-job", async (job) => {
  console.log("[Worker] Job triggered");
  const { jobId } = job.attrs.data;
  const record = await EmailJob.findById(jobId);
  if (!record) return console.error("[Worker] Job not found:", jobId);

  try {
    const { additionalData, proxyData } = record;
    const provider =
      proxyData?.provider || additionalData?.provider || "existing";
    const toEmail = additionalData.email;
    const toName = additionalData.name || additionalData.fullname || "Customer";

    console.log(
      `[Worker] Processing jobId=${jobId} | provider=${provider} | type=${additionalData.type}`,
    );

    // ── NSIA — has policyDocumentUrl, no PDF needed ───────────────────────
    if (provider === "nsia") {
      const policyNo = proxyData.policyNo;
      const documentUrl = proxyData.documentUrl;
      const viewUrl = proxyData.viewPolicy;

      await sendEmailWithURL(toEmail, toName, policyNo, documentUrl, viewUrl);

      record.status = "sent";
      record.documentUrl = documentUrl || viewUrl;
      record.sentAt = new Date();
      await record.save();

      console.log(`[Worker] NSIA email sent for jobId: ${jobId}`);
      return;
    }

    // ── NSIA — has policyDocumentUrl, no PDF needed ───────────────────────
    if (provider === "nsia") {
      const policyNo = proxyData.policyNo;
      const documentUrl = proxyData.documentUrl;
      const viewUrl = proxyData.viewPolicy;

      await sendEmailWithURL(toEmail, toName, policyNo, documentUrl, viewUrl);

      record.status = "sent";
      record.documentUrl = documentUrl || viewUrl;
      record.sentAt = new Date();
      await record.save();

      console.log(`[Worker] NSIA email sent for jobId: ${jobId}`);
      return;
    }

    // ── Tangerine Third Party — has CertificateURL, no PDF needed ─────────
    if (provider === "tangerine-third-party") {
      const policyNo = proxyData.policyNo;
      const documentUrl = proxyData.certificateUrl;

      await sendEmailWithURL(toEmail, toName, policyNo, documentUrl, null);

      record.status = "sent";
      record.documentUrl = documentUrl;
      record.sentAt = new Date();
      await record.save();

      console.log(
        `[Worker] Tangerine Third Party email sent for jobId: ${jobId}`,
      );
      return;
    }

    // ── Tangerine Comprehensive — has CertificateURL, no PDF needed ───────
    if (provider === "tangerine-comprehensive") {
      const policyNo = proxyData.policyNo;
      const documentUrl = proxyData.certificateUrl;
      const tempUrl = proxyData.certificateUrlTemp;

      await sendEmailWithURL(toEmail, toName, policyNo, documentUrl, tempUrl);

      record.status = "sent";
      record.documentUrl = documentUrl;
      record.sentAt = new Date();
      await record.save();

      console.log(
        `[Worker] Tangerine Comprehensive email sent for jobId: ${jobId}`,
      );
      return;
    }

    // foreign travel

    if (provider === "foreign-travel") {
      const policyNo = proxyData.policyNo;
      const documentUrl = proxyData.certificateUrl;
      const tempUrl = proxyData.tempUrl;

      await sendEmailWithURL(toEmail, toName, policyNo, documentUrl, tempUrl);

      record.status = "sent";
      record.documentUrl = documentUrl;
      record.sentAt = new Date();
      await record.save();

      console.log(`[Worker] Foreign Travel email sent for jobId: ${jobId}`);
      return;
    }

    // local- travel
    if (provider === "local-travel") {
      const policyNo = proxyData.policyNo;
      const documentUrl = proxyData.certificateUrl;

      await sendEmailWithURL(toEmail, toName, policyNo, documentUrl, null);

      record.status = "sent";
      record.documentUrl = documentUrl;
      record.sentAt = new Date();
      await record.save();

      console.log(`[Worker] Local Travel email sent for jobId: ${jobId}`);
      return;
    }

    // ── Existing / Staging — generate PDF as before ───────────────────────
    let pdfGen;
    switch (additionalData.type) {
      case "Comprehensive":
        pdfGen = createComprehensivePDF;
        break;
      case "Third Party":
        pdfGen = createThirdPartyPDF;
        break;
      case "Gadget":
        pdfGen = createGadgetPDF;
      case "Health":
        pdfGen = createHealthPDF;
        break;
      default:
        throw new Error(`Unknown policy type: ${additionalData.type}`);
    }

    const pdfBuffer = await pdfGen(record);
    const uploadResult = await uploadToCloudinary(pdfBuffer, `policy-${jobId}`);

    await sendEmailWithPDF(toEmail, toName, pdfBuffer);

    record.status = "sent";
    record.documentUrl = uploadResult;
    record.sentAt = new Date();
    await record.save();

    console.log(`[Worker] PDF email sent for jobId: ${jobId}`);
  } catch (err) {
    record.status = "failed";
    record.error = err.message;
    await record.save();
    console.error(`[Worker] Failed for jobId: ${jobId}`, err.message);
  }
});

(async function () {
  await agenda.start();
  console.log("[Worker] Agenda is running...");
})();
