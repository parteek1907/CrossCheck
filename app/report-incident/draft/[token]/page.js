import { Suspense } from "react";
import Link from "next/link";
import { Lock } from "lucide-react";
import { getIncidentDraft } from "../../../../lib/dummyStore.js";
import DraftReviewClient from "./DraftReviewClient";

export default async function DraftPage({ params }) {
  const resolvedParams = await params;
  const token = resolvedParams?.token;
  const draft = token ? getIncidentDraft(token) : null;

  if (!draft) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] text-gray-900 flex items-center justify-center p-6">
        <div className="max-w-md w-full p-8 bg-white border border-black/15 rounded-3xl shadow-sm text-center space-y-5">
          <div className="w-14 h-14 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto text-amber-700">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="font-serif text-2xl font-bold text-gray-900">Invalid Incident Link</h2>
          <p className="text-xs text-gray-600 leading-relaxed">
            This incident review link is invalid or has expired. If you need a new complaint pack, send another message on WhatsApp or start an online intake.
          </p>
          <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/report-incident"
              className="px-5 py-2.5 rounded-xl bg-black text-white hover:bg-black/85 text-xs font-bold transition shadow-xs"
            >
              Start New Report
            </Link>
            <Link
              href="/dashboard"
              className="px-5 py-2.5 rounded-xl border border-black/15 bg-white hover:bg-black/5 text-xs font-bold transition text-gray-800"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (draft.status === "consumed") {
    return (
      <div className="min-h-screen bg-[#FDFBF7] text-gray-900 flex items-center justify-center p-6">
        <div className="max-w-md w-full p-8 bg-white border border-black/15 rounded-3xl shadow-sm text-center space-y-5">
          <div className="w-14 h-14 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto text-amber-700">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="font-serif text-2xl font-bold text-gray-900">Link Single-Use Expired</h2>
          <p className="text-xs text-gray-600 leading-relaxed">
            For your privacy and security, Crosscheck WhatsApp review links are single-use and expire once accessed. If you need a new complaint pack, send another message on WhatsApp or start an online intake.
          </p>
          <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/report-incident"
              className="px-5 py-2.5 rounded-xl bg-black text-white hover:bg-black/85 text-xs font-bold transition shadow-xs"
            >
              Start New Report
            </Link>
            <Link
              href="/dashboard"
              className="px-5 py-2.5 rounded-xl border border-black/15 bg-white hover:bg-black/5 text-xs font-bold transition text-gray-800"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center text-xs font-bold text-gray-500">
          Loading incident review...
        </div>
      }
    >
      <DraftReviewClient initialDraft={draft} token={token} />
    </Suspense>
  );
}
