"use client";

import { useState, useCallback, useRef } from "react";
import toast from "@/components/ui/Toast";
import { useLanguage } from "@/contexts/LanguageContext";

interface DeleteWithUndoOptions<T> {
  /** Duration in ms before permanent deletion (default: 5000) */
  undoDuration?: number;
  /** Called to perform the actual deletion */
  onDelete: (item: T) => Promise<void>;
  /** Called when deletion is undone */
  onUndo?: (item: T) => void;
  /** Message to show in toast */
  toastMessage?: string;
  /** Undo button text */
  undoText?: string;
}

interface DeleteState<T> {
  item: T;
  timeoutId: ReturnType<typeof setTimeout>;
  toastId: string;
}

export function useDeleteWithUndo<T extends { id: string }>({
  undoDuration = 5000,
  onDelete,
  onUndo,
  toastMessage,
  undoText,
}: DeleteWithUndoOptions<T>) {
  const { t } = useLanguage();
  const resolvedToastMessage = toastMessage ?? t.toasts.postDeleted;
  const resolvedUndoText = undoText ?? t.history?.undo ?? "Undo";
  const [pendingDeletes, setPendingDeletes] = useState<Map<string, DeleteState<T>>>(new Map());
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());

  // Ref to track pending items without causing re-renders
  const pendingRef = useRef<Map<string, DeleteState<T>>>(new Map());

  const scheduleDelete = useCallback(
    async (item: T) => {
      const itemId = item.id;

      // Immediately mark as deleted in UI
      setDeletedIds((prev) => new Set(prev).add(itemId));

      // Create toast with undo action
      const toastId = toast.info(resolvedToastMessage, {
        duration: undoDuration,
        action: {
          label: resolvedUndoText,
          onClick: () => {
            // Cancel deletion
            const pending = pendingRef.current.get(itemId);
            if (pending) {
              clearTimeout(pending.timeoutId);
              pendingRef.current.delete(itemId);
              setPendingDeletes(new Map(pendingRef.current));
            }

            // Restore in UI
            setDeletedIds((prev) => {
              const next = new Set(prev);
              next.delete(itemId);
              return next;
            });

            // Call onUndo callback
            onUndo?.(item);
          },
        },
      });

      // Schedule actual deletion
      const timeoutId = setTimeout(async () => {
        try {
          await onDelete(item);
        } catch (error) {
          // Restore on error
          setDeletedIds((prev) => {
            const next = new Set(prev);
            next.delete(itemId);
            return next;
          });
          toast.error(t.toasts.deleteError);
        } finally {
          // Clean up pending state
          pendingRef.current.delete(itemId);
          setPendingDeletes(new Map(pendingRef.current));
        }
      }, undoDuration);

      // Store pending delete
      const deleteState: DeleteState<T> = {
        item,
        timeoutId,
        toastId,
      };
      pendingRef.current.set(itemId, deleteState);
      setPendingDeletes(new Map(pendingRef.current));
    },
    [onDelete, onUndo, resolvedToastMessage, resolvedUndoText, undoDuration, t]
  );

  const cancelDelete = useCallback((itemId: string) => {
    const pending = pendingRef.current.get(itemId);
    if (pending) {
      clearTimeout(pending.timeoutId);
      toast.dismiss(pending.toastId);
      pendingRef.current.delete(itemId);
      setPendingDeletes(new Map(pendingRef.current));

      // Restore in UI
      setDeletedIds((prev) => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    }
  }, []);

  const cancelAllDeletes = useCallback(() => {
    pendingRef.current.forEach((pending) => {
      clearTimeout(pending.timeoutId);
      toast.dismiss(pending.toastId);
    });
    pendingRef.current.clear();
    setPendingDeletes(new Map());
    setDeletedIds(new Set());
  }, []);

  const isDeleted = useCallback(
    (itemId: string) => deletedIds.has(itemId),
    [deletedIds]
  );

  const isPending = useCallback(
    (itemId: string) => pendingRef.current.has(itemId),
    []
  );

  return {
    scheduleDelete,
    cancelDelete,
    cancelAllDeletes,
    isDeleted,
    isPending,
    deletedIds,
    pendingCount: pendingDeletes.size,
  };
}
