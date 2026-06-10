import { db } from '../db/index.js';
import { restaurant } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

export const register = async (req, res) => {
  const { access_name, password, business_display_name } = req.body;
  if (!access_name || !password) return res.status(400).json({ error: 'Campos requeridos faltantes' });

  try {
    const password_hash = await bcrypt.hash(password, 10);
    await db.insert(restaurant).values({
      access_name,
      password_hash,
      business_display_name
    });
    res.status(201).json({ message: 'Restaurante registrado exitosamente' });
  } catch (error) {
    res.status(500).json({ error: 'El access_name ya existe o hubo un error en el servidor' });
  }
};

export const login = async (req, res) => {
  const { access_name, password } = req.body;
  
  try {
    const [currentRestaurant] = await db.select().from(restaurant).where(eq(restaurant.access_name, access_name));
    if (!currentRestaurant || !(await bcrypt.compare(password, currentRestaurant.password_hash))) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const token = jwt.sign(
      { 
        restaurant_id: Number(currentRestaurant.id), 
        access_name: currentRestaurant.access_name 
      }, 
      process.env.JWT_SECRET, 
      { expiresIn: '24h' });
    res.json({ token, business_display_name: currentRestaurant.business_display_name });
  } catch (error) {
    res.status(500).json({ error: 'Error en el inicio de sesión' });
  }
};