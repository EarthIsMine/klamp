export function Mark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <rect x="1" y="1" width="26" height="26" rx="5" fill="#E85D24" />
      <path d="M7.5 6.5V21.5M20.5 6.5V21.5M7.5 14H20.5" stroke="white" strokeWidth="2.4" strokeLinecap="square" />
      <path d="M10.5 10.5H17.5V17.5H10.5V10.5Z" fill="#E85D24" stroke="white" strokeWidth="1.8" />
    </svg>
  );
}
