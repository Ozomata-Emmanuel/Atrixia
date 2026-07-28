// pages/ai/AIPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/authService';
import { 
  FiPlus, FiX, FiSend, FiMenu, FiUser, FiHeart, 
  FiLogOut, FiMessageSquare, FiTrash2, FiHome, FiChevronLeft, FiChevronRight,
  FiChevronDown, FiChevronUp, FiFilter, FiDollarSign, FiStar, FiTrendingUp,
  FiSettings, FiToggleLeft, FiToggleRight
} from 'react-icons/fi';
// import { FaRegBookmark } from "react-icons/io5";
import { FaRegBookmark } from "react-icons/fa6";
import { IoToggle } from "react-icons/io5";
import { PiSidebarSimpleLight } from "react-icons/pi";
import { FiSidebar } from "react-icons/fi";
import { mockProducts } from '../../data/mockData';
import { IoArrowUp } from "react-icons/io5";
import { IoMdStar } from "react-icons/io";
import AnimatedGridBackground from '../../components/AnimatedGridBackground';

const AIPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [customFilters, setCustomFilters] = useState([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerClosing, setDrawerClosing] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [filterName, setFilterName] = useState('');
  const [filterValue, setFilterValue] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [chatToDelete, setChatToDelete] = useState(null);
  const [userPreferences, setUserPreferences] = useState(null);
  const [expandedMessageId, setExpandedMessageId] = useState(null);
  const [isPreferencesModalOpen, setIsPreferencesModalOpen] = useState(false);
  const [tempPreferences, setTempPreferences] = useState(null);
  const [preferencesModalClosing, setPreferencesModalClosing] = useState(false);
  const messagesEndRef = useRef(null);
  const sidebarRef = useRef(null);
  const messagesContainerRef = useRef(null);

  // Fetch user preferences on mount
  useEffect(() => {
    const fetchPreferences = async () => {
      const result = await authService.getUserPreferences();
      if (result.success) {
        setUserPreferences(result.data);
        setTempPreferences(result.data);
      }
    };
    fetchPreferences();
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('attrixia_chat_history');
    if (saved) {
      setChatHistory(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Close sidebar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isSidebarOpen && sidebarRef.current && !sidebarRef.current.contains(event.target)) {
        setIsSidebarOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isSidebarOpen]);

  const closeDrawer = () => {
    setDrawerClosing(true);
    setTimeout(() => {
      setIsDrawerOpen(false);
      setDrawerClosing(false);
    }, 300);
  };

  const openDrawer = () => {
    setIsDrawerOpen(true);
    setDrawerClosing(false);
  };

  const openPreferencesModal = () => {
    setTempPreferences({ ...userPreferences });
    setIsPreferencesModalOpen(true);
  };

  const closePreferencesModal = () => {
    setPreferencesModalClosing(true);
    setTimeout(() => {
      setIsPreferencesModalOpen(false);
      setPreferencesModalClosing(false);
    }, 300);
  };

  const savePreferences = () => {
    setUserPreferences(tempPreferences);
    closePreferencesModal();
    // Log the update
    console.log('[PREFERENCES] Updated preferences:', tempPreferences);
    // Uncomment when ready to connect to backend
    // authService.updateUserPreferences(tempPreferences);
  };

  const addFilter = () => {
    if (filterName.trim() && filterValue.trim()) {
      setCustomFilters([...customFilters, { name: filterName, value: filterValue }]);
      setFilterName('');
      setFilterValue('');
      closeDrawer();
    }
  };

  const removeFilter = (index) => {
    setCustomFilters(customFilters.filter((_, i) => i !== index));
  };

  const toggleMessageExpansion = (messageId) => {
    setExpandedMessageId(expandedMessageId === messageId ? null : messageId);
  };

  const handleSendMessage = async () => {
    if (!input.trim() && customFilters.length === 0) return;

    let userMessage = input.trim();
    
    // Prepare all filters (both custom and constant preferences)
    const allFilters = [...customFilters];
    
    // Add constant preferences as filters if they exist
    const constantFilters = [];
    if (userPreferences) {
      if (userPreferences.budgetMin && userPreferences.budgetMax) {
        constantFilters.push({
          name: 'Budget Range',
          value: `${userPreferences.preferredCurrency} ${userPreferences.budgetMin} - ${userPreferences.budgetMax}`
        });
      }
      if (userPreferences.prioritizePrice) {
        constantFilters.push({
          name: 'Priority',
          value: 'Best Price'
        });
      }
      if (userPreferences.prioritizeQuality) {
        constantFilters.push({
          name: 'Priority',
          value: 'Best Quality'
        });
      }
    }

    const newMessage = { 
      id: Date.now(), 
      type: 'user', 
      content: userMessage || 'Looking for products',
      customFilters: [...customFilters],
      constantFilters: constantFilters
    };
    
    setMessages(prev => [...prev, newMessage]);
    setInput('');
    setIsTyping(true);

    // Send query to backend (commented out, just logging)
    await authService.sendAiQuery(userMessage, customFilters, userPreferences);

    setTimeout(() => {
      const aiResponse = {
        id: Date.now() + 1,
        type: 'ai',
        content: `Based on your requirements${userPreferences ? ' and preferences' : ''}, I've found ${mockProducts.length} products that match your criteria. Here are the best options for you:`,
        products: mockProducts.map(product => ({
          ...product,
          // Add preference-based highlighting
          isBestPrice: userPreferences?.prioritizePrice && product.price === Math.min(...mockProducts.map(p => parseFloat(p.price.replace('$', '').replace(',', '')))),
          isBestQuality: userPreferences?.prioritizeQuality && product.rating >= 4.5,
        }))
      };
      setMessages(prev => [...prev, aiResponse]);
      setIsTyping(false);
      
      // Save to chat history
      const newChat = {
        id: Date.now(),
        title: userMessage.slice(0, 30) + (userMessage.length > 30 ? '...' : '') || 'Product Search',
        timestamp: new Date().toISOString(),
        messages: [...messages, newMessage, aiResponse]
      };
      const updatedHistory = [newChat, ...chatHistory];
      setChatHistory(updatedHistory);
      localStorage.setItem('attrixia_chat_history', JSON.stringify(updatedHistory));
      
      // Clear filters after sending
      setCustomFilters([]);
    }, 1500);
  };

  const loadChat = (chat) => {
    setMessages(chat.messages);
    setIsSidebarOpen(false);
  };

  const openDeleteModal = (id, e) => {
    e.stopPropagation();
    setChatToDelete(id);
    setDeleteModalOpen(true);
  };

  const confirmDeleteChat = () => {
    if (chatToDelete) {
      const updatedHistory = chatHistory.filter(chat => chat.id !== chatToDelete);
      setChatHistory(updatedHistory);
      localStorage.setItem('attrixia_chat_history', JSON.stringify(updatedHistory));
      if (messages.length > 0) {
        setMessages([]);
      }
    }
    setDeleteModalOpen(false);
    setChatToDelete(null);
  };

  const cancelDeleteChat = () => {
    setDeleteModalOpen(false);
    setChatToDelete(null);
  };

  const startNewChat = () => {
    setMessages([]);
    setCustomFilters([]);
    setIsSidebarOpen(false);
    setExpandedMessageId(null);
  };

  const handleProductClick = (product) => {
    navigate(`/product/${product.id}`, { state: { product } });
  };

  // Calculate active preferences count
  const activePreferencesCount = userPreferences ? 
    (userPreferences.prioritizePrice ? 1 : 0) + 
    (userPreferences.prioritizeQuality ? 1 : 0) + 
    (userPreferences.budgetMin || userPreferences.budgetMax ? 1 : 0) 
    : 0;

  return (
    <div className="relative h-screen flex bg-[#f5f5f5] overflow-hidden">
      {/* Grid Background */}
      <AnimatedGridBackground/>

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={cancelDeleteChat}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4 border border-gray-200">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FiTrash2 className="text-red-500 text-2xl" />
              </div>
              <h3 className="text-xl font-bold text-[#1a1a1a] mb-2">Delete Chat</h3>
              <p className="text-[#666666] mb-6">
                Are you sure you want to delete this chat? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={cancelDeleteChat}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-[#666666] font-medium hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteChat}
                  className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preferences Modal */}
      {isPreferencesModalOpen && (
        <div className="fixed inset-0 z-50">
          <div 
            className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300"
            onClick={closePreferencesModal}
          />
          
          {/* Mobile Drawer */}
          <div className={`
            md:hidden absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md rounded-t-3xl shadow-2xl border-t border-gray-200/50
            transition-all duration-300 ease-in-out transform
            ${preferencesModalClosing 
              ? 'translate-y-full' 
              : 'translate-y-0'
            }
          `}>
            <div className="p-6 pb-8">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-xl font-bold text-[#1a1a1a]">Search Preferences</h3>
                  <p className="text-sm text-[#666666] mt-1">Customize your product recommendations</p>
                </div>
                <button
                  onClick={closePreferencesModal}
                  className="text-[#999999] hover:text-[#1a1a1a] transition p-1 hover:bg-gray-100 rounded-lg"
                >
                  <FiX className="text-2xl" />
                </button>
              </div>
              
              <div className="space-y-6">
                {/* Budget Range */}
                <div>
                  <label className="block text-sm font-medium text-[#333333] mb-3">
                    Budget Range
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <label className="text-xs text-[#999999] mb-1 block">Min</label>
                      <input
                        type="number"
                        value={tempPreferences?.budgetMin || ''}
                        onChange={(e) => setTempPreferences(prev => ({ ...prev, budgetMin: e.target.value }))}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#009FB8] focus:border-[#009FB8] transition text-sm"
                        placeholder="0"
                      />
                    </div>
                    <span className="text-[#999999] mt-5">-</span>
                    <div className="flex-1">
                      <label className="text-xs text-[#999999] mb-1 block">Max</label>
                      <input
                        type="number"
                        value={tempPreferences?.budgetMax || ''}
                        onChange={(e) => setTempPreferences(prev => ({ ...prev, budgetMax: e.target.value }))}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#009FB8] focus:border-[#009FB8] transition text-sm"
                        placeholder="10000"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs text-[#999999] mb-1 block">Currency</label>
                      <select
                        value={tempPreferences?.preferredCurrency || 'NGN'}
                        onChange={(e) => setTempPreferences(prev => ({ ...prev, preferredCurrency: e.target.value }))}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#009FB8] focus:border-[#009FB8] transition text-sm bg-white"
                      >
                        <option value="NGN">NGN</option>
                        <option value="USD">USD</option>
                        <option value="GBP">GBP</option>
                        <option value="EUR">EUR</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Priority Toggles */}
                <div className="space-y-4">
                  <label className="block text-sm font-medium text-[#333333]">
                    Prioritization
                  </label>
                  
                  {/* Prioritize Price Toggle */}
                  <button
                    onClick={() => setTempPreferences(prev => ({ 
                      ...prev, 
                      prioritizePrice: !prev.prioritizePrice,
                      // If turning on price, turn off quality if it was on
                      prioritizeQuality: !prev.prioritizePrice ? prev.prioritizeQuality : false
                    }))}
                    className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                      tempPreferences?.prioritizePrice 
                        ? 'bg-emerald-50 border-emerald-300 shadow-sm' 
                        : 'bg-white border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        tempPreferences?.prioritizePrice ? 'bg-emerald-100' : 'bg-gray-100'
                      }`}>
                        <FiDollarSign className={`text-lg ${
                          tempPreferences?.prioritizePrice ? 'text-emerald-600' : 'text-gray-400'
                        }`} />
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-[#1a1a1a] text-sm">Best Price</p>
                        <p className="text-xs text-[#666666]">Find the most affordable options</p>
                      </div>
                    </div>
                    {tempPreferences?.prioritizePrice ? (
                      <IoToggle className="text-3xl text-emerald-500" />
                    ) : (
                      <IoToggle className="text-3xl text-gray-300 rotate-180" />
                    )}
                  </button>

                  {/* Prioritize Quality Toggle */}
                  <button
                    onClick={() => setTempPreferences(prev => ({ 
                      ...prev, 
                      prioritizeQuality: !prev.prioritizeQuality,
                      // If turning on quality, turn off price if it was on
                      prioritizePrice: !prev.prioritizeQuality ? prev.prioritizePrice : false
                    }))}
                    className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                      tempPreferences?.prioritizeQuality 
                        ? 'bg-yellow-50 border-yellow-300 shadow-md' 
                        : 'bg-white border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        tempPreferences?.prioritizeQuality ? 'bg-yellow-100' : 'bg-gray-100'
                      }`}>
                        <FiStar className={`text-lg ${
                          tempPreferences?.prioritizeQuality ? 'text-yellow-600' : 'text-gray-400'
                        }`} />
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-[#1a1a1a] text-sm">Best Quality</p>
                        <p className="text-xs text-[#666666]">Find the highest rated products</p>
                      </div>
                    </div>
                    {tempPreferences?.prioritizeQuality ? (
                      <IoToggle className="text-3xl text-yellow-500" />
                    ) : (
                      <IoToggle className="text-3xl text-gray-300 rotate-180" />
                    )}
                  </button>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={savePreferences}
                    className="flex-1 bg-linear-to-r from-[#009FB8] to-[#006b7d] text-white py-3 rounded-xl font-semibold hover:shadow-lg transition"
                  >
                    Save Preferences
                  </button>
                  <button
                    onClick={closePreferencesModal}
                    className="flex-1 bg-white/60 backdrop-blur-sm text-[#666666] py-3 rounded-xl font-semibold hover:bg-white/80 transition border border-gray-200/50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Desktop Modal */}
          <div className="hidden md:flex items-center justify-center h-full p-4">
            <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl max-w-lg w-full p-8 border border-gray-200/50">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-xl font-bold text-[#1a1a1a]">Search Preferences</h3>
                  <p className="text-sm text-[#666666] mt-1">Customize your product recommendations</p>
                </div>
                <button
                  onClick={closePreferencesModal}
                  className="text-[#999999] hover:text-[#1a1a1a] transition p-1 hover:bg-gray-100 rounded-lg"
                >
                  <FiX className="text-2xl" />
                </button>
              </div>
              
              <div className="space-y-6">
                {/* Budget Range */}
                <div>
                  <label className="block text-sm font-medium text-[#333333] mb-3">
                    Budget Range
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <label className="text-xs text-[#999999] mb-1 block">Min</label>
                      <input
                        type="number"
                        value={tempPreferences?.budgetMin || ''}
                        onChange={(e) => setTempPreferences(prev => ({ ...prev, budgetMin: e.target.value }))}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#009FB8] focus:border-[#009FB8] transition text-sm"
                        placeholder="0"
                      />
                    </div>
                    <span className="text-[#999999] mt-5">-</span>
                    <div className="flex-1">
                      <label className="text-xs text-[#999999] mb-1 block">Max</label>
                      <input
                        type="number"
                        value={tempPreferences?.budgetMax || ''}
                        onChange={(e) => setTempPreferences(prev => ({ ...prev, budgetMax: e.target.value }))}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#009FB8] focus:border-[#009FB8] transition text-sm"
                        placeholder="10000"
                      />
                    </div>
                    <div className="w-24">
                      <label className="text-xs text-[#999999] mb-1 block">Currency</label>
                      <select
                        value={tempPreferences?.preferredCurrency || 'NGN'}
                        onChange={(e) => setTempPreferences(prev => ({ ...prev, preferredCurrency: e.target.value }))}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#009FB8] focus:border-[#009FB8] transition text-sm bg-white"
                      >
                        <option value="NGN">NGN</option>
                        <option value="USD">USD</option>
                        <option value="GBP">GBP</option>
                        <option value="EUR">EUR</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Priority Toggles */}
                <div className="space-y-4">
                  <label className="block text-sm font-medium text-[#333333]">
                    Prioritization
                  </label>
                  
                  {/* Prioritize Price Toggle */}
                  <button
                    onClick={() => setTempPreferences(prev => ({ 
                      ...prev, 
                      prioritizePrice: !prev.prioritizePrice,
                      prioritizeQuality: !prev.prioritizePrice ? prev.prioritizeQuality : false
                    }))}
                    className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                      tempPreferences?.prioritizePrice 
                        ? 'bg-emerald-50 border-emerald-300 shadow-md' 
                        : 'bg-white border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        tempPreferences?.prioritizePrice ? 'bg-emerald-100' : 'bg-gray-100'
                      }`}>
                        <FiDollarSign className={`text-lg ${
                          tempPreferences?.prioritizePrice ? 'text-emerald-600' : 'text-gray-400'
                        }`} />
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-[#1a1a1a] text-sm">Best Price</p>
                        <p className="text-xs text-[#666666]">Find the most affordable options</p>
                      </div>
                    </div>
                    {tempPreferences?.prioritizePrice ? (
                      <IoToggle className="text-3xl text-emerald-500" />
                    ) : (
                      <IoToggle className="text-3xl text-gray-300 rotate-180" />
                    )}
                  </button>

                  {/* Prioritize Quality Toggle */}
                  <button
                    onClick={() => setTempPreferences(prev => ({ 
                      ...prev, 
                      prioritizeQuality: !prev.prioritizeQuality,
                      prioritizePrice: !prev.prioritizeQuality ? prev.prioritizePrice : false
                    }))}
                    className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                      tempPreferences?.prioritizeQuality 
                        ? 'bg-yellow-50 border-yellow-300 shadow-md' 
                        : 'bg-white border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        tempPreferences?.prioritizeQuality ? 'bg-yellow-100' : 'bg-gray-100'
                      }`}>
                        <FiStar className={`text-lg ${
                          tempPreferences?.prioritizeQuality ? 'text-yellow-600' : 'text-gray-400'
                        }`} />
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-[#1a1a1a] text-sm">Best Quality</p>
                        <p className="text-xs text-[#666666]">Find the highest rated products</p>
                      </div>
                    </div>
                    {tempPreferences?.prioritizeQuality ? (
                      <IoToggle className="text-3xl text-yellow-500" />
                    ) : (
                      <IoToggle className="text-3xl text-gray-300 rotate-180" />
                    )}
                  </button>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={savePreferences}
                    className="flex-1 bg-linear-to-r from-[#009FB8] to-[#006b7d] text-white py-3 rounded-xl font-semibold hover:shadow-lg transition"
                  >
                    Save Preferences
                  </button>
                  <button
                    onClick={closePreferencesModal}
                    className="flex-1 bg-white/60 backdrop-blur-sm text-[#666666] py-3 rounded-xl font-semibold hover:bg-white/80 transition border border-gray-200/50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Overlay for mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-30 bg-black/30 backdrop-blur-xs md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div 
        ref={sidebarRef}
        className={`
          fixed inset-y-0 left-0 z-40 w-72 bg-white/90 backdrop-blur- shadow-2xl transform transition-all duration-300 ease-in-out border-r border-gray-200/50
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0 md:relative md:shadow-sm
          ${isSidebarCollapsed ? 'md:w-0 md:border-r-0 md:overflow-hidden md:-translate-x-full' : 'md:w-72'}
        `}
      >
        <div className="flex flex-col h-full w-72">
          {/* Brand */}
          <div className="p-5 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-">
                <img src="/logo.png" alt="" className='w-10 mb-1.5 h-10 bg-gray-90'/>

              <span className="text-2xl font-bold text-[#1a1a1a]">
                ttrixia
              </span>
            </Link>
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="hidden md:flex items-center justify-center text-[#666666] hover:text-[#009FB8] hover:bg-white/50 transition p-2.5 rounded-lg border border-gray-200/50"
              title={isSidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}
            >
              {isSidebarCollapsed ? <PiSidebarSimpleLight className="text-lg" /> : <PiSidebarSimpleLight className="text-lg" />}
            </button>
          </div>

          {/* Navigation Links */}
          <div className="px-4 pt-4 space-y-1 ">
            <button
              onClick={startNewChat}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[#009FB8]/15 text-[#009FB8] font-medium hover:bg-[#009FB8]/25 transition border border-[#009FB8]/20"
            >
              <FiPlus className="text-lg shrink-0" />
              New Chat
            </button>
            <Link
              to="/wishlist"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[#666666] hover:bg-gray-50 transition"
            >
              {/* <FiHeart className="text-lg shrink-0" /> */}
              <FaRegBookmark  className="text-lg shrink-0" />
              Wishlist
            </Link>
            <Link
              to="/"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[#666666] hover:bg-gray-50 transition"
            >
              <FiHome className="text-lg shrink-0" />
              Home
            </Link>
            <h3 className="text-xs font-semibold text-[#999999] uppercase tracking-wider mt-7">
              Chat History
            </h3>
          </div>

          {/* Chat History */}
          <div className="flex-1 overflow-y-auto neat-scrollbar px-4 py-0">
            {chatHistory.length === 0 ? (
              <p className="text-sm text-[#999999]">No chats yet</p>
            ) : (
              <div className="space-y-0.5">
                {chatHistory.map((chat) => (
                  <div
                    key={chat.id}
                    onClick={() => loadChat(chat)}
                    className="group flex items-center justify-between p-2 hover:bg-white/60 rounded-xl cursor-pointer transition border border-transparent hover:border-gray-200/50"
                  >
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      <span className="text-sm text-[#333333] truncate capitalize">{chat.title}</span>
                    </div>
                    <button
                      onClick={(e) => openDeleteModal(chat.id, e)}
                      className="text-[#999999] hover:text-red-500 opacity-0 group-hover:opacity-100 transition"
                    >
                      <FiTrash2 className="text-sm" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* User Profile */}
          <div className="p-4 border-t border-gray-200/50 bg-white/30">
            <div className="flex items-center gap-3 px-3  rounded-xl">
              <div className="w-9 h-9 rounded-full bg-linear-to-br from-[#009FB8] to-[#006b7d] flex items-center justify-center text-white font-semibold text-sm shrink-0">
                {user?.name?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-[#1a1a1a] truncate">{user?.name || 'User'}</p>
                <p className="text-xs text-[#999999] truncate">{user?.email}</p>
              </div>
              <button
                onClick={() => { logout(); navigate('/'); }}
                className="text-[#999999] hover:text-red-500 transition shrink-0"
              >
                <FiLogOut className="text-sm" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative z-10 min-w-0">
        {/* Header */}
        <div className="bg-linear-to-b from-white/50 via-white/30 to-[#0000] p-4 flex items-center gap-3 justify-between">
          <div className="flex items-center gap-3">
            
            {/* Desktop Sidebar Toggle */}
            <img onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} src="/logo.png" alt="" className={`w-10 h-10 mb-1.5 hidden md:block bg-gray-90 ${!isSidebarCollapsed ? 'md:hidden' : ''}`} />
            <div className={`flex items-center bg-white/70 rounded-full px-3  ${!isSidebarCollapsed ? 'hidden' : ''}`}>
              <button
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                className={`hidden md:flex items-center justify-center hover:text-[#666666] text-[#009FB8] cursor-pointer transition p-2.5 rounded-lg${!isSidebarCollapsed ? 'md:hidden' : ''}`}
                title={isSidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}
              >
                {/* <PiSidebarSimpleLight className='text-xl'/> */}
                <FiSidebar className='text-xl'/>
              </button>
              <Link to="/wishlist" className='p-3'>
                {/* <FiHeart className="text-lg text-[#009FB8]" /> */}
                <FaRegBookmark className="text-lg text-[#009FB8]" />
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden items-center justify-center text-[#666666] hover:text-[#009FB8] hover:bg-white/50 cursor-pointer transition rounded-full p-3"
            >
              <FiMenu className="text-2xl" />
            </button>
            
          </div>

          {/* Preferences Button - Right side of header */}
          <button
            onClick={openPreferencesModal}
            className="flex items-center gap-2 bg-white/70 hover:bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full border border-gray-200/70 shadow-sm hover:shadow-md transition-all group"
          >
            <FiSettings className="text-[#009FB8] group-hover:rotate-90 transition-transform duration-300" />
            <span className="text-sm font-medium text-[#333333] hidden sm:inline">Preferences</span>
            {/* {activePreferencesCount > 0 && (
              <span className="bg-[#009FB8] text-white text-xs px-2 py-0.5 rounded-full font-medium">
                {activePreferencesCount}
              </span>
            )} */}
          </button>
        </div>

        {/* Messages */}
        <div 
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto neat-scrollbar"
        >
          <div className="max-w-3xl mx-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center pb-40 justify-center text-center px-4 min-h-[60vh]">
                <div className={`w-40 h-40 flex items-center justify-center ${customFilters.length > 0 ? "mb-20" : ""}`}>
                  <img src="/logo.png" alt="" />
                </div>
                <div className={`${customFilters.length > 0 ? "hidden" : "block"}`}>
                  <h2 className="text-2xl font-bold text-[#1a1a1a] mb-2">
                    Welcome to Attrixia
                  </h2>
                  <p className="text-[#666666] max-w-md">
                    Add filters or type your requirements to get personalized product recommendations
                  </p>
                </div>
              </div>
            ) : (
              <>
                {messages.map((msg) => (
                  <div key={msg.id}>
                    {msg.type === 'user' ? (
                      <div className="flex justify-end">
                        <div className="bg-linear-to-br from-[#1a1a1a] to-[#333333] text-white rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-[80%] shadow-md border border-[#1a1a1a]/30">
                          <p className="text-sm leading-relaxed">{msg.content}</p>
                          
                          {/* Show filters dropdown only if there are filters */}
                          {((msg.customFilters && msg.customFilters.length > 0) || (msg.constantFilters && msg.constantFilters.length > 0)) && (
                            <div className="mt-2 pt-2 border-t border-white/20">
                              <button
                                onClick={() => toggleMessageExpansion(msg.id)}
                                className="flex items-center gap-1 text-xs text-white/70 hover:text-white transition w-full"
                              >
                                <FiFilter className="text-xs" />
                                <span>
                                  {(msg.customFilters?.length || 0) + (msg.constantFilters?.length || 0)} filters applied
                                </span>
                                <FiChevronDown 
                                  className={`ml-auto transition-transform duration-300 ${
                                    expandedMessageId === msg.id ? 'rotate-180' : ''
                                  }`}
                                />
                              </button>
                              
                              {/* Animated expandable filters section */}
                              <div 
                                className={`overflow-hidden transition-all duration-300 ease-in-out ${
                                  expandedMessageId === msg.id 
                                    ? 'max-h-96 opacity-100 mt-2' 
                                    : 'max-h-0 opacity-0'
                                }`}
                              >
                                <div className="space-y-1.5">
                                  {/* Custom Filters */}
                                  {msg.customFilters?.map((filter, idx) => (
                                    <div 
                                      key={`custom-${idx}`} 
                                      className="flex items-center gap-1.5 text-xs bg-white/10 rounded-full px-2 py-1 transform transition-all duration-200"
                                      style={{ transitionDelay: `${idx * 50}ms` }}
                                    >
                                      <span className="font-medium">{filter.name}:</span>
                                      <span className="text-white/80">{filter.value}</span>
                                      <span className="text-[10px] text-white/50 ml-1 bg-white/20 px-1.5 py-0.5 rounded-full">Custom</span>
                                    </div>
                                  ))}
                                  
                                  {/* Constant Preferences Filters */}
                                  {msg.constantFilters?.map((filter, idx) => (
                                    <div 
                                      key={`constant-${idx}`} 
                                      className="flex items-center gap-1.5 text-xs bg-white/10 rounded-full px-2 py-1 transform transition-all duration-200"
                                      style={{ transitionDelay: `${(msg.customFilters?.length || 0) * 50 + idx * 50}ms` }}
                                    >
                                      {filter.name === 'Budget Range' ? (
                                        <FiDollarSign className="text-[10px] text-emerald-300" />
                                      ) : (
                                        <FiStar className="text-[10px] text-yellow-300" />
                                      )}
                                      <span className="font-medium">{filter.name}:</span>
                                      <span className="text-white/80">{filter.value}</span>
                                      <span className="text-[10px] text-emerald-300 ml-1 bg-emerald-500/20 px-1.5 py-0.5 rounded-full">Preference</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-4">
                        <div className="bg-white/80 backdrop-blur-md rounded-2xl rounded-tl-sm px-4 py-3 max-w-[85%] shadow-md border border-gray-200/50">
                          <p className="text-sm text-[#333333] leading-relaxed">{msg.content}</p>
                        </div>
                        {msg.products && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
                            {msg.products.map((product) => (
                              <div
                                key={product.id}
                                onClick={() => handleProductClick(product)}
                                className="group bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden cursor-pointer hover:shadow-xl hover:border-[#009FB8]/30 transition-all duration-300 transform hover:-translate-y-1"
                              >
                                {/* Product Image with badges */}
                                <div className="relative h-48 overflow-hidden bg-linear-to-br from-gray-50 to-gray-100">
                                  <img 
                                    src={product.image} 
                                    alt={product.name}
                                    className="w-full h-full object-cover group-hover:scale-110 transition duration-500"
                                  />
                                  
                                  {/* Badges */}
                                  <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                                    {product.isBestPrice && (
                                      <span className="bg-emerald-500 text-white text-xs px-2.5 py-1 rounded-full font-medium shadow-lg flex items-center gap-1">
                                        <FiDollarSign className="text-xs" />
                                        Best Price
                                      </span>
                                    )}
                                    {product.isBestQuality && (
                                      <span className="bg-yellow-500 text-white text-xs px-2.5 py-1 rounded-full font-medium shadow-lg flex items-center gap-1">
                                        <FiStar className="text-xs" />
                                        Top Rated
                                      </span>
                                    )}
                                  </div>
                                </div>
                                
                                {/* Product Info */}
                                <div className="p-4">
                                  <h4 className="font-semibold text-[#1a1a1a] text-sm line-clamp-1 group-hover:text-[#009FB8] transition-colors mb-2">
                                    {product.name}
                                  </h4>
                                  
                                  <div className="flex items-center justify-between mb-3">
                                    <p className="text-[#009FB8] font-bold text-lg">
                                      {product.price}
                                    </p>
                                    <div className="flex items-center gap-1 bg-yellow-50 px-2 py-0.5 rounded-full">
                                      <IoMdStar className="text-yellow-500 text-sm" />
                                      <span className="text-xs font-medium text-yellow-700">{product.rating}</span>
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center gap-2 text-xs text-[#999999] flex-wrap">
                                    <span className="bg-gray-100 px-2 py-1 rounded-full">{product.ram}</span>
                                    <span className="bg-gray-100 px-2 py-1 rounded-full">
                                      {product.processor.split(' ').slice(0,2).join(' ')}
                                    </span>
                                  </div>
                                  
                                  {/* Preference Match Indicator */}
                                  {(product.isBestPrice || product.isBestQuality) && (
                                    <div className="mt-3 pt-3 border-t border-gray-100">
                                      <div className="flex items-center gap-1.5 text-xs">
                                        <FiTrendingUp className="text-[#009FB8]" />
                                        <span className="text-[#009FB8] font-medium">
                                          Matches your preferences
                                        </span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                {isTyping && (
                  <div className="flex items-center gap-2 text-[#999999]">
                    <div className="bg-white/80 backdrop-blur-md rounded-2xl rounded-tl-sm px-4 py-3 shadow-md border border-gray-200/50">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-linear-to-b from-[#009FB8] to-[#006b7d] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 bg-linear-to-b from-[#009FB8] to-[#006b7d] rounded-full animate-bounce" style={{ animationDelay: '200ms' }} />
                        <span className="w-2 h-2 bg-linear-to-b from-[#009FB8] to-[#006b7d] rounded-full animate-bounce" style={{ animationDelay: '400ms' }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>
        </div>

        {/* Input Container with Filters - Only show when no messages */}
        {messages.length === 0 && (
          <div className={`
            transition-all duration-500 ease-in-out mx-5 md:mx-10
            md:absolute md:inset-x-0 md:bottom-[25%] md:flex md:justify-center md:px-4
          `}>
            <div className="md:w-full md:max-w-4xl">
              {/* Filter Chips */}
              {customFilters.length > 0 && (
                <div className="pb-2">
                  <div className="flex flex-wrap gap-2">
                    {customFilters.map((filter, index) => (
                      <div
                        key={index}
                        className="bg-white/80 backdrop-blur-sm text-[#1a1a1a] px-3 py-1.5 rounded-full text-sm flex items-center gap-2 border border-gray-200/70 shadow-sm hover:shadow-md hover:border-[#009FB8]/30 transition-all group"
                      >
                        <span className="font-medium text-[#333333]">{filter.name}:</span>
                        <span className="text-[#666666]">{filter.value}</span>
                        <button
                          onClick={() => removeFilter(index)}
                          className="ml-1 text-[#999999] hover:text-red-500 transition-all hover:rotate-90 duration-300 group-hover:text-[#666666]"
                        >
                          <FiX className="text-sm" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Input Field */}
              <div className="pb-4">
                <div className="relative flex items-center bg-white/50 backdrop-blur-sm rounded-2xl border-2 border-gray-200/70 focus-within:border-[#009FB8]/50 focus-within:ring-2 focus-within:ring-[#009FB8]/20 focus-within:shadow-lg transition">
                  <button
                    onClick={openDrawer}
                    className="absolute left-3 text-[#999999] hover:text-[#009FB8] transition p-1 hover:bg-white/50 rounded-lg"
                  >
                    <FiPlus className="text-xl" />
                  </button>
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Ask Attrixia Agent (e.g., Find me a gaming laptop)"
                    className="w-full pl-12 pr-12 py-3.5 bg-transparent focus:outline-none text-[#333333] placeholder-[#999999]"
                  />
                  <button
                    onClick={handleSendMessage}
                    className={`absolute right-3 transition p-2 rounded-full ${
                      input.trim() || customFilters.length > 0 
                        ? 'text-[#009FB8] cursor-pointer hover:text-[#006b7d] bg-[#009FB8]/10' 
                        : 'text-[#949494] cursor-not-allowed bg-[#dad8d862]'
                    }`}
                    disabled={!input.trim() && customFilters.length === 0}
                  >
                    <IoArrowUp className={`text-xl `} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Filter Drawer/Modal */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50">
          <div 
            className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300"
            onClick={closeDrawer}
          />
          
          {/* Mobile Drawer */}
          <div className={`
            md:hidden absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md rounded-t-3xl shadow-2xl border-t border-gray-200/50
            transition-all duration-300 ease-in-out transform
            ${drawerClosing 
              ? 'translate-y-full' 
              : 'translate-y-0'
            }
          `}>
            <div className="p-6 pb-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-[#1a1a1a]">Add Custom Filter</h3>
                <button
                  onClick={closeDrawer}
                  className="text-[#999999] hover:text-[#1a1a1a] transition p-1 hover:bg-gray-100 rounded-lg"
                >
                  <FiX className="text-2xl" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#333333] mb-1.5">Filter Name</label>
                  <input
                    type="text"
                    value={filterName}
                    onChange={(e) => setFilterName(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200/70 bg-white/50 backdrop-blur-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-[#009FB8] focus:border-[#009FB8] transition"
                    placeholder="e.g., RAM, Processor, Price"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#333333] mb-1.5">Filter Value</label>
                  <input
                    type="text"
                    value={filterValue}
                    onChange={(e) => setFilterValue(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200/70 bg-white/50 backdrop-blur-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-[#009FB8] focus:border-[#009FB8] transition"
                    placeholder="e.g., 16GB, Core i7, 500K-600K"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={addFilter}
                    className="flex-1 bg-linear-to-r from-[#009FB8] to-[#006b7d] text-white py-3 rounded-xl font-semibold hover:shadow-lg transition"
                  >
                    Add Filter
                  </button>
                  <button
                    onClick={closeDrawer}
                    className="flex-1 bg-white/60 backdrop-blur-sm text-[#666666] py-3 rounded-xl font-semibold hover:bg-white/80 transition border border-gray-200/50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Desktop Modal */}
          <div className="hidden md:flex items-center justify-center h-full p-4">
            <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl max-w-md w-full p-8 border border-gray-200/50">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-[#1a1a1a]">Add Custom Filter</h3>
                <button
                  onClick={closeDrawer}
                  className="text-[#999999] hover:text-[#1a1a1a] transition p-1 hover:bg-gray-100 rounded-lg"
                >
                  <FiX className="text-2xl" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#333333] mb-1.5">Filter Name</label>
                  <input
                    type="text"
                    value={filterName}
                    onChange={(e) => setFilterName(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200/70 bg-white/50 backdrop-blur-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-[#009FB8] focus:border-[#009FB8] transition"
                    placeholder="e.g., RAM, Processor, Price"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#333333] mb-1.5">Filter Value</label>
                  <input
                    type="text"
                    value={filterValue}
                    onChange={(e) => setFilterValue(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200/70 bg-white/50 backdrop-blur-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-[#009FB8] focus:border-[#009FB8] transition"
                    placeholder="e.g., 16GB, Core i7, 500K-600K"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={addFilter}
                    className="flex-1 bg-linear-to-r from-[#009FB8] to-[#006b7d] text-white py-3 rounded-xl font-semibold hover:shadow-lg transition"
                  >
                    Add Filter
                  </button>
                  <button
                    onClick={closeDrawer}
                    className="flex-1 bg-white/60 backdrop-blur-sm text-[#666666] py-3 rounded-xl font-semibold hover:bg-white/80 transition border border-gray-200/50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIPage;