'use client';

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#FFFAF8] px-4">
      <div className="text-center">
        <div className="mb-6 text-6xl">
          <span role="img" aria-label="offline">
            📴
          </span>
        </div>
        <h1 className="mb-4 text-3xl font-bold text-[#2D3436]">
          You&apos;re Offline
        </h1>
        <p className="mb-8 text-lg text-[#636e72]">
          It looks like you&apos;ve lost your internet connection.
          <br />
          Please check your connection and try again.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="rounded-full bg-[#FF6B35] px-8 py-3 font-semibold text-white transition-colors hover:bg-[#e55a2b]"
        >
          Try Again
        </button>
      </div>
      <p className="mt-12 text-sm text-[#636e72]">
        Oja - Budget-First Shopping Confidence
      </p>
    </div>
  );
}
