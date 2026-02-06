import crypto from 'crypto';

/**
 * AES-256-GCM暗号化ユーティリティ
 *
 * - AES-256-GCM: 認証付き暗号化（改ざん検知機能付き）
 * - ランダムIV: 毎回異なる暗号文を生成
 * - 環境変数ENCRYPTION_KEYで鍵を管理（32バイト = 64文字のHEX）
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128 bits

/**
 * 暗号化キーを取得
 * @throws {Error} ENCRYPTION_KEYが未設定の場合
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error('ENCRYPTION_KEY is not set');
  }

  // HEX文字列からBufferに変換（32バイト = 64文字）
  return Buffer.from(key, 'hex');
}

/**
 * 平文を暗号化
 *
 * @param plaintext - 暗号化する平文
 * @returns 暗号文（形式: "iv:authTag:encryptedData"、すべてHEX文字列）
 * @throws {Error} 暗号化に失敗した場合
 */
export function encrypt(plaintext: string): string {
  try {
    const key = getEncryptionKey();

    // ランダムIV生成
    const iv = crypto.randomBytes(IV_LENGTH);

    // 暗号化
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final()
    ]);

    // 認証タグ取得
    const authTag = cipher.getAuthTag();

    // 形式: "iv:authTag:encryptedData"（すべてHEX）
    return [
      iv.toString('hex'),
      authTag.toString('hex'),
      encrypted.toString('hex')
    ].join(':');
  } catch (error) {
    throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * 暗号文を復号化
 *
 * @param ciphertext - 暗号文（形式: "iv:authTag:encryptedData"）
 * @returns 復号化された平文
 * @throws {Error} 復号化に失敗した場合（形式不正、改ざん検知、キー不正等）
 */
export function decrypt(ciphertext: string): string {
  try {
    const key = getEncryptionKey();

    // 形式チェック: "iv:authTag:encryptedData"
    const parts = ciphertext.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid ciphertext format');
    }

    const [ivHex, authTagHex, encryptedHex] = parts;

    // HEXからBufferに変換
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');

    // 復号化
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ]);

    return decrypted.toString('utf8');
  } catch (error) {
    throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
