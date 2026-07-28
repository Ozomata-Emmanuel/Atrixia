import { SYSTEM_PROMPT } from '../prompts/system';
import { SHOPPING_REASONING_PROMPT } from '../prompts/shopping';
import { FOLLOWUP_PROMPT } from '../prompts/followup';
import { ConversationContext, Message } from '../types/ai';
import { NormalizedProduct } from '../models/product';
import { RankingResult } from '../ranking/engine';

export class PromptBuilder {
  public static buildSystemPrompt(
    context?: ConversationContext,
    marketplaceResults?: NormalizedProduct[],
    rankingResults?: RankingResult
  ): string {
    let prompt = SYSTEM_PROMPT;

    // Inject User Preferences
    if (context?.preferences) {
      const prefs = context.preferences;
      prompt += `\n\n[USER PREFERENCES]
- Active Currency: ${prefs.currency || 'USD'}
- Budget Minimum: ${prefs.budgetMin ?? 0}
- Budget Maximum: ${prefs.budgetMax ?? 10000}
- Priorities: Price(${prefs.prioritizePrice ?? true}), Quality(${prefs.prioritizeQuality ?? false}), Shipping(${prefs.prioritizeShipping ?? false}), Seller(${prefs.prioritizeSeller ?? false})\n`;
    }

    // Inject Conversation Summary if exists (Token Efficiency constraint)
    if (context?.messages && context.messages.length > 0) {
      // Historical summary details
      prompt += `\n\n[CONVERSATION BACKGROUND]
Restored summary logs of previous turns:
- User is refining an active shopping conversation. Keep responses consistent with prior choices unless explicitly asked to switch categories.\n`;
    }

    // Inject Marketplace Search Results
    if (marketplaceResults && marketplaceResults.length > 0) {
      prompt += `\n\n[REAL-TIME MARKETPLACE PRODUCT CATALOG]
Use ONLY the following products. DO NOT invent prices, ratings, or products. If a field is null, explicitly state uncertainty.
`;
      marketplaceResults.forEach((product, idx) => {
        prompt += `- Option #${idx + 1} ID: "${product.id}" | "${product.title}" | Price: ${product.price} ${product.currency} | Brand: ${product.brand || 'Unknown'} | Seller: "${product.seller || 'N/A'}" (Rating: ${product.sellerRating !== null ? product.sellerRating + '%' : 'N/A'}) | Reviews count: ${product.reviewCount || 0} | Shipping Cost: ${product.shippingCost !== null ? product.shippingCost + ' ' + product.currency : 'N/A'} (Est: "${product.shippingEstimate || 'N/A'}") | Source: ${product.marketplace.toUpperCase()} | Condition: ${product.condition || 'new'}\n`;
      });
    }

    // Inject MCDA deterministic scoring outputs
    if (rankingResults && rankingResults.topPick) {
      prompt += `\n\n[DETERMINISTIC MCDA SCORING RESULTS]
The backend ranking module scored these candidates mathematically:
- Best Overall Pick: "${rankingResults.topPick.title}" (ID: "${rankingResults.topPick.id}") | Score: ${rankingResults.topPick.confidence}/100
- Best Budget Pick: "${rankingResults.budgetPick?.title || 'N/A'}" (ID: "${rankingResults.budgetPick?.id || 'N/A'}") | Price: ${rankingResults.budgetPick?.price || 'N/A'}
- Overall Analysis: ${rankingResults.explanation}
- Calculated Confidence: ${rankingResults.confidenceScore}/100

INSTRUCTIONS:
Explain these mathematical rankings using actual attributes (compare prices, seller feedback, and shipping speed). Do not perform calculations in your response.\n`;
    }

    const isFollowup = context?.messages && context.messages.length > 0;
    prompt += isFollowup 
      ? `\n\n[INSTRUCTIONS]\n${FOLLOWUP_PROMPT}`
      : `\n\n[INSTRUCTIONS]\n${SHOPPING_REASONING_PROMPT}`;

    prompt += `\n\n[OUTPUT FORMAT]
You MUST output your response as a valid JSON object matching the following structure exactly:
{
  "summary": "string",
  "recommendation": "string",
  "reasoning": "string",
  "pros": ["string"],
  "cons": ["string"],
  "alternatives": ["string"],
  "warnings": ["string"],
  "confidence": "string",
  "next_questions": ["string"]
}`;

    return prompt;
  }

  public static buildMessages(
    query: string,
    context?: ConversationContext
  ): Message[] {
    const messages: Message[] = [];

    // Keep active messages history
    if (context?.messages) {
      messages.push(...context.messages);
    }

    const lastMsg = messages[messages.length - 1];
    if (!lastMsg || lastMsg.content !== query || lastMsg.role !== 'user') {
      messages.push({ role: 'user', content: query });
    }

    return messages;
  }
}
