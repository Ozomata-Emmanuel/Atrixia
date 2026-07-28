export interface LogPayload {
  requestId?: string;
  conversationId?: string;
  userId?: string;
  latencyMs?: number;
  provider?: string;
  tokenUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  toolExecution?: {
    toolName: string;
    success: boolean;
    durationMs: number;
  };
  timing?: {
    memoryMs?: number;
    marketplaceMs?: number;
    rankingMs?: number;
    inferenceMs?: number;
    validationMs?: number;
    persistMs?: number;
  };
  error?: {
    code: string;
    message: string;
    stack?: string;
  };
  metadata?: Record<string, any>;
}

export class StructuredLogger {
  public static info(message: string, payload?: LogPayload): void {
    console.log(JSON.stringify({
      level: 'INFO',
      timestamp: new Date().toISOString(),
      message,
      ...payload
    }));
  }

  public static warn(message: string, payload?: LogPayload): void {
    console.warn(JSON.stringify({
      level: 'WARN',
      timestamp: new Date().toISOString(),
      message,
      ...payload
    }));
  }

  public static error(message: string, payload?: LogPayload): void {
    console.error(JSON.stringify({
      level: 'ERROR',
      timestamp: new Date().toISOString(),
      message,
      ...payload
    }));
  }
}
