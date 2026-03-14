const PDFDocument = require("pdfkit-table");

async function createHealthPDF(data) {
  console.log(data);
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 30, size: "A4" });

      const buffers = [];
      doc.on("data", buffers.push.bind(buffers));
      doc.on("end", () => resolve(Buffer.concat(buffers)));

      doc.font("Times-Roman");

      // Header
      doc.fontSize(24).text("NEM INSURANCE PLC", { align: "center" });
      doc
        .fontSize(12)
        .text("NEM Insurance Plc 199, Ikorodu Road, Obanikoro Lagos", {
          align: "center",
        });
      doc.text(
        "Email: nemsupport@nem-insurance.com, Website: https://nem-insurance.com",
        { align: "center" },
      );
      doc.moveDown(2);

      // Policy Schedule
      doc
        .fontSize(16)
        .text("POLICY SCHEDULE", { align: "center", underline: true });
      doc.moveDown();

      // Policy Info Table
      const policyInfoTable = {
        title: "Policy Information",
        headers: [
          { label: "Description", property: "description", width: 200 },
          { label: "Details", property: "details", width: 300 },
        ],
        datas: [
          {
            description: "PERIOD OF INSURANCE:",
            details: `Commencement Date: ${data.additionalData.policy_start_date || "N/A"}\nExpiry Date: ${data.additionalData.policy_expiry_date || "N/A"}`,
          },
          {
            description: "NAME OF INSURED:",
            details: data.additionalData.fullname || "N/A",
          },
          {
            description: "TEL. NO:",
            details: `${data.proxyData.phone || "N/A"}`,
          },
          {
            description: "Address:",
            details: `${data.proxyData.address || "N/A"}`,
          },
          {
            description: "DETAILS OF THE HEALTH:",
            details: `HEALTH TYPE: ${data.additionalData.id || "N/A"}`,
          },
          { description: "TYPE OF COVER:", details: "HEALTH INSURANCE" },
          {
            description: "PREMIUM PAID:",
            details: data.additionalData.premium_amount || "N/A",
          },
        ],
      };
      doc.table(policyInfoTable, {
        width: 500,
        prepareHeader: () => doc.font("Times-Bold").fontSize(12),
        prepareRow: (row, i) => doc.font("Times-Roman").fontSize(10),
        columnSpacing: 5,
        padding: 5,
        divider: { horizontal: { width: 0.5, opacity: 0.5 } },
        wrap: true,
      });
      doc.moveDown(1);

      //   // Image below the certificate table (full width)
      const fullWidthImage =
        "https://nem-insurance.com/assets/uploads/logo.jpg";
      const image1Buffer = Buffer.from(
        await (await fetch(fullWidthImage)).arrayBuffer(),
      );
      doc.image(image1Buffer, {
        fit: [doc.page.width - 60, 60],
        align: "center",
      });
      doc.moveDown(2);

      // Finalize
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

module.exports = createHealthPDF;
