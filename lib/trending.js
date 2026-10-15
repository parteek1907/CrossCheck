// Adapted from Veralon trending & share pages

/**
 * Adapted from Veralon trending & share pages
 * Fetches static circulating hoaxes data from local JSON.
 *
 * @param {string} [jsonPath="data/trending_hoaxes.json"]
 * @returns {Promise<Array<Object>>}
 */
export async function loadTrendingHoaxes(jsonPath = "data/trending_hoaxes.json") {
  try {
    const response = await fetch(jsonPath);
    if (!response.ok) throw new Error(`HTTP error ${response.status}`);
    return await response.json();
  } catch (err) {
    console.warn("Could not load trending hoaxes via fetch, falling back to empty list:", err);
    return [];
  }
}

/**
 * Adapted from Veralon trending & share pages
 * Generates a high-resolution 1200x630 shareable social context card directly on an HTML5 canvas.
 * Zero server interaction, rendered 100% locally.
 *
 * @param {Object} reportData
 * @param {string} reportData.reportId
 * @param {string} reportData.claimText
 * @param {number} reportData.score
 * @param {string} reportData.verdict
 * @param {Object} reportData.confidence
 * @returns {Promise<Blob>} Image blob (image/png)
 */
export function renderShareCardToCanvas(reportData) {
  return new Promise((resolve, reject) => {
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 1200;
      canvas.height = 630;
      const ctx = canvas.getContext("2d");

      // Background: Deep Slate Gradient
      const grad = ctx.createLinearGradient(0, 0, 1200, 630);
      grad.addColorStop(0, "#090d16");
      grad.addColorStop(0.5, "#0f172a");
      grad.addColorStop(1, "#020617");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1200, 630);

      // Subtle decorative grid lines
      ctx.strokeStyle = "rgba(148, 163, 184, 0.07)";
      ctx.lineWidth = 1;
      for (let x = 60; x < 1200; x += 60) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 630);
        ctx.stroke();
      }
      for (let y = 60; y < 630; y += 60) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(1200, y);
        ctx.stroke();
      }

      // Brand Header
      ctx.fillStyle = "#38bdf8"; // Cyan/Sky
      ctx.font = "bold 26px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      ctx.fillText("TRUSTLENS", 60, 75);

      ctx.fillStyle = "#94a3b8";
      ctx.font = "16px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      ctx.fillText("DIGITAL INTEGRITY & MEDIA AUDIT", 230, 75);

      // Report ID pill (Top Right)
      const reportId = reportData.reportId || "TL-DEMO-RECORD";
      ctx.fillStyle = "rgba(30, 41, 59, 0.85)";
      ctx.strokeStyle = "rgba(56, 189, 248, 0.4)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(860, 45, 280, 44, 8);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#38bdf8";
      ctx.font = "bold 15px 'Courier New', monospace";
      ctx.textAlign = "center";
      ctx.fillText(reportId, 1000, 72);
      ctx.textAlign = "left";

      // Main Card Container
      ctx.fillStyle = "rgba(15, 23, 42, 0.75)";
      ctx.strokeStyle = "rgba(51, 65, 85, 0.6)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(60, 115, 1080, 440, 16);
      ctx.fill();
      ctx.stroke();

      // Examined Claim Headline
      ctx.fillStyle = "#64748b";
      ctx.font = "bold 14px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      ctx.fillText("CLAIM / CONTENT EXAMINED:", 95, 165);

      ctx.fillStyle = "#f8fafc";
      ctx.font = "italic 600 24px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      
      // Wrap text within 980px
      const maxW = 980;
      const claimText = `"${reportData.claimText || "Unverified circulating media record"}"`;
      const words = claimText.split(" ");
      let line = "";
      let lineY = 205;
      for (let i = 0; i < words.length; i++) {
        const testLine = line + words[i] + " ";
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxW && i > 0) {
          ctx.fillText(line, 95, lineY);
          line = words[i] + " ";
          lineY += 34;
          if (lineY > 275) {
            line = line.trim() + "...";
            break;
          }
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line, 95, lineY);

      // Verdict Pill
      const verdict = reportData.verdict || "Inconclusive";
      let pillBg = "#d97706";
      let pillText = "#ffffff";
      if (verdict === "Likely manipulated") pillBg = "#dc2626";
      if (verdict === "No signs found") pillBg = "#059669";

      ctx.fillStyle = pillBg;
      ctx.beginPath();
      ctx.roundRect(95, 330, 310, 56, 10);
      ctx.fill();

      ctx.fillStyle = pillText;
      ctx.font = "bold 20px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(verdict.toUpperCase(), 95 + 155, 365);
      ctx.textAlign = "left";

      // Score Meter (Right side of verdict)
      ctx.fillStyle = "#f1f5f9";
      ctx.font = "bold 44px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      ctx.fillText(`${reportData.score}`, 440, 372);

      ctx.fillStyle = "#64748b";
      ctx.font = "20px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      ctx.fillText("/ 100", 500, 372);

      // Confidence & Interval
      ctx.fillStyle = "#94a3b8";
      ctx.font = "16px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      const confRange = reportData.confidence?.formattedRange || `${reportData.score} ± 8`;
      const confLevel = reportData.confidence?.level || "Medium";
      ctx.fillText(`Confidence: ${confLevel} (Score ${confRange})`, 440, 405);

      // Multi-factor chips below
      const chipsY = 475;
      const chips = [
        "Deterministic 5-Factor Scoring",
        "Union-Find Syndication Clustering",
        "Client-Side ELA Pixel Forensics",
        "Tamper-Evident SHA-256 Ledger"
      ];

      let chipX = 95;
      ctx.font = "13px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      chips.forEach(chip => {
        const textW = ctx.measureText(chip).width;
        ctx.fillStyle = "rgba(30, 41, 59, 0.7)";
        ctx.strokeStyle = "rgba(71, 85, 105, 0.4)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(chipX, chipsY - 22, textW + 24, 32, 6);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#cbd5e1";
        ctx.fillText(chip, chipX + 12, chipsY);
        chipX += textW + 36;
      });

      // Bottom Footer Bar
      ctx.fillStyle = "#64748b";
      ctx.font = "12px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      ctx.fillText("Notice: ELA & EXIF signals are probabilistic indicators. Verified offline via TrustLens in-browser engine.", 60, 595);

      ctx.fillStyle = "#38bdf8";
      ctx.textAlign = "right";
      ctx.fillText("trustlens.local | No data leaves device", 1140, 595);

      canvas.toBlob(blob => {
        if (blob) resolve(blob);
        else reject(new Error("Canvas toBlob failed"));
      }, "image/png");
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Triggers a download of the rendered share context card as a PNG file.
 * @param {Object} reportData
 */
export async function downloadShareCard(reportData) {
  const blob = await renderShareCardToCanvas(reportData);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Crosscheck-Card-${reportData.reportId || "report"}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
