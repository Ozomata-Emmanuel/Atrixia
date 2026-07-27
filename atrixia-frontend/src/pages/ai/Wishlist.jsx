// pages/ai/Wishlist.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiHeart, FiTrash2, FiShoppingBag, FiArrowLeft, FiDollarSign, FiStar, FiPackage } from 'react-icons/fi';

const Wishlist = () => {
  const [wishlist, setWishlist] = useState([]);
  const [sortBy, setSortBy] = useState('recent');
  const navigate = useNavigate();

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('attrixia_wishlist') || '[]');
    setWishlist(saved);
  }, []);

  const removeFromWishlist = (id) => {
    const updated = wishlist.filter(p => p.id !== id);
    setWishlist(updated);
    localStorage.setItem('attrixia_wishlist', JSON.stringify(updated));
  };

  const getSortedWishlist = () => {
    let sorted = [...wishlist];
    switch(sortBy) {
      case 'price-low':
        return sorted.sort((a, b) => {
          const priceA = parseInt(a.price.replace(/[^0-9]/g, ''));
          const priceB = parseInt(b.price.replace(/[^0-9]/g, ''));
          return priceA - priceB;
        });
      case 'price-high':
        return sorted.sort((a, b) => {
          const priceA = parseInt(a.price.replace(/[^0-9]/g, ''));
          const priceB = parseInt(b.price.replace(/[^0-9]/g, ''));
          return priceB - priceA;
        });
      case 'rating':
        return sorted.sort((a, b) => b.rating - a.rating);
      default:
        return sorted;
    }
  };

  const sortedWishlist = getSortedWishlist();
  const totalValue = wishlist.reduce((sum, p) => {
    const price = parseInt(p.price.replace(/[^0-9]/g, ''));
    return sum + price;
  }, 0);
  const avgRating = wishlist.length > 0 ? (wishlist.reduce((sum, p) => sum + p.rating, 0) / wishlist.length).toFixed(1) : 0;

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

      <div className="relative z-10 max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate('/ai')}
            className="p-2.5 hover:bg-white/70 backdrop-blur-sm rounded-xl transition border border-gray-200/50 text-[#666666] hover:text-[#009FB8]"
          >
            <FiArrowLeft className="text-xl" />
          </button>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-linear-to-br from-red-500/20 to-red-600/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-red-200/50">
              <FiHeart className="text-2xl text-red-500 fill-red-500" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-[#1a1a1a]">Wishlist</h1>
              <p className="text-sm text-[#666666] mt-1">{wishlist.length} {wishlist.length === 1 ? 'item' : 'items'} saved</p>
            </div>
          </div>
        </div>

        {wishlist.length === 0 ? (
          <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-lg border border-gray-200/50 p-16 text-center">
            <div className="w-24 h-24 bg-linear-to-br from-red-50 to-red-100/50 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-200/50">
              <FiHeart className="text-5xl text-red-300" />
            </div>
            <h3 className="text-2xl font-bold text-[#1a1a1a] mb-2">Your wishlist is empty</h3>
            <p className="text-[#666666] mb-8 text-lg">Start saving products you love to see them here</p>
            <Link
              to="/ai"
              className="inline-block bg-linear-to-r from-[#009FB8] to-[#006b7d] text-white px-8 py-3.5 rounded-2xl font-semibold hover:shadow-lg hover:shadow-[#009FB8]/30 transition border border-[#009FB8]/50"
            >
              <FiShoppingBag className="inline mr-2" />
              Browse Products
            </Link>
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-white/70 backdrop-blur-md rounded-2xl shadow-md border border-gray-200/50 p-6 hover:shadow-lg hover:border-[#009FB8]/30 transition">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-[#999999] uppercase tracking-wider mb-1">Total Value</p>
                    <p className="text-2xl font-bold text-[#1a1a1a]">₦{(totalValue / 1000).toFixed(1)}K</p>
                  </div>
                  <div className="w-12 h-12 bg-linear-to-br from-blue-100 to-blue-50 rounded-xl flex items-center justify-center">
                    <FiTrendingUp className="text-blue-600 text-xl" />
                  </div>
                </div>
              </div>

              <div className="bg-white/70 backdrop-blur-md rounded-2xl shadow-md border border-gray-200/50 p-6 hover:shadow-lg hover:border-[#009FB8]/30 transition">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-[#999999] uppercase tracking-wider mb-1">Average Rating</p>
                    <p className="text-2xl font-bold text-[#1a1a1a]">{avgRating} <span className="text-lg">⭐</span></p>
                  </div>
                  <div className="w-12 h-12 bg-linear-to-br from-yellow-100 to-yellow-50 rounded-xl flex items-center justify-center">
                    <span className="text-yellow-600 text-xl">✨</span>
                  </div>
                </div>
              </div>

              <div className="bg-white/70 backdrop-blur-md rounded-2xl shadow-md border border-gray-200/50 p-6 hover:shadow-lg hover:border-[#009FB8]/30 transition">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-[#999999] uppercase tracking-wider mb-1">Items Saved</p>
                    <p className="text-2xl font-bold text-[#1a1a1a]">{wishlist.length}</p>
                  </div>
                  <div className="w-12 h-12 bg-linear-to-br from-red-100 to-red-50 rounded-xl flex items-center justify-center">
                    <FiHeart className="text-red-600 text-xl fill-red-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Sort & Filter */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-[#1a1a1a]">Your Saved Items</h2>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-[#666666]">Sort by:</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-4 py-2 rounded-xl border border-gray-200/50 bg-white/70 backdrop-blur-sm text-[#333333] focus:outline-none focus:ring-2 focus:ring-[#009FB8] focus:border-[#009FB8] transition"
                >
                  <option value="recent">Most Recent</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="rating">Highest Rated</option>
                </select>
              </div>
            </div>

            {/* Product Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {sortedWishlist.map((product) => (
                <div
                  key={product.id}
                  className="group bg-white/70 backdrop-blur-md rounded-2xl shadow-md border border-gray-200/50 overflow-hidden hover:shadow-xl hover:border-[#009FB8]/30 transition"
                >
                  <div 
                    className="relative h-52 overflow-hidden bg-gray-100 cursor-pointer"
                    onClick={() => navigate('/product/' + product.id, { state: { product } })}
                  >
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-125 transition duration-500"
                    />
                    {/* Overlay on hover */}
                    <div className="absolute inset-0 bg-linear-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition duration-300 flex items-end justify-between p-4">
                      <div className="text-white">
                        <p className="text-xs font-semibold opacity-80">Quick View</p>
                      </div>
                    </div>
                    <div className="absolute top-3 right-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFromWishlist(product.id);
                        }}
                        className="p-2.5 bg-white/90 backdrop-blur-md rounded-full hover:bg-red-50 transition shadow-md hover:shadow-lg border border-gray-200/50 hover:border-red-200"
                      >
                        <FiTrash2 className="text-red-500 text-base font-semibold" />
                      </button>
                    </div>
                  </div>
                  <div className="p-5">
                    <h3 
                      className="font-semibold text-[#1a1a1a] cursor-pointer hover:text-[#009FB8] transition line-clamp-1 text-sm"
                      onClick={() => navigate('/product/' + product.id, { state: { product } })}
                    >
                      {product.name}
                    </h3>
                    <p className="text-[#009FB8] font-bold text-lg mt-2">{product.price}</p>
                    <div className="flex items-center gap-3 text-xs text-[#999999] mt-3 font-medium">
                      <span>⭐ {product.rating}</span>
                      <span className="w-1 h-1 bg-[#999999] rounded-full"></span>
                      <span>{product.ram}</span>
                      <span className="w-1 h-1 bg-[#999999] rounded-full"></span>
                      <span className="truncate">{product.processor.split(' ').slice(0,2).join(' ')}</span>
                    </div>
                    <button
                      onClick={() => navigate('/product/' + product.id, { state: { product } })}
                      className="w-full mt-4 bg-linear-to-r from-[#009FB8] to-[#006b7d] text-white py-2.5 rounded-xl font-semibold hover:shadow-lg hover:shadow-[#009FB8]/30 transition flex items-center justify-center gap-2 border border-[#009FB8]/50"
                    >
                      <FiShoppingBag className="text-sm" />
                      View Product
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Wishlist;