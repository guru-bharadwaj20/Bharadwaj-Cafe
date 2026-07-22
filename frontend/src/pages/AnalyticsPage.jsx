import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { StatTile, RevenueChart, TopItemsChart, PeakHoursChart } from '../components/charts/Charts';

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
    <div className="analytics-page viz-root">
      <header className="analytics-header">
        <h1>Analytics</h1>

        {/* Filters sit in one row above the charts, per the dashboard convention. */}
        <div className="analytics-filters" role="group" aria-label="Time range">
          {RANGES.map((range) => (
            <button
              key={range.days}
              type="button"
              className={`range-button ${days === range.days ? 'active' : ''}`}
              aria-pressed={days === range.days}
              onClick={() => setDays(range.days)}
            >
              {range.label}
            </button>
          ))}
        </div>
      </header>

      {loading && <p className="analytics-status">Loading analytics…</p>}
      {error && (
        <p className="analytics-error" role="alert">
          {error}
        </p>
      )}

      {data && !loading && (
        <>
          <section className="stat-row" aria-label="Headline metrics">
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

          <div className="chart-grid-2">
            <TopItemsChart items={data.topItems.items} />
            <PeakHoursChart hours={data.peakHours.hours} />
          </div>

          {/* Every chart has a table equivalent, so no reading of this page
              depends on perceiving colour or shape. */}
          <section className="analytics-table-section">
            <button type="button" onClick={() => setShowTable((shown) => !shown)}>
              {showTable ? 'Hide' : 'Show'} the underlying numbers
            </button>

            {showTable && (
              <table className="analytics-table">
                <caption>Revenue and orders per day</caption>
                <thead>
                  <tr>
                    <th scope="col">Date</th>
                    <th scope="col">Revenue</th>
                    <th scope="col">Orders</th>
                  </tr>
                </thead>
                <tbody>
                  {data.revenue.series.map((point) => (
                    <tr key={point.date}>
                      <th scope="row">{point.date}</th>
                      <td>₹{point.revenue.toLocaleString('en-IN')}</td>
                      <td>{point.orders}</td>
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
