import * as dotenv from 'dotenv';

dotenv.config();

import app from './api/index.js';

const PORT = process.env.PORT || 3000;

// Verificar si existe y mostrar solo una pista (mascarada)
if (process.env.JWT_REFRESH_SECRET) {
  const secret = process.env.JWT_REFRESH_SECRET;
  // Mostramos solo los primeros 3 y últimos 3 caracteres
  console.log('JWT_REFRESH_SECRET cargado correctamente:', `${secret.substring(0, 3)}***${secret.slice(-3)}`);
} else {
  // Si no existe, usamos console.warn para que resalte en tus logs
  console.warn('ADVERTENCIA: JWT_REFRESH_SECRET no está definido. Se usará el fallback.');
}

app.listen(PORT, () => {
  console.log(`Pupapp API corriendo en http://localhost:${PORT}`);
});