import * as dotenv from 'dotenv';

dotenv.config();

import app from './api/index.js';

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Pupapp API corriendo en http://localhost:${PORT}`);
});