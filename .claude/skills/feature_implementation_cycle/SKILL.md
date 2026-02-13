---
name: feature_implementation_cycle
description: 機能実装の標準化されたサイクルを自動化する（実装→レビュー→承認→履歴記録）
disable-model-invocation: false
---

# feature_implementation_cycle

## 概要
機能実装の標準化されたサイクルを自動化するスキルです。TDD実装、レビュー、承認、CLAUDE.md更新までの一連のフローをオーケストレーションします。

このスキルは、以下の繰り返しパターンを解決します:
- Phase単位での段階的な実装（Phase 1, 2, 3...）
- 実装サブエージェント（backend_developer/frontend_developer）の起動と連携
- TDD実装サイクル（Red → Green → Refactor）の徹底
- typescript_reviewerによるレビュー実施
- ユーザー承認取得プロセス
- CLAUDE.mdの実装完了履歴・次のタスクセクション更新

---

## 使用方法

### 基本的な使い方
```
メインエージェントから直接実行:
"/feature_implementation_cycle"
または
"Phase X の実装を進めてください"
```

### パラメータ

| パラメータ名 | 必須/任意 | デフォルト値 | 説明 |
|------------|---------|-------------|------|
| phase_name | 必須 | - | 実装フェーズ名（例: "Phase 1: 基本認証"） |
| task_description | 必須 | - | 実装タスクの詳細説明 |
| target_files | 任意 | - | 対象ファイルリスト（配列、カンマ区切り） |
| developer_type | 任意 | backend_developer | 実装担当（backend_developer / frontend_developer） |
| skip_review | 任意 | false | レビューをスキップ（true / false） |

**パラメータ指定例**:
```
/feature_implementation_cycle phase_name="Phase 1: 基本認証" task_description="ユーザー認証とQiita Teamトークン管理機能の実装"
/feature_implementation_cycle phase_name="Phase 2: 全文検索" task_description="PostgreSQL全文検索実装" developer_type=backend_developer
/feature_implementation_cycle phase_name="Phase 3: 権限チェック" task_description="API権限チェック実装" target_files="qiitaClient.ts,permissionService.ts,search.ts"
```

---

## 実行フロー

### 1. **実装サブエージェント起動**
   - Task toolで指定されたサブエージェント（backend_developer / frontend_developer）を起動
   - プロンプトに以下を直接記載:
     - タスク内容: phase_name + task_description
     - 対象ファイル: target_files
     - 実装方針: TDD実装（Red → Green → Refactor）
   - 期待される結果: サブエージェントが実装を完了し、結果をレスポンスで返す

### 2. **TDD実装（Red → Green → Refactor）**
   - サブエージェントがTDDサイクルで実装:
     1. Red: 失敗するテストを先に書く
     2. Green: テストをパスする最小限の実装を書く
     3. Refactor: テストをパスした状態で、コードをリファクタリングする
   - 期待される結果: テストカバレッジ80%以上、すべてのテストがパス

### 3. **typescript_reviewerサブエージェント起動**
   - `skip_review=false` の場合、Task toolでtypescript_reviewerサブエージェントを起動
   - プロンプトにレビュー対象ファイルと変更内容を直接記載
   - 期待される結果: レビューサブエージェントがレビューを実施し、結果をレスポンスで返す

### 4. **レビュー結果確認**
   - typescript_reviewerのレスポンスを確認:
     - レビュー結果ステータス: 完了
     - 実行結果: テスト・Lint・型チェック・ビルドの結果
     - 問題点: 発見した問題のリスト
     - 推奨事項: 改善提案
   - 期待される結果: すべてのチェックがパス（✅）、または問題が明確に報告される（❌）

### 5. **ユーザー承認取得**
   - レビュー結果をユーザーに報告
   - 変更内容のサマリー、レビュー結果、テスト結果を提示
   - 「この変更を反映してよろしいですか？」と明示的に承認を求める
   - 期待される結果: ユーザーから承認を得る

### 6. **CLAUDE.md更新**
   - `CLAUDE.md` のセクション10「次に行うべきアクション」を更新:
     - 完了した機能を「実装完了した機能」に移動
     - 次のフェーズ（Phase N+1）を「次のタスク」に記載
   - 期待される結果: ドキュメントが整理され、次のタスクが明確になる

### 7. **スキル化可能性チェック（CLAUDE.md セクション9.2）**
   - Phase完了後、以下のチェックリストを自動的にユーザーに提示:

   ```
   ## スキル化チェック（CLAUDE.md セクション9.2）

   今回のPhaseで繰り返しパターンが発見された場合、スキル化を検討してください。

   | 質問 | Yes → スキル化検討 | No → スキル化不要 |
   |------|-------------------|------------------|
   | 今回のPhaseで、同じ手順を3回以上繰り返したか？ | ✅ | ❌ |
   | 5ステップ以上の定型フローを実施したか？ | ✅ | ❌ |
   | 次回も同じ手順が必要になりそうか？ | ✅ | ❌ |
   | ドキュメント化しても理解が難しい複雑さか？ | ✅ | ❌ |
   | 他のプロジェクトでも再利用できそうか？ | ✅ | ❌ |

   **1つでもYesがある場合**:
   - スキル化を検討し、ユーザーに報告・提案してください
   - 承認後、skill_creatorを使用してスキル定義を生成

   **すべてNoの場合**:
   - スキル化不要、次のPhaseへ進んでください
   ```

   - 期待される結果: スキル化の可能性を見逃さず、継続的な改善を実現

---

## TDD実装フローの詳細

### Phase 1: Red（失敗するテストの作成）
- テストファイルを `src/__tests__/` 配下に作成
- 期待される動作を定義したテストケースを書く
- テストを実行して失敗することを確認（`pnpm test`）

### Phase 2: Green（最小限の実装でテストをパス）
- テストをパスする最小限のコードを実装
- テストを実行して成功することを確認

### Phase 3: Refactor（リファクタリング）
- テストをパスした状態で、コードをリファクタリング
- 重複を削除、命名を改善、構造を最適化
- テストが引き続きパスすることを確認

### Phase 4: 統合テスト（必要に応じて）
- 複数のモジュールを組み合わせた統合テストを実施
- エラーハンドリングのテストケースを追加

### Phase 5: 動作確認
- 実際にコードを実行して動作を確認
- 手動テストや実データでの確認

---

## 使用例

### 例1: Phase 1 基本認証の実装
```
/feature_implementation_cycle phase_name="Phase 1: 基本認証" task_description="ユーザー認証とQiita Teamトークン管理機能の実装"
```

**実行されるフロー**:
1. backend_developer起動（TDD実装指示を直接プロンプトに記載）
2. TDD実装
   - Red: authService.test.ts作成（11テスト）
   - Green: authService.ts実装
   - Refactor: コード改善
   - 統合テスト: auth.routes.test.ts作成
3. レスポンスで実装結果確認
   - 実装完了: 10ファイル新規作成、3ファイル修正
   - テスト37件すべて成功
4. typescript_reviewer起動（レビュー対象を直接プロンプトに記載）
5. レスポンスでレビュー結果確認
   - ✅ テスト37件すべて成功
   - ✅ Lint・型チェック・ビルドすべて成功
6. ユーザー承認取得
7. CLAUDE.md更新

### 例2: フロントエンド実装
```
/feature_implementation_cycle phase_name="Phase 1: ログインUI" task_description="ログインフォームコンポーネントの実装" developer_type=frontend_developer target_files="LoginForm.tsx,useAuth.ts"
```

### 例3: レビューをスキップして実装のみ
```
/feature_implementation_cycle phase_name="Phase 1: 簡易機能" task_description="簡易な機能追加" skip_review=true
```

---

## エラーハンドリング

| エラーケース | 対処方法 |
|-------------|---------|
| 実装サブエージェントが起動しない | Task toolが利用可能か確認。エージェント名が正しいか確認。 |
| TDD実装でテストが失敗 | サブエージェントが修正を実施。Red → Green → Refactor サイクルを繰り返す。 |
| レビューで問題が見つかった | サブエージェントが修正を実施。再レビューを実施。 |
| ユーザーが承認しない | 修正内容をユーザーに確認し、必要に応じて再実装。 |

---

## 前提条件
- `CLAUDE.md` が存在すること
- Task toolが利用可能であること
- 実装サブエージェント（backend_developer / frontend_developer）が定義されていること
- レビューサブエージェント（typescript_reviewer）が定義されていること
- TDDプロセスが定義されていること（`CLAUDE.md` のセクション1）
- レビュープロセスが定義されていること（`.claude/rules/review_rule.md`）

---

## サブエージェント間連携

このスキルは、複数のサブエージェント間の連携をオーケストレーションします。
タスク指示はTask toolのプロンプトに直接記載し、結果はレスポンスで受け取ります。

### 連携パターン1: backend_developer → typescript_reviewer
1. backend_developerが実装完了（レスポンスで報告）
2. メインエージェントがtypescript_reviewerを起動（レビュー対象を直接指示）
3. typescript_reviewerがレビュー実施（レスポンスで報告）
4. メインエージェントがレビュー結果を確認

### 連携パターン2: frontend_developer → typescript_reviewer
1. frontend_developerが実装完了（レスポンスで報告）
2. メインエージェントがtypescript_reviewerを起動
3. typescript_reviewerがレビュー実施（レスポンスで報告）
4. メインエージェントがレビュー結果を確認

---

## CLAUDE.md更新の詳細

### セクション10.2「実装完了した機能」への追加

完了したPhaseを以下のフォーマットで記載:

```markdown
#### {phase_name}（✅ 完了 - YYYY-MM-DD）
- {実装内容のサマリー}
- {主な成果}
- {テスト結果}
```

### セクション10.1「次のタスク」の更新

次のPhaseをセクション10.1の最上部に記載:

```markdown
**{phase_name}（優先度: 最高）**

**目的**: {実装の目的}

**実装内容**:
1. {実装内容1}
2. {実装内容2}
```

---

## 関連スキル
- [quality_check](../quality_check/SKILL.md): 品質チェック（typecheck + lint + test）を一括実行
- [plan_and_commit](../plan_and_commit/SKILL.md): 実装前の詳細な実装計画立案
- [skill_creator](../skill_creator/SKILL.md): スキル定義の生成・管理

---

## ワークフローの図解

```
┌──────────────────────────────────────────────────┐
│ 1. 実装サブエージェント起動                       │
│    - backend_developer / frontend_developer     │
│    - プロンプトにタスク指示を直接記載            │
└──────────────────────────────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────────┐
│ 2. TDD実装（Red → Green → Refactor）             │
│    - テスト先行                                   │
│    - テストカバレッジ80%以上                      │
└──────────────────────────────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────────┐
│ 3. typescript_reviewerサブエージェント起動        │
│    - プロンプトにレビュー対象を直接記載          │
└──────────────────────────────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────────┐
│ 4. レビュー結果確認（レスポンス）                 │
│    - テスト・Lint・型チェック・ビルド             │
│    - 問題点・推奨事項                             │
└──────────────────────────────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────────┐
│ 5. ユーザー承認取得                               │
│    - 変更内容のサマリー提示                       │
│    - 「この変更を反映してよろしいですか？」       │
└──────────────────────────────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────────┐
│ 6. CLAUDE.md更新                                  │
│    - 実装完了履歴の記録                           │
│    - 次のタスク更新                               │
└──────────────────────────────────────────────────┘
```

---

## 更新履歴
| 日付 | バージョン | 変更内容 |
|-----|----------|---------|
| 2026-02-13 | 2.0.0 | dashboard.md廃止、直接コミュニケーションに移行 |
| 2026-02-06 | 1.0.0 | 初版作成 |
