import { db } from '../db/index.js';
import { restaurant } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

export const register = async (req, res) => {
  const { access_name, password, business_display_name } = req.body;
  if (!access_name || !password) return res.status(400).json({ error: 'Missing required fields' });

  try {
    const password_hash = await bcrypt.hash(password, 10);
    await db.insert(restaurant).values({
      access_name,
      password_hash,
      business_display_name
    });
    res.status(201).json({ message: 'Restaurant registered successfully' });
  } catch (error) {
    res.status(500).json({ error: 'The access_name already exists or there was a server error' });
  }
};

export const login = async (req, res) => {
  const { access_name, password } = req.body;
  
  try {
    const [currentRestaurant] = await db.select().from(restaurant).where(eq(restaurant.access_name, access_name));
    if (!currentRestaurant || !(await bcrypt.compare(password, currentRestaurant.password_hash))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const payload = { 
      restaurant_id: Number(currentRestaurant.id), 
      access_name: currentRestaurant.access_name 
    };

    // Token de acceso corto (1 hora)
    const accessToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
    
    // Token de refresco largo (60 días)
    const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET, { expiresIn: '60d' });

    res.json({ 
      accessToken, 
      refreshToken, 
      business_display_name: currentRestaurant.business_display_name 
    });
  } catch (error) {
    res.status(500).json({ error: 'Error processing login' });
  }
};

export const refresh = async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(401).json({ error: 'Refresh token missing' });
  }

  try {
    // Validamos el token de refresco
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
    
    // Generamos un nuevo token de acceso
    const newAccessToken = jwt.sign(
      { restaurant_id: decoded.restaurant_id, access_name: decoded.access_name },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({ accessToken: newAccessToken });
  } catch (error) {
    res.status(403).json({ error: 'Invalid or expired refresh token' });
  }
};