/**
 * Génère ReconciliApp-Guide-Utilisation-v1.pdf
 * Guide complet : réconciliation, suivi des soldes, parcours par rôle, aperçus visuels des écrans.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import PDFDocument from "pdfkit";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outPath = path.join(__dirname, "ReconciliApp-Guide-Utilisation-v1.pdf");
const SCREENSHOT_DIR = path.join(__dirname, "screenshots", "guide-v1");

const C = {
  navy: "#1a2233",
  blue: "#2563eb",
  teal: "#0d9488",
  gray: "#f3f4f6",
  grayBorder: "#d1d5db",
  text: "#1f2937",
  muted: "#6b7280",
  white: "#ffffff",
  green: "#16a34a",
  orange: "#ea580c",
  red: "#dc2626",
};

const M = { top: 50, bottom: 50, left: 50, right: 50 };
const CONTENT_W = 595.28 - M.left - M.right;

function contentWidth(doc) {
  return doc.page.width - M.left - M.right;
}

function ensureSpace(doc, needed = 60) {
  if (doc.y + needed > doc.page.height - M.bottom) {
    doc.addPage();
    doc.y = M.top;
  }
}

function heading(doc, text, level = 1) {
  ensureSpace(doc, level === 1 ? 50 : 40);
  const sizes = { 1: 18, 2: 14, 3: 12 };
  doc.font("Helvetica-Bold").fontSize(sizes[level] || 12).fillColor(C.navy);
  doc.text(text, M.left, doc.y, { width: contentWidth(doc) });
  doc.moveDown(0.4);
  doc.fillColor(C.text);
}

function para(doc, text, opts = {}) {
  ensureSpace(doc, 30);
  doc.font(opts.bold ? "Helvetica-Bold" : "Helvetica").fontSize(opts.size || 10);
  doc.fillColor(opts.color || C.text);
  doc.text(text, M.left, doc.y, { width: contentWidth(doc), lineGap: 3, align: opts.align || "left" });
  doc.moveDown(opts.gap !== undefined ? opts.gap : 0.5);
}

function bullet(doc, text) {
  ensureSpace(doc, 20);
  doc.font("Helvetica").fontSize(10).fillColor(C.text);
  doc.text(`•  ${text}`, M.left + 8, doc.y, { width: contentWidth(doc) - 8, lineGap: 2 });
  doc.moveDown(0.25);
}

function tableRow(doc, cols, widths, bold = false) {
  ensureSpace(doc, 22);
  const y = doc.y;
  let x = M.left;
  doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(9);
  cols.forEach((col, i) => {
    doc.text(String(col), x, y, { width: widths[i], lineGap: 1 });
    x += widths[i];
  });
  doc.moveDown(0.6);
}

function hr(doc) {
  ensureSpace(doc, 15);
  const y = doc.y;
  doc.moveTo(M.left, y).lineTo(M.left + contentWidth(doc), y).strokeColor(C.grayBorder).lineWidth(0.5).stroke();
  doc.moveDown(0.8);
}

function addFooters(doc) {
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    const label = `ReconciliApp — Guide d'utilisation v1 — Groupe Intouch — Page ${i + 1}`;
    doc.save();
    doc.font("Helvetica").fontSize(8).fillColor(C.muted);
    doc.text(label, M.left, doc.page.height - 35, {
      width: contentWidth(doc),
      align: "center",
      lineBreak: false,
    });
    doc.restore();
  }
}

const SCREEN_PAGES = [
  {
    file: "01-login.png",
    title: "Connexion",
    route: "/login",
    caption:
      "Écran d'entrée. Après authentification, redirection vers le Lanceur de réconciliation. La 2FA peut être demandée selon la configuration du compte.",
  },
  {
    file: "02-reconciliation-launcher.png",
    title: "Lanceur de réconciliation",
    route: "/reconciliation-launcher",
    caption:
      "Point d'entrée principal. Déposez les fichiers BO et Partenaire puis choisissez Manuel, Assisté ou Magique.",
  },
  {
    file: "03-column-selection.png",
    title: "Sélection des colonnes",
    route: "/column-selection",
    caption:
      "Écran des modes Manuel et Assisté. Associez les colonnes clés des deux fichiers avant de lancer le matching.",
  },
  {
    file: "04-results.png",
    title: "Résultats de réconciliation",
    route: "/results",
    caption:
      "Vue synthétique post-réconciliation : correspondances, écarts BO et écarts Partenaire.",
  },
  {
    file: "05-ecart-bo.png",
    title: "Écarts BO — traitement",
    route: "/ecart-bo",
    caption:
      "Sélectionnez les lignes à traiter puis sauvegardez vers TSOP, TRX SF ou Impact OP.",
  },
  {
    file: "06-comptes.png",
    title: "Gestion des comptes",
    route: "/comptes",
    caption:
      "Liste des comptes, filtres, soldes critiques et import des soldes BO.",
  },
  {
    file: "06b-releve-compte.png",
    title: "Relevé de compte",
    route: "/comptes (modal)",
    caption:
      "Historique des opérations avec soldes avant/après. Onglets Écarts de solde et Impact OP.",
    optional: true,
  },
  {
    file: "07-ecart-solde.png",
    title: "Écart de solde (TSOP)",
    route: "/ecart-solde",
    caption: "Module TSOP : import, validation, traitement des écarts de solde.",
  },
  {
    file: "08-impact-op.png",
    title: "Impact OP (Ecart régularisé)",
    route: "/impact-op",
    caption: "Gestion des impacts opérationnels pour régulariser les écarts partenaires.",
  },
  {
    file: "09-dashboard.png",
    title: "Tableau de bord",
    route: "/dashboard",
    caption: "Vue de pilotage globale : KPI, état des réconciliations et métriques rapides.",
  },
];

/** Insère une capture d'écran réelle ou une maquette de repli */
function drawScreenshotPage(doc, page) {
  const imagePath = path.join(SCREENSHOT_DIR, page.file);
  const hasScreenshot = fs.existsSync(imagePath);

  doc.addPage();
  doc.y = M.top;

  doc.font("Helvetica-Bold").fontSize(11).fillColor(C.blue);
  doc.text(hasScreenshot ? "CAPTURE D'ÉCRAN" : "APERÇU SCHÉMATIQUE", M.left, doc.y);
  doc.moveDown(0.3);
  doc.font("Helvetica-Bold").fontSize(14).fillColor(C.navy);
  doc.text(page.title, M.left, doc.y);
  doc.moveDown(0.2);
  doc.font("Helvetica").fontSize(9).fillColor(C.muted);
  doc.text(`Route : ${page.route}`, M.left, doc.y);
  doc.moveDown(0.5);

  const frameX = M.left;
  const frameY = doc.y;
  const frameW = contentWidth(doc);

  if (hasScreenshot) {
    const maxImgH = 430;
    doc.image(imagePath, frameX, frameY, { fit: [frameW, maxImgH], align: "center" });
    doc.y = frameY + maxImgH + 12;
  } else if (!page.optional) {
    drawScreenMockupFallback(doc, page, frameX, frameY, frameW);
  } else {
    doc.font("Helvetica").fontSize(9).fillColor(C.muted);
    doc.text("(Capture non disponible)", M.left, frameY);
    doc.y = frameY + 20;
  }

  if (page.caption) {
    doc.font("Helvetica").fontSize(9).fillColor(C.text);
    doc.text(page.caption, M.left, doc.y, { width: contentWidth(doc), lineGap: 2 });
  }
}

/** Maquette de repli si capture absente */
function drawScreenMockupFallback(doc, page, frameX, frameY, frameW) {
  const frameH = 120;
  doc.roundedRect(frameX, frameY, frameW, frameH, 4).strokeColor(C.grayBorder).stroke();
  doc.font("Helvetica").fontSize(10).fillColor(C.muted);
  doc.text(`Capture manquante : ${page.file}`, frameX + 12, frameY + 50, { width: frameW - 24, align: "center" });
  doc.y = frameY + frameH + 12;
}

function buildCover(doc) {
  doc.rect(0, 0, doc.page.width, doc.page.height).fill(C.navy);
  doc.font("Helvetica-Bold").fontSize(28).fillColor(C.white);
  doc.text("ReconciliApp", M.left, 180, { width: contentWidth(doc) });
  doc.font("Helvetica").fontSize(16).fillColor("#93c5fd");
  doc.text("Guide d'utilisation", M.left, 220, { width: contentWidth(doc) });
  doc.moveDown(2);
  doc.font("Helvetica").fontSize(12).fillColor("#e5e7eb");
  doc.text("Réconciliation des transactions", M.left, 270);
  doc.text("Suivi des soldes", M.left, 290);
  doc.text("Parcours par rôle & aperçus visuels", M.left, 310);
  doc.font("Helvetica").fontSize(10).fillColor("#9ca3af");
  doc.text("Groupe Intouch — Version 1 — Juin 2026", M.left, doc.page.height - 80);
  doc.addPage();
  doc.y = M.top;
  doc.fillColor(C.text);
}

function buildToc(doc) {
  heading(doc, "Table des matières", 1);
  const items = [
    "1. Vue d'ensemble et prérequis",
    "2. Réconciliation des transactions",
    "   2.1 Lanceur et modes",
    "   2.2 Sélection des colonnes",
    "   2.3 Résultats et traitement des écarts",
    "3. Suivi des soldes",
    "   3.1 Gestion des comptes",
    "   3.2 Opérations et relevés",
    "   3.3 Modules TSOP, Impact OP, TRX SF",
    "4. Parcours par rôle",
    "   4.1 Opérateur réconciliation",
    "   4.2 Gestionnaire de soldes",
    "   4.3 Administrateur",
    "5. Captures d'écran",
    "6. Glossaire et formats d'import",
  ];
  items.forEach((item) => bullet(doc, item));
  doc.addPage();
  doc.y = M.top;
}

function buildOverview(doc) {
  heading(doc, "1. Vue d'ensemble et prérequis", 1);
  para(doc, "ReconciliApp est une plateforme métier Intouch pour réconcilier les transactions entre le Back Office (BO) et les fichiers partenaires, suivre les soldes de comptes, traiter les écarts et piloter l'activité via des tableaux de bord et statistiques.");
  para(doc, "Chaîne bout-en-bout type :", { bold: true });
  bullet(doc, "Connexion → Lanceur de réconciliation (fichiers BO + Partenaire)");
  bullet(doc, "Sélection du mode et des colonnes clés → Exécution");
  bullet(doc, "Résultats : correspondances, écarts BO, écarts Partenaire");
  bullet(doc, "Sauvegarde des écarts vers TSOP, TRX SF ou Impact OP");
  bullet(doc, "Comptes → Relevé → comparaison solde calculé vs solde BO");
  bullet(doc, "Traitement des écarts (statuts, commentaires, opérations)");
  bullet(doc, "Dashboard et statistiques pour le pilotage");

  heading(doc, "Prérequis", 2);
  const w = [140, contentWidth(doc) - 140];
  tableRow(doc, ["Élément", "Détail"], w, true);
  tableRow(doc, ["Accès", "Identifiant / mot de passe ; éventuellement 2FA (code 6 chiffres)"], w);
  tableRow(doc, ["Droits", "Modules autorisés selon le profil (Réconciliation, Comptes, TSOP, etc.)"], w);
  tableRow(doc, ["Fichiers", "CSV, XLS ou XLSX — un fichier BO et un fichier Partenaire"], w);
  tableRow(doc, ["Référentiels", "Comptes créés, opérations enregistrées, frais configurés (TRX SF)"], w);
  tableRow(doc, ["Optionnel", "Modèles de traitement automatique pour le mode Magique"], w);

  heading(doc, "Navigation principale", 2);
  para(doc, "Après connexion, le menu latéral donne accès aux modules selon vos droits : Tableau de bord, Traitement, Réconciliation, Résultats, Statistiques, Comptes, Opérations, Suivi des écarts (TSOP, Impact OP, TRX SF), Banque, AIDE, et Paramètre (admin).");
  doc.addPage();
  doc.y = M.top;
}

function buildReconciliation(doc) {
  heading(doc, "2. Réconciliation des transactions", 1);

  heading(doc, "2.1 Lanceur de réconciliation", 2);
  para(doc, "Menu : Réconciliation → /reconciliation-launcher. C'est le point d'entrée après connexion.");
  para(doc, "Étapes :", { bold: true });
  bullet(doc, "Déposer le Fichier BO (source interne Intouch) par glisser-déposer ou sélection.");
  bullet(doc, "Déposer le Fichier Partenaire (opérateur tiers) de la même manière.");
  bullet(doc, "Les indicateurs en haut confirment le chargement (0 ou 1 fichier par côté).");
  bullet(doc, "Choisir un mode puis lancer la réconciliation.");

  heading(doc, "Les trois modes", 3);
  const w = [100, 120, contentWidth(doc) - 220];
  tableRow(doc, ["Mode", "Quand l'utiliser", "Parcours"], w, true);
  tableRow(doc, ["Manuel", "Fichiers atypiques, contrôle total", "Sélection colonnes → Lancement"], w);
  tableRow(doc, ["Assisté", "Fichiers standards", "Suggestions + validation → Lancement"], w);
  tableRow(doc, ["Magique", "Fichiers connus, rapidité", "Détection auto → Résultats directs"], w);

  para(doc, "Actions disponibles : Choisir ce mode, Continuer avec le mode..., Lancer la Réconciliation Magique, Réinitialiser les données.");
  para(doc, "Pour certains fichiers TRXBO, des filtres intermédiaires apparaissent : sélection des agences, services et statuts.");

  heading(doc, "2.2 Sélection des colonnes (Manuel / Assisté)", 2);
  bullet(doc, "Associer les colonnes clés BO et Partenaire (ID transaction, référence GU, etc.).");
  bullet(doc, "Ajouter des clés supplémentaires si nécessaire.");
  bullet(doc, "Mode assisté : Appliquer les suggestions automatiquement puis vérifier.");
  bullet(doc, "Cliquer sur Lancer la réconciliation — une barre de progression s'affiche.");

  heading(doc, "2.3 Résultats et traitement des écarts", 2);
  para(doc, "Menu : Résultats → /results. Quatre indicateurs principaux :");
  const w2 = [130, contentWidth(doc) - 130];
  tableRow(doc, ["Indicateur", "Signification"], w2, true);
  tableRow(doc, ["Transactions", "Volume total traité"], w2);
  tableRow(doc, ["Correspondances", "Présentes des deux côtés (match OK)"], w2);
  tableRow(doc, ["Écarts BO", "Uniquement côté BO"], w2);
  tableRow(doc, ["Écarts Partenaire", "Uniquement côté partenaire"], w2);

  para(doc, "Depuis les écrans d'écarts, cocher les lignes puis :", { bold: true });
  tableRow(doc, ["Action", "Destination", "Usage"], [120, 100, contentWidth(doc) - 220], true);
  tableRow(doc, ["Sauvegarder dans Ecart Solde", "TSOP", "Écarts impactant le solde"], [120, 100, contentWidth(doc) - 220]);
  tableRow(doc, ["Sauvegarder dans TRX SF", "TRX SF", "Transactions sans frais"], [120, 100, contentWidth(doc) - 220]);
  tableRow(doc, ["Sauvegarder dans Import OP", "Impact OP", "Écarts partenaires à régulariser"], [120, 100, contentWidth(doc) - 220]);
  tableRow(doc, ["Créer OP", "Opérations", "Opération depuis écart éligible"], [120, 100, contentWidth(doc) - 220]);
  tableRow(doc, ["Exporter", "Excel", "Archivage ou analyse externe"], [120, 100, contentWidth(doc) - 220]);

  para(doc, "Autres actions : Nouvelle réconciliation, Voir les statistiques, Rapport Réconciliation, Rapport des écarts, Résumé par Agence.");
  doc.addPage();
  doc.y = M.top;
}

function buildSoldes(doc) {
  heading(doc, "3. Suivi des soldes", 1);

  heading(doc, "3.1 Gestion des comptes", 2);
  para(doc, "Menu : Comptes → /comptes. C'est le coeur du suivi des soldes.");
  bullet(doc, "Filtres : pays, code propriétaire, catégorie, type, période.");
  bullet(doc, "Soldes critiques : comptes dont le ratio solde/volume moyen est faible.");
  bullet(doc, "Modèle solde BO : gabarit CSV (Date, Numéro de compte, Montant).");
  bullet(doc, "Importer soldes BO : import en masse des soldes de clôture.");
  bullet(doc, "Voir le relevé : historique opérations, écarts, soldes journaliers.");
  bullet(doc, "Solde BO : saisie unitaire du solde BO pour une date.");

  heading(doc, "Relevé de compte (modal)", 3);
  bullet(doc, "Onglet Opérations : mouvements avec solde avant/après, filtres, vues jour/semaine/mois.");
  bullet(doc, "Onglet Écarts de Solde : écarts liés au compte et à la date.");
  bullet(doc, "Onglet Ecart régularisé : impacts opérationnels (Impact OP).");
  bullet(doc, "Vue Soldes : ouverture, clôture, Solde BO, Écart de solde (vert = OK, rouge = écart).");

  heading(doc, "3.2 Opérations", 2);
  para(doc, "Menu : Opérations → /operations. Journal de tous les mouvements : cashin, paiement, approvisionnement, compensation, frais, transaction_cree, annulation_bo, tsop, ajustement. Chaque opération porte un solde avant et un solde après.");

  heading(doc, "3.3 Modules de traitement des écarts", 2);
  const w = [110, 90, contentWidth(doc) - 200];
  tableRow(doc, ["Module", "Route", "Rôle"], w, true);
  tableRow(doc, ["Écart de solde (TSOP)", "/ecart-solde", "Écarts impactant les soldes"], w);
  tableRow(doc, ["Ecart régularisé (Impact OP)", "/impact-op", "Régularisation opérationnelle"], w);
  tableRow(doc, ["TRX SF", "/trx-sf", "Transactions sans frais"], w);

  para(doc, "Workflow d'import commun : Télécharger Modèle → Valider le fichier → Uploader. Statuts : EN_ATTENTE → TRAITE ou ERREUR (commentaire obligatoire).");
  para(doc, "Outils complémentaires : Fusion Service (/service-balance), Prédictions (/predictions), Banque (/banque).");
  doc.addPage();
  doc.y = M.top;
}

function buildRoles(doc) {
  heading(doc, "4. Parcours par rôle", 1);

  heading(doc, "4.1 Opérateur réconciliation", 2);
  para(doc, "Profil type : chargé de rapprocher quotidiennement les fichiers BO et partenaires.");
  para(doc, "Modules accessibles :", { bold: true });
  bullet(doc, "Réconciliation, Résultats, Statistiques, Traitement, AIDE");
  bullet(doc, "Éventuellement : Rapports, Suivi des écarts (lecture)");

  para(doc, "Parcours quotidien recommandé :", { bold: true });
  bullet(doc, "1. Se connecter → Lanceur de réconciliation");
  bullet(doc, "2. Déposer les fichiers BO et Partenaire du jour");
  bullet(doc, "3. Choisir le mode Assisté ou Magique (Manuel si fichier atypique)");
  bullet(doc, "4. Analyser les résultats : correspondances et écarts");
  bullet(doc, "5. Cocher les écarts BO → Sauvegarder dans Ecart Solde ou TRX SF");
  bullet(doc, "6. Cocher les écarts Partenaire → Sauvegarder dans Import OP");
  bullet(doc, "7. Exporter les résultats si besoin d'archivage");
  bullet(doc, "8. Consulter les statistiques ou le rapport de réconciliation");

  para(doc, "Points d'attention :", { bold: true });
  bullet(doc, "Vérifier les KPI avant de transmettre les écarts aux équipes soldes.");
  bullet(doc, "Utiliser Réinitialiser si les mauvais fichiers ont été chargés.");
  bullet(doc, "Consulter la SOP Réconciliation TRX dans le menu AIDE.");

  hr(doc);

  heading(doc, "4.2 Gestionnaire de soldes", 2);
  para(doc, "Profil type : responsable du suivi des comptes, des soldes BO et du traitement des écarts.");
  para(doc, "Modules accessibles :", { bold: true });
  bullet(doc, "Comptes, Opérations, Suivi des écarts (TSOP, Impact OP, TRX SF)");
  bullet(doc, "Banque, Prédictions, Dashboard, Statistiques");

  para(doc, "Parcours quotidien recommandé :", { bold: true });
  bullet(doc, "1. Consulter le Dashboard et les soldes critiques sur Comptes");
  bullet(doc, "2. Importer ou saisir les soldes BO du jour (import masse ou unitaire)");
  bullet(doc, "3. Ouvrir les relevés des comptes en écart (vue Soldes, code rouge)");
  bullet(doc, "4. Traiter les écarts TSOP : filtrer EN_ATTENTE → statut TRAITE + commentaire");
  bullet(doc, "5. Traiter les impacts OP : régularisation, Créer OP si éligible");
  bullet(doc, "6. Vérifier les opérations générées et les soldes après/après");
  bullet(doc, "7. Utiliser Prédictions pour anticiper approvisionnements et compensations");
  bullet(doc, "8. Exporter les relevés ou soldes critiques pour reporting");

  para(doc, "Points d'attention :", { bold: true });
  bullet(doc, "Tout changement de statut d'écart exige un commentaire.");
  bullet(doc, "Comparer systématiquement solde calculé et solde BO avant clôture.");
  bullet(doc, "Les écarts issus de la réconciliation arrivent via Sauvegarder dans Ecart Solde / Import OP.");

  hr(doc);

  heading(doc, "4.3 Administrateur", 2);
  para(doc, "Profil type : responsable technique et sécurité de la plateforme.");
  para(doc, "Modules accessibles :", { bold: true });
  bullet(doc, "Paramètre : Utilisateurs, Profils, Modules, Permissions, Log utilisateur, Sécurité (2FA)");
  bullet(doc, "Modèles de Traitement, Frais & Commissions, tous les modules métier");

  para(doc, "Parcours type :", { bold: true });
  bullet(doc, "1. Gérer les utilisateurs et leur assigner un profil avec les bons modules");
  bullet(doc, "2. Configurer les permissions (consulter, créer, modifier, supprimer) par module");
  bullet(doc, "3. Maintenir les modèles de traitement automatique (patterns de fichiers)");
  bullet(doc, "4. Configurer les frais transaction pour TRX SF et calculs TSOP");
  bullet(doc, "5. Activer et surveiller l'authentification 2FA");
  bullet(doc, "6. Consulter le journal utilisateur pour la traçabilité des actions");
  bullet(doc, "7. Mettre à jour les guides SOP via Guide d'utilisation (/guide-utilisation)");

  para(doc, "Bonnes pratiques :", { bold: true });
  bullet(doc, "Principe du moindre privilège : n'accorder que les modules nécessaires.");
  bullet(doc, "Séparer les profils opérateur réconciliation et gestionnaire de soldes.");
  bullet(doc, "Tester les nouveaux modèles auto-processing avant déploiement en mode Magique.");
  doc.addPage();
  doc.y = M.top;
}

function buildMockups(doc) {
  const shotCount = SCREEN_PAGES.filter((p) => fs.existsSync(path.join(SCREENSHOT_DIR, p.file))).length;
  heading(doc, "5. Captures d'écran", 1);
  para(doc,
    shotCount > 0
      ? `Les ${shotCount} pages suivantes sont des captures réelles de l'application ReconciliApp (résolution 1440×900), prises sur l'environnement local.`
      : "Les captures d'écran ne sont pas encore générées. Exécutez : npm run screenshots dans le dossier docs/."
  );
  doc.addPage();
  doc.y = M.top;

  SCREEN_PAGES.forEach((page) => {
    if (page.optional && !fs.existsSync(path.join(SCREENSHOT_DIR, page.file))) return;
    drawScreenshotPage(doc, page);
  });
}


function buildGlossary(doc) {
  doc.addPage();
  doc.y = M.top;
  heading(doc, "6. Glossaire et formats d'import", 1);

  heading(doc, "Glossaire", 2);
  const w = [120, contentWidth(doc) - 120];
  const terms = [
    ["BO", "Back Office — fichier source interne Intouch"],
    ["Partenaire", "Fichier opérateur tiers (ex. Orange Money)"],
    ["Correspondance", "Transaction identifiée des deux côtés"],
    ["Écart BO", "Transaction présente uniquement côté BO"],
    ["Écart Partenaire", "Transaction présente uniquement côté partenaire"],
    ["CLE", "Colonne de réconciliation privilégiée"],
    ["Solde BO", "Solde de clôture issu du back office"],
    ["Écart de solde", "Différence solde calculé − solde BO"],
    ["TSOP", "Module de suivi des écarts de solde"],
    ["TRX SF", "Transactions sans frais"],
    ["Impact OP", "Impacts opérationnels / écarts régularisés"],
    ["Code propriétaire", "Identifiant du compte opérationnel / agence"],
    ["Numéro Trans GU", "Référence transaction groupe"],
    ["Relevé", "Historique opérations et soldes d'un compte"],
  ];
  tableRow(doc, ["Terme", "Définition"], w, true);
  terms.forEach(([t, d]) => tableRow(doc, [t, d], w));

  heading(doc, "Formats d'import", 2);
  const w2 = [100, 80, contentWidth(doc) - 180];
  tableRow(doc, ["Donnée", "Format", "Écran"], w2, true);
  [
    ["Fichiers réconciliation", "CSV, XLS, XLSX", "Lanceur"],
    ["Soldes BO", "CSV : Date, N° compte, Montant", "Comptes"],
    ["Écarts de solde", "CSV, XLS, XLSX (modèle)", "Écart de solde"],
    ["Impact OP", "CSV, XLS, XLSX (modèle)", "Impact OP"],
    ["TRX SF", "CSV 8 ou 2 colonnes", "TRX SF"],
    ["Opérations", "transaction_cree, annulation_bo", "Opérations"],
  ].forEach((row) => tableRow(doc, row, w2));

  heading(doc, "Aide intégrée", 2);
  bullet(doc, "Menu AIDE (/aide) : hub des procédures SOP");
  bullet(doc, "SOP Réconciliation TRX : procédure détaillée réconciliation et écarts");
  bullet(doc, "SOP Opération : workflows back office");
  bullet(doc, "Guide d'utilisation (/guide-utilisation) : documents SOP téléchargeables");

  hr(doc);
  para(doc, "Document généré pour ReconciliApp — Groupe Intouch — Version 1 — Juin 2026 — Confidentiel", { size: 9, color: C.muted, align: "center" });
}

function buildPdf() {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      autoFirstPage: false,
      size: "A4",
      margins: M,
      bufferPages: true,
      info: {
        Title: "ReconciliApp — Guide d'utilisation",
        Author: "Groupe Intouch",
        Subject: "Réconciliation et suivi des soldes",
        Keywords: "ReconciliApp, réconciliation, soldes, TSOP, guide",
      },
    });
    const stream = fs.createWriteStream(outPath);
    doc.pipe(stream);

    doc.addPage();
    buildCover(doc);
    buildToc(doc);
    buildOverview(doc);
    buildReconciliation(doc);
    buildSoldes(doc);
    buildRoles(doc);
    buildMockups(doc);
    buildGlossary(doc);
    addFooters(doc);

    doc.end();
    stream.on("finish", () => resolve(outPath));
    stream.on("error", reject);
  });
}

await buildPdf();
console.log("PDF cree:", outPath);
