# feature-implementation-cycle

## 概要
機能実装の標準化されたサイクルを自動化するスキルです。dashboard.mdを通じたエージェント間連携、TDD実装、レビュー、承認、履歴管理までの一連のフローをオーケストレーションします。

このスキルは、以下の繰り返しパターンを解決します:
- Phase単位での段階的な実装（Phase 1, 2, 3...）
- dashboard.mdへのタスク指示記載の標準化
- 実装サブエージェント（backend_developer/frontend_developer）の起動と連携
- TDD実装サイクル（Red → Green → Refactor）の徹底
- typescript_reviewerによるレビュー実施
- ユーザー承認取得プロセス
- dashboard.md履歴管理（最新3件保持、古い履歴のarchives.md退避）
- CLAUDE.mdの次のタスクセクション更新

---

## 使用方法

### 基本的な使い方
```
メインエージェントから直接実行:
"/feature-implementation-cycle"
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
/feature-implementation-cycle phase_name="Phase 1: 基本認証" task_description="ユーザー認証とQiita Teamトークン管理機能の実装"
/feature-implementation-cycle phase_name="Phase 2: 全文検索" task_description="PostgreSQL全文検索実装" developer_type=backend_developer
/feature-implementation-cycle phase_name="Phase 3: 権限チェック" task_description="API権限チェック実装" target_files="qiitaClient.ts,permissionService.ts,search.ts"
```

---

## 実行フロー

### 1. **dashboard.mdにタスク指示を記載**
   - `.claude/docs/dashboard.md` の「メインエージェント → サブエージェント」セクションに以下を記載:
     - タスクステータス: 実装依頼中
     - 担当サブエージェント: developer_type（backend_developer / frontend_developer）
     - タスク内容: phase_name + task_description
     - 対象ファイル: target_files
     - 実装方針: TDD実装（Red → Green → Refactor）
   - 期待される結果: タスク指示が明確に記載される

### 2. **実装サブエージェント起動**
   - Task toolで指定されたサブエージェント（backend_developer / frontend_developer）を起動
   - 期待される結果: サブエージェントがdashboard.mdのタスク指示を読み取り、実装を開始

### 3. **TDD実装（Red → Green → Refactor）**
   - サブエージェントがTDDサイクルで実装:
     1. Red: 失敗するテストを先に書く
     2. Green: テストをパスする最小限の実装を書く
     3. Refactor: テストをパスした状態で、コードをリファクタリングする
   - 期待される結果: テストカバレッジ80%以上、すべてのテストがパス

### 4. **dashboard.mdで実装結果確認**
   - サブエージェントが `.claude/docs/dashboard.md` の「サブエージェント → メインエージェント」セクションに結果を記載:
     - 結果ステータス: 完了
     - 実行結果: 実装したファイルリスト、テスト結果
     - 問題点: あれば記載
     - 推奨事項: レビュー依頼
   - 期待される結果: 実装結果が明確に報告される

### 5. **typescript_reviewerサブエージェント起動**
   - `skip_review=false` の場合、dashboard.mdの「メインエージェント → サブエージェント」セクションにレビュー指示を記載
   - Task toolでtypescript_reviewerサブエージェントを起動
   - 期待される結果: レビューサブエージェントがレビューを実施

### 6. **dashboard.mdでレビュー結果確認**
   - typescript_reviewerが `.claude/docs/dashboard.md` の「サブエージェント → メインエージェント」セクションに結果を記載:
     - レビュー結果ステータス: 完了
     - 実行結果: テスト・Lint・型チェック・ビルドの結果
     - 問題点: 発見した問題のリスト
     - 推奨事項: 改善提案
   - 期待される結果: すべてのチェックがパス（✅）、または問題が明確に報告される（❌）

### 7. **ユーザー承認取得**
   - レビュー結果をユーザーに報告
   - 変更内容のサマリー、レビュー結果、テスト結果を提示
   - 「この変更を反映してよろしいですか？」と明示的に承認を求める
   - 期待される結果: ユーザーから承認を得る

### 8. **履歴記録とドキュメント更新**
   - dashboard.mdの「履歴」セクションに今回の実装結果を追加
   - 履歴が3件を超える場合、最も古い履歴を `.claude/docs/archives.md` へ退避
   - 現在のタスクセクションをクリア（「メインエージェント → サブエージェント」「サブエージェント → メインエージェント」）
   - `CLAUDE.md` のセクション10「次に行うべきアクション」を更新:
     - 完了した機能を「実装完了した機能」に移動
     - 次のフェーズ（Phase N+1）を「次のタスク」に記載
   - 期待される結果: 履歴が整理され、次のタスクが明確になる

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

## dashboard.md履歴管理のロジック

### 履歴の追加
1. dashboard.mdの「履歴」セクションの最上部に新しい履歴を追加
2. フォーマット:
   ```markdown
   ### [YYYY-MM-DD] - {phase_name}実装完了
   - **発信**: メインエージェント
   - **内容**: {developer_type} → typescript_reviewer の連携で{task_description}を実装
   - **結果**: ✅ ユーザー承認取得、変更反映完了
   - **成果**:
     - 実装したファイルリスト
     - テスト結果
     - セキュリティ対策
   - **実装ファイル**:
     - 修正: X件
     - 新規作成: Y件
   - **次のステップ**: Phase N+1の説明
   ```

### 履歴の退避（3件を超えた場合）
1. dashboard.mdの「履歴」セクションから最も古い履歴を削除
2. 削除した履歴を `.claude/docs/archives.md` の「アーカイブ履歴」セクションに追加
3. archives.mdは時系列順（新しい順）で保持

### 現在のタスクセクションのクリア
1. 「メインエージェント → サブエージェント」セクションをデフォルト状態にリセット
2. 「サブエージェント → メインエージェント」セクションをデフォルト状態にリセット
3. 「サブエージェント間連携」セクションはそのまま保持（連携が継続中の可能性があるため）

---

## 使用例

### 例1: Phase 1 基本認証の実装
```
/feature-implementation-cycle phase_name="Phase 1: 基本認証" task_description="ユーザー認証とQiita Teamトークン管理機能の実装"
```

**実行されるフロー**:
1. dashboard.mdにタスク指示記載
   - 担当: backend_developer
   - 内容: Phase 1 基本認証実装
   - 技術要件: AES-256-GCM暗号化、express-session、認証エンドポイント
2. backend_developer起動
3. TDD実装
   - Red: authService.test.ts作成（11テスト）
   - Green: authService.ts実装
   - Refactor: コード改善
   - 統合テスト: auth.routes.test.ts作成
4. dashboard.mdで実装結果確認
   - 実装完了: 10ファイル新規作成、3ファイル修正
   - テスト37件すべて成功
5. typescript_reviewer起動
6. dashboard.mdでレビュー結果確認
   - ✅ テスト37件すべて成功
   - ✅ Lint・型チェック・ビルドすべて成功
   - ✅ セキュリティレビュー完了
7. ユーザー承認取得
8. 履歴記録
   - dashboard.md履歴に追加
   - CLAUDE.mdの「実装完了した機能」に記載
   - 次のタスク「Phase 2: PostgreSQL全文検索実装」を記載

**期待される出力**:
```
✅ Phase 1実装完了
✅ テスト37件すべて成功
✅ レビュー完了（問題なし）
✅ ユーザー承認取得
✅ 履歴記録完了
✅ 次のタスク: Phase 2実装
```

### 例2: Phase 2 PostgreSQL全文検索実装
```
/feature-implementation-cycle phase_name="Phase 2: 全文検索" task_description="PostgreSQL全文検索実装（pg_trgm similarity + ILIKE検索）" target_files="searchService.ts,search.ts,search.test.ts"
```

**実行されるフロー**:
1. dashboard.mdにタスク指示記載
2. backend_developer起動
3. TDD実装
   - Red: searchService.test.ts作成
   - Green: searchService.ts実装
   - Refactor: 認証ミドルウェア適用
4. dashboard.mdで実装結果確認
5. typescript_reviewer起動
6. dashboard.mdでレビュー結果確認
7. ユーザー承認取得
8. 履歴記録（履歴が3件を超えたので、最も古い履歴をarchives.mdへ退避）

### 例3: フロントエンド実装
```
/feature-implementation-cycle phase_name="Phase 1: ログインUI" task_description="ログインフォームコンポーネントの実装" developer_type=frontend_developer target_files="LoginForm.tsx,useAuth.ts"
```

**実行されるフロー**:
1. dashboard.mdにタスク指示記載
   - 担当: frontend_developer
2. frontend_developer起動
3. TDD実装
   - Red: LoginForm.test.tsx作成
   - Green: LoginForm.tsx実装
   - Red: useAuth.test.ts作成
   - Green: useAuth.ts実装
4. dashboard.mdで実装結果確認
5. typescript_reviewer起動
6. dashboard.mdでレビュー結果確認
7. ユーザー承認取得
8. 履歴記録

### 例4: レビューをスキップして実装のみ
```
/feature-implementation-cycle phase_name="Phase 1: 簡易機能" task_description="簡易な機能追加" skip_review=true
```

**実行されるフロー**:
1. dashboard.mdにタスク指示記載
2. backend_developer起動
3. TDD実装
4. dashboard.mdで実装結果確認
5. レビューをスキップ
6. ユーザー承認取得
7. 履歴記録

**注意**: `skip_review=true` は単純な実装の場合のみ使用してください。通常はレビューを実施することを推奨します。

---

## エラーハンドリング

| エラーケース | 対処方法 |
|-------------|---------|
| dashboard.mdにタスク指示が記載できない | ファイルの存在確認、権限確認。エラーメッセージをユーザーに報告。 |
| 実装サブエージェントが起動しない | Task toolが利用可能か確認。エージェント名が正しいか確認。 |
| TDD実装でテストが失敗 | サブエージェントが修正を実施。Red → Green → Refactor サイクルを繰り返す。 |
| レビューで問題が見つかった | サブエージェントが修正を実施。再レビューを実施。 |
| ユーザーが承認しない | 修正内容をユーザーに確認し、必要に応じて再実装。 |
| dashboard.md履歴管理に失敗 | ファイルの存在確認、フォーマット確認。手動で修正が必要な場合は報告。 |
| archives.mdへの退避に失敗 | ファイルの存在確認、権限確認。手動で退避が必要な場合は報告。 |

---

## 前提条件
- `.claude/docs/dashboard.md` が存在すること
- `.claude/docs/archives.md` が存在すること
- `CLAUDE.md` が存在すること
- Task toolが利用可能であること
- 実装サブエージェント（backend_developer / frontend_developer）が定義されていること
- レビューサブエージェント（typescript_reviewer）が定義されていること
- TDDプロセスが定義されていること（`CLAUDE.md` のセクション1）
- レビュープロセスが定義されていること（`.claude/rules/review_rule.md`）

---

## サブエージェント間連携

このスキルは、複数のサブエージェント間の連携をオーケストレーションします。

### 連携パターン1: backend_developer → typescript_reviewer
1. backend_developerが実装完了
2. メインエージェントがdashboard.mdにレビュー指示を記載
3. typescript_reviewerがレビュー実施
4. メインエージェントがレビュー結果を確認

### 連携パターン2: frontend_developer → typescript_reviewer
1. frontend_developerが実装完了
2. メインエージェントがdashboard.mdにレビュー指示を記載
3. typescript_reviewerがレビュー実施
4. メインエージェントがレビュー結果を確認

### 連携パターン3: frontend_developer → backend_developer → typescript_reviewer
1. frontend_developerがフロントエンド実装完了
2. dashboard.mdの「フロントエンド → バックエンド」セクションにAPI依頼を記載
3. backend_developerがバックエンド実装完了
4. typescript_reviewerがレビュー実施

**注意**: サブエージェント間連携が必要な場合、dashboard.mdの「サブエージェント間連携」セクションを活用してください。

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

**例**:
```markdown
#### Phase 1: 基本認証とトークン管理実装（✅ 完了 - 2026-02-06）
- ユーザー認証とQiita Teamトークン管理機能の実装完了
- AES-256-GCM認証付き暗号化（改ざん検知機能付き）
- express-sessionによるセッション管理（PostgreSQLバックエンド）
- テスト37件すべて成功、テストカバレッジ80%以上達成
```

### セクション10.1「次のタスク」の更新

次のPhaseをセクション10.1の最上部に記載:

```markdown
**{phase_name}（優先度: 最高）**

**目的**: {実装の目的}

**実装内容**:
1. {実装内容1}
2. {実装内容2}

**技術要件**:
- {技術要件1}
- {技術要件2}

**実装時の注意**:
- TDD徹底（Red → Green → Refactor）
- `.claude/docs/plan.md` の優先度Xを参照
- {developer_type} サブエージェントを活用
- 実装完了後は typescript_reviewer によるレビューを実施
```

---

## 関連スキル
- [quality-check](../quality_check/SKILL.md): 品質チェック（typecheck + lint + test）を一括実行
- [plan-and-commit](../plan-and-commit/SKILL.md): 実装前の詳細な実装計画立案
- [skill-creator](../skill_creator/SKILL.md): スキル定義の生成・管理

---

## ワークフローの図解

```
┌──────────────────────────────────────────────────┐
│ 1. dashboard.mdにタスク指示記載                   │
│    - 担当サブエージェント明記                     │
│    - phase_name + task_description              │
└──────────────────────────────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────────┐
│ 2. 実装サブエージェント起動                       │
│    - backend_developer / frontend_developer     │
└──────────────────────────────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────────┐
│ 3. TDD実装（Red → Green → Refactor）             │
│    - テスト先行                                   │
│    - テストカバレッジ80%以上                      │
└──────────────────────────────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────────┐
│ 4. dashboard.mdで実装結果確認                     │
│    - 実装したファイルリスト                       │
│    - テスト結果                                   │
└──────────────────────────────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────────┐
│ 5. typescript_reviewerサブエージェント起動        │
│    - dashboard.mdにレビュー指示記載               │
└──────────────────────────────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────────┐
│ 6. dashboard.mdでレビュー結果確認                 │
│    - テスト・Lint・型チェック・ビルド             │
│    - 問題点・推奨事項                             │
└──────────────────────────────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────────┐
│ 7. ユーザー承認取得                               │
│    - 変更内容のサマリー提示                       │
│    - 「この変更を反映してよろしいですか？」       │
└──────────────────────────────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────────┐
│ 8. 履歴記録とドキュメント更新                     │
│    - dashboard.md履歴に追加                       │
│    - archives.md退避（3件超過時）                 │
│    - CLAUDE.md更新                                │
│    - 現在のタスクセクションクリア                 │
└──────────────────────────────────────────────────┘
```

---

## TDD実装サイクルの図解

```
┌─────────────────────────────────────────────────┐
│ Phase 1: Red（失敗するテストの作成）             │
│ - テストファイルを src/__tests__/ 配下に作成     │
│ - 期待される動作を定義したテストケースを書く     │
│ - pnpm test で失敗することを確認                │
└─────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────┐
│ Phase 2: Green（最小限の実装でテストをパス）     │
│ - テストをパスする最小限のコードを実装           │
│ - pnpm test で成功することを確認                │
└─────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────┐
│ Phase 3: Refactor（リファクタリング）            │
│ - テストをパスした状態で、コードをリファクタリング│
│ - 重複を削除、命名を改善、構造を最適化           │
│ - テストが引き続きパスすることを確認             │
└─────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────┐
│ Phase 4: 統合テスト（必要に応じて）              │
│ - 複数のモジュールを組み合わせた統合テストを実施 │
│ - エラーハンドリングのテストケースを追加         │
└─────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────┐
│ Phase 5: 動作確認                                │
│ - 実際にコードを実行して動作を確認               │
│ - 手動テストや実データでの確認                   │
└─────────────────────────────────────────────────┘
```

---

## 更新履歴
| 日付 | バージョン | 変更内容 |
|-----|----------|---------|
| 2026-02-06 | 1.0.0 | 初版作成 |
