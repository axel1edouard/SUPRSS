export function ButterflyLogo({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <rect x="30" y="22" width="4" height="20" rx="2" fill="var(--brand-700)" />
      <ellipse cx="22" cy="28" rx="14" ry="10" fill="var(--brand-300)" />
      <ellipse cx="42" cy="28" rx="14" ry="10" fill="var(--brand-400)" />
      <ellipse cx="24" cy="40" rx="12" ry="9" fill="var(--brand-200)" />
      <ellipse cx="40" cy="40" rx="12" ry="9" fill="var(--brand-300)" />
    </svg>
  );
}
