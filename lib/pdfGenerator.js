// Crosscheck - Client-side PDF Complaint Pack Generator (using jsPDF)
// Generates a 3-page formal PDF pack:
// Page 1: Formal Police Complaint Letter (Ready to sign and submit at police station / cyber cell)
// Page 2: Bank Dispute Letter (Ready to print and submit at home branch citing RBI Circular)
// Page 3: Incident Summary & Evidence Checklist

import { jsPDF } from "jspdf";

export function generateComplaintPackPDF(incident, options = {}) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 18;
  const contentWidth = pageWidth - margin * 2;

  const now = new Date();
  const dateStr = options.submissionDate || now.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const timeStr = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

  const refNumber = `CC-INCD-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}-${Math.floor(1000 + Math.random() * 9000)}`;

  const amount = incident.amount_inr ? `INR ${incident.amount_inr.toLocaleString("en-IN")}` : "Unspecified Amount";
  const txIds = incident.transaction_ids?.length ? incident.transaction_ids.join(", ") : "Pending verification";
  const scammerPhones = incident.scammer_identifiers?.phones?.join(", ") || "Unknown / Hidden";
  const scammerUpis = incident.scammer_identifiers?.upi_ids?.join(", ") || incident.scammer_identifiers?.upi?.join(", ") || "Unknown / Not recorded";
  const scammerPlatform = incident.scammer_identifiers?.platform || "Phone / Mobile Application";
  const victimBank = incident.bank_name || "Domestic Bank";
  const paymentMode = incident.payment_method || "UPI";

  // Helper: Header bar for each page
  const drawPageHeader = (pageTitle, pageNum) => {
    doc.setFillColor(26, 26, 26);
    doc.rect(margin, 12, contentWidth, 8, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text("CROSSCHECK • OFFICIAL CYBERCRIME INCIDENT RESPONSE PACK", margin + 3, 17.5);
    doc.text(`PAGE ${pageNum} OF 3`, pageWidth - margin - 3, 17.5, { align: "right" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 100);
    doc.text(`Reference: ${refNumber}  |  Generated: ${dateStr} at ${timeStr}`, margin, 24);
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(margin, 26, pageWidth - margin, 26);
  };

  // Helper: Footer for each page
  const drawPageFooter = () => {
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(margin, pageHeight - 14, pageWidth - margin, pageHeight - 14);

    doc.setFont("helvetica", "italic");
    doc.setFontSize(7);
    doc.setTextColor(120, 120, 120);
    doc.text(
      "CONFIDENTIAL • Prepared for official police station submission and banking dispute records. National Helpline: 1930",
      margin,
      pageHeight - 9
    );
  };

  // -------------------------------------------------------------
  // PAGE 1: POLICE COMPLAINT LETTER
  // -------------------------------------------------------------
  drawPageHeader("FORMAL POLICE COMPLAINT LETTER", 1);

  let y = 33;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(20, 20, 20);
  doc.text("FORMAL COMPLAINT OF CYBER FRAUD & FINANCIAL THEFT", margin, y);
  y += 6;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60, 60, 60);
  doc.text("To,", margin, y);
  y += 4;
  doc.setFont("helvetica", "bold");
  doc.text("The Station House Officer (SHO) / Officer-in-Charge", margin, y);
  y += 4;
  doc.setFont("helvetica", "normal");
  doc.text("Cyber Crime Police Station / Local Jurisdiction Police Station", margin, y);
  y += 6;

  // Subject Box
  doc.setFillColor(245, 243, 238);
  doc.roundedRect(margin, y, contentWidth, 12, 1.5, 1.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(184, 66, 43);
  doc.text("SUBJECT: COMPLAINT UNDER SECTIONS 318/316 BNS (2023) AND 66C/66D IT ACT (2000)", margin + 3, y + 4.5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(40, 40, 40);
  doc.text(`Regarding fraudulent unauthorized electronic debit of ${amount} via ${paymentMode}`, margin + 3, y + 9);
  y += 16;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(30, 30, 30);
  doc.text("Respected Sir / Madam,", margin, y);
  y += 5;

  const introText =
    "I am formally placing on record this complaint regarding an unauthorized cyber financial fraud perpetrated against me. The detailed particulars of the transaction, accused suspect, and factual chronology are set forth below:";
  const introLines = doc.splitTextToSize(introText, contentWidth);
  doc.text(introLines, margin, y);
  y += introLines.length * 4 + 3;

  // Table of incident facts
  const tableData = [
    ["Disputed Amount", amount],
    ["Date & Time of Incident", incident.date_time || "Recent (Within last 24 hours)"],
    ["Complainant Debited Bank", `${victimBank} via ${paymentMode}`],
    ["12-Digit Transaction Reference (UTR)", txIds],
    ["Suspect Contact / Phone", scammerPhones],
    ["Suspect Recipient UPI / Account", scammerUpis],
    ["Communication Platform", scammerPlatform],
  ];

  doc.setFillColor(250, 250, 250);
  doc.rect(margin, y, contentWidth, tableData.length * 5 + 2, "F");
  doc.setDrawColor(220, 220, 220);
  doc.rect(margin, y, contentWidth, tableData.length * 5 + 2, "S");

  let tableY = y + 4;
  tableData.forEach(([label, val]) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(70, 70, 70);
    doc.text(label, margin + 3, tableY);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(20, 20, 20);
    doc.text(String(val), margin + 65, tableY);
    tableY += 5;
  });

  y += tableData.length * 5 + 6;

  // Chronology section
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(20, 20, 20);
  doc.text("FACTUAL SUMMARY & CHRONOLOGY:", margin, y);
  y += 4.5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(40, 40, 40);
  const narrative =
    incident.timeline_summary ||
    "The complainant was contacted by individuals falsely misrepresenting themselves, leading to an unauthorized fraudulent electronic funds transfer.";
  const narrativeLines = doc.splitTextToSize(narrative, contentWidth);
  doc.text(narrativeLines, margin, y);
  y += narrativeLines.length * 4 + 4;

  // Relief Sought
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(20, 20, 20);
  doc.text("PRAYER / RELIEF SOUGHT:", margin, y);
  y += 4.5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  const prayers = [
    "1. Register a First Information Report (FIR) under Sections 318 / 316 BNS and Sections 66C / 66D IT Act.",
    "2. Issue Section 91 CrPC / BNSS preservation notice to the concerned telecom provider and destination bank.",
    "3. Liaise with the National Cybercrime Portal (CFCFRMS / 1930) to facilitate lien marking and fund restitution.",
  ];
  prayers.forEach((p) => {
    doc.text(p, margin, y);
    y += 3.8;
  });

  y += 6;

  // Verification & Signatures
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("VERIFICATION:", margin, y);
  y += 3.5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text(
    "I verify that the contents of this complaint are true and accurate to the best of my knowledge and belief.",
    margin,
    y
  );
  y += 10;

  doc.setFont("helvetica", "bold");
  doc.text("Signature of Complainant: _______________________", margin, y);
  doc.text("Date: ________________________", pageWidth - margin - 55, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.text("Full Name: ___________________________________", margin, y);
  doc.text("Mobile No: ___________________", pageWidth - margin - 55, y);

  drawPageFooter();

  // -------------------------------------------------------------
  // PAGE 2: BANK DISPUTE LETTER
  // -------------------------------------------------------------
  doc.addPage();
  drawPageHeader("FORMAL BANK DISPUTE LETTER (BRANCH SUBMISSION)", 2);

  y = 33;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(20, 20, 20);
  doc.text("FORMAL NOTICE OF UNAUTHORIZED ELECTRONIC TRANSACTION", margin, y);
  y += 6;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60, 60, 60);
  doc.text("To,", margin, y);
  y += 4;
  doc.setFont("helvetica", "bold");
  doc.text("The Branch Manager / Principal Nodal Officer for Fraud Redressal", margin, y);
  y += 4;
  doc.setFont("helvetica", "normal");
  doc.text(`${victimBank}, Home Branch`, margin, y);
  y += 6;

  // Statutory Subject Box
  doc.setFillColor(245, 243, 238);
  doc.roundedRect(margin, y, contentWidth, 14, 1.5, 1.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(184, 66, 43);
  doc.text(
    "STATUTORY CLAIM UNDER RBI CIRCULAR RBI/2017-18/15 DBR.No.Leg.BC.78/09.07.005/2017-18",
    margin + 3,
    y + 4.5
  );
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(40, 40, 40);
  doc.text(
    `Reversal of unauthorized debit of ${amount} (Ref: ${txIds}) reported within the statutory 3-day zero-liability window.`,
    margin + 3,
    y + 9
  );
  y += 18;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(30, 30, 30);
  doc.text("Respected Sir / Madam,", margin, y);
  y += 5;

  const bankIntro =
    "I am an account holder with your branch and am submitting this formal written notice immediately upon discovering an unauthorized fraudulent electronic funds debit from my account. In terms of Master Direction of the Reserve Bank of India on Limiting Customer Liability in Unauthorised Electronic Banking Transactions, my statutory rights stand strictly reserved.";
  const bankIntroLines = doc.splitTextToSize(bankIntro, contentWidth);
  doc.text(bankIntroLines, margin, y);
  y += bankIntroLines.length * 4 + 4;

  // Transaction Specifics Box
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("DISPUTED TRANSACTION DETAILS:", margin, y);
  y += 4;

  const bankData = [
    ["Account Holder Name", "________________________________________________"],
    ["Debit Account Number", "________________________________________________"],
    ["Exact Amount Debited", amount],
    ["Date & Time of Transaction", incident.date_time || "Recent"],
    ["UTR / Transaction Reference", txIds],
    ["Payment Mode Used", paymentMode],
    ["Suspect Recipient Handle", scammerUpis],
  ];

  doc.setFillColor(250, 250, 250);
  doc.rect(margin, y, contentWidth, bankData.length * 5 + 2, "F");
  doc.setDrawColor(220, 220, 220);
  doc.rect(margin, y, contentWidth, bankData.length * 5 + 2, "S");

  let bY = y + 4;
  bankData.forEach(([label, val]) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(70, 70, 70);
    doc.text(label, margin + 3, bY);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(20, 20, 20);
    doc.text(String(val), margin + 65, bY);
    bY += 5;
  });
  y += bankData.length * 5 + 6;

  // Legal Grounds
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("STATUTORY MANDATES UNDER RBI CIRCULAR:", margin, y);
  y += 4.5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  const mandates = [
    "1. Zero Customer Liability (Paragraph 6): Notified immediately upon knowledge. Burden of proving fraud lies solely on the bank.",
    "2. Shadow Reversal Mandate (Paragraph 9): The bank must credit the disputed amount within 10 working days of notification.",
    "3. Destination Bank Lien: Request immediate dispatch of CFCFRMS freeze request to destination beneficiary bank.",
    "4. Mandatory Acknowledgment: The bank is obligated to provide a formal grievance tracking token number upon receipt.",
  ];
  mandates.forEach((m) => {
    doc.text(m, margin, y);
    y += 3.8;
  });

  y += 8;

  // Signatures & Branch Seal Box
  doc.setDrawColor(200, 200, 200);
  doc.rect(margin, y, contentWidth, 32, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text("CUSTOMER SUBMISSION:", margin + 4, y + 5);
  doc.setFont("helvetica", "normal");
  doc.text("Signature: ____________________________", margin + 4, y + 14);
  doc.text("Date & Time: _________________________", margin + 4, y + 22);

  doc.line(pageWidth / 2, y, pageWidth / 2, y + 32);

  doc.setFont("helvetica", "bold");
  doc.text("BRANCH ACKNOWLEDGEMENT STAMP:", pageWidth / 2 + 4, y + 5);
  doc.setFont("helvetica", "normal");
  doc.text("Received by (Officer Name): ____________", pageWidth / 2 + 4, y + 14);
  doc.text("Dispute Token / Ticket No: _____________", pageWidth / 2 + 4, y + 22);
  doc.text("Branch Round Seal & Date: _____________", pageWidth / 2 + 4, y + 28);

  drawPageFooter();

  // -------------------------------------------------------------
  // PAGE 3: INCIDENT SUMMARY & EVIDENCE CHECKLIST
  // -------------------------------------------------------------
  doc.addPage();
  drawPageHeader("INCIDENT SUMMARY & EVIDENCE CHECKLIST", 3);

  y = 33;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(20, 20, 20);
  doc.text("OFFICIAL CASE SUMMARY & EVIDENCE CHECKLIST", margin, y);
  y += 6;

  // Overview box
  doc.setFillColor(248, 246, 240);
  doc.roundedRect(margin, y, contentWidth, 20, 1.5, 1.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(20, 20, 20);
  doc.text("INCIDENT INTELLIGENCE PROFILE", margin + 4, y + 5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(50, 50, 50);
  doc.text(`Category: ${incident.incident_type || "Financial Fraud"}`, margin + 4, y + 10);
  doc.text(`Disputed Total: ${amount}`, margin + 4, y + 15);
  doc.text(`Status: Verified by Victim & Ready for Law Enforcement Intake`, margin + 70, y + 10);
  doc.text(`Helpline Status: Recommended for immediate 1930 reporting`, margin + 70, y + 15);
  y += 26;

  // Evidence Checklist Section
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(20, 20, 20);
  doc.text("PHYSICAL & DIGITAL EVIDENCE CHECKLIST FOR SUBMISSION:", margin, y);
  y += 4;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(70, 70, 70);
  doc.text(
    "Attach self-attested photocopies of the following items along with Page 1 (Police) and Page 2 (Bank):",
    margin,
    y
  );
  y += 6;

  const checklist = [
    {
      title: "Bank Account Statement showing Disputed Debit",
      desc: "Highlight the specific transaction with pen. Obtain round seal stamp from home branch if possible.",
    },
    {
      title: "Payment Application Screenshot with 12-Digit UTR",
      desc: "Screenshot of Google Pay, PhonePe, or Paytm confirmation screen showing the UTR reference number.",
    },
    {
      title: "Bank SMS Alert Notifications",
      desc: "Screenshot or printout of SMS alerts received on your mobile at the exact time of funds transfer.",
    },
    {
      title: "Call Records & Suspect Phone Details",
      desc: "Screenshot of call log showing incoming call time, duration, and suspect telephone number.",
    },
    {
      title: "WhatsApp / Telegram / SMS Chat Transcripts",
      desc: "Full exported chat thread or screenshot proof of fraudulent links, APK downloads, or instructions.",
    },
    {
      title: "Complainant Identity Proof (Aadhaar / PAN Card)",
      desc: "One self-attested government identity proof required for formal FIR registration.",
    },
    {
      title: "Cybercrime Portal Acknowledgement Slip",
      desc: "Printout of the acknowledgement slip generated after submitting on cybercrime.gov.in.",
    },
  ];

  checklist.forEach((item, idx) => {
    // Checkbox square
    doc.setDrawColor(60, 60, 60);
    doc.setLineWidth(0.4);
    doc.rect(margin + 1, y, 3.5, 3.5, "S");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(20, 20, 20);
    doc.text(`${idx + 1}. ${item.title}`, margin + 7, y + 2.8);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(90, 90, 90);
    doc.text(item.desc, margin + 7, y + 6.5);

    y += 10;
  });

  y += 2;

  // Evidence Vault Deep Link & Forensic Notice
  doc.setFillColor(235, 245, 255);
  doc.roundedRect(margin, y, contentWidth, 22, 1.5, 1.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(20, 60, 120);
  doc.text("CROSSCHECK EVIDENCE VAULT INTEGRATION (/dashboard?nav=vault)", margin + 4, y + 5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(40, 70, 110);
  const vaultNotice =
    "To preserve digital evidence integrity and cryptographic timestamps, upload original, unedited digital files (screenshots, audio files, and receipts) directly to the Crosscheck Evidence Vault. Digital hashes ensure evidence admissibility under Section 65B of the Indian Evidence Act.";
  const vaultLines = doc.splitTextToSize(vaultNotice, contentWidth - 8);
  doc.text(vaultLines, margin + 4, y + 9.5);

  drawPageFooter();

  return doc;
}
