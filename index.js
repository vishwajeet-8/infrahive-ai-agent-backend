require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

app.get("/", (req, res) => {
  res.send("Hello API is runing now with the help of pm2");
});

// Serve static PDFs
app.use("/pdfs", express.static(path.join(__dirname, "pdfs")));

// Optional: list all PDFs
app.get("/api/list-pdfs", (req, res) => {
  const fs = require("fs");
  const pdfDir = path.join(__dirname, "pdfs");
  const files = fs.readdirSync(pdfDir).filter((file) => file.endsWith(".pdf"));
  res.json(files);
});

// API to get a single PDF URL
app.get("/api/get-pdf/:filename", (req, res) => {
  const fileName = req.params.filename;
  const filePath = path.join(__dirname, "pdfs", fileName);

  // Check if file exists
  const fs = require("fs");
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).send("PDF not found");
  }
});

// Api to get all contract and their corresponding invoices in the form of array of object
app.get("/api/contract-invoices", (req, res) => {
  const result = [];

  const fs = require("fs");
  const pdfDir = path.join(__dirname, "pdfs");
  const files = fs.readdirSync(pdfDir).filter((file) => file.endsWith(".pdf"));

  files.forEach((file) => {
    const contractMatch = file.match(/^contract-(\d+)\.pdf$/);
    const invoiceMatch = file.match(/^invoice-(\d+)-\d+\.pdf$/);

    if (contractMatch) {
      const contractNum = contractMatch[1];
      result.push({
        contract: file,
        invoices: [],
      });
    } else if (invoiceMatch) {
      const invoiceNum = invoiceMatch[1];
      const contractGroup = result.find((group) =>
        group.contract.includes(`contract-${invoiceNum}.pdf`)
      );
      if (contractGroup) {
        contractGroup.invoices.push(file);
      }
    }
  });

  res.json(result);
});

// Api to get specific group of contract and their invoices
// Example: GET /api/contract-invoices/contract-1.pdf
app.get("/api/contract-invoices/:contract", (req, res) => {
  const { contract } = req.params;

  const fs = require("fs");
  const path = require("path");

  const pdfDir = path.join(__dirname, "pdfs");
  const files = fs.readdirSync(pdfDir).filter((file) => file.endsWith(".pdf"));

  const result = [];

  // Build contract-invoice mapping
  files.forEach((file) => {
    const contractMatch = file.match(/^contract-(\d+)\.pdf$/);
    const invoiceMatch = file.match(/^invoice-(\d+)-\d+\.pdf$/);

    if (contractMatch) {
      result.push({
        contract: file,
        invoices: [],
      });
    } else if (invoiceMatch) {
      const invoiceNum = invoiceMatch[1];
      const contractGroup = result.find((group) =>
        group.contract.includes(`contract-${invoiceNum}.pdf`)
      );
      if (contractGroup) {
        contractGroup.invoices.push(file);
      }
    }
  });

  // Find the group containing the requested contract
  const matchedGroup = result.find((group) => group.contract === contract);

  if (!matchedGroup) {
    return res
      .status(404)
      .json({ message: "Invoice not found or not linked to a contract." });
  }

  // Return only that group
  res.json(matchedGroup);
});

app.listen(PORT, () => {
  console.log(`App is running on port ${PORT}`);
});
