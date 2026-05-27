// ============================================================
// AI API Relay — Error Code Mapping & Types
// ============================================================
//
// Maps HTTP status codes to user-friendly messages and actions.
// Follows DESIGN-SPEC.md §3.1 information hierarchy.

export type ErrorSeverity = 'error' | 'warning' | 'info';

export interface ErrorMapping {
  title: string;
  message: string;
  severity: ErrorSeverity;
  actions: ErrorAction[];
}

export interface ErrorAction {
  label: string;
  kind: 'retry' | 'switch' | 'docs' | 'dismiss';
  url?: string;
}

export const ERROR_CODE_MAP: Record<number, ErrorMapping> = {
  400: {
    title: '请求格式错误',
    message: '发送的请求参数不符合 API 规范，请检查 model、messages 等字段。',
    severity: 'warning',
    actions: [
      { label: '查看文档', kind: 'docs', url: 'https://platform.openai.com/docs/api-reference/chat' },
      { label: '关闭', kind: 'dismiss' },
    ],
  },
  401: {
    title: '认证失败',
    message: 'API Key 无效或已过期，请在 Admin 后台检查 Key 配置。',
    severity: 'error',
    actions: [
      { label: '切换 Provider', kind: 'switch' },
      { label: '查看 Key 配置', kind: 'docs', url: '/admin' },
    ],
  },
  403: {
    title: '权限不足',
    message: '当前 Key 没有访问该模型的权限，可能是 Provider 侧的限制。',
    severity: 'error',
    actions: [
      { label: '切换 Provider', kind: 'switch' },
      { label: '重试', kind: 'retry' },
    ],
  },
  404: {
    title: '模型不存在',
    message: '请求的模型未找到，请检查模型名称或使用 Model Alias 功能。',
    severity: 'warning',
    actions: [
      { label: '查看可用模型', kind: 'docs', url: '/admin' },
      { label: '关闭', kind: 'dismiss' },
    ],
  },
  408: {
    title: '请求超时',
    message: '上游 Provider 响应超时，可能是服务繁忙或网络问题。',
    severity: 'warning',
    actions: [
      { label: '重试', kind: 'retry' },
      { label: '切换 Provider', kind: 'switch' },
    ],
  },
  429: {
    title: '请求过于频繁',
    message: '触发了频率限制，请稍后重试或切换到其他 Provider。',
    severity: 'warning',
    actions: [
      { label: '重试', kind: 'retry' },
      { label: '切换 Provider', kind: 'switch' },
    ],
  },
  500: {
    title: '服务器内部错误',
    message: '上游 Provider 返回了内部错误，AI Relay 已自动尝试 Fallback。',
    severity: 'error',
    actions: [
      { label: '重试', kind: 'retry' },
      { label: '切换 Provider', kind: 'switch' },
    ],
  },
  502: {
    title: '网关错误',
    message: '上游 Provider 网关异常，通常会很快恢复。',
    severity: 'error',
    actions: [
      { label: '重试', kind: 'retry' },
      { label: '切换 Provider', kind: 'switch' },
    ],
  },
  503: {
    title: '服务不可用',
    message: '上游 Provider 暂时不可用，可能在维护中。',
    severity: 'error',
    actions: [
      { label: '重试', kind: 'retry' },
      { label: '切换 Provider', kind: 'switch' },
      { label: '查看状态', kind: 'docs', url: 'https://status.openai.com' },
    ],
  },
  529: {
    title: '服务过载',
    message: '上游 Provider 过载，AI Relay 正在尝试其他线路。',
    severity: 'warning',
    actions: [
      { label: '重试', kind: 'retry' },
      { label: '切换 Provider', kind: 'switch' },
    ],
  },
};

const DEFAULT_ERROR: ErrorMapping = {
  title: '未知错误',
  message: '发生了预期之外的错误，请重试或联系管理员。',
  severity: 'error',
  actions: [
    { label: '重试', kind: 'retry' },
    { label: '查看文档', kind: 'docs', url: 'https://github.com/ParsifalC/ai-relay' },
  ],
};

/**
 * Get user-friendly error info from HTTP status code.
 */
export function getErrorMapping(statusCode: number): ErrorMapping {
  return ERROR_CODE_MAP[statusCode] || DEFAULT_ERROR;
}

/**
 * Parse error from an API response body.
 */
export function parseApiError(body: unknown): {
  statusCode: number;
  message: string;
  type?: string;
  code?: string;
} {
  if (typeof body === 'object' && body !== null && 'error' in body) {
    const err = (body as { error: Record<string, unknown> }).error;
    return {
      statusCode: Number(err.code) || 500,
      message: String(err.message || 'Unknown error'),
      type: err.type ? String(err.type) : undefined,
      code: err.code ? String(err.code) : undefined,
    };
  }
  return { statusCode: 500, message: 'Unknown error' };
}
