import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { StatTile, RevenueChart, TopItemsChart, PeakHoursChart } from '../components/charts/Charts';

/*
 * Migrated from analytics.css. The `viz-*` colours are that file's custom
 * properties, still declared per mode on `.viz-root` in src/tailwind.css --
 * three blocks setting the same ten variables for light, `prefers-color-scheme:
 * dark` and an explicit `data-theme`, which is a declaration of tokens rather
 * than styling of an element and so has no utility form.
 */
const rangeButton =
  'cursor-pointer rounded-md border border-solid px-4 py-2 font-sans text-n focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-viz-series-1';

const rangeIdle = 'border-transparent bg-viz-surface-2 text-viz-text-soft';
const rangeActive = 'border-viz-series-1 bg-viz-series-1 text-viz-surface-1';

/* A hairline under every cell. Preflight is off, so `border-b border-solid`
   would leave the other three sides at the CSS initial `medium` width -- about
   3px -- and draw a full box around each cell.
   The colour is not in the shared part: the head row is darker and bolder than
   the body, and appending a second `text-*` to a string that already has one
   leaves the winner to Tailwind's emission order rather than to class order. */
const cellBox = 'border-x-0 border-t-0 border-b border-solid border-viz-grid px-2.5 py-2 text-left';

const cell = `${cellBox} text-viz-text-soft`;
const headCell = `${cellBox} font-semibold text-viz-text`;

const RANGES = [
  { days: 7, label: '7 days' },
  { days: 30, label: '30 days' },
  { days: 90, label: '90 days' },
];

const AnalyticsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showTable, setShowTable] = useState(false);

  const token = user?.token;
  const isAdmin = user?.role === 'admin';

  const load = useCallback(async () => {
    if (!token) return;

    setLoading(true);
    setError('');

    try {
      // Four independent queries; fetched together so the page paints once.
      const [summary, revenue, topItems, peakHours] = await Promise.all([
        api.getAnalytics('summary', { days }, token),
        api.getAnalytics('revenue', { days }, token),
        api.getAnalytics('top-items', { days, limit: 8 }, token),
        api.getAnalytics('peak-hours', { days }, token),
      ]);

      setData({ summary, revenue, topItems, peakHours });
    } catch (err) {
      setError(err.message || 'Could not load analytics.');
    } finally {
      setLoading(false);
    }
  }, [days, token]);

  useEffect(() => {
    if (!isAdmin) {
      navigate('/home');
      return;
    }
    void load();
  }, [isAdmin, load, navigate]);

  if (!isAdmin) return null;

  return (
    <div
      className="viz-root mx-auto min-h-screen max-w-[1100px] bg-viz-surface-1 px-5 pb-16 pt-8 text-viz-text"
      id="main-content"
    >
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="m-0 text-[1.75rem] text-viz-text">Analytics</h1>

        {/* Filters sit in one row above the charts, per the dashboard convention. */}
        <div className="flex gap-2" role="group" aria-label="Time range">
          {RANGES.map((range) => (
            <button
              key={range.days}
              type="button"
              className={`${rangeButton} ${days === range.days ? rangeActive : rangeIdle}`}
              aria-pressed={days === range.days}
              onClick={() => setDays(range.days)}
            >
              {range.label}
            </button>
          ))}
        </div>
      </header>

      {loading && <p className="py-6 text-viz-text-soft">Loading analytics…</p>}
      {error && (
        <p className="py-6 text-viz-critical" role="alert">
          {error}
        </p>
      )}

      {data && !loading && (
        <>
          <section
            className="mb-7 grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3"
            aria-label="Headline metrics"
          >
            <StatTile
              label="Revenue"
              value={data.summary.current.revenue}
              delta={data.summary.growth.revenue}
              format="currency"
            />
            <StatTile
              label="Orders"
              value={data.summary.current.orders}
              delta={data.summary.growth.orders}
            />
            <StatTile
              label="Average order"
              value={data.summary.current.averageOrderValue}
              format="currency"
            />
            <StatTile label="New customers" value={data.summary.newCustomers} />
            <StatTile label="Repeat customers" value={data.summary.repeatCustomers} />
          </section>

          <RevenueChart series={data.revenue.series} />

          <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-5">
            <TopItemsChart items={data.topItems.items} />
            <PeakHoursChart hours={data.peakHours.hours} />
          </div>

          {/* Every chart has a table equivalent, so no reading of this page
              depends on perceiving colour or shape. */}
          <section className="mt-6">
            <button
              type="button"
              className="cursor-pointer rounded-md border border-solid border-viz-grid bg-viz-surface-2 px-[14px] py-2 font-sans text-n text-viz-text-soft"
              onClick={() => setShowTable((shown) => !shown)}
            >
              {showTable ? 'Hide' : 'Show'} the underlying numbers
            </button>

            {showTable && (
              <table className="mt-4 w-full border-collapse text-[0.85rem]">
                <caption className="mb-2 text-left text-viz-text-soft">
                  Revenue and orders per day
                </caption>
                <thead>
                  <tr>
                    <th scope="col" className={headCell}>
                      Date
                    </th>
                    <th scope="col" className={headCell}>
                      Revenue
                    </th>
                    <th scope="col" className={headCell}>
                      Orders
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.revenue.series.map((point) => (
                    <tr key={point.date}>
                      <th scope="row" className={cell}>
                        {point.date}
                      </th>
                      <td className={cell}>₹{point.revenue.toLocaleString('en-IN')}</td>
                      <td className={cell}>{point.orders}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </>
      )}
    </div>
  );
};

export default AnalyticsPage;
