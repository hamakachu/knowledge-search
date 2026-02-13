---
name: plan_and_commit
description: 実装前に詳細な実装計画を立案し、プランファイルをコミット
disable-model-invocation: false
---

# plan_and_commit

## 概要
実装前に詳細な実装計画を立て、プランファイルを `.claude/docs/` 配下にコミットするワークフローを標準化するスキルです。Plan Modeを活用して、Exploreエージェントによるコードベース調査とPlanエージェントによる設計を実施し、レビュー可能な実装計画書を作成します。

このスキルは、以下の繰り返しパターンを解決します:
- 複雑な実装タスクに着手する前の計画立案
- コードベースの構造把握と既存パターンの調査
- TDD実装フローの明確化
- 実装計画のドキュメント化とコミット
- ユーザーとの認識合わせ（実装前のレビュー）

---

## 使用方法

### 基本的な使い方
```
メインエージェントから直接実行:
"/plan_and_commit"
または
"実装計画を立ててください"
```

### パラメータ

| パラメータ名 | 必須/任意 | デフォルト値 | 説明 |
|------------|---------|-------------|------|
| task_description | 必須 | - | 実装するタスクの概要（例: "DB upsert処理の実装"） |
| plan_filename | 任意 | task名から自動生成 | 計画書のファイル名（例: "db_upsert_implementation_plan.md"） |
| skip_explore | 任意 | false | Exploreフェーズをスキップ（true / false） |

**パラメータ指定例**:
```
/plan_and_commit task_description="DB upsert処理の実装"
/plan_and_commit task_description="新機能: ユーザー認証" plan_filename="user_auth_plan.md"
/plan_and_commit task_description="簡易タスク" skip_explore=true
```

---

## 実行フロー

### 1. **Plan Mode起動（EnterPlanMode）**
   - `EnterPlanMode` ツールを使用してPlan Modeに入る
   - Plan Modeでは、Exploreエージェント（コードベース調査）とPlanエージェント（設計立案）が使用可能になる
   - 期待される結果: Plan Modeが有効化され、エージェント間連携の準備が整う

### 2. **コードベース調査（Explore Agent起動）**
   - Exploreエージェントを起動し、以下を調査:
     - 実装対象ファイルの現状確認
     - 関連するデータベーススキーマやテーブル構造
     - 既存の実装パターン（Repository、Service層など）
     - テスト構造とテストファイルの配置
     - dashboard.mdの内容確認（タスク指示の詳細把握）
   - 期待される結果: 実装に必要な情報が収集され、設計の土台ができる

### 3. **実装設計の作成（Plan Agent起動）**
   - Planエージェントを起動し、以下を設計:
     - **実装アプローチ**: アーキテクチャパターン（Repository、Service層など）の選定理由
     - **ファイル構成**: 作成・修正が必要なファイルのリスト
     - **実装の詳細**: 型定義、メソッド、SQL、トランザクション処理など
     - **TDD実装フロー**: Red → Green → Refactor サイクルの具体的なPhase分け
     - **エラーハンドリング**: 想定されるエラーケースと対策
     - **実装の優先順位**: 優先度1（必須）、優先度2（推奨）、優先度3（将来的）
     - **Critical Files**: 最も重要な3ファイル
     - **Verification**: 検証手順（テスト、Lint、型チェック、ビルド、手動確認など）
   - 期待される結果: 構造化された実装計画が完成する

### 4. **Plan File作成（~/.claude/plans/配下）**
   - Planエージェントが自動的に `~/.claude/plans/[random-name].md` に実装計画を保存
   - 期待される結果: 詳細な実装計画がPlan Fileとして保存される

### 5. **ユーザーレビュー待機**
   - ユーザーに実装計画のレビューを依頼
   - フィードバックがあれば計画を修正
   - 期待される結果: ユーザーから「実装計画を.claude/docs配下にコミットしてください」などの承認を得る

### 6. **Plan Fileを.claude/docs配下にコピー**
   - `~/.claude/plans/[random-name].md` を `.claude/docs/[descriptive_name]_plan.md` にコピー
   - ファイル名は実装タスクの内容を反映した名前（例: `db_upsert_implementation_plan.md`、`user_auth_implementation_plan.md`）
   - 期待される結果: 実装計画書がプロジェクトのドキュメントディレクトリに配置される

### 7. **Git コミット**
   - 実装計画書をGitにコミット
   - コミットメッセージ例: `docs: Add implementation plan for [task_description]`
   - 期待される結果: 実装計画がバージョン管理され、チーム全体で共有可能になる

---

## 実装計画書のテンプレート構成

実装計画書には、以下のセクションを含めることを推奨します:

### 1. **概要**
   - 目的
   - 実装箇所
   - 技術要件

### 2. **実装アプローチ**
   - 採用するアーキテクチャパターン（Repository、Service層など）とその理由
   - ファイル構成（作成・修正が必要なファイルのリスト）

### 3. **実装の詳細**
   - 型定義
   - メソッド定義
   - SQL（該当する場合）
   - トランザクション処理
   - エラーハンドリング

### 4. **TDD実装フロー**
   - Phase 1: Red（失敗するテストの作成）
   - Phase 2: Green（最小限の実装でテストをパス）
   - Phase 3: Refactor（リファクタリング）
   - Phase 4: 統合テスト
   - Phase 5: 動作確認

### 5. **エラーハンドリング**
   - 想定されるエラーケース（4種類程度）
   - それぞれの対策

### 6. **実装の優先順位**
   - 優先度1（必須）
   - 優先度2（推奨）
   - 優先度3（将来的）

### 7. **Critical Files**
   - 最も重要な3ファイル

### 8. **Verification（検証手順）**
   - テスト実行
   - Lintチェック
   - 型チェック
   - ビルド確認
   - 手動確認手順

### 9. **コミットメッセージ（参考）**
   - 実装完了時のコミットメッセージ例

### 10. **まとめ**
   - 実装のポイント
   - 注意事項

---

## 使用例

### 例1: DB upsert処理の実装計画
```
/plan_and_commit task_description="Qiita Team sync-workerのDB upsert処理実装"
```

**実行されるフロー**:
1. Plan Mode起動
2. Exploreエージェント起動
   - `sync-worker/src/sync-qiita.ts` の確認
   - `backend/db/schema.sql` のdocumentsテーブル構造確認
   - 既存のPostgreSQLクライアント実装パターン確認
   - テスト構造の確認
3. Planエージェント起動
   - Repository パターンの採用を提案
   - TDD実装フローを5つのPhaseに分割
   - エラーハンドリング（4種類）の設計
4. Plan File作成: `~/.claude/plans/qiita-sync-db-upsert.md`
5. ユーザーレビュー待機
6. コピー: `.claude/docs/db_upsert_implementation_plan.md`
7. Gitコミット: `docs: Add implementation plan for Qiita Team sync-worker DB upsert`

**期待される出力**:
```
✅ Plan Mode起動完了
✅ コードベース調査完了（Explore Agent）
✅ 実装設計完了（Plan Agent）
✅ Plan File作成: ~/.claude/plans/qiita-sync-db-upsert.md
⏸️  ユーザーレビュー待機中...

（ユーザー承認後）
✅ 実装計画をコピー: .claude/docs/db_upsert_implementation_plan.md
✅ Gitコミット完了
```

### 例2: 新機能の実装計画（ユーザー認証）
```
/plan_and_commit task_description="ユーザー認証機能の追加" plan_filename="user_auth_plan.md"
```

**実行されるフロー**:
1. Plan Mode起動
2. Exploreエージェント起動
   - 既存の認証関連コード確認（あれば）
   - バックエンドのルーティング構造確認
   - データベーススキーマ確認
3. Planエージェント起動
   - JWT認証の設計
   - ミドルウェアの設計
   - TDD実装フロー
4. Plan File作成
5. ユーザーレビュー
6. `.claude/docs/user_auth_plan.md` にコピー
7. Gitコミット

### 例3: 簡易タスクの実装計画（Exploreスキップ）
```
/plan_and_commit task_description="簡易なバグ修正" skip_explore=true
```

**実行されるフロー**:
1. Plan Mode起動
2. Exploreエージェントをスキップ
3. Planエージェント起動（既存の知識ベースで設計）
4. Plan File作成
5. ユーザーレビュー
6. コピー & コミット

---

## エラーハンドリング

| エラーケース | 対処方法 |
|-------------|---------|
| Plan Modeが起動しない | `EnterPlanMode` ツールが利用可能か確認。エラーメッセージをユーザーに報告。 |
| Exploreエージェントが情報を見つけられない | skip_explore=trueで再試行するか、手動で調査範囲を指定。 |
| Plan File作成に失敗 | Planエージェントのエラーログを確認。計画内容を再構築。 |
| ユーザーがレビューで修正を要求 | Planエージェントを再起動して計画を修正。修正後、再度レビューを依頼。 |
| .claude/docs配下へのコピーに失敗 | ディレクトリの存在確認、ファイル名の重複確認、権限確認。 |
| Gitコミットに失敗 | Gitステータスを確認。コンフリクトがあれば解決後に再コミット。 |

---

## 前提条件
- Plan Modeが利用可能であること（`EnterPlanMode` ツールが使用可能）
- `.claude/docs/` ディレクトリが存在すること
- Gitリポジトリが初期化されていること
- dashboard.mdに実装タスクの指示が記載されていること（メインエージェント → サブエージェントセクション）

---

## Plan Modeの使用タイミング

**Plan Modeは以下の場合に使用することを推奨します:**

### Plan Modeを使用すべき場合（✅）
1. **複雑な実装タスク**: 複数のファイルを変更し、TDDフローが複雑な場合
2. **既存コードベースの把握が必要**: アーキテクチャパターンや既存実装を調査する必要がある場合
3. **チームレビューが必要**: 実装前にチーム全体で計画を共有し、承認を得たい場合
4. **実装の優先順位付けが必要**: Phase分けや優先度の判断が必要な場合

### Plan Modeを使用しない場合（❌）
1. **単純なタスク**: 1ファイルの簡単な修正
2. **緊急のバグ修正**: すぐに対処が必要で、計画立案の時間がない場合
3. **ドキュメントのみの更新**: コード変更を伴わない場合

---

## Plan Fileの命名規則

`.claude/docs/` 配下にコピーする際のファイル名は、以下の命名規則に従います:

**形式**: `[task-name]-plan.md`

**例**:
- `db_upsert_implementation_plan.md`（DB upsert処理の実装計画）
- `user_auth_implementation_plan.md`（ユーザー認証機能の実装計画）
- `search_filter_implementation_plan.md`（検索フィルタ機能の実装計画）

**命名のポイント**:
- snake_case を使用
- タスクの内容を端的に表現
- `-plan.md` で終わる

---

## dashboard.mdとの連携

このスキルは、`.claude/docs/dashboard.md` を通じてエージェント間連携を実施します。

### メインエージェントの責務
1. **実行前**: dashboard.mdの「メインエージェント → サブエージェント」セクションにタスク指示を記載
2. **実行中**: Plan Modeでタスク内容を参照
3. **実行後**: dashboard.mdの「サブエージェント → メインエージェント」セクションに結果を記載

### 実行後の結果報告フォーマット（dashboard.md）
```markdown
**結果ステータス**: 完了

**担当サブエージェント**: plan_and_commit

**実行結果**:
✅ Plan Mode起動完了
✅ コードベース調査完了（Explore Agent）
✅ 実装設計完了（Plan Agent）
✅ Plan File作成: ~/.claude/plans/xxx.md
✅ 実装計画をコピー: .claude/docs/xxx-plan.md
✅ Gitコミット完了

**作成したファイル**:
- .claude/docs/[descriptive_name]_plan.md

**問題点**:
なし

**推奨事項**:
実装計画に従ってTDD実装を開始してください。
```

---

## 関連スキル
- [quality_check](../quality_check/SKILL.md): 実装完了後の品質チェック
- [skill_creator](../skill_creator/SKILL.md): スキル定義の生成・管理

---

## ワークフローの図解

```
┌─────────────────────────────────────────────────┐
│ 1. Plan Mode起動（EnterPlanMode）                │
└─────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────┐
│ 2. コードベース調査（Explore Agent）             │
│    - 対象ファイル確認                            │
│    - スキーマ確認                                │
│    - 既存パターン確認                            │
│    - テスト構造確認                              │
└─────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────┐
│ 3. 実装設計（Plan Agent）                        │
│    - アプローチ選定                              │
│    - ファイル構成                                │
│    - TDD実装フロー                               │
│    - エラーハンドリング                          │
└─────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────┐
│ 4. Plan File作成                                 │
│    ~/.claude/plans/[random-name].md             │
└─────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────┐
│ 5. ユーザーレビュー待機                          │
│    フィードバックがあれば修正                    │
└─────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────┐
│ 6. コピー & コミット                             │
│    .claude/docs/[descriptive_name]_plan.md      │
└─────────────────────────────────────────────────┘
```

---

## 更新履歴
| 日付 | バージョン | 変更内容 |
|-----|----------|---------|
| 2026-02-05 | 1.0.0 | 初版作成 |
