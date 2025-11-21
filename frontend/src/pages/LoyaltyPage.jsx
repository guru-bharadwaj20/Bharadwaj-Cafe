import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';

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
        api.getRewards(user?.token)
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
    } catch (error) {
      alert('Failed to redeem points');
    }
  };

  const getTierColor = (tier) => {
    const colors = {
      Bronze: '#CD7F32',
      Silver: '#C0C0C0',
      Gold: '#FFD700',
      Platinum: '#E5E4E2'
    };
    return colors[tier] || '#666';
  };

  const getTierIcon = (tier) => {
    const icons = {
      Bronze: 'fa-medal',
      Silver: 'fa-award',
      Gold: 'fa-crown',
      Platinum: 'fa-gem'
    };
    return icons[tier] || 'fa-medal';
  };

  if (loading) {
    return (
      <div className="loyalty-page">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading loyalty info...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="loyalty-page">
      <div className="loyalty-header">
        <h1>Loyalty Rewards</h1>
        <p>Earn points with every purchase and unlock exclusive rewards</p>
      </div>

      <div className="loyalty-dashboard">
        <div className="tier-card" style={{ borderColor: getTierColor(loyaltyInfo.tier) }}>
          <i className={`fas ${getTierIcon(loyaltyInfo.tier)}`} style={{ color: getTierColor(loyaltyInfo.tier) }}></i>
          <h2>{loyaltyInfo.tier} Member</h2>
          {loyaltyInfo.nextTier && (
            <div className="tier-progress">
              <p>Progress to {loyaltyInfo.nextTier}</p>
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${loyaltyInfo.progress}%` }}
                ></div>
              </div>
              <span className="progress-text">
                ₹{loyaltyInfo.pointsToNextTier} more to {loyaltyInfo.nextTier}
              </span>
            </div>
          )}
        </div>

        <div className="points-card">
          <h3>Available Points</h3>
          <div className="points-value">{loyaltyInfo.points}</div>
          <p className="points-info">1 point = ₹0.10 discount</p>
          <p className="total-spent">Total Spent: ₹{loyaltyInfo.totalSpent}</p>
        </div>

        <div className="redeem-card">
          <h3>Redeem Points</h3>
          <form onSubmit={handleRedeem}>
            <input
              type="number"
              placeholder="Enter points (min 100)"
              value={redeemPoints}
              onChange={(e) => setRedeemPoints(e.target.value)}
              min="100"
              step="10"
            />
            <button type="submit" className="btn-redeem">
              Redeem Now
            </button>
          </form>
        </div>
      </div>

      <div className="rewards-section">
        <h2>Rewards Catalog</h2>
        <div className="rewards-grid">
          {rewards.map(reward => (
            <div key={reward.id} className="reward-card">
              <div className="reward-icon">
                <i className="fas fa-gift"></i>
              </div>
              <h3>{reward.name}</h3>
              <p>{reward.description}</p>
              <div className="reward-footer">
                <span className="points-required">{reward.points} Points</span>
                <button 
                  className="btn-claim"
                  disabled={loyaltyInfo.points < reward.points}
                >
                  {loyaltyInfo.points >= reward.points ? 'Claim' : 'Not Enough Points'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="how-it-works">
        <h2>How It Works</h2>
        <div className="steps">
          <div className="step">
            <i className="fas fa-shopping-bag"></i>
            <h4>Order & Earn</h4>
            <p>Earn 1 point for every ₹10 spent</p>
          </div>
          <div className="step">
            <i className="fas fa-chart-line"></i>
            <h4>Level Up</h4>
            <p>Unlock higher tiers with more spending</p>
          </div>
          <div className="step">
            <i className="fas fa-gift"></i>
            <h4>Redeem Rewards</h4>
            <p>Use points for discounts and exclusive rewards</p>
          </div>
        </div>
      </div>

      <div className="tier-benefits">
        <h2>Tier Benefits</h2>
        <div className="tiers">
          <div className="tier">
            <h4>Bronze</h4>
            <ul>
              <li>Earn 1 point per ₹10</li>
              <li>Birthday discount</li>
            </ul>
          </div>
          <div className="tier">
            <h4>Silver (₹1000+)</h4>
            <ul>
              <li>1.2x points on orders</li>
              <li>Exclusive offers</li>
              <li>Priority support</li>
            </ul>
          </div>
          <div className="tier">
            <h4>Gold (₹5000+)</h4>
            <ul>
              <li>1.5x points on orders</li>
              <li>Free delivery</li>
              <li>Early access to menu</li>
            </ul>
          </div>
          <div className="tier">
            <h4>Platinum (₹10000+)</h4>
            <ul>
              <li>2x points on orders</li>
              <li>VIP treatment</li>
              <li>Personalized service</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoyaltyPage;
