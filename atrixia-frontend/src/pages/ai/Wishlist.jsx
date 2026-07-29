// pages/ai/Wishlist.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiHeart, FiTrash2, FiShoppingBag, FiArrowLeft, FiStar, FiGrid, FiList, FiChevronDown, FiCheck, FiFilter, FiX, FiExternalLink } from 'react-icons/fi';
import AnimatedGridBackground from '../../components/AnimatedGridBackground';

const Wishlist = () => {
  const [wishlist, setWishlist] = useState([]);
  const [sortBy, setSortBy] = useState('recent');
  const [viewMode, setViewMode] = useState('grid');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState([]);
  const sortRef = useRef(null);
  const filterRef = useRef(null);
  const navigate = useNavigate();

  const sortOptions = [
    { value: 'recent', label: 'Most Recent' },
    { value: 'price-low', label: 'Price: Low to High' },
    { value: 'price-high', label: 'Price: High to Low' },
    { value: 'rating', label: 'Highest Rated' },
    { value: 'name', label: 'Name: A to Z' },
  ];

  const filterOptions = [
    { value: 'electronics', label: 'Electronics' },
    { value: 'fashion', label: 'Fashion' },
    { value: 'home', label: 'Home & Living' },
    { value: 'sports', label: 'Sports' },
    { value: '4star', label: '4★ & above' },
    { value: '3star', label: '3★ & above' },
    { value: 'under100k', label: 'Under ₦100K' },
    { value: 'under500k', label: 'Under ₦500K' },
  ];

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('attrixia_wishlist') || '[]');
    setWishlist(saved);
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sortRef.current && !sortRef.current.contains(event.target)) {
        setSortDropdownOpen(false);
      }
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setFilterDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const removeFromWishlist = (id) => {
    const updated = wishlist.filter(p => p.id !== id);
    setWishlist(updated);
    localStorage.setItem('attrixia_wishlist', JSON.stringify(updated));
  };

  const openDeleteModal = (product) => {
    setProductToDelete(product);
    setDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (productToDelete) {
      removeFromWishlist(productToDelete.id);
    }
    setDeleteModalOpen(false);
    setProductToDelete(null);
  };

  const toggleFilter = (value) => {
    setActiveFilters(prev => 
      prev.includes(value) 
        ? prev.filter(f => f !== value)
        : [...prev, value]
    );
  };

  const removeFilter = (value) => {
    setActiveFilters(prev => prev.filter(f => f !== value));
  };

  const clearAllFilters = () => {
    setActiveFilters([]);
  };

  const getFilteredAndSortedWishlist = () => {
    let filtered = [...wishlist];
    
    // Apply filters
    if (activeFilters.length > 0) {
      filtered = filtered.filter(product => {
        const price = typeof product.price === 'number' ? product.price : parseFloat(product.price);
        const rating = product.sellerRating || product.rating || 0;
        return activeFilters.some(filter => {
          switch(filter) {
            case 'under100k': return price < 100000;
            case 'under500k': return price < 500000;
            case '4star': return rating >= 4;
            case '3star': return rating >= 3;
            default: return true;
          }
        });
      });
    }

    // Apply sorting
    switch(sortBy) {
      case 'price-low':
        return filtered.sort((a, b) => {
          const priceA = typeof a.price === 'number' ? a.price : parseFloat(a.price);
          const priceB = typeof b.price === 'number' ? b.price : parseFloat(b.price);
          return priceA - priceB;
        });
      case 'price-high':
        return filtered.sort((a, b) => {
          const priceA = typeof a.price === 'number' ? a.price : parseFloat(a.price);
          const priceB = typeof b.price === 'number' ? b.price : parseFloat(b.price);
          return priceB - priceA;
        });
      case 'rating':
        return filtered.sort((a, b) => (b.sellerRating || b.rating || 0) - (a.sellerRating || a.rating || 0));
      case 'name':
        return filtered.sort((a, b) => (a.title || a.name || '').localeCompare(b.title || b.name || ''));
      default:
        return filtered;
    }
  };

  const displayedWishlist = getFilteredAndSortedWishlist();

  const getActiveSortLabel = () => {
    return sortOptions.find(opt => opt.value === sortBy)?.label || 'Sort';
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      {/* Delete Confirmation Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setDeleteModalOpen(false)}
          />
          <div className="relative bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full border border-gray-100 animate-scaleIn">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <FiTrash2 className="text-red-500 text-2xl" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Remove Item</h3>
              <p className="text-gray-500 mb-2">
                Are you sure you want to remove this item from your wishlist?
              </p>
              {productToDelete && (
                <p className="text-sm font-medium text-gray-700 bg-gray-50 rounded-xl p-3 mb-6">
                  "{productToDelete?.title || productToDelete?.name}"
                </p>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteModalOpen(false)}
                  className="flex-1 px-4 py-3 border border-gray-200 rounded-2xl text-gray-700 font-medium hover:bg-gray-50 transition-all"
                >
                  Keep It
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 px-4 py-3 bg-red-500 text-white rounded-2xl font-medium hover:bg-red-600 transition-all"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/ai')}
              className="w-10 h-10 bg-white rounded-xl border border-gray-200 shadow-sm flex items-center justify-center text-gray-500 hover:text-gray-900 hover:border-gray-300 transition-all shrink-0"
            >
              <FiArrowLeft className="text-lg" />
            </button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Wishlist</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                {wishlist.length} {wishlist.length === 1 ? 'item' : 'items'} saved
              </p>
            </div>
          </div>

          {/* Animated Grid Background */}
          <AnimatedGridBackground />

          {wishlist.length > 0 && (
            <div className="flex items-center gap-3">
              {/* View Mode Toggle */}
              <div className="flex bg-white rounded-xl border border-gray-200 p-1 shadow-sm">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg transition-all ${
                    viewMode === 'grid' 
                      ? 'bg-gray-900 text-white shadow-sm' 
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                  title="Grid view"
                >
                  <FiGrid className="text-base" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition-all ${
                    viewMode === 'list' 
                      ? 'bg-gray-900 text-white shadow-sm' 
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                  title="List view"
                >
                  <FiList className="text-base" />
                </button>
              </div>

              {/* Filter Dropdown */}
              <div className="relative" ref={filterRef}>
                <button
                  onClick={() => {
                    setFilterDropdownOpen(!filterDropdownOpen);
                    setSortDropdownOpen(false);
                  }}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border shadow-sm transition-all text-sm font-medium ${
                    activeFilters.length > 0
                      ? 'bg-gray-900 text-white border-gray-900'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <FiFilter className="text-base" />
                  Filter
                  {activeFilters.length > 0 && (
                    <span className="w-5 h-5 bg-white/20 rounded-full text-xs flex items-center justify-center">
                      {activeFilters.length}
                    </span>
                  )}
                </button>

                {filterDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-20 animate-fadeIn">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Filters</span>
                        {activeFilters.length > 0 && (
                          <button
                            onClick={clearAllFilters}
                            className="text-xs text-red-500 hover:text-red-600 font-medium"
                          >
                            Clear all
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="max-h-60 overflow-y-auto py-1">
                      <div className="px-3 py-1">
                        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2">Price Range</span>
                      </div>
                      {filterOptions.filter(f => f.value.includes('under')).map((option) => (
                        <button
                          key={option.value}
                          onClick={() => toggleFilter(option.value)}
                          className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 transition-colors"
                        >
                          <span className="text-sm text-gray-700">{option.label}</span>
                          {activeFilters.includes(option.value) && (
                            <FiCheck className="text-gray-900 text-base" />
                          )}
                        </button>
                      ))}
                      <div className="px-3 py-1 mt-1">
                        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2">Rating</span>
                      </div>
                      {filterOptions.filter(f => f.value.includes('star')).map((option) => (
                        <button
                          key={option.value}
                          onClick={() => toggleFilter(option.value)}
                          className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 transition-colors"
                        >
                          <span className="text-sm text-gray-700">{option.label}</span>
                          {activeFilters.includes(option.value) && (
                            <FiCheck className="text-gray-900 text-base" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Sort Dropdown */}
              <div className="relative" ref={sortRef}>
                <button
                  onClick={() => {
                    setSortDropdownOpen(!sortDropdownOpen);
                    setFilterDropdownOpen(false);
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white rounded-xl border border-gray-200 shadow-sm text-sm font-medium text-gray-700 hover:border-gray-300 transition-all"
                >
                  {getActiveSortLabel()}
                  <FiChevronDown className={`text-base transition-transform ${sortDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {sortDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-20 animate-fadeIn">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Sort by</span>
                    </div>
                    {sortOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => {
                          setSortBy(option.value);
                          setSortDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 transition-colors ${
                          sortBy === option.value ? 'bg-gray-50' : ''
                        }`}
                      >
                        <span className={`text-sm ${sortBy === option.value ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                          {option.label}
                        </span>
                        {sortBy === option.value && (
                          <FiCheck className="text-gray-900 text-base" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Active Filter Chips */}
        {activeFilters.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {activeFilters.map(filter => {
              const label = filterOptions.find(f => f.value === filter)?.label;
              return (
                <span
                  key={filter}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-lg"
                >
                  {label}
                  <button onClick={() => removeFilter(filter)}>
                    <FiX className="text-xs hover:text-red-300" />
                  </button>
                </span>
              );
            })}
            <button
              onClick={clearAllFilters}
              className="text-xs text-gray-500 hover:text-gray-700 font-medium px-2"
            >
              Clear all
            </button>
          </div>
        )}

        {wishlist.length === 0 ? (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-16 text-center">
            <div className="w-20 h-20 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <FiHeart className="text-3xl text-gray-300" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Your wishlist is empty</h3>
            <p className="text-gray-500 mb-8 max-w-md mx-auto">
              Items added to your wishlist will appear here. Start exploring and save what catches your eye.
            </p>
            <Link
              to="/ai"
              className="inline-flex items-center gap-2 bg-gray-900 text-white px-8 py-3.5 rounded-2xl font-semibold hover:bg-gray-800 transition-all hover:shadow-lg hover:shadow-gray-900/20"
            >
              <FiShoppingBag />
              Browse Products
            </Link>
          </div>
        ) : displayedWishlist.length === 0 ? (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-16 text-center">
            <div className="w-20 h-20 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <FiFilter className="text-3xl text-gray-300" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">No matches found</h3>
            <p className="text-gray-500 mb-8">
              Try adjusting your filters to see more results.
            </p>
            <button
              onClick={clearAllFilters}
              className="inline-flex items-center gap-2 bg-gray-900 text-white px-8 py-3.5 rounded-2xl font-semibold hover:bg-gray-800 transition-all"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <>
            {/* Product Grid View */}
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {displayedWishlist.map((product) => (
                  <div
                    key={product.id}
                    className="group bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-lg hover:border-gray-200 transition-all duration-300"
                  >
                    {/* Image */}
                    <div 
                      className="relative aspect-square overflow-hidden p-5 bg-linear-to-br from-gray-50 to-white cursor-pointer"
                      onClick={() => navigate('/product/' + product.id, { state: { product } })}
                    >
                      <div className="overflow-hidden w-full h-full rounded-2xl">
                        <img
                          src={product.image}
                          alt={product.title || product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          onError={(e) => { e.target.src = 'https://via.placeholder.com/300x300?text=No+Image'; }}
                        />
                      </div>
                      {/* Quick Actions Overlay */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300">
                        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-1 group-hover:translate-y-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openDeleteModal(product);
                            }}
                            className="w-9 h-9 bg-white rounded-xl shadow-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
                          >
                            <FiTrash2 className="text-sm" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-5">
                      <h3 
                        className="font-semibold text-gray-900 cursor-pointer hover:text-gray-600 transition line-clamp-1 text-sm"
                        onClick={() => navigate('/product/' + product.id, { state: { product } })}
                        title={product.title || product.name}
                      >
                        {product.title || product.name}
                      </h3>
                      
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-lg font-bold text-gray-900">
                          {product.currency || '$'}{typeof product.price === 'number' ? product.price.toLocaleString() : product.price}
                        </span>
                        {(product.sellerRating || product.rating) && (
                          <div className="flex items-center gap-1">
                            <FiStar className="fill-amber-400 text-amber-400 text-xs" />
                            <span className="text-xs font-medium text-gray-600">{product.sellerRating || product.rating}</span>
                          </div>
                        )}
                      </div>

                      {product.marketplace && (
                        <p className="text-xs text-gray-400 mt-2 truncate">{product.marketplace}</p>
                      )}

                      <div className="flex gap-2 mt-4">
                        <button
                          onClick={() => navigate('/product/' + product.id, { state: { product } })}
                          className="flex-1 py-2.5 bg-gray-50 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-100 cursor-pointer transition-all border border-gray-200"
                        >
                          View
                        </button>
                        <a
                          href={product.productUrl || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="py-2.5 px-3 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800 transition-all flex items-center gap-1"
                        >
                          <FiExternalLink className="text-xs" />
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* List View */
              <div className="space-y-3 ">
                {displayedWishlist.map((product) => (
                  <div
                    key={product.id}
                    className="group bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:shadow-md hover:border-gray-200 transition-all duration-300"
                  >
                    <div className="flex items-center gap-5">
                      <div 
                        className="w-24 h-24 rounded-xl overflow-hidden bg-linear-to-br from-gray-50 to-white shrink-0 cursor-pointer"
                        onClick={() => navigate('/product/' + product.id, { state: { product } })}
                      >
                        <img
                          src={product.image}
                          alt={product.title || product.name}
                          className="w-full h-full object-cover"
                          onError={(e) => { e.target.src = 'https://via.placeholder.com/100x100?text=No+Image'; }}
                        />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h3 
                          className="font-semibold text-gray-900 cursor-pointer hover:text-gray-600 transition line-clamp-1"
                          onClick={() => navigate('/product/' + product.id, { state: { product } })}
                          title={product.title || product.name}
                        >
                          {product.title || product.name}
                        </h3>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-lg font-bold text-gray-900">
                            {product.currency || '$'}{typeof product.price === 'number' ? product.price.toLocaleString() : product.price}
                          </span>
                          {(product.sellerRating || product.rating) && (
                            <>
                              <span className="text-gray-300">·</span>
                              <div className="flex items-center gap-1">
                                <FiStar className="fill-amber-400 text-amber-400 text-xs" />
                                <span className="text-sm font-medium text-gray-600">{product.sellerRating || product.rating}</span>
                              </div>
                            </>
                          )}
                          {product.marketplace && (
                            <>
                              <span className="text-gray-300">·</span>
                              <span className="text-sm text-gray-400">{product.marketplace}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => navigate('/product/' + product.id, { state: { product } })}
                          className="px-5 py-2.5 bg-gray-50 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-100 transition-all border border-gray-200"
                        >
                          View
                        </button>
                        <a
                          href={product.productUrl || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-xl transition-all"
                        >
                          <FiExternalLink className="text-sm" />
                        </a>
                        <button
                          onClick={() => openDeleteModal(product)}
                          className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                        >
                          <FiTrash2 className="text-sm" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
        .animate-scaleIn {
          animation: scaleIn 0.2s ease-out;
        }
      `}</style>
    </div>
  );
};

export default Wishlist;