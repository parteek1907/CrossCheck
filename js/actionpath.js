// TrustLens Action Path Module
// Contextual response protocols and emergency cybercrime helpline linkages

export const EMERGENCY_HELPLINES = [
  {
    name: "National Cyber Fraud Helpline",
    number: "1930",
    link: "tel:1930",
    category: "Financial / Imposter Scams",
    description: "Operated by Citizen Financial Cyber Fraud Reporting System. Golden hour account freeze intervention."
  },
  {
    name: "National Cyber Crime Reporting Portal",
    number: "cybercrime.gov.in",
    link: "https://cybercrime.gov.in",
    category: "Official FIR Registration",
    description: "Official Government of India portal for reporting financial fraud, morphed media, and cyber extortion."
  },
  {
    name: "PIB Fact Check WhatsApp Tip Line",
    number: "+91 87997 11259",
    link: "https://wa.me/918799711259",
    category: "Government Misinformation",
    description: "Official Press Information Bureau tip line for verifying fake government orders and viral circulars."
  },
  {
    name: "National Emergency Helpline",
    number: "112",
    link: "tel:112",
    category: "All-India Emergency",
    description: "Unified immediate emergency response for physical threat, urgent distress, or severe extortion."
  },
  {
    name: "Women Safety & Cyber Harassment Helpline",
    number: "181",
    link: "tel:181",
    category: "Women Cyber Distress",
    description: "Dedicated 24x7 support for non-consensual morphed photography, blackmail, and targeted cyber harassment."
  }
];

export const ACTION_PROTOCOLS = {
  scam: {
    category: "scam",
    title: "Financial Scam & Emergency Imposter Triage",
    urgency: "CRITICAL: Act within the first 2-hour Golden Window",
    badgeColor: "#dc2626",
    summary: "Immediate steps to prevent fund dissipation, freeze rogue UPI accounts, and secure statutory legal protection.",
    steps: [
      {
        id: "scam-1",
        title: "Call 1930 Immediately",
        desc: "Dial 1930 without delay. Provide the transaction reference (UTR/UPI ID), suspect phone number, and account details to trigger immediate inter-bank freezing.",
        primaryAction: { label: "Call 1930 Now", link: "tel:1930" }
      },
      {
        id: "scam-2",
        title: "Block UPI ID & Inform Bank Nodal Officer",
        desc: "Notify your bank's fraud monitoring cell to place a temporary freeze on internet banking credentials and disavow unauthorized mandates.",
        primaryAction: null
      },
      {
        id: "scam-3",
        title: "Register on cybercrime.gov.in",
        desc: "Submit an online complaint under 'Report Financial Fraud'. Attach transaction screenshots and suspect chat records.",
        primaryAction: { label: "Open cybercrime.gov.in", link: "https://cybercrime.gov.in" }
      },
      {
        id: "scam-4",
        title: "Save Evidence in TrustLens Vault",
        desc: "Store message transcripts and audit scores in the tamper-evident Evidence Vault to produce a cryptographically chained PDF complaint pack.",
        primaryAction: null
      },
      {
        id: "scam-5",
        title: "Activate Safe Circle Verification",
        desc: "If contacted by someone claiming to be a distressed family member, demand their current 60-second Safe Circle spoken code before taking any action.",
        primaryAction: null
      }
    ]
  },
  morphed_image: {
    category: "morphed_image",
    title: "Manipulated Media & Deepfake Harassment Triage",
    urgency: "HIGH: Statutory 24-72h Platform Take-down Mandate",
    badgeColor: "#ea580c",
    summary: "Legal enforcement protocols under the IT Rules 2021 to compel immediate platform takedowns and preserve evidentiary provenance.",
    steps: [
      {
        id: "morph-1",
        title: "File at Cyber Crime Portal (Women & Child / Harassment)",
        desc: "File complaint under Section 66E (privacy violation) and Section 67 (obscene content) of the Information Technology Act 2000.",
        primaryAction: { label: "File Incident at cybercrime.gov.in", link: "https://cybercrime.gov.in" }
      },
      {
        id: "morph-2",
        title: "Serve Notice to Platform Grievance Officer",
        desc: "Under IT (Intermediary Guidelines) Rules 2021 Rule 3(2)(b), social media platforms are legally required to remove non-consensual morphed imagery within 24 to 72 hours of notice.",
        primaryAction: null
      },
      {
        id: "morph-3",
        title: "Preserve Original File with ELA Forensics",
        desc: "Do not screenshot or compress the original file again. Save the original into the Evidence Vault to preserve raw EXIF timestamps and the ELA compression discrepancy map.",
        primaryAction: null
      },
      {
        id: "morph-4",
        title: "Register Hash with StopNCII.org (if applicable)",
        desc: "For non-consensual intimate imagery, generate an on-device cryptographic perceptual hash via StopNCII.org to prevent re-upload across Meta, TikTok, and Reddit networks.",
        primaryAction: { label: "Visit StopNCII.org", link: "https://stopncii.org" }
      },
      {
        id: "morph-5",
        title: "Download Pre-filled Legal Complaint",
        desc: "Generate a formatted complaint draft from the TrustLens Evidence Vault with exact statutory citations ready for police submission.",
        primaryAction: null
      }
    ]
  },
  misinformation: {
    category: "misinformation",
    title: "Viral Disinformation & Coordinated Hoax Triage",
    urgency: "MODERATE: Contain Viral Echo Chamber Syndication",
    badgeColor: "#2563eb",
    summary: "Containment workflow to counter syndicated clickbait networks and refute unverified state orders.",
    steps: [
      {
        id: "mis-1",
        title: "Verify Against Official Fact Check Portals",
        desc: "Cross-reference claims with the Press Information Bureau Fact Check database or official gazette repositories.",
        primaryAction: { label: "Check PIB Fact Check", link: "https://pib.gov.in/factcheck" }
      },
      {
        id: "mis-2",
        title: "Submit to PIB WhatsApp Verification Line",
        desc: "Send suspicious forwards or fake orders directly to the official fact check verification number (+91 87997 11259).",
        primaryAction: { label: "Send to PIB WhatsApp", link: "https://wa.me/918799711259" }
      },
      {
        id: "mis-3",
        title: "Download & Share TrustLens Context Card",
        desc: "Render and download the verified TrustLens context card. Post it in replies to expose low independent coverage and syndicated repetition.",
        primaryAction: null
      },
      {
        id: "mis-4",
        title: "Flag to Social Platform Safety Council",
        desc: "Report the post using the platform's 'Synthetic or Manipulated Media' option to trigger platform algorithmic de-amplification.",
        primaryAction: null
      }
    ]
  }
};

/**
 * Returns the relevant action protocol based on category or verdict.
 * @param {string} category - "scam" | "morphed_image" | "misinformation"
 * @returns {Object} Action protocol details
 */
export function getActionProtocol(category = "misinformation") {
  return ACTION_PROTOCOLS[category] || ACTION_PROTOCOLS.misinformation;
}
