"use client";

import { CopyAddress } from "./copy-address";

const ADDRESS_RE = /(0x[a-fA-F0-9]{40})/g;

export function CopyableText({
  text,
  className = "text-sm leading-6 text-ink",
}: {
  text: string;
  className?: string;
}) {
  const parts = text.split(ADDRESS_RE);
  if (parts.length === 1) {
    return <span className={className}>{text}</span>;
  }

  return (
    <span className={`${className} inline-flex flex-wrap items-center gap-x-1.5 gap-y-1`}>
      {parts.map((part, index) =>
        /^0x[a-fA-F0-9]{40}$/.test(part) ? (
          <CopyAddress key={`${part}-${index}`} address={part} />
        ) : part ? (
          <span key={`${index}-${part.slice(0, 12)}`}>{part}</span>
        ) : null,
      )}
    </span>
  );
}
