export class MarketplaceError extends Error {
  public statusCode: number;
  public marketplace?: string;

  constructor(message: string, statusCode = 500, marketplace?: string) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.marketplace = marketplace;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class TimeoutError extends MarketplaceError {
  constructor(message = 'Marketplace search request timed out', marketplace?: string) {
    super(message, 408, marketplace);
  }
}

export class AdapterUnavailableError extends MarketplaceError {
  constructor(message = 'Marketplace adapter is currently offline or unconfigured', marketplace?: string) {
    super(message, 503, marketplace);
  }
}

export class RateLimitError extends MarketplaceError {
  constructor(message = 'Marketplace rate limit exceeded', marketplace?: string) {
    super(message, 429, marketplace);
  }
}

export class NormalizationError extends MarketplaceError {
  constructor(message = 'Failed to normalize marketplace product attributes', marketplace?: string) {
    super(message, 422, marketplace);
  }
}
