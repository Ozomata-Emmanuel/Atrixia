// components/ai/ProductCard.jsx
import React, { memo, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiTruck, FiStar, FiExternalLink, FiAward, FiDollarSign, FiTrendingUp, FiZap, FiImage } from 'react-icons/fi';
import { IoMdStar } from "react-icons/io";

/**
 * Marketplace visual styling configuration.
 * Maps marketplace names to their brand colors and styles.
 */
const marketplaceStyles = {
  Jumia: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200', badge: 'bg-orange-500/80 border-orange-400/50' },
  Konga: { bg: 'bg-pink-100', text: 'text-pink-700', border: 'border-pink-200', badge: 'bg-pink-500/80 border-pink-400/50' },
  eBay: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200', badge: 'bg-blue-500/80 border-blue-400/50' },
  Jiji: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200', badge: 'bg-green-500/80 border-green-400/50' },
};

/**
 * Default marketplace style for unknown marketplaces.
 */
const DEFAULT_MARKETPLACE_STYLE = {
  bg: 'bg-gray-100',
  text: 'text-gray-700',
  border: 'border-gray-200',
  badge: 'bg-gray-500/80 border-gray-400/50',
};

/**
 * ScoreBadge Component
 * Displays a color-coded score badge based on the score value.
 * 
 * @param {Object} props
 * @param {number} props.score - The score value (0-100)
 */
const ScoreBadge = memo(({ score }) => {
  const color = score >= 80 
    ? 'bg-emerald-500' 
    : score >= 70 
      ? 'bg-yellow-500' 
      : 'bg-orange-500';
  
  return (
    <div 
      className={`${color} text-white text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm`}
      title={`Overall Score: ${score}/100`}
      role="status"
      aria-label={`Score: ${score} out of 100`}
    >
      <FiTrendingUp className="text-xs" aria-hidden="true" />
      {score}
    </div>
  );
});

ScoreBadge.displayName = 'ScoreBadge';

/**
 * ProductCard Component
 * Displays a product card with image, details, and navigation.
 * Supports streaming animation state and graceful image fallback.
 * 
 * @param {Object} props
 * @param {Object} props.product - Product data object
 * @param {boolean} props.isStreaming - Whether the product is being streamed in real-time
 * @param {boolean} props.compact - Whether to render in compact mode (for report summaries)
 */
const ProductCard = memo(({ product, isStreaming = false, compact = false }) => {
  const navigate = useNavigate();
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  
  const marketplaceStyle = marketplaceStyles[product?.marketplace] || DEFAULT_MARKETPLACE_STYLE;
  
  /**
   * Navigates to the product detail page.
   * Prevents navigation during streaming.
   */
  const handleClick = useCallback(() => {
    if (!isStreaming && product?.id) {
      navigate(`/product/${product.id}`, { state: { product } });
    }
  }, [isStreaming, product, navigate]);

  /**
   * Handles keyboard navigation for accessibility.
   */
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  }, [handleClick]);

  // Guard against missing product data
  if (!product) {
    return null;
  }

  const imageHeight = compact ? 'h-32' : 'h-44';

  return (
    <div
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={isStreaming ? -1 : 0}
      aria-label={`View details for ${product.title || 'product'}`}
      aria-disabled={isStreaming}
      className={`group bg-white rounded-xl border transition-all duration-300 overflow-hidden outline-none
        focus-visible:ring-2 focus-visible:ring-[#009FB8] focus-visible:ring-offset-2
        ${isStreaming 
          ? 'border-gray-100 shadow-sm animate-pulse cursor-not-allowed' 
          : 'border-gray-200 shadow-sm hover:shadow-xl hover:border-[#009FB8]/30 cursor-pointer hover:-translate-y-1'
        }`}
    >
      {/* Product Image */}
      <div className={`relative ${imageHeight} overflow-hidden bg-linear-to-br from-gray-50 to-gray-100`}>
        {!imageError ? (
          <>
            {/* Loading placeholder */}
            {!imageLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100 animate-pulse">
                <FiImage className="text-gray-300 text-2xl" />
              </div>
            )}
            <img 
              src={product.image} 
              alt={product.title || 'Product image'}
              className={`w-full h-full object-cover transition-all duration-500 ${
                imageLoaded ? 'opacity-100' : 'opacity-0'
              } ${!isStreaming ? 'group-hover:scale-110' : ''}`}
              loading="lazy"
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
            />
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100 text-gray-400">
            <FiImage className="text-2xl mb-1" />
            <span className="text-xs">No Image Available</span>
          </div>
        )}
        
        {/* Marketplace Badge */}
        <div className="absolute top-2 left-2 z-10">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${marketplaceStyle.bg} ${marketplaceStyle.text} ${marketplaceStyle.border} border shadow-sm`}>
            {product.marketplace || 'Store'}
          </span>
        </div>

        {/* Score Badge */}
        {product.overallScore != null && (
          <div className="absolute top-2 right-2 z-10">
            <ScoreBadge score={product.overallScore} />
          </div>
        )}

        {/* Rank Badge */}
        {product.rank != null && (
          <div className="absolute bottom-2 left-2 z-10 bg-black/70 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full font-medium">
            #{product.rank}
          </div>
        )}
      </div>
      
      {/* Product Info */}
      <div className={`${compact ? 'p-3' : 'p-4'}`}>
        <h4 
          className="font-semibold text-[#1a1a1a] text-sm line-clamp-2 group-hover:text-[#009FB8] transition-colors mb-2 min-h-10"
          title={product.title}
        >
          {product.title || 'Untitled Product'}
        </h4>
        
        {/* Price & Score */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[#009FB8] font-bold text-lg">
              {product.currency || '$'}{product.price?.toLocaleString() ?? 'N/A'}
            </p>
            {product.shippingFree && (
              <p className="text-xs text-emerald-600 flex items-center gap-1">
                <FiTruck className="text-xs" aria-hidden="true" />
                Free shipping
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1">
            {product.sellerRating != null && (
              <div className="flex items-center gap-1 bg-yellow-50 px-2 py-0.5 rounded-full">
                <IoMdStar className="text-yellow-500 text-sm" aria-hidden="true" />
                <span className="text-xs font-medium text-yellow-700">{product.sellerRating}</span>
              </div>
            )}
            {product.sellerReviewCount != null && (
              <span className="text-xs text-gray-400">({product.sellerReviewCount})</span>
            )}
          </div>
        </div>
        
        {/* Specs Pills */}
        {product.specs && (
          <div className="flex items-center gap-1.5 text-xs text-[#666666] flex-wrap">
            {product.specs.cpu && (
              <span className="bg-gray-100 px-2 py-1 rounded-full truncate max-w-30" title={product.specs.cpu}>
                {product.specs.cpu}
              </span>
            )}
            {product.specs.ram && (
              <span className="bg-gray-100 px-2 py-1 rounded-full">{product.specs.ram}</span>
            )}
            {product.specs.storage && (
              <span className="bg-gray-100 px-2 py-1 rounded-full truncate max-w-35" title={product.specs.storage}>
                {product.specs.storage}
              </span>
            )}
          </div>
        )}

        {/* Shipping Estimate */}
        {product.shippingEstimate && (
          <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
            <FiTruck className="text-xs" aria-hidden="true" />
            {product.shippingEstimate}
          </p>
        )}
      </div>
    </div>
  );
});

ProductCard.displayName = 'ProductCard';

export default ProductCard;