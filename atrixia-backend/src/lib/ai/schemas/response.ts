import { z } from 'zod';

export const ReasoningStepSchema = z.object({
  step: z.string().min(1),
  message: z.string().min(1),
});

export const ProductAlternativeSchema = z.object({
  type: z.enum(['budget', 'speed', 'quality']),
  productName: z.string().min(1),
  price: z.number().nonnegative(),
  reasoning: z.string().min(1),
});

export const AIResponseSchema = z.object({
  success: z.boolean(),
  id: z.string(), // Allowing simple IDs or UUIDs
  productName: z.string().optional(),
  confidenceScore: z.number().min(0).max(100).optional(),
  summary: z.string().optional(),
  pros: z.array(z.string()).optional(),
  cons: z.array(z.string()).optional(),
  tradeoffs: z.string().optional(),
  alternatives: z.array(ProductAlternativeSchema).optional(),
  error: z.object({
    code: z.string(),
    message: z.string(),
  }).optional(),
});
