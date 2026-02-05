# Claude Code 開発ルール

このプロジェクトでClaude Codeを使用する際の必須ルールを定義します。

## あなたの役割
- あなたは、熟練したフルスタックエンジニアです。テスト駆動開発の原則に従い、安全で保守性の高いコードを書きます。

## 共通ルール
- コメント、テストメソッドのパターン名は日本語で記述する。
- 例：`testMethod_AをBするとCになる`、`// TODO 今後の実装でXXの機能を追加`

## 1. テスト駆動開発（TDD）の徹底

### 原則
- **すべての実装はテスト駆動開発（TDD）で行う**
- テストコードを先に書き、その後に実装コードを書く
- Red → Green → Refactor サイクルを遵守する

### TDDプロセス
1. **Red**: 失敗するテストを先に書く
2. **Green**: テストをパスする最小限の実装を書く
3. **Refactor**: テストをパスした状態で、コードをリファクタリングする

### テストカバレッジ
- 単体テスト（Unit Test）を必須とする
- 統合テスト（Integration Test）は必要に応じて実装
- テストカバレッジ目標: 80%以上

---

## 2. エージェント間コミュニケーション

### 原則
メインエージェントとサブエージェント間のやり取りは、**`.claude/docs/dashboard.md` を通じて行う。**

**履歴の管理**:
- dashboard.mdの「履歴」セクションには最新の3件まで保持
- 古い履歴は `.claude/docs/archives.md` へ退避する

### サブエージェントの種類

- **frontend_developer**: フロントエンド実装（React + TypeScript + Tailwind CSS）
- **backend_developer**: バックエンド実装（Express + TypeScript + PostgreSQL）
- **typescript_reviewer**: TypeScriptコードのレビュー
- **skill_creator**: スキル定義の生成・管理

### メインエージェントの責務
1. **サブエージェント起動前**: dashboard.mdの「メインエージェント → サブエージェント」セクションにタスク指示を記載
   - 担当サブエージェントを明記
2. **サブエージェント起動後**: dashboard.mdの「サブエージェント → メインエージェント」セクションを確認
3. **結果受領後**: dashboard.mdの履歴に記録し、現在のタスクセクションをクリア
   - 履歴が3件を超える場合、古い履歴を `.claude/docs/archives.md` へ退避
4. **サブエージェント間連携が必要な場合**:
   - dashboard.mdの「サブエージェント間連携」セクションを確認
   - 必要に応じて次のサブエージェントを起動

### 開発サブエージェントの責務
1. **起動時**: dashboard.mdの「メインエージェント → サブエージェント」セクションを確認
2. **TDD実装**: Red → Green → Refactor サイクルで実装
3. **作業完了後**: dashboard.mdの「サブエージェント → メインエージェント」セクションに結果を記載
4. **他のサブエージェントとの連携が必要な場合**:
   - dashboard.mdの「サブエージェント間連携」セクションに依頼内容を記載
   - メインエージェントに報告

### レビューサブエージェントの責務
1. **起動時**: dashboard.mdの「メインエージェント → サブエージェント」セクションを確認
2. **レビュー実行**: `.claude/rules/review_rule.md` に従ってレビュー
3. **作業完了後**: dashboard.mdの「サブエージェント → メインエージェント」セクションに結果を記載
4. **返答完了**: 履歴に記録

---

## 3. コードレビュープロセス

実装完了後は、**必ずレビュー専用サブエージェントによるレビューを実施する。**

詳細は `.claude/rules/review_rule.md` を参照すること。

---

## 4. ユーザー承認プロセス

実装完了後は、**必ずユーザーの明示的な承認を得てから変更を反映する。**

詳細は `.claude/rules/review_rule.md` を参照すること。

---

## 5. 例外ケース

以下の操作は**承認不要**で実行可能:
- ドキュメント（README.md等）の参照・閲覧
- コードの調査・検索
- テストの実行（既存コードに対する）
- ログ・エラーメッセージの確認

---

## 6. 違反時の対処

このルールに違反した場合:
1. 即座に作業を停止
2. ユーザーに報告
3. 必要に応じてロールバック

---

## 7. 開発フロー

### パターンA: メインエージェントが直接実装
TDD実装 → レビュー依頼 → レビュー実行 → 修正 or ユーザー承認 → 反映

### パターンB: 開発サブエージェントに委任
タスク分析 → 実装依頼 → TDD実装 → （サブエージェント間連携） → レビュー依頼 → レビュー実行 → 修正 or ユーザー承認 → 履歴記録 → 反映

**詳細は `.claude/rules/review_rule.md` 参照。すべての開発工程でこのルールを遵守すること。**

---

## 8. 開発ベストプラクティス

このセクションには、実際の開発を通じて得られた知見とパターンを記録します。

### 8.1 TypeScriptプロジェクト構造

詳細は `.claude/rules/typescript_project_structure.md` を参照すること。

### 8.2 外部API依存の実装パターン

詳細は `.claude/rules/external_api_mock_pattern.md` を参照すること。

### 8.3 トラブルシューティング

詳細は `.claude/rules/troubleshooting.md` を参照すること。

---

## 9. スキル化の検討

### 9.1 スキル化とは

繰り返し発生する開発パターンやタスクを、再利用可能な「スキル」として定義すること。

### 9.2 スキル化の基準

- **同じ指示を3回以上繰り返した**
- **定型的な作業フローがある**（例: API追加、マイグレーション実行）
- **複数ステップで構成される複雑な作業**

### 9.3 スキル化のプロセス

パターン特定 → 要件抽出 → スキル設計 → ドキュメント化 → レビュー改善

**重要**: 必要性が明確になってから実施。過度な抽象化は避ける。

### 9.5 利用可能なスキル

現在、以下のスキルが利用可能です:

#### quality-check
- **目的**: 品質チェック（typecheck + lint + test）を一括実行
- **使用方法**:
  ```
  /quality-check
  /quality-check target=backend
  /quality-check coverage=true build=true
  ```
- **詳細**: [skills/quality-check/SKILL.md](skills/quality-check/SKILL.md)
- **対応プロジェクト**: backend、frontend、sync-worker、all

#### plan-and-commit
- **目的**: 実装前に詳細な実装計画を立て、プランファイルを `.claude/docs/` 配下にコミット
- **使用方法**:
  ```
  /plan-and-commit task_description="実装するタスクの概要"
  /plan-and-commit task_description="DB upsert処理の実装" plan_filename="db-upsert-plan.md"
  ```
- **詳細**: [skills/plan-and-commit/SKILL.md](skills/plan-and-commit/SKILL.md)
- **実行フロー**: Plan Mode起動 → Explore Agent → Plan Agent → Plan File作成 → ユーザーレビュー → コピー & コミット

#### skill-creator
- **目的**: 繰り返しパターンからスキル定義を自動生成
- **使用方法**:
  1. dashboard.mdの「メインエージェント → サブエージェント」セクションにタスク指示を記載
  2. Task toolで skill_creator エージェントを起動
  3. dashboard.mdで結果を確認
- **詳細**: [skills/skill_creator/SKILL.md](skills/skill_creator/SKILL.md)

**スキル追加の手順**:
1. 繰り返しパターンを3回以上確認
2. skill-creatorを使用してスキル定義を生成
3. CLAUDE.mdのこのセクションにスキル情報を追加

---

## 10. 次に行うべきアクション

**注**: 過去のやり取りの履歴は `.claude/docs/archives.md` に記録されています。

### 10.1 次のタスク（優先度: 最高）

**Qiita Team sync-workerのDB upsert処理実装**

**目的**: Qiita Teamから取得した記事をPostgreSQLのdocumentsテーブルにupsert（挿入・更新）する処理を実装

**実装内容**:
1. sync-worker/src/sync-qiita.ts のTODO部分を実装
2. documentsテーブルへのupsert処理（`INSERT ... ON CONFLICT UPDATE`）
3. TDDでテストを先に書く
4. 初回データ投入の実行と動作確認

**技術要件**:
- PostgreSQLクライアント（pg）を使用
- トランザクション処理
- エラーハンドリング

**実装時の注意**:
- TDD徹底（Red → Green → Refactor）
- backend_developer サブエージェントを活用
- dashboard.mdを通じてエージェント連携
- 実装完了後は typescript_reviewer によるレビューを実施

---

### 10.2 実装完了した機能

#### ドキュメント統計情報表示機能（✅ 完了 - 2026-02-04）
- バックエンド: `GET /api/stats` エンドポイント
- フロントエンド: `DocumentStats` コンポーネント
- PostgreSQLからの実データ取得、空データ対応済み

---

### 10.3 今後の実装候補

1. **Sync Worker cron設定**: 日次自動同期
2. **検索機能の統合テスト**: E2E動作確認
3. **検索拡張**: フィルタリング、ソート、ページネーション
4. **ユーザー認証**: ログイン、トークン管理

---

## 11. まとめ

### 開発原則
1. **TDD徹底**: Red → Green → Refactor
2. **dashboard.md**: エージェント間コミュニケーション
3. **サブエージェント活用**: frontend_developer, backend_developer, typescript_reviewer, skill_creator
4. **各種ルール参照**: `.claude/rules/` 配下の各種mdファイル

**すべての開発工程でこのルールを遵守すること。**
