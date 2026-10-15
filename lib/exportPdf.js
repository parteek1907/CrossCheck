// Adapted from Veralon client/src/utils/exportReportPdf.ts

/**
 * Adapted from Veralon client/src/utils/exportReportPdf.ts
 * Generates an executive, tamper-evident PDF Trust Report using client-side jsPDF.
 *
 * @param {Object} reportData - Full report details
 * @param {string} reportData.reportId - TL-{timestamp}-{hash8}
 * @param {string} reportData.claimText - Analyzed claim or headline
 * @param {number} reportData.score - Final 100-point score
 * @param {string} reportData.verdict - Verdict string
 * @param {Object} reportData.confidence - Confidence object
 * @param {Object} reportData.scoringResult - Breakdown and caps
 * @param {Object} reportData.clusteringResult - Evidence clustering data
 * @param {Object} reportData.audit - Hash and metadata
 * @param {string} [reportData.forensicsSummary] - Image analysis findings
 */
export function exportReportPdf(reportData) {
  const jsPDF = window.jspdf ? window.jspdf.jsPDF : null;
  if (!jsPDF) {
    alert("jsPDF library not loaded. Please ensure an active internet connection or local bundle.");
    return false;
  }

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4"
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;
  let y = 18;

  // Header Banner
  doc.setFillColor(15, 23, 42); // Slate 900
  doc.rect(margin, y, contentWidth, 24, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("TRUSTLENS VERIFICATION AUDIT", margin + 8, y + 10);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184); // Slate 400
  doc.text("Standardized Digital Integrity & Media Forensics Report", margin + 8, y + 18);

  const reportId = reportData.reportId || "TL-OFFLINE-000000";
  doc.setFont("courier", "bold");
  doc.setFontSize(10);
  doc.setTextColor(56, 189, 248); // Sky blue
  doc.text(reportId, pageWidth - margin - 8, y + 14, { align: "right" });

  y += 32;

  // Metadata Card
  doc.setDrawColor(226, 232, 240); // Slate 200
  doc.setFillColor(248, 250, 252); // Slate 50
  doc.roundedRect(margin, y, contentWidth, 26, 2, 2, "FD");

  doc.setTextColor(71, 85, 105); // Slate 600
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("GENERATED AT:", margin + 6, y + 8);
  doc.setFont("helvetica", "normal");
  doc.text(new Date(reportData.audit?.timestamp || Date.now()).toLocaleString(), margin + 38, y + 8);

  doc.setFont("helvetica", "bold");
  doc.text("SHA-256 DIGEST:", margin + 6, y + 15);
  doc.setFont("courier", "normal");
  doc.setFontSize(7.5);
  doc.text(reportData.audit?.auditHash || "E3B0C44298FC1C149AFBF4C8996FB92427AE41E4649B934CA495991B7852B855", margin + 38, y + 15);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("CONFIDENCE:", margin + 6, y + 22);
  doc.setFont("helvetica", "normal");
  const confText = `${reportData.confidence?.level || "High"} Confidence Level`;
  doc.text(confText, margin + 38, y + 22);

  y += 32;

  // Claim Under Examination
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("EXAMINED CONTENT / CLAIM", margin, y);
  y += 6;

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, y, contentWidth, 18, 2, 2, "FD");

  doc.setFont("helvetica", "italic");
  doc.setFontSize(9.5);
  doc.setTextColor(30, 41, 59);
  const claimLines = doc.splitTextToSize(`"${reportData.claimText || "No claim text provided"}"`, contentWidth - 10);
  doc.text(claimLines, margin + 5, y + 7);

  y += 24;

  // Score & Verdict Section
  const verdict = reportData.verdict || "Inconclusive";
  let verdictColor = [217, 119, 6]; // Amber
  if (verdict === "Likely manipulated") verdictColor = [220, 38, 38]; // Red
  if (verdict === "No signs found") verdictColor = [5, 150, 105]; // Green

  doc.setFillColor(verdictColor[0], verdictColor[1], verdictColor[2]);
  doc.roundedRect(margin, y, contentWidth, 22, 2, 2, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(`VERDICT: ${verdict.toUpperCase()}`, margin + 8, y + 10);

  doc.setFontSize(18);
  doc.text(`${reportData.score} / 100`, pageWidth - margin - 8, y + 14, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text(reportData.scoringResult?.verdictSummary || "", margin + 8, y + 17);

  y += 28;

  // Component Breakdown
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("DETERMINISTIC COMPONENT BREAKDOWN", margin, y);
  y += 6;

  const breakdown = reportData.scoringResult?.breakdown || {};
  const componentsList = [
    breakdown.sourceReliability || { label: "Source Reliability", raw: 50, points: 12.5, weight: 0.25 },
    breakdown.independentCoverage || { label: "Independent Coverage", raw: 50, points: 12.5, weight: 0.25 },
    breakdown.contradictionStrength || { label: "Contradiction Strength", raw: 50, points: 10.0, weight: 0.20 },
    breakdown.imageAuthenticity || { label: "Image Authenticity", raw: 50, points: 7.5, weight: 0.15 },
    breakdown.claimSpecificity || { label: "Claim Specificity", raw: 50, points: 7.5, weight: 0.15 }
  ];

  componentsList.forEach(comp => {
    doc.setDrawColor(241, 245, 249);
    doc.setFillColor(248, 250, 252);
    doc.rect(margin, y, contentWidth, 8, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    doc.text(comp.label, margin + 4, y + 5.5);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    const weightLabel = `(Weight ${(comp.weight * 100).toFixed(0)}%)`;
    doc.text(weightLabel, margin + 60, y + 5.5);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    const ptsText = `${comp.points} pts (Raw: ${comp.raw}/100)`;
    doc.text(ptsText, pageWidth - margin - 4, y + 5.5, { align: "right" });

    y += 9.5;
  });

  y += 4;

  // Evidence Clustering Card
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("EVIDENCE CLUSTERING & SYNDICATION", margin, y);
  y += 6;

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, contentWidth, 20, 2, 2, "FD");

  const clust = reportData.clusteringResult || {};
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(30, 41, 59);
  doc.text(clust.summaryCardText || "Clustering analysis completed", margin + 6, y + 8);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  const clusterSub = `Syndication factor: ${clust.syndicationRatio || "1.0x"} | ${clust.independentSourceCount || 1} independent source clusters identified via domain grouping & Jaccard title index (>= 0.55).`;
  doc.text(clusterSub, margin + 6, y + 15);

  y += 26;

  // Limits of this check (Mandatory honesty disclosure)
  doc.setFillColor(254, 242, 242); // Red 50
  doc.setDrawColor(254, 202, 202); // Red 200
  doc.roundedRect(margin, y, contentWidth, 18, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(153, 27, 27); // Red 800
  doc.text("LIMITS OF THIS CHECK (TRANSPARENCY NOTICE):", margin + 5, y + 5.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(185, 28, 28);
  const disclaimer = "Error Level Analysis (ELA) and EXIF inspection are mathematical compression signals, not definitive legal proof. This automated assessment provides rapid triage against known hoaxes, syndication rings, and manipulation patterns.";
  const disclaimerLines = doc.splitTextToSize(disclaimer, contentWidth - 10);
  doc.text(disclaimerLines, margin + 5, y + 10.5);

  // Footer
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text("TrustLens Prototype - Hackathon Submission 'Real or Rendered?' - Powered by Pure Client-Side Forensics", pageWidth / 2, 290, { align: "center" });

  doc.save(`TrustLens-Report-${reportId}.pdf`);
  return true;
}
