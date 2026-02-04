# quality-check

## 概要
TypeScriptプロジェクトの品質チェック（型チェック、Lint、テスト）を一括実行するスキルです。バックエンドとフロントエンドの両方に対応し、実装完了後やコード修正後の動作確認を効率化します。

このスキルは、以下の繰り返しパターンを解決します:
- バックエンド実装完了後の確認
- フロントエンド実装完了後の確認
- レビュー前の動作確認
- コード修正後の確認
- ユーザー承認前の最終確認

---

## 使用方法

### 基本的な使い方
```
メインエージェントから直接実行:
"/quality-check"
または
"品質チェックを実行してください"
```

### パラメータ

| パラメータ名 | 必須/任意 | デフォルト値 | 説明 |
|------------|---------|-------------|------|
| target     | 任意    | all         | チェック対象（all / backend / frontend / sync-worker） |
| coverage   | 任意    | false       | テストカバレッジを含める（true / false） |
| build      | 任意    | false       | ビルドチェックを含める（true / false） |

**パラメータ指定例**:
```
/quality-check target=backend
/quality-check target=frontend coverage=true
/quality-check target=all build=true
```

---

## 実行フロー

### 1. **型チェック（TypeCheck）**
   - `pnpm typecheck` を実行
   - TypeScriptの型定義に問題がないか確認
   - 期待される結果: すべての型エラーが解消されている

### 2. **Lintチェック（Lint）**
   - `pnpm lint` を実行
   - ESLintルールに違反していないか確認
   - コードスタイルの一貫性を保つ
   - 期待される結果: すべてのLintエラーが解消されている

### 3. **テスト実行（Test）**
   - `pnpm test` を実行
   - すべてのテストケースがパスするか確認
   - 期待される結果: すべてのテストが成功

### 4. **（オプション）テストカバレッジ確認**
   - `coverage=true` の場合、`pnpm test:coverage` を実行
   - コードのテストカバレッジを確認
   - 期待される結果: 目標カバレッジ80%以上

### 5. **（オプション）ビルドチェック**
   - `build=true` の場合、`pnpm build` を実行
   - ビルドが成功するか確認
   - 期待される結果: ビルドが成功

### 6. **結果レポート**
   - すべてのチェック結果を集約
   - ✅ / ❌ で成否を明示
   - エラーがあれば詳細を提示

---

## 使用例

### 例1: すべての品質チェックを実行
```
/quality-check
```

**実行されるコマンド**:
```bash
# ルートディレクトリで実行
pnpm typecheck    # backend, frontend, sync-worker すべて
pnpm lint         # backend, frontend, sync-worker すべて
pnpm test         # backend, frontend, sync-worker すべて
```

**期待される出力**:
```
✅ 型チェック: すべてパス
✅ Lint: すべてパス
✅ テスト: すべてパス（XX件）
```

### 例2: バックエンドのみチェック（カバレッジ付き）
```
/quality-check target=backend coverage=true
```

**実行されるコマンド**:
```bash
cd backend
pnpm typecheck
pnpm lint
pnpm test:coverage
```

**期待される出力**:
```
✅ 型チェック: すべてパス
✅ Lint: すべてパス
✅ テスト: すべてパス（XX件）
✅ テストカバレッジ: XX%
```

### 例3: フロントエンドのみチェック（ビルド付き）
```
/quality-check target=frontend build=true
```

**実行されるコマンド**:
```bash
cd frontend
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

**期待される出力**:
```
✅ 型チェック: すべてパス
✅ Lint: すべてパス
✅ テスト: すべてパス（XX件）
✅ ビルド: 成功
```

### 例4: すべてのチェックを実行（カバレッジ + ビルド）
```
/quality-check coverage=true build=true
```

**実行されるコマンド**:
```bash
pnpm typecheck
pnpm lint
pnpm test:coverage
pnpm build
```

---

## エラーハンドリング

| エラーケース | 対処方法 |
|-------------|---------|
| 型チェックエラー | TypeScriptの型定義を修正。エラー箇所を明示して修正を提案。 |
| Lintエラー | ESLintルールに従ってコードを修正。`pnpm lint:fix` で自動修正可能な場合は提案。 |
| テスト失敗 | 失敗したテストケースを特定し、実装を修正。TDDサイクルに従う。 |
| ビルドエラー | ビルドログを確認し、依存関係や設定の問題を解決。 |
| カバレッジ不足 | テストケースを追加してカバレッジを向上。目標は80%以上。 |

---

## 前提条件
- プロジェクトルートまたは対象ディレクトリ（backend / frontend / sync-worker）に `package.json` が存在すること
- 以下のスクリプトが定義されていること:
  - `typecheck`
  - `lint`
  - `test`
  - `test:coverage`（coverageオプション使用時）
  - `build`（buildオプション使用時）
- pnpmがインストールされていること
- すべての依存パッケージがインストール済みであること

---

## 実行ディレクトリ

### target=all の場合
- プロジェクトルートで実行
- `pnpm --recursive` で全サブプロジェクトを対象

### target=backend / frontend / sync-worker の場合
- 対象ディレクトリに移動して実行
- 例: `cd backend && pnpm typecheck`

---

## レビュープロセスとの連携

このスキルは、`.claude/rules/review_rule.md` で定義されたレビュープロセスの一部として使用されます。

**レビューサブエージェント（typescript_reviewer）の必須チェック項目**:
- ✅ テスト実行（`pnpm test`）← このスキルで実行
- ✅ テストカバレッジ確認 ← `coverage=true` で実行
- ✅ Lintチェック（`pnpm lint`）← このスキルで実行
- ✅ 型チェック（`pnpm typecheck`）← このスキルで実行
- ✅ ビルド確認（`pnpm build`）← `build=true` で実行

**使用例（レビュー時）**:
```
/quality-check coverage=true build=true
```

---

## 関連スキル
- [skill-creator](../skill_creator/SKILL.md): スキル定義の生成・管理

---

## 更新履歴
| 日付 | バージョン | 変更内容 |
|-----|----------|---------|
| 2026-02-04 | 1.0.0 | 初版作成 |
