/**
 * Génère ReconciliApp-Cahier-des-charges-v1.pdf depuis le Markdown source.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import PDFDocument from "pdfkit";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mdPath = path.join(__dirname, "ReconciliApp-Cahier-des-charges-v1.md");
const outPath = path.join(__dirname, "ReconciliApp-Cahier-des-charges-v1.pdf");

const C = {
  navy: "#1a2233",
  blue: "#2563eb",
  grayBorder: "#d1d5db",
  text: "#1f2937",
  muted: "#6b7280",
  white: "#ffffff",
  codeBg: "#f4f4f5",
  quoteBg: "#eff6ff",
};

const M = { top: 50, bottom: 50, left: 50, right: 50 };

function contentWidth(doc) {
  return doc.page.width - M.left - M.right;
}

function stripInline(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[(.+?)\]\([^)]+\)/g, "$1")
    .replace(/↔/g, "<->")
    .replace(/→/g, "->")
    .replace(/«|»/g, '"')
    .replace(/[\u2500-\u257F]/g, (ch) => {
      const map = { "┌": "+", "┐": "+", "└": "+", "┘": "+", "├": "+", "┤": "+", "┬": "+", "┴": "+", "┼": "+", "─": "-", "│": "|", "▼": "v" };
      return map[ch] || "-";
    });
}

function ensureSpace(doc, needed = 50) {
  if (doc.y + needed > doc.page.height - M.bottom) {
    doc.addPage();
    doc.y = M.top;
  }
}

function parseMarkdown(raw) {
  let body = raw;
  if (body.startsWith("---")) {
    const end = body.indexOf("---", 3);
    if (end !== -1) body = body.slice(end + 3).trimStart();
  }

  const blocks = [];
  const lines = body.split(/\r?\n/);
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === "---") {
      blocks.push({ type: "hr" });
      i++;
      continue;
    }

    if (line.startsWith("```")) {
      const code = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        code.push(lines[i]);
        i++;
      }
      i++;
      blocks.push({ type: "code", text: code.join("\n") });
      continue;
    }

    if (/^\|.+\|$/.test(line.trim())) {
      const rows = [];
      while (i < lines.length && /^\|.+\|$/.test(lines[i].trim())) {
        const row = lines[i].trim();
        if (!/^\|[\s\-:|]+\|$/.test(row)) {
          rows.push(
            row
              .slice(1, -1)
              .split("|")
              .map((c) => stripInline(c.trim()))
          );
        }
        i++;
      }
      if (rows.length) blocks.push({ type: "table", rows });
      continue;
    }

    const h4 = line.match(/^#### (.+)$/);
    if (h4) {
      blocks.push({ type: "h4", text: stripInline(h4[1]) });
      i++;
      continue;
    }
    const h3 = line.match(/^### (.+)$/);
    if (h3) {
      blocks.push({ type: "h3", text: stripInline(h3[1]) });
      i++;
      continue;
    }
    const h2 = line.match(/^## (.+)$/);
    if (h2) {
      blocks.push({ type: "h2", text: stripInline(h2[1]) });
      i++;
      continue;
    }
    const h1 = line.match(/^# (.+)$/);
    if (h1) {
      blocks.push({ type: "h1", text: stripInline(h1[1]) });
      i++;
      continue;
    }

    if (line.startsWith("> ")) {
      const quote = [];
      while (i < lines.length && lines[i].startsWith("> ")) {
        quote.push(stripInline(lines[i].slice(2)));
        i++;
      }
      blocks.push({ type: "quote", text: quote.join(" ") });
      continue;
    }

    const ol = line.match(/^(\d+)\.\s+(.+)$/);
    if (ol) {
      blocks.push({ type: "ol", n: ol[1], text: stripInline(ol[2]) });
      i++;
      continue;
    }

    if (/^-\s+/.test(line)) {
      blocks.push({ type: "ul", text: stripInline(line.replace(/^-\s+/, "")) });
      i++;
      continue;
    }

    if (/^\s+-\s+/.test(line)) {
      blocks.push({ type: "ul2", text: stripInline(line.replace(/^\s+-\s+/, "")) });
      i++;
      continue;
    }

    if (line.trim() === "") {
      blocks.push({ type: "spacer" });
      i++;
      continue;
    }

    const para = [];
    while (i < lines.length && lines[i].trim() !== "" && !/^#/.test(lines[i]) && !lines[i].startsWith("```") && !/^\|/.test(lines[i].trim()) && !lines[i].startsWith("> ") && !/^-\s+/.test(lines[i]) && !/^\d+\.\s+/.test(lines[i]) && lines[i].trim() !== "---") {
      para.push(stripInline(lines[i]));
      i++;
    }
    if (para.length) blocks.push({ type: "p", text: para.join(" ") });
  }

  return blocks;
}

function renderBlocks(doc, blocks, skipFirstH1 = false) {
  let skippedH1 = false;

  for (const block of blocks) {
    if (block.type === "h1") {
      if (skipFirstH1 && !skippedH1) {
        skippedH1 = true;
        continue;
      }
      ensureSpace(doc, 50);
      doc.font("Helvetica-Bold").fontSize(18).fillColor(C.navy);
      doc.text(block.text, M.left, doc.y, { width: contentWidth(doc) });
      doc.moveDown(0.5);
      doc.fillColor(C.text);
      continue;
    }

    if (block.type === "h2") {
      ensureSpace(doc, 44);
      doc.font("Helvetica-Bold").fontSize(14).fillColor(C.navy);
      doc.text(block.text, M.left, doc.y, { width: contentWidth(doc) });
      doc.moveDown(0.35);
      doc.fillColor(C.text);
      continue;
    }

    if (block.type === "h3") {
      ensureSpace(doc, 36);
      doc.font("Helvetica-Bold").fontSize(12).fillColor(C.blue);
      doc.text(block.text, M.left, doc.y, { width: contentWidth(doc) });
      doc.moveDown(0.3);
      doc.fillColor(C.text);
      continue;
    }

    if (block.type === "h4") {
      ensureSpace(doc, 30);
      doc.font("Helvetica-Bold").fontSize(11).fillColor(C.text);
      doc.text(block.text, M.left, doc.y, { width: contentWidth(doc) });
      doc.moveDown(0.25);
      continue;
    }

    if (block.type === "p") {
      ensureSpace(doc, 24);
      doc.font("Helvetica").fontSize(10).fillColor(C.text);
      doc.text(block.text, M.left, doc.y, { width: contentWidth(doc), lineGap: 3 });
      doc.moveDown(0.4);
      continue;
    }

    if (block.type === "ul") {
      ensureSpace(doc, 18);
      doc.font("Helvetica").fontSize(10);
      doc.text(`•  ${block.text}`, M.left + 6, doc.y, { width: contentWidth(doc) - 6, lineGap: 2 });
      doc.moveDown(0.2);
      continue;
    }

    if (block.type === "ul2") {
      ensureSpace(doc, 18);
      doc.font("Helvetica").fontSize(10);
      doc.text(`   -  ${block.text}`, M.left + 14, doc.y, { width: contentWidth(doc) - 14, lineGap: 2 });
      doc.moveDown(0.15);
      continue;
    }

    if (block.type === "ol") {
      ensureSpace(doc, 18);
      doc.font("Helvetica").fontSize(10);
      doc.text(`${block.n}.  ${block.text}`, M.left + 6, doc.y, { width: contentWidth(doc) - 6, lineGap: 2 });
      doc.moveDown(0.2);
      continue;
    }

    if (block.type === "quote") {
      ensureSpace(doc, 30);
      const y = doc.y;
      const h = doc.heightOfString(block.text, { width: contentWidth(doc) - 24, lineGap: 2 }) + 16;
      doc.rect(M.left, y, contentWidth(doc), h).fill(C.quoteBg);
      doc.font("Helvetica-Oblique").fontSize(9).fillColor(C.navy);
      doc.text(block.text, M.left + 12, y + 8, { width: contentWidth(doc) - 24, lineGap: 2 });
      doc.y = y + h + 8;
      doc.fillColor(C.text);
      continue;
    }

    if (block.type === "hr") {
      ensureSpace(doc, 12);
      const y = doc.y;
      doc.moveTo(M.left, y).lineTo(M.left + contentWidth(doc), y).strokeColor(C.grayBorder).lineWidth(0.5).stroke();
      doc.moveDown(0.6);
      continue;
    }

    if (block.type === "code") {
      const text = stripInline(block.text);
      const lineH = 11;
      const pad = 10;
      const lines = text.split("\n");
      const boxH = lines.length * lineH + pad * 2;
      ensureSpace(doc, boxH + 10);
      const y = doc.y;
      doc.rect(M.left, y, contentWidth(doc), boxH).fill(C.codeBg).strokeColor(C.grayBorder).lineWidth(0.5).stroke();
      doc.font("Courier").fontSize(8).fillColor(C.text);
      let cy = y + pad;
      for (const ln of lines) {
        doc.text(ln, M.left + 8, cy, { width: contentWidth(doc) - 16, lineBreak: false });
        cy += lineH;
      }
      doc.y = y + boxH + 8;
      doc.fillColor(C.text);
      continue;
    }

    if (block.type === "table" && block.rows.length) {
      const cols = block.rows[0].length;
      const cw = contentWidth(doc);
      const colW = cw / cols;
      const rowH = 14;
      const tableH = block.rows.length * rowH + 16;
      ensureSpace(doc, tableH);

      let y = doc.y;
      block.rows.forEach((row, ri) => {
        if (ri === 0) {
          doc.rect(M.left, y, cw, rowH).fill(C.navy);
          doc.font("Helvetica-Bold").fontSize(8).fillColor(C.white);
        } else {
          doc.rect(M.left, y, cw, rowH).fill(ri % 2 === 0 ? C.white : "#f9fafb").strokeColor(C.grayBorder).lineWidth(0.3).stroke();
          doc.font("Helvetica").fontSize(8).fillColor(C.text);
        }
        row.forEach((cell, ci) => {
          doc.text(cell, M.left + 4 + ci * colW, y + 4, { width: colW - 6, lineGap: 0 });
        });
        y += rowH;
      });
      doc.y = y + 6;
      continue;
    }

    if (block.type === "spacer") {
      doc.moveDown(0.2);
    }
  }
}

function buildCover(doc) {
  doc.rect(0, 0, doc.page.width, doc.page.height).fill(C.navy);
  doc.font("Helvetica-Bold").fontSize(26).fillColor(C.white);
  doc.text("ReconciliApp", M.left, 160, { width: contentWidth(doc) });
  doc.font("Helvetica").fontSize(15).fillColor("#93c5fd");
  doc.text("Cahier des charges", M.left, 200);
  doc.text("fonctionnel et technique", M.left, 222);
  doc.font("Helvetica").fontSize(11).fillColor("#e5e7eb");
  doc.text("Reconciliation transactionnelle et suivi des soldes", M.left, 270);
  doc.text("Version 1 - juin 2026", M.left, 292);
  doc.font("Helvetica").fontSize(10).fillColor("#9ca3af");
  doc.text("Groupe Intouch - Confidentiel", M.left, doc.page.height - 80);
  doc.text("Aligne sur l'application en production (etat du code)", M.left, doc.page.height - 62);
  doc.addPage();
  doc.y = M.top;
  doc.fillColor(C.text);
}

function addFooters(doc) {
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    if (i === 0) continue;
    doc.save();
    doc.font("Helvetica").fontSize(8).fillColor(C.muted);
    doc.text(
      `ReconciliApp - Cahier des charges v1 - Groupe Intouch - Page ${i}`,
      M.left,
      doc.page.height - 35,
      { width: contentWidth(doc), align: "center", lineBreak: false }
    );
    doc.restore();
  }
}

function buildPdf() {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(mdPath)) {
      reject(new Error(`Fichier introuvable : ${mdPath}`));
      return;
    }

    const md = fs.readFileSync(mdPath, "utf8");
    const blocks = parseMarkdown(md);

    const doc = new PDFDocument({
      autoFirstPage: false,
      size: "A4",
      margins: M,
      bufferPages: true,
      info: {
        Title: "ReconciliApp - Cahier des charges",
        Author: "Groupe Intouch",
        Subject: "Specifications fonctionnelles et techniques",
      },
    });

    const stream = fs.createWriteStream(outPath);
    doc.pipe(stream);

    doc.addPage();
    buildCover(doc);
    renderBlocks(doc, blocks, true);

    addFooters(doc);
    doc.end();

    stream.on("finish", () => resolve(outPath));
    stream.on("error", reject);
  });
}

await buildPdf();
console.log("PDF cree:", outPath);
