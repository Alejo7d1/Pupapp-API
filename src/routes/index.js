import { Router } from 'express';
import multer from 'multer';
import { validateToken } from '../middleware/auth.js';
import { register, login, refresh } from '../controllers/auth.js';
import { getAllProducts, getProductById, createProduct, updateProduct, deleteProduct } from '../controllers/products.js';
import { getAllOrders, getActiveOrders, getDeliveredOrdersByPeriod, getOrderDetails, createOrder, updateOrderStatus, deleteOrder } from '../controllers/orders.js';

const upload = multer({ storage: multer.memoryStorage() });
const router = Router();

// Middleware de registro de logs para cada solicitud
router.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const id = req.restaurant_id ? `@${req.access_name} (ID: ${req.restaurant_id})` : 'Public/Auth';
    console.log(`[${new Date().toISOString()}] ${req.ip} | ${id} | ${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// Mensaje de bienvenida para confirmar que los endpoints están activos
router.get('/', (req, res) => {
  res.json({ 
    message: "Bienvenido a la Pupapp API", 
    status: "online",
    version: "1.0.0" 
  });
});

// Rutas Públicas
router.post('/auth/register', register);
router.post('/auth/login', login);
router.post('/auth/refresh', refresh);

// Rutas Protegidas por Token de Validación de Acceso
router.get('/products', validateToken, getAllProducts);
router.get('/products/:id', validateToken, getProductById);
router.post('/products', validateToken, upload.single('image'), createProduct);
router.put('/products/:id', validateToken, upload.single('image'), updateProduct);
router.delete('/products/:id', validateToken, deleteProduct);

router.get('/orders', validateToken, getAllOrders);
router.get('/orders/active', validateToken, getActiveOrders);
router.get('/orders/delivered', validateToken, getDeliveredOrdersByPeriod);
router.get('/orders/:id', validateToken, getOrderDetails);
router.post('/orders', validateToken, createOrder);
router.patch('/orders/:id/status', validateToken, updateOrderStatus);
router.delete('/orders/:id', validateToken, deleteOrder);

export default router;