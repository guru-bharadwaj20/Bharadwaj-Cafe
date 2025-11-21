import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';

const Reviews = ({ menuItemId }) => {
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [hoverRating, setHoverRating] = useState(0);

  useEffect(() => {
    fetchReviews();
  }, [menuItemId]);

  const fetchReviews = async () => {
    try {
      const data = await api.getMenuItemReviews(menuItemId);
      setReviews(data);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    try {
      await api.createReview({
        menuItem: menuItemId,
        rating,
        comment
      }, user?.token);
      
      setShowForm(false);
      setRating(5);
      setComment('');
      fetchReviews();
      alert('Review submitted successfully!');
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to submit review');
    }
  };

  const handleMarkHelpful = async (reviewId) => {
    try {
      await api.markReviewHelpful(reviewId, user?.token);
      fetchReviews();
    } catch (error) {
      console.error('Error marking helpful:', error);
    }
  };

  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm('Delete this review?')) return;
    try {
      await api.deleteReview(reviewId, user?.token);
      fetchReviews();
    } catch (error) {
      alert('Failed to delete review');
    }
  };

  const renderStars = (count, interactive = false) => {
    return (
      <div className="stars">
        {[1, 2, 3, 4, 5].map(star => (
          <i
            key={star}
            className={`fas fa-star ${star <= (interactive ? (hoverRating || rating) : count) ? 'filled' : ''}`}
            onClick={() => interactive && setRating(star)}
            onMouseEnter={() => interactive && setHoverRating(star)}
            onMouseLeave={() => interactive && setHoverRating(0)}
          ></i>
        ))}
      </div>
    );
  };

  if (loading) return <div className="loading">Loading reviews...</div>;

  return (
    <div className="reviews-section">
      <div className="reviews-header">
        <h3>Customer Reviews ({reviews.length})</h3>
        {user && !showForm && (
          <button className="btn-write-review" onClick={() => setShowForm(true)}>
            <i className="fas fa-pen"></i> Write a Review
          </button>
        )}
      </div>

      {showForm && (
        <div className="review-form">
          <h4>Write Your Review</h4>
          <form onSubmit={handleSubmitReview}>
            <div className="form-group">
              <label>Rating</label>
              {renderStars(rating, true)}
            </div>
            <div className="form-group">
              <label>Your Review</label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Share your experience..."
                required
                rows={4}
              />
            </div>
            <div className="form-actions">
              <button type="submit" className="btn-submit">Submit Review</button>
              <button type="button" className="btn-cancel" onClick={() => setShowForm(false)}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="reviews-list">
        {reviews.length === 0 ? (
          <p className="no-reviews">No reviews yet. Be the first to review!</p>
        ) : (
          reviews.map(review => (
            <div key={review._id} className="review-card">
              <div className="review-header">
                <div className="reviewer-info">
                  <span className="reviewer-name">{review.user?.name || 'Anonymous'}</span>
                  {renderStars(review.rating)}
                </div>
                <span className="review-date">
                  {new Date(review.createdAt).toLocaleDateString()}
                </span>
              </div>
              <p className="review-comment">{review.comment}</p>
              <div className="review-actions">
                <button 
                  className="btn-helpful"
                  onClick={() => handleMarkHelpful(review._id)}
                  disabled={!user}
                >
                  <i className="fas fa-thumbs-up"></i> 
                  Helpful ({review.helpful?.length || 0})
                </button>
                {user && user._id === review.user?._id && (
                  <button 
                    className="btn-delete-review"
                    onClick={() => handleDeleteReview(review._id)}
                  >
                    <i className="fas fa-trash"></i> Delete
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Reviews;
