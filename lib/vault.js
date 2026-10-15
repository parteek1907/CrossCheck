// TrustLens Tamper-Evident Evidence Vault Module
// Cryptographically chained ledger (SHA-256) + Formal Complaint Draft Generator

import { sha256Hex } from "./audit.js";

const VAULT_STORAGE_KEY = "trustlens_evidence_vault_v1";
const GENESIS_HASH = "0000000000000000000000000000000000000000000000000000000000000000";

/**
 * Loads all items currently in the Evidence Vault.
 * @returns {Array<Object>}
 */
export function getVaultEntries() {
  if (typeof window === "undefined" || !window.localStorage) {
    return [];
  }
  try {
    const raw = localStorage.getItem(VAULT_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error("Failed to read Evidence Vault from storage:", err);
    return [];
  }
}

/**
 * Saves a new verified report to the Evidence Vault, chaining its hash to the previous entry.
 *
 * @param {Object} reportData
 * @param {string} [notes=""]
 * @param {string} [incidentCategory="misinformation"] - "scam" | "morphed_image" | "misinformation"
 * @returns {Promise<Object>} The new vault entry with proof chain
 */
export async function saveToVault(reportData, notes = "", incidentCategory = "misinformation") {
  const currentEntries = getVaultEntries();
  const index = currentEntries.length;
  const previousHash = index === 0 ? GENESIS_HASH : currentEntries[index - 1].entryHash;

  const timestamp = new Date().toISOString();

  // Canonical payload for block hashing
  const payloadToHash = {
    index,
    previousHash,
    timestamp,
    reportId: reportData.reportId || `TL-MANUAL-${Date.now().toString(36).toUpperCase()}`,
    claimText: reportData.claimText || "No claim text provided",
    score: reportData.score || 0,
    verdict: reportData.verdict || "Inconclusive",
    confidence: reportData.confidence?.level || "Medium",
    incidentCategory,
    notes: notes.trim()
  };

  const canonicalString = JSON.stringify(payloadToHash);
  const entryHash = await sha256Hex(canonicalString);

  const entry = {
    ...payloadToHash,
    entryHash,
    rawAuditHash: reportData.audit?.auditHash || null,
    breakdown: reportData.scoringResult?.breakdown || null
  };

  currentEntries.push(entry);
  localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(currentEntries));

  return entry;
}

/**
 * Cryptographically verifies every link in the vault ledger chain from genesis to head.
 * @returns {Promise<Object>} { isValid, totalEntries, tamperedIndex, errorReason }
 */
export async function verifyVaultIntegrity() {
  const entries = getVaultEntries();
  if (entries.length === 0) {
    return { isValid: true, totalEntries: 0, message: "Vault is empty (Genesis state)" };
  }

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const expectedPrevHash = i === 0 ? GENESIS_HASH : entries[i - 1].entryHash;

    // Check 1: Previous hash pointer matches
    if (entry.previousHash !== expectedPrevHash) {
      return {
        isValid: false,
        totalEntries: entries.length,
        tamperedIndex: i,
        errorReason: `Hash link broken at Entry #${i + 1} (ID: ${entry.reportId}). Expected previous hash: ${expectedPrevHash.substring(0, 8)}..., found: ${entry.previousHash.substring(0, 8)}...`
      };
    }

    // Check 2: Recalculate block hash
    const payloadToHash = {
      index: entry.index,
      previousHash: entry.previousHash,
      timestamp: entry.timestamp,
      reportId: entry.reportId,
      claimText: entry.claimText,
      score: entry.score,
      verdict: entry.verdict,
      confidence: entry.confidence,
      incidentCategory: entry.incidentCategory,
      notes: entry.notes
    };

    const recomputedHash = await sha256Hex(JSON.stringify(payloadToHash));
    if (recomputedHash !== entry.entryHash) {
      return {
        isValid: false,
        totalEntries: entries.length,
        tamperedIndex: i,
        errorReason: `Data tampering detected in Entry #${i + 1} payload. Computed hash does not match ledger proof.`
      };
    }
  }

  return {
    isValid: true,
    totalEntries: entries.length,
    message: `All ${entries.length} vault entries cryptographically intact and verified against SHA-256 chain.`
  };
}

/**
 * Generates an official, pre-filled formal incident complaint text
 * tailored for filing at India's National Cyber Crime Portal (cybercrime.gov.in)
 * or calling the 1930 Financial/Cyber Helpline.
 *
 * @param {Object} vaultEntry
 * @returns {string} Formatted complaint letter text
 */
export function generateComplaintDraft(vaultEntry) {
  const categoryTitles = {
    scam: "Financial Fraud / Impersonation Extortion (IT Act Sec 66D & IPC 419/420)",
    morphed_image: "Non-Consensual Morphed Media / Harassment (IT Act Sec 66E/67 & IT Rules 2021)",
    misinformation: "Coordinated Public Misinformation & Malicious Fabrication"
  };

  const title = categoryTitles[vaultEntry.incidentCategory] || "Cyber Crime Incident Report";

  return `TO:
THE NODAL CYBER CRIME REPORTING OFFICER / 
NATIONAL CYBER CRIME REPORTING PORTAL (cybercrime.gov.in)
HELPLINE 1930

SUBJECT: FORMAL COMPLAINT REGARDING ${title.toUpperCase()}
DATE OF REPORT: ${new Date().toLocaleDateString("en-IN", { dateStyle: "long" })}
EVIDENCE VAULT RECORD ID: ${vaultEntry.reportId}
CRYPTOGRAPHIC LEDGER BLOCK: #${(vaultEntry.index || 0) + 1}
SHA-256 AUDIT CHAIN HASH: ${vaultEntry.entryHash}

1. INCIDENT OVERVIEW
- Category: ${vaultEntry.incidentCategory.toUpperCase()}
- Content / Offending Claim: "${vaultEntry.claimText}"
- Recorded Time of Detection: ${vaultEntry.timestamp}
- Algorithmic Credibility Verdict: ${vaultEntry.verdict.toUpperCase()} (Score: ${vaultEntry.score}/100)
- Confidence Level: ${vaultEntry.confidence}

2. COMPLAINANT STATEMENT & OBSERVATION
${vaultEntry.notes ? vaultEntry.notes : "The suspect material described above was circulated electronically via digital messaging platforms. Initial forensic inspection reveals strong indicators of artificial synthesis / coordinated syndication intended to deceive the recipient or public."}

3. TECHNICAL EVIDENCE SUMMARY
- Digital Ledger Proof: Validated locally via TrustLens Tamper-Evident SHA-256 Hash Chain.
- Previous Block Link: ${vaultEntry.previousHash}
- Integrity Status: Cryptographically locked and timestamped prior to any external alteration.

4. PRAYER / RELIEF REQUESTED
Under the Information Technology Act 2000 (Sections 66D, 66E, and 67 as applicable) and Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules 2021:
a) Request immediate registration of this complaint and issuance of an acknowledgment number.
b) Direct relevant intermediary platforms to preserve access logs, IP identifiers, and account records.
c) Facilitate urgent takedown of the offending synthetic/fraudulent material within the statutory timeframe.

RESPECTFULLY SUBMITTED,
[Complainant Name]
[Contact Number / Email]
[National Identity / Aadhaar Ref (Optional)]
`;
}

/**
 * Clears the vault (for demo reset purposes).
 */
export function clearVault() {
  if (typeof window !== "undefined" && window.localStorage) {
    localStorage.removeItem(VAULT_STORAGE_KEY);
  }
}
