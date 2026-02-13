# feature_implementation_cycle

機能実装の標準化されたサイクルを自動化するスキルです。

## 概要

このスキルは、Phase単位での段階的な実装フローをオーケストレーションします。TDD実装、レビュー、承認、CLAUDE.md更新までの一連のフローを標準化し、繰り返しパターンを解決します。

## 解決する課題

Phase 1, 2, 3の実装で以下のフローを繰り返していました:
1. 実装サブエージェント起動（backend_developer/frontend_developer）
2. TDD実装（Red → Green → Refactor）
3. typescript_reviewerサブエージェント起動
4. レビュー結果確認
5. ユーザー承認取得
6. CLAUDE.md更新（実装完了履歴 + 次のタスク）
7. スキル化可能性チェック（CLAUDE.md セクション9.2）

このスキルにより、上記のステップが標準化され、開発サイクルが効率化されます。

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

## 実行フロー

### 1. 実装サブエージェント起動
Task toolで指定されたサブエージェント（backend_developer / frontend_developer）を起動します。
タスク指示はプロンプトに直接記載します。

### 2. TDD実装（Red → Green → Refactor）
サブエージェントがTDDサイクルで実装します:
- **Red**: 失敗するテストを先に書く
- **Green**: テストをパスする最小限の実装を書く
- **Refactor**: テストをパスした状態で、コードをリファクタリングする

### 3. typescript_reviewerサブエージェント起動
レビュー対象をプロンプトに直接記載し、typescript_reviewerサブエージェントを起動します。

### 4. レビュー結果確認
typescript_reviewerのレスポンスを確認します。

### 5. ユーザー承認取得
レビュー結果をユーザーに報告し、「この変更を反映してよろしいですか？」と明示的に承認を求めます。

### 6. CLAUDE.md更新
- 完了した機能を「実装完了した機能」に記録
- 次のPhaseを「次のタスク」に記載

### 7. スキル化可能性チェック（CLAUDE.md セクション9.2）
Phase完了後、以下のチェックリストを自動的にユーザーに提示します:

| 質問 | Yes → スキル化検討 | No → スキル化不要 |
|------|-------------------|------------------|
| 今回のPhaseで、同じ手順を3回以上繰り返したか？ | ✅ | ❌ |
| 5ステップ以上の定型フローを実施したか？ | ✅ | ❌ |
| 次回も同じ手順が必要になりそうか？ | ✅ | ❌ |
| ドキュメント化しても理解が難しい複雑さか？ | ✅ | ❌ |
| 他のプロジェクトでも再利用できそうか？ | ✅ | ❌ |

**1つでもYesがある場合**: スキル化を検討し、ユーザーに報告・提案

**すべてNoの場合**: スキル化不要、次のPhaseへ進む

## パラメータ

| パラメータ名 | 必須/任意 | デフォルト値 | 説明 |
|------------|---------|-------------|------|
| phase_name | 必須 | - | 実装フェーズ名（例: "Phase 1: 基本認証"） |
| task_description | 必須 | - | 実装タスクの詳細説明 |
| target_files | 任意 | - | 対象ファイルリスト（配列、カンマ区切り） |
| developer_type | 任意 | backend_developer | 実装担当（backend_developer / frontend_developer） |
| skip_review | 任意 | false | レビューをスキップ（true / false） |

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

## 前提条件
- `CLAUDE.md` が存在すること
- Task toolが利用可能であること
- 実装サブエージェント（backend_developer / frontend_developer）が定義されていること
- レビューサブエージェント（typescript_reviewer）が定義されていること

## 関連スキル
- [quality_check](../quality_check/SKILL.md): 品質チェック（typecheck + lint + test）を一括実行
- [plan_and_commit](../plan_and_commit/SKILL.md): 実装前の詳細な実装計画立案
- [skill_creator](../skill_creator/SKILL.md): スキル定義の生成・管理

## 詳細

詳細は [SKILL.md](./SKILL.md) を参照してください。
