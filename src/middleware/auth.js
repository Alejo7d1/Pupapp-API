import jwt from 'jsonwebtoken';

export const validateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'authentication token missing' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (!decoded.restaurant_id) {
      return res.status(401).json({ error: 'Bad token: missing restaurant_id' });
    }

    req.restaurant_id = Number(decoded.restaurant_id);
    req.access_name = decoded.access_name;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Bad token: invalid or expired' });
  }
};