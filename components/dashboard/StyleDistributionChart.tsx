"use client";

interface StyleDistributionChartProps {
  data: { style: string; count: number }[];
}

export default function StyleDistributionChart({ data }: StyleDistributionChartProps) {
  const total = data.reduce((sum, d) => sum + d.count, 0);

  const getPercentage = (count: number) => {
    if (total === 0) return 0;
    return Math.round((count / total) * 100);
  };

  // Dark mode premium color palette avec bordures subtiles
  const styleColors: Record<string, { bg: string; bar: string; border: string; text: string }> = {
    Storytelling: {
      bg: "bg-accent/[0.12]",
      bar: "bg-gradient-to-r from-accent to-accent-light",
      border: "border-accent/25",
      text: "text-accent",
    },
    Business: {
      bg: "bg-primary/[0.12]",
      bar: "bg-gradient-to-r from-primary to-primary-light",
      border: "border-primary/25",
      text: "text-primary",
    },
  };

  return (
    <div className="bg-dashboard-card border border-dashboard-card-border rounded-2xl p-6 hover:border-primary/10 transition-colors duration-300">
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-text-primary">Repartition des styles</h3>
        <p className="text-text-muted text-sm">Versions choisies</p>
      </div>

      {/* Distribution bars */}
      <div className="space-y-4">
        {data.map((item) => {
          const percentage = getPercentage(item.count);
          const colors = styleColors[item.style] || {
            bg: "bg-text-muted/10",
            bar: "bg-text-muted",
            border: "border-text-muted/20",
            text: "text-text-muted",
          };

          return (
            <div key={item.style} className="group">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${colors.bar} ring-2 ring-offset-1 ring-offset-dashboard-card ${colors.border}`} />
                  <span className="text-sm text-text-secondary font-medium group-hover:text-text-primary transition-colors">{item.style}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-text-muted">{item.count} posts</span>
                  <span className={`text-sm font-semibold ${colors.text}`}>{percentage}%</span>
                </div>
              </div>
              {/* Progress bar avec hauteur augmentée et effet premium */}
              <div className={`h-3 rounded-full ${colors.bg} overflow-hidden border ${colors.border}`}>
                <div
                  className={`h-full rounded-full ${colors.bar} transition-all duration-700 ease-out`}
                  style={{ width: `${Math.max(percentage, percentage > 0 ? 3 : 0)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty state */}
      {total === 0 && (
        <div className="text-center py-8">
          <div className="w-12 h-12 mx-auto mb-3 bg-dashboard-surface-1 rounded-full flex items-center justify-center border border-dashboard-card-border">
            <svg className="w-6 h-6 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
            </svg>
          </div>
          <p className="text-text-muted text-sm">
            Aucune version selectionnee pour le moment
          </p>
        </div>
      )}

      {/* Donut visualization - Premium design */}
      {total > 0 && (
        <div className="mt-8 flex items-center justify-center">
          <div className="relative w-36 h-36">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              {/* Background circle - plus visible */}
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="currentColor"
                strokeWidth="10"
                className="text-dashboard-surface-2"
              />
              {/* Storytelling segment */}
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="url(#accentGradient)"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={`${getPercentage(data[0]?.count || 0) * 2.51} 251`}
                className="transition-all duration-700 drop-shadow-[0_0_6px_rgba(248,87,81,0.4)]"
              />
              {/* Business segment */}
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="url(#primaryGradient)"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={`${getPercentage(data[1]?.count || 0) * 2.51} 251`}
                strokeDashoffset={`-${getPercentage(data[0]?.count || 0) * 2.51}`}
                className="transition-all duration-700 drop-shadow-[0_0_6px_rgba(248,163,93,0.4)]"
              />
              {/* Gradient definitions - Logo colors */}
              <defs>
                <linearGradient id="accentGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#F85751" />
                  <stop offset="100%" stopColor="#FAB9AD" />
                </linearGradient>
                <linearGradient id="primaryGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#E8934D" />
                  <stop offset="100%" stopColor="#F8A35D" />
                </linearGradient>
              </defs>
            </svg>
            {/* Center content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold text-text-primary">{total}</span>
              <span className="text-xs text-text-muted font-medium">total</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
