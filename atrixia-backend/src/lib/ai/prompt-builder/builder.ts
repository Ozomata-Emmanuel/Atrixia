import { SYSTEM_PROMPT } from '../prompts/system';
import { SHOPPING_REASONING_PROMPT } from '../prompts/shopping';
import { FOLLOWUP_PROMPT } from '../prompts/followup';
import { ConversationContext, Message } from '../types/ai';
import { NormalizedProduct } from '../models/product';
import { RankingResult } from '../ranking/engine';

// Max products sent to Gemma for analysis.
// Fewer = faster inference. The 4 picks + 1 extra gives Gemma enough to reason about.
const MAX_AI_PRODUCTS = 5;

export class PromptBuilder {
  public static buildSystemPrompt(
    context?: ConversationContext,
    marketplaceResults?: NormalizedProduct[],
    rankingResults?: RankingResult
  ): string {
    // ── Compact system instruction ────────────────────────────────────────────
    // Keep it tight — every extra token adds latency on free-tier Gemma
    let prompt = SYSTEM_PROMPT.trim();

    // Preferences — only include non-default values to save tokens
    if (context?.preferences) {
      const prefs = context.preferences as any;
      const prefParts: string[] = [];
      if (prefs.currency && prefs.currency !== 'USD') prefParts.push(`Currency: ${prefs.currency}`);
      if (prefs.prioritizeQuality) prefParts.push('Priority: Quality');
      else if (prefs.prioritizePrice) prefParts.push('Priority: Price');
      if (prefParts.length) {
        prompt += `\n\n[USER PREFS] ${prefParts.join(' | ')}`;
      }
    }

    // Prior conversation context (just a flag — saves tokens vs repeating messages)
    if (context?.messages && context.messages.length > 0) {
      prompt += `\n\n[CONTEXT] This is a follow-up in an active conversation. Stay consistent with prior recommendations.`;
    }

    // ── Product catalog — capped to MAX_AI_PRODUCTS ───────────────────────────
    // Send only the ranked picks + top alternatives, not the full raw list.
    // This is the single biggest driver of prompt size and Gemma latency.
    const productsToSend = this._selectTopProducts(marketplaceResults || [], rankingResults);

    if (productsToSend.length > 0) {
      prompt += `\n\n[PRODUCTS — ${productsToSend.length} options, use ONLY these IDs]\n`;
      productsToSend.forEach((p, i) => {
        prompt += `#${i + 1} ID:"${p.id}" | "${p.title.slice(0, 70)}" | ${p.price.toFixed(2)} ${p.currency} | ${p.marketplace.toUpperCase()} | ${p.condition || 'new'} | Seller:${p.sellerRating ?? 'N/A'}% | Reviews:${p.reviewCount ?? 0} | Ship:${p.shippingCost === 0 ? 'Free' : (p.shippingCost ?? '?')} (${p.shippingEstimate?.slice(0, 30) ?? 'N/A'})\n`;
      });
    }

    // ── MCDA picks (compact) ──────────────────────────────────────────────────
    if (rankingResults?.topPick) {
      const t = rankingResults.topPick;
      const b = rankingResults.budgetPick;
      prompt += `\n[RANKED] Best:"${t.title.slice(0, 50)}"(${t.confidence}/100)`;
      if (b && b.id !== t.id) prompt += ` | Budget:"${b.title.slice(0, 40)}"($${b.price.toFixed(2)})`;
      prompt += ` | Confidence:${rankingResults.confidenceScore}/100`;
    }

    // ── Instructions ──────────────────────────────────────────────────────────
    const isFollowup = context?.messages && context.messages.length > 0;
    prompt += `\n\n[INSTRUCTIONS]\n${isFollowup ? FOLLOWUP_PROMPT.trim() : SHOPPING_REASONING_PROMPT.trim()}`;

    // ── Output format — compact but complete ──────────────────────────────────
    const productIds = productsToSend.map((p) => `"${p.id}"`).join(', ');
    prompt += `\n\n[OUTPUT] Respond with ONLY a valid JSON object. No markdown. No extra text.
{
  "summary": "2-3 sentences summarising what was found",
  "recommendation": "Which product to buy and why (1-2 sentences)",
  "warnings": ["Any important buyer warnings"],
  "confidence": "High|Medium|Low — brief reason",
  "next_questions": ["1 clarifying question"],
  "products": [${productsToSend.map(p => `
    {"productId":"${p.id}","description":"1 sentence","pros":["pro1","pro2"],"cons":["con1"]}`).join(',')}
  ]
}
Each productId MUST be one of: ${productIds}`;

    return prompt;
  }

  /**
   * Selects the most important products to send to Gemma.
   * Prioritises the 4 ranked picks, then fills up to MAX_AI_PRODUCTS from ranked list.
   * This keeps prompt size predictable regardless of how many raw products were found.
   */
  private static _selectTopProducts(
    allProducts: NormalizedProduct[],
    rankingResults?: RankingResult
  ): NormalizedProduct[] {
    if (!rankingResults || allProducts.length === 0) {
      return allProducts.slice(0, MAX_AI_PRODUCTS);
    }

    const pickIds = new Set([
      rankingResults.topPick?.id,
      rankingResults.budgetPick?.id,
      rankingResults.performancePick?.id,
      rankingResults.valuePick?.id,
    ].filter(Boolean));

    // Always include the 4 picks first
    const picks = allProducts.filter(p => pickIds.has(p.id));

    // Then fill remaining slots from ranked products (not already included)
    const extras = (rankingResults.products || [])
      .filter(p => !pickIds.has(p.id))
      .slice(0, MAX_AI_PRODUCTS - picks.length);

    return [...picks, ...extras].slice(0, MAX_AI_PRODUCTS);
  }

  public static buildMessages(
    query: string,
    context?: ConversationContext
  ): Message[] {
    const messages: Message[] = [];

    if (context?.messages) {
      // Only pass the last 4 messages — older context is in the summary
      const recent = context.messages.slice(-4);
      messages.push(...recent);
    }

    const lastMsg = messages[messages.length - 1];
    if (!lastMsg || lastMsg.content !== query || lastMsg.role !== 'user') {
      messages.push({ role: 'user', content: query });
    }

    return messages;
  }
}
