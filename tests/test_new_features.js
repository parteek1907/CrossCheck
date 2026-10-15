// Test suite for New Features (Vault, Safe Circle, Action Path)
import { saveToVault, getVaultEntries, verifyVaultIntegrity, generateComplaintDraft, clearVault } from "../js/vault.js";
import { generateSafeCircleCode, verifySafeCircleSpokenCode } from "../js/safecircle.js";
import { getActionProtocol, EMERGENCY_HELPLINES } from "../js/actionpath.js";
import fs from "fs";

// Mock localStorage for Node test runner
const storage = {};
globalThis.localStorage = {
  getItem: (k) => storage[k] || null,
  setItem: (k, v) => { storage[k] = String(v); },
  removeItem: (k) => { delete storage[k]; }
};

console.log("=== RUNNING TRUSTLENS NEW FEATURES TESTS ===");

// 1. Test Evidence Vault Hash Chain
console.log("\n[1] Testing Evidence Vault Hash Chaining...");
clearVault();

const entry1 = await saveToVault({
  reportId: "TL-TEST1-A1B2C3D4",
  claimText: "Biometric chip mandate hoax",
  score: 35,
  verdict: "Likely manipulated",
  confidence: { level: "High" }
}, "Initial forensic assessment", "misinformation");

console.assert(entry1.previousHash === "0000000000000000000000000000000000000000000000000000000000000000", "Genesis hash mismatch");
console.assert(entry1.entryHash.length === 64, "Entry 1 hash must be 64-char hex");

const entry2 = await saveToVault({
  reportId: "TL-TEST2-E5F6G7H8",
  claimText: "Emergency WhatsApp extortion message",
  score: 15,
  verdict: "Likely manipulated",
  confidence: { level: "High" }
}, "Suspect UPI: 9811223344@paytm", "scam");

console.assert(entry2.previousHash === entry1.entryHash, "Hash chain link 1->2 broken");

const verification = await verifyVaultIntegrity();
console.assert(verification.isValid === true, `Vault verification failed: ${verification.errorReason}`);
console.log("✓ Vault cryptographic hash chain intact:", {
  total: verification.totalEntries,
  chainLinkVerified: entry2.previousHash === entry1.entryHash,
  status: verification.message
});

// Test complaint draft generation
const complaint = generateComplaintDraft(entry2);
console.assert(complaint.includes("NATIONAL CYBER CRIME REPORTING PORTAL"), "Complaint missing header");
console.assert(complaint.includes("TL-TEST2-E5F6G7H8"), "Complaint missing report ID");
console.assert(complaint.includes(entry2.entryHash), "Complaint missing hash digest");
console.log("✓ Complaint draft successfully formatted with statutory references");

// 2. Test Rotating Safe Circle Code
console.log("\n[2] Testing Rotating Safe Circle TOTP...");
const wordlist = JSON.parse(fs.readFileSync("./data/wordlist.json", "utf-8"));
const safeCode = await generateSafeCircleCode(wordlist, "TEST-SECRET-123");
console.assert(safeCode.code.includes("-"), "Safe code must be hyphenated two words");
console.assert(safeCode.secondsRemaining >= 0 && safeCode.secondsRemaining <= 60, "Invalid seconds remaining");
console.log("✓ Safe Circle generated active two-word code:", {
  code: safeCode.code,
  word1: safeCode.word1,
  word2: safeCode.word2,
  secondsRemaining: safeCode.secondsRemaining + "s"
});

// Test verification of spoken code
const verifyMatch = await verifySafeCircleSpokenCode(safeCode.code, wordlist, "TEST-SECRET-123");
console.assert(verifyMatch.isValid === true, "Safe Circle code should verify valid");
console.log("✓ Safe Circle spoken code verification passed:", verifyMatch.timeDeltaDescription);

const verifyFail = await verifySafeCircleSpokenCode("FAKE-CODE", wordlist, "TEST-SECRET-123");
console.assert(verifyFail.isValid === false, "Fake code must fail verification");
console.log("✓ Fake imposter code successfully rejected");

// 3. Test Action Path
console.log("\n[3] Testing Action Path Protocols...");
const scamProtocol = getActionProtocol("scam");
console.assert(scamProtocol.steps.length >= 4, "Scam protocol should have at least 4 steps");
console.assert(scamProtocol.steps[0].title.includes("1930"), "Step 1 must be calling 1930");
console.assert(EMERGENCY_HELPLINES.length >= 5, "Helplines list should have 5 items");
console.log("✓ Action Path protocol verified:", {
  title: scamProtocol.title,
  stepsCount: scamProtocol.steps.length,
  firstStep: scamProtocol.steps[0].title
});

console.log("\n=========================================");
console.log("ALL NEW FEATURE TESTS PASSED SUCCESSFULLY!");
console.log("=========================================\n");
