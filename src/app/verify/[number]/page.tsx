import { createClient } from '@/lib/supabase/server';
import { formatDate, label } from '@/lib/format';

export const dynamic = 'force-dynamic';

// Public page opened by scanning the QR code on a printed document.
export default async function VerifyPage({ params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  const docNumber = decodeURIComponent(number);
  const supabase = await createClient();
  const { data } = await supabase.rpc('verify_document', { p_doc_number: docNumber });
  const doc = Array.isArray(data) ? data[0] : null;
  const valid = doc && ['approved', 'sent', 'partially_received', 'received', 'closed', 'confirmed'].includes(doc.status);

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md rounded-lg border border-line bg-white p-8 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/terraviva-logo.png" alt="Terraviva" width={96} height={96} className="mx-auto mb-4 h-24 w-24" />
        {doc ? (
          <>
            <h1 className={`text-xl font-bold ${valid ? 'text-leaf' : 'text-alert'}`}>
              {valid ? 'Genuine Terraviva document' : 'Document found, but not in force'}
            </h1>
            <dl className="mt-5 space-y-2 text-sm">
              <div><dt className="text-mute">Type</dt><dd className="font-semibold">{doc.doc_type}</dd></div>
              <div><dt className="text-mute">Number</dt><dd className="font-semibold">{doc.doc_number}</dd></div>
              <div><dt className="text-mute">Status</dt><dd className="font-semibold">{label(doc.status)}</dd></div>
              <div><dt className="text-mute">Issued</dt><dd className="font-semibold">{formatDate(doc.issued_on)}</dd></div>
              {doc.approved_on && <div><dt className="text-mute">Approved</dt><dd className="font-semibold">{formatDate(doc.approved_on)}</dd></div>}
            </dl>
          </>
        ) : (
          <>
            <h1 className="text-xl font-bold text-alert">No matching document</h1>
            <p className="mt-2 text-sm text-mute">{docNumber} is not in the Terraviva records. Treat the paper copy as unverified.</p>
          </>
        )}
      </div>
    </main>
  );
}
