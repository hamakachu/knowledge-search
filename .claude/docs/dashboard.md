# エージェント間コミュニケーションダッシュボード

## 概要
このファイルは、メインエージェントとサブエージェント間のコミュニケーションに使用します。
各エージェントは、このファイルを通じてタスク指示や結果報告を行います。

---

## 現在のタスク

### メインエージェント → サブエージェント

**タスクステータス**: スキル作成依頼（動作テスト）

**担当サブエージェント**: skill_creator

**タスク内容**:
以下の繰り返しパターンをスキル化したい

**繰り返し回数**: 5回以上

**具体例**:
1. バックエンド実装完了後 → `pnpm typecheck && pnpm lint && pnpm test` を実行
2. フロントエンド実装完了後 → `pnpm typecheck && pnpm lint && pnpm test` を実行
3. レビュー前の動作確認 → `pnpm typecheck && pnpm lint && pnpm test` を実行
4. コード修正後の確認 → `pnpm typecheck && pnpm lint && pnpm test` を実行
5. ユーザー承認前の最終確認 → `pnpm typecheck && pnpm lint && pnpm test` を実行

**スキル名候補**: quality-check

**対象ファイル**:
- 作成予定: `skills/quality-check/SKILL.md`
- 作成予定: `skills/quality-check/README.md`
- 更新予定: `CLAUDE.md`

**追加指示**:
- バックエンドとフロントエンドの両方に対応
- ビルドチェック（`pnpm build`）もオプションで含める
- テストカバレッジ（`pnpm test -- --coverage`）もオプションで含める

---

### サブエージェント → メインエージェント

**結果ステータス**: ✅ スキル作成完了

**担当サブエージェント**: skill_creator

**実行結果**:
`quality-check` スキルの作成が完了しました。

**作成内容**:
- 品質チェック（typecheck + lint + test）を一括実行するスキル
- バックエンド、フロントエンド、sync-workerの全プロジェクトに対応
- カバレッジチェック、ビルドチェックのオプション対応

**実装/変更ファイル**:
1. `/Users/hiroaki/Documents/GitHub/groovy-knowledge-search/skills/quality-check/SKILL.md` - スキル定義（新規作成）
2. `/Users/hiroaki/Documents/GitHub/groovy-knowledge-search/skills/quality-check/README.md` - 使用例とドキュメント（新規作成）
3. `/Users/hiroaki/Documents/GitHub/groovy-knowledge-search/CLAUDE.md` - スキル情報追加（更新）

**スキルの特徴**:
- **パラメータ対応**:
  - `target`: all / backend / frontend / sync-worker
  - `coverage`: true / false（テストカバレッジ）
  - `build`: true / false（ビルドチェック）
- **実行フロー**: typecheck → lint → test → (coverage) → (build)
- **レビュープロセス連携**: typescript_reviewerの必須チェック項目をすべてカバー

**使用方法**:
```
/quality-check
/quality-check target=backend
/quality-check coverage=true build=true
```

**問題点**:
なし

**推奨事項**:
1. このスキルを実装完了後の動作確認に活用してください
2. レビュー前は `/quality-check coverage=true build=true` を実行することを推奨
3. 対象を絞って効率化（例: `target=backend`）も可能です

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

### [2026-02-04] - データベース統合実装承認・完了
- **発信**: メインエージェント
- **内容**: データベース統合実装をユーザーに報告
- **結果**: ✅ ユーザー承認取得、変更反映完了
- **成果**:
  - PostgreSQLデータベースからの実データ取得実装完了
  - フロントエンド型定義更新完了（`lastUpdated: string | null`）
  - データベースが空の場合の適切なハンドリング実装
  - バックエンド・フロントエンド間の型定義の整合性確保
  - TDDサイクル（Red → Green → Refactor）の実践成功
  - エージェント連携フロー（backend_developer → frontend_developer → typescript_reviewer）の確立

---

## 使用方法

### メインエージェント
1. サブエージェントにタスクを依頼する前に、「現在のタスク」セクションに指示を記載
   - 担当サブエージェントを明記（frontend_developer / backend_developer / typescript_reviewer等）
2. サブエージェント起動後、「サブエージェント → メインエージェント」セクションを確認
3. 結果を受け取ったら、履歴に記録（最新の1件のみ保持）してセクションをクリア

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
