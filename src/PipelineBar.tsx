/** A bounded SVG bar. Labels and the complete chart description live in App. */
export default function PipelineBar({ count, maximum, color }: { count: number; maximum: number; color: string }) {
  const height = Math.max(0, Math.min(100, count / Math.max(1, maximum) * 100))
  return <svg className="bar-track" viewBox="0 0 68 100" preserveAspectRatio="none" aria-hidden="true">
    <rect width="68" height="100" rx="4" fill="#f5f6f2" />
    {height > 0 && <rect x="0" y={100 - height} width="68" height={height} rx="4" fill={color} opacity="0.85" />}
  </svg>
}
