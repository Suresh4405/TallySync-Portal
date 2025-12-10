import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Box, CircularProgress, Typography } from '@mui/material';

const LoadingScreen = () => (
  <Box
    sx={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    }}
  >
    <Box sx={{ textAlign: 'center', color: 'white' }}>
      <CircularProgress 
        size={60} 
        thickness={4}
        sx={{ 
          color: 'white',
          mb: 3
        }}
      />
      <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
        Loading Dashboard...
      </Typography>
      <Typography variant="body2" sx={{ mt: 1, opacity: 0.8 }}>
        Please wait while we prepare your workspace
      </Typography>
    </Box>
  </Box>
);

const ProtectedRoute = ({ children, requiredRole }) => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;