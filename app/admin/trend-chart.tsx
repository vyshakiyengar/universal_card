export type ChartPoint = { label: string; value: number };

// A small bar chart drawn in SVG, with a hover title on each bar.
export function TrendChart({ title, unit, color, points, total, totalLabel = "in range" }: {
  title: string; unit: string; color: string; points: ChartPoint[]; total: number; totalLabel?: string;
}) {
  const width = 360, height = 120, gap = points.length > 60 ? 0.5 : 1.5;
  const max = Math.max(1, ...points.map((point) => point.value));
  const barWidth = Math.max(1, (width - gap * (points.length - 1)) / Math.max(1, points.length));
  const peak = points.reduce((best, point) => (point.value > best.value ? point : best), { label: "", value: 0 });
  return (
    <figure className="trend">
      <figcaption>
        <span>{title}</span>
        <strong>{total.toLocaleString("en-GB")}</strong>
        <small>{totalLabel} · {unit}{peak.value ? ` · peak ${peak.value.toLocaleString("en-GB")}` : ""}</small>
      </figcaption>
      <svg viewBox={`0 0 ${width} ${height + 2}`} preserveAspectRatio="none" role="img" aria-label={`${title}, ${unit}`}>
        <line x1="0" x2={width} y1={height + 1} y2={height + 1} stroke="#dfddd4" />
        {points.map((point, index) => {
          const h = point.value ? Math.max(2, (point.value / max) * height) : 0;
          return (
            <rect key={point.label} x={index * (barWidth + gap)} y={height - h} width={barWidth} height={h} rx={barWidth > 4 ? 1.5 : 0} fill={color}>
              <title>{`${point.label}: ${point.value.toLocaleString("en-GB")}`}</title>
            </rect>
          );
        })}
      </svg>
      <div className="trend-axis"><span>{points[0]?.label.split(" → ")[0]}</span><span>{points[points.length - 1]?.label.split(" → ").pop()}</span></div>
    </figure>
  );
}
