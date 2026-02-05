# 外部API依存の実装パターン

## 課題

Qiita Team APIなど、外部サービスに依存する機能を開発時にどうテストするか

## 解決策

フィクスチャデータ + 環境変数切り替えパターン

---

## 実装手順

### 1. フィクスチャデータの作成

```
sync-worker/src/__fixtures__/qiita-articles.json
```

実際のAPIレスポンス構造を模したサンプルデータを作成

### 2. 環境変数の追加

```bash
# .env
USE_MOCK_QIITA=true  # 開発時
```

### 3. クライアント実装に分岐を追加

環境変数 `USE_MOCK_QIITA=true` でフィクスチャデータを返す。`false` で実際のAPIを呼び出す。

### 4. tsconfig.jsonの設定

`"resolveJsonModule": true` を追加してJSONインポートを許可。

---

## メリット

- ✅ 外部APIトークン不要で開発可能
- ✅ オフライン開発が可能
- ✅ テストが安定（ネットワーク依存なし）
- ✅ CI/CDで確実に動作
- ✅ 環境変数1つで本番/モック切り替え

---

## 注意点

- フィクスチャデータは実際のAPIレスポンス構造と同期させる
- 本番環境では必ず `USE_MOCK_QIITA=false` に設定
