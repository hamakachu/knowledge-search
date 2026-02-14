# feature_implementation_cycle

機能実装の標準化されたサイクルを自動化するスキルです。

## 概要

このスキルは、Phase単位での段階的な実装フローをオーケストレーションします。dashboard.mdを通じたエージェント間連携、TDD実装、レビュー、承認、履歴管理までの一連のフローを標準化し、繰り返しパターンを解決します。

## 解決する課題

Phase 1, 2, 3の実装で以下のフローを繰り返していました:
1. dashboard.mdにタスク指示を記載
2. 実装サブエージェント起動（backend_developer/frontend_developer）
3. TDD実装（Red → Green → Refactor）
4. dashboard.mdで実装結果確認
5. typescript_reviewerサブエージェント起動
6. dashboard.mdでレビュー結果確認
7. ユーザー承認取得
8. 履歴記録（dashboard.md履歴 + archives.md退避 + CLAUDE.md更新）
9. スキル化可能性チェック（CLAUDE.md セクション9.2）

このスキルにより、上記の9ステップが標準化され、開発サイクルが効率化されます。

## 使い方

### 基本
```
/feature_implementation_cycle phase_name="Phase 1: 基本認証" task_description="ユーザー認証とQiita Teamトークン管理機能の実装"
```

### パラメータ付き
```
/feature_implementation_cycle phase_name="Phase 2: 全文検索" task_description="PostgreSQL全文検索実装" target_files="searchService.ts,search.ts"
```

### フロントエンド実装
```
/feature_implementation_cycle phase_name="Phase 1: ログインUI" task_description="ログインフォームコンポーネントの実装" developer_type=frontend_developer
```

## 実行フロー（9ステップ）

### 1. dashboard.mdにタスク指示記載
メインエージェントが `.claude/docs/dashboard.md` の「メインエージェント → サブエージェント」セクションにタスク指示を記載します。

### 2. 実装サブエージェント起動
Task toolで指定されたサブエージェント（backend_developer / frontend_developer）を起動します。

### 3. TDD実装（Red → Green → Refactor）
サブエージェントがTDDサイクルで実装します:
- **Red**: 失敗するテストを先に書く
- **Green**: テストをパスする最小限の実装を書く
- **Refactor**: テストをパスした状態で、コードをリファクタリングする

### 4. dashboard.mdで実装結果確認
サブエージェントが `.claude/docs/dashboard.md` の「サブエージェント → メインエージェント」セクションに結果を記載します。

### 5. typescript_reviewerサブエージェント起動
dashboard.mdにレビュー指示を記載し、typescript_reviewerサブエージェントを起動します。

### 6. dashboard.mdでレビュー結果確認
typescript_reviewerが `.claude/docs/dashboard.md` の「サブエージェント → メインエージェント」セクションに結果を記載します。

### 7. ユーザー承認取得
レビュー結果をユーザーに報告し、「この変更を反映してよろしいですか？」と明示的に承認を求めます。

### 8. 履歴記録とドキュメント更新
- dashboard.mdの「履歴」セクションに今回の実装結果を追加
- 履歴が3件を超える場合、最も古い履歴を `.claude/docs/archives.md` へ退避
- 現在のタスクセクションをクリア
- `CLAUDE.md` のセクション10「次に行うべきアクション」を更新

### 9. スキル化可能性チェック（CLAUDE.md セクション9.2）
Phase完了後、以下のチェックリストを自動的にユーザーに提示します:

| 質問 | Yes → スキル化検討 | No → スキル化不要 |
|------|-------------------|------------------|
| 今回のPhaseで、同じ手順を3回以上繰り返したか？ | ✅ | ❌ |
| 5ステップ以上の定型フローを実施したか？ | ✅ | ❌ |
| 次回も同じ手順が必要になりそうか？ | ✅ | ❌ |
| ドキュメント化しても理解が難しい複雑さか？ | ✅ | ❌ |
| 他のプロジェクトでも再利用できそうか？ | ✅ | ❌ |

**1つでもYesがある場合**: スキル化を検討し、ユーザーに報告・提案

**すべてNoの場合**: スキル化不要、ユーザーに報告

## パラメータ

| パラメータ名 | 必須/任意 | デフォルト値 | 説明 |
|------------|---------|-------------|------|
| phase_name | 必須 | - | 実装フェーズ名（例: "Phase 1: 基本認証"） |
| task_description | 必須 | - | 実装タスクの詳細説明 |
| target_files | 任意 | - | 対象ファイルリスト（配列、カンマ区切り） |
| developer_type | 任意 | backend_developer | 実装担当（backend_developer / frontend_developer） |
| skip_review | 任意 | false | レビューをスキップ（true / false） |

## dashboard.md履歴管理

### 履歴の追加
dashboard.mdの「履歴」セクションの最上部に新しい履歴を追加します。

フォーマット:
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

## TDDプロセス

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

## 実装例（Phase 1-3）

### Phase 1: 基本認証とトークン管理
```
/feature_implementation_cycle phase_name="Phase 1: 基本認証" task_description="ユーザー認証とQiita Teamトークン管理機能の実装"
```

**成果**:
- ユーザー認証とQiita Teamトークン管理機能の実装完了
- AES-256-GCM認証付き暗号化（改ざん検知機能付き）
- express-sessionによるセッション管理（PostgreSQLバックエンド）
- テスト37件すべて成功、テストカバレッジ80%以上達成

### Phase 2: PostgreSQL全文検索
```
/feature_implementation_cycle phase_name="Phase 2: 全文検索" task_description="PostgreSQL全文検索実装（pg_trgm similarity + ILIKE検索）"
```

**成果**:
- PostgreSQL全文検索機能の実装完了（pg_trgm similarity + ILIKE検索）
- 認証ミドルウェア適用（requireAuth）による未認証アクセス防止
- 関連度順 + 更新日時順のソート実装
- テスト46件すべて成功

### Phase 3: API権限チェック
```
/feature_implementation_cycle phase_name="Phase 3: API権限チェック" task_description="Qiita Team APIによる記事アクセス権限チェック機能の実装"
```

**成果**:
- Qiita Team APIによる記事アクセス権限チェック機能の実装完了
- QiitaClient拡張（checkArticleAccess, checkBatchAccessメソッド）
- permissionService新規作成（権限フィルタリング）
- 並列処理によるパフォーマンス最適化（Promise.all）
- テスト52件すべて成功

## CLAUDE.md更新

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

**技術要件**:
- {技術要件1}
- {技術要件2}

**実装時の注意**:
- TDD徹底（Red → Green → Refactor）
- `.claude/docs/plan.md` の優先度Xを参照
- {developer_type} サブエージェントを活用
- 実装完了後は typescript_reviewer によるレビューを実施
```

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

## 前提条件
- `.claude/docs/dashboard.md` が存在すること
- `.claude/docs/archives.md` が存在すること
- `CLAUDE.md` が存在すること
- Task toolが利用可能であること
- 実装サブエージェント（backend_developer / frontend_developer）が定義されていること
- レビューサブエージェント（typescript_reviewer）が定義されていること
- TDDプロセスが定義されていること（`CLAUDE.md` のセクション1）
- レビュープロセスが定義されていること（`.claude/rules/review_rule.md`）

## 関連スキル
- [quality_check](../quality_check/SKILL.md): 品質チェック（typecheck + lint + test）を一括実行
- [plan_and_commit](../plan_and_commit/SKILL.md): 実装前の詳細な実装計画立案
- [skill_creator](../skill_creator/SKILL.md): スキル定義の生成・管理

## 詳細

詳細は [SKILL.md](./SKILL.md) を参照してください。
