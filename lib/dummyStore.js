// Crosscheck Lightweight Dummy Store
// In-memory singleton with synchronous JSON persistence to data/dummy_store.json

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const DATA_DIR = path.join(process.cwd(), "data");
const STORE_PATH = path.join(DATA_DIR, "dummy_store.json");

// Default initial state
const defaultStore = {
  users: [],
  families: [],
  familyMembers: [],
  invites: [],
  alerts: [],
  sharedReports: [],
  userReports: [],
  whatsappLinks: [],
  incidentDrafts: [],
  processedEvents: [],
  outboundMessages: [],
  mockMedia: {},
  whatsappSessions: {},
};

// In-memory cache
let inMemoryStore = null;

// Rate limiting state (in-memory, sliding window)
const rateLimitMap = new Map();

/**
 * Loads the store from disk or initializes it in-memory.
 */
export function getStore() {
  if (inMemoryStore) {
    return inMemoryStore;
  }

  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (fs.existsSync(STORE_PATH)) {
      const raw = fs.readFileSync(STORE_PATH, "utf-8");
      inMemoryStore = JSON.parse(raw);
      // Ensure collections exist for backward compatibility
      if (!Array.isArray(inMemoryStore.whatsappLinks)) inMemoryStore.whatsappLinks = [];
      if (!Array.isArray(inMemoryStore.incidentDrafts)) inMemoryStore.incidentDrafts = [];
      if (!Array.isArray(inMemoryStore.processedEvents)) inMemoryStore.processedEvents = [];
      if (!Array.isArray(inMemoryStore.outboundMessages)) inMemoryStore.outboundMessages = [];
      if (!inMemoryStore.mockMedia || typeof inMemoryStore.mockMedia !== "object") inMemoryStore.mockMedia = {};
      if (!inMemoryStore.whatsappSessions || typeof inMemoryStore.whatsappSessions !== "object") inMemoryStore.whatsappSessions = {};
    } else {
      inMemoryStore = { ...defaultStore };
      fs.writeFileSync(STORE_PATH, JSON.stringify(inMemoryStore, null, 2), "utf-8");
    }
  } catch (err) {
    console.error("[dummyStore] Failed reading store from disk, using memory fallback:", err);
    inMemoryStore = { ...defaultStore };
  }

  return inMemoryStore;
}

/**
 * Persists the in-memory store to disk.
 */
export function persistStore() {
  if (!inMemoryStore) return;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(STORE_PATH, JSON.stringify(inMemoryStore, null, 2), "utf-8");
  } catch (err) {
    console.error("[dummyStore] Failed saving store to disk:", err);
  }
}

// ==========================================
// Password Hashing (Native scrypt + timingSafeEqual)
// ==========================================
export function hashPassword(plainText) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = crypto.scryptSync(plainText, salt, 64);
  return `${salt}:${derivedKey.toString("hex")}`;
}

export function verifyPassword(plainText, combinedHash) {
  if (!plainText || !combinedHash || !combinedHash.includes(":")) {
    return false;
  }
  const [salt, keyHex] = combinedHash.split(":");
  const keyBuffer = Buffer.from(keyHex, "hex");
  const derivedKey = crypto.scryptSync(plainText, salt, 64);
  return crypto.timingSafeEqual(derivedKey, keyBuffer);
}

// ==========================================
// Rate Limiter
// ==========================================
/**
 * @param {string} key - e.g. "login:ip_or_email"
 * @param {number} maxAttempts - default 5
 * @param {number} windowMs - default 5 minutes
 */
export function checkRateLimit(key, maxAttempts = 5, windowMs = 5 * 60 * 1000) {
  const now = Date.now();
  const record = rateLimitMap.get(key) || { attempts: [], lockedUntil: 0 };

  if (record.lockedUntil > now) {
    const remainingSeconds = Math.ceil((record.lockedUntil - now) / 1000);
    return {
      allowed: false,
      remainingSeconds,
      error: `Too many attempts. Please try again in ${remainingSeconds} seconds.`,
    };
  }

  // Filter out expired attempts
  record.attempts = record.attempts.filter((timestamp) => now - timestamp < windowMs);
  rateLimitMap.set(key, record);

  return { allowed: true, remainingSeconds: 0 };
}

export function recordFailedAttempt(key, maxAttempts = 5, lockDurationMs = 5 * 60 * 1000) {
  const now = Date.now();
  const record = rateLimitMap.get(key) || { attempts: [], lockedUntil: 0 };
  record.attempts.push(now);

  if (record.attempts.length >= maxAttempts) {
    record.lockedUntil = now + lockDurationMs;
  }

  rateLimitMap.set(key, record);
}

export function resetRateLimit(key) {
  rateLimitMap.delete(key);
}

// ==========================================
// User Operations
// ==========================================
export function findUserByEmail(email) {
  if (!email) return null;
  const store = getStore();
  const normalized = email.trim().toLowerCase();
  return store.users.find((u) => u.email.toLowerCase() === normalized) || null;
}

export function findUserById(id) {
  if (!id) return null;
  const store = getStore();
  return store.users.find((u) => u.id === id) || null;
}

export function createUser({ email, displayName, password }) {
  const store = getStore();
  const normalized = email.trim().toLowerCase();

  if (findUserByEmail(normalized)) {
    throw new Error("Email already in use");
  }

  const user = {
    id: `usr_${crypto.randomUUID()}`,
    email: normalized,
    displayName: displayName.trim(),
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  store.users.push(user);
  persistStore();

  const { passwordHash, ...safeUser } = user;
  return safeUser;
}

export function verifyUserCredentials(email, password) {
  const user = findUserByEmail(email);
  if (!user) return null;
  const isValid = verifyPassword(password, user.passwordHash);
  if (!isValid) return null;

  const { passwordHash, ...safeUser } = user;
  return safeUser;
}

// ==========================================
// User Reports (Migrated from guest / saved to account)
// ==========================================
export function migrateReportsToUser(userId, reports = []) {
  if (!userId || !Array.isArray(reports) || reports.length === 0) {
    return 0;
  }

  const store = getStore();
  let count = 0;

  for (const report of reports) {
    const reportId = report.reportId || report.id;
    if (!reportId) continue;

    const exists = store.userReports.some((r) => r.userId === userId && r.reportId === reportId);
    if (!exists) {
      store.userReports.push({
        id: `rpt_${crypto.randomUUID()}`,
        userId,
        reportId,
        claimPreview: report.claim || report.title || "Verified claim",
        verdict: report.verdict || "UNKNOWN",
        score: typeof report.confidenceScore === "number" ? report.confidenceScore : 50,
        reportData: JSON.stringify(report),
        createdAt: report.timestamp || new Date().toISOString(),
      });
      count++;
    }
  }

  if (count > 0) {
    persistStore();
  }
  return count;
}

export function getUserReports(userId) {
  if (!userId) return [];
  const store = getStore();
  return store.userReports
    .filter((r) => r.userId === userId)
    .map((r) => {
      try {
        return JSON.parse(r.reportData);
      } catch {
        return r;
      }
    });
}

export function saveUserReport(userId, report) {
  if (!userId || !report) return false;
  const store = getStore();
  const reportId = report.reportId || report.id || `rep_${Date.now()}`;

  const existingIdx = store.userReports.findIndex((r) => r.userId === userId && r.reportId === reportId);
  const entry = {
    id: existingIdx >= 0 ? store.userReports[existingIdx].id : `rpt_${crypto.randomUUID()}`,
    userId,
    reportId,
    claimPreview: report.claim || report.title || "Verified claim",
    verdict: report.verdict || "UNKNOWN",
    score: typeof report.confidenceScore === "number" ? report.confidenceScore : 50,
    reportData: JSON.stringify(report),
    createdAt: report.timestamp || new Date().toISOString(),
  };

  if (existingIdx >= 0) {
    store.userReports[existingIdx] = entry;
  } else {
    store.userReports.unshift(entry);
  }

  persistStore();
  return true;
}

// ==========================================
// Meta Webhook Idempotency (processedEvents)
// ==========================================
export function isEventProcessed(eventId) {
  if (!eventId) return false;
  const store = getStore();
  return store.processedEvents.some((e) => e.eventId === eventId);
}

export function recordProcessedEvent(eventId) {
  if (!eventId) return;
  const store = getStore();
  if (!isEventProcessed(eventId)) {
    store.processedEvents.push({
      eventId,
      processedAt: new Date().toISOString(),
    });
    // Keep max 1000 events to prevent unbounded growth
    if (store.processedEvents.length > 1000) {
      store.processedEvents = store.processedEvents.slice(-1000);
    }
    persistStore();
  }
}

// ==========================================
// Incident Drafts (Single-use Review Links)
// ==========================================
export function saveIncidentDraft({
  token,
  incident,
  transcript,
  originalTranscript = null,
  englishTranscript = null,
  detectedLanguage = null,
  source = "whatsapp",
  phoneNumber = null,
  userId = null,
}) {
  if (!token || !incident) {
    throw new Error("Token and incident are required to save draft");
  }

  const store = getStore();
  const draft = {
    id: `drf_${crypto.randomUUID()}`,
    token,
    status: "pending", // "pending" | "consumed"
    incident,
    transcript: transcript || incident.timeline_summary || "",
    originalTranscript: originalTranscript || transcript || incident.timeline_summary || "",
    englishTranscript: englishTranscript || transcript || incident.timeline_summary || "",
    detectedLanguage: detectedLanguage || incident.detected_language || "en",
    source,
    phoneNumber: phoneNumber ? String(phoneNumber).replace(/[^0-9+]/g, "") : null,
    userId: userId || null,
    createdAt: new Date().toISOString(),
    consumedAt: null,
  };

  const existingIdx = store.incidentDrafts.findIndex((d) => d.token === token);
  if (existingIdx >= 0) {
    store.incidentDrafts[existingIdx] = draft;
  } else {
    store.incidentDrafts.unshift(draft);
  }

  persistStore();
  return draft;
}

export function getIncidentDraft(token) {
  if (!token) return null;
  // Re-read from disk to support multi-process environments (Next server vs test script)
  try {
    if (fs.existsSync(STORE_PATH)) {
      const raw = fs.readFileSync(STORE_PATH, "utf-8");
      const diskStore = JSON.parse(raw);
      if (Array.isArray(diskStore.incidentDrafts)) {
        const store = getStore();
        store.incidentDrafts = diskStore.incidentDrafts;
      }
    }
  } catch {}

  const store = getStore();
  return store.incidentDrafts.find((d) => d.token === token) || null;
}

export function consumeIncidentDraft(token) {
  if (!token) return null;
  const store = getStore();
  const draft = store.incidentDrafts.find((d) => d.token === token);
  if (!draft) return null;

  draft.status = "consumed";
  draft.consumedAt = new Date().toISOString();
  persistStore();
  return draft;
}

export function phoneMatches(phoneA, phoneB) {
  if (!phoneA || !phoneB) return false;
  const a = String(phoneA).replace(/[^0-9]/g, "");
  const b = String(phoneB).replace(/[^0-9]/g, "");
  if (a === b) return true;
  if (a.length >= 10 && b.length >= 10 && a.slice(-10) === b.slice(-10)) return true;
  return false;
}

export function deletePendingDraftsByPhone(phoneNumber) {
  if (!phoneNumber) return 0;
  const store = getStore();
  const initial = store.incidentDrafts.length;
  store.incidentDrafts = store.incidentDrafts.filter(
    (d) => !(d.phoneNumber && phoneMatches(d.phoneNumber, phoneNumber) && d.status === "pending")
  );
  const deleted = initial - store.incidentDrafts.length;
  if (deleted > 0) persistStore();
  return deleted;
}


// ==========================================
// Outbound WhatsApp Messages (Auditing & Testing)
// ==========================================
export function recordOutboundWhatsAppMessage(message) {
  const store = getStore();
  if (!Array.isArray(store.outboundMessages)) {
    store.outboundMessages = [];
  }
  store.outboundMessages.push(message);
  persistStore();
}

export function getOutboundWhatsAppMessages(toPhone = null) {
  try {
    if (fs.existsSync(STORE_PATH)) {
      const raw = fs.readFileSync(STORE_PATH, "utf-8");
      const diskStore = JSON.parse(raw);
      if (Array.isArray(diskStore.outboundMessages)) {
        const store = getStore();
        store.outboundMessages = diskStore.outboundMessages;
      }
    }
  } catch {}

  const store = getStore();
  const list = store.outboundMessages || [];
  if (toPhone) {
    const clean = String(toPhone).replace(/[^0-9]/g, "");
    return list.filter((m) => m.to && m.to.replace(/[^0-9]/g, "") === clean);
  }
  return list;
}

// ==========================================
// Mock Media Storage (Multi-process test & dev)
// ==========================================
export function registerMockMedia(mediaId, data) {
  try {
    if (fs.existsSync(STORE_PATH)) {
      const raw = fs.readFileSync(STORE_PATH, "utf-8");
      const diskStore = JSON.parse(raw);
      if (diskStore && typeof diskStore === "object") {
        inMemoryStore = diskStore;
      }
    }
  } catch {}
  const store = getStore();
  if (!store.mockMedia) store.mockMedia = {};
  store.mockMedia[mediaId] = {
    bufferBase64: data.buffer ? Buffer.from(data.buffer).toString("base64") : null,
    mimeType: data.mimeType || "audio/ogg",
    mockTranscript: data.mockTranscript || null,
  };
  persistStore();
}

export function getMockMedia(mediaId) {
  try {
    if (fs.existsSync(STORE_PATH)) {
      const raw = fs.readFileSync(STORE_PATH, "utf-8");
      const diskStore = JSON.parse(raw);
      if (diskStore.mockMedia) {
        const store = getStore();
        store.mockMedia = diskStore.mockMedia;
      }
    }
  } catch {}

  const store = getStore();
  const entry = store.mockMedia?.[mediaId];
  if (!entry) return null;
  return {
    buffer: entry.bufferBase64 ? Buffer.from(entry.bufferBase64, "base64") : Buffer.from("OggS"),
    mimeType: entry.mimeType,
    mockTranscript: entry.mockTranscript,
  };
}




// ==========================================
// WhatsApp Account Linking (Settings)
// ==========================================
export function getWhatsAppLinkByPhone(phoneNumber) {
  if (!phoneNumber) return null;
  const store = getStore();
  return store.whatsappLinks.find((l) => phoneMatches(l.phoneNumber, phoneNumber) && l.linkedAt) || null;
}

export function getWhatsAppLinkByUser(userId) {
  if (!userId) return null;
  const store = getStore();
  return store.whatsappLinks.find((l) => l.userId === userId && l.linkedAt) || null;
}

export function createWhatsAppLinkCode(userId, phoneNumber) {
  if (!userId || !phoneNumber) {
    throw new Error("UserId and phoneNumber required");
  }

  const cleanPhone = String(phoneNumber).replace(/[^0-9+]/g, "");
  const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digits
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

  const store = getStore();
  // Remove existing pending codes for this user or phone
  store.whatsappLinks = store.whatsappLinks.filter(
    (l) => !(l.userId === userId && !l.linkedAt) && !(phoneMatches(l.phoneNumber, cleanPhone) && !l.linkedAt)
  );

  const entry = {
    id: `wal_${crypto.randomUUID()}`,
    userId,
    phoneNumber: cleanPhone,
    code,
    expiresAt,
    linkedAt: null,
    createdAt: new Date().toISOString(),
  };

  store.whatsappLinks.push(entry);
  persistStore();
  return { code, expiresAt };
}

export function verifyWhatsAppLinkCode(phoneNumber, code) {
  if (!phoneNumber || !code) return null;
  const cleanCode = String(code).trim();
  const store = getStore();

  const entry = store.whatsappLinks.find(
    (l) =>
      phoneMatches(l.phoneNumber, phoneNumber) &&
      l.code === cleanCode &&
      !l.linkedAt &&
      new Date(l.expiresAt).getTime() > Date.now()
  );

  if (!entry) return null;

  entry.linkedAt = new Date().toISOString();
  persistStore();
  return entry;
}

export function unlinkWhatsAppUser(userId) {
  if (!userId) return false;
  const store = getStore();
  const initialLen = store.whatsappLinks.length;
  store.whatsappLinks = store.whatsappLinks.filter((l) => l.userId !== userId);
  if (store.whatsappLinks.length !== initialLen) {
    persistStore();
    return true;
  }
  return false;
}

// ==========================================
// WhatsApp Conversational Sessions
// ==========================================
function getSessionKey(phone) {
  const digits = String(phone).replace(/[^0-9]/g, "");
  return digits.length >= 10 ? digits.slice(-10) : digits;
}

export function getWhatsAppSession(phoneNumber) {
  if (!phoneNumber) return null;
  const key = getSessionKey(phoneNumber);
  try {
    if (fs.existsSync(STORE_PATH)) {
      const raw = fs.readFileSync(STORE_PATH, "utf-8");
      const diskStore = JSON.parse(raw);
      if (diskStore.whatsappSessions) {
        const store = getStore();
        store.whatsappSessions = diskStore.whatsappSessions;
      }
    }
  } catch {}

  const store = getStore();
  return store.whatsappSessions?.[key] || null;
}

export function setWhatsAppSession(phoneNumber, sessionData) {
  if (!phoneNumber) return;
  const key = getSessionKey(phoneNumber);
  const store = getStore();
  if (!store.whatsappSessions) store.whatsappSessions = {};
  store.whatsappSessions[key] = {
    ...sessionData,
    updatedAt: new Date().toISOString(),
  };
  persistStore();
}

export function clearWhatsAppSession(phoneNumber) {
  if (!phoneNumber) return;
  const key = getSessionKey(phoneNumber);
  const store = getStore();
  if (store.whatsappSessions && store.whatsappSessions[key]) {
    delete store.whatsappSessions[key];
    persistStore();
  }
}

export function getLatestPendingDraftByPhone(phoneNumber) {
  if (!phoneNumber) return null;
  try {
    if (fs.existsSync(STORE_PATH)) {
      const raw = fs.readFileSync(STORE_PATH, "utf-8");
      const diskStore = JSON.parse(raw);
      if (Array.isArray(diskStore.incidentDrafts)) {
        const store = getStore();
        store.incidentDrafts = diskStore.incidentDrafts;
      }
    }
  } catch {}

  const store = getStore();
  return (
    store.incidentDrafts.find(
      (d) =>
        d.phoneNumber &&
        phoneMatches(d.phoneNumber, phoneNumber) &&
        d.status === "pending"
    ) || null
  );
}



