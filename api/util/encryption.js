// api/util/encryption.js
import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';

const getSecretKey = () => {
  let key = process.env.ENCRYPTION_KEY;
  
  if (!key) {
    console.warn('⚠️ ENCRYPTION_KEY not found, using development default');
    key = 'dev-key-for-testing-32-bytes!!'; // 정확히 32바이트
  }
  
  if (key.length !== 32) {
    throw new Error(`ENCRYPTION_KEY must be exactly 32 bytes long, got ${key.length} bytes`);
  }
  
  return Buffer.from(key, 'utf8'); // Buffer로 변환
};

export const encrypt = (text) => {
  const secretKey = getSecretKey();
  
  // IV 생성 (16바이트)
  const iv = crypto.randomBytes(16);
  
  // 암호화 객체 생성 (올바른 현대적 방법)
  const cipher = crypto.createCipheriv(ALGORITHM, secretKey, iv);
  
  // 암호화 수행
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  // IV:EncryptedData 형태로 저장
  return `${iv.toString('hex')}:${encrypted}`;
};

export const decrypt = (encryptedData) => {
  const secretKey = getSecretKey();
  
  const [ivHex, encrypted] = encryptedData.split(':');
  
  if (!ivHex || !encrypted) {
    throw new Error('Invalid encrypted data format');
  }
  
  const iv = Buffer.from(ivHex, 'hex');
  
  // 복호화 객체 생성 (올바른 현대적 방법)
  const decipher = crypto.createDecipheriv(ALGORITHM, secretKey, iv);
  
  // 복호화 수행
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
};