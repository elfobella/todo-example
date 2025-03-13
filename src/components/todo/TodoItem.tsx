"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface TodoItemProps {
  id: string;
  task: string;
  is_complete: boolean;
  onDelete: (id: string) => void;
  onUpdate: (id: string, is_complete: boolean) => void;
}

export default function TodoItem({
  id,
  task,
  is_complete,
  onDelete,
  onUpdate,
}: TodoItemProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleToggleComplete = async () => {
    setIsUpdating(true);
    try {
      onUpdate(id, !is_complete);
    } catch (error: any) {
      toast.error(error.message || "Görev güncellenirken bir hata oluştu.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      onDelete(id);
    } catch (error: any) {
      toast.error(error.message || "Görev silinirken bir hata oluştu.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg mb-2 bg-white dark:bg-gray-800">
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={is_complete}
          onChange={handleToggleComplete}
          disabled={isUpdating}
          className="h-5 w-5 rounded border-gray-300"
        />
        <span
          className={`text-sm ${
            is_complete ? "line-through text-gray-500" : ""
          }`}
        >
          {task}
        </span>
      </div>
      <Button
        variant="destructive"
        size="sm"
        onClick={handleDelete}
        disabled={isDeleting}
      >
        {isDeleting ? "Siliniyor..." : "Sil"}
      </Button>
    </div>
  );
} 