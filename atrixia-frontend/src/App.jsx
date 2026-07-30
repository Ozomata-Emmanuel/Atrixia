// src/App.jsx
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
  useNavigate,
} from "react-router-dom";
import Landing from "./pages/landing/Landing";
import NavBar from "./components/NavBar";
import Footer from "./components/Footer";
import HowItWorks from "./pages/landing/HowItWorks";
import SignUp from "./pages/auth/SignUp";
import SignIn from "./pages/auth/SignIn";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";
import AIPage from "./pages/ai/AIPage";
import ProductView from "./pages/ai/ProductView";
import Wishlist from "./pages/ai/Wishlist";
import { AuthProvider } from "./context/AuthContext";
import { useEffect } from "react";
import { setNavigate } from "./services/navigation";
import VerifyEmail from "./pages/auth/VerifyEmail";
import ProtectedRoute from "./components/ProtectedRoute";
import Forbidden from "./pages/Forbidden";
import PublicRoute from "./components/PublicRoute";
import NotFound from "./pages/NotFound";

function App() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    setNavigate(navigate);
  }, [navigate]);

  const NoNavOrFooterRoute = () => {
    const noNavRoutes = [
      "ai",
      "signup",
      "signin",
      "wishlist",
      "product",
      "verify-email",
      "reset-password",
      "forgot-password",
    ];
    // Check if current path matches any of the no-nav routes
    // OR if it's the catch-all route (NotFound)
    return noNavRoutes.some((route) => location.pathname.includes(route)) 
      || location.pathname === '/forbidden'
      || location.pathname === '/not-found'
      // Check if it's a 404 route (any route not matching known paths)
      || !['/', '/how-it-works', '/signup', '/signin', '/forgot-password', '/reset-password', '/verify-email', '/forbidden', '/ai', '/wishlist', '/product'].some(
        (route) => location.pathname === route || location.pathname.startsWith(route + '/')
      );
  };

  const NoFooterRoute = () => {
    const noNavRoutes = [
      "ai",
      "signup",
      "signin",
      "wishlist",
      "product",
      "verify-email",
      "reset-password",
      "forgot-password",
    ];
    // Same logic as NoNavOrFooterRoute
    return noNavRoutes.some((route) => location.pathname.includes(route)) 
      || location.pathname === '/forbidden'
      || location.pathname === '/not-found'
      || !['/', '/how-it-works', '/signup', '/signin', '/forgot-password', '/reset-password', '/verify-email', '/forbidden', '/ai', '/wishlist', '/product'].some(
        (route) => location.pathname === route || location.pathname.startsWith(route + '/')
      );
  };

  return (
    <div>
      {!NoNavOrFooterRoute() && <NavBar />}
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/how-it-works" element={<HowItWorks />} />
        <Route path="*" element={<NotFound />} />
        <Route 
          path="/signup"
          element={
            <PublicRoute>
              <SignUp />
            </PublicRoute>
          }
        />
        <Route 
          path="/signin"
          element={
            <PublicRoute>
              <SignIn />
            </PublicRoute>
          }
        />
        <Route 
          path="/forgot-password"
          element={
            <PublicRoute>
              <ForgotPassword />
            </PublicRoute>
          }
        />
        <Route 
          path="/reset-password"
          element={
            <PublicRoute>
              <ResetPassword />
            </PublicRoute>
          }
        />
        <Route 
          path="/verify-email"
          element={
            <PublicRoute>
              <VerifyEmail />
            </PublicRoute>
          }
        />
        <Route path="/forbidden" element={<Forbidden />} />

        {/* Protected routes */}
        <Route
          path="/ai"
          element={
            <ProtectedRoute>
              <AIPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/ai/:chatId"
          element={
            <ProtectedRoute>
              <AIPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/product/:productId"
          element={
            <ProtectedRoute>
              <ProductView />
            </ProtectedRoute>
          }
        />
        <Route
          path="/wishlist"
          element={
            <ProtectedRoute>
              <Wishlist />
            </ProtectedRoute>
          }
        />
      </Routes>
      {!NoFooterRoute() && <Footer />}
    </div>
  );
}

function AppMain() {
  return (
    <Router>
      <AuthProvider>
        <App />
      </AuthProvider>
    </Router>
  );
}

export default AppMain;