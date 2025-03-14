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
    <div className={`flex items-center justify-between p-4 border rounded-lg mb-2 bg-white dark:bg-gray-800 ${isUpdating || isDeleting ? 'opacity-70' : ''}`}>
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
        {isUpdating && (
          <svg className="animate-spin h-4 w-4 text-primary ml-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        )}
      </div>
      <Button
        variant="destructive"
        size="sm"
        onClick={handleDelete}
        disabled={isDeleting || isUpdating}
      >
        {isDeleting ? (
          <>
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Siliniyor...
          </>
        ) : "Sil"}
      </Button>
    </div>
  );
} 