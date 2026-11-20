import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const memoryKey = randomBytes(32);

function getEncryptionKey(): Buffer {
  const secret = process.env.ENCRYPTION_SECRET;
  if (secret) {
    return /^[a-f\d]{64}$/i.test(secret)
      ? Buffer.from(secret, "hex")
      : createHash("sha256").update(secret).digest();
  }

  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    throw new Error("Set ENCRYPTION_SECRET to use background watchers with Redis.");
  }
  return memoryKey;
}

export interface EncryptedData {
  iv: string;
  tag: string;
  ciphertext: string;
}
export function encryptCredential(plainText: string): EncryptedData {
  const key = getEncryptionKey();
  const iv = randomBytes(12);

  const cipher = createCipheriv(ALGORITHM, key, iv);
  let ciphertext = cipher.update(plainText, "utf8", "hex");
  ciphertext += cipher.final("hex");
  const tag = cipher.getAuthTag().toString("hex");

  return {
    iv: iv.toString("hex"),
    tag,
    ciphertext,
  };
}

export function decryptCredential(data: EncryptedData): string {
  const key = getEncryptionKey();
  const iv = Buffer.from(data.iv, "hex");
  const tag = Buffer.from(data.tag, "hex");

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(data.ciphertext, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}
