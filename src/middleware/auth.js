import jwt from 'jsonwebtoken';

export const validateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Falta el token de autenticación o es inválido' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (!decoded.restaurant_id) {
      return res.status(403).json({ error: 'Token mal formado: falta restaurant_id' });
    }

    // Aseguramos que sea un Number para evitar problemas de tipos en las queries
    req.restaurant_id = Number(decoded.restaurant_id);
    req.access_name = decoded.access_name;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Token inválido o expirado' });
  }
};