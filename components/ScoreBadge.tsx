interface ScoreBadgeProps {
  score: number;
  fitLevel?: string;
  size?: 'sm' | 'md';
}

export default function ScoreBadge({ score, fitLevel, size = 'md' }: ScoreBadgeProps) {
  const level = fitLevel || (score >= 7 ? 'High' : score >= 4 ? 'Medium' : 'Low');

  const colors = {
    High: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    Medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    Low: 'bg-red-500/20 text-red-400 border-red-500/30',
  };

  const sizeClass = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-semibold ${colors[level as keyof typeof colors]} ${sizeClass}`}
    >
      <span className="font-bold">{score}/10</span>
      <span className="opacity-75">{level}</span>
    </span>
  );
}
