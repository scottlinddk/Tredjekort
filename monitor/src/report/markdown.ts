import type { PageDiff } from "../types.ts";

function truncate(s: string, max = 400): string {
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

function renderChangeList(diff: PageDiff): string[] {
  const lines: string[] = [];
  for (const c of diff.changedParagraphs) {
    const isDateChange = diff.dateChanges.includes(c);
    lines.push(`- ${isDateChange ? "**[dato/tidsplan ændret]** " : ""}Ændret:`);
    lines.push(`  - Før: ${truncate(c.before)}`);
    lines.push(`  - Nu: ${truncate(c.after)}`);
  }
  for (const p of diff.addedParagraphs) lines.push(`- Nyt: ${truncate(p)}`);
  for (const p of diff.removedParagraphs) lines.push(`- Fjernet: ${truncate(p)}`);
  for (const p of diff.addedPdfs) lines.push(`- 📄 Nyt dokument: [${p.text || p.url}](${p.url})${p.section ? ` _(under "${p.section}")_` : ""}`);
  for (const p of diff.removedPdfs) lines.push(`- 📄 Dokument fjernet: [${p.text || p.url}](${p.url})`);
  return lines;
}

export function renderReport(runId: string, diffs: PageDiff[], notes: string[]): string {
  const changed = diffs.filter((d) => d.status === "changed");
  const fresh = diffs.filter((d) => d.status === "new");
  const errors = diffs.filter((d) => d.status === "error");
  const noiseDiffs = diffs.filter((d) => d.noiseHits.length > 0);

  const lines: string[] = [];
  lines.push(`# Ændringsrapport — 3. Limfjordsforbindelse`);
  lines.push("");
  lines.push(`Kørsel: ${runId}`);
  lines.push("");

  // Summary
  if (changed.length === 0 && fresh.length === 0) {
    lines.push(
      errors.length > 0
        ? `**Ingen ændringer fundet**, men ${errors.length} side(r) kunne ikke hentes (se nederst).`
        : `**Ingen ændringer siden sidste kørsel.** Alle overvågede sider er uændrede.`
    );
  } else {
    const parts: string[] = [];
    if (fresh.length > 0) parts.push(`${fresh.length} side(r) fulgt for første gang`);
    if (changed.length > 0) parts.push(`${changed.length} side(r) ændret`);
    lines.push(`**${parts.join(", ")}.**`);
  }
  lines.push("");

  // Noise callout — always present, explicitly empty when empty.
  lines.push(`## 🔊 Støj-relaterede ændringer`);
  lines.push("");
  if (noiseDiffs.length === 0) {
    lines.push(`Ingen støj-relaterede ændringer i denne kørsel.`);
  } else {
    for (const d of noiseDiffs) {
      lines.push(`### ${d.label} — HØJ PRIORITET`);
      lines.push(`(${d.url})`);
      lines.push("");
      for (const hit of d.noiseHits) lines.push(`- ${truncate(hit)}`);
      lines.push("");
    }
  }
  lines.push("");

  // Per-page details
  const detailed = [...fresh, ...changed].sort((a, b) =>
    a.priority === b.priority ? 0 : a.priority === "high" ? -1 : 1
  );
  if (detailed.length > 0) {
    lines.push(`## Ændringer pr. side`);
    lines.push("");
    for (const d of detailed) {
      lines.push(`### ${d.label}${d.priority === "high" ? " ⭐" : ""}`);
      lines.push(`<${d.url}>`);
      lines.push("");
      if (d.status === "new") {
        lines.push(`Første snapshot af denne side (baseline) — ${d.addedParagraphs.length} afsnit, ${d.addedPdfs.length} dokumentlink(s) registreret. Fremtidige kørsler viser kun ændringer.`);
      } else {
        lines.push(...renderChangeList(d));
      }
      lines.push("");
    }
  }

  if (errors.length > 0) {
    lines.push(`## ⚠️ Sider der ikke kunne hentes`);
    lines.push("");
    for (const d of errors) lines.push(`- ${d.label} (<${d.url}>): ${d.error ?? "ukendt fejl"}`);
    lines.push("");
  }

  if (notes.length > 0) {
    lines.push(`## Noter`);
    lines.push("");
    for (const n of notes) lines.push(`- ${n}`);
    lines.push("");
  }

  return lines.join("\n");
}
