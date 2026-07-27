// pages/ai/AIPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  FiPlus, FiX, FiSend, FiMenu, FiUser, FiHeart, 
  FiLogOut, FiMessageSquare, FiTrash2, FiHome, FiChevronLeft, FiChevronRight
} from 'react-icons/fi';
import { PiSidebarSimpleLight } from "react-icons/pi";
import { mockProducts } from '../../data/mockData';
import { ChatMessageSkeleton } from '../../components/LoadingSkeleton';
import { IoArrowUp } from "react-icons/io5";

const AIPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [filters, setFilters] = useState([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerClosing, setDrawerClosing] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [filterName, setFilterName] = useState('');
  const [filterValue, setFilterValue] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const sidebarRef = useRef(null);

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

  const addFilter = () => {
    if (filterName.trim() && filterValue.trim()) {
      setFilters([...filters, { name: filterName, value: filterValue }]);
      setFilterName('');
      setFilterValue('');
      closeDrawer();
    }
  };

  const removeFilter = (index) => {
    setFilters(filters.filter((_, i) => i !== index));
  };

  const handleSendMessage = () => {
    if (!input.trim() && filters.length === 0) return;

    let userMessage = input.trim();
    if (filters.length > 0) {
      const filterText = filters.map(f => `${f.name}: ${f.value}`).join(', ');
      userMessage = userMessage ? `${userMessage} (Filters: ${filterText})` : `Looking for products with: ${filterText}`;
    }

    const newMessage = { 
      id: Date.now(), 
      type: 'user', 
      content: userMessage 
    };
    setMessages(prev => [...prev, newMessage]);
    setInput('');
    setIsTyping(true);

    setTimeout(() => {
      const aiResponse = {
        id: Date.now() + 1,
        type: 'ai',
        content: `Based on your requirements, I've found ${mockProducts.length} products that match your criteria. Here are the best options for you:`,
        products: mockProducts
      };
      setMessages(prev => [...prev, aiResponse]);
      setIsTyping(false);
      
      const newChat = {
        id: Date.now(),
        title: userMessage.slice(0, 30) + (userMessage.length > 30 ? '...' : ''),
        timestamp: new Date().toISOString(),
        messages: [...messages, newMessage, aiResponse]
      };
      const updatedHistory = [newChat, ...chatHistory];
      setChatHistory(updatedHistory);
      localStorage.setItem('attrixia_chat_history', JSON.stringify(updatedHistory));
    }, 1500);
  };

  const loadChat = (chat) => {
    setMessages(chat.messages);
    setIsSidebarOpen(false);
  };

  const deleteChat = (id, e) => {
    e.stopPropagation();
    const updatedHistory = chatHistory.filter(chat => chat.id !== id);
    setChatHistory(updatedHistory);
    localStorage.setItem('attrixia_chat_history', JSON.stringify(updatedHistory));
    if (messages.length > 0) {
      setMessages([]);
    }
  };

  const startNewChat = () => {
    setMessages([]);
    setFilters([]);
    setIsSidebarOpen(false);
  };

  const handleProductClick = (product) => {
    navigate(`/product/${product.id}`, { state: { product } });
  };

  return (
    <div className="relative h-screen flex bg-[#f5f5f5] overflow-hidden">
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
                    ? `hsla(${Math.random() * 360}, 80%, 60%, 0.12)`
                    : "transparent",
              }}
            />
          ))}
        </div>
      </div>

      {/* Overlay for mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-30 bg-black/30 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div 
        ref={sidebarRef}
        className={`
          fixed inset-y-0 left-0 z-40 w-72 bg-white/90 backdrop-blur-md shadow-2xl transform transition-all duration-300 ease-in-out border-r border-gray-200/50
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0 md:relative md:shadow-sm
          ${isSidebarCollapsed ? 'md:w-0 md:border-r-0 md:overflow-hidden md:-translate-x-full' : 'md:w-72'}
        `}
      >
        <div className="flex flex-col h-full w-72">
          {/* Brand */}
          <div className="p-5 flex items-center justify-between border-b border-gray-200/50 bg-white/50">
            <Link to="/" className="flex items-center gap-2">
                {/* <img src="/logo.png" alt="" className='w-20 h-20'/> */}

              <span className="text-2xl font-bold text-[#1a1a1a]">
                Attrix<span className="text-[#009FB8]">ia</span>
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
          <div className="p-4 border-b border-gray-200/50 space-y-1 bg-white/30">
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
              <FiHeart className="text-lg shrink-0" />
              Wishlist
            </Link>
            <Link
              to="/"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[#666666] hover:bg-gray-50 transition"
            >
              <FiHome className="text-lg shrink-0" />
              Home
            </Link>
          </div>

          {/* Chat History */}
          <div className="flex-1 overflow-y-auto neat-scrollbar p-4">
            <h3 className="text-xs font-semibold text-[#999999] uppercase tracking-wider mb-3">
              Chat History
            </h3>
            {chatHistory.length === 0 ? (
              <p className="text-sm text-[#999999]">No chats yet</p>
            ) : (
              <div className="space-y-1">
                {chatHistory.map((chat) => (
                  <div
                    key={chat.id}
                    onClick={() => loadChat(chat)}
                    className="group flex items-center justify-between p-2.5 hover:bg-white/60 rounded-xl cursor-pointer transition border border-transparent hover:border-gray-200/50"
                  >
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      <FiMessageSquare className="text-[#999999] shrink-0 text-sm" />
                      <span className="text-sm text-[#333333] truncate">{chat.title}</span>
                    </div>
                    <button
                      onClick={(e) => deleteChat(chat.id, e)}
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
          <div className="p-4 border-t border-gray-200/50 bg-white/50">
            <div className="flex items-center gap-3 bg-white/60 backdrop-blur-sm px-3 py-2.5 rounded-xl border border-gray-200/50">
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
        {/* Header - Always visible on mobile, conditional on desktop */}
        <div className="bg-linear-to-b from-white/50 via-white/30 to-[#0000] p-4 flex items-center gap-3 justify-between">
          <div className="flex items-center gap-3">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden items-center justify-center text-[#666666] hover:text-[#009FB8] hover:bg-white/50 cursor-pointer transition p-2.5 rounded-lg border border-gray-200/50"
            >
              <FiMenu className="text-xl" />
            </button>
            
            {/* Desktop Sidebar Toggle */}
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className={`hidden md:flex items-center justify-center text-[#666666] hover:text-[#009FB8] hover:bg-white/50 cursor-pointer transition p-2.5 rounded-lg border border-gray-200/50 ${!isSidebarCollapsed ? 'md:hidden' : ''}`}
              title={isSidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}
            >
              <PiSidebarSimpleLight className='text-xl'/>
            </button>
            
            <h1 className="text-lg font-serif-brand font-bold text-[#1a1a1a]">
              Attrix<span className="text-[#009FB8]">ia</span>
            </h1>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto neat-scrollbar max-w-3xl mx-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center pb-40 justify-center text-center px-4">
              <div className="w-40 h-40 flex items-center justify-center">
                <img src="/logo.png" alt="" />
              </div>
              <h2 className="text-2xl font-bold text-[#1a1a1a] mb-2">
                Welcome to Attrixia
              </h2>
              <p className="text-[#666666] max-w-md">
                Add filters or type your requirements to get personalized product recommendations
              </p>
            </div>
          ) : (
            <>
              {messages.map((msg) => (
                <div key={msg.id}>
                  {msg.type === 'user' ? (
                    <div className="flex justify-end">
                      <div className="bg-linear-to-br from-[#1a1a1a] to-[#333333] text-white rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-[80%] shadow-md border border-[#1a1a1a]/30">
                        <p className="text-sm leading-relaxed">{msg.content}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4">
                      <div className="bg-white/80 backdrop-blur-md rounded-2xl rounded-tl-sm px-4 py-3 max-w-[85%] shadow-md border border-gray-200/50">
                        <p className="text-sm text-[#333333] leading-relaxed">{msg.content}</p>
                      </div>
                      {msg.products && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-2">
                          {msg.products.map((product) => (
                            <div
                              key={product.id}
                              onClick={() => handleProductClick(product)}
                              className="bg-white/70 backdrop-blur-md rounded-xl shadow-md border border-gray-200/50 overflow-hidden cursor-pointer hover:shadow-lg hover:border-[#009FB8]/30 transition group"
                            >
                              <div className="relative h-44 overflow-hidden bg-gray-100">
                                <img 
                                  src={product.image} 
                                  alt={product.name}
                                  className="w-full h-full object-cover group-hover:scale-110 transition duration-500"
                                />
                              </div>
                              <div className="p-4">
                                <h4 className="font-semibold text-[#1a1a1a] text-sm line-clamp-1 group-hover:text-[#009FB8] transition">{product.name}</h4>
                                <p className="text-[#009FB8] font-bold mt-1">{product.price}</p>
                                <div className="flex items-center gap-2 text-xs text-[#999999] mt-2">
                                  <span>⭐ {product.rating}</span>
                                  <span>•</span>
                                  <span>{product.ram}</span>
                                  <span>•</span>
                                  <span>{product.processor.split(' ').slice(0,2).join(' ')}</span>
                                </div>
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

        {/* Input Container with Filters - Always connected */}
        <div className={`
          transition-all duration-500 ease-in-out mx-5 md:mx-10
          ${messages.length === 0 
            ? 'md:absolute md:inset-x-0 md:bottom-[25%] md:flex md:justify-center md:px-4' 
            : ''
          }
        `}>
          <div className={`
            ${messages.length === 0 
              ? 'md:w-full md:max-w-4xl' 
              : 'max-w-4xl mx-auto px-4'
            }
          `}>
            {/* Filter Chips - Always above input */}
            {filters.length > 0 && (
              <div className="pb-2">
                <div className="flex flex-wrap gap-2">
                  {filters.map((filter, index) => (
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
              <div className="relative flex items-center bg-white/50 backdrop-blur-sm rounded-2xl border border-gray-200/70 focus-within:border-[#009FB8]/50 focus-within:ring-2 focus-within:ring-[#009FB8]/20 focus-within:shadow-lg transition">
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
                    input.trim() || filters.length > 0 
                      ? 'text-[#009FB8] cursor-pointer hover:text-[#006b7d] hover:bg-[#009FB8]/10' 
                      : 'text-[#cccccc] cursor-not-allowed'
                  }`}
                  disabled={!input.trim() && filters.length === 0}
                >
                  <IoArrowUp className="text-xl" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Drawer/Modal */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50">
          <div 
            className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300"
            onClick={closeDrawer}
          />
          
          {/* Mobile Drawer with slide animation */}
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