import { db } from '../db/index.js';
import { product } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { uploadToR2, deleteFromR2 } from '../../s3.js';

export const getAllProducts = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  const data = await db.select()
    .from(product)
    .where(eq(product.restaurant_id, req.restaurant_id))
    .limit(limit)
    .offset(offset);

  res.json(data);
};

export const getProductById = async (req, res) => {
  const { id } = req.params;
  const [item] = await db.select().from(product).where(eq(product.id, parseInt(id)));

  if (!item) return res.status(404).json({ error: 'Product not found' });
  if (item.restaurant_id !== req.restaurant_id) return res.status(403).json({ error: 'Forbidden: This product belongs to another restaurant' });

  res.json(item);
};

export const createProduct = async (req, res) => {
  const { name, price_base, category, image_url: bodyImageUrl } = req.body;
  let finalImageUrl = bodyImageUrl;

  try {
    if (req.file) {
      finalImageUrl = await uploadToR2(req.file, req.access_name);
    }

    const [newProduct] = await db.insert(product).values({
      restaurant_id: req.restaurant_id,
      name,
      price_base: parseFloat(price_base).toFixed(2),
      category,
      image_url: finalImageUrl
    }).returning();

    if (!newProduct) throw new Error("database not returning new product");

    res.status(201).json(newProduct);
  } catch (error) {
    return res.status(500).json({ error: 'Error creating product', details: error.message });
  }
};

export const updateProduct = async (req, res) => {
  const { id } = req.params;
  const { name, price_base, category, image_url: bodyImageUrl } = req.body;
  let finalImageUrl = bodyImageUrl;

  const [item] = await db.select().from(product).where(eq(product.id, parseInt(id)));
  if (!item) return res.status(404).json({ error: 'Product not found' });
  if (item.restaurant_id !== req.restaurant_id) return res.status(403).json({ error: 'Forbidden: You cannot modify products from another restaurant' });

  if (req.file) {
    finalImageUrl = await uploadToR2(req.file, req.access_name);
  }
  
  const [updatedProduct] = await db.update(product)
    .set({ name, price_base, category, image_url: finalImageUrl })
    .where(eq(product.id, parseInt(id)))
    .returning();

  res.json(updatedProduct);
};

export const deleteProduct = async (req, res) => {
  const { id } = req.params;
  const [item] = await db.select().from(product).where(eq(product.id, parseInt(id)));
  if (!item) return res.status(404).json({ error: 'Product not found' });
  if (item.restaurant_id !== req.restaurant_id) return res.status(403).json({ error: 'Forbidden: You cannot delete products from another restaurant' });

  const [deleted] = await db.delete(product)
    .where(eq(product.id, parseInt(id)))
    .returning();

  // Si el producto tenía una imagen en R2, la eliminamos
  if (deleted.image_url) {
    try {
      await deleteFromR2(deleted.image_url);
    } catch (err) {
      console.error("No se pudo eliminar la imagen de R2:", err.message);
    }
  }

  res.json({ message: 'Product deleted' });
};