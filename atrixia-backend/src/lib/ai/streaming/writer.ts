import { Response } from 'express';
import { SSEEvent, SSEEventType, createSSEEvent } from './events';

export class SSEWriter {
  private res?: Response;

  constructor(res?: Response) {
    this.res = res;
  }

  public initialize(): void {
    if (this.res) {
      this.res.setHeader('Content-Type', 'text/event-stream');
      this.res.setHeader('Cache-Control', 'no-cache');
      this.res.setHeader('Connection', 'keep-alive');
      this.res.flushHeaders();
    }
  }

  public writeEvent(event: SSEEvent): void {
    if (!this.res) {
      console.log(`[SSE Stub] event: ${event.type} | progress: ${event.progress}% | metadata:`, event.metadata);
      return;
    }

    this.res.write(`event: ${event.type}\n`);
    this.res.write(`data: ${JSON.stringify(event)}\n\n`);
  }

  public emit(type: SSEEventType, progress: number, metadata?: Record<string, any>): void {
    const event = createSSEEvent(type, progress, metadata);
    this.writeEvent(event);
  }

  public end(): void {
    if (this.res) {
      this.res.end();
    }
  }
}
