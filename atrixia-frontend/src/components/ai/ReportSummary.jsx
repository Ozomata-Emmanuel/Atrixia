// components/ai/ReportSummary.jsx
import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FiChevronDown, FiChevronUp, FiAward, FiDollarSign, FiZap, FiStar, 
  FiTrendingUp, FiShield, FiArrowRight, FiImage 
} from 'react-icons/fi';

/**
 * Recommendation card configuration.
 * Each recommendation type has a label, icon, color scheme, and the corresponding
 * product key in the report object.
 */
const RECOMMENDATION_CONFIG = [
  { 
    key: 'bestOverall', 
    label: 'Best Overall', 
    icon: FiAward, 
    color: 'text-amber-500', 
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    hoverBg: 'hover:bg-amber-100/50',
    gradient: 'from-amber-50 to-amber-100/30',
  },
  { 
    key: 'bestBudget', 
    label: 'Best Budget', 
    icon: FiDollarSign, 
    color: 'text-emerald-500', 
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    hoverBg: 'hover:bg-emerald-100/50',
    gradient: 'from-emerald-50 to-emerald-100/30',
  },
  { 
    key: 'bestPerformance', 
    label: 'Best Performance', 
    icon: FiZap, 
    color: 'text-purple-500', 
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    hoverBg: 'hover:bg-purple-100/50',
    gradient: 'from-purple-50 to-purple-100/30',
  },
  { 
    key: 'bestValue', 
    label: 'Best Value', 
    icon: FiStar, 
    color: 'text-blue-500', 
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    hoverBg: 'hover:bg-blue-100/50',
    gradient: 'from-blue-50 to-blue-100/30',
  },
];

/**
 * Confidence level styling configuration.
 */
const CONFIDENCE_STYLES = {
  High: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  Medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  Low: 'bg-orange-100 text-orange-700 border-orange-200',
};

/**
 * RecommendationCard Component
 * Displays a clickable recommendation card with product image, title, and price.
 * Navigates to the product detail page on click.
 * 
 * @param {Object} props
 * @param {Object} props.config - Recommendation configuration
 * @param {Object} props.product - Product data
 */
const RecommendationCard = ({ config, product, onNavigate }) => {
  const { label, icon: Icon, color, bg, border, hoverBg, gradient } = config;
  const [imageError, setImageError] = useState(false);
  
  const handleClick = useCallback(() => {
    if (product?.id) {
      onNavigate?.(product);
    }
  }, [product, onNavigate]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  }, [handleClick]);

  if (!product) return null;

  return (
    <div
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`View ${label}: ${product.title}`}
      className={`group relative ${bg} bg-linear-to-br ${gradient} rounded-xl border ${border} 
        overflow-hidden transition-all duration-300 cursor-pointer
        hover:shadow-lg hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-[#009FB8] focus-visible:ring-offset-2
        ${hoverBg}`}
    >
      {/* Product Image */}
      <div className="relative h-32 overflow-hidden bg-white/50">
        {!imageError ? (
          <img
            src={product.image}
            alt={product.title || label}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
            <FiImage className="text-xl mb-1" />
            <span className="text-[10px]">No image</span>
          </div>
        )}
        
        {/* Label Badge */}
        <div className="absolute top-2 left-2">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${bg} ${color} border ${border} shadow-sm`}>
            <Icon className="text-[10px]" aria-hidden="true" />
            {label}
          </span>
        </div>

        {/* Score Badge */}
        {product.overallScore != null && (
          <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm rounded-full px-1.5 py-0.5 text-[10px] font-bold text-gray-700 shadow-sm">
            {product.overallScore}
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="p-3">
        <h5 className="text-xs font-semibold text-gray-800 line-clamp-2 mb-1.5 min-h-8 group-hover:text-gray-900 transition-colors">
          {product.title || 'Untitled Product'}
        </h5>
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-gray-900">
            {product.currency || '$'}{product.price?.toLocaleString() ?? 'N/A'}
          </p>
          <FiArrowRight className="text-gray-400 text-xs group-hover:text-gray-600 group-hover:translate-x-0.5 transition-all" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
};

/**
 * ReportSummary Component
 * Displays an expandable summary of the AI search report including
 * executive summary, recommendations, pros/cons, trade-offs, and shopping tips.
 * 
 * @param {Object} props
 * @param {Object} props.report - The report data object
 */
const ReportSummary = ({ report }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const navigate = useNavigate();
  
  /**
   * Navigates to the product detail page for a recommendation.
   * 
   * @param {Object} product - The product to navigate to
   */
  const handleNavigateToProduct = useCallback((product) => {
    if (product?.id) {
      navigate(`/product/${product.id}`, { state: { product } });
    }
  }, [navigate]);

  // Toggle expansion with keyboard support
  const toggleExpanded = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleExpanded();
    }
  }, [toggleExpanded]);

  // Guard against missing report data
  if (!report) return null;

  // Filter recommendations to only those with valid products
  const recommendations = RECOMMENDATION_CONFIG
    .filter(config => report[config.key])
    .map(config => ({
      config,
      product: report[config.key],
    }));

  const confidenceStyle = CONFIDENCE_STYLES[report.confidenceLevel] || CONFIDENCE_STYLES.Medium;

  return (
    <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-gray-200/50 shadow-md overflow-hidden">
      {/* Header - Expandable toggle */}
      <button
        onClick={toggleExpanded}
        onKeyDown={handleKeyDown}
        className="w-full p-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors duration-200
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#009FB8]"
        aria-expanded={isExpanded}
        aria-controls="report-summary-content"
      >
        <div className="flex items-center gap-2 flex-wrap">
          <FiTrendingUp className="text-[#009FB8]" aria-hidden="true" />
          <span className="font-semibold text-[#1a1a1a] text-sm">Report Summary</span>
          {report.confidenceScore != null && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${confidenceStyle}`}>
              {report.confidenceScore}% Confidence
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!isExpanded && recommendations.length > 0 && (
            <span className="text-xs text-gray-400 hidden sm:inline">
              {recommendations.length} recommendations
            </span>
          )}
          {isExpanded ? 
            <FiChevronUp className="text-gray-400" aria-hidden="true" /> : 
            <FiChevronDown className="text-gray-400" aria-hidden="true" />
          }
        </div>
      </button>

      {/* Expandable Content */}
      <div 
  id="report-summary-content"
  className="grid transition-all duration-500 ease-in-out"
  style={{
    gridTemplateRows: isExpanded ? '1fr' : '0fr',
  }}
>
        <div className="overflow-hidden">
          <div 
      className={`p-4 pt-0 space-y-4 border-t border-gray-100 transition-all duration-500 ease-in-out ${
        isExpanded ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0'
      }`}
    >
            {/* Executive Summary */}
            {report.executiveSummary && (
              <p className="text-sm text-[#666666] leading-relaxed">
                {report.executiveSummary}
              </p>
            )}

            {/* Quick Recommendations - Card Grid */}
            {recommendations.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {recommendations.map(({ config, product }) => (
                  <RecommendationCard
                    key={config.key}
                    config={config}
                    product={product}
                    onNavigate={handleNavigateToProduct}
                  />
                ))}
              </div>
            )}

            {/* Pros & Cons */}
            {(report.pros?.length > 0 || report.cons?.length > 0) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {report.pros?.length > 0 && (
                  <div>
                    <h5 className="text-xs font-semibold text-emerald-600 mb-2 flex items-center gap-1">
                      <span className="text-emerald-500">✓</span> Pros
                    </h5>
                    <ul className="space-y-1">
                      {report.pros.slice(0, 3).map((pro, i) => (
                        <li key={i} className="text-xs text-gray-600 flex items-start gap-1.5">
                          <span className="text-emerald-500 mt-0.5 shrink-0">•</span>
                          <span>{pro}</span>
                        </li>
                      ))}
                      {report.pros.length > 3 && (
                        <li className="text-xs text-gray-400 italic">
                          +{report.pros.length - 3} more
                        </li>
                      )}
                    </ul>
                  </div>
                )}
                {report.cons?.length > 0 && (
                  <div>
                    <h5 className="text-xs font-semibold text-red-500 mb-2 flex items-center gap-1">
                      <span className="text-red-400">✗</span> Cons
                    </h5>
                    <ul className="space-y-1">
                      {report.cons.slice(0, 3).map((con, i) => (
                        <li key={i} className="text-xs text-gray-600 flex items-start gap-1.5">
                          <span className="text-red-400 mt-0.5 shrink-0">•</span>
                          <span>{con}</span>
                        </li>
                      ))}
                      {report.cons.length > 3 && (
                        <li className="text-xs text-gray-400 italic">
                          +{report.cons.length - 3} more
                        </li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Tradeoffs */}
            {report.tradeoffs && (
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                <h5 className="text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1">
                  <FiTrendingUp className="text-gray-400" aria-hidden="true" />
                  Trade-offs
                </h5>
                <p className="text-xs text-gray-600 leading-relaxed">{report.tradeoffs}</p>
              </div>
            )}

            {/* Shopping Tips */}
            {report.shoppingTips?.length > 0 && (
              <div>
                <h5 className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
                  <FiShield className="text-gray-400" aria-hidden="true" />
                  Shopping Tips
                </h5>
                <ul className="space-y-1">
                  {report.shoppingTips.slice(0, 4).map((tip, i) => (
                    <li key={i} className="text-xs text-gray-500 flex items-start gap-1.5">
                      <span className="text-[#009FB8] mt-0.5 shrink-0" aria-hidden="true">💡</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                  {report.shoppingTips.length > 4 && (
                    <li className="text-xs text-gray-400 italic">
                      +{report.shoppingTips.length - 4} more tips
                    </li>
                  )}
                </ul>
              </div>
            )}

            {/* Next Steps */}
            {report.nextSteps?.length > 0 && (
              <div>
                <h5 className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
                  <FiArrowRight className="text-gray-400" aria-hidden="true" />
                  Next Steps
                </h5>
                <ul className="space-y-1">
                  {report.nextSteps.map((step, i) => (
                    <li key={i} className="text-xs text-gray-600 flex items-start gap-1.5">
                      <span className="text-[#009FB8] font-bold mt-0.5 shrink-0">{i + 1}.</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default ReportSummary;