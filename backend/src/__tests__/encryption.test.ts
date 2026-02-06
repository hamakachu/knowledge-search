import { describe, it, expect, beforeAll } from 'vitest';
import { encrypt, decrypt } from '../utils/encryption';

describe('encryption utility', () => {
  // テスト前に環境変数を設定
  beforeAll(() => {
    // 32バイト（64文字のHEX）のテスト用暗号化キー
    process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  });

  describe('encrypt()', () => {
    it('平文を暗号化してiv:authTag:encryptedData形式の文字列を返す', () => {
      const plaintext = 'test-qiita-token-12345';
      const encrypted = encrypt(plaintext);

      // 形式チェック: "iv:authTag:encryptedData"
      const parts = encrypted.split(':');
      expect(parts).toHaveLength(3);

      // HEX文字列であることを確認
      parts.forEach(part => {
        expect(part).toMatch(/^[0-9a-f]+$/);
      });
    });

    it('同じ平文でも毎回異なる暗号文を生成する（ランダムIV）', () => {
      const plaintext = 'test-qiita-token-12345';
      const encrypted1 = encrypt(plaintext);
      const encrypted2 = encrypt(plaintext);

      expect(encrypted1).not.toBe(encrypted2);
    });

    it('空文字列を暗号化できる', () => {
      const encrypted = encrypt('');
      expect(encrypted).toBeTruthy();
      expect(encrypted.split(':')).toHaveLength(3);
    });
  });

  describe('decrypt()', () => {
    it('暗号文を復号化して元の平文を返す', () => {
      const plaintext = 'test-qiita-token-12345';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('長い文字列を暗号化・復号化できる', () => {
      const plaintext = 'a'.repeat(1000);
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('日本語を含む文字列を暗号化・復号化できる', () => {
      const plaintext = 'テストトークン-あいうえお-12345';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('空文字列を復号化できる', () => {
      const encrypted = encrypt('');
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe('');
    });

    it('不正な形式の暗号文でエラーをスローする', () => {
      expect(() => decrypt('invalid-format')).toThrow();
      expect(() => decrypt('only:two')).toThrow(); // 2パートなのでエラー
    });

    it('改ざんされた暗号文でエラーをスローする（認証失敗）', () => {
      const plaintext = 'test-qiita-token-12345';
      const encrypted = encrypt(plaintext);

      // 暗号文の一部を改ざん
      const parts = encrypted.split(':');
      parts[2] = '0' + parts[2].substring(1); // encryptedDataを改ざん
      const tampered = parts.join(':');

      expect(() => decrypt(tampered)).toThrow();
    });
  });

  describe('環境変数エラーハンドリング', () => {
    it('ENCRYPTION_KEYが未設定の場合はエラーをスローする', () => {
      const originalKey = process.env.ENCRYPTION_KEY;
      delete process.env.ENCRYPTION_KEY;

      expect(() => encrypt('test')).toThrow('ENCRYPTION_KEY is not set');
      expect(() => decrypt('test:test:test')).toThrow('ENCRYPTION_KEY is not set');

      // テスト後に復元
      process.env.ENCRYPTION_KEY = originalKey;
    });

    it('ENCRYPTION_KEYが不正な長さの場合はエラーをスローする', () => {
      const originalKey = process.env.ENCRYPTION_KEY;
      process.env.ENCRYPTION_KEY = 'short'; // 短すぎるキー

      expect(() => encrypt('test')).toThrow();

      // テスト後に復元
      process.env.ENCRYPTION_KEY = originalKey;
    });
  });
});
