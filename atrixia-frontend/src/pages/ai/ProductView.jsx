// pages/ai/ProductView.jsx
import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  memo,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Select from "react-select";
import {
  FiArrowLeft,
  FiHeart,
  FiShare2,
  FiExternalLink,
  FiCheck,
  FiStar,
  FiShoppingBag,
  FiAward,
  FiTrendingUp,
  FiShield,
  FiTruck,
  FiRotateCcw,
  FiChevronLeft,
  FiChevronRight,
  FiZoomIn,
  FiThumbsUp,
  FiThumbsDown,
  FiAlertCircle,
  FiImage,
  FiInfo,
  FiDollarSign,
  FiRefreshCw,
} from "react-icons/fi";
import AnimatedGridBackground from "../../components/AnimatedGridBackground";

// ============================================================================
// Constants & Configuration
// ============================================================================

const marketplaceStyles = {
  Jumia: {
    bg: "bg-orange-100",
    text: "text-orange-700",
    border: "border-orange-200",
    icon: "🛒",
    badgeBg: "bg-orange-500/80",
    badgeBorder: "border-orange-400/50",
  },
  Konga: {
    bg: "bg-pink-100",
    text: "text-pink-700",
    border: "border-pink-200",
    icon: "🏪",
    badgeBg: "bg-pink-500/80",
    badgeBorder: "border-pink-400/50",
  },
  eBay: {
    bg: "bg-blue-100",
    text: "text-blue-700",
    border: "border-blue-200",
    icon: "🌐",
    badgeBg: "bg-blue-500/80",
    badgeBorder: "border-blue-400/50",
  },
  Jiji: {
    bg: "bg-green-100",
    text: "text-green-700",
    border: "border-green-200",
    icon: "🤝",
    badgeBg: "bg-green-500/80",
    badgeBorder: "border-green-400/50",
  },
};

const DEFAULT_MARKETPLACE_STYLE = {
  bg: "bg-gray-100",
  text: "text-gray-700",
  border: "border-gray-200",
  icon: "🏷️",
  badgeBg: "bg-gray-500/80",
  badgeBorder: "border-gray-400/50",
};

const WISHLIST_STORAGE_KEY = "attrixia_wishlist";
const LOADING_DELAY = 600;

// Currency options for react-select
const CURRENCY_OPTIONS = [
  { value: "USD", label: "🇺🇸 USD - US Dollar", symbol: "$" },
  { value: "EUR", label: "🇪🇺 EUR - Euro", symbol: "€" },
  { value: "GBP", label: "🇬🇧 GBP - British Pound", symbol: "£" },
  { value: "NGN", label: "🇳🇬 NGN - Nigerian Naira", symbol: "₦" },
  { value: "JPY", label: "🇯🇵 JPY - Japanese Yen", symbol: "¥" },
  { value: "CAD", label: "🇨🇦 CAD - Canadian Dollar", symbol: "C$" },
  { value: "AUD", label: "🇦🇺 AUD - Australian Dollar", symbol: "A$" },
  { value: "CNY", label: "🇨🇳 CNY - Chinese Yuan", symbol: "¥" },
  { value: "INR", label: "🇮🇳 INR - Indian Rupee", symbol: "₹" },
  { value: "ZAR", label: "🇿🇦 ZAR - South African Rand", symbol: "R" },
  { value: "GHS", label: "🇬🇭 GHS - Ghanaian Cedi", symbol: "₵" },
  { value: "KES", label: "🇰🇪 KES - Kenyan Shilling", symbol: "KSh" },
];

// Custom styles for react-select
const selectCustomStyles = {
  control: (provided, state) => ({
    ...provided,
    backgroundColor: "white",
    borderColor: state.isFocused ? "#009FB8" : "#e5e7eb",
    borderRadius: "0.75rem",
    boxShadow: state.isFocused ? "0 0 0 2px rgba(0, 159, 184, 0.2)" : "none",
    minHeight: "42px",
    fontSize: "0.875rem",
    "&:hover": {
      borderColor: "#009FB8",
    },
  }),
  option: (provided, state) => ({
    ...provided,
    backgroundColor: state.isSelected
      ? "#009FB8"
      : state.isFocused
        ? "rgba(0, 159, 184, 0.1)"
        : "white",
    color: state.isSelected ? "white" : "#1a1a1a",
    fontSize: "0.875rem",
    padding: "10px 12px",
    cursor: "pointer",
  }),
  menu: (provided) => ({
    ...provided,
    borderRadius: "0.75rem",
    boxShadow: "0 10px 25px rgba(0, 0, 0, 0.15)",
    border: "1px solid #e5e7eb",
    overflow: "hidden",
    zIndex: 50,
  }),
  singleValue: (provided) => ({
    ...provided,
    color: "#1a1a1a",
    fontWeight: 500,
  }),
  placeholder: (provided) => ({
    ...provided,
    color: "#9ca3af",
  }),
  indicatorSeparator: () => ({
    display: "none",
  }),
};

// ============================================================================
// Utility Functions
// ============================================================================

const getScoreColor = (score) => {
  if (score >= 85) return "text-emerald-500 bg-emerald-50 border-emerald-200";
  if (score >= 70) return "text-yellow-500 bg-yellow-50 border-yellow-200";
  return "text-orange-500 bg-orange-50 border-orange-200";
};

const buildSpecs = (specs) => {
  if (!specs) return [];
  const excludeKeys = ["connectivity", "keyboard", "weight"];
  return Object.entries(specs)
    .filter(([key, value]) => value && !excludeKeys.includes(key))
    .map(([key, value]) => ({
      label:
        key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, " $1"),
      value: value,
    }));
};

// ============================================================================
// Currency Converter Hook - Production Ready with Multiple Fallbacks
// ============================================================================

/**
 * Reliable currency converter with multiple API fallbacks.
 *
 * API Priority:
 * 1. open.er-api.com (CORS-friendly, free, no API key)
 * 2. Frankfurter via allorigins proxy
 * 3. CDN-based currency API
 * 4. Hardcoded fallback rates (guaranteed to work)
 *
 * Caches rates for 10 minutes to reduce API calls.
 */

// Hardcoded fallback rates (relative to USD) - Updated July 2024
const HARDCODED_RATES = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  NGN: 1600,
  JPY: 150,
  CAD: 1.36,
  AUD: 1.53,
  CNY: 7.24,
  INR: 83.5,
  ZAR: 18.2,
  GHS: 15.5,
  KES: 129,
};

// Cache for storing fetched rates to avoid repeated API calls
const ratesCache = new Map();

const useCurrencyConverter = (originalPrice, originalCurrency) => {
  const [selectedCurrency, setSelectedCurrency] = useState(() => {
    const saved = localStorage.getItem("attrixia_preferred_currency");
    if (saved) {
      const found = CURRENCY_OPTIONS.find((c) => c.value === saved);
      return (
        found ||
        CURRENCY_OPTIONS.find((c) => c.value === originalCurrency) ||
        CURRENCY_OPTIONS[0]
      );
    }
    return (
      CURRENCY_OPTIONS.find((c) => c.value === originalCurrency) ||
      CURRENCY_OPTIONS[0]
    );
  });

  const [rates, setRates] = useState(null);
  const [isLoadingRates, setIsLoadingRates] = useState(false);
  const [rateError, setRateError] = useState(null);
  const [convertedPrice, setConvertedPrice] = useState(null);
  const [usingFallback, setUsingFallback] = useState(false);
  const [rateSource, setRateSource] = useState(null); // Tracks which API provided the rates

  /**
   * Fetches rates from multiple APIs in order of priority.
   * Returns the first successful result.
   */
  const fetchRatesFromAPIs = useCallback(async (currency) => {
    // Check cache first (valid for 10 minutes)
    const cacheKey = `rates_${currency}`;
    const cached = ratesCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 600000) {
      return { rates: cached.rates, source: cached.source };
    }

    // API 1: open.er-api.com (Best - CORS friendly, reliable, free)
    try {
      const response = await fetch(
        `https://open.er-api.com/v6/latest/${currency}`,
        {
          signal: AbortSignal.timeout(5000), // 5 second timeout
        },
      );
      if (response.ok) {
        const data = await response.json();
        if (data.result === "success" && data.rates) {
          const result = { rates: data.rates, source: "open.er-api.com" };
          ratesCache.set(cacheKey, { ...result, timestamp: Date.now() });
          return result;
        }
      }
    } catch (e) {
      console.warn("[Currency] API 1 failed:", e.message);
    }

    // API 2: Frankfurter via allorigins proxy
    try {
      const proxyUrl = "https://api.allorigins.win/raw?url=";
      const apiUrl = `https://api.frankfurter.app/latest?from=${currency}`;
      const response = await fetch(`${proxyUrl}${encodeURIComponent(apiUrl)}`, {
        signal: AbortSignal.timeout(8000),
      });
      if (response.ok) {
        const data = await response.json();
        if (data.rates) {
          const result = { rates: data.rates, source: "Frankfurter API" };
          ratesCache.set(cacheKey, { ...result, timestamp: Date.now() });
          return result;
        }
      }
    } catch (e) {
      console.warn("[Currency] API 2 failed:", e.message);
    }

    // API 3: CDN-based currency API
    try {
      const response = await fetch(
        `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/${currency.toLowerCase()}.json`,
        { signal: AbortSignal.timeout(5000) },
      );
      if (response.ok) {
        const data = await response.json();
        const currencyData = data[currency.toLowerCase()];
        if (currencyData) {
          // Convert lowercase keys to uppercase
          const rates = {};
          for (const [key, value] of Object.entries(currencyData)) {
            rates[key.toUpperCase()] = value;
          }
          const result = { rates, source: "CDN Currency API" };
          ratesCache.set(cacheKey, { ...result, timestamp: Date.now() });
          return result;
        }
      }
    } catch (e) {
      console.warn("[Currency] API 3 failed:", e.message);
    }

    // API 4: Hardcoded fallback (always works)
    console.warn("[Currency] All APIs failed, using hardcoded rates");
    const result = { rates: HARDCODED_RATES, source: "fallback" };
    return result;
  }, []);

  // Fetch exchange rates when original currency changes
  useEffect(() => {
    if (!originalPrice || !originalCurrency) return;

    let isMounted = true;

    const loadRates = async () => {
      setIsLoadingRates(true);
      setRateError(null);

      try {
        const { rates: fetchedRates, source } =
          await fetchRatesFromAPIs(originalCurrency);

        if (isMounted) {
          setRates(fetchedRates);
          setRateSource(source);
          setUsingFallback(source === "fallback");

          if (source === "fallback") {
            setRateError(
              "Using estimated rates. Live rates currently unavailable.",
            );
          } else {
            setRateError(null);
          }
        }
      } catch (error) {
        if (isMounted) {
          console.error("[Currency] Critical error:", error);
          // Last resort: use hardcoded rates directly
          setRates(HARDCODED_RATES);
          setRateSource("emergency-fallback");
          setUsingFallback(true);
          setRateError("Using estimated rates.");
        }
      } finally {
        if (isMounted) {
          setIsLoadingRates(false);
        }
      }
    };

    loadRates();

    return () => {
      isMounted = false;
    };
  }, [originalPrice, originalCurrency, fetchRatesFromAPIs]);

  // Convert price when currency or rates change
  useEffect(() => {
    if (originalPrice == null || !rates) {
      setConvertedPrice(originalPrice);
      return;
    }

    if (selectedCurrency.value === originalCurrency) {
      setConvertedPrice(originalPrice);
      return;
    }

    // Handle the case where both original and target are in the rates object
    const originalRate = rates[originalCurrency] || 1;
    const targetRate = rates[selectedCurrency.value];

    if (targetRate && typeof targetRate === "number" && targetRate > 0) {
      // Convert through USD if needed (most APIs provide rates relative to the base currency)
      const priceInBase = originalPrice / originalRate;
      const converted = priceInBase * targetRate;
      setConvertedPrice(Math.round(converted * 100) / 100); // Round to 2 decimal places
    } else {
      // Rate not available
      setConvertedPrice(originalPrice);
      if (selectedCurrency.value !== originalCurrency) {
        setRateError(
          `Conversion rate unavailable for ${selectedCurrency.value}`,
        );
      }
    }
  }, [selectedCurrency, rates, originalPrice, originalCurrency]);

  const handleCurrencyChange = (option) => {
    if (option) {
      setSelectedCurrency(option);
      localStorage.setItem("attrixia_preferred_currency", option.value);
      setRateError(null);
    }
  };

  const resetToOriginal = () => {
    const originalOption =
      CURRENCY_OPTIONS.find((c) => c.value === originalCurrency) ||
      CURRENCY_OPTIONS[0];
    setSelectedCurrency(originalOption);
    setConvertedPrice(originalPrice);
    setRateError(null);
  };

  // Calculate exchange rate for display
  const getExchangeRate = useCallback(() => {
    if (!rates || selectedCurrency.value === originalCurrency) return null;
    const originalRate = rates[originalCurrency] || 1;
    const targetRate = rates[selectedCurrency.value];
    if (targetRate) {
      return targetRate / originalRate;
    }
    return null;
  }, [rates, selectedCurrency.value, originalCurrency]);

  return {
    selectedCurrency,
    convertedPrice,
    isLoadingRates,
    rateError,
    handleCurrencyChange,
    resetToOriginal,
    isConverted: selectedCurrency.value !== originalCurrency,
    usingFallback,
    rateSource,
    exchangeRate: getExchangeRate(),
  };
};

// ============================================================================
// ProductView Component
// ============================================================================

const ProductView = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const product = location.state?.product;
  const imageContainerRef = useRef(null);

  // State
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [isAdded, setIsAdded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [showShareTooltip, setShowShareTooltip] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomPosition, setZoomPosition] = useState({ x: 50, y: 50 });
  const [imageErrors, setImageErrors] = useState({});
  const [imagesLoaded, setImagesLoaded] = useState({});

  // Currency conversion
  const {
    selectedCurrency,
    convertedPrice,
    isLoadingRates,
    rateError,
    handleCurrencyChange,
    resetToOriginal,
    isConverted,
    usingFallback,
    rateSource,
    originalCurrency,
    originalPrice,
    exchangeRate, // ← ADD THIS LINE
  } = useCurrencyConverter(
    typeof product?.price === "number"
      ? product.price
      : parseFloat(product?.price),
    product?.currency || "USD",
  );

  // Refs for cleanup
  const shareTimeoutRef = useRef(null);
  const addedTimeoutRef = useRef(null);
  const zoomFrameRef = useRef(null);

  // Simulate loading
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), LOADING_DELAY);
    return () => clearTimeout(timer);
  }, []);

  // Redirect if no product data
  useEffect(() => {
    if (!product) {
      navigate("/ai", { replace: true });
      return;
    }

    try {
      const wishlist = JSON.parse(
        localStorage.getItem(WISHLIST_STORAGE_KEY) || "[]",
      );
      setIsWishlisted(wishlist.some((p) => p.id === product.id));
    } catch (error) {
      console.warn("[ProductView] Failed to read wishlist:", error);
    }

    return () => {
      if (shareTimeoutRef.current) clearTimeout(shareTimeoutRef.current);
      if (addedTimeoutRef.current) clearTimeout(addedTimeoutRef.current);
      if (zoomFrameRef.current) cancelAnimationFrame(zoomFrameRef.current);
    };
  }, [product, navigate]);

  const toggleWishlist = useCallback(() => {
    if (!product?.id) return;

    try {
      const wishlist = JSON.parse(
        localStorage.getItem(WISHLIST_STORAGE_KEY) || "[]",
      );

      if (isWishlisted) {
        const updated = wishlist.filter((p) => p.id !== product.id);
        localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(updated));
        setIsWishlisted(false);
      } else {
        wishlist.push(product);
        localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(wishlist));
        setIsWishlisted(true);
        setIsAdded(true);

        if (addedTimeoutRef.current) clearTimeout(addedTimeoutRef.current);
        addedTimeoutRef.current = setTimeout(() => setIsAdded(false), 2000);
      }
    } catch (error) {
      console.error("[ProductView] Failed to update wishlist:", error);
    }
  }, [product, isWishlisted]);

  const handleShare = useCallback(async () => {
    if (!product) return;

    const shareData = {
      title: product.title || "Product",
      text: `Check out ${product.title} at ${selectedCurrency.symbol}${convertedPrice?.toFixed(2)}`,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        if (err.name !== "AbortError") {
          console.warn("[ProductView] Share failed:", err);
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(
          product.productUrl || window.location.href,
        );
        setShowShareTooltip(true);
        if (shareTimeoutRef.current) clearTimeout(shareTimeoutRef.current);
        shareTimeoutRef.current = setTimeout(
          () => setShowShareTooltip(false),
          2000,
        );
      } catch (err) {
        console.warn("[ProductView] Clipboard copy failed:", err);
      }
    }
  }, [product, selectedCurrency, convertedPrice]);

  const handleMouseMove = useCallback(
    (e) => {
      if (!isZoomed) return;

      if (zoomFrameRef.current) cancelAnimationFrame(zoomFrameRef.current);

      zoomFrameRef.current = requestAnimationFrame(() => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        setZoomPosition({
          x: Math.round(x * 100) / 100,
          y: Math.round(y * 100) / 100,
        });
      });
    },
    [isZoomed],
  );

  const productImages = useMemo(() => {
    if (!product?.image) return [];
    return [product.image];
  }, [product?.image]);

  const nextImage = useCallback(() => {
    setActiveImage((prev) => (prev + 1) % productImages.length);
  }, [productImages.length]);

  const prevImage = useCallback(() => {
    setActiveImage(
      (prev) => (prev - 1 + productImages.length) % productImages.length,
    );
  }, [productImages.length]);

  const specs = useMemo(() => buildSpecs(product?.specs), [product?.specs]);
  const marketplaceStyle =
    marketplaceStyles[product?.marketplace] || DEFAULT_MARKETPLACE_STYLE;

  if (!product) return null;

  // Format the converted price
  const formattedPrice =
    convertedPrice != null
      ? convertedPrice.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      : "N/A";

  return (
    <div className="relative min-h-screen bg-[#FAFAFA]">
      <AnimatedGridBackground />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Top Navigation */}
        <nav
          className="mb-8 flex items-center justify-between"
          aria-label="Page navigation"
        >
          <button
            onClick={() => navigate(-1)}
            className="group inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#009FB8] focus-visible:ring-offset-2 rounded-2xl"
            aria-label="Go back to search results"
          >
            <span className="w-10 h-10 bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 shadow-lg shadow-gray-200/50 flex items-center justify-center group-hover:border-gray-300 group-hover:shadow-xl transition-all duration-300">
              <FiArrowLeft className="text-base" aria-hidden="true" />
            </span>
            <span className="hidden sm:inline font-medium">Go Back</span>
          </button>

          <div className="flex items-center gap-3">
            <div className="relative">
              <button
                onClick={handleShare}
                className="w-10 h-10 bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 shadow-lg shadow-gray-200/50 flex items-center justify-center text-gray-500 hover:text-gray-900 hover:border-gray-300 hover:shadow-xl transition-all duration-300
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#009FB8] focus-visible:ring-offset-2"
                aria-label="Share product"
              >
                <FiShare2 className="text-base" aria-hidden="true" />
              </button>
              {showShareTooltip && (
                <div
                  className="absolute top-full mt-2 right-0 bg-gray-900 text-white text-xs px-3 py-1.5 rounded-lg whitespace-nowrap shadow-xl z-50"
                  role="status"
                  aria-live="polite"
                >
                  Link copied! ✨
                </div>
              )}
            </div>

            <button
              onClick={toggleWishlist}
              className={`w-10 h-10 rounded-2xl border shadow-lg flex items-center justify-center transition-all duration-300
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
                ${
                  isWishlisted
                    ? "bg-red-50 border-red-200 text-red-500 shadow-red-200/50 focus-visible:ring-red-400"
                    : "bg-white/80 backdrop-blur-sm border-gray-200/60 text-gray-500 hover:text-red-500 hover:border-red-200 shadow-gray-200/50 focus-visible:ring-[#009FB8]"
                }`}
              aria-label={
                isWishlisted ? "Remove from wishlist" : "Add to wishlist"
              }
              aria-pressed={isWishlisted}
            >
              <FiHeart
                className={`text-base transition-transform duration-300 ${isWishlisted ? "fill-red-500 scale-110" : "hover:scale-110"}`}
                aria-hidden="true"
              />
            </button>
          </div>
        </nav>

        {/* Content */}
        {isLoading ? (
          <ProductViewSkeleton />
        ) : (
          <main className="space-y-8 mb-25">
            {/* Main Product Section */}
            <div className="bg-white/90 backdrop-blur-sm rounded-3xl border border-gray-200/60 shadow-xl shadow-gray-200/30">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
                {/* Image Section - Original Structure */}
                <section
                  className="bg-linear-to-br from-gray-200/50 via-blue-100/50 to-gray-100/50 rounded-l-3xl"
                  aria-label="Product images"
                >
                  <div className="sticky top-6 p-6 lg:p-8">
                    {/* Main Image */}
                    <div
                      ref={imageContainerRef}
                      className="relative rounded-3xl overflow-hidden bg-white shadow-2xl shadow-gray-300/30 group"
                      onMouseEnter={() => setIsZoomed(true)}
                      onMouseLeave={() => setIsZoomed(false)}
                      onMouseMove={handleMouseMove}
                      role="img"
                      aria-label={product.title || "Product image"}
                    >
                      <div className="relative aspect-square">
                        {!imageErrors[activeImage] ? (
                          <img
                            src={productImages[activeImage]}
                            alt={product.title || "Product image"}
                            className={`w-full h-full object-cover transition-all duration-700 ${
                              isZoomed
                                ? "scale-150"
                                : "scale-100 group-hover:scale-105"
                            } ${imagesLoaded[activeImage] ? "opacity-100" : "opacity-0"}`}
                            style={
                              isZoomed
                                ? {
                                    transformOrigin: `${zoomPosition.x}% ${zoomPosition.y}%`,
                                  }
                                : {}
                            }
                            onLoad={() =>
                              setImagesLoaded((prev) => ({
                                ...prev,
                                [activeImage]: true,
                              }))
                            }
                            onError={() =>
                              setImageErrors((prev) => ({
                                ...prev,
                                [activeImage]: true,
                              }))
                            }
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100 text-gray-400">
                            <FiImage className="text-4xl mb-2" />
                            <span className="text-sm">Image not available</span>
                          </div>
                        )}

                        {/* Gradient overlay */}
                        <div className="absolute inset-0 bg-linear-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                        {/* Navigation arrows */}
                        {productImages.length > 1 && (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                prevImage();
                              }}
                              className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-white hover:scale-110 hover:shadow-xl
                                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#009FB8]"
                              aria-label="Previous image"
                            >
                              <FiChevronLeft
                                className="text-gray-700"
                                aria-hidden="true"
                              />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                nextImage();
                              }}
                              className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-white hover:scale-110 hover:shadow-xl
                                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#009FB8]"
                              aria-label="Next image"
                            >
                              <FiChevronRight
                                className="text-gray-700"
                                aria-hidden="true"
                              />
                            </button>
                          </>
                        )}

                        {/* Zoom indicator */}
                        <div className="absolute top-4 right-4 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                          <FiZoomIn
                            className="text-gray-600 text-sm"
                            aria-hidden="true"
                          />
                        </div>

                        {/* Marketplace Badge */}
                        <div className="absolute bottom-4 left-4 flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-white text-xs font-bold backdrop-blur-xl border shadow-lg ${marketplaceStyle.badgeBg} ${marketplaceStyle.badgeBorder}`}
                          >
                            {marketplaceStyle.icon}{" "}
                            {product.marketplace || "Store"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Thumbnail Gallery */}
                    {productImages.length > 1 && (
                      <div
                        className="mt-4 grid grid-cols-4 gap-3"
                        role="list"
                        aria-label="Product image thumbnails"
                      >
                        {productImages.map((img, index) => (
                          <button
                            key={index}
                            onClick={() => setActiveImage(index)}
                            className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all duration-300
                              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#009FB8] focus-visible:ring-offset-1
                              ${
                                activeImage === index
                                  ? "border-gray-900 shadow-lg scale-105"
                                  : "border-transparent hover:border-gray-300 hover:scale-102 opacity-70 hover:opacity-100"
                              }`}
                            aria-label={`View image ${index + 1}`}
                            aria-current={
                              activeImage === index ? "true" : undefined
                            }
                            role="listitem"
                          >
                            {!imageErrors[index] ? (
                              <img
                                src={img}
                                alt={`${product.title || "Product"} view ${index + 1}`}
                                className="w-full h-full object-cover"
                                loading="lazy"
                                onError={() =>
                                  setImageErrors((prev) => ({
                                    ...prev,
                                    [index]: true,
                                  }))
                                }
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400">
                                <FiImage className="text-lg" />
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </section>

                {/* Product Details */}
                <section
                  className="p-8 lg:p-12 flex flex-col bg-white min-h-0 rounded-r-3xl"
                  aria-label="Product details"
                >
                  {/* Category & Title */}
                  <div className="mb-8">
                    <div className="flex items-center gap-2 mb-4 flex-wrap">
                      {product.marketplace && (
                        <span
                          className={`px-3 py-1.5 text-xs font-semibold rounded-xl border ${marketplaceStyle.bg} ${marketplaceStyle.text} ${marketplaceStyle.border}`}
                        >
                          {product.marketplace}
                        </span>
                      )}
                      {product.category && (
                        <span className="px-3 py-1.5 bg-linear-to-r from-gray-100 to-gray-50 text-gray-700 text-xs font-semibold rounded-xl border border-gray-200/60 capitalize">
                          {product.category}
                        </span>
                      )}
                      {product.condition && (
                        <span className="px-3 py-1.5 bg-linear-to-r from-emerald-50 to-emerald-100/50 text-emerald-700 text-xs font-semibold rounded-xl border border-emerald-200/60 capitalize">
                          {product.condition}
                        </span>
                      )}
                      {product.rank != null && (
                        <span className="px-3 py-1.5 bg-linear-to-r from-purple-50 to-purple-100/50 text-purple-700 text-xs font-semibold rounded-xl border border-purple-200/60">
                          #{product.rank} Ranked
                        </span>
                      )}
                    </div>

                    <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 leading-tight mb-4">
                      {product.title || "Untitled Product"}
                    </h1>

                    <div className="flex items-center gap-4 flex-wrap">
                      {product.sellerRating != null && (
                        <div className="flex items-center gap-1.5">
                          <div
                            className="flex items-center gap-0.5"
                            aria-label={`${product.sellerRating} out of 5 stars`}
                          >
                            {[...Array(5)].map((_, i) => (
                              <FiStar
                                key={i}
                                className={`text-sm ${i < Math.floor(product.sellerRating) ? "fill-amber-400 text-amber-400" : "text-gray-300"}`}
                                aria-hidden="true"
                              />
                            ))}
                          </div>
                          <span className="text-sm font-bold text-gray-900">
                            {product.sellerRating}
                          </span>
                        </div>
                      )}
                      {product.reviewCount != null && (
                        <>
                          <span className="text-gray-300" aria-hidden="true">
                            ·
                          </span>
                          <span className="text-sm text-gray-600 font-medium">
                            {product.reviewCount} reviews
                          </span>
                        </>
                      )}
                      {product.overallScore != null && (
                        <>
                          <span className="text-gray-300" aria-hidden="true">
                            ·
                          </span>
                          <div
                            className={`flex items-center gap-1 px-2 py-0.5 rounded-full border ${getScoreColor(product.overallScore)}`}
                          >
                            <FiTrendingUp
                              className="text-xs"
                              aria-hidden="true"
                            />
                            <span className="text-xs font-bold">
                              {product.overallScore} Score
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Price Section with Currency Converter */}
                  <div className="bg-linear-to-br from-gray-50 to-white rounded-2xl p-6 mb-8 border border-gray-200/60">
                    <div className=" items-baseline gap-3 mb-4">
                      <span className="text-4xl lg:text-5xl font-bold bg-linear-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                        {selectedCurrency.symbol}
                        {formattedPrice}
                      </span>
                      {isConverted && (
                        <button
                          onClick={resetToOriginal}
                          className="text-xs text-[#009FB8] hover:underline flex items-center gap-1 transition-colors"
                          title="Reset to original currency"
                        >
                          <FiRefreshCw className="text-xs" />
                          Reset
                        </button>
                      )}
                    </div>

                    {/* Currency Selector */}
                    <div className="mb-3">
                      <label className="block text-xs font-medium text-gray-500 mb-1.5">
                        Convert Currency
                      </label>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 max-w-xs">
                          <Select
                            value={selectedCurrency}
                            onChange={handleCurrencyChange}
                            options={CURRENCY_OPTIONS}
                            styles={selectCustomStyles}
                            isLoading={isLoadingRates}
                            isSearchable={true}
                            placeholder="Select currency..."
                            aria-label="Select currency"
                            classNamePrefix="currency-select"
                            formatOptionLabel={(option) => (
                              <div className="flex items-center justify-between">
                                <span>{option.label}</span>
                                {option.value === originalCurrency && (
                                  <span className="text-[10px] text-gray-400 ml-2">
                                    (Original)
                                  </span>
                                )}
                              </div>
                            )}
                          />
                        </div>
                        {isLoadingRates && (
                          <FiRefreshCw className="animate-spin text-[#009FB8] text-sm" />
                        )}
                      </div>

                      {/* Exchange rate info */}
                      {isConverted && exchangeRate != null && (
                        <div className="text-xs text-gray-400 bg-gray-50/80 rounded-lg p-2.5 mt-2 border border-gray-100">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span>
                              <span className="font-medium text-gray-500">
                                Original:
                              </span>{" "}
                              {CURRENCY_OPTIONS.find(
                                (c) => c.value === originalCurrency,
                              )?.symbol || "$"}
                              {originalPrice?.toLocaleString()}
                            </span>
                            <span className="text-gray-300">•</span>
                            <span>
                              <span className="font-medium text-gray-500">
                                Rate:
                              </span>{" "}
                              1 {originalCurrency} = {exchangeRate.toFixed(4)}{" "}
                              {selectedCurrency.value}
                            </span>
                          </div>
                          {rateSource && (
                            <div className="mt-1 flex items-center gap-1">
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  usingFallback
                                    ? "bg-amber-400"
                                    : "bg-emerald-400"
                                }`}
                              />
                              <span
                                className={`text-[10px] ${
                                  usingFallback
                                    ? "text-amber-500"
                                    : "text-gray-400"
                                }`}
                              >
                                {usingFallback
                                  ? "Estimated rates"
                                  : `Live rates via ${rateSource}`}
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Error message */}
                      {rateError && !usingFallback && (
                        <div className="flex items-center gap-1.5 mt-2 text-xs text-amber-600 bg-amber-50 rounded-lg p-2 border border-amber-200">
                          <FiAlertCircle className="text-xs shrink-0" />
                          <span>{rateError}</span>
                        </div>
                      )}
                    </div>

                    {/* Shipping info */}
                    {product.shippingFree ? (
                      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200/60 mt-3">
                        <FiTruck className="text-xs" aria-hidden="true" />
                        Free Shipping
                        {product.shippingEstimate &&
                          ` · ${product.shippingEstimate}`}
                      </span>
                    ) : product.shippingCost > 0 ? (
                      <span className="inline-flex items-center gap-1.5 text-sm text-gray-600 mt-3">
                        <FiTruck className="text-xs" aria-hidden="true" />
                        Shipping: {product.currency || "$"}
                        {product.shippingCost} ·{" "}
                        {product.shippingEstimate || "N/A"}
                      </span>
                    ) : null}
                  </div>

                  {/* Rest of the component remains the same... */}
                  {/* Score Breakdown, Pros & Cons, Seller Info, etc. */}
                  {/* ... (keep all the existing sections below) ... */}

                  {/* Score Breakdown */}
                  {product.scoreBreakdown && (
                    <div className="mb-6">
                      <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                        <FiTrendingUp
                          className="text-gray-400"
                          aria-hidden="true"
                        />
                        Score Breakdown
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {product.scoreBreakdown.priceScore != null && (
                          <ScoreBreakdownItem
                            icon={FiDollarSign}
                            iconColor="text-emerald-500"
                            label="Price"
                            score={product.scoreBreakdown.priceScore}
                          />
                        )}
                        {product.scoreBreakdown.qualityScore != null && (
                          <ScoreBreakdownItem
                            icon={FiAward}
                            iconColor="text-blue-500"
                            label="Quality"
                            score={product.scoreBreakdown.qualityScore}
                          />
                        )}
                        {product.scoreBreakdown.sellerScore != null && (
                          <ScoreBreakdownItem
                            icon={FiShield}
                            iconColor="text-purple-500"
                            label="Seller"
                            score={product.scoreBreakdown.sellerScore}
                          />
                        )}
                        {product.scoreBreakdown.shippingScore != null && (
                          <ScoreBreakdownItem
                            icon={FiTruck}
                            iconColor="text-orange-500"
                            label="Shipping"
                            score={product.scoreBreakdown.shippingScore}
                          />
                        )}
                      </div>
                    </div>
                  )}

                  {/* Pros & Cons */}
                  {(product.pros?.length > 0 || product.cons?.length > 0) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                      {product.pros?.length > 0 && (
                        <div>
                          <h4 className="text-xs font-bold text-emerald-600 mb-2 flex items-center gap-1.5">
                            <FiThumbsUp
                              className="text-xs"
                              aria-hidden="true"
                            />{" "}
                            Pros
                          </h4>
                          <ul className="space-y-1.5">
                            {product.pros.map((pro, i) => (
                              <li
                                key={i}
                                className="text-xs text-gray-600 flex items-start gap-1.5"
                              >
                                <span
                                  className="text-emerald-500 mt-0.5 shrink-0"
                                  aria-hidden="true"
                                >
                                  ✓
                                </span>
                                <span>{pro}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {product.cons?.length > 0 && (
                        <div>
                          <h4 className="text-xs font-bold text-red-500 mb-2 flex items-center gap-1.5">
                            <FiThumbsDown
                              className="text-xs"
                              aria-hidden="true"
                            />{" "}
                            Cons
                          </h4>
                          <ul className="space-y-1.5">
                            {product.cons.map((con, i) => (
                              <li
                                key={i}
                                className="text-xs text-gray-600 flex items-start gap-1.5"
                              >
                                <span
                                  className="text-red-400 mt-0.5 shrink-0"
                                  aria-hidden="true"
                                >
                                  ✗
                                </span>
                                <span>{con}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Added to wishlist toast */}
                  {isAdded && (
                    <div
                      className="mb-6 bg-linear-to-r from-emerald-50 to-green-50 border border-emerald-200 text-emerald-700 px-5 py-4 rounded-2xl flex items-center gap-3 shadow-lg shadow-emerald-100/50 animate-fadeIn"
                      role="status"
                      aria-live="polite"
                    >
                      <div className="w-6 h-6 bg-linear-to-br from-emerald-500 to-green-500 rounded-full flex items-center justify-center shrink-0 shadow-md">
                        <FiCheck
                          className="text-white text-xs"
                          aria-hidden="true"
                        />
                      </div>
                      <span className="text-sm font-semibold">
                        Added to wishlist successfully! 🎉
                      </span>
                    </div>
                  )}

                  {/* Seller Info */}
                  <div className="flex items-center gap-4 p-5 bg-linear-to-r from-white to-gray-50 rounded-2xl border border-gray-200/60 mb-6 shadow-sm">
                    <div className="w-14 h-14 bg-linear-to-br from-gray-900 to-gray-700 rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-gray-300/30">
                      <FiShoppingBag
                        className="text-white text-xl"
                        aria-hidden="true"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900">
                        {product.seller || "Unknown Seller"}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {product.sellerRating != null && (
                          <div className="flex items-center gap-1">
                            <FiStar
                              className="fill-amber-400 text-amber-400 text-xs"
                              aria-hidden="true"
                            />
                            <span className="text-xs font-semibold text-gray-700">
                              {product.sellerRating}/5
                            </span>
                          </div>
                        )}
                        {product.reviewCount != null && (
                          <>
                            <span
                              className="text-gray-300 text-xs"
                              aria-hidden="true"
                            >
                              ·
                            </span>
                            <span className="text-xs text-gray-500 font-medium">
                              {product.reviewCount} reviews
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <span className="px-4 py-2 bg-linear-to-r from-emerald-50 to-green-50 text-emerald-700 text-xs font-bold rounded-xl border border-emerald-200/60 shadow-sm">
                      Verified ✓
                    </span>
                  </div>

                  {/* AI Analysis */}
                  {product.reason && (
                    <div className="mb-6 bg-blue-50/50 rounded-xl p-4 border border-blue-100">
                      <h4 className="text-xs font-bold text-blue-700 mb-1 flex items-center gap-1.5">
                        <FiAlertCircle className="text-xs" aria-hidden="true" />{" "}
                        Why this pick?
                      </h4>
                      <p className="text-xs text-gray-600 leading-relaxed">
                        {product.reason}
                      </p>
                      {product.confidence != null && (
                        <div className="flex items-center gap-1.5 mt-2">
                          <span className="text-xs text-gray-400">
                            AI Confidence:
                          </span>
                          <div className="flex-1 max-w-25 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 rounded-full transition-all duration-500"
                              style={{
                                width: `${Math.min(100, Math.max(0, product.confidence))}%`,
                              }}
                              role="progressbar"
                              aria-valuenow={product.confidence}
                              aria-valuemin={0}
                              aria-valuemax={100}
                            />
                          </div>
                          <span className="text-xs font-bold text-blue-600">
                            {product.confidence}%
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Specs Grid */}
                  {specs.length > 0 && (
                    <div className="mb-8">
                      <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <FiAward className="text-gray-400" aria-hidden="true" />
                        Specifications
                      </h3>
                      <div className="grid grid-cols-2 gap-3">
                        {specs.map((spec, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-3.5 bg-linear-to-r from-gray-50 to-white rounded-xl border border-gray-200/60 hover:border-gray-300 hover:shadow-md transition-all duration-300"
                          >
                            <span className="text-xs text-gray-500 font-medium">
                              {spec.label}
                            </span>
                            <span
                              className="text-xs font-bold text-gray-900 text-right truncate ml-2"
                              title={spec.value}
                            >
                              {spec.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Description */}
                  {product.description && (
                    <div className="mb-8">
                      <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                        <FiInfo className="text-gray-400" aria-hidden="true" />
                        Description
                      </h3>
                      <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 rounded-xl p-4 border border-gray-200/60">
                        {product.description}
                      </p>
                    </div>
                  )}

                  {/* CTA Buttons */}
                  <div className="mt-auto space-y-3">
                    <a
                      href={product.productUrl || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full inline-flex items-center justify-center gap-3 bg-linear-to-r from-gray-900 to-gray-800 text-white px-8 py-4 rounded-2xl font-bold hover:from-gray-800 hover:to-gray-700 transition-all duration-300 hover:shadow-lg hover:shadow-gray-900/30 hover:scale-[1.01] group
                        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-900"
                      aria-label={`Visit product on ${product.marketplace || "store"}`}
                    >
                      <FiShoppingBag
                        className="text-lg group-hover:scale-105 transition-transform"
                        aria-hidden="true"
                      />
                      Visit on {product.marketplace || "Store"}
                      <FiExternalLink
                        className="text-sm ml-1 group-hover:translate-x-0.5 transition-transform"
                        aria-hidden="true"
                      />
                    </a>
                    <button
                      onClick={toggleWishlist}
                      className={`w-full inline-flex items-center justify-center gap-3 px-8 py-4 rounded-2xl font-bold transition-all duration-300 border-2
                        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
                        ${
                          isWishlisted
                            ? "bg-red-50 border-red-300 text-red-600 hover:bg-red-100 hover:scale-[1.02] shadow-lg shadow-red-200/30 focus-visible:ring-red-400"
                            : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 hover:scale-[1.02] shadow-lg shadow-gray-200/30 focus-visible:ring-[#009FB8]"
                        }`}
                      aria-pressed={isWishlisted}
                    >
                      <FiHeart
                        className={`transition-transform duration-300 ${isWishlisted ? "fill-red-500 scale-110" : "group-hover:scale-110"}`}
                        aria-hidden="true"
                      />
                      {isWishlisted
                        ? "Remove from Wishlist"
                        : "Add to Wishlist"}
                    </button>
                  </div>
                </section>
              </div>
            </div>
          </main>
        )}
      </div>

      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slideDown { animation: slideDown 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
        @media (prefers-reduced-motion: reduce) {
          .animate-slideDown, .animate-fadeIn { animation: none; }
        }
      `}</style>
    </div>
  );
};

// ============================================================================
// Sub-components (unchanged)
// ============================================================================

const ScoreBreakdownItem = memo(({ icon: Icon, iconColor, label, score }) => (
  <div className="flex items-center justify-between p-3 bg-linear-to-r from-gray-50 to-white rounded-xl border border-gray-200/60">
    <span className="text-xs text-gray-500 font-medium flex items-center gap-1.5">
      <Icon className={`${iconColor} text-xs`} aria-hidden="true" />
      {label}
    </span>
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-linear-to-r from-[#009FB8] to-[#006b7d] rounded-full transition-all duration-500"
          style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
          role="progressbar"
          aria-valuenow={score}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${label} score: ${score}`}
        />
      </div>
      <span className="text-xs font-bold text-gray-900 tabular-nums">
        {score}/100
      </span>
    </div>
  </div>
));

ScoreBreakdownItem.displayName = "ScoreBreakdownItem";

const ProductViewSkeleton = () => (
  <div
    className="bg-white/90 backdrop-blur-sm rounded-3xl border border-gray-200/60 shadow-xl shadow-gray-200/30 overflow-hidden animate-pulse"
    role="status"
    aria-label="Loading product details"
  >
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
      <div className="aspect-square bg-gray-200" />
      <div className="p-8 lg:p-12 space-y-4">
        <div className="h-4 bg-gray-200 rounded w-1/4" />
        <div className="h-8 bg-gray-200 rounded w-3/4" />
        <div className="h-6 bg-gray-200 rounded w-1/2" />
        <div className="h-20 bg-gray-200 rounded" />
        <div className="grid grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-200 rounded-xl" />
          ))}
        </div>
        <div className="h-48 bg-gray-200 rounded-xl" />
      </div>
    </div>
  </div>
);

ProductViewSkeleton.displayName = "ProductViewSkeleton";

export default ProductView;
