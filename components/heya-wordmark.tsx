export function HeyaWordmark({ compact = false }: { compact?: boolean }) {
  return (
    <span className={compact ? "heya-wordmark heya-stamp" : "heya-wordmark"} aria-hidden="true">
      <span>heya</span>
      {!compact && <small>cards</small>}
    </span>
  );
}
