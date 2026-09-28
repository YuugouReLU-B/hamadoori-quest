"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DeleteAccountModal } from "@/features/user-settings/components/delete-account-modal";

export function AccountDeletionSection() {
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  return (
    <>
      <div className="w-full pt-4">
        <Button
          type="button"
          variant="ghost"
          className="w-full"
          onClick={() => setIsDeleteModalOpen(true)}
        >
          浜通りクエストを退会する
        </Button>
      </div>
      <DeleteAccountModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
      />
    </>
  );
}
