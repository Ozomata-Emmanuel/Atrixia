// pages/ai/ProductView.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiHeart, FiShare2, FiExternalLink, FiCheck, FiStar, FiShoppingBag, FiTag, FiAward, FiTrendingUp, FiShield, FiTruck, FiRotateCcw, FiChevronLeft, FiChevronRight, FiZoomIn, FiPlay } from 'react-icons/fi';
import { mockProducts } from '../../data/mockData';
import { ProductViewSkeleton } from '../../components/LoadingSkeleton';
import AnimatedGridBackground from '../../components/AnimatedGridBackground';

// Generate grid cells once outside the component
const generateGridCells = () => {
  return Array.from({ length: 1200 }, () => ({
    isColored: Math.random() > 0.5,
    hue: Math.random() * 360,
  }));
};

const ProductView = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const product = location.state?.product;
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [isAdded, setIsAdded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [showShareTooltip, setShowShareTooltip] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomPosition, setZoomPosition] = useState({ x: 0, y: 0 });

  // Memoize the grid cells so they don't regenerate on every render
  const gridCells = useMemo(() => generateGridCells(), []);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!product) {
      navigate('/ai');
      return;
    }
    const wishlist = JSON.parse(localStorage.getItem('attrixia_wishlist') || '[]');
    setIsWishlisted(wishlist.some(p => p.id === product.id));
  }, [product, navigate]);

  const toggleWishlist = () => {
    const wishlist = JSON.parse(localStorage.getItem('attrixia_wishlist') || '[]');
    if (isWishlisted) {
      const updated = wishlist.filter(p => p.id !== product.id);
      localStorage.setItem('attrixia_wishlist', JSON.stringify(updated));
      setIsWishlisted(false);
    } else {
      wishlist.push(product);
      localStorage.setItem('attrixia_wishlist', JSON.stringify(wishlist));
      setIsWishlisted(true);
      setIsAdded(true);
      setTimeout(() => setIsAdded(false), 2000);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: product.name,
          text: `Check out ${product.name} at ${product.price}`,
          url: window.location.href,
        });
      } catch (err) {
        console.log('Error sharing:', err);
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      setShowShareTooltip(true);
      setTimeout(() => setShowShareTooltip(false), 2000);
    }
  };

  // Memoize the mouse move handler to prevent unnecessary re-renders
  const handleMouseMove = useCallback((e) => {
    if (!isZoomed) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    // Only update state if values actually changed (with rounding to reduce updates)
    setZoomPosition(prev => {
      const newX = Math.round(x * 100) / 100;
      const newY = Math.round(y * 100) / 100;
      if (prev.x !== newX || prev.y !== newY) {
        return { x: newX, y: newY };
      }
      return prev;
    });
  }, [isZoomed]);

  // Generate multiple image variants for gallery (memoized)
  const productImages = useMemo(() => [
    product.image,
    product.image?.replace('.jpg', '-2.jpg') || product.image,
    product.image?.replace('.jpg', '-3.jpg') || product.image,
    product.image?.replace('.jpg', '-4.jpg') || product.image,
  ], [product.image]);

  const nextImage = () => {
    setActiveImage((prev) => (prev + 1) % productImages.length);
  };

  const prevImage = () => {
    setActiveImage((prev) => (prev - 1 + productImages.length) % productImages.length);
  };

  if (!product) return null;

  // Generate specs dynamically from product data (memoized)
  const specs = [];
  if (product.processor) specs.push({ label: 'Processor', value: product.processor });
  if (product.ram) specs.push({ label: 'RAM', value: product.ram });
  if (product.rom) specs.push({ label: 'Storage', value: product.rom });
  if (product.gpu) specs.push({ label: 'GPU', value: product.gpu });
  if (product.color) specs.push({ label: 'Color', value: product.color });
  if (product.brand) specs.push({ label: 'Brand', value: product.brand });

  // Seller info
  const sellerRating = product.sellerRating || product.rating * 20;
  const reviewCount = product.reviewCount || 128;

  const relatedProducts = useMemo(() => 
    mockProducts
      .filter(p => p.id !== product.id)
      .slice(0, 4),
    [product.id]
  );

  return (
    <div className="relative min-h-screen bg-[#FAFAFA]">
      {/* Animated Grid Background - Now stable! */}
      <AnimatedGridBackground/>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Top Navigation Bar */}
        <div className="mb-8 flex items-center justify-between">
          <button
            onClick={() => navigate('/ai')}
            className="group inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
          >
            <span className="w-10 h-10 bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 shadow-lg shadow-gray-200/50 flex items-center justify-center group-hover:border-gray-300 group-hover:shadow-xl group-hover:shadow-gray-300/50 transition-all duration-300">
              <FiArrowLeft className="text-base" />
            </span>
            <span className="hidden sm:inline font-medium">Back to Results</span>
          </button>
          
          <div className="flex items-center gap-3">
            <div className="relative">
              <button 
                onClick={handleShare}
                className="w-10 h-10 bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 shadow-lg shadow-gray-200/50 flex items-center justify-center text-gray-500 hover:text-gray-900 hover:border-gray-300 hover:shadow-xl transition-all duration-300"
              >
                <FiShare2 className="text-base" />
              </button>
              {showShareTooltip && (
                <div className="absolute top-full mt-2 right-0 bg-gray-900 text-white text-xs px-3 py-1.5 rounded-lg whitespace-nowrap animate-fadeIn shadow-xl">
                  Link copied! ✨
                </div>
              )}
            </div>
            <button
              onClick={toggleWishlist}
              className={`w-10 h-10 rounded-2xl border shadow-lg flex items-center justify-center transition-all duration-300 ${
                isWishlisted 
                  ? 'bg-red-50 border-red-200 text-red-500 shadow-red-200/50' 
                  : 'bg-white/80 backdrop-blur-sm border-gray-200/60 text-gray-500 hover:text-red-500 hover:border-red-200 shadow-gray-200/50'
              }`}
            >
              <FiHeart className={`text-base transition-transform duration-300 ${isWishlisted ? 'fill-red-500 scale-110' : 'hover:scale-110'}`} />
            </button>
          </div>
        </div>

        {isLoading ? (
          <ProductViewSkeleton />
        ) : (
          <div className="space-y-8">
            {/* Main Product Section */}
            <div className="bg-white/90 backdrop-blur-sm rounded-3xl border border-gray-200/60 shadow-xl shadow-gray-200/30 overflow-hidden">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
                {/* Enhanced Image Section */}
                <div className="lg:col-span-1 bg-linear-to-br from-gray-50 via-white to-gray-50">
                  <div className="sticky top-8 p-6 lg:p-8">
                    {/* Main Image with Zoom */}
                    <div 
                      className="relative rounded-3xl overflow-hidden bg-white shadow-2xl shadow-gray-300/30 group"
                      onMouseEnter={() => setIsZoomed(true)}
                      onMouseLeave={() => setIsZoomed(false)}
                      onMouseMove={handleMouseMove}
                    >
                      <div className="relative aspect-square">
                        <img
                          src={productImages[activeImage]}
                          alt={product.name}
                          className={`w-full h-full object-cover transition-all duration-700 ${
                            isZoomed ? 'scale-150' : 'scale-100 group-hover:scale-105'
                          }`}
                          style={
                            isZoomed
                              ? {
                                  transformOrigin: `${zoomPosition.x}% ${zoomPosition.y}%`,
                                }
                              : {}
                          }
                        />
                        
                        {/* Enhanced overlay */}
                        <div className="absolute inset-0 bg-linear-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        
                        {/* Navigation Arrows */}
                        <button
                          onClick={(e) => { e.stopPropagation(); prevImage(); }}
                          className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-white hover:scale-110 hover:shadow-xl"
                        >
                          <FiChevronLeft className="text-gray-700" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); nextImage(); }}
                          className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-white hover:scale-110 hover:shadow-xl"
                        >
                          <FiChevronRight className="text-gray-700" />
                        </button>

                        {/* Zoom indicator */}
                        <div className="absolute top-4 right-4 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                          <FiZoomIn className="text-gray-600 text-sm" />
                        </div>

                        {/* Badge */}
                        <div className="absolute bottom-4 left-4">
                          <span className="inline-flex items-center gap-2 px-4 py-2 bg-white/30 backdrop-blur-xl rounded-xl text-white text-xs font-medium border border-white/30 shadow-lg">
                            <FiAward className="text-amber-400" />
                            Best Seller
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Thumbnail Gallery */}
                    <div className="mt-4 grid grid-cols-4 gap-3">
                      {productImages.map((img, index) => (
                        <button
                          key={index}
                          onClick={() => setActiveImage(index)}
                          className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all duration-300 ${
                            activeImage === index
                              ? 'border-gray-900 shadow-lg scale-105'
                              : 'border-transparent hover:border-gray-300 hover:scale-102 opacity-70 hover:opacity-100'
                          }`}
                        >
                          <img
                            src={img}
                            alt={`${product.name} view ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                          {index === 3 && (
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                              <FiPlay className="text-white text-lg" />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Product Details */}
                <div className="p-8 lg:p-12 flex flex-col bg-white">
                  {/* Category & Title */}
                  <div className="mb-8">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="px-3 py-1.5 bg-linear-to-r from-gray-100 to-gray-50 text-gray-700 text-xs font-semibold rounded-xl border border-gray-200/60">
                        Electronics
                      </span>
                      {product.condition && (
                        <span className="px-3 py-1.5 bg-linear-to-r from-emerald-50 to-emerald-100/50 text-emerald-700 text-xs font-semibold rounded-xl border border-emerald-200/60">
                          {product.condition}
                        </span>
                      )}
                      {product.discount && (
                        <span className="px-3 py-1.5 bg-linear-to-r from-red-50 to-red-100/50 text-red-600 text-xs font-semibold rounded-xl border border-red-200/60 animate-pulse">
                          {product.discount} OFF
                        </span>
                      )}
                    </div>
                    <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 leading-tight mb-4">
                      {product.name}
                    </h1>
                    
                    {/* Enhanced Rating */}
                    <div className="flex items-center gap-4 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <div className="flex items-center gap-0.5">
                          {[...Array(5)].map((_, i) => (
                            <FiStar 
                              key={i} 
                              className={`text-sm ${i < Math.floor(product.rating) ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`}
                            />
                          ))}
                        </div>
                        <span className="text-sm font-bold text-gray-900">{product.rating}</span>
                      </div>
                      <span className="text-gray-300">·</span>
                      <span className="text-sm text-gray-600 font-medium">{reviewCount} reviews</span>
                      <span className="text-gray-300">·</span>
                      <span className="text-sm text-gray-600 font-medium">128 sold</span>
                      <span className="text-gray-300">·</span>
                      <FiTrendingUp className="text-emerald-500 text-sm" />
                      <span className="text-xs text-emerald-600 font-medium">Trending</span>
                    </div>
                  </div>

                  {/* Price Section */}
                  <div className="bg-linear-to-br from-gray-50 to-white rounded-2xl p-6 mb-8 border border-gray-200/60 shadow-inner">
                    <div className="flex items-baseline gap-3 mb-3">
                      <span className="text-4xl lg:text-5xl font-bold bg-linear-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                        {product.price}
                      </span>
                      {product.originalPrice && (
                        <span className="text-lg text-gray-400 line-through font-medium">
                          {product.originalPrice}
                        </span>
                      )}
                    </div>
                    {product.discount && (
                      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200/60">
                        <FiTag className="text-xs" />
                        Save {product.discount}
                      </span>
                    )}
                  </div>

                  {/* Added to wishlist toast */}
                  {isAdded && (
                    <div className="mb-6 bg-linear-to-r from-emerald-50 to-green-50 border border-emerald-200 text-emerald-700 px-5 py-4 rounded-2xl flex items-center gap-3 animate-slideDown shadow-lg shadow-emerald-100/50">
                      <div className="w-6 h-6 bg-linear-to-br from-emerald-500 to-green-500 rounded-full flex items-center justify-center shrink-0 shadow-md">
                        <FiCheck className="text-white text-xs" />
                      </div>
                      <span className="text-sm font-semibold">Added to wishlist successfully! 🎉</span>
                    </div>
                  )}

                  {/* Seller Info */}
                  <div className="flex items-center gap-4 p-5 bg-linear-to-r from-white to-gray-50 rounded-2xl border border-gray-200/60 mb-8 shadow-sm">
                    <div className="w-14 h-14 bg-linear-to-br from-gray-900 to-gray-700 rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-gray-300/30">
                      <FiShoppingBag className="text-white text-xl" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900">Official Store</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex items-center gap-1">
                          <FiStar className="fill-amber-400 text-amber-400 text-xs" />
                          <span className="text-xs font-semibold text-gray-700">{sellerRating}% Positive</span>
                        </div>
                        <span className="text-gray-300 text-xs">·</span>
                        <span className="text-xs text-gray-500 font-medium">{reviewCount} reviews</span>
                      </div>
                    </div>
                    <span className="px-4 py-2 bg-linear-to-r from-emerald-50 to-green-50 text-emerald-700 text-xs font-bold rounded-xl border border-emerald-200/60 shadow-sm">
                      Verified ✓
                    </span>
                  </div>

                  {/* Specs Grid */}
                  {specs.length > 0 && (
                    <div className="mb-8">
                      <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <FiAward className="text-gray-400" />
                        Specifications
                      </h3>
                      <div className="grid grid-cols-2 gap-3">
                        {specs.map((spec, index) => (
                          <div key={index} className="flex items-center justify-between p-3.5 bg-linear-to-r from-gray-50 to-white rounded-xl border border-gray-200/60 hover:border-gray-300 hover:shadow-md transition-all duration-300">
                            <span className="text-xs text-gray-500 font-medium">{spec.label}</span>
                            <span className="text-xs font-bold text-gray-900 text-right truncate ml-2">
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
                      <h3 className="text-sm font-bold text-gray-900 mb-3">Description</h3>
                      <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 rounded-xl p-4 border border-gray-200/60">
                        {product.description}
                      </p>
                    </div>
                  )}

                  {/* Enhanced Features */}
                  <div className="grid grid-cols-3 gap-3 mb-8">
                    <div className="flex flex-col items-center text-center p-4 bg-linear-to-b from-white to-gray-50 rounded-xl border border-gray-200/60 hover:shadow-m hover:scale-101 transition-all duration-300 group cursor-default">
                      <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center mb-2 group-hover:bg-gray-100 transition-colors">
                        <FiTruck className="text-gray-500" />
                      </div>
                      <span className="text-xs font-semibold text-gray-700">Free Shipping</span>
                    </div>
                    <div className="flex flex-col items-center text-center p-4 bg-linear-to-b from-white to-gray-50 rounded-xl border border-gray-200/60 hover:shadow-m hover:scale-101 transition-all duration-300 group cursor-default">
                      <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center mb-2 group-hover:bg-gray-100 transition-colors">
                        <FiShield className="text-gray-500" />
                      </div>
                      <span className="text-xs font-semibold text-gray-700">1 Year Warranty</span>
                    </div>
                    <div className="flex flex-col items-center text-center p-4 bg-linear-to-b from-white to-gray-50 rounded-xl border border-gray-200/60 hover:shadow-m hover:scale-101 transition-all duration-300 group cursor-default">
                      <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center mb-2 group-hover:bg-gray-100 transition-colors">
                        <FiRotateCcw className="text-gray-500" />
                      </div>
                      <span className="text-xs font-semibold text-gray-700">30-Day Returns</span>
                    </div>
                  </div>

                  {/* CTA Buttons */}
                  <div className="mt-auto space-y-3">
                    <a
                      href={product.storeLink || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full inline-flex items-center justify-center gap-3 bg-linear-to-r from-gray-900 to-gray-800 text-white px-8 py-4 rounded-2xl font-bold hover:from-gray-800 hover:to-gray-700 transition-all duration-300 hover:shadow-lg hover:shadow-gray-900/30 hover:scale-[1.01] group"
                    >
                      <FiShoppingBag className="text-lg group-hover:scale-105 transition-transform" />
                      Visit Store
                      <FiExternalLink className="text-sm ml-1 group-hover:translate-x-0.5 transition-transform" />
                    </a>
                    <button
                      onClick={toggleWishlist}
                      className={`w-full inline-flex items-center justify-center gap-3 px-8 py-4 rounded-2xl font-bold transition-all duration-300 border-2 ${
                        isWishlisted 
                          ? 'bg-red-50 border-red-300 text-red-600 hover:bg-red-100 hover:scale-[1.02] shadow-lg shadow-red-200/30' 
                          : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 hover:scale-[1.02] shadow-lg shadow-gray-200/30'
                      }`}
                    >
                      <FiHeart className={`transition-transform duration-300 ${isWishlisted ? 'fill-red-500 scale-110' : 'group-hover:scale-110'}`} />
                      {isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Enhanced Related Products */}
            <div>
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Similar Products</h2>
                  <p className="text-sm text-gray-500 mt-1 font-medium">Based on your interests</p>
                </div>
                <button className="text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors flex items-center gap-1">
                  View All
                  <FiArrowLeft className="rotate-180 text-xs" />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {relatedProducts.map((prod) => (
                  <div
                    key={prod.id}
                    onClick={() => navigate('/product/' + prod.id, { state: { product: prod } })}
                    className="group bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 shadow-lg shadow-gray-200/30 overflow-hidden cursor-pointer hover:shadow-2xl hover:shadow-gray-300/40 hover:border-gray-300 hover:scale-[1.02] transition-all duration-500"
                  >
                    <div className="relative aspect-square overflow-hidden bg-linear-to-br from-gray-50 to-white">
                      <img
                        src={prod.image}
                        alt={prod.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                      />
                      <div className="absolute inset-0 bg-linear-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    </div>
                    <div className="p-5">
                      <h3 className="font-bold text-gray-900 group-hover:text-gray-700 transition-colors line-clamp-1 text-sm">
                        {prod.name}
                      </h3>
                      <div className="flex items-center justify-between mt-3">
                        <p className="text-gray-900 font-bold text-lg">{prod.price}</p>
                        <div className="flex items-center gap-1.5">
                          <FiStar className="fill-amber-400 text-amber-400 text-xs" />
                          <span className="text-xs font-semibold text-gray-600">{prod.rating}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes moveGrid {
          from { transform: translate(0, 0); }
          to { transform: translate(-100px, -100px); }
        }
        .animate-slideDown {
          animation: slideDown 0.5s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default ProductView;