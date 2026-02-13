# Git Workflow Rules

## ブランチ構成

| ブランチ | 役割 |
|---------|------|
| `main` | 本番環境用（安定版のみ） |
| `develop` | 開発用メインブランチ |
| `feature/issue-X-description` | 機能開発用 |
| `bugfix/issue-X-description` | バグ修正用 |
| `hotfix/issue-X-description` | 緊急修正用（リリース済みバグのみ） |

ブランチ名は `/create-gh-branch X` スキルで自動生成される。

## ブランチポリシー

| 変更の種類 | 作業ブランチ | PR先 |
|-----------|------------|------|
| 機能開発 | `feature/issue-X-description` | `develop` |
| バグ修正 | `bugfix/issue-X-description` | `develop` |
| ドキュメント・サブエージェント変更 | `develop` | `main` |
| 緊急修正（リリース済みバグのみ） | `hotfix/issue-X-description` | `main` + `develop` |

## 運用ルール

1. **main へのコミットは絶対に行わない** — すべての変更は `develop` か `feature/*` で行う。`main` へのマージは PR のみ。PreToolUse ホーク（`prevent-main-commit.sh`）で自動ブロックされる。
2. **常駐ブランチの保護** — `main` と `develop` は削除禁止（常に保持）。
3. **作業ブランチのライフサイクル** — `feature/*`, `bugfix/*` はタスク完了後に必ず削除。PRマージ直後に `git branch -d` で削除する。
4. **ローカルの理想状態** — タスク終了後は `main` と `develop` の2つのみ残す。
5. **差分の解消** — 作業終了時は `git status` で "working tree clean" の状態にする。

## PRマージの運用ルール

PRをマージする際は、以下の手順を**必ず**守ること：

### 1. CIステータスの確認
```bash
gh pr checks <PR番号>
```
- すべてのチェックが `pass` になるまで待つ
- `pending` の場合は待機（30-90秒間隔で再確認）
- `fail` の場合はエラーを修正してから再プッシュ

### 2. マージ可能性の確認
```bash
gh pr view <PR番号> --json mergeable,mergeStateStatus
```
- `mergeable`: "MERGEABLE" であることを確認
- `mergeStateStatus`: "CLEAN" または "UNSTABLE" であることを確認
- "CONFLICTING" の場合はコンフリクトを解決してから再プッシュ

### 3. マージ実行
上記1-2の条件をクリアした後、GitHub MCPでマージを実行：
```
mcp__github__merge_pull_request
```

### 4. マージ失敗時の対応
- エラーメッセージを確認し、原因を特定
- コンフリクトの場合: ローカルで解決してプッシュ後、ステップ1から再実行
- その他のエラー: ユーザーに報告

### 重要な注意事項
- **絶対に CIテストが通る前にマージしない**
- **マージ可能性の確認を省略しない**
- マージ後は必ずローカルの `main` と `develop` を更新

## Issue クローズの扱い

GitHub の `Closes #X` キーワードはデフォルトブランチ（`main`）へのマージ時のみ動作する。
このプロジェクトでは `feature → develop` へマージするため、**PRマージ直後に必ず `update_issue` で `state: "closed"` とセットする**。

## コミット時の自動チェック

AIがコミットを実行する前に以下を確認する：

1. `git rev-parse --abbrev-ref HEAD` で現在のブランチを確認
2. `main` の場合は拒否し、`develop` へのチェックアウトを促す
3. `feature/*` の場合はそのままコミット・プッシュ
4. `develop` の場合はコミット・プッシュ後、`develop → main` へのPRを自動確認

## Issue 無しの変更ワークフロー

Issueと紐付かない変更（ドキュメント、サブエージェント、設定等）の場合：

1. `develop` へチェックアウト
2. 変更実装・コミット
3. `develop → main` へのPR作成（GitHub MCP）
4. ユーザー承認後、PRマージ
5. ローカルの `main` を更新