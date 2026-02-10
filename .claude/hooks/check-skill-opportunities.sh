#!/bin/bash
# SubagentStop イベントで発火（backend_developer / frontend_developer 完了時）
# 実装サブエージェント完了後にスキル化チェックリストを表示する

# stdin から JSON を読み込み（必須: 読まないとパイプが詰まる）
INPUT=$(cat)

# エージェント種別を取得
if command -v jq &>/dev/null; then
  AGENT_TYPE=$(echo "$INPUT" | jq -r '.agent_type // "unknown"')
else
  # jq がない環境向けのフォールバック
  AGENT_TYPE=$(echo "$INPUT" | grep -o '"agent_type":"[^"]*"' | cut -d'"' -f4)
fi

cat << EOF
## スキル化チェックリスト（${AGENT_TYPE} 完了）

実装サブエージェントの完了を検知しました。CLAUDE.md セクション9.2 に従い、以下を確認してユーザーに報告してください：

| 質問 | Yes → スキル化検討 |
|------|------------------|
| 同じ手順を3回以上繰り返したか？ | ✅ |
| 5ステップ以上の定型フローを実施したか？ | ✅ |
| 次回も同じ手順が必要になりそうか？ | ✅ |
| ドキュメント化しても理解が難しい複雑さか？ | ✅ |
| 他のプロジェクトでも再利用できそうか？ | ✅ |

- **1つでもYes**: ユーザーに「スキル化の候補です」と報告し、skill_creator 使用を提案する
- **すべてNo**: チェック不要、次のフェーズへ進む
EOF

exit 0
