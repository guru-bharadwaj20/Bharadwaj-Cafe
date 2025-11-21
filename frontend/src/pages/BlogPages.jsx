import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';

export const BlogList = () => {
  const navigate = useNavigate();
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ category: '', search: '' });

  useEffect(() => {
    fetchBlogs();
  }, [filter]);

  const fetchBlogs = async () => {
    try {
      const data = await api.getBlogs(filter);
      setBlogs(data);
    } catch (error) {
      console.error('Error fetching blogs:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading-container"><div className="spinner"></div></div>;
  }

  return (
    <div className="blog-list-page">
      <div className="blog-header">
        <h1>Our Blog</h1>
        <p>Stories, recipes, and news from Bharadwaj Cafe</p>
      </div>

      <div className="blog-filters">
        <input
          type="text"
          placeholder="Search blogs..."
          onChange={(e) => setFilter({ ...filter, search: e.target.value })}
        />
        <select onChange={(e) => setFilter({ ...filter, category: e.target.value })}>
          <option value="">All Categories</option>
          <option value="Recipes">Recipes</option>
          <option value="News">News</option>
          <option value="Behind the Scenes">Behind the Scenes</option>
          <option value="Tips & Tricks">Tips & Tricks</option>
          <option value="Events">Events</option>
        </select>
      </div>

      <div className="blog-grid">
        {blogs.map(blog => (
          <div key={blog._id} className="blog-card" onClick={() => navigate(`/blog/${blog.slug}`)}>
            <img src={blog.coverImage} alt={blog.title} />
            <div className="blog-card-content">
              <span className="blog-category">{blog.category}</span>
              <h3>{blog.title}</h3>
              <p>{blog.excerpt}</p>
              <div className="blog-meta">
                <span><i className="fas fa-user"></i> {blog.author?.name}</span>
                <span><i className="fas fa-eye"></i> {blog.views} views</span>
                <span><i className="fas fa-heart"></i> {blog.likes?.length || 0}</span>
              </div>
              <span className="blog-date">
                {new Date(blog.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const BlogDetail = () => {
  const { slug } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [blog, setBlog] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBlog();
  }, [slug]);

  const fetchBlog = async () => {
    try {
      const data = await api.getBlogBySlug(slug);
      setBlog(data);
    } catch (error) {
      console.error('Error fetching blog:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
    if (!user) {
      alert('Please login to like');
      return;
    }
    try {
      await api.likeBlog(blog._id, user.token);
      fetchBlog();
    } catch (error) {
      console.error('Error liking blog:', error);
    }
  };

  if (loading) {
    return <div className="loading-container"><div className="spinner"></div></div>;
  }

  if (!blog) {
    return <div className="blog-detail-page"><h2>Blog not found</h2></div>;
  }

  return (
    <div className="blog-detail-page">
      <button className="btn-back" onClick={() => navigate('/blog')}>
        <i className="fas fa-arrow-left"></i> Back to Blogs
      </button>

      <div className="blog-detail">
        <span className="blog-category">{blog.category}</span>
        <h1>{blog.title}</h1>
        
        <div className="blog-meta">
          <span><i className="fas fa-user"></i> By {blog.author?.name}</span>
          <span><i className="fas fa-calendar"></i> {new Date(blog.createdAt).toLocaleDateString()}</span>
          <span><i className="fas fa-eye"></i> {blog.views} views</span>
        </div>

        <img src={blog.coverImage} alt={blog.title} className="blog-cover" />

        <div className="blog-content" dangerouslySetInnerHTML={{ __html: blog.content }}></div>

        <div className="blog-tags">
          {blog.tags?.map(tag => (
            <span key={tag} className="tag">{tag}</span>
          ))}
        </div>

        <div className="blog-actions">
          <button className="btn-like" onClick={handleLike}>
            <i className={`fas fa-heart ${blog.likes?.includes(user?._id) ? 'liked' : ''}`}></i>
            {blog.likes?.length || 0} Likes
          </button>
        </div>
      </div>
    </div>
  );
};
