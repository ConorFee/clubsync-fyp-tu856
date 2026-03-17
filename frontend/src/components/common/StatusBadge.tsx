interface ColorConfig {
  bg: string;
  text: string;
}

const DEFAULT_COLOR_MAP: Record<string, ColorConfig> = {
  pending:     { bg: 'var(--cs-blue-100)',   text: 'var(--cs-blue-700)' },
  scheduled:   { bg: 'var(--cs-green-100)',  text: 'var(--cs-green-600)' },
  published:   { bg: 'var(--cs-green-100)',  text: 'var(--cs-green-600)' },
  approved:    { bg: 'var(--cs-green-100)',  text: 'var(--cs-green-600)' },
  available:   { bg: 'var(--cs-green-100)',  text: 'var(--cs-green-600)' },
  partial:     { bg: 'var(--cs-orange-100)', text: 'var(--cs-orange-600)' },
  conflicting: { bg: 'var(--cs-orange-100)', text: 'var(--cs-orange-600)' },
  maintenance: { bg: 'var(--cs-orange-100)', text: 'var(--cs-orange-600)' },
  rejected:    { bg: 'var(--cs-red-100)',    text: 'var(--cs-red-600)' },
  cancelled:   { bg: 'var(--cs-red-100)',    text: 'var(--cs-red-600)' },
};

interface StatusBadgeProps {
  status: string;
  colorMap?: Record<string, ColorConfig>;
}

export default function StatusBadge({ status, colorMap }: StatusBadgeProps) {
  const map = colorMap ?? DEFAULT_COLOR_MAP;
  const colors = map[status.toLowerCase()] ?? { bg: 'var(--cs-gray-100)', text: 'var(--cs-gray-600)' };

  return (
    <span
      style={{
        backgroundColor: colors.bg,
        color: colors.text,
        padding: '2px 10px',
        borderRadius: '9999px',
        fontSize: '0.75rem',
        fontWeight: 600,
        textTransform: 'capitalize',
        whiteSpace: 'nowrap',
      }}
    >
      {status}
    </span>
  );
}
