import * as dotenv from 'dotenv';

// Cargamos dotenv y capturamos el resultado para debug
dotenv.config();

import app from './api/index.js'; // Ahora importamos la instancia de express

const PORT = process.env.PORT || 3000; // Volvemos al puerto 3000 por defecto

// Aquí app ya es la instancia de express, así que .listen debería funcionar
app.listen(PORT, () => {
  console.log(`🚀 Pupapp API corriendo en http://localhost:${PORT}`);
});