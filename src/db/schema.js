import { pgTable, serial, text, integer, decimal, timestamp } from 'drizzle-orm/pg-core';

// 1. Restaurant table - The main tenant
export const restaurant = pgTable('restaurant', {
  id: serial('id').primaryKey(),
  access_name: text('access_name').unique().notNull(),
  password_hash: text('password_hash').notNull(),
  business_display_name: text('business_display_name'),
  created_at: timestamp('created_at').defaultNow(),
});

// 2. Product table - Belongs to a restaurant
export const product = pgTable('product', {
  id: serial('id').primaryKey(),
  restaurant_id: integer('restaurant_id').references(() => restaurant.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  price_base: decimal('price_base', { precision: 10, scale: 2 }).notNull(),
  category: text('category'),
  image_url: text('image_url'),
});

// 3. Order status table - Shared reference
export const orderStatus = pgTable('order_status', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
});

// 4. Order table - Belongs to a restaurant
export const orderTable = pgTable('order_table', {
  id: serial('id').primaryKey(),
  restaurant_id: integer('restaurant_id').references(() => restaurant.id, { onDelete: 'cascade' }).notNull(),
  status_id: integer('status_id').references(() => orderStatus.id),
  order_reference: text('order_reference'),
  customer_name: text('customer_name'),
  calculated_subtotal: decimal('calculated_subtotal', { precision: 10, scale: 2 }).notNull(),
  final_total: decimal('final_total', { precision: 10, scale: 2 }).notNull(),
  total_adjustment_note: text('total_adjustment_note'),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
});

// 5. Order item table - Belongs to an order
export const orderItem = pgTable('order_item', {
  id: serial('id').primaryKey(),
  order_id: integer('order_id').references(() => orderTable.id, { onDelete: 'cascade' }).notNull(),
  product_name: text('product_name').notNull(),
  quantity: integer('quantity').default(1).notNull(),
  price_per_dish: decimal('price_per_dish', { precision: 10, scale: 2 }).notNull(),
});