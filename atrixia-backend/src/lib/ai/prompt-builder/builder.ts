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

    if (context?.preferences) {
      const prefs = context.preferences;
      prompt += `\n\n[USER PREFERENCES]
- Active Currency: ${prefs.currency || 'USD'}
- Budget Minimum: ${prefs.budgetMin ?? 0}
- Budget Maximum: ${prefs.budgetMax ?? 1000}
- Priorities: Price(${prefs.prioritizePrice ?? true}), Quality(${prefs.prioritizeQuality ?? false}), Shipping(${prefs.prioritizeShipping ?? false}), Seller(${prefs.prioritizeSeller ?? false})\n`;
    }

    if (marketplaceResults && marketplaceResults.length > 0) {
      prompt += `\n\n[MARKETPLACE SEARCH RESULTS]
Analyze the following normalized product options carefully. Do not modify prices or titles in your recommendations:\n`;
      
      marketplaceResults.forEach((product, idx) => {
        prompt += `- Product #${idx + 1}: [${product.marketplace.toUpperCase()}] "${product.title}" | Price: ${product.price} ${product.currency} | Brand: ${product.brand || 'Unknown'} | Shipping Estimate: ${product.shippingEstimate || 'N/A'} | Seller Rating: ${product.sellerRating || 'N/A'}\n`;
      });
    }

    if (rankingResults && rankingResults.topPick) {
      prompt += `\n\n[MATHEMATICAL MCDA RANKING RESULTS]
The ranking engine has evaluated the listings using user weight preferences:
- Best Overall Pick: "${rankingResults.topPick.title}" | Score: ${rankingResults.topPick.confidence}/100
- Best Budget Pick: "${rankingResults.budgetPick?.title || 'N/A'}" | Price: ${rankingResults.budgetPick?.price || 'N/A'}
- Recommendation Confidence: ${rankingResults.confidenceScore}%
- Rationale Explanation: ${rankingResults.explanation}\n`;
    }

    const isFollowup = context?.messages && context.messages.length > 0;
    prompt += isFollowup 
      ? `\n\n[INSTRUCTIONS]\n${FOLLOWUP_PROMPT}`
      : `\n\n[INSTRUCTIONS]\n${SHOPPING_REASONING_PROMPT}`;

    return prompt;
  }

  public static buildMessages(
    query: string,
    context?: ConversationContext
  ): Message[] {
    const messages: Message[] = [];

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
