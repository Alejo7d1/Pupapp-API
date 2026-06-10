import express from 'express';
import router from '../src/routes/index.js';

const app = express();

app.use(express.json());

// Página de inicio sencilla para la raíz del dominio
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Pupapp API</title>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background-color: #f0f2f5; color: #1c1e21; }
            .card { background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); text-align: center; max-width: 400px; }
            h1 { color: #e67e22; margin-top: 0; }
            p { margin-bottom: 1.5rem; line-height: 1.5; color: #606770; }
            .badge { display: inline-block; padding: 0.25rem 0.75rem; background-color: #27ae60; color: white; border-radius: 20px; font-size: 0.8rem; font-weight: bold; }
        </style>
    </head>
    <body>
        <div class="card">
            <h1>Pupapp API</h1>
            <p>El backend está en línea. El acceso a los recursos está restringido a clientes autorizados.</p>
            <div class="badge">SISTEMA ACTIVO</div>
        </div>
    </body>
    </html>
  `);
});

app.use('/api', router);

export default app;