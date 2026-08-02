import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';

/**
 * Loyalty rewards.
 *
 * Migrated from loyalty.css, which was self-contained: none of its class names
 * were declared in any other stylesheet. The loading state still uses
 * `.loading-container` and `.spinner`, which are shared with the account pages
 * and move when that file does.
 *
 * The 8px radii below were written as literals in loyalty.css rather than as
 * `var(--border-radius-s)`, but the token is 8px, so `rounded-s` renders
 * identically and keeps the page on the scale everything else uses.
 */

// The three dashboard panels and the reward, step and tier cards are all the
// same dark card; only the padding differs.
const card = 'rounded-[12px] bg-[#2a2a2a]';
const dashCard = `${card} p-[30px] text-center`;

const section = 'mx-auto my-[50px] max-w-[1200px] px-5';
const sectionTitle = 'mb-[30px] text-center text-xl text-white';

// Same auto-fit grid at three different gaps.
const autoGrid = 'grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] max-[768px]:grid-cols-1';

const amberLift =
  'transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_5px_15px_rgba(243,150,28,0.3)]';

/*
 * Divider between benefits, suppressed on the last row.
 *
 * `border-x-0 border-t-0` is not decoration. `border-solid` applies the style
 * to all four sides, and with Preflight off the sides without an explicit
 * width fall back to the CSS initial `medium` -- about 3px -- so a plain
 * `border-b border-solid` drew a full box and made every row 3px taller.
 */
const tierItem =
  'border-x-0 border-b border-t-0 border-solid border-[#3a3a3a] py-2 text-s text-[#ccc] last:border-b-0';

const stepIcon = 'mb-[15px] text-[50px] text-secondary';

const LoyaltyPage = () => {
  const { user } = useAuth();
  const [loyaltyInfo, setLoyaltyInfo] = useState(null);
  const [rewards, setRewards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [redeemPoints, setRedeemPoints] = useState('');

  useEffect(() => {
    fetchLoyaltyData();
  }, []);

  const fetchLoyaltyData = async () => {
    try {
      const [info, rewardsList] = await Promise.all([
        api.getLoyaltyInfo(user?.token),
        api.getRewards(user?.token),
      ]);
      setLoyaltyInfo(info);
      setRewards(rewardsList);
    } catch (error) {
      console.error('Error fetching loyalty data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRedeem = async (e) => {
    e.preventDefault();
    const points = parseInt(redeemPoints);

    if (points < 100) {
      alert('Minimum 100 points required');
      return;
    }

    if (points > loyaltyInfo.points) {
      alert('Insufficient points');
      return;
    }

    try {
      const result = await api.redeemPoints({ points }, user?.token);
      alert(result.message);
      setRedeemPoints('');
      fetchLoyaltyData();
    } catch {
      alert('Failed to redeem points');
    }
  };

  const getTierColor = (tier) => {
    const colors = {
      Bronze: '#CD7F32',
      Silver: '#C0C0C0',
      Gold: '#FFD700',
      Platinum: '#E5E4E2',
    };
    return colors[tier] || '#666';
  };

  const getTierIcon = (tier) => {
    const icons = {
      Bronze: 'fa-medal',
      Silver: 'fa-award',
      Gold: 'fa-crown',
      Platinum: 'fa-gem',
    };
    return icons[tier] || 'fa-medal';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark pb-[50px] pt-[100px]">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading loyalty info...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark pb-[50px] pt-[100px]" id="main-content">
      <div className="mb-10 text-center text-white">
        <h1 className="mb-2.5 text-xxl text-secondary">Loyalty Rewards</h1>
        <p>Earn points with every purchase and unlock exclusive rewards</p>
      </div>

      <div
        className={`mx-auto mb-[50px] grid max-w-[1200px] grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-[25px] px-5 max-[768px]:grid-cols-1`}
      >
        {/* The border colour is per-tier, so only its width and style are
            utilities. `border-solid` is required with Preflight off. */}
        <div
          className={`${dashCard} border-[3px] border-solid`}
          style={{ borderColor: getTierColor(loyaltyInfo.tier) }}
        >
          <i
            className={`fas ${getTierIcon(loyaltyInfo.tier)} mb-[15px] text-[50px]`}
            style={{ color: getTierColor(loyaltyInfo.tier) }}
          ></i>
          <h2 className="mb-5 text-white">{loyaltyInfo.tier} Member</h2>
          {loyaltyInfo.nextTier && (
            <div className="mt-5">
              <p className="mb-2.5 text-[#ccc]">Progress to {loyaltyInfo.nextTier}</p>
              <div className="mb-2.5 h-2.5 w-full overflow-hidden rounded-[5px] bg-[#1a1a1a]">
                <div
                  className="h-full bg-secondary transition-[width] duration-500 ease-in-out"
                  style={{ width: `${loyaltyInfo.progress}%` }}
                ></div>
              </div>
              <span className="text-s text-secondary">
                ₹{loyaltyInfo.pointsToNextTier} more to {loyaltyInfo.nextTier}
              </span>
            </div>
          )}
        </div>

        <div className={dashCard}>
          <h3 className="mb-[15px] text-white">Available Points</h3>
          <div className="my-5 text-[48px] font-bold text-secondary">{loyaltyInfo.points}</div>
          <p className="text-s text-[#999]">1 point = ₹0.10 discount</p>
          <p className="mt-2.5 text-white">Total Spent: ₹{loyaltyInfo.totalSpent}</p>
        </div>

        <div className={dashCard}>
          <h3 className="mb-[15px] text-white">Redeem Points</h3>
          <form onSubmit={handleRedeem} className="flex flex-col gap-[15px]">
            <input
              type="number"
              placeholder="Enter points (min 100)"
              value={redeemPoints}
              onChange={(e) => setRedeemPoints(e.target.value)}
              min="100"
              step="10"
              className="rounded-[5px] border border-solid border-[#3a3a3a] bg-[#1a1a1a] p-3 text-n text-white"
            />
            <button
              type="submit"
              className={`cursor-pointer rounded-s border-none bg-secondary p-3 font-bold text-black ${amberLift}`}
            >
              Redeem Now
            </button>
          </form>
        </div>
      </div>

      <div className={section}>
        <h2 className={sectionTitle}>Rewards Catalog</h2>
        <div className={`${autoGrid} gap-5`}>
          {rewards.map((reward) => (
            <div
              key={reward.id}
              className={`${card} p-[25px] text-center transition-transform duration-300 hover:-translate-y-[5px]`}
            >
              <div className="mb-[15px] text-[40px] text-secondary">
                <i className="fas fa-gift" aria-hidden="true"></i>
              </div>
              <h3 className="mb-2.5 text-white">{reward.name}</h3>
              <p className="mb-[15px] text-s text-[#ccc]">{reward.description}</p>
              <div className="mt-5 flex items-center justify-between">
                <span className="font-bold text-secondary">{reward.points} Points</span>
                <button
                  className="cursor-pointer rounded-[5px] border-none bg-secondary px-[15px] py-2 text-[12px] font-bold text-black transition-all duration-300 enabled:hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:bg-[#666]"
                  disabled={loyaltyInfo.points < reward.points}
                >
                  {loyaltyInfo.points >= reward.points ? 'Claim' : 'Not Enough Points'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={section}>
        <h2 className={sectionTitle}>How It Works</h2>
        <div className={`${autoGrid} mt-[30px] gap-[30px]`}>
          <div className={`${card} p-[30px] text-center`}>
            <i className={`fas fa-shopping-bag ${stepIcon}`} aria-hidden="true"></i>
            <h4 className="mb-2.5 text-white">Order &amp; Earn</h4>
            <p className="text-s text-[#ccc]">Earn 1 point for every ₹10 spent</p>
          </div>
          <div className={`${card} p-[30px] text-center`}>
            <i className={`fas fa-chart-line ${stepIcon}`} aria-hidden="true"></i>
            <h4 className="mb-2.5 text-white">Level Up</h4>
            <p className="text-s text-[#ccc]">Unlock higher tiers with more spending</p>
          </div>
          <div className={`${card} p-[30px] text-center`}>
            <i className={`fas fa-gift ${stepIcon}`} aria-hidden="true"></i>
            <h4 className="mb-2.5 text-white">Redeem Rewards</h4>
            <p className="text-s text-[#ccc]">Use points for discounts and exclusive rewards</p>
          </div>
        </div>
      </div>

      <div className={section}>
        <h2 className={sectionTitle}>Tier Benefits</h2>
        <div className={`${autoGrid} mt-[30px] gap-5`}>
          <div className={`${card} p-[25px]`}>
            <h4 className="mb-[15px] text-l text-secondary">Bronze</h4>
            <ul className="list-none p-0">
              <li className={tierItem}>Earn 1 point per ₹10</li>
              <li className={tierItem}>Birthday discount</li>
            </ul>
          </div>
          <div className={`${card} p-[25px]`}>
            <h4 className="mb-[15px] text-l text-secondary">Silver (₹1000+)</h4>
            <ul className="list-none p-0">
              <li className={tierItem}>1.2x points on orders</li>
              <li className={tierItem}>Exclusive offers</li>
              <li className={tierItem}>Priority support</li>
            </ul>
          </div>
          <div className={`${card} p-[25px]`}>
            <h4 className="mb-[15px] text-l text-secondary">Gold (₹5000+)</h4>
            <ul className="list-none p-0">
              <li className={tierItem}>1.5x points on orders</li>
              <li className={tierItem}>Free delivery</li>
              <li className={tierItem}>Early access to menu</li>
            </ul>
          </div>
          <div className={`${card} p-[25px]`}>
            <h4 className="mb-[15px] text-l text-secondary">Platinum (₹10000+)</h4>
            <ul className="list-none p-0">
              <li className={tierItem}>2x points on orders</li>
              <li className={tierItem}>VIP treatment</li>
              <li className={tierItem}>Personalized service</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoyaltyPage;
