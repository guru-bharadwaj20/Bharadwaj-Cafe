import jwt from 'jsonwebtoken';

export const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

export const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.userId = decoded.id;
      
      // Fetch user and attach to request
      const User = (await import('../models/User.js')).default;
      req.user = await User.findById(decoded.id).select('-password');
      
      if (!req.user) {
        return res.status(401).json({ message: 'User not found' });
      }
      
      next();
    } catch (error) {
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  } else {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};

export const admin = async (req, res, next) => {
  try {
    const User = (await import('../models/User.js')).default;
    const user = await User.findById(req.userId);
    
    if (user && user.role === 'admin') {
      req.user = user;
      next();
    } else {
      res.status(403).json({ message: 'Not authorized as admin' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error in admin middleware' });
  }
};
