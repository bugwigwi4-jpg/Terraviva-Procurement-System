export const dynamic = 'force-static';

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="max-w-sm rounded-lg border border-line bg-white p-8 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/terraviva-logo.svg" alt="Terraviva" width={96} height={96} className="mx-auto mb-4 h-24 w-24" />
        <h1 className="text-xl font-bold">You are offline</h1>
        <p className="mt-2 text-sm text-mute">
          Terraviva needs an internet connection to show your requests and approvals. Check your connection and try again.
        </p>
        <a href="/" className="btn btn-primary mt-6">Try again</a>
      </div>
    </main>
  );
}
