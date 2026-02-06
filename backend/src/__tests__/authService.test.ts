import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createUser, findUserByUsername, findUserById, updateQiitaToken, getDecryptedQiitaToken } from '../services/authService';
import * as db from '../db/client';

// DBクライアントをモック化
vi.mock('../db/client');

describe('authService', () => {
  beforeEach(() => {
    // 環境変数設定
    process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createUser()', () => {
    it('新規ユーザーを作成して暗号化されたトークンと共にDBに保存する', async () => {
      const mockResult = {
        rows: [{
          id: 1,
          username: 'testuser',
          email: 'test@example.com',
          encrypted_qiita_token: 'encrypted:token:data',
          created_at: new Date(),
          updated_at: new Date()
        }],
        command: 'INSERT',
        rowCount: 1,
        oid: 0,
        fields: []
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(db.query).mockResolvedValueOnce(mockResult as any);

      const user = await createUser({
        username: 'testuser',
        email: 'test@example.com',
        qiitaToken: 'plain-qiita-token-12345'
      });

      expect(user.id).toBe(1);
      expect(user.username).toBe('testuser');
      expect(user.email).toBe('test@example.com');

      // DBにINSERTが呼ばれたことを確認
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users'),
        expect.arrayContaining(['testuser', 'test@example.com', expect.any(String)])
      );

      // 暗号化されたトークンが保存されていることを確認（平文ではない）
      const callArgs = vi.mocked(db.query).mock.calls[0];
      const encryptedToken = callArgs[1]?.[2] as string;
      expect(encryptedToken).not.toBe('plain-qiita-token-12345');
      expect(encryptedToken).toMatch(/^[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$/); // iv:authTag:encryptedData形式
    });

    it('ユーザー名が重複している場合はエラーをスローする', async () => {
      const mockError = new Error('duplicate key value violates unique constraint');
      vi.mocked(db.query).mockRejectedValueOnce(mockError);

      await expect(createUser({
        username: 'duplicate',
        email: 'test@example.com',
        qiitaToken: 'token'
      })).rejects.toThrow();
    });
  });

  describe('findUserByUsername()', () => {
    it('ユーザー名でユーザーを検索して返す', async () => {
      const mockResult = {
        rows: [{
          id: 1,
          username: 'testuser',
          email: 'test@example.com',
          encrypted_qiita_token: 'encrypted:token:data',
          created_at: new Date(),
          updated_at: new Date()
        }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(db.query).mockResolvedValueOnce(mockResult as any);

      const user = await findUserByUsername('testuser');

      expect(user).toBeDefined();
      expect(user?.username).toBe('testuser');
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        ['testuser']
      );
    });

    it('ユーザーが見つからない場合はnullを返す', async () => {
      const mockResult = { rows: [], command: 'SELECT', rowCount: 0, oid: 0, fields: [] };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(db.query).mockResolvedValueOnce(mockResult as any);

      const user = await findUserByUsername('nonexistent');

      expect(user).toBeNull();
    });
  });

  describe('findUserById()', () => {
    it('IDでユーザーを検索して返す', async () => {
      const mockResult = {
        rows: [{
          id: 1,
          username: 'testuser',
          email: 'test@example.com',
          encrypted_qiita_token: 'encrypted:token:data',
          created_at: new Date(),
          updated_at: new Date()
        }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(db.query).mockResolvedValueOnce(mockResult as any);

      const user = await findUserById(1);

      expect(user).toBeDefined();
      expect(user?.id).toBe(1);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        [1]
      );
    });

    it('ユーザーが見つからない場合はnullを返す', async () => {
      const mockResult = { rows: [], command: 'SELECT', rowCount: 0, oid: 0, fields: [] };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(db.query).mockResolvedValueOnce(mockResult as any);

      const user = await findUserById(999);

      expect(user).toBeNull();
    });
  });

  describe('updateQiitaToken()', () => {
    it('ユーザーのQiitaトークンを更新する', async () => {
      const mockResult = {
        rows: [{
          id: 1,
          username: 'testuser',
          email: 'test@example.com',
          encrypted_qiita_token: 'new:encrypted:token',
          created_at: new Date(),
          updated_at: new Date()
        }],
        command: 'UPDATE',
        rowCount: 1,
        oid: 0,
        fields: []
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(db.query).mockResolvedValueOnce(mockResult as any);

      const user = await updateQiitaToken(1, 'new-token-67890');

      expect(user.id).toBe(1);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users'),
        expect.arrayContaining([expect.any(String), 1])
      );

      // 新しい暗号化トークンが保存されていることを確認
      const callArgs = vi.mocked(db.query).mock.calls[0];
      const encryptedToken = callArgs[1]?.[0] as string;
      expect(encryptedToken).not.toBe('new-token-67890');
      expect(encryptedToken).toMatch(/^[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$/);
    });

    it('存在しないユーザーIDを指定した場合はエラーをスローする', async () => {
      const mockResult = { rows: [], command: 'UPDATE', rowCount: 0, oid: 0, fields: [] };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(db.query).mockResolvedValueOnce(mockResult as any);

      await expect(updateQiitaToken(999, 'token')).rejects.toThrow('User not found');
    });
  });

  describe('getDecryptedQiitaToken()', () => {
    it('ユーザーIDからQiitaトークンを取得して復号化して返す', async () => {
      // 実際に暗号化したトークンを作成
      const { encrypt } = await import('../utils/encryption');
      const plainToken = 'test-qiita-token-12345';
      const encryptedToken = encrypt(plainToken);

      const mockResult = {
        rows: [{
          id: 1,
          username: 'testuser',
          email: 'test@example.com',
          encrypted_qiita_token: encryptedToken,
          created_at: new Date(),
          updated_at: new Date()
        }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(db.query).mockResolvedValueOnce(mockResult as any);

      const token = await getDecryptedQiitaToken(1);

      expect(token).toBe(plainToken);
    });

    it('ユーザーが見つからない場合はnullを返す', async () => {
      const mockResult = { rows: [], command: 'SELECT', rowCount: 0, oid: 0, fields: [] };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(db.query).mockResolvedValueOnce(mockResult as any);

      const token = await getDecryptedQiitaToken(999);

      expect(token).toBeNull();
    });
  });
});
