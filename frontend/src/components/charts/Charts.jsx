import { useState, useId } from 'react';

/**
 * Small SVG chart primitives.
 *
 * Hand-rolled rather than pulling in a charting library: these three forms are
 * simple, and a library would add ~150KB to the bundle for shapes that are a
 * few dozen lines of path maths.
 *
 * Conventions that apply to all of them:
 * - One value axis. Never two — a second scale makes a chart unreadable.
 * - Colour comes from CSS custom properties, so light and dark are two
 *   validated palettes rather than an automatic flip. The `viz-*` colours are
 *   those properties; they are declared per mode on `.viz-root` in tailwind.css.
 * - Every chart has a table fallback, so identity never rests on colour.
 */

/*
 * Migrated from analytics.css.
 *
 * `font-variant-numeric` is written as an arbitrary declaration rather than
 * with the `tabular-nums` utility. That utility composes its value out of five
 * `--tw-numeric-*` variables which Preflight is what normally declares, and
 * Preflight is off here — the same way every transform utility was silently
 * dead until src/tailwind.css declared the transform variables by hand. A raw
 * declaration has no variables to be missing.
 */
const tabular = '[font-variant-numeric:tabular-nums]';

const chart = 'mx-0 mb-7 mt-0 rounded-s bg-viz-surface-2 p-5';
const chartTitle = 'mb-3 text-n font-semibold text-viz-text';
const chartTooltip = 'mt-2.5 min-h-[1.2em] text-[0.85rem] text-viz-text-soft';
const axisLabel = 'fill-viz-text-muted text-[11px]';

const formatCurrency = (value) => `₹${Math.round(value).toLocaleString('en-IN')}`;

/** A stat tile: a single headline number is not a chart. */
export const StatTile = ({ label, value, delta, format = 'number' }) => {
  const display = format === 'currency' ? formatCurrency(value) : value.toLocaleString('en-IN');

  return (
    <div className="flex flex-col gap-1 rounded-s bg-viz-surface-2 p-4">
      <span className="text-[0.85rem] text-viz-text-soft">{label}</span>
      <strong className={`text-[1.6rem] font-bold text-viz-text ${tabular}`}>{display}</strong>
      {delta !== null && delta !== undefined && (
        // The arrow in the markup carries direction; colour only reinforces it.
        <span className={`text-[0.8rem] ${delta >= 0 ? 'text-viz-good' : 'text-viz-critical'}`}>
          {delta >= 0 ? '▲' : '▼'} {Math.abs(delta)}% vs previous period
        </span>
      )}
    </div>
  );
};

/**
 * Revenue over time, as an area with a 2px line.
 *
 * Deliberately plots revenue alone. Overlaying order count would need a second
 * y-scale, which is the single most misleading thing a chart can do.
 */
export const RevenueChart = ({ series }) => {
  const [hover, setHover] = useState(null);
  const gradientId = useId();

  const width = 720;
  const height = 240;
  const padding = { top: 16, right: 16, bottom: 28, left: 56 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  const max = Math.max(...series.map((point) => point.revenue), 1);
  const stepX = series.length > 1 ? plotWidth / (series.length - 1) : 0;

  const x = (index) => padding.left + index * stepX;
  const y = (value) => padding.top + plotHeight - (value / max) * plotHeight;

  const line = series.map((point, index) => `${x(index)},${y(point.revenue)}`).join(' ');
  const area = `${padding.left},${padding.top + plotHeight} ${line} ${x(series.length - 1)},${
    padding.top + plotHeight
  }`;

  // Four gridlines is enough to read a value without competing with the data.
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((fraction) => ({
    value: max * fraction,
    y: y(max * fraction),
  }));

  return (
    <figure className={chart}>
      <figcaption className={chartTitle}>Revenue per day</figcaption>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`Revenue per day over the last ${series.length} days`}
        className="h-auto w-full overflow-visible"
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--series-1)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--series-1)" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Grid and axes stay recessive so the data reads first. */}
        {ticks.map((tick) => (
          <g key={tick.value}>
            <line
              x1={padding.left}
              x2={width - padding.right}
              y1={tick.y}
              y2={tick.y}
              className="stroke-viz-grid stroke-1"
            />
            <text x={padding.left - 8} y={tick.y + 4} textAnchor="end" className={axisLabel}>
              {formatCurrency(tick.value)}
            </text>
          </g>
        ))}

        <polygon points={area} fill={`url(#${gradientId})`} />
        {/* `strokeLinejoin` and `strokeLinecap` are SVG presentation attributes
            rather than utilities: there is no core utility for either, and an
            attribute is plainer than two arbitrary declarations. Nothing in the
            cascade competes with them now that analytics.css is gone. */}
        <polyline
          points={line}
          className="fill-none stroke-viz-series-1 stroke-2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Invisible full-height bands give a hit target far larger than the
            2px line, so hovering does not require pixel precision. */}
        {series.map((point, index) => (
          <rect
            key={point.date}
            x={x(index) - stepX / 2}
            y={padding.top}
            width={stepX || plotWidth}
            height={plotHeight}
            fill="transparent"
            onMouseEnter={() => setHover({ ...point, index })}
          />
        ))}

        {hover && (
          <g>
            <line
              x1={x(hover.index)}
              x2={x(hover.index)}
              y1={padding.top}
              y2={padding.top + plotHeight}
              className="stroke-viz-text-muted stroke-1"
              strokeDasharray="3 3"
            />
            {/* A surface ring keeps the marker legible over the area fill. */}
            <circle
              cx={x(hover.index)}
              cy={y(hover.revenue)}
              r="5"
              className="fill-viz-series-1 stroke-viz-surface-2 stroke-2"
            />
          </g>
        )}

        <text x={padding.left} y={height - 8} className={axisLabel} textAnchor="start">
          {series[0]?.date}
        </text>
        <text x={width - padding.right} y={height - 8} className={axisLabel} textAnchor="end">
          {series.at(-1)?.date}
        </text>
      </svg>

      <div className={chartTooltip} role="status">
        {hover
          ? `${hover.date}: ${formatCurrency(hover.revenue)} from ${hover.orders} order${
              hover.orders === 1 ? '' : 's'
            }`
          : 'Hover the chart for a specific day'}
      </div>
    </figure>
  );
};

/** Best sellers, as horizontal bars — long product names need the room. */
export const TopItemsChart = ({ items }) => {
  if (items.length === 0) {
    return (
      <figure className={chart}>
        <figcaption className={chartTitle}>Best sellers</figcaption>
        <p className="text-s text-viz-text-muted">No sales in this period yet.</p>
      </figure>
    );
  }

  const max = Math.max(...items.map((item) => item.unitsSold));

  return (
    <figure className={chart}>
      <figcaption className={chartTitle}>Best sellers by units</figcaption>

      <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
        {items.map((item) => (
          <li
            key={item.menuItem}
            className="grid grid-cols-[minmax(90px,1fr)_2fr_auto] items-center gap-2.5 text-[0.85rem] to-600:grid-cols-1 to-600:gap-1"
          >
            <span className="overflow-hidden text-ellipsis whitespace-nowrap text-viz-text-soft">
              {item.name}
            </span>
            <span className="block h-[14px] overflow-hidden rounded-[4px] bg-viz-grid">
              {/* Rounded data-end only, anchored to the baseline. */}
              <span
                className="block h-full rounded-r-[4px] bg-viz-series-1"
                style={{ width: `${(item.unitsSold / max) * 100}%` }}
              />
            </span>
            {/* Direct labels, so the value never depends on reading the axis. */}
            <span className={`whitespace-nowrap text-viz-text-muted ${tabular}`}>
              {item.unitsSold} · {formatCurrency(item.revenue)}
            </span>
          </li>
        ))}
      </ul>
    </figure>
  );
};

/** Order volume by hour, as columns. */
export const PeakHoursChart = ({ hours }) => {
  const [hover, setHover] = useState(null);
  const max = Math.max(...hours.map((point) => point.orders), 1);

  const busiest = hours.reduce(
    (best, point) => (point.orders > best.orders ? point : best),
    hours[0]
  );

  return (
    <figure className={chart}>
      <figcaption className={chartTitle}>Orders by hour of day</figcaption>

      {/* gap-0.5 is the 2px surface gap between adjacent marks. */}
      <div
        className="flex h-[160px] items-end gap-0.5 pb-[18px]"
        onMouseLeave={() => setHover(null)}
      >
        {hours.map((point) => (
          <div
            key={point.hour}
            className="relative flex h-full flex-1 items-end"
            onMouseEnter={() => setHover(point)}
            title={`${point.hour}:00 — ${point.orders} orders`}
          >
            <div
              className={`min-h-[2px] w-full rounded-t-[4px] ${
                point.hour === busiest.hour && point.orders > 0
                  ? 'bg-viz-series-2'
                  : 'bg-viz-series-1'
              }`}
              style={{ height: `${(point.orders / max) * 100}%` }}
            />
            {point.hour % 6 === 0 && (
              <span className="absolute -bottom-[18px] left-0 whitespace-nowrap text-[10px] text-viz-text-muted">
                {point.hour}:00
              </span>
            )}
          </div>
        ))}
      </div>

      <div className={chartTooltip} role="status">
        {hover
          ? `${String(hover.hour).padStart(2, '0')}:00 — ${hover.orders} order${
              hover.orders === 1 ? '' : 's'
            }`
          : busiest.orders > 0
            ? `Busiest hour: ${String(busiest.hour).padStart(2, '0')}:00`
            : 'No orders in this period'}
      </div>
    </figure>
  );
};
