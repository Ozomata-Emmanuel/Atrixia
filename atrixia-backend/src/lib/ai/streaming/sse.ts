import { Response } from 'express';
import { SSEWriter } from './writer';
import { SSEEventType } from './events';

export class SSEStreamCoordinator {
  private writer: SSEWriter;

  constructor(res?: Response) {
    this.writer = new SSEWriter(res);
  }

  public start(): void {
    this.writer.initialize();
    this.writer.emit('thinking', 5, { message: 'Initializing decision pipeline...' });
  }

  public step(type: SSEEventType, progress: number, metadata?: Record<string, any>): void {
    this.writer.emit(type, progress, metadata);
  }

  public end(metadata?: Record<string, any>): void {
    this.writer.emit('complete', 100, metadata);
    this.writer.end();
  }

  public error(message: string, code = 'STREAMING_ERROR'): void {
    this.writer.emit('error', 100, { message, code });
    this.writer.end();
  }
}
