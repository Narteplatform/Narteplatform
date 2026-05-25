import { readFileSync, writeFileSync, mkdirSync, existsSync, unlinkSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, resolve } from "node:path";
import { marked } from "marked";

const CHROME =
  process.env.CHROME_PATH ||
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

const ROOT = resolve(process.cwd());
const DOCS = join(ROOT, "docs");
const OUT = join(DOCS, "pdf");
if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

const CSS = `
@page { size: A4; margin: 22mm 18mm; }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body {
  font-family: "Inter", "Segoe UI", "Helvetica Neue", Arial, sans-serif;
  color: #0B0B0B;
  background: #FFFFFF;
  font-size: 10.5pt;
  line-height: 1.55;
  -webkit-font-smoothing: antialiased;
}
.cover {
  page-break-after: always;
  height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 30mm 0;
}
.cover .brand {
  font-family: "Archivo Black", "Arial Black", sans-serif;
  font-size: 64pt;
  letter-spacing: -0.02em;
  line-height: 0.9;
  text-transform: uppercase;
  color: #0B0B0B;
}
.cover .accent { color: #FF5722; }
.cover .subtitle {
  font-size: 14pt;
  color: #555;
  margin-top: 12pt;
  max-width: 140mm;
}
.cover .meta {
  font-size: 10pt;
  color: #888;
  border-top: 2px solid #0B0B0B;
  padding-top: 10pt;
  display: flex;
  justify-content: space-between;
}
h1, h2, h3, h4 {
  font-family: "Archivo Black", "Arial Black", sans-serif;
  text-transform: uppercase;
  letter-spacing: -0.01em;
  color: #0B0B0B;
  page-break-after: avoid;
}
h1 { font-size: 22pt; margin: 0 0 6pt; border-bottom: 3px solid #FF5722; padding-bottom: 6pt; }
h2 { font-size: 15pt; margin: 22pt 0 8pt; }
h2::before { content: ""; display: inline-block; width: 10pt; height: 10pt; background: #FF5722; margin-right: 8pt; transform: translateY(-1pt); }
h3 { font-size: 12pt; margin: 16pt 0 6pt; color: #FF5722; }
h4 { font-size: 11pt; margin: 12pt 0 4pt; }
p { margin: 6pt 0; }
ul, ol { margin: 6pt 0 6pt 18pt; padding: 0; }
li { margin: 2pt 0; }
strong { color: #0B0B0B; }
em { color: #444; }
a { color: #FF5722; text-decoration: none; }
hr { border: 0; border-top: 1px solid #ddd; margin: 18pt 0; }
blockquote {
  border-left: 3px solid #FF5722;
  background: #F8F8F8;
  margin: 10pt 0;
  padding: 8pt 12pt;
  color: #333;
  font-style: italic;
}
code {
  background: #F4F4F4;
  padding: 1pt 4pt;
  border-radius: 3px;
  font-family: "JetBrains Mono", Consolas, monospace;
  font-size: 9pt;
  color: #0B0B0B;
}
pre {
  background: #0B0B0B;
  color: #F4F4F4;
  padding: 10pt 12pt;
  border-radius: 6px;
  overflow: hidden;
  font-size: 9pt;
  line-height: 1.45;
  page-break-inside: avoid;
}
pre code { background: transparent; color: inherit; padding: 0; }
table {
  width: 100%;
  border-collapse: collapse;
  margin: 10pt 0;
  font-size: 9.5pt;
  page-break-inside: avoid;
}
th, td {
  border: 1px solid #E5E5E5;
  padding: 6pt 8pt;
  text-align: left;
  vertical-align: top;
}
th {
  background: #0B0B0B;
  color: #FFFFFF;
  font-family: "Archivo Black", "Arial Black", sans-serif;
  text-transform: uppercase;
  font-size: 9pt;
  letter-spacing: 0.02em;
}
tr:nth-child(even) td { background: #FAFAFA; }
td:first-child { font-weight: 600; }
.callout {
  border-left: 4px solid #FF5722;
  background: #FFF7F3;
  padding: 10pt 14pt;
  margin: 12pt 0;
  border-radius: 0 6px 6px 0;
}
.footer-band {
  position: fixed;
  bottom: 6mm;
  left: 18mm;
  right: 18mm;
  font-size: 8pt;
  color: #999;
  display: flex;
  justify-content: space-between;
  border-top: 1px solid #E5E5E5;
  padding-top: 4pt;
}
.section-title { page-break-before: auto; }
`;

function html(title, subtitle, bodyHtml) {
  return `<!doctype html>
<html lang="it">
<head>
<meta charset="utf-8" />
<title>${title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Archivo+Black&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>${CSS}</style>
</head>
<body>
  <section class="cover">
    <div>
      <div style="font-size:10pt;letter-spacing:0.3em;text-transform:uppercase;color:#FF5722;margin-bottom:10pt;">N'arte — Documento ufficiale</div>
      <div class="brand">N'<span class="accent">arte</span></div>
      <div class="subtitle">${subtitle}</div>
    </div>
    <div class="meta">
      <span>Versione 1.0</span>
      <span>25 maggio 2026</span>
      <span>Riservato — uso interno cliente</span>
    </div>
  </section>
  ${bodyHtml}
  <div class="footer-band"><span>N'arte — ${title}</span><span>v1.0 · 25/05/2026</span></div>
</body>
</html>`;
}

function buildOne(mdPath, outPdf, title, subtitle) {
  const md = readFileSync(mdPath, "utf8");
  const body = marked.parse(md, { gfm: true, breaks: false });
  const fullHtml = html(title, subtitle, body);
  const tmpHtml = mdPath.replace(/\.md$/, ".__tmp.html");
  writeFileSync(tmpHtml, fullHtml, "utf8");

  const args = [
    "--headless=new",
    "--disable-gpu",
    "--no-sandbox",
    "--no-pdf-header-footer",
    `--print-to-pdf=${outPdf}`,
    `file:///${tmpHtml.replace(/\\/g, "/")}`,
  ];
  execFileSync(CHROME, args, { stdio: "inherit" });

  unlinkSync(tmpHtml);
  console.log("OK -> " + outPdf);
}

const jobs = [
  {
    md: join(DOCS, "PIATTAFORMA_NARTE.md"),
    pdf: join(OUT, "PIATTAFORMA_NARTE.pdf"),
    title: "Piattaforma N'arte — Scope definitivo",
    subtitle: "Documento di approvazione: funzioni, ruoli, flussi, integrazioni e piani.",
  },
  {
    md: join(DOCS, "APPENDICE_TECNICA.md"),
    pdf: join(OUT, "APPENDICE_TECNICA.pdf"),
    title: "Appendice tecnica N'arte",
    subtitle: "Stack, modello dati, sicurezza, hosting e roadmap tecnica.",
  },
];

for (const j of jobs) buildOne(j.md, j.pdf, j.title, j.subtitle);
