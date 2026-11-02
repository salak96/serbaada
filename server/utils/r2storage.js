import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOCAL_UPLOADS = path.join(__dirname, '..', '..', 'public', 'uploads');

if (!fs.existsSync(LOCAL_UPLOADS)) {
  fs.mkdirSync(LOCAL_UPLOADS, { recursive: true });
}

const ACCOUNT_ID = process.env.R2_ACCOUNT_ID || '';
const ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || '';
const SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || '';
const BUCKET_NAME = process.env.R2_BUCKET_NAME || process.env.R2_BUCKET || 'androidstore-payment-proofs';
const ENDPOINT = process.env.R2_ENDPOINT || (ACCOUNT_ID ? `https://${ACCOUNT_ID}.r2.cloudflarestorage.com` : '');

let s3Client = null;

if (ACCESS_KEY_ID && SECRET_ACCESS_KEY && ENDPOINT) {
  try {
    s3Client = new S3Client({
      region: 'auto',
      endpoint: ENDPOINT,
      credentials: {
        accessKeyId: ACCESS_KEY_ID,
        secretAccessKey: SECRET_ACCESS_KEY,
      },
    });
    console.log('✓ [R2 Storage] Cloudflare R2 S3 Client initialized successfully for bucket:', BUCKET_NAME);
  } catch (err) {
    console.warn('! [R2 Storage] Failed to initialize S3Client, falling back to local storage:', err.message);
  }
} else {
  console.log('ℹ [R2 Storage] Cloudflare R2 credentials not provided in .env. Using local persistent storage fallback (/public/uploads).');
}

/**
 * Upload payment proof file to Cloudflare R2 (or fallback to local disk)
 */
export async function uploadPaymentProof(fileBuffer, originalName, mimeType, orderId) {
  return uploadToStorage(fileBuffer, originalName, mimeType, `payment-proofs/${orderId || 'general'}`);
}

export async function uploadProductImage(fileBuffer, originalName, mimeType, productId) {
  return uploadToStorage(fileBuffer, originalName, mimeType, `product-images/${productId || 'general'}`);
}

async function uploadToStorage(fileBuffer, originalName, mimeType, folder) {
  const ext = path.extname(originalName).toLowerCase() || '.jpg';
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const randomId = Math.random().toString(36).slice(2, 10);
  const objectKey = `${folder}/${year}/${month}/${randomId}${ext}`;

  if (s3Client) {
    try {
      const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: objectKey,
        Body: fileBuffer,
        ContentType: mimeType || 'image/jpeg',
      });

      await s3Client.send(command);
      console.log('✓ [R2 Storage] Successfully uploaded file to R2:', objectKey);
      return {
        storageType: 'r2',
        pathOrKey: objectKey,
        url: `/api/storage/signed-url?key=${encodeURIComponent(objectKey)}`,
      };
    } catch (err) {
      console.error('! [R2 Storage] Upload to R2 failed, falling back to local storage:', err.message);
    }
  }

  // Local Fallback Storage
  const filename = `proof_${orderId || 'ord'}_${Date.now()}${ext}`;
  const localPath = path.join(LOCAL_UPLOADS, filename);
  fs.writeFileSync(localPath, fileBuffer);

  return {
    storageType: 'local',
    pathOrKey: `/uploads/${filename}`,
    url: `/uploads/${filename}`,
  };
}

/**
 * Generate a secure short-lived presigned URL for R2 objects, or return local URL
 */
export async function getSecureStorageUrl(objectKeyOrPath) {
  if (!objectKeyOrPath) return '';
  if (objectKeyOrPath.startsWith('/uploads/') || objectKeyOrPath.startsWith('http')) {
    return objectKeyOrPath;
  }

  if (s3Client) {
    try {
      const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: objectKeyOrPath,
      });
      // Presigned URL valid for 60 seconds
      const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 60 });
      return signedUrl;
    } catch (err) {
      console.error('! [R2 Storage] Failed to generate presigned URL:', err.message);
    }
  }

  return objectKeyOrPath;
}

export const getSecureProofUrl = getSecureStorageUrl;
