# quality_check スキル

## はじめに

`quality_check` スキルは、TypeScriptプロジェクトの品質チェック（型チェック、Lint、テスト）を一括実行するためのスキルです。

このスキルを使用することで、以下のような繰り返しタスクを効率化できます:
- 実装完了後の動作確認
- コード修正後の品質チェック
- レビュー前の最終確認
- ユーザー承認前のテスト実行

---

## クイックスタート

### 1. すべての品質チェックを実行
```
/quality_check
```

これだけで、以下のチェックが一括実行されます:
- ✅ 型チェック（TypeScript）
- ✅ Lint（ESLint）
- ✅ テスト（Vitest）

### 2. カバレッジ付きでチェック
```
/quality_check coverage=true
```

### 3. ビルドチェックも含める
```
/quality_check build=true
```

### 4. バックエンドのみチェック
```
/quality_check target=backend
```

---

## 使用シーン

### シーン1: 実装完了後の確認
```
# バックエンド実装完了後
/quality_check target=backend

# フロントエンド実装完了後
/quality_check target=frontend
```

### シーン2: レビュー前の最終確認
```
# すべてのチェックを実行（カバレッジ + ビルド）
/quality_check coverage=true build=true
```

### シーン3: コード修正後の確認
```
# 修正箇所に応じて対象を指定
/quality_check target=backend
```

### シーン4: ユーザー承認前の最終確認
```
# すべてのプロジェクトを対象に全チェック
/quality_check coverage=true build=true
```

---

## パラメータ詳細

### target（チェック対象）

| 値 | 説明 |
|----|------|
| `all` | すべてのプロジェクト（backend, frontend, sync-worker） |
| `backend` | バックエンドのみ |
| `frontend` | フロントエンドのみ |
| `sync-worker` | sync-workerのみ |

### coverage（テストカバレッジ）

| 値 | 説明 |
|----|------|
| `false` | 通常のテストのみ実行 |
| `true` | テストカバレッジを含める |

### build（ビルドチェック）

| 値 | 説明 |
|----|------|
| `false` | ビルドチェックなし |
| `true` | ビルドチェックを含める |

---

## チェック内容

### 1. 型チェック（TypeCheck）
- **コマンド**: `pnpm typecheck`
- **目的**: TypeScriptの型定義エラーを検出
- **確認項目**:
  - 型アノテーションの正確性
  - 型推論の問題
  - インターフェースの整合性

### 2. Lintチェック（Lint）
- **コマンド**: `pnpm lint`
- **目的**: コードスタイルとベストプラクティスの遵守
- **確認項目**:
  - ESLintルール違反
  - コードスタイルの一貫性
  - 潜在的なバグの検出

### 3. テスト実行（Test）
- **コマンド**: `pnpm test` または `pnpm test:coverage`
- **目的**: 機能の正確性を検証
- **確認項目**:
  - すべてのテストケースがパス
  - テストカバレッジ（coverageオプション使用時）

### 4. ビルドチェック（Build）
- **コマンド**: `pnpm build`
- **目的**: 本番ビルドが成功するか確認
- **確認項目**:
  - 依存関係の解決
  - ビルド設定の正確性
  - デプロイ可能な成果物の生成

---

## 出力例

### 成功時
```
✅ 型チェック: すべてパス
✅ Lint: すべてパス
✅ テスト: すべてパス（15件）
✅ テストカバレッジ: 85%
✅ ビルド: 成功
```

### エラー時
```
❌ 型チェック: 3件のエラー
  - src/services/searchService.ts:15 - 型 'string' を型 'number' に割り当てることはできません
  - src/routes/index.ts:22 - プロパティ 'userId' は型 'Request' に存在しません

✅ Lint: すべてパス
❌ テスト: 2件失敗
  - searchService.test.ts: 検索結果が正しく返される
  - statsService.test.ts: 統計情報が正しく取得できる
```

---

## トラブルシューティング

### Q: 型チェックエラーが出る
**A**: TypeScriptの型定義を確認してください。エラーメッセージに表示されるファイルと行番号を参照し、型の不整合を修正します。

### Q: Lintエラーが出る
**A**: 自動修正可能な場合は `pnpm lint:fix` を実行してください。それ以外は手動でコードを修正します。

### Q: テストが失敗する
**A**: 失敗したテストケースを確認し、実装またはテストコードを修正します。TDDサイクル（Red → Green → Refactor）に従ってください。

### Q: ビルドが失敗する
**A**: ビルドログを確認し、依存関係や設定ファイル（tsconfig.json、vite.config.tsなど）を確認します。

### Q: カバレッジが80%未満
**A**: テストケースを追加してカバレッジを向上させます。特にエッジケースや例外処理のテストを追加します。

---

## ベストプラクティス

1. **実装完了後は必ず実行**
   - すべての実装完了後、`/quality_check` を実行してください

2. **レビュー前は完全チェック**
   - レビュー依頼前は、`/quality_check coverage=true build=true` を実行してください

3. **対象を絞って効率化**
   - バックエンドのみ修正した場合は、`target=backend` を指定して時間を節約

4. **エラーは即座に修正**
   - エラーが出た場合は、その場で修正してから次のステップに進む

5. **TDDサイクルの一部として活用**
   - Red → Green → **Refactor** の Refactor フェーズで実行

---

## CLAUDE.mdとの連携

このスキルは、CLAUDE.mdで定義されたレビュープロセスの一部として使用されます。

### レビュープロセスでの使用（`.claude/rules/review_rule.md`）

レビューサブエージェント（typescript_reviewer）は、以下の必須チェック項目を実行します:
- ✅ テスト実行（`pnpm test`）
- ✅ テストカバレッジ確認
- ✅ Lintチェック（`pnpm lint`）
- ✅ 型チェック（`pnpm typecheck`）
- ✅ ビルド確認（`pnpm build`）

これらすべてを一括実行するには:
```
/quality_check coverage=true build=true
```

---

## 関連ドキュメント

- [SKILL.md](./SKILL.md): スキルの詳細定義
- [CLAUDE.md](../../CLAUDE.md): 開発ルール全般
- [review_rule.md](../../.claude/rules/review_rule.md): コードレビュールール

---

## フィードバック

このスキルに関するフィードバックや改善提案は、直接ユーザーに報告してください。
