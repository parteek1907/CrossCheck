// Crosscheck - Action Pack Engine
// Real computation only: formats extracted incident facts into official 1930 helpline scripts,
// cybercrime.gov.in portal mappings, RBI circular dispute emails, and platform reporting guides.

export const BANK_DIRECTORY = [
  {
    name: "State Bank of India (SBI)",
    code: "SBI",
    nodalEmail: "customercare@sbi.co.in",
    helpline: "18001234 / 18002100",
  },
  {
    name: "HDFC Bank",
    code: "HDFC",
    nodalEmail: "grievance.redressal@hdfcbank.com",
    helpline: "18002026161 / 18602676161",
  },
  {
    name: "ICICI Bank",
    code: "ICICI",
    nodalEmail: "headservicequality@icicibank.com",
    helpline: "18001080",
  },
  {
    name: "Axis Bank",
    code: "AXIS",
    nodalEmail: "nodalofficer@axisbank.com",
    helpline: "18604195555 / 18605005555",
  },
  {
    name: "Punjab National Bank (PNB)",
    code: "PNB",
    nodalEmail: "nodalofficer@pnb.co.in",
    helpline: "18001802222 / 18001032222",
  },
  {
    name: "Bank of Baroda (BoB)",
    code: "BOB",
    nodalEmail: "nodal.officer@bankofbaroda.com",
    helpline: "18005700",
  },
  {
    name: "Kotak Mahindra Bank",
    code: "KOTAK",
    nodalEmail: "nodalofficer@kotak.com",
    helpline: "18602662666",
  },
  {
    name: "Canara Bank",
    code: "CANARA",
    nodalEmail: "nodalofficer@canarabank.com",
    helpline: "18004250018",
  },
  {
    name: "IndusInd Bank",
    code: "INDUSIND",
    nodalEmail: "nodal.officer@indusind.com",
    helpline: "18602677777",
  },
  {
    name: "Union Bank of India",
    code: "UNION",
    nodalEmail: "grievances@unionbankofindia.bank",
    helpline: "1800222244",
  },
];

/**
 * Generates structured 1930 Call Script
 */
export function generate1930Script(incident) {
  const amount = incident.amount_inr ? `₹${incident.amount_inr.toLocaleString("en-IN")}` : "Unspecified / In Progress";
  const txIds = incident.transaction_ids?.length ? incident.transaction_ids.join(", ") : "Pending SMS verification";
  const scammerUpi = incident.scammer_identifiers?.upi_ids?.join(", ") || incident.scammer_identifiers?.upi?.join(", ") || "Unknown / Not recorded";
  const scammerPhones = incident.scammer_identifiers?.phones?.join(", ") || "Unknown / Hidden";
  const dateTime = incident.date_time || "Recent (Within last 24 hours)";
  const bank = incident.bank_name || "My Domestic Bank";

  return [
    {
      label: "Incident Nature",
      operatorPrompt: "What type of fraud took place?",
      answer: incident.incident_type === "financial_fraud" ? "Unauthorized UPI / Financial Electronic Transfer Fraud" : "Impersonation / Cybercrime Extortion",
    },
    {
      label: "Victim Bank & Payment Method",
      operatorPrompt: "From which bank and method was money debited?",
      answer: `${bank} via ${incident.payment_method || "UPI"}`,
    },
    {
      label: "Transaction Reference (UTR)",
      operatorPrompt: "What is the 12-digit UTR or Transaction ID?",
      answer: txIds,
      critical: true,
    },
    {
      label: "Exact Amount Debited",
      operatorPrompt: "What is the exact financial loss in Rupees?",
      answer: amount,
    },
    {
      label: "Date & Time of Debit",
      operatorPrompt: "When exactly did this transaction take place?",
      answer: dateTime,
    },
    {
      label: "Scammer Recipient Details",
      operatorPrompt: "What is the scammer's UPI ID, phone number, or beneficiary account?",
      answer: `UPI: ${scammerUpi} | Phone: ${scammerPhones}`,
      critical: true,
    },
    {
      label: "Immediate Request to Operator",
      operatorPrompt: "What action are you requesting right now?",
      answer: "Please register this complaint in the National Cyber Crime Reporting Portal (CFCFRMS) and trigger an immediate freeze/lien on the beneficiary's nodal bank account.",
    },
  ];
}

/**
 * Maps incident facts to cybercrime.gov.in portal fields
 */
export function generatePortalMappings(incident) {
  let category = "Financial Fraud";
  let subCategory = "UPI Related Fraud";

  if (incident.incident_type === "impersonation") {
    category = "Other Cyber Crimes";
    subCategory = "Impersonating / Cheating by personation";
  } else if (incident.incident_type === "sextortion") {
    category = "Cyber Crimes Against Women / Children";
    subCategory = "Blackmailing / Defamation / Sextortion";
  } else if (incident.incident_type === "harassment") {
    category = "Other Cyber Crimes";
    subCategory = "Cyber Harassment / Threat";
  } else if (incident.payment_method === "netbanking") {
    subCategory = "Internet Banking Fraud";
  } else if (incident.payment_method === "card") {
    subCategory = "Debit / Credit Card Fraud / SIM Swap";
  }

  const suspectDetails = [];
  if (incident.scammer_identifiers?.phones?.length) {
    suspectDetails.push(`Phone: ${incident.scammer_identifiers.phones.join(", ")}`);
  }
  if (incident.scammer_identifiers?.upi_ids?.length || incident.scammer_identifiers?.upi?.length) {
    const upis = incident.scammer_identifiers?.upi_ids || incident.scammer_identifiers?.upi;
    suspectDetails.push(`UPI ID: ${upis.join(", ")}`);
  }
  if (incident.scammer_identifiers?.platform) {
    suspectDetails.push(`Platform: ${incident.scammer_identifiers.platform}`);
  }

  const structuredNarrative = `FORMAL COMPLAINT DETAILS:
- Incident Category: ${category} (${subCategory})
- Date & Time: ${incident.date_time || "Not specified"}
- Debited Bank: ${incident.bank_name || "Domestic Bank"} via ${incident.payment_method || "UPI"}
- Disputed Amount: ${incident.amount_inr ? `INR ${incident.amount_inr.toLocaleString("en-IN")}` : "Unspecified"}
- Transaction Reference (UTR): ${incident.transaction_ids?.join(", ") || "Pending"}
- Suspect Identifiers: ${suspectDetails.join(" | ") || "Not provided"}

FACTUAL TIMELINE:
${incident.timeline_summary || "The victim was targeted by fraudulent communication inducing an unauthorized financial transaction."}

RELIEF SOUGHT:
1. Registration under Citizen Financial Cyber Fraud Reporting System.
2. Immediate freeze/lien of beneficiary account/wallet at destination bank.
3. FIR registration under relevant sections of the Bharatiya Nyaya Sanhita (BNS) and Information Technology Act, 2000.`;

  return {
    category,
    subCategory,
    amount: incident.amount_inr ? String(incident.amount_inr) : "",
    date: incident.date_time || "",
    transactionId: incident.transaction_ids?.join(", ") || "",
    bankName: incident.bank_name || "",
    suspectDetails: suspectDetails.join(" | ") || "Not provided",
    narrative: structuredNarrative,
    description: structuredNarrative,
  };
}

export function getBankCodeFromName(bankName) {
  if (!bankName || typeof bankName !== "string") return "SBI";
  const cleaned = bankName.trim().toLowerCase();

  if (cleaned.includes("hdfc")) return "HDFC";
  if (cleaned.includes("sbi") || cleaned.includes("state bank")) return "SBI";
  if (cleaned.includes("icici")) return "ICICI";
  if (cleaned.includes("axis")) return "AXIS";
  if (cleaned.includes("pnb") || cleaned.includes("punjab national")) return "PNB";
  if (cleaned.includes("bob") || cleaned.includes("baroda")) return "BOB";
  if (cleaned.includes("kotak")) return "KOTAK";
  if (cleaned.includes("canara")) return "CANARA";
  if (cleaned.includes("indusind")) return "INDUSIND";
  if (cleaned.includes("union")) return "UNION";

  const found = BANK_DIRECTORY.find(
    (b) =>
      b.code.toLowerCase() === cleaned ||
      b.name.toLowerCase().includes(cleaned) ||
      cleaned.includes(b.code.toLowerCase()) ||
      cleaned.includes(b.name.toLowerCase().split(" ")[0])
  );
  return found ? found.code : "SBI";
}

/**
 * Generates Bank Dispute Notice citing RBI Circular
 */
export function generateBankDisputeEmail(incident, selectedBankCode = null, customEmail = "", options = {}) {
  const resolvedCode = selectedBankCode || (incident?.bank_name ? getBankCodeFromName(incident.bank_name) : "SBI");
  const bank = BANK_DIRECTORY.find((b) => b.code === resolvedCode) || BANK_DIRECTORY[0];
  const toEmail = customEmail.trim() || bank.nodalEmail;

  const rawAmount = incident.amount_inr;
  const amount = rawAmount ? `₹${Number(rawAmount).toLocaleString("en-IN")}` : "[Amount in INR]";
  const txIds = incident.transaction_ids?.length ? incident.transaction_ids.join(", ") : "[UTR / Transaction Reference]";
  const dateTime = incident.date_time || "[Date and Time of Transaction]";
  const paymentMode = incident.payment_method || "UPI";
  const scammerUpi = incident.scammer_identifiers?.upi_ids?.join(", ") || incident.scammer_identifiers?.upi?.join(", ") || "Not available";
  const scammerPhone = incident.scammer_identifiers?.phones?.join(", ") || "Not available";
  const summary = incident.timeline_summary || "An unauthorized fraudulent debit took place without lawful authorization.";

  // Dynamic Complainant Name: use passed name or incident details, fallback to placeholder
  const rawName = (options.complainantName || incident.complainant_name || incident.victim_name || options.userName || "").trim();
  const displayName = rawName || "[Your Name]";

  // Mobile Number: Pick WhatsApp mobile number
  const rawPhone = (options.userPhone || options.phoneNumber || incident.phone_number || incident.phoneNumber || "").toString().replace(/[^0-9+]/g, "");
  let formattedPhone = rawPhone;
  if (rawPhone.startsWith("91") && rawPhone.length === 12) {
    formattedPhone = `+91 ${rawPhone.slice(2, 7)} ${rawPhone.slice(7)}`;
  } else if (!rawPhone.startsWith("+") && rawPhone.length === 10) {
    formattedPhone = `+91 ${rawPhone.slice(0, 5)} ${rawPhone.slice(5)}`;
  }
  const displayPhone = formattedPhone || "[Your Registered Mobile Number]";

  const subject = `URGENT: Notice of Fraudulent / Unauthorized Transaction of ${amount} [Ref: ${txIds}]`;

  const body = `To: The Principal Nodal Officer / Fraud Dispute Cell
${bank.name}

Subject: URGENT NOTICE OF UNAUTHORIZED TRANSACTION & CLAIM FOR REVERSAL UNDER RBI CIRCULAR DBR.No.Leg.BC.78/09.07.005/2017-18

Respected Sir / Madam,

I am writing to formally report an unauthorized electronic banking fraud on my account and place on record my immediate dispute under Reserve Bank of India circular RBI/2017-18/15 DBR.No.Leg.BC.78/09.07.005/2017-18 dated July 6, 2017 ("Customer Protection – Limiting Liability of Customers in Unauthorised Electronic Banking Transactions").

TRANSACTION DETAILS:
- Bank Name: ${incident.bank_name || bank.name}
- Transaction Amount: ${amount}
- Date & Time: ${dateTime}
- Payment Mode: ${paymentMode}
- Transaction ID / UTR: ${txIds}
- Beneficiary / Suspect UPI: ${scammerUpi}
- Suspect Phone: ${scammerPhone}

INCIDENT SUMMARY:
${summary}

LEGAL AND REGULATORY RECOURSE:
1. In terms of Paragraph 6 & 7 of the aforementioned RBI Circular, having notified the bank immediately upon discovery, my liability stands strictly limited / zero.
2. Please immediately mark a lien / freeze on the beneficiary account at the destination bank using the National Cybercrime Reporting Portal / 1930 network.
3. Kindly register this dispute, issue a formal Grievance Ticket / Acknowledgment Number, and initiate shadow reversal / chargeback in accordance with RBI directives.

I have also reported this matter to the National Cybercrime Reporting Portal (cybercrime.gov.in) and Helpline 1930.

Yours sincerely,
${displayName}
Registered Mobile Number: ${displayPhone}`;

  return {
    toEmail,
    bankName: bank.name,
    subject,
    body,
    mailtoUrl: `mailto:${toEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
  };
}

/**
 * Generates Platform Reporting Guidance
 */
export function generatePlatformReportingGuide(incident) {
  const platform = incident.scammer_identifiers?.platform?.toLowerCase() || "";
  const guides = [];

  // UPI Apps
  guides.push({
    platform: "UPI Applications (Google Pay / PhonePe / Paytm)",
    icon: "Wallet",
    actionTitle: "Raise Chargeback in Payment App",
    url: null,
    steps: [
      "Open your payment app (Google Pay, PhonePe, or Paytm).",
      "Navigate to 'Transaction History' and select the fraudulent transaction.",
      "Tap 'Having issues?' or 'Report a problem' -> Select 'Fraudulent / Unauthorized Transaction'.",
      "Quote the 12-digit UTR and request immediate clawback from recipient's PSP handle.",
    ],
    copySnippet: `Fraudulent transaction dispute: UTR ${incident.transaction_ids?.join(", ") || "N/A"}. Unauthorized transfer of ${incident.amount_inr ? `Rs ${incident.amount_inr}` : "funds"}. Recipient UPI handle: ${incident.scammer_identifiers?.upi_ids?.join(", ") || incident.scammer_identifiers?.upi?.join(", ") || "N/A"}. Please freeze recipient wallet.`,
  });

  // WhatsApp
  if (platform.includes("whatsapp") || incident.timeline_summary?.toLowerCase().includes("whatsapp") || incident.scammer_identifiers?.phones?.length) {
    guides.push({
      platform: "WhatsApp In-App Abuse Reporting",
      icon: "MessageSquare",
      actionTitle: "Report & Block Scam Contact",
      url: "https://faq.whatsapp.com/414631957536067",
      steps: [
        "Open WhatsApp chat with the suspect number.",
        "Tap the contact name / header -> Scroll down and tap 'Report Contact'.",
        "Keep 'Block contact and delete chat' checked.",
        "WhatsApp will receive the last 5 messages for investigation and telecommunications banning.",
      ],
      copySnippet: `Cyber fraud / impersonation scam. Suspect number: ${incident.scammer_identifiers?.phones?.join(", ") || "Unknown"}. Demanded unauthorized payments.`,
    });
  }

  // Telegram
  if (platform.includes("telegram") || incident.timeline_summary?.toLowerCase().includes("telegram")) {
    guides.push({
      platform: "Telegram Anti-Scam Reporting",
      icon: "Send",
      actionTitle: "Report to Telegram Anti-Scam",
      url: "https://t.me/notoscam",
      steps: [
        "Forward suspicious messages and usernames directly to @notoscam on Telegram.",
        "Alternatively, tap the group/user info -> Tap 'Report' -> Select 'Fake Account / Scam'.",
      ],
      copySnippet: `Fake job/investment scam group targeting victims for financial fraud. Reported to Indian Cybercrime Helpline 1930.`,
    });
  }

  // Sanchar Saathi Chakshu (Telecom SIM / Call / SMS)
  guides.push({
    platform: "DoT Chakshu (Sanchar Saathi)",
    icon: "PhoneCall",
    actionTitle: "Blacklist Suspect SIM / Calling Number",
    url: "https://sancharsaathi.gov.in/sfc/",
    steps: [
      "Open the Government Department of Telecommunications (DoT) Chakshu portal.",
      "Select 'Report Suspected Fraud Communication'.",
      "Paste the suspect phone number and screenshot proof.",
      "The telecom department will initiate SIM disconnection and IMEI blacklisting.",
    ],
    copySnippet: `Suspect Calling Number: ${incident.scammer_identifiers?.phones?.join(", ") || "Unknown"}. Used for impersonation / cyber financial fraud.`,
  });

  return guides;
}
