/**
 * Génère BudgetSync-Apercu-Pages-UI-v1.pdf depuis le contenu rédigé ci-dessous (FR, WinAnsi-friendly).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import PDFDocument from "pdfkit";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outPath = path.join(__dirname, "BudgetSync-Apercu-Pages-UI-v1.pdf");

const paragraphs = [
  { size: 22, bold: true, text: "BudgetSync — Aperçu des pages et du design", gap: 14 },
  {
    size: 10,
    text:
      "Plateforme de Suivi Budgétaire — Filiales Intouch · Architecture ERP modulaire · " +
      "Stack cible : Spring Boot 3.x, Angular 17+, PrimeNG, Keycloak.",
    gap: 8,
  },
  {
    size: 10,
    text:
      "Document préparatoire : aperçu des écrans et de la charte visuelle avant développement " +
      "(aligné cahier des charges v2, juin 2026, et maquettes Groupe Intouch).",
    gap: 14,
  },

  { size: 14, bold: true, text: "1. Principe de navigation", gap: 8 },
  {
    size: 10,
    text:
      "Hors connexion : point d'entrée SSO (redirect Keycloak). " +
      "Application : shell unique — sidebar navy, bandeau haut, fil d'Ariane, contenu sur fond gris clair #F8F9FA.",
    gap: 10,
  },

  { size: 14, bold: true, text: "2. Inventaire des pages", gap: 8 },
  { size: 11, bold: true, text: "A. Authentification", gap: 6 },
  {
    size: 10,
    text:
      "E01 — Connexion / redirect SSO : formulaire email-mot de passe, SSO Keycloak, souvenir de session. " +
      "Optionnel : mot de passe oublié si processus hors Keycloak.",
    gap: 8,
  },
  { size: 11, bold: true, text: "B. Tableau de bord", gap: 6 },
  {
    size: 10,
    text:
      "E02 — Tableau de bord FP&A (ou RAF/Pays) : KPI (budget groupe, complétion, écart CEO/Pays, budget validé), " +
      "graphique par pays, statut filiales, progression modules Revenus / Salaires / Charges / CoS. " +
      "Bandeau : exercice, périmètre pays, notifications.",
    gap: 8,
  },
  { size: 11, bold: true, text: "C. Modules budgétaires", gap: 6 },
  {
    size: 10,
    text:
      "E03 — Revenus : cartes KPI (N-1, PDG, Pays, Final), alertes écart, filtres, tableau, pagination.",
    gap: 4,
  },
  {
    size: 10,
    text: "E04 — Mensualisation revenus · E05 — Variables métier (Mode 1) · E06 — Marché adressable (Mode 2).",
    gap: 4,
  },
  {
    size: 10,
    text:
      "E07 — Salaires (CRUD + import Excel) · E08 — Autres charges · E09 — Cost of Sales (calcul/ajustement). " +
      "Sidebar commune : PHASE ACTIVE (ex. P2 Budget pays), menu PRINCIPAL / ANALYSE / ADMIN, profil en bas.",
    gap: 8,
  },
  { size: 11, bold: true, text: "D. Analyse et exports", gap: 6 },
  {
    size: 10,
    text: "E13 — Import/Export · E14 — Reporting / consolidation.",
    gap: 8,
  },
  { size: 11, bold: true, text: "E. Administration", gap: 6 },
  {
    size: 10,
    text:
      "E10 — Phases (workflow, transitions) · E11 — Utilisateurs (Keycloak) · " +
      "E12 — Paramétrage (taux, référentiels) · E15 — Journal d'audit.",
    gap: 10,
  },

  { size: 14, bold: true, text: "3. Arborescence logique", gap: 8 },
  {
    size: 10,
    text:
      "Public : Connexion/SSO. Application : Dashboard ; Revenus (liste, mensualisation, Mode 1, Mode 2) ; " +
      "Salaires ; Charges ; CoS ; Reporting ; Import-Export ; Admin (Phases, Utilisateurs, Paramétrage, Audit).",
    gap: 10,
  },

  { size: 14, bold: true, text: "4. Design system — synthèse", gap: 8 },
  {
    size: 10,
    text:
      "Couleurs : navy #1E3A5F ou #1a2233 ; accent bordeaux ~#C41E3A ; succès #28A745 ; alertes #DC3545 ; fond #F8F9FA.",
    gap: 4,
  },
  {
    size: 10,
    text:
      "Typo : titres serif (ex. Playfair, Merriweather), corps sans-serif (Inter, Roboto). " +
      "Composants : PrimeNG (Card, Table, Chart, ProgressBar, Badge, Toast, Dialog, FileUpload). " +
      "Icônes : PrimeIcons.",
    gap: 10,
  },

  { size: 14, bold: true, text: "5. Synthèse", gap: 8 },
  {
    size: 10,
    text:
      "Environ 12 à 18 écrans routables selon granularité ; un layout unique ; une page login dédiée (split screen) ; " +
      "patterns récurrents : KPI puis filtres puis tableau.",
    gap: 10,
  },
  {
    size: 9,
    text:
      "Document préparatoire au développement — BudgetSync · Groupe Intouch — Confidentiel — v1 PDF — 28 avril 2026",
    gap: 0,
  },
];

function buildPdf() {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      autoFirstPage: true,
      size: "A4",
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
      info: {
        Title: "BudgetSync — Aperçu des pages UI",
        Author: "Groupe Intouch",
        Subject: "Aperçu design et écrans",
      },
    });
    const stream = fs.createWriteStream(outPath);
    doc.pipe(stream);

    doc.font("Helvetica");

    paragraphs.forEach((p) => {
      const bold = p.bold ? "-Bold" : "";
      doc.font(`Helvetica${bold}`);
      doc.fontSize(p.size);
      doc.text(p.text, {
        width: doc.page.width - 100,
        align: "left",
        lineGap: 2,
      });
      doc.moveDown(p.gap ? p.gap / 10 : 0.35);
    });

    doc.end();
    stream.on("finish", () => resolve(outPath));
    stream.on("error", reject);
  });
}

await buildPdf();
console.log("PDF créé:", outPath);
