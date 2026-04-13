"use client";
import Image from "next/image";
import { ReactNode } from "react";

interface Props {
  title: string;
  description?: string;
  emoji?: string;
  action?: ReactNode;
}

export default function EmptyState({ title, description, emoji, action }: Props) {
  return (
    <div className="text-center py-12 px-4">
      <div className="relative inline-block mb-3">
        <Image src="/icons/icon-192.png" alt="Rizup" width={72} height={72}
          className="rounded-full opacity-70 animate-sho-float mx-auto" />
        {emoji && (
          <span className="absolute -top-1 -right-1 text-xl bg-white rounded-full w-8 h-8 flex items-center justify-center shadow-md border border-gray-100">
            {emoji}
          </span>
        )}
      </div>
      <p className="text-sm font-extrabold mb-1">{title}</p>
      {description && <p className="text-xs text-text-light mb-4 max-w-xs mx-auto">{description}</p>}
      {action}
    </div>
  );
}
