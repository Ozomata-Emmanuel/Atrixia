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
      // Disable compression so bytes are sent immediately
      this.res.setHeader('X-Accel-Buffering', 'no');
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

    // Force flush — without this Node buffers everything until res.end()
    // Express wraps the raw socket so we cast to access flush()
    const r = this.res as any;
    if (typeof r.flush === 'function') {
      r.flush();
    } else if (r.socket) {
      r.socket.flush?.();
    }
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
