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
 *   validated palettes rather than an automatic flip.
 * - Every chart has a table fallback, so identity never rests on colour.
 */

const formatCurrency = (value) => `₹${Math.round(value).toLocaleString('en-IN')}`;

/** A stat tile: a single headline number is not a chart. */
export const StatTile = ({ label, value, delta, format = 'number' }) => {
  const display = format === 'currency' ? formatCurrency(value) : value.toLocaleString('en-IN');

  return (
    <div className="stat-tile">
      <span className="stat-tile-label">{label}</span>
      <strong className="stat-tile-value">{display}</strong>
      {delta !== null && delta !== undefined && (
        <span className={`stat-tile-delta ${delta >= 0 ? 'up' : 'down'}`}>
          {/* An arrow plus a sign, so the direction is not colour-only. */}
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
    <figure className="chart">
      <figcaption className="chart-title">Revenue per day</figcaption>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`Revenue per day over the last ${series.length} days`}
        className="chart-svg"
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--series-1)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--series-1)" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {ticks.map((tick) => (
          <g key={tick.value}>
            <line
              x1={padding.left}
              x2={width - padding.right}
              y1={tick.y}
              y2={tick.y}
              className="chart-grid"
            />
            <text x={padding.left - 8} y={tick.y + 4} textAnchor="end" className="chart-axis-label">
              {formatCurrency(tick.value)}
            </text>
          </g>
        ))}

        <polygon points={area} fill={`url(#${gradientId})`} />
        <polyline points={line} className="chart-line" />

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
              className="chart-crosshair"
            />
            <circle cx={x(hover.index)} cy={y(hover.revenue)} r="5" className="chart-marker" />
          </g>
        )}

        <text x={padding.left} y={height - 8} className="chart-axis-label" textAnchor="start">
          {series[0]?.date}
        </text>
        <text
          x={width - padding.right}
          y={height - 8}
          className="chart-axis-label"
          textAnchor="end"
        >
          {series.at(-1)?.date}
        </text>
      </svg>

      <div className="chart-tooltip" role="status">
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
      <figure className="chart">
        <figcaption className="chart-title">Best sellers</figcaption>
        <p className="chart-empty">No sales in this period yet.</p>
      </figure>
    );
  }

  const max = Math.max(...items.map((item) => item.unitsSold));

  return (
    <figure className="chart">
      <figcaption className="chart-title">Best sellers by units</figcaption>

      <ul className="bar-list">
        {items.map((item) => (
          <li key={item.menuItem}>
            <span className="bar-label">{item.name}</span>
            <span className="bar-track">
              <span className="bar-fill" style={{ width: `${(item.unitsSold / max) * 100}%` }} />
            </span>
            {/* Direct labels, so the value never depends on reading the axis. */}
            <span className="bar-value">
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
    <figure className="chart">
      <figcaption className="chart-title">Orders by hour of day</figcaption>

      <div className="column-chart" onMouseLeave={() => setHover(null)}>
        {hours.map((point) => (
          <div
            key={point.hour}
            className="column"
            onMouseEnter={() => setHover(point)}
            title={`${point.hour}:00 — ${point.orders} orders`}
          >
            <div
              className={`column-fill ${point.hour === busiest.hour && point.orders > 0 ? 'peak' : ''}`}
              style={{ height: `${(point.orders / max) * 100}%` }}
            />
            {point.hour % 6 === 0 && <span className="column-label">{point.hour}:00</span>}
          </div>
        ))}
      </div>

      <div className="chart-tooltip" role="status">
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
