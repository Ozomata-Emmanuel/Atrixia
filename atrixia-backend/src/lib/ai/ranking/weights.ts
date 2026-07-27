export interface RankingWeights {
  priceWeight: number;
  qualityWeight: number;
  shippingWeight: number;
  sellerWeight: number;
  sentimentWeight: number;
}

export function computeWeights(preferences?: {
  prioritizePrice?: boolean;
  prioritizeQuality?: boolean;
  prioritizeShipping?: boolean;
  prioritizeSeller?: boolean;
}): RankingWeights {
  let price = 0.2;
  let quality = 0.2;
  let shipping = 0.2;
  let seller = 0.2;
  let sentiment = 0.2;

  const priorities: string[] = [];
  if (preferences?.prioritizePrice) priorities.push('price');
  if (preferences?.prioritizeQuality) priorities.push('quality');
  if (preferences?.prioritizeShipping) priorities.push('shipping');
  if (preferences?.prioritizeSeller) priorities.push('seller');

  if (priorities.length > 0) {
    const priorityWeightBoost = 0.15;
    const totalBoost = priorityWeightBoost * priorities.length;
    const reductionAmount = totalBoost / (5 - priorities.length || 1);

    if (priorities.includes('price')) price += priorityWeightBoost; else price -= reductionAmount;
    if (priorities.includes('quality')) quality += priorityWeightBoost; else quality -= reductionAmount;
    if (priorities.includes('shipping')) shipping += priorityWeightBoost; else shipping -= reductionAmount;
    if (priorities.includes('seller')) seller += priorityWeightBoost; else seller -= reductionAmount;
    
    if (priorities.includes('quality')) sentiment += 0.05; else sentiment -= reductionAmount / 5;
  }

  price = Math.max(0.05, price);
  quality = Math.max(0.05, quality);
  shipping = Math.max(0.05, shipping);
  seller = Math.max(0.05, seller);
  sentiment = Math.max(0.05, sentiment);

  const sum = price + quality + shipping + seller + sentiment;

  return {
    priceWeight: price / sum,
    qualityWeight: quality / sum,
    shippingWeight: shipping / sum,
    sellerWeight: seller / sum,
    sentimentWeight: sentiment / sum,
  };
}
