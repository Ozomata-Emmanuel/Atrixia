export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ConversationContext {
  conversationId?: string;
  messages: Message[];
  preferences?: {
    currency?: string;
    budgetMin?: number;
    budgetMax?: number;
    prioritizePrice?: boolean;
    prioritizeQuality?: boolean;
    prioritizeShipping?: boolean;
    prioritizeSeller?: boolean;
  };
}

export interface AIRequest {
  query: string;
  context?: ConversationContext;
}

export interface ReasoningStep {
  step: string;
  message: string;
}

export interface ProductAlternative {
  type: 'budget' | 'speed' | 'quality';
  productName: string;
  price: number;
  reasoning: string;
}

export interface AIResponse {
  success: boolean;
  id: string;
  productName?: string;
  confidenceScore?: number;
  summary?: string;
  pros?: string[];
  cons?: string[];
  tradeoffs?: string;
  alternatives?: ProductAlternative[];
  error?: {
    code: string;
    message: string;
  };
}

export interface StreamingChunk {
  type: 'thinking' | 'reasoning' | 'recommendation' | 'complete' | 'error';
  payload: Record<string, any>;
}

export interface ProviderResult {
  text: string;
  rawResponse?: any;
}
