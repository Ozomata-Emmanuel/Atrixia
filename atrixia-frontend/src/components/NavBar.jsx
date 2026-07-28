// components/Navbar.jsx
import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FiHeart, FiLogOut, FiMenu, FiX } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/');
    setIsOpen(false);
  };

  const navLinks = [
    { id: "how-it-works", label: "How It Works", link: "/how-it-works" },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50">
      <div className="mx-4 mt-4">
        <div className="max-w-7xl mx-auto bg-white/20 backdrop-blur-xs rounded-2xl border border-gray-100/50 shadow-sm">
          <div className="pr-4 pl-7 py-3">
            <div className="flex items-center justify-between">
              <Link to="/" className="flex items-center space-x-2">
                <span className="text-xl font-bold text-[#1a1a1a] flex items-center">
                  <img src="/logo.png" className='w-10 h-10' alt="" />
                  ttrixia
                </span>
              </Link>

              <div className="flex items-center gap-10">
                <div className="hidden lg:flex items-center gap-1">
                  {user ? (
                    <>
                      <Link
                        to="/ai"
                        className={`relative px-4 py-2 rounded-xl text-sm tracking-wide transition-all ${
                          location.pathname === "/ai"
                            ? "text-[#1a1a1a] font-medium"
                            : "text-[#8a8a8a] hover:text-[#3a3a3a] hover:bg-[#f5f5f5]"
                        }`}
                      >
                        AI Assistant
                        {location.pathname === "/ai" && (
                          <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-[#1a1a1a] rounded-full" />
                        )}
                      </Link>
                      <Link
                        to="/wishlist"
                        className={`relative px-4 py-2 rounded-xl text-sm tracking-wide transition-all ${
                          location.pathname === "/wishlist"
                            ? "text-[#1a1a1a] font-medium"
                            : "text-[#8a8a8a] hover:text-[#3a3a3a] hover:bg-[#f5f5f5]"
                        }`}
                      >
                        <FiHeart className="text-lg" />
                        {location.pathname === "/wishlist" && (
                          <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-[#1a1a1a] rounded-full" />
                        )}
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="px-4 py-2 rounded-xl text-sm tracking-wide text-[#8a8a8a] hover:text-red-500 hover:bg-red-50 transition-all flex items-center gap-2"
                      >
                        <FiLogOut className="text-lg" />
                        Logout
                      </button>
                    </>
                  ) : (
                    <>
                      {navLinks.map((link) => (
                        <Link
                          to={link.link}
                          key={link.id}
                          className={`relative px-4 py-2 rounded-xl text-sm tracking-wide transition-all ${
                            location.pathname === link.link
                              ? "text-[#1a1a1a] font-medium"
                              : "text-[#8a8a8a] hover:text-[#3a3a3a] hover:bg-[#f5f5f5]"
                          }`}
                        >
                          {link.label}
                          {location.pathname === link.link && (
                            <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-[#1a1a1a] rounded-full" />
                          )}
                        </Link>
                      ))}
                      <Link
                        to="/signin"
                        className={`relative px-4 py-2 rounded-xl text-sm tracking-wide transition-all ${
                          location.pathname === "/signin"
                            ? "text-[#1a1a1a] font-medium"
                            : "text-[#8a8a8a] hover:text-[#3a3a3a] hover:bg-[#f5f5f5]"
                        }`}
                      >
                        Sign In
                        {location.pathname === "/signin" && (
                          <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-[#1a1a1a] rounded-full" />
                        )}
                      </Link>
                    </>
                  )}
                </div>

                {!user && (
                  <Link
                    to="/signup"
                    className="hidden lg:flex items-center gap-2 px-4 py-2 bg-linear-to-r from-[#017283] to-[#405a5f] text-white rounded-xl text-sm font-medium hover:bg-[#333333] transition-all"
                  >
                    Get Started
                  </Link>
                )}
              </div>

              <button
                onClick={() => setIsOpen(!isOpen)}
                className="lg:hidden p-2 rounded-xl hover:bg-[#f5f5f5] transition-colors"
              >
                {isOpen ? <FiX className="text-xl" /> : <FiMenu className="text-xl" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="mx-4 mt-2 lg:hidden">
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl border border-gray-100/50 shadow-lg p-4">
            <div className="space-y-1">
              {user ? (
                <>
                  <Link
                    to="/ai"
                    onClick={() => setIsOpen(false)}
                    className={`block w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                      location.pathname === "/ai"
                        ? "bg-[#1a1a1a] text-white"
                        : "text-[#3a3a3a] hover:bg-[#f5f5f5]"
                    }`}
                  >
                    AI Assistant
                  </Link>
                  <Link
                    to="/wishlist"
                    onClick={() => setIsOpen(false)}
                    className={`block w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                      location.pathname === "/wishlist"
                        ? "bg-[#1a1a1a] text-white"
                        : "text-[#3a3a3a] hover:bg-[#f5f5f5]"
                    }`}
                  >
                    Wishlist
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-3 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-all"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  {navLinks.map((link) => (
                    <Link
                      to={link.link}
                      key={link.id}
                      onClick={() => setIsOpen(false)}
                      className={`block w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                        location.pathname === link.link
                          ? "bg-[#1a1a1a] text-white"
                          : "text-[#3a3a3a] hover:bg-[#f5f5f5]"
                      }`}
                    >
                      {link.label}
                    </Link>
                  ))}
                  <Link
                    to="/signin"
                    onClick={() => setIsOpen(false)}
                    className={`block w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                      location.pathname === "/signin"
                        ? "bg-[#1a1a1a] text-white"
                        : "text-[#3a3a3a] hover:bg-[#f5f5f5]"
                    }`}
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/signup"
                    onClick={() => setIsOpen(false)}
                    className="block w-full mt-2 px-4 py-3 bg-linear-to-r from-[#017283] to-[#405a5f] text-white rounded-xl text-sm font-medium text-center"
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;