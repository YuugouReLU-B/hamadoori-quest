"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type Props = {
  token: string;
};

export function CopyTokenButton({ token }: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button onClick={handleCopy} className="w-full" variant="outline">
      {copied ? "コピーしました！" : "コードをコピー"}
    </Button>
  );
}
