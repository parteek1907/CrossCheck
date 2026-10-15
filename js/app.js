// TrustLens Main Application Controller
// Orchestrates deterministic scoring, clustering, ELA forensics, audit hashing, vault, and safe circle

import { calculateDeterministicScore } from "./scoring.js";
import { calculateConfidence } from "./confidence.js";
import { clusterEvidenceArticles } from "./clustering.js";
import { generateAuditRecord } from "./audit.js";
import { exportReportPdf } from "./exportPdf.js";
import { detectRepeatClaim } from "./similarity.js";
import { loadTrendingHoaxes, downloadShareCard } from "./trending.js";
import { performErrorLevelAnalysis, inspectImageExif } from "./forensics.js";
import { saveToVault, getVaultEntries, verifyVaultIntegrity, generateComplaintDraft, clearVault } from "./vault.js";
import {
  generateSafeCircleCode,
  verifySafeCircleSpokenCode,
  setSafeCircleSecret,
  getSafeCircleSecret,
  generateDailyFamilySafeWord,
  verifyFamilySafeWord,
  getSafeWordLanguage,
  setSafeWordLanguage,
  SAFE_WORD_LANGUAGES
} from "./safecircle.js";
import { getActionProtocol } from "./actionpath.js";

// Global State
const state = {
  activeTab: "tab-verify",
  knownClaims: [],
  sampleArticles: [],
  trendingHoaxes: [],
  sampleCases: [],
  wordlist: [],
  activeReport: null,
  uploadedImage: null,
  activeCaseIndex: -1,
  activeActionProtocol: "scam"
};

/**
 * Initializes the TrustLens Application
 */
async function initApp() {
  console.log("TrustLens initializing in-browser client...");

  setupNavigationTabs();
  setupDragAndDrop();
  setupDemoCases();
  setupActionButtons();
  setupComplaintModal();

  // Load all static sample data in parallel
  await loadAllData();

  // Initialize features
  renderTrendingHoaxes();
  renderVaultEntries();
  initSafeCircleTimer();
  renderActionProtocol(state.activeActionProtocol);

  // Automatically load Demo Case 1 for instant wow-factor on first load
  if (state.sampleCases.length > 0) {
    loadPresetCase(0);
  }
}

/**
 * Fetches all local static JSON datasets
 */
async function loadAllData() {
  try {
    const [claimsRes, articlesRes, trendingRes, casesRes, wordlistRes] = await Promise.all([
      fetch("data/known_claims.json").then(r => r.json()).catch(() => []),
      fetch("data/sample_articles.json").then(r => r.json()).catch(() => []),
      fetch("data/trending_hoaxes.json").then(r => r.json()).catch(() => []),
      fetch("data/sample_cases.json").then(r => r.json()).catch(() => []),
      fetch("data/wordlist.json").then(r => r.json()).catch(() => [])
    ]);

    state.knownClaims = claimsRes;
    state.sampleArticles = articlesRes;
    state.trendingHoaxes = trendingRes;
    state.sampleCases = casesRes;
    state.wordlist = wordlistRes;

    console.log("All sample datasets loaded successfully into memory.");
  } catch (err) {
    console.error("Error loading sample data:", err);
  }
}

/**
 * Tab Navigation and Keyboard Accessibility
 */
function setupNavigationTabs() {
  const tabs = document.querySelectorAll(".nav-btn");
  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      switchTab(tab.getAttribute("data-tab"));
    });

    // Keyboard navigation (Arrow keys)
    tab.addEventListener("keydown", e => {
      const tabList = Array.from(tabs);
      const currentIndex = tabList.indexOf(tab);
      let targetTab = null;

      if (e.key === "ArrowRight") {
        targetTab = tabList[(currentIndex + 1) % tabList.length];
      } else if (e.key === "ArrowLeft") {
        targetTab = tabList[(currentIndex - 1 + tabList.length) % tabList.length];
      } else if (e.key === "Home") {
        targetTab = tabList[0];
      } else if (e.key === "End") {
        targetTab = tabList[tabList.length - 1];
      }

      if (targetTab) {
        e.preventDefault();
        targetTab.focus();
        switchTab(targetTab.getAttribute("data-tab"));
      }
    });
  });

  document.getElementById("brand-home-link").addEventListener("click", e => {
    e.preventDefault();
    switchTab("tab-verify");
  });
}

function switchTab(tabId) {
  state.activeTab = tabId;

  document.querySelectorAll(".nav-btn").forEach(btn => {
    const matches = btn.getAttribute("data-tab") === tabId;
    btn.classList.toggle("active", matches);
    btn.setAttribute("aria-selected", matches ? "true" : "false");
  });

  document.querySelectorAll(".tab-pane").forEach(pane => {
    pane.classList.toggle("active", pane.id === tabId);
  });

  if (tabId === "tab-vault") {
    renderVaultEntries();
  }
}

/**
 * Drag and Drop & Image Upload Handling
 */
function setupDragAndDrop() {
  const dropzone = document.getElementById("dropzone");
  const fileInput = document.getElementById("file-input");
  const previewImg = document.getElementById("dropzone-preview");
  const promptEl = document.getElementById("dropzone-prompt");

  dropzone.addEventListener("click", () => fileInput.click());

  dropzone.addEventListener("keydown", e => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      fileInput.click();
    }
  });

  dropzone.addEventListener("dragover", e => {
    e.preventDefault();
    dropzone.classList.add("dragover");
  });

  dropzone.addEventListener("dragleave", () => {
    dropzone.classList.remove("dragover");
  });

  dropzone.addEventListener("drop", e => {
    e.preventDefault();
    dropzone.classList.remove("dragover");
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImageSelected(e.dataTransfer.files[0]);
    }
  });

  fileInput.addEventListener("change", e => {
    if (e.target.files && e.target.files[0]) {
      handleImageSelected(e.target.files[0]);
    }
  });

  function handleImageSelected(file) {
    state.uploadedImage = file;
    state.activeCaseIndex = -1;
    document.getElementById("active-case-label").textContent = `Uploaded file: ${file.name}`;

    const url = URL.createObjectURL(file);
    previewImg.src = url;
    previewImg.style.display = "block";
    promptEl.style.display = "none";
  }
}

/**
 * Demo Presets Setup
 */
function setupDemoCases() {
  document.getElementById("btn-demo-case-1").addEventListener("click", () => loadPresetCase(0));
  document.getElementById("btn-demo-case-2").addEventListener("click", () => loadPresetCase(1));
  document.getElementById("btn-demo-case-3").addEventListener("click", () => loadPresetCase(2));

  document.getElementById("btn-clear-input").addEventListener("click", () => {
    document.getElementById("claim-input").value = "";
    state.uploadedImage = null;
    state.activeCaseIndex = -1;
    document.getElementById("dropzone-preview").style.display = "none";
    document.getElementById("dropzone-prompt").style.display = "block";
    document.getElementById("results-container").style.display = "none";
    document.getElementById("repeat-claim-container").style.display = "none";
    document.getElementById("active-case-label").textContent = "Custom verification";
  });

  document.getElementById("btn-run-verify").addEventListener("click", runVerificationAudit);
}

/**
 * Loads one of the 3 preloaded cases
 */
async function loadPresetCase(index) {
  if (!state.sampleCases || !state.sampleCases[index]) return;
  const demoCase = state.sampleCases[index];
  state.activeCaseIndex = index;
  state.activeActionProtocol = demoCase.category;

  document.getElementById("claim-input").value = demoCase.claimText;
  document.getElementById("active-case-label").textContent = `Loaded Preset: ${demoCase.name}`;

  // Update dropzone preview
  const previewImg = document.getElementById("dropzone-preview");
  const promptEl = document.getElementById("dropzone-prompt");
  previewImg.src = demoCase.sampleImageUrl;
  previewImg.style.display = "block";
  promptEl.style.display = "none";

  state.uploadedImage = demoCase.sampleImageUrl;

  // Run the full verification audit immediately
  await runVerificationAudit();
}

/**
 * Core Verification Audit Pipeline
 */
async function runVerificationAudit() {
  const claimText = document.getElementById("claim-input").value.trim();
  if (!claimText && !state.uploadedImage) {
    alert("Please enter a claim text or select an image to analyze.");
    return;
  }

  const btn = document.getElementById("btn-run-verify");
  btn.disabled = true;
  btn.innerHTML = "<span>⏳</span> Analyzing Locally...";

  try {
    // 1. Repeat-Claim Similarity Check
    const repeatCheck = detectRepeatClaim(claimText, state.knownClaims, 0.45);
    const repeatBanner = document.getElementById("repeat-claim-container");
    if (repeatCheck.isRepeat) {
      repeatBanner.style.display = "block";
      repeatBanner.innerHTML = `
        <div class="repeat-claim-alert">
          <span class="alert-icon">⚠️</span>
          <div>
            <strong>Known Hoax Alert:</strong> ${repeatCheck.bannerMessage}
            <div style="font-size: 0.78rem; opacity: 0.85; margin-top: 0.2rem;">
              Original match: "${repeatCheck.bestMatch.claim}" (${repeatCheck.percentage}% trigram similarity)
            </div>
          </div>
        </div>
      `;
    } else {
      repeatBanner.style.display = "none";
    }

    // 2. Perform Real Image Forensics (ELA & EXIF)
    let forensicsResult = null;
    let exifResult = null;
    const imageToAnalyze = state.uploadedImage || "assets/demo_fake_news.jpg";

    try {
      [forensicsResult, exifResult] = await Promise.all([
        performErrorLevelAnalysis(imageToAnalyze, 0.75, 20),
        inspectImageExif(imageToAnalyze)
      ]);
    } catch (err) {
      console.warn("Forensics processing note:", err);
    }

    // Determine components (from active preset or dynamically evaluated)
    let components = {
      sourceReliability: 45,
      independentCoverage: 40,
      contradictionStrength: 50,
      imageAuthenticity: 50,
      claimSpecificity: 60
    };

    let clusterMetadata = {
      clusterCount: 3,
      hasDominantContradiction: false
    };

    if (state.activeCaseIndex >= 0 && state.sampleCases[state.activeCaseIndex]) {
      const activeCase = state.sampleCases[state.activeCaseIndex];
      components = { ...activeCase.components };
      clusterMetadata = { ...activeCase.metadata };
    }

    // If ELA ran, incorporate the real image authenticity signal
    if (forensicsResult) {
      const computedAuth = Math.max(10, Math.min(95, 100 - forensicsResult.anomalyScore));
      components.imageAuthenticity = computedAuth;
    }

    // 3. Evidence Clustering
    const clusteringResult = clusterEvidenceArticles(state.sampleArticles, 0.55);

    // 4. Deterministic Scoring
    const scoringResult = calculateDeterministicScore(components, clusterMetadata);

    // 5. Statistical Confidence Interval
    const confidence = calculateConfidence(scoringResult.finalScore, {
      sampleSize: clusteringResult.totalArticles || 10,
      independentClusters: clusterMetadata.clusterCount || 3,
      variance: 0.12
    });

    // 6. Cryptographic Audit Hash & Report ID
    const auditRecord = await generateAuditRecord({
      claimText: claimText || "Circulating visual media file",
      score: scoringResult.finalScore,
      verdict: scoringResult.verdict,
      confidence: confidence.level,
      breakdown: scoringResult.breakdown,
      clusteringSummary: clusteringResult.summaryCardText
    });

    // Save active report in state
    state.activeReport = {
      reportId: auditRecord.reportId,
      claimText: claimText || "Circulating visual media file",
      score: scoringResult.finalScore,
      verdict: scoringResult.verdict,
      confidence,
      scoringResult,
      clusteringResult,
      forensicsResult,
      exifResult,
      audit: auditRecord,
      category: state.activeCaseIndex >= 0 ? state.sampleCases[state.activeCaseIndex].category : "misinformation"
    };

    // Render results
    renderResults(state.activeReport, imageToAnalyze);

  } catch (error) {
    console.error("Verification failed:", error);
    alert("Verification failed: " + error.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = "<span>⚡</span> Run TrustLens Audit";
  }
}

/**
 * Renders the Verification Results (Readable in under 5 seconds)
 */
function renderResults(report, imageSrc) {
  const container = document.getElementById("results-container");
  container.style.display = "flex";

  // 1. Verdict Hero Card
  const verdictPill = document.getElementById("verdict-pill");
  const verdictSummary = document.getElementById("verdict-summary-text");
  const scoreVal = document.getElementById("final-score-val");
  const confRange = document.getElementById("confidence-range-val");
  const confBadge = document.getElementById("confidence-level-badge");
  const reportIdTag = document.getElementById("report-id-tag");
  const capsNotice = document.getElementById("caps-notice");

  reportIdTag.textContent = report.reportId;
  scoreVal.textContent = report.score;
  confRange.textContent = `Score ${report.confidence.formattedRange}`;
  confBadge.textContent = `${report.confidence.level} Confidence`;

  verdictPill.textContent = report.verdict.toUpperCase();
  verdictSummary.textContent = report.scoringResult.verdictSummary;

  verdictPill.className = "verdict-pill";
  if (report.verdict === "Likely manipulated") {
    verdictPill.classList.add("danger");
    scoreVal.style.color = "var(--verdict-danger)";
    confBadge.style.background = "rgba(220, 38, 38, 0.2)";
    confBadge.style.color = "#fca5a5";
  } else if (report.verdict === "Inconclusive") {
    verdictPill.classList.add("warning");
    scoreVal.style.color = "var(--verdict-warning)";
    confBadge.style.background = "rgba(245, 158, 11, 0.2)";
    confBadge.style.color = "#fcd34d";
  } else {
    verdictPill.classList.add("safe");
    scoreVal.style.color = "var(--verdict-safe)";
    confBadge.style.background = "rgba(16, 185, 129, 0.2)";
    confBadge.style.color = "#6ee7b7";
  }

  // Display applied caps if any
  if (report.scoringResult.capsApplied && report.scoringResult.capsApplied.length > 0) {
    capsNotice.style.display = "block";
    capsNotice.innerHTML = `
      <strong>Score Cap Applied:</strong> ${report.scoringResult.capsApplied[0].reason} 
      (Raw: ${report.scoringResult.rawScore} &rarr; Capped: ${report.score})
    `;
  } else {
    capsNotice.style.display = "none";
  }

  // 2. Component Breakdown Bars
  const breakdownList = document.getElementById("breakdown-list");
  breakdownList.innerHTML = "";

  const breakdownObj = report.scoringResult.breakdown;
  for (const key in breakdownObj) {
    const comp = breakdownObj[key];
    const percentage = comp.raw;

    const row = document.createElement("div");
    row.className = "breakdown-row";
    row.innerHTML = `
      <div class="breakdown-meta">
        <span class="breakdown-label">${comp.label} <span style="font-size: 0.72rem; color: var(--text-dim);">(Weight ${(comp.weight * 100).toFixed(0)}%)</span></span>
        <span class="breakdown-pts">${comp.points} pts <span style="font-size: 0.75rem; color: var(--text-dim);">(${comp.raw}/100)</span></span>
      </div>
      <div class="progress-track">
        <div class="progress-fill" style="width: ${percentage}%; background: ${percentage < 40 ? 'var(--verdict-danger)' : percentage < 70 ? 'var(--verdict-warning)' : 'var(--verdict-safe)'};"></div>
      </div>
    `;
    breakdownList.appendChild(row);
  }

  // 3. Image Forensics (ELA & EXIF)
  const origImg = document.getElementById("forensics-original-img");
  const elaImg = document.getElementById("forensics-ela-img");
  const elaAnomaly = document.getElementById("ela-anomaly-score");
  const elaSuspicion = document.getElementById("ela-suspicion-level");

  if (typeof imageSrc === "string") {
    origImg.src = imageSrc;
  } else if (imageSrc instanceof File || imageSrc instanceof Blob) {
    origImg.src = URL.createObjectURL(imageSrc);
  }

  if (report.forensicsResult) {
    elaImg.src = report.forensicsResult.dataUrl;
    elaAnomaly.textContent = `${report.forensicsResult.anomalyScore}/100`;
    elaSuspicion.textContent = report.forensicsResult.suspicionLevel;
    elaSuspicion.style.color = report.forensicsResult.suspicionColor;
  }

  const exifCamera = document.getElementById("exif-camera");
  const exifSoftware = document.getElementById("exif-software");
  const exifFlags = document.getElementById("exif-flags-container");

  if (report.exifResult) {
    exifCamera.textContent = report.exifResult.camera;
    exifSoftware.textContent = report.exifResult.software;
    exifFlags.innerHTML = "";

    report.exifResult.suspiciousFlags.forEach(flag => {
      const p = document.createElement("div");
      p.className = "exif-flag-alert";
      p.innerHTML = `<span>⚠️</span> <span>${flag}</span>`;
      exifFlags.appendChild(p);
    });
  }

  // 4. Evidence Clustering
  const clusterHeadline = document.getElementById("cluster-summary-title");
  const clusterItemsList = document.getElementById("cluster-items-list");
  const clustBadge = document.getElementById("clustering-ratio-badge");

  clusterHeadline.textContent = report.clusteringResult.summaryCardText;
  clustBadge.textContent = `Syndication: ${report.clusteringResult.syndicationRatio}`;

  clusterItemsList.innerHTML = "";
  report.clusteringResult.clusters.slice(0, 4).forEach((cluster, idx) => {
    const item = document.createElement("div");
    item.className = "cluster-item";
    item.innerHTML = `
      <div class="cluster-item-header">
        <span style="font-weight: 700; color: var(--accent-cyan);">Cluster #${idx + 1} (${cluster.articleCount} articles)</span>
        <span class="cluster-badge-small ${cluster.isEchoChamber ? '' : 'safe'}">${cluster.badge}</span>
      </div>
      <div class="cluster-headline-text">"${cluster.primaryHeadline}"</div>
      <div class="cluster-domain-row">
        ${cluster.domains.map(d => `<span class="domain-pill">${d}</span>`).join("")}
      </div>
    `;
    clusterItemsList.appendChild(item);
  });

  // Scroll smoothly to results
  container.scrollIntoView({ behavior: "smooth", block: "start" });
}

/**
 * Result Action Buttons Setup (PDF, PNG Share, Vault, Action Path)
 */
function setupActionButtons() {
  document.getElementById("btn-export-pdf").addEventListener("click", () => {
    if (!state.activeReport) return;
    exportReportPdf(state.activeReport);
  });

  document.getElementById("btn-download-share-card").addEventListener("click", async () => {
    if (!state.activeReport) return;
    const btn = document.getElementById("btn-download-share-card");
    const originalText = btn.innerHTML;
    btn.innerHTML = "<span>⏳</span> Rendering PNG...";
    try {
      await downloadShareCard(state.activeReport);
    } catch (err) {
      console.error("Canvas export failed:", err);
      alert("Failed to render context card: " + err.message);
    } finally {
      btn.innerHTML = originalText;
    }
  });

  document.getElementById("btn-save-vault").addEventListener("click", async () => {
    if (!state.activeReport) return;
    const notes = prompt("Enter optional notes or case tag for this evidence entry:", "Preserved during triage investigation");
    if (notes === null) return; // User canceled

    const entry = await saveToVault(state.activeReport, notes, state.activeReport.category || "misinformation");
    updateVaultBadge();
    alert(`Report cryptographically locked to Evidence Vault!\nRecord ID: ${entry.reportId}\nLedger Block: #${entry.index + 1}\nSHA-256 Digest: ${entry.entryHash.substring(0, 16)}...`);
  });

  document.getElementById("btn-view-actionpath").addEventListener("click", () => {
    if (state.activeReport) {
      state.activeActionProtocol = state.activeReport.category || "misinformation";
      renderActionProtocol(state.activeActionProtocol);
    }
    switchTab("tab-actionpath");
  });
}

/**
 * Trending Hoaxes View
 */
function renderTrendingHoaxes() {
  const grid = document.getElementById("trending-grid");
  grid.innerHTML = "";

  state.trendingHoaxes.forEach(item => {
    const card = document.createElement("article");
    card.className = "hoax-card";
    card.innerHTML = `
      <div class="hoax-meta-top">
        <span class="spread-score-badge">Spread Score: ${item.spreadScore}/100</span>
        <span class="hoax-type-pill">${item.type}</span>
      </div>
      <h3 class="hoax-title">${item.title}</h3>
      <p class="hoax-summary">${item.summary}</p>
      <div class="hoax-footer">
        <span>📍 ${item.platform} • ${item.reach}</span>
        <button type="button" class="inspect-hoax-btn" data-title="${encodeURIComponent(item.title)}">
          Verify Claim &rarr;
        </button>
      </div>
    `;

    card.querySelector(".inspect-hoax-btn").addEventListener("click", () => {
      document.getElementById("claim-input").value = item.title;
      switchTab("tab-verify");
      runVerificationAudit();
    });

    grid.appendChild(card);
  });
}

/**
 * Evidence Vault View (Cryptographic Ledger)
 */
function renderVaultEntries() {
  const list = document.getElementById("vault-chain-list");
  const entries = getVaultEntries();
  updateVaultBadge();

  if (entries.length === 0) {
    list.innerHTML = `
      <div style="text-align: center; padding: 3rem 1rem; color: var(--text-dim); background: var(--bg-card); border-radius: var(--radius-lg); border: 1px dashed var(--border-medium);">
        <div style="font-size: 2.2rem; margin-bottom: 0.5rem;">🗄️</div>
        <h3 style="color: var(--text-main); font-size: 1.1rem; margin-bottom: 0.3rem;">Evidence Vault is Empty</h3>
        <p style="font-size: 0.85rem;">Run an audit and click "Save to Evidence Vault" to lock a tamper-evident forensic record into the cryptographic hash chain.</p>
      </div>
    `;
    return;
  }

  list.innerHTML = "";

  entries.forEach((entry, idx) => {
    const block = document.createElement("div");
    block.className = "vault-chain-block";

    const isFirst = idx === 0;
    const connector = !isFirst ? '<div class="chain-connector-line"></div>' : '';

    block.innerHTML = `
      ${connector}
      <div class="block-header">
        <div style="display: flex; align-items: center; gap: 0.6rem;">
          <span class="block-num-badge">Block #${idx + 1}</span>
          <span style="font-family: var(--font-mono); font-weight: 700; color: var(--accent-cyan); font-size: 0.95rem;">${entry.reportId}</span>
        </div>
        <div style="display: flex; gap: 0.4rem; align-items: center;">
          <span style="font-size: 0.78rem; color: var(--text-dim);">${new Date(entry.timestamp).toLocaleString()}</span>
          <span class="verdict-pill ${entry.verdict === 'Likely manipulated' ? 'danger' : entry.verdict === 'Inconclusive' ? 'warning' : 'safe'}" style="font-size: 0.75rem; padding: 0.15rem 0.6rem;">
            ${entry.verdict} (${entry.score}/100)
          </span>
        </div>
      </div>

      <div class="chain-link-hash">
        <strong style="color: var(--accent-cyan);">Prev Hash:</strong> ${entry.previousHash}<br>
        <strong style="color: var(--text-main);">Block Hash:</strong> ${entry.entryHash}
      </div>

      <p style="font-size: 0.92rem; font-weight: 600; color: #f1f5f9; margin-bottom: 0.4rem;">
        "${entry.claimText}"
      </p>

      <p style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 0.75rem;">
        <strong>Investigator Note:</strong> ${entry.notes || 'No notes provided'}
      </p>

      <div style="display: flex; gap: 0.6rem; justify-content: flex-end;">
        <button type="button" class="reset-btn btn-draft-complaint" style="padding: 0.35rem 0.85rem; font-size: 0.8rem;" data-index="${idx}">
          📄 Draft Complaint
        </button>
      </div>
    `;

    block.querySelector(".btn-draft-complaint").addEventListener("click", () => {
      openComplaintModal(entry);
    });

    list.appendChild(block);
  });

  // Verify Vault Button
  document.getElementById("btn-verify-vault").onclick = async () => {
    const indicator = document.getElementById("vault-status-indicator");
    const statusText = document.getElementById("vault-status-text");

    const result = await verifyVaultIntegrity();
    if (result.isValid) {
      indicator.className = "vault-status-indicator";
      statusText.textContent = `Ledger Verified (${result.totalEntries} Blocks Intact)`;
      alert("✅ Cryptographic Verification Successful:\n" + result.message);
    } else {
      indicator.className = "vault-status-indicator tampered";
      statusText.textContent = "Tampering Detected!";
      alert("❌ Ledger Integrity Alert:\n" + result.errorReason);
    }
  };

  // Clear Vault Button
  document.getElementById("btn-clear-vault").onclick = () => {
    if (confirm("Reset the Evidence Vault? All local cryptographic records will be cleared.")) {
      clearVault();
      renderVaultEntries();
    }
  };
}

function updateVaultBadge() {
  const count = getVaultEntries().length;
  document.getElementById("vault-badge-count").textContent = count;
}

/**
 * Complaint Draft Modal
 */
function setupComplaintModal() {
  const modal = document.getElementById("complaint-modal");
  const closeBtn = document.getElementById("btn-close-modal");
  const copyBtn = document.getElementById("btn-copy-complaint");
  const portalBtn = document.getElementById("btn-open-portal");

  closeBtn.addEventListener("click", () => modal.classList.remove("active"));
  modal.addEventListener("click", e => {
    if (e.target === modal) modal.classList.remove("active");
  });

  copyBtn.addEventListener("click", () => {
    const text = document.getElementById("complaint-text-pre").textContent;
    navigator.clipboard.writeText(text).then(() => {
      copyBtn.textContent = "Copied to Clipboard!";
      setTimeout(() => { copyBtn.textContent = "Copy to Clipboard"; }, 2000);
    });
  });

  portalBtn.addEventListener("click", () => {
    window.open("https://cybercrime.gov.in", "_blank");
  });
}

function openComplaintModal(vaultEntry) {
  const draftText = generateComplaintDraft(vaultEntry);
  document.getElementById("complaint-text-pre").textContent = draftText;
  document.getElementById("complaint-modal").classList.add("active");
}

/**
 * The Family Safe-Word Engine (Assume the fake is perfect)
 * Daily rotating TOTP, localized wordlists, silent duress protocol, and emergency verifier
 */
function initSafeCircleTimer() {
  const codeDisplay = document.getElementById("safecircle-active-code");
  const timeRemainingDisplay = document.getElementById("safecircle-time-remaining");
  const yesterdayDisplay = document.getElementById("safeword-yesterday-display");
  const duressDisplay = document.getElementById("safeword-duress-display");
  const langSelect = document.getElementById("safeword-lang-select");
  const secretInput = document.getElementById("safecircle-secret-input");
  const btnToggleDuress = document.getElementById("btn-toggle-duress");
  const verifyInput = document.getElementById("safecircle-input");
  const resultBox = document.getElementById("safecircle-verify-result");

  let currentSafeData = null;
  let isDuressRevealed = false;

  if (secretInput) {
    secretInput.value = getSafeCircleSecret();
  }

  if (langSelect) {
    langSelect.value = getSafeWordLanguage();
    langSelect.addEventListener("change", (e) => {
      setSafeWordLanguage(e.target.value);
      updateDailySafeWord();
    });
  }

  const btnSaveSecret = document.getElementById("btn-save-secret");
  if (btnSaveSecret && secretInput) {
    btnSaveSecret.addEventListener("click", () => {
      const val = secretInput.value.trim();
      if (setSafeCircleSecret(val)) {
        alert("Family Safe-Word secret seed updated successfully!");
        updateDailySafeWord();
      } else {
        alert("Secret seed must be at least 4 characters long.");
      }
    });
  }

  async function updateDailySafeWord() {
    try {
      const lang = getSafeWordLanguage();
      currentSafeData = await generateDailyFamilySafeWord({ language: lang });

      if (codeDisplay) codeDisplay.textContent = currentSafeData.code;
      if (timeRemainingDisplay) {
        timeRemainingDisplay.textContent = `Rotates in ${currentSafeData.timeRemainingFormatted}`;
      }
      if (yesterdayDisplay) {
        yesterdayDisplay.textContent = currentSafeData.yesterdayCode;
      }
      if (duressDisplay) {
        duressDisplay.textContent = isDuressRevealed ? currentSafeData.duressCode : "••••••••••••";
      }
    } catch (err) {
      console.warn("Daily Safe-Word generation error:", err);
    }
  }

  if (btnToggleDuress) {
    btnToggleDuress.addEventListener("click", () => {
      isDuressRevealed = !isDuressRevealed;
      btnToggleDuress.textContent = isDuressRevealed ? "Hide" : "Reveal";
      if (duressDisplay && currentSafeData) {
        duressDisplay.textContent = isDuressRevealed ? currentSafeData.duressCode : "••••••••••••";
      }
    });
  }

  const btnPronounce = document.getElementById("btn-pronounce-safeword");
  if (btnPronounce) {
    btnPronounce.addEventListener("click", () => {
      if (!currentSafeData?.code || typeof window === "undefined" || !("speechSynthesis" in window)) return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(currentSafeData.code);
      const lang = getSafeWordLanguage();
      const voiceMap = {
        hi: "hi-IN",
        ta: "ta-IN",
        bn: "bn-IN",
        te: "te-IN",
        mr: "mr-IN",
        hinglish: "hi-IN",
        en: "en-US",
      };
      utterance.lang = voiceMap[lang] || "en-US";
      utterance.rate = 0.85;
      window.speechSynthesis.speak(utterance);
    });
  }

  const btnCopyWord = document.getElementById("btn-copy-safeword");
  if (btnCopyWord) {
    btnCopyWord.addEventListener("click", () => {
      if (!currentSafeData?.code) return;
      navigator.clipboard?.writeText(currentSafeData.code);
      const originalText = btnCopyWord.textContent;
      btnCopyWord.textContent = "✓ Copied!";
      setTimeout(() => { btnCopyWord.textContent = originalText; }, 2000);
    });
  }

  const btnPresetToday = document.getElementById("btn-preset-today");
  if (btnPresetToday && verifyInput) {
    btnPresetToday.addEventListener("click", () => {
      if (currentSafeData) {
        verifyInput.value = currentSafeData.code;
        executeVerify();
      }
    });
  }

  const btnPresetDuress = document.getElementById("btn-preset-duress");
  if (btnPresetDuress && verifyInput) {
    btnPresetDuress.addEventListener("click", () => {
      if (currentSafeData) {
        verifyInput.value = currentSafeData.duressCode;
        executeVerify();
      }
    });
  }

  const btnPresetImposter = document.getElementById("btn-preset-imposter");
  if (btnPresetImposter && verifyInput) {
    btnPresetImposter.addEventListener("click", () => {
      verifyInput.value = "Send 50000 immediately emergency";
      executeVerify();
    });
  }

  const btnShareWhatsApp = document.getElementById("btn-share-whatsapp");
  if (btnShareWhatsApp) {
    btnShareWhatsApp.addEventListener("click", () => {
      if (!currentSafeData) return;
      const text = encodeURIComponent(
        `🔐 *Crosscheck Family Safe-Word Protocol*\n\n` +
        `Today's Safe-Word: *${currentSafeData.code}*\n` +
        `Language: ${currentSafeData.language.label}\n\n` +
        `⚠️ *Family Rule:* If anyone calls claiming an emergency or asking for urgent money, ask them for today's safe-word first. Never send money without it!`
      );
      window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank");
    });
  }

  async function executeVerify() {
    if (!verifyInput || !resultBox) return;
    const input = verifyInput.value.trim();
    resultBox.style.display = "block";

    if (!input) {
      resultBox.innerHTML = `<span style="color: #fca5a5;">Please enter the words spoken by the caller.</span>`;
      return;
    }

    const verification = await verifyFamilySafeWord(input, { language: getSafeWordLanguage() });

    if (verification.status === "DURESS_ALERT") {
      resultBox.innerHTML = `
        <div style="background: rgba(220, 38, 38, 0.2); border: 1px solid #f87171; border-radius: var(--radius-md); padding: 1rem; color: #fecaca; font-size: 0.88rem; line-height: 1.5;">
          <strong style="color: #fff; font-size: 0.95rem;">${verification.title}</strong><br>
          ${verification.message}<br><br>
          <div style="font-weight: 700; color: #fff;">
            1. Keep calm and do NOT confront the caller.<br>
            2. Do NOT transfer any money or OTP.<br>
            3. Immediately call Indian Cybercrime Helpline <strong>1930</strong> or local police.
          </div>
        </div>
      `;
    } else if (verification.status === "AUTHENTIC_TODAY") {
      resultBox.innerHTML = `
        <div style="background: rgba(16, 185, 129, 0.18); border: 1px solid #34d399; border-radius: var(--radius-md); padding: 1rem; color: #a7f3d0; font-size: 0.88rem; line-height: 1.5;">
          <strong style="color: #fff; font-size: 0.95rem;">${verification.title}</strong><br>
          ${verification.message}
        </div>
      `;
    } else if (verification.status === "GRACE_PERIOD") {
      resultBox.innerHTML = `
        <div style="background: rgba(245, 158, 11, 0.18); border: 1px solid #fbbf24; border-radius: var(--radius-md); padding: 1rem; color: #fef3c7; font-size: 0.88rem; line-height: 1.5;">
          <strong style="color: #fff; font-size: 0.95rem;">${verification.title}</strong><br>
          ${verification.message}
        </div>
      `;
    } else {
      resultBox.innerHTML = `
        <div style="background: rgba(220, 38, 38, 0.18); border: 1px solid #ef4444; border-radius: var(--radius-md); padding: 1rem; color: #fecaca; font-size: 0.88rem; line-height: 1.5;">
          <strong style="color: #fff; font-size: 0.95rem;">${verification.title}</strong><br>
          ${verification.message}
        </div>
      `;
    }
  }

  const btnVerify = document.getElementById("btn-safecircle-verify");
  if (btnVerify) {
    btnVerify.addEventListener("click", executeVerify);
  }

  updateDailySafeWord();
  setInterval(updateDailySafeWord, 60000);
}

/**
 * Action Path Protocols
 */
function renderActionProtocol(protocolKey) {
  state.activeActionProtocol = protocolKey;
  const protocol = getActionProtocol(protocolKey);

  document.getElementById("actionpath-title").textContent = `🚨 ${protocol.title}`;
  const urgencyBadge = document.getElementById("actionpath-urgency");
  urgencyBadge.textContent = protocol.urgency;
  urgencyBadge.style.color = protocol.badgeColor === "#dc2626" ? "#fca5a5" : protocol.badgeColor === "#ea580c" ? "#fdba74" : "#93c5fd";

  document.getElementById("btn-proto-scam").classList.toggle("active", protocolKey === "scam");
  document.getElementById("btn-proto-morphed").classList.toggle("active", protocolKey === "morphed_image");
  document.getElementById("btn-proto-misinfo").classList.toggle("active", protocolKey === "misinformation");

  const container = document.getElementById("action-steps-container");
  container.innerHTML = "";

  protocol.steps.forEach((step, idx) => {
    const card = document.createElement("div");
    card.className = "action-step-card";
    card.innerHTML = `
      <input type="checkbox" id="step-${step.id}" class="step-checkbox" aria-label="Mark step completed">
      <div class="step-content">
        <h4>Step ${idx + 1}: ${step.title}</h4>
        <p>${step.desc}</p>
        ${step.primaryAction ? `
          <a href="${step.primaryAction.link}" target="_blank" rel="noopener noreferrer" class="action-btn" style="display: inline-flex; margin-top: 0.5rem; padding: 0.35rem 0.8rem; font-size: 0.78rem; text-decoration: none;">
            ${step.primaryAction.label} &rarr;
          </a>
        ` : ''}
      </div>
    `;

    const checkbox = card.querySelector(".step-checkbox");
    const savedState = localStorage.getItem(`trustlens_step_${step.id}`);
    if (savedState === "true") checkbox.checked = true;

    checkbox.addEventListener("change", () => {
      localStorage.setItem(`trustlens_step_${step.id}`, checkbox.checked ? "true" : "false");
    });

    container.appendChild(card);
  });
}

// Action protocol tab buttons
document.getElementById("btn-proto-scam").addEventListener("click", () => renderActionProtocol("scam"));
document.getElementById("btn-proto-morphed").addEventListener("click", () => renderActionProtocol("morphed_image"));
document.getElementById("btn-proto-misinfo").addEventListener("click", () => renderActionProtocol("misinformation"));

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  initApp();
}
