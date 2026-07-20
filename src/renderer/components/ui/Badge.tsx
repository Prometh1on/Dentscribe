type Tone = 'neutral' | 'cyan' | 'amber' | 'red' | 'green';

const toneClasses: Record<Tone, string> = {
  neutral: 'bg-slate-700/50 text-slate-200',
  cyan: 'bg-accent-cyan/15 text-accent-cyan',
  amber: 'bg-accent-amber/15 text-accent-amber',
  red: 'bg-accent-red/15 text-accent-red',
  green: 'bg-accent-green/15 text-accent-green',
};

export function Badge({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: Tone }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${toneClasses[tone]}`}>
      {children}
    </span>
  );
}
