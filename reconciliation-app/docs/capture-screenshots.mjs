/**
 * Capture les écrans ReconciliApp via Playwright pour le guide PDF.
 * Prérequis : frontend sur https://localhost:4200 (ou RECONCILI_BASE_URL).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "screenshots", "guide-v1");
const BASE_URL = process.env.RECONCILI_BASE_URL || "https://localhost:4200";

function getLoginCandidates() {
  const user = process.env.RECONCILI_USER || "admin";
  const pass = process.env.RECONCILI_PASSWORD;
  if (!pass) {
    console.warn("RECONCILI_PASSWORD non défini — tentative avec yamar.ndao en secours.");
    return [{ username: "yamar.ndao", password: "yamar" }];
  }
  return [{ username: user, password: pass }];
}

const MOCK_SESSION = {
  username: "guide.demo",
  token: "screenshot-mock-jwt-token",
  rights: {
    profil: "ADMIN",
    modules: [
      "Dashboard", "Traitement", "Réconciliation", "Résultats", "Statistiques",
      "Classements", "Comptes", "Opérations", "Frais", "Commission", "Charge",
      "TSOP", "Impact OP", "TRX SF", "BANQUE", "Comptabilité", "Modèles",
    ],
    permissions: {
      Réconciliation: ["consulter"],
      Résultats: ["consulter"],
      Dashboard: ["consulter", "filtrer"],
      Comptes: ["consulter"],
      Opérations: ["consulter"],
      Statistiques: ["consulter"],
      TSOP: ["consulter"],
      "Impact OP": ["consulter"],
      "TRX SF": ["consulter"],
      BANQUE: ["consulter"],
      Traitement: ["consulter"],
      Modèles: ["consulter"],
    },
  },
};

const SCREENS = [
  { id: "01-login", route: "/login", public: true, waitMs: 2000 },
  { id: "02-reconciliation-launcher", route: "/reconciliation-launcher", waitMs: 2500 },
  { id: "03-column-selection", route: "/column-selection?mode=assisted", waitMs: 2500 },
  { id: "04-results", route: "/results", waitMs: 3000 },
  { id: "05-ecart-bo", route: "/ecart-bo", waitMs: 3000 },
  { id: "06-comptes", route: "/comptes", waitMs: 4000 },
  { id: "07-ecart-solde", route: "/ecart-solde", waitMs: 4000 },
  { id: "08-impact-op", route: "/impact-op", waitMs: 4000 },
  { id: "09-dashboard", route: "/dashboard", waitMs: 4000 },
];

function buildRightsFromLoginResponse(response) {
  const droits = response.droits || [];
  const modules = [...new Set(droits.map((d) => d.module))];
  const permissions = {};
  droits.forEach((d) => {
    if (!permissions[d.module]) permissions[d.module] = [];
    permissions[d.module].push(d.permission);
  });
  return {
    profil: response.profil || "USER",
    modules,
    permissions,
  };
}

async function apiLogin(request) {
  for (const cred of getLoginCandidates()) {
    try {
      const res = await request.post(`${BASE_URL}/api/auth/login`, {
        data: cred,
        ignoreHTTPSErrors: true,
      });
      if (!res.ok()) continue;
      const body = await res.json();
      if (body.requires2FA) {
        console.warn(`2FA actif pour ${cred.username}, compte suivant...`);
        continue;
      }
      if (!body.token) continue;
      console.log(`Connexion API réussie : ${body.username}`);
      return { ...body, rights: buildRightsFromLoginResponse(body) };
    } catch (e) {
      console.warn(`Erreur login ${cred.username}:`, e.message);
    }
  }
  return null;
}

async function prepareAuthContext(context, session, useApiMock) {
  await context.addInitScript((s) => {
    localStorage.setItem("username", s.username);
    localStorage.setItem("auth_token", s.token);
    localStorage.setItem("userRights", JSON.stringify(s.rights));
  }, session);

  const sampleCompte = {
    id: 1,
    numeroCompte: "CIELCM0001",
    solde: 4250000,
    pays: "CM",
    codeProprietaire: "AG001",
    type: "TOP20",
    categorie: "Client",
    dateDerniereMaj: "2026-06-10T18:00:00",
  };

  // Mock API uniquement si pas de login réel (évite 401 avec token simulé)
  if (useApiMock) {
    await context.route("**/api/**", async (route) => {
      const url = route.request().url();
      if (url.includes("/api/auth/login") || url.includes("/api/auth/verify-2fa")) {
        return route.continue();
      }
      const method = route.request().method();
      if (method === "GET") {
        if (/comptes/i.test(url) && !/solde-bo|releve/i.test(url)) {
          return route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify([sampleCompte]),
          });
        }
        if (/releve|operations\/compte/i.test(url)) {
          return route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify([
              {
                id: 1,
                type: "total_cashin",
                montant: 50000,
                soldeAvant: 4200000,
                soldeApres: 4250000,
                dateOperation: "2026-06-10",
              },
            ]),
          });
        }
        const emptyList =
          /operations|ecart|impact|trx|stats|dashboard|banque|users|matches|reconciliation/i.test(url);
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: emptyList ? "[]" : "{}",
        });
      }
      return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    });
  }
}

async function warmAuthSession(page) {
  await page.goto(`${BASE_URL}/reconciliation-launcher`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await page.waitForTimeout(2000);
  if (page.url().includes("/login")) {
    throw new Error("Session non reconnue après init (redirection login).");
  }
}

async function dismissPopups(page) {
  for (let i = 0; i < 3; i++) {
    const closed = await page
      .locator("button:has-text('OK'), button:has-text('Fermer'), .modern-popup button, .popup-close")
      .first()
      .click({ timeout: 500 })
      .then(() => true)
      .catch(() => false);
    if (!closed) break;
    await page.waitForTimeout(400);
  }
}

async function capturePage(page, screen) {
  const url = `${BASE_URL}${screen.route}`;
  console.log(`Capture ${screen.id} → ${url}`);
  await page.goto(url, { waitUntil: "networkidle", timeout: 120000 }).catch(async () => {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120000 });
  });
  await page.waitForTimeout(screen.waitMs || 2000);
  await dismissPopups(page);

  if (!screen.public && page.url().includes("/login")) {
    throw new Error(`Redirection login pour ${screen.id} — session invalide`);
  }

  const outFile = path.join(OUT_DIR, `${screen.id}.png`);
  await page.screenshot({ path: outFile, fullPage: false, type: "png" });
  return outFile;
}

async function captureReleveModal(page) {
  console.log("Capture 06b-releve-compte (modal)...");
  await page.goto(`${BASE_URL}/comptes`, { waitUntil: "networkidle", timeout: 120000 }).catch(() => {});
  await page.waitForTimeout(5000);
  await dismissPopups(page);

  const releveBtn = page
    .locator('button[title="Voir le relevé"], button[title*="relev"], .icon-btn')
    .filter({ has: page.locator(".fa-file-alt, i.fa-file-alt") })
    .first();

  if (await releveBtn.isVisible({ timeout: 8000 }).catch(() => false)) {
    await releveBtn.click();
    await page.waitForTimeout(2500);
    await dismissPopups(page);
    const outFile = path.join(OUT_DIR, "06b-releve-compte.png");
    await page.screenshot({ path: outFile, fullPage: false, type: "png" });
    return outFile;
  }
  console.warn("Modal relevé non ouvert (tableau vide ou bouton absent).");
  return null;
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });

  // Contexte public : page de connexion
  const publicCtx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    ignoreHTTPSErrors: true,
    locale: "fr-FR",
  });
  const publicPage = await publicCtx.newPage();
  await publicPage.goto(`${BASE_URL}/login`, { waitUntil: "networkidle", timeout: 60000 }).catch(() => {});
  await publicPage.waitForTimeout(2000);
  const loginFile = path.join(OUT_DIR, "01-login.png");
  await publicPage.screenshot({ path: loginFile, type: "png" });
  console.log("Capture 01-login → page publique");
  await publicCtx.close();

  // Contexte authentifié
  const authCtx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    ignoreHTTPSErrors: true,
    locale: "fr-FR",
  });
  let session = await apiLogin(authCtx.request);
  let realLogin = !!session;

  if (!session) {
    console.warn("Login API indisponible — session ADMIN simulée pour captures UI.");
    session = MOCK_SESSION;
  } else {
    session = {
      username: session.username,
      token: session.token,
      rights: session.rights,
    };
  }

  await prepareAuthContext(authCtx, session, !realLogin);
  const page = await authCtx.newPage();
  await warmAuthSession(page);

  const captured = [loginFile];
  for (const screen of SCREENS.filter((s) => !s.public)) {
    const file = await capturePage(page, screen);
    captured.push(file);
  }

  const releveFile = await captureReleveModal(page);
  if (releveFile) captured.push(releveFile);

  await browser.close();

  const manifest = {
    generatedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    realLogin,
    username: session.username,
    files: captured.map((f) => path.basename(f)),
  };
  fs.writeFileSync(path.join(OUT_DIR, "manifest.json"), JSON.stringify(manifest, null, 2));
  console.log(`\n${captured.length} captures dans ${OUT_DIR}`);
}

await main();
