"use client";
import Image from "next/image";

interface Props {
  message?: string;
  fullscreen?: boolean;
}

export default function Loading({ message, fullscreen = true }: Props) {
  const wrapperClass = fullscreen
    ? "min-h-screen bg-bg flex flex-col items-center justify-center"
    : "flex flex-col items-center justify-center py-8";
  return (
    <div className={wrapperClass} role="status" aria-live="polite">
      <Image src="/sho.png" alt="Sho" width={56} height={56}
        className="rounded-full animate-sho-float" />
      {message && <p className="text-xs text-text-mid mt-3">{message}</p>}
      <span className="sr-only">読み込み中</span>
    </div>
  );
}
