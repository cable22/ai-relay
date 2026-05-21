#!/bin/bash
# ============================================================
# AI Relay — 快速添加 API Key
# 用法: ./scripts/add-api-key.sh <provider> <api_key>
# 示例: ./scripts/add-api-key.sh xiaomi sk-xxxx
#       ./scripts/add-api-key.sh openai sk-xxxx
# ============================================================

set -euo pipefail

PROVIDER="${1:-}"
API_KEY="${2:-}"
VERCEL_PROJECT="prj_zFB3nw3D1WSXtrh3Bml9pJpfe3wt"

# Provider → Env var name / Test model / Test URL
declare -A ENV_KEYS=(
  [openai]="OPENAI_KEYS"
  [anthropic]="CLAUDE_KEYS"
  [deepseek]="DEEPSEEK_KEYS"
  [xiaomi]="XIAOMI_KEYS"
)

declare -A TEST_MODELS=(
  [openai]="gpt-4o-mini"
  [anthropic]="claude-3-5-haiku-20241022"
  [deepseek]="deepseek-chat"
  [xiaomi]="mimo-v2.5-pro"
)

declare -A TEST_URLS=(
  [openai]="https://api.openai.com/v1/chat/completions"
  [anthropic]="https://api.anthropic.com/v1/messages"
  [deepseek]="https://api.deepseek.com/v1/chat/completions"
  [xiaomi]="https://api.xiaomi.com/v1/chat/completions"
)

declare -A DISPLAY_NAMES=(
  [openai]="OpenAI"
  [anthropic]="Anthropic (Claude)"
  [deepseek]="DeepSeek"
  [xiaomi]="Xiaomi (MiMo)"
)

usage() {
  echo "用法: $0 <provider> <api_key>"
  echo ""
  echo "支持的 provider:"
  echo "  openai     — OpenAI (GPT 系列)"
  echo "  anthropic  — Anthropic (Claude 系列)"
  echo "  deepseek   — DeepSeek"
  echo "  xiaomi     — Xiaomi (MiMo 系列)"
  echo ""
  echo "示例:"
  echo "  $0 xiaomi sk-xxxx"
  echo "  $0 openai sk-proj-xxxx"
  exit 1
}

if [[ -z "$PROVIDER" || -z "$API_KEY" ]]; then
  usage
fi

if [[ -z "${ENV_KEYS[$PROVIDER]+x}" ]]; then
  echo "❌ 不支持的 provider: $PROVIDER"
  usage
fi

ENV_KEY="${ENV_KEYS[$PROVIDER]}"
TEST_MODEL="${TEST_MODELS[$PROVIDER]}"
TEST_URL="${TEST_URLS[$PROVIDER]}"
DISPLAY="${DISPLAY_NAMES[$PROVIDER]}"

echo "🔑 添加 $DISPLAY API Key"
echo "   Env: $ENV_KEY"
echo "   Key: ${API_KEY:0:8}...${API_KEY: -4}"
echo ""

# ── Step 1: 测试 Key 可用性 ──────────────────────────────
echo "📡 测试 Key 可用性..."

if [[ "$PROVIDER" == "anthropic" ]]; then
  # Anthropic 用不同的 header 格式
  HTTP_CODE=$(curl -s -o /tmp/airelay-test-resp.json -w "%{http_code}" \
    "$TEST_URL" \
    -H "x-api-key: $API_KEY" \
    -H "anthropic-version: 2023-06-01" \
    -H "content-type: application/json" \
    -d "{
      \"model\": \"$TEST_MODEL\",
      \"max_tokens\": 5,
      \"messages\": [{\"role\": \"user\", \"content\": \"hi\"}]
    }" 2>/dev/null || echo "000")
else
  # OpenAI-compatible 格式
  HTTP_CODE=$(curl -s -o /tmp/airelay-test-resp.json -w "%{http_code}" \
    "$TEST_URL" \
    -H "Authorization: Bearer $API_KEY" \
    -H "content-type: application/json" \
    -d "{
      \"model\": \"$TEST_MODEL\",
      \"max_tokens\": 5,
      \"messages\": [{\"role\": \"user\", \"content\": \"hi\"}]
    }" 2>/dev/null || echo "000")
fi

if [[ "$HTTP_CODE" == "200" ]]; then
  echo "✅ Key 可用！(HTTP $HTTP_CODE)"
elif [[ "$HTTP_CODE" == "401" || "$HTTP_CODE" == "403" ]]; then
  echo "❌ Key 无效 (HTTP $HTTP_CODE)"
  echo "   响应: $(cat /tmp/airelay-test-resp.json 2>/dev/null | head -c 200)"
  exit 1
elif [[ "$HTTP_CODE" == "429" ]]; then
  echo "⚠️  Key 被限流 (HTTP 429)，但 key 本身可能是有效的"
  echo "   继续添加..."
elif [[ "$HTTP_CODE" == "000" ]]; then
  echo "❌ 网络连接失败"
  exit 1
else
  echo "⚠️  未知状态码 $HTTP_CODE"
  echo "   响应: $(cat /tmp/airelay-test-resp.json 2>/dev/null | head -c 200)"
  read -p "   是否继续添加？(y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

# ── Step 2: 获取当前 Vercel 环境变量 ─────────────────────
echo ""
echo "📦 获取 Vercel 环境变量..."

EXISTING=$(npx vercel env ls "$ENV_KEY" production --token="${VERCEL_TOKEN:-}" 2>/dev/null | tail -1 | awk '{print $NF}' || echo "")

# 如果 vercel env ls 不好用，尝试直接拉
if [[ -z "$EXISTING" ]]; then
  EXISTING=$(npx vercel env pull /tmp/airelay-env-pull.env --yes --token="${VERCEL_TOKEN:-}" 2>/dev/null && grep "^$ENV_KEY=" /tmp/airelay-env-pull.env | cut -d'=' -f2- | tr -d '"' || echo "")
fi

# ── Step 3: 检查 Key 是否已存在 ──────────────────────────
if echo "$EXISTING" | grep -q "$API_KEY"; then
  echo "⚠️  该 Key 已存在于 $ENV_KEY 中，跳过"
  exit 0
fi

# ── Step 4: 追加新 Key ──────────────────────────────────
if [[ -n "$EXISTING" ]]; then
  NEW_VALUE="${EXISTING},${API_KEY}"
else
  NEW_VALUE="$API_KEY"
fi

echo "📝 更新 Vercel 环境变量 $ENV_KEY..."

# 先删除旧的，再创建新的（Vercel CLI 不支持直接更新）
npx vercel env rm "$ENV_KEY" production --yes --token="${VERCEL_TOKEN:-}" 2>/dev/null || true
echo "$NEW_VALUE" | npx vercel env add "$ENV_KEY" production --token="${VERCEL_TOKEN:-}" 2>/dev/null

echo ""
echo "✅ Done! $DISPLAY key 已添加"
echo "   $ENV_KEY 现在有 $(echo "$NEW_VALUE" | tr ',' '\n' | wc -l | tr -d ' ') 个 key"
echo ""
echo "🚀 部署以激活: cd $(dirname "$0")/.. && npx vercel --prod --yes"
echo "   或等待下一次自动部署"
