/**
 * Cold outreach — prospect CSV parsing.
 *
 * Shared by the admin import route and `scripts/outreach.cjs`, so a file
 * imported from the console and from the terminal lands identically.
 */

import type { ProspectInput } from "./store";

/**
 * The prospect CSV is produced for French Excel: UTF-8 BOM, ";" separator,
 * quoted fields with doubled inner quotes. Parsing it here rather than asking
 * the user to convert means the file they already maintain is the input.
 *
 * The separator is read from the header line and is the ONLY one honoured.
 * Splitting on both ";" and "," would shift every column after the first
 * unquoted comma in a ";" file — "Formation, coaching" pushing the website into
 * the wrong field — which is exactly the kind of French free text these files hold.
 */
export function parseCsv(raw: string): Record<string, string>[] {
  const text = raw.replace(/^﻿/, "");
  const headerLine = text.slice(0, text.search(/\r?\n|$/));
  const separator = headerLine.includes(";") ? ";" : ",";

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') {
      inQuotes = true;
    } else if (char === separator) {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }
  if (field || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  if (rows.length < 2) return [];
  const headers = rows[0].map((h) => h.trim().toLowerCase());
  return rows
    .slice(1)
    .filter((r) => r.some((cell) => cell.trim()))
    .map((r) => {
      const record: Record<string, string> = {};
      headers.forEach((header, index) => {
        record[header] = (r[index] ?? "").trim();
      });
      return record;
    });
}

/** Accepts both the French CSV headers and plain English ones. */
export function pick(record: Record<string, string>, ...keys: string[]): string {
  for (const key of keys) {
    const value = record[key.toLowerCase()];
    if (value) return value;
  }
  return "";
}

export function rowToInput(record: Record<string, string>): ProspectInput | null {
  const email = pick(record, "email", "e-mail", "adresse email");
  if (!email) return null;
  return {
    email,
    firstName: pick(record, "prénom", "prenom", "firstname", "first name"),
    lastName: pick(record, "nom", "lastname", "last name"),
    company: pick(record, "entreprise", "company", "société", "societe"),
    role: pick(record, "rôle", "role", "poste", "title"),
    sector: pick(record, "secteur", "sector", "industry"),
    website: pick(record, "site web", "website", "site"),
    linkedin: pick(record, "linkedin", "profil linkedin"),
    location: pick(record, "localisation", "location", "ville"),
    companySize: pick(record, "taille entreprise", "company size", "taille"),
    notes: pick(record, "notes", "note"),
    source: pick(record, "source découverte", "source", "source decouverte") || "import",
  };
}
