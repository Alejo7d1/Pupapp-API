import { db } from '../db/index.js';
import { orderTable, orderItem, product } from '../db/schema.js';
import { eq, and, inArray, notInArray, desc, asc, gte, lte } from 'drizzle-orm';

export const getAllOrders = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // Obtener las órdenes base paginadas
    const orders = await db.select()
      .from(orderTable)
      .where(eq(orderTable.restaurant_id, req.restaurant_id))
      .orderBy(desc(orderTable.created_at))
      .limit(limit) 
      .offset(offset);

    if (orders.length === 0) {
      return res.json([]);
    }

    // Obtener todos los ítems de estas órdenes en una sola consulta
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

    // Agrupar los ítems dentro de sus respectivas órdenes
    const result = orders.map(order => ({
      ...order,
      items: allItems.filter(item => item.orderId === order.id)
    }));

    res.json(result);
  } catch (error) {
    console.error('Error in getAllOrders:', error);
    res.status(500).json({ error: 'Error al obtener órdenes', details: error.message });
  }
};

export const getActiveOrders = async (req, res) => {
  try {
    const orders = await db.select()
      .from(orderTable)
      .where(
        and(
          eq(orderTable.restaurant_id, req.restaurant_id),
          notInArray(orderTable.status_id, [4, 5])
        )
      )
      .orderBy(asc(orderTable.created_at));

    if (orders.length === 0) {
      return res.json([]);
    }

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

    const result = orders.map(order => ({
      ...order,
      items: allItems.filter(item => item.orderId === order.id)
    }));

    res.json(result);
  } catch (error) {
    console.error('Error in getActiveOrders:', error);
    res.status(500).json({ error: 'Error al obtener órdenes activas', details: error.message });
  }
};

// Endpoint para obtener ordenes entregadas dentro de un rango de fechas
export const getDeliveredOrdersByPeriod = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required (format YYYY-MM-DD)' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    const orders = await db.select()
      .from(orderTable)
      .where(
        and(
          eq(orderTable.restaurant_id, req.restaurant_id),
          eq(orderTable.status_id, 4),
          gte(orderTable.created_at, start),
          lte(orderTable.created_at, end)
        )
      )
      .orderBy(desc(orderTable.created_at));

    if (orders.length === 0) return res.json([]);

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

    res.json(orders.map(o => ({ ...o, items: allItems.filter(i => i.orderId === o.id) })));
  } catch (error) {
    console.error('Error in getDeliveredOrdersByPeriod:', error);
    res.status(500).json({ error: 'Error al obtener órdenes del periodo', details: error.message });
  }
};

export const getOrderDetails = async (req, res) => {
  const { id } = req.params;
  
  const [order] = await db.select().from(orderTable).where(eq(orderTable.id, parseInt(id)));

  if (!order) return res.status(404).json({ error: 'Order not found' });
  if (order.restaurant_id !== req.restaurant_id) return res.status(403).json({ error: 'Forbidden: Access to this order is denied' });


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
  const { 
    order_reference, 
    customer_name, 
    final_total, 
    total_adjustment_note, 
    items 
  } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'The order must include at least one product' });
  }

  try {
    // Obtener los IDs únicos de los productos para buscarlos en la DB
    const productIds = items.map(item => item.productId);
    
    const dbProducts = await db.select()
      .from(product)
      .where(and(
        eq(product.restaurant_id, req.restaurant_id),
        inArray(product.id, productIds)
      ));

    if (dbProducts.length !== new Set(productIds).size) {
      return res.status(400).json({ error: 'One or more products are not valid or do not belong to the restaurant' });
    }

    const result = await db.transaction(async (tx) => {
      // Calcular el número de orden correlativo para el día de hoy
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const [lastOrderToday] = await tx.select({ order_number: orderTable.order_number })
        .from(orderTable)
        .where(
          and(
            eq(orderTable.restaurant_id, parseInt(req.restaurant_id)),
            gte(orderTable.created_at, startOfDay)
          )
        )
        .orderBy(desc(orderTable.order_number))
        .limit(1);

      const nextOrderNumber = lastOrderToday ? lastOrderToday.order_number + 1 : 1;

      let calculatedSubtotal = 0;

      // Mapear ítems y calcular subtotales basándose en los precios actuales de la DB
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
      // Insertar la orden principal
      const [newOrder] = await tx.insert(orderTable).values({
        restaurant_id: parseInt(req.restaurant_id),
        status_id: 1,
        order_number: nextOrderNumber,
        order_reference,
        customer_name,
        calculated_subtotal: subtotalStr,
        final_total: final_total || subtotalStr,
        total_adjustment_note
      }).returning();

      // Insertar los detalles de la orden
      const finalItems = itemsToInsert.map(i => ({ ...i, order_id: newOrder.id }));
      await tx.insert(orderItem).values(finalItems);
      
      return newOrder;
    });

    return res.status(201).json(result);
  } catch (error) {
    return res.status(500).json({ 
      error: 'Error processing order creation:',
      details: error.message 
    });
  }
};

export const updateOrderStatus = async (req, res) => {
  const { id } = req.params;
  const { status_id } = req.body;

  const [order] = await db.select().from(orderTable).where(eq(orderTable.id, parseInt(id)));
  if (!order) return res.status(404).json({ error: 'Order not found' });
  if (order.restaurant_id !== req.restaurant_id) return res.status(403).json({ error: 'Forbidden: You cannot update orders from another restaurant' });

  const [updatedOrder] = await db.update(orderTable)
    .set({ status_id, updated_at: new Date() })
    .where(eq(orderTable.id, parseInt(id)))
    .returning();

  res.json(updatedOrder);
};

export const deleteOrder = async (req, res) => {
  const { id } = req.params;
  const [order] = await db.select().from(orderTable).where(eq(orderTable.id, parseInt(id)));
  if (!order) return res.status(404).json({ error: 'Order not found' });
  if (order.restaurant_id !== req.restaurant_id) return res.status(403).json({ error: 'Forbidden: You cannot delete orders from another restaurant' });

  const [deleted] = await db.delete(orderTable)
    .where(eq(orderTable.id, parseInt(id)))
    .returning();

  res.json({ message: 'Order deleted' });
};