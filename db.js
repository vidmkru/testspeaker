import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, "data", "speakers.json");

function ensureDataFile() {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, "[]", "utf-8");
}

export function getAllSpeakers() {
  ensureDataFile();
  const raw = fs.readFileSync(DATA_FILE, "utf-8");
  return JSON.parse(raw);
}

export function getSpeakerById(id) {
  return getAllSpeakers().find((s) => s.id === id) ?? null;
}

function saveAll(speakers) {
  ensureDataFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(speakers, null, 2), "utf-8");
}

export function addSpeaker({ name, title, bio, photo }) {
  const speakers = getAllSpeakers();
  const speaker = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
    name,
    title,
    bio,
    photo,
    createdAt: new Date().toISOString(),
  };
  speakers.push(speaker);
  saveAll(speakers);
  return speaker;
}

export function updateSpeaker(id, { name, title, bio, photo }) {
  const speakers = getAllSpeakers();
  const idx = speakers.findIndex((s) => s.id === id);
  if (idx === -1) return null;
  speakers[idx] = {
    ...speakers[idx],
    name,
    title,
    bio,
    ...(photo ? { photo } : {}),
  };
  saveAll(speakers);
  return speakers[idx];
}

export function deleteSpeaker(id) {
  const speakers = getAllSpeakers();
  const target = speakers.find((s) => s.id === id);
  const remaining = speakers.filter((s) => s.id !== id);
  saveAll(remaining);
  return target ?? null;
}
