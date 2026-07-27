// pages/ai/ProductView.jsx
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiHeart, FiShare2, FiExternalLink, FiCheck, FiStar, FiShoppingBag } from 'react-icons/fi';
import { mockProducts } from '../../data/mockData';
import { ProductViewSkeleton } from '../../components/LoadingSkeleton';

const ProductView = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const product = location.state?.product;
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [isAdded, setIsAdded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate loading
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

  if (!product) return null;

  const specs = [
    { label: 'RAM', value: product.ram, icon: '💾' },
    { label: 'Storage', value: product.rom, icon: '🗄️' },
    { label: 'Processor', value: product.processor, icon: '⚙️' },
    { label: 'GPU', value: product.gpu, icon: '🎮' },
    { label: 'Color', value: product.color, icon: '🎨' },
    { label: 'Rating', value: `${product.rating}/5`, icon: '⭐' },
  ];

  // Get related products
  const relatedProducts = mockProducts
    .filter(p => p.id !== product.id)
    .slice(0, 4);

  return (
    <div className="relative min-h-screen bg-linear-to-br from-gray-50 to-gray-100 py-8 overflow-hidden">
      {/* Grid Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -left-15 -top-15 animate-[moveGrid_25s_linear_infinite]"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(40, 100px)",
            gridAutoRows: "100px",
          }}
        >
          {Array.from({ length: 1200 }).map((_, i) => (
            <div
              key={i}
              style={{
                backgroundColor:
                  Math.random() > 0.5
                    ? `hsla(${Math.random() * 360}, 80%, 60%, 0.08)`
                    : "transparent",
              }}
            />
          ))}
        </div>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4">
        <button
          onClick={() => navigate('/ai')}
          className="flex items-center gap-2 text-[#666666] hover:text-[#1a1a1a] transition mb-8 bg-white/70 backdrop-blur-md px-4 py-2.5 rounded-xl shadow-sm border border-gray-200/50 hover:shadow-md hover:border-[#009FB8]/30"
        >
          <FiArrowLeft className="text-lg" /> Back to Results
        </button>

        {isLoading ? (
          <ProductViewSkeleton />
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
              {/* Image */}
              <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-lg border border-gray-200/50 overflow-hidden group">
                <div className="relative h-96 bg-linear-to-br from-gray-50 to-gray-100 overflow-hidden">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-125 transition duration-700"
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition duration-300" />
                </div>
              </div>

              {/* Details */}
              <div className="flex flex-col">
                <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-lg border border-gray-200/50 p-8 flex-1">
                  <div className="flex justify-between items-start gap-4 mb-6">
                    <div className="flex-1">
                      <h1 className="text-3xl font-bold text-[#1a1a1a] mb-3">{product.name}</h1>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 bg-linear-to-r from-yellow-50 to-yellow-100/50 backdrop-blur-sm px-3 py-1.5 rounded-full border border-yellow-200/50">
                          <FiStar className="text-yellow-500 fill-yellow-500 text-base" />
                          <span className="font-semibold text-[#1a1a1a]">{product.rating}</span>
                        </div>
                        <span className="text-sm text-[#999999] font-medium">(128 verified reviews)</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={toggleWishlist}
                        className={`p-3 rounded-2xl border transition shadow-sm ${
                          isWishlisted 
                            ? 'bg-red-50 border-red-200 text-red-500 shadow-md' 
                            : 'bg-white/60 backdrop-blur-sm border-gray-200/50 text-[#999999] hover:text-red-500 hover:bg-red-50'
                        }`}
                        title={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
                      >
                        <FiHeart className={`text-xl ${isWishlisted ? 'fill-red-500' : ''}`} />
                      </button>
                      <button className="p-3 rounded-2xl border border-gray-200/50 text-[#999999] hover:text-[#009FB8] transition bg-white/60 backdrop-blur-sm shadow-sm hover:shadow-md hover:border-[#009FB8]/30">
                        <FiShare2 className="text-xl" />
                      </button>
                    </div>
                  </div>

                  <p className="text-4xl font-bold bg-linear-to-r from-[#009FB8] to-[#006b7d] bg-clip-text text-transparent mb-6">{product.price}</p>

                  {/* Toast notification */}
                  {isAdded && (
                    <div className="bg-linear-to-r from-green-50 to-emerald-50 border border-green-200 text-green-700 px-4 py-3 rounded-2xl mb-6 flex items-center gap-2 text-sm animate-fade-in shadow-md">
                      <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white">
                        <FiCheck className="text-sm" />
                      </div>
                      Added to wishlist!
                    </div>
                  )}

                  <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-5 mb-8 border border-gray-200/50">
                    <p className="text-base text-[#333333] leading-relaxed font-medium">{product.description}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-8">
                    {specs.map((spec, index) => (
                      <div key={index} className="bg-linear-to-br from-white/70 to-white/50 backdrop-blur-sm rounded-2xl p-4 border border-gray-200/50 hover:shadow-md hover:border-[#009FB8]/30 transition">
                        <p className="text-2xl mb-1">{spec.icon}</p>
                        <p className="text-xs text-[#999999] font-medium uppercase tracking-wider">{spec.label}</p>
                        <p className="text-sm font-semibold text-[#1a1a1a] truncate mt-1">{spec.value}</p>
                      </div>
                    ))}
                  </div>

                  <a
                    href={product.storeLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center gap-2 bg-linear-to-r from-[#009FB8] to-[#006b7d] text-white px-6 py-4 rounded-2xl font-semibold hover:shadow-lg hover:shadow-[#009FB8]/30 transition border border-[#009FB8]/50"
                  >
                    <FiShoppingBag /> Visit Store
                    <FiExternalLink />
                  </a>
                </div>
              </div>
            </div>

            {/* Related Products */}
            {relatedProducts.length > 0 && (
              <div className="mt-12">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-[#1a1a1a] mb-2">You Might Also Like</h2>
                  <p className="text-[#666666]">Explore similar products</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {relatedProducts.map((prod) => (
                    <div
                      key={prod.id}
                      onClick={() => navigate('/product/' + prod.id, { state: { product: prod } })}
                      className="group bg-white/70 backdrop-blur-md rounded-2xl shadow-md border border-gray-200/50 overflow-hidden cursor-pointer hover:shadow-xl hover:border-[#009FB8]/30 transition"
                    >
                      <div className="relative h-48 overflow-hidden bg-gray-100">
                        <img
                          src={prod.image}
                          alt={prod.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition duration-500"
                        />
                      </div>
                      <div className="p-5">
                        <h3 className="font-semibold text-[#1a1a1a] group-hover:text-[#009FB8] transition line-clamp-1">{prod.name}</h3>
                        <p className="text-[#009FB8] font-bold text-lg mt-2">{prod.price}</p>
                        <div className="flex items-center gap-2 text-xs text-[#999999] mt-3">
                          <span>⭐ {prod.rating}</span>
                          <span>•</span>
                          <span>{prod.ram}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default ProductView;