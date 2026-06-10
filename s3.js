import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

let _s3Client = null;

const getS3Client = () => {
  if (_s3Client) return _s3Client;

  _s3Client = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID?.trim()}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID?.trim(),
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY?.trim(),
    },
  });
  return _s3Client;
};

export const uploadToR2 = async (file, accessName) => {
  const bucketName = process.env.R2_BUCKET_NAME?.trim();
  const publicUrlBase = process.env.R2_PUBLIC_URL?.trim();
  const accountId = process.env.R2_ACCOUNT_ID?.trim();
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();

  // Validación exhaustiva de todas las variables necesarias para R2
  const missingVars = [];
  if (!bucketName) missingVars.push("R2_BUCKET_NAME");
  if (!publicUrlBase) missingVars.push("R2_PUBLIC_URL");
  if (!accountId) missingVars.push("R2_ACCOUNT_ID");
  if (!accessKeyId) missingVars.push("R2_ACCESS_KEY_ID");
  if (!secretAccessKey) missingVars.push("R2_SECRET_ACCESS_KEY");

  if (missingVars.length > 0) {
    throw new Error(`Configuración de R2 incompleta en .env. Faltan: ${missingVars.join(", ")}`);
  }

  // Guardado en una carpeta con el nombre del restaurante
  const fileName = `${accessName}/products/${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`;
  
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: fileName,
    Body: file.buffer,
    ContentType: file.mimetype,
  });

  await getS3Client().send(command);
  const publicUrl = publicUrlBase.replace(/\/$/, '');
  return `${publicUrl}/${fileName}`;
};

export const deleteFromR2 = async (imageUrl) => {
  const publicUrlBase = process.env.R2_PUBLIC_URL?.trim().replace(/\/$/, '');
  if (!imageUrl || !publicUrlBase || !imageUrl.startsWith(publicUrlBase)) return;

  // Extraemos la llave (key) de la URL pública
  const key = imageUrl.replace(`${publicUrlBase}/`, '');

  const command = new DeleteObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME?.trim(),
    Key: key,
  });

  const client = getS3Client();
  await client.send(command);
};