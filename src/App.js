import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import styled from 'styled-components';
import GlobalStyles from './styles/GlobalStyles';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import Statistics from './pages/Statistics';
import News from './pages/News';
import Landing from './pages/Landing';
import Footer from './components/Footer';
import WhaleBackground from './components/Background';

const AppContainer = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  position: relative;
`;

const MainContent = styled.main`
  flex: 1;
  position: relative;
`;

// Protected route component
const ProtectedRoute = ({ children }) => {
  // This is a simple mock of authentication - in a real app you'd check a token or session
  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
  
  if (!isAuthenticated) {
    // Redirect to landing page if not authenticated
    return <Navigate to="/" replace />;
  }
  
  return children;
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(
    localStorage.getItem('isAuthenticated') === 'true'
  );

  // Mock login/logout functions
  const login = () => {
    localStorage.setItem('isAuthenticated', 'true');
    setIsAuthenticated(true);
  };

  const logout = () => {
    localStorage.setItem('isAuthenticated', 'false');
    setIsAuthenticated(false);
  };

  // Set as a global function for demo purposes
  window.sonarLogin = login;
  window.sonarLogout = logout;

  // Set the document title
  useEffect(() => {
    document.title = 'Sonar - Cryptocurrency Dashboard';
  }, []);

  return (
    <Router>
      <AppContainer>
        <GlobalStyles />
        
        {/* Only show the navbar for authenticated routes */}
        {isAuthenticated && <Navbar onLogout={logout} />}
        
        {/* Add whale background for all authenticated routes */}
        {isAuthenticated && <WhaleBackground intensity="low" />}
        
        <MainContent>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/statistics" 
              element={
                <ProtectedRoute>
                  <Statistics />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/news" 
              element={
                <ProtectedRoute>
                  <News />
                </ProtectedRoute>
              } 
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </MainContent>
        
        {/* Show footer everywhere */}
        <Footer />
      </AppContainer>
    </Router>
  );
}

export default App; 