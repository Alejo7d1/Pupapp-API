import { Router } from 'express';
import multer from 'multer';
import { validateToken } from '../middleware/auth.js';
import { register, login } from '../controllers/auth.js';
import { getAllProducts, getProductById, createProduct, updateProduct, deleteProduct } from '../controllers/products.js';
import { getAllOrders, getActiveOrders, getOrderDetails, createOrder, updateOrderStatus, deleteOrder } from '../controllers/orders.js';

const upload = multer({ storage: multer.memoryStorage() });
const router = Router();

// Mensaje de bienvenida para confirmar que los endpoints están activos
router.get('/', (req, res) => {
  res.json({ 
    message: "Bienvenido a la Pupapp API", 
    status: "online",
    version: "1.0.0" 
  });
});

// Rutas Públicas (Autenticación del Tenant)
router.post('/auth/register', register);
router.post('/auth/login', login);

// Rutas Protegidas por Token de Validación de Acceso
router.get('/products', validateToken, getAllProducts);
router.get('/products/:id', validateToken, getProductById);
router.post('/products', validateToken, upload.single('image'), createProduct);
router.put('/products/:id', validateToken, upload.single('image'), updateProduct);
router.delete('/products/:id', validateToken, deleteProduct);

router.get('/orders', validateToken, getAllOrders);
router.get('/orders/active', validateToken, getActiveOrders);
router.get('/orders/:id', validateToken, getOrderDetails);
router.post('/orders', validateToken, createOrder);
router.patch('/orders/:id/status', validateToken, updateOrderStatus);
router.delete('/orders/:id', validateToken, deleteOrder);

export default router;