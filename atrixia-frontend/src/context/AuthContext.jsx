// context/AuthContext.jsx
import React, { createContext, useState, useContext } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('attrixia_user');
    return saved ? JSON.parse(saved) : null;
  });

  const login = (email, password) => {
    const userData = { email, name: email.split('@')[0] };
    setUser(userData);
    localStorage.setItem('attrixia_user', JSON.stringify(userData));
    return true;
  };

  const signup = (email, password) => {
    const userData = { email, name: email.split('@')[0] };
    setUser(userData);
    localStorage.setItem('attrixia_user', JSON.stringify(userData));
    return true;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('attrixia_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};