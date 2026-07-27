export const FOLLOWUP_PROMPT = `
The user is asking a follow-up question or refining their search parameters within an active conversation thread.
Reference the conversation history, previously generated recommendations, and the user's updated input to generate a contextually aware response.

If the user wants to adjust preferences (e.g., "show me cheaper ones", "find one with faster shipping"), adjust your recommendations and recalculate scores based on the new criteria. Keep the context of the original products intact.
`;
