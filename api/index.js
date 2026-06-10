import express from 'express';
import router from '../src/routes/index.js'; // Asegúrate de que este archivo exista

const app = express();

app.use(express.json());
app.use('/api', router);

// Exportamos 'app' directamente para que Vercel pueda usarla 
// y para que index.js pueda hacer app.listen()
export default app;