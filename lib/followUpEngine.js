// Crosscheck - Follow-Up Question Engine
// Prioritizes missing critical fields: transaction_ids -> date_time -> scammer_phone_or_upi -> bank_name -> amount_inr

export const FOLLOW_UP_PRIORITIES = [
  {
    key: "transaction_ids",
    checkMissing: (inc) => !inc.transaction_ids || inc.transaction_ids.length === 0,
    question: {
      en: "Do you have the 12-digit UTR or Transaction Reference ID from your bank SMS or payment app?",
      hi: "क्या आपके पास अपने बैंक SMS या पेमेंट रसीद से 12-अंकों का UTR या Transaction ID है?",
    },
    placeholder: {
      en: "e.g. 410982736451",
      hi: "जैसे 410982736451",
    },
    hint: {
      en: "Helps 1930 and bank nodal officers track and freeze the beneficiary account.",
      hi: "यह 1930 और बैंक को तुरंत जालसाज के खाते को फ्रीज करने में मदद करता है।",
    },
    applyAnswer: (inc, answer) => {
      const utrMatch = answer.match(/\b(?:\d{12}|[A-Z0-9]{10,22})\b/g);
      const ids = utrMatch || [answer.trim()];
      return {
        ...inc,
        transaction_ids: ids,
        missing_fields: inc.missing_fields.filter((f) => f !== "transaction_ids"),
      };
    },
  },
  {
    key: "date_time",
    checkMissing: (inc) => !inc.date_time,
    question: {
      en: "Approximately what date and time did the payment or incident occur?",
      hi: "यह लेन-देन या घटना लगभग किस तारीख और समय पर हुई थी?",
    },
    placeholder: {
      en: "e.g. Today at 10:30 AM",
      hi: "जैसे आज सुबह 10:30 बजे",
    },
    hint: {
      en: "Reporting within the first few hours (the golden hour) drastically increases recovery chances.",
      hi: "घटना के शुरुआती कुछ घंटों (गोल्डन आवर) में रिपोर्ट करने से पैसे वापस मिलने की संभावना बढ़ जाती है।",
    },
    applyAnswer: (inc, answer) => ({
      ...inc,
      date_time: answer.trim(),
      missing_fields: inc.missing_fields.filter((f) => f !== "date_time"),
    }),
  },
  {
    key: "scammer_phone_or_upi",
    checkMissing: (inc) =>
      (!inc.scammer_identifiers?.phones || inc.scammer_identifiers.phones.length === 0) &&
      (!inc.scammer_identifiers?.upi_ids || inc.scammer_identifiers.upi_ids.length === 0),
    question: {
      en: "Do you know the scammer's phone number or the recipient UPI ID where the money was sent?",
      hi: "क्या आपके पास जालसाज का फोन नंबर या वह UPI ID है जिस पर पैसे भेजे गए थे?",
    },
    placeholder: {
      en: "e.g. +91 9876543210 or fraudster@oksbi",
      hi: "जैसे 9876543210 या fraudster@oksbi",
    },
    hint: {
      en: "Essential for telecom blacklisting and cybercrime database matching.",
      hi: "सिम ब्लॉक करने और साइबर अपराध डेटाबेस मिलान के लिए आवश्यक।",
    },
    applyAnswer: (inc, answer) => {
      const updated = { ...inc, scammer_identifiers: { ...inc.scammer_identifiers } };
      const phones = answer.match(/(?:\+91[\s-]?)?[6-9]\d{9}/g) || [];
      const upis = answer.match(/[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}/g) || [];

      if (phones.length > 0) {
        updated.scammer_identifiers.phones = Array.from(new Set([...(updated.scammer_identifiers.phones || []), ...phones]));
      }
      if (upis.length > 0) {
        updated.scammer_identifiers.upi_ids = Array.from(new Set([...(updated.scammer_identifiers.upi_ids || []), ...upis]));
      }
      if (phones.length === 0 && upis.length === 0 && answer.trim()) {
        if (answer.includes("@")) {
          updated.scammer_identifiers.upi_ids = [answer.trim()];
        } else {
          updated.scammer_identifiers.phones = [answer.trim()];
        }
      }
      updated.missing_fields = updated.missing_fields.filter((f) => f !== "scammer_phone_or_upi");
      return updated;
    },
  },
  {
    key: "bank_name",
    checkMissing: (inc) => !inc.bank_name,
    question: {
      en: "Which bank or payment app (e.g. SBI, HDFC, Google Pay, PhonePe) did you send the payment from?",
      hi: "पैसे भेजने के लिए आपने किस बैंक या पेमेंट ऐप (जैसे SBI, HDFC, Google Pay) का उपयोग किया था?",
    },
    placeholder: {
      en: "e.g. HDFC Bank / Google Pay",
      hi: "जैसे HDFC बैंक / Google Pay",
    },
    hint: {
      en: "Required to format your dispute letter to your bank's nodal fraud officer.",
      hi: "आपके बैंक के नोडल धोखाधड़ी अधिकारी को विवाद पत्र तैयार करने के लिए आवश्यक।",
    },
    applyAnswer: (inc, answer) => ({
      ...inc,
      bank_name: answer.trim().toUpperCase(),
      missing_fields: inc.missing_fields.filter((f) => f !== "bank_name"),
    }),
  },
  {
    key: "amount_inr",
    checkMissing: (inc) => inc.amount_inr === null || inc.amount_inr === undefined,
    question: {
      en: "How much total money in Rupees was lost or transferred?",
      hi: "कुल कितने रुपये का नुकसान हुआ या ट्रांसफर किए गए?",
    },
    placeholder: {
      en: "e.g. 50000",
      hi: "जैसे 50000",
    },
    hint: {
      en: "Police and banks require the exact reported transaction amount.",
      hi: "पुलिस और बैंकों को सटीक राशि दर्ज करने की आवश्यकता होती है।",
    },
    applyAnswer: (inc, answer) => {
      const num = parseFloat(answer.replace(/[^0-9.]/g, ""));
      return {
        ...inc,
        amount_inr: isNaN(num) ? null : num,
        missing_fields: inc.missing_fields.filter((f) => f !== "amount_inr"),
      };
    },
  },
];

/**
 * Gets the next highest-priority missing question for the incident.
 * Returns null if all questions are answered or skipped.
 */
export function getNextFollowUpQuestion(incident, skippedKeys = []) {
  if (!incident) return null;

  for (const item of FOLLOW_UP_PRIORITIES) {
    if (!skippedKeys.includes(item.key) && item.checkMissing(incident)) {
      return item;
    }
  }

  return null;
}

/**
 * Returns total count of prioritized missing fields to show progress (e.g. Question 1 of 3)
 */
export function countMissingFollowUps(incident) {
  if (!incident) return 0;
  return FOLLOW_UP_PRIORITIES.filter((item) => item.checkMissing(incident)).length;
}
