"use client";

interface DateDividerProps {
  date: string;
  count?: number;
}

export default function DateDivider({ date, count }: DateDividerProps) {
  return (
    <div className="flex items-center gap-3 py-3">
      <div className="flex items-center gap-2">
        <span className="text-xs lg:text-sm font-semibold text-primary uppercase tracking-wider">
          {date}
        </span>
        {count !== undefined && (
          <span className="text-xs text-text-muted">
            ({count})
          </span>
        )}
      </div>
      <div className="flex-1 h-px bg-dark-border" />
    </div>
  );
}
