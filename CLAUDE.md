# Claude Code 開発ルール

このプロジェクトでClaude Codeを使用する際の必須ルールを定義します。

## あなたの役割
- あなたは、熟練したフルスタックエンジニアです。テスト駆動開発の原則に従い、安全で保守性の高いコードを書きます。

## 共通ルール
- コメント、テストメソッドのパターン名は日本語で記述する。
- 例：`testMethod_AをBするとCになる`、`// TODO 今後の実装でXXの機能を追加`
- ファイル名・ディレクトリ名・スキル名・コマンド名はスネークケース（snake_case）を使用する。ケバブケース（kebab-case）は使用しない。
- 例：`feature_implementation_cycle`、`plan_and_commit`、`next_phase`（`feature-implementation-cycle` ❌）

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
メインエージェントとサブエージェント間のやり取りは、**Task toolのプロンプトに直接タスク指示を記載し、サブエージェントのレスポンスで結果を受け取る。**

### サブエージェントの種類

- **frontend_developer**: フロントエンド実装（React + TypeScript + Tailwind CSS）
- **backend_developer**: バックエンド実装（Express + TypeScript + PostgreSQL）
- **typescript_reviewer**: TypeScriptコードのレビュー
- **skill_creator**: スキル定義の生成・管理

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

## 7. 開発フロー（必須）

### 原則：feature_implementation_cycleスキルの使用を厳守

**Phase単位の機能実装は、必ず `feature_implementation_cycle` スキルを使用すること。**

このスキルは以下を自動化します:
- 実装サブエージェント起動（frontend_developer / backend_developer）
- TDD実装サイクル（Red → Green → Refactor）
- typescript_reviewerによるレビュー実施
- ユーザー承認取得プロセス
- CLAUDE.md更新（実装完了履歴の記録）

### 使用方法

```bash
/feature_implementation_cycle phase_name="Phase X: 機能名" task_description="実装内容の詳細" developer_type=backend_developer

# フロントエンド実装の例
/feature_implementation_cycle phase_name="Phase 1: ログインUI" task_description="ログインフォームの実装" developer_type=frontend_developer

# バックエンド実装の例
/feature_implementation_cycle phase_name="Phase 2: API認証" task_description="認証エンドポイントの実装" developer_type=backend_developer
```

### Phase完了後の必須確認事項

**各Phase完了後、必ず以下を確認すること:**

1. **スキル化の可能性チェック**
   - 今回のPhaseで繰り返し実施した作業はないか？
   - 手動で3ステップ以上実施した定型作業はないか？
   - 次回も同じ手順が必要になる作業はないか？

2. **スキル化の判断基準**
   - ✅ **同じ手順を3回以上繰り返した** → スキル化を検討
   - ✅ **5ステップ以上の定型フローがある** → スキル化を検討
   - ✅ **ドキュメント化しても理解が難しい複雑な手順** → スキル化を検討
   - ❌ **1回限りの作業** → スキル化不要
   - ❌ **プロジェクト固有すぎる作業** → スキル化不要

3. **スキル化の実施**
   - 該当する場合、ユーザーに報告し、skill_creatorの使用を提案する
   - 詳細はセクション9「スキル化の検討」を参照

### 例外：スキルを使用しない場合

以下の場合のみ、手動でTask toolを使用可:
- **調査・探索のみの作業**（コード変更を伴わない）
- **緊急の修正**（1ファイルのみの軽微な変更）
- **ドキュメント作成のみ**

それ以外の機能実装は、**必ず `feature_implementation_cycle` スキルを使用すること。**

詳細は `.claude/skills/feature_implementation_cycle/SKILL.md` を参照。

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

### 9.2 Phase完了時の必須チェック（重要）

**各Phase完了後、以下の質問に答えること:**

| 質問 | Yes → スキル化検討 | No → スキル化不要 |
|------|-------------------|------------------|
| 今回のPhaseで、同じ手順を3回以上繰り返したか？ | ✅ | ❌ |
| 5ステップ以上の定型フローを実施したか？ | ✅ | ❌ |
| 次回も同じ手順が必要になりそうか？ | ✅ | ❌ |
| ドキュメント化しても理解が難しい複雑さか？ | ✅ | ❌ |
| 他のプロジェクトでも再利用できそうか？ | ✅ | ❌ |

**自動チェック機能**:
- `feature_implementation_cycle`スキル使用時、Phase完了後に自動的にこのチェックリストが表示されます
- `.claude/settings.json`のhookにより、「Phase実装完了」などのキーワード検出時にもチェックリストを表示

**1つでもYesがある場合:**
1. ユーザーに報告：「このフローはスキル化の候補です」
2. スキル化の提案：具体的な作業内容を説明
3. 承認後、skill_creatorを使用してスキル定義を生成

**すべてNoの場合:**
- スキル化不要、次のPhaseへ進む

### 9.3 スキル化の基準（詳細）

- **同じ指示を3回以上繰り返した**
- **定型的な作業フローがある**（例: API追加、マイグレーション実行、コンポーネント作成パターン）
- **複数ステップで構成される複雑な作業**（5ステップ以上）
- **他のプロジェクトでも再利用可能**

**スキル化しない方が良い例:**
- ❌ 1回限りの作業（データベース初期化など）
- ❌ プロジェクト固有すぎる作業（特定のビジネスロジック）
- ❌ 手順が毎回異なる作業（要件が都度変わる）

### 9.4 スキル化のプロセス

1. **パターン特定**: Phase完了時の振り返りで繰り返しパターンを特定
2. **要件抽出**: どの部分が共通で、どの部分がパラメータ化可能か分析
3. **スキル設計**: skill_creatorに依頼してスキル定義を生成
4. **ドキュメント化**: SKILL.mdとREADME.mdを作成
5. **レビュー改善**: 実際に使用してフィードバックを反映

**重要**: 必要性が明確になってから実施。過度な抽象化は避ける。

### 9.5 利用可能なスキル（使用優先順位）

#### 最優先スキル（必須使用）

1. **feature_implementation_cycle** ⭐必須⭐
   - **用途**: Phase単位の機能実装（実装 → レビュー → 承認 → 履歴記録）
   - **使用タイミング**: フロントエンド/バックエンドの機能実装すべて
   - **重要度**: **Phase実装時は必ず使用すること**
   - 詳細: `skills/feature_implementation_cycle/SKILL.md`

#### 推奨スキル（適宜使用）

2. **quality_check**
   - **用途**: 品質チェック（typecheck + lint + test）を一括実行
   - **使用タイミング**: 実装後の動作確認、デバッグ時
   - 詳細: `.claude/skills/quality_check/SKILL.md`

3. **plan_and_commit**
   - **用途**: 実装前の詳細な実装計画立案とコミット
   - **使用タイミング**: 大規模機能の実装前、複雑な設計が必要な場合
   - 詳細: `.claude/skills/plan_and_commit/SKILL.md`

4. **skill_creator**
   - **用途**: 繰り返しパターンからスキル定義を自動生成
   - **使用タイミング**: Phase完了時の振り返りで繰り返しパターンを発見した場合
   - 詳細: `.claude/skills/skill_creator/SKILL.md`

### 9.6 スキル追加の手順

1. Phase完了時の振り返りで繰り返しパターンを特定
2. セクション9.2のチェックリストで判断
3. スキル化が適切と判断した場合、ユーザーに報告・提案
4. 承認後、skill_creatorを使用してスキル定義を生成
5. CLAUDE.mdのセクション9.5にスキル情報を追加

---

## 10. 次に行うべきアクション

**注**: 過去のやり取りの履歴は `.claude/docs/archives.md` に記録されています。

### 10.1 次のタスク（優先度: 最高）

**Phase 4: 検索API更新**

次の実装候補については、セクション10.3を参照してください。

---

### 10.2 実装完了した機能

#### Phase 5: 既存API呼び出し修正（✅ 完了 - 2026-02-12）
- 検索APIリクエストに `credentials: 'include'` 付与（セッションクッキー送信）
- 401レスポンス時に `logout()` → `AuthContext` ユーザー情報クリア → LoginPage 自動遷移
- `useSearch` フックに `useAuth` 統合、型安全なエラーハンドリング実装
- テスト72件すべて成功、カバレッジ87.11%達成

#### Phase 3: ハイブリッド検索ロジック実装（✅ 完了 - 2026-02-11）
- セマンティック検索（pgvectorコサイン類似度）+ キーワード検索（pg_trgm + ILIKE）のハイブリッド検索実装完了
- `semanticSearch` / `keywordSearch` / `hybridSearch` 関数を `searchService.ts` に追加
- 並列実行（Promise.all）+ 重み付きスコアリング（semantic×0.6 + keyword×0.4）+ 重複排除
- エンベディング生成失敗時はキーワード検索にフォールバック
- `?mode=keyword` でキーワード検索のみ切り替え可能
- テスト74件すべて成功、カバレッジ84.51%達成

#### Phase 2: 同期時エンベディング生成（✅ 完了 - 2026-02-11）
- Qiita記事同期時にGemini APIでエンベディングを生成し、documentsテーブルのembeddingカラムに保存
- `DocumentInput` インターフェースに `embedding?: number[]` を追加
- エンベディング生成失敗時も記事同期を継続するエラー耐性設計
- テスト27件すべて成功、主要ファイルカバレッジ100%達成、ブランチカバレッジ81.81%

#### Phase 1: Gemini APIクライアント実装（✅ 完了 - 2026-02-10）
- Gemini API クライアント実装完了（generateEmbedding関数、768次元ベクトル生成）
- USE_MOCK_GEMINI=trueによるモック切り替え機能
- レート制限対策（4秒/リクエスト）、リトライロジック（指数バックオフ）実装
- テスト22件すべて成功、geminiClient.ts 100%カバレッジ達成
- コード品質評価：保守性・安全性・パフォーマンスすべて優秀

#### Phase 0: pgvector基盤構築（✅ 完了 - 2026-02-09）
- PostgreSQLにpgvector拡張を導入（pgvector/pgvector:pg16）
- embeddingカラム追加（vector(768)型）
- IVFFlatインデックス作成（高速な近似最近傍探索、コサイン類似度演算子）
- pgvector動作確認テスト6件実装
- TDDサイクル（Red → Green → Refactor）の実践成功
- テスト58件すべて成功、テストカバレッジ81.11%達成（目標80%以上）
- コード品質評価：保守性・安全性・パフォーマンスすべて優秀
- PostgreSQL 15→16へのメジャーバージョンアップ完了

#### Phase 4: ルーティング統合（✅ 完了 - 2026-02-07）
- 認証ベースのルーティング実装完了（未認証→LoginPage、認証済み→SearchPage）
- AuthProviderの統合、main.tsxへの適用完了
- App.tsxからSearchPage.tsxへ検索機能を適切に分離
- UserMenuのSearchPageへの統合（画面右上配置）
- TDDサイクル（Red → Green → Refactor）の実践成功
- テスト59件すべて成功、テストカバレッジ84.02%達成（目標80%以上）
- コード品質評価：保守性・安全性・パフォーマンスすべて優秀

---

### 10.3 今後の実装候補

1. **Phase 4: 検索API更新**: ハイブリッド検索APIエンドポイントの追加調整（modeパラメータ拡張など）
2. **Qiita Team sync-worker トランザクション実装**: 一括upsert処理
6. **Sync Worker cron設定**: 日次自動同期
7. **検索機能の統合テスト**: E2E動作確認
8. **検索拡張**: フィルタリング、ソート、ページネーション

---

## 11. まとめ

### 開発原則
1. **TDD徹底**: Red → Green → Refactor
2. **スキル使用厳守**: Phase実装時は必ず `feature_implementation_cycle` を使用
3. **Phase完了後の振り返り**: セクション9.2のチェックリストでスキル化の可能性を確認
4. **サブエージェント活用**: frontend_developer, backend_developer, typescript_reviewer, skill_creator
6. **各種ルール参照**: `.claude/rules/` 配下の各種mdファイル

### Phase完了時のチェックリスト

✅ 実装完了（テスト・Lint・型チェックすべてパス）
✅ ユーザー承認取得
✅ CLAUDE.md履歴に記録（セクション10.2）
✅ **スキル化の可能性を確認**（セクション9.2参照）
✅ 次のPhaseへ進む

**すべての開発工程でこのルールを遵守すること。**
