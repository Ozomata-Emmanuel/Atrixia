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

    // Inject Conversation Summary
    if (context?.messages && context.messages.length > 0) {
      prompt += `\n\n[CONVERSATION BACKGROUND]
User is refining an active shopping conversation. Keep responses consistent with prior choices unless explicitly asked to switch.\n`;
    }

    // Inject Marketplace Products
    if (marketplaceResults && marketplaceResults.length > 0) {
      prompt += `\n\n[REAL-TIME MARKETPLACE PRODUCT CATALOG]
Use ONLY the following products. DO NOT invent prices, ratings, or products.
`;
      marketplaceResults.forEach((p, idx) => {
        prompt += `Option #${idx + 1}:
  ID: "${p.id}"
  Title: "${p.title}"
  Price: ${p.price} ${p.currency}
  Brand: ${p.brand || 'Unknown'}
  Seller: "${p.seller || 'N/A'}" (Rating: ${p.sellerRating !== null ? p.sellerRating + '%' : 'N/A'})
  Reviews: ${p.reviewCount || 0}
  Shipping: ${p.shippingCost !== null ? '$' + p.shippingCost : 'N/A'} (${p.shippingEstimate || 'N/A'})
  Source: ${p.marketplace.toUpperCase()}
  Condition: ${p.condition || 'new'}\n`;
      });
    }

    // Inject MCDA scoring
    if (rankingResults && rankingResults.topPick) {
      prompt += `\n\n[DETERMINISTIC MCDA SCORING RESULTS]
- Best Overall: "${rankingResults.topPick.title}" (ID: "${rankingResults.topPick.id}") | Score: ${rankingResults.topPick.confidence}/100
- Best Budget: "${rankingResults.budgetPick?.title || 'N/A'}" | Price: ${rankingResults.budgetPick?.price || 'N/A'}
- Analysis: ${rankingResults.explanation}
- Confidence: ${rankingResults.confidenceScore}/100\n`;
    }

    const isFollowup = context?.messages && context.messages.length > 0;
    prompt += isFollowup
      ? `\n\n[INSTRUCTIONS]\n${FOLLOWUP_PROMPT}`
      : `\n\n[INSTRUCTIONS]\n${SHOPPING_REASONING_PROMPT}`;

    // Updated output format — includes per-product analysis
    const productIds = (marketplaceResults || []).map((p) => `"${p.id}"`).join(', ');
    prompt += `\n\n[OUTPUT FORMAT]
You MUST output a valid JSON object with this EXACT structure. No extra text, no markdown.

{
  "summary": "2-3 sentence overall summary of the search results",
  "recommendation": "Which product you recommend most and why",
  "reasoning": "Detailed explanation of your recommendation based on the data",
  "pros": ["Overall pro 1", "Overall pro 2"],
  "cons": ["Overall con 1", "Overall con 2"],
  "warnings": ["Any important warnings for the buyer"],
  "confidence": "High / Medium / Low with brief reason",
  "next_questions": ["Clarifying question 1", "Clarifying question 2"],
  "products": [
    {
      "productId": "<one of: ${productIds}>",
      "description": "1-2 sentence natural language description of this specific product",
      "pros": ["Specific pro for this product", "Another pro"],
      "cons": ["Specific con for this product", "Another con"]
    }
  ]
}

The "products" array MUST contain one entry for EACH product ID listed above. Use the exact IDs.`;

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
