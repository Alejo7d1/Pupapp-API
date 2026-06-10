import { db } from '../db/index.js';
import { orderTable, orderItem, product } from '../db/schema.js';
import { eq, and, inArray } from 'drizzle-orm';

export const getAllOrders = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  // 1. Obtener las órdenes base paginadas
  const orders = await db.select()
    .from(orderTable)
    .where(eq(orderTable.restaurant_id, req.restaurant_id))
    .limit(limit)
    .offset(offset);

  if (orders.length === 0) {
    return res.json([]);
  }

  // 2. Obtener todos los ítems de estas órdenes en una sola consulta
  const orderIds = orders.map(o => o.id);
  const allItems = await db.select({
    id: orderItem.id,
    orderId: orderItem.order_id,
    productName: orderItem.product_name,
    quantity: orderItem.quantity,
    price_per_dish: orderItem.price_per_dish
  })
  .from(orderItem)
  .where(inArray(orderItem.order_id, orderIds));

  // 3. Agrupar los ítems dentro de sus respectivas órdenes
  const result = orders.map(order => ({
    ...order,
    items: allItems.filter(item => item.orderId === order.id)
  }));

  res.json(result);
};

export const getOrderDetails = async (req, res) => {
  const { id } = req.params;
  
  const [order] = await db.select().from(orderTable).where(
    and(eq(orderTable.id, parseInt(id)), eq(orderTable.restaurant_id, req.restaurant_id))
  );
  if (!order) return res.status(404).json({ error: 'Orden no encontrada' });

  const items = await db.select({
    id: orderItem.id,
    productName: orderItem.product_name,
    quantity: orderItem.quantity,
    price_per_dish: orderItem.price_per_dish
  })
  .from(orderItem)
  .where(eq(orderItem.order_id, order.id));

  res.json({ ...order, items });
};

export const createOrder = async (req, res) => {
  // Asegúrate de que customer_name venga del body
  const { 
    order_reference, 
    customer_name, 
    final_total, 
    total_adjustment_note, 
    items 
  } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'La orden debe incluir al menos un producto' });
  }

  try {
    // 1. Obtener los IDs únicos de los productos para buscarlos en la DB
    const productIds = items.map(item => item.productId);
    
    const dbProducts = await db.select()
      .from(product)
      .where(and(
        eq(product.restaurant_id, req.restaurant_id),
        inArray(product.id, productIds)
      ));

    if (dbProducts.length !== new Set(productIds).size) {
      return res.status(400).json({ error: 'Uno o más productos no son válidos o no pertenecen al restaurante' });
    }

    const result = await db.transaction(async (tx) => {
      let calculatedSubtotal = 0;

      // 2. Mapear ítems y calcular subtotales basándose en los precios actuales de la DB
      const itemsToInsert = items.map(item => {
        const productInfo = dbProducts.find(p => p.id === item.productId);
        const pricePerDish = parseFloat(productInfo.price_base);
        const subtotal = pricePerDish * item.quantity;
        
        calculatedSubtotal += subtotal;

        return {
          product_name: productInfo.name,
          quantity: item.quantity,
          price_per_dish: pricePerDish.toFixed(2)
        };
      });

      const subtotalStr = calculatedSubtotal.toFixed(2);
      // 3. Insertar la orden principal
      const [newOrder] = await tx.insert(orderTable).values({
        restaurant_id: parseInt(req.restaurant_id),
        status_id: 1,
        order_reference,
        customer_name,
        calculated_subtotal: subtotalStr,
        final_total: final_total || subtotalStr,
        total_adjustment_note
      }).returning();

      // 3. Insertar los detalles de la orden
      const finalItems = itemsToInsert.map(i => ({ ...i, order_id: newOrder.id }));
      await tx.insert(orderItem).values(finalItems);
      
      return newOrder;
    });

    return res.status(201).json(result);
  } catch (error) {
    // Esto enviará el motivo exacto a Postman
    return res.status(500).json({ 
      error: 'Error al procesar la orden transaccional',
      details: error.message 
    });
  }
};

export const updateOrderStatus = async (req, res) => {
  const { id } = req.params;
  const { status_id } = req.body;

  const [updatedOrder] = await db.update(orderTable)
    .set({ status_id, updated_at: new Date() })
    .where(and(eq(orderTable.id, parseInt(id)), eq(orderTable.restaurant_id, req.restaurant_id)))
    .returning();

  if (!updatedOrder) return res.status(404).json({ error: 'Orden no encontrada o no autorizada' });
  res.json(updatedOrder);
};

export const deleteOrder = async (req, res) => {
  const { id } = req.params;
  const [deleted] = await db.delete(orderTable)
    .where(and(eq(orderTable.id, parseInt(id)), eq(orderTable.restaurant_id, req.restaurant_id)))
    .returning();

  if (!deleted) return res.status(404).json({ error: 'Orden no encontrada o no autorizada' });
  res.json({ message: 'Orden eliminada físicamente (Cascade activo para items)' });
};