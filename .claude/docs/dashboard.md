# エージェント間コミュニケーションダッシュボード

## 概要
このファイルは、メインエージェントとサブエージェント間のコミュニケーションに使用します。
各エージェントは、このファイルを通じてタスク指示や結果報告を行います。

**履歴の管理**:
- 「履歴」セクションには最新の3件まで保持
- 古い履歴は `.claude/docs/archives.md` へ退避する

---

## 現在のタスク

### メインエージェント → サブエージェント

**タスクステータス**: なし

**担当サブエージェント**: （次のタスク時に記載）

**タスク内容**:
（メインエージェントがサブエージェントに依頼するタスクをここに記載）

**対象ファイル**:
（レビュー対象のファイルパスなどを記載）

**追加指示**:
（特別な注意点があればここに記載）

---

### サブエージェント → メインエージェント

**結果ステータス**: 待機中

**担当サブエージェント**: （サブエージェント起動後に記載）

**実行結果**:
（サブエージェント起動後に結果を記載）

**問題点**:
（サブエージェント起動後に記載）

**推奨事項**:
（サブエージェント起動後に記載）

---

### サブエージェント間連携

#### フロントエンド → バックエンド

**連携ステータス**: なし

**依頼内容**:
（フロントエンドからバックエンドへのAPI実装依頼など）

**必要なAPI**:
- エンドポイント: `/api/xxx`
- HTTPメソッド: GET/POST/PUT/DELETE
- リクエスト形式: （JSON例）
- レスポンス形式: （JSON例）

**対象フロントエンドファイル**:
（APIを呼び出すフロントエンドファイルのパス）

---

#### バックエンド → フロントエンド

**連携ステータス**: なし

**完了通知**:
（バックエンドからフロントエンドへのAPI実装完了通知）

**API情報**:
（API仕様をここに記載）

**対象バックエンドファイル**:
（実装したバックエンドファイルのパス）

**注意事項**:
（特記事項があれば記載）

---

## 履歴

### [2026-02-12] - Phase 5: 既存API呼び出し修正完了
- **発信**: メインエージェント
- **内容**: frontend_developer → typescript_reviewer の連携でPhase 5（既存API呼び出し修正）を実装
- **結果**: ✅ ユーザー承認取得、変更反映完了
- **成果**:
  - 検索APIリクエストに `credentials: 'include'` を付与（セッションクッキー送信）
  - 401レスポンス時に `logout()` を呼び出し、AuthContextのユーザー情報をクリア
  - `App.tsx` の `isAuthenticated ? <SearchPage /> : <LoginPage />` ルーティングにより自動的にLoginPageへ遷移
  - TDDサイクル（Red → Green → Refactor）の実践成功
  - テスト72件すべて成功（カバレッジ87.11%）
  - コード品質評価：保守性・安全性・パフォーマンスすべて優秀
- **実装ファイル**:
  - 新規作成: 1件（frontend/src/__tests__/hooks/useSearch.test.ts: 13テスト追加）
  - 更新: 1件（frontend/src/hooks/useSearch.ts: credentials付与 + 401ハンドリング + useAuth統合）
- **技術詳細**:
  - `useSearch` に `useAuth` フックを統合（logout関数を取得）
  - リダイレクトは明示的な window.location.href ではなく React 状態管理で実現
  - `err instanceof Error` 型ガードによる型安全な例外処理
- **次のステップ**: Phase 4（検索API更新）または他の候補実装

### [2026-02-11] - Phase 3: ハイブリッド検索ロジック実装完了
- **発信**: メインエージェント
- **内容**: backend_developer → typescript_reviewer の連携でPhase 3（ハイブリッド検索ロジック実装）を実装
- **結果**: ✅ ユーザー承認取得、変更反映完了
- **成果**:
  - セマンティック検索 + キーワード検索のハイブリッド検索実装完了
  - `semanticSearch`: エンベディング生成 → pgvectorコサイン類似度検索、失敗時は空配列フォールバック
  - `keywordSearch`: pg_trgm + ILIKE検索
  - `hybridSearch`: 並列実行（Promise.all）+ 重み付きスコアリング（semantic×0.6 + keyword×0.4）+ 重複排除
  - `?mode=keyword` でキーワード検索のみ、デフォルトでhybridSearch使用
  - TDDサイクル（Red → Green → Refactor）の実践成功
  - テスト74件すべて成功（カバレッジ84.51%）
  - コード品質評価：保守性・安全性・パフォーマンスすべて良好
- **実装ファイル**:
  - 新規作成: 2件（backend/src/utils/geminiClient.ts, backend/src/__tests__/searchService.test.ts）
  - 更新: 3件（backend/src/services/searchService.ts, backend/src/routes/search.ts, backend/src/__tests__/search.routes.test.ts）
- **技術詳細**:
  - USE_MOCK_GEMINI=true でのテスト可能性を確保（vi.mock でgeminiClientをモック化）
  - `backend/src/utils/geminiClient.ts` は動的インポートによりrootDir制約を回避（as any 使用）
  - 後方互換性のために `searchDocuments` を `keywordSearch` のラッパーとして維持
- **次のステップ**: Phase 4（検索API更新）または他の候補実装

### [2026-02-11] - Phase 2: 同期時エンベディング生成実装完了
- **発信**: メインエージェント
- **内容**: backend_developer → typescript_reviewer の連携でPhase 2（同期時エンベディング生成）を実装
- **結果**: ✅ ユーザー承認取得、変更反映完了
- **成果**:
  - Qiita記事同期時のエンベディング生成実装完了
  - `DocumentInput` インターフェースに `embedding?: number[]` を追加
  - `upsertDocument()` のSQL文を更新（`$9::vector` 形式でembeddingカラムへ保存）
  - エンベディング生成失敗時も記事同期を継続する設計（エラー耐性）
  - TDDサイクル（Red → Green → Refactor）の実践成功
  - テスト27件すべて成功、主要ファイルカバレッジ100%達成
  - コード品質評価：保守性・安全性・パフォーマンスすべて優秀
- **実装ファイル**:
  - 更新: 4件（documentRepository.ts, sync-qiita.ts, documentRepository.test.ts, sync-qiita.test.ts）
- **技術詳細**:
  - タイトル+本文を結合してエンベディング生成（`title\nbody`）
  - embeddingなしの場合はNULL保存（後から一括更新可能）
  - vi.mock でgeminiClientをモック化（外部API呼び出しなしでテスト可能）
- **次のステップ**: Phase 3（ハイブリッド検索ロジック実装）

---

## 使用方法

### メインエージェント
1. サブエージェントにタスクを依頼する前に、「現在のタスク」セクションに指示を記載
   - 担当サブエージェントを明記（frontend_developer / backend_developer / typescript_reviewer等）
2. サブエージェント起動後、「サブエージェント → メインエージェント」セクションを確認
3. 結果を受け取ったら、履歴に記録（最新の３件まで保持）してセクションをクリア
4. 古い履歴は、`.claude/docs/archives.md`へ退避する。

### 開発サブエージェント（frontend_developer / backend_developer）
1. 起動時に「メインエージェント → サブエージェント」セクションを確認
2. TDDサイクルで実装（Red → Green → Refactor）
3. 実装完了後、「サブエージェント → メインエージェント」セクションに結果を記載
4. **他のサブエージェントとの連携が必要な場合**:
   - フロントエンド → バックエンド: 「フロントエンド → バックエンド」セクションにAPI依頼を記載
   - バックエンド → フロントエンド: 「バックエンド → フロントエンド」セクションにAPI情報を記載
   - メインエージェントに報告して、相手側サブエージェントの起動を依頼

### レビューサブエージェント（typescript_reviewer）
1. 起動時に「メインエージェント → サブエージェント」セクションを確認
2. レビュー実行後、「サブエージェント → メインエージェント」セクションに結果を記載
3. メインエージェントへの返答完了後、履歴に記録（最新の1件のみ保持）
