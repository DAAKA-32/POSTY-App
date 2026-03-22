"use client";

/**
 * FullScreenTextEditor — backward-compatible wrapper around MobileFullScreenEditor.
 *
 * Existing callers pass `onChange` (called on save) instead of a separate `onSave`.
 * This adapter maps the old API to the new component.
 */

import MobileFullScreenEditor from "./MobileFullScreenEditor";

interface FullScreenTextEditorProps {
  isOpen: boolean;
  onClose: () => void;
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  maxLength?: number;
  platformLimits?: { name: string; limit: number }[];
  title?: string;
}

export default function FullScreenTextEditor({
  isOpen,
  onClose,
  content,
  onChange,
  placeholder,
  platformLimits,
  title,
}: FullScreenTextEditorProps) {
  return (
    <MobileFullScreenEditor
      isOpen={isOpen}
      onClose={onClose}
      onSave={onChange}
      content={content}
      placeholder={placeholder}
      platformLimits={platformLimits}
      title={title}
    />
  );
}
