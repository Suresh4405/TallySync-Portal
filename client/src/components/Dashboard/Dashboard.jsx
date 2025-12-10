import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  CircularProgress,
  Chip,
} from '@mui/material';
import { alpha } from '@mui/material/styles';

import SyncIcon from '@mui/icons-material/Sync';
import LedgerIcon from '@mui/icons-material/AccountBalance';
import InvoiceIcon from '@mui/icons-material/Receipt';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import ErrorIcon from '@mui/icons-material/Error';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingIcon from '@mui/icons-material/Pending';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';

import MainLayout from '../Layout/MainLayout';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';


const Dashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsResponse] = await Promise.all([
        api.get('/tally/dashboard-stats'),
      ]);
      setStats(statsResponse.data.data);
    } catch (error) {
      toast.error('Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async (type) => {
    setSyncing(true);
    try {
      let response;
      if (type === 'ledgers') {
        response = await api.post('/tally/sync/ledgers');
      } else {
        response = { data: { success: true, message: 'Please create invoices from Invoices page' } };
      }
      toast.success(response.data.message || 'Sync completed successfully');
      fetchDashboardData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const StatCard = ({ title, value, icon, color, trend, subtitle }) => (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography variant="h6" color="text.secondary" gutterBottom component="div">
              {title}
            </Typography>
            <Typography variant="h3" fontWeight="bold" component="div">
              {value}
            </Typography>
           {trend && (
  <Chip
    label={trend}
    size="small"
    sx={{ mt: 1 }}
    color={trend.includes('+') ? 'success' : 'error'}
    icon={trend.includes('+') ? <ArrowUpwardIcon /> : <ArrowDownwardIcon />}
  />
)}

          </Box>
          <Box
            sx={{
              p: 2,
              borderRadius: 3,
              bgcolor: alpha(color, 0.1),
              color: color,
            }}
          >
            {icon}
          </Box>
        </Box>
        {subtitle && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }} component="div">
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <MainLayout>
        <Box display="flex" justifyContent="center" alignItems="center" height="80vh">
          <CircularProgress />
        </Box>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          Welcome back, {user?.username}
        </Typography>

        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%' }}>
              <CardContent sx={{ textAlign: 'center', py: 4 }}>
                <Box
                  sx={{
                    width: 80,
                    height: 80,
                    borderRadius: '50%',
                    bgcolor: 'primary.light',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mx: 'auto',
                    mb: 3,
                  }}
                >
                  <LedgerIcon sx={{ fontSize: 40, color: 'primary.main' }} />
                </Box>
                <Typography variant="h6" gutterBottom fontWeight="bold" component="div">
                  Sync Ledgers
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph component="div">
                  sync ledger data from Tally to dashboard
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<SyncIcon />}
                  onClick={() => handleSync('ledgers')}
                  disabled={syncing || !['admin', 'accountant'].includes(user?.role)}
                  fullWidth
                  sx={{ py: 1.5 }}
                >
                  {syncing ? 'Syncing...' : 'Sync from Tally'}
                </Button>
                {!['admin', 'accountant'].includes(user?.role) && (
                  <Typography variant="caption" color="warning.main" sx={{ mt: 1, display: 'block' }} component="div">
                    Analyst role: View only
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%' }}>
              <CardContent sx={{ textAlign: 'center', py: 4 }}>
                <Box
                  sx={{
                    width: 80,
                    height: 80,
                    borderRadius: '50%',
                    bgcolor: 'secondary.light',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mx: 'auto',
                    mb: 3,
                  }}
                >
                  <InvoiceIcon sx={{ fontSize: 40, color: 'secondary.main' }} />
                </Box>
                <Typography variant="h6" gutterBottom fontWeight="bold" component="div">
                  Manage Invoices
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph component="div">
                  Create and sync invoices with Tally ERP
                </Typography>
                <Button
                  variant="contained"
                  color="secondary"
                  startIcon={<InvoiceIcon />}
                  onClick={() => window.location.href = '/invoices'}
                  disabled={!['admin', 'accountant'].includes(user?.role)}
                  fullWidth
                  sx={{ py: 1.5 }}
                >
                  Go to Invoices
                </Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%' }}>
              <CardContent sx={{ textAlign: 'center', py: 4 }}>
                <Box
                  sx={{
                    width: 80,
                    height: 80,
                    borderRadius: '50%',
                    bgcolor: 'success.light',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mx: 'auto',
                    mb: 3,
                  }}
                >
                  <TrendingUpIcon sx={{ fontSize: 40, color: 'success.main' }} />
                </Box>
                <Typography variant="h6" gutterBottom fontWeight="bold" component="div">
                  View Analytics
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph component="div">
                  Visual insights and financial reports
                </Typography>
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<TrendingUpIcon />}
                  onClick={() => window.location.href = '/analytics'}
                  fullWidth
                  sx={{ py: 1.5 }}
                >
                  View Analytics
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Typography variant="h5" fontWeight="bold" gutterBottom sx={{ mb: 3 }} component="div">
          Overview
        </Typography>

        {stats && (
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Total Ledgers"
                value={stats.stats.totalLedgers || 0}
                icon={<LedgerIcon sx={{ fontSize: 40 }} />}
                color="#2196f3"
                trend="+12%"
                subtitle="ledger status"
              />
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Total Invoices"
                value={stats.stats.totalInvoices || 0}
                icon={<InvoiceIcon sx={{ fontSize: 40 }} />}
                color="#f50057"
                trend="+8%"
                subtitle="Invoice status"
              />
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Total Amount"
                value={`₹${(stats.stats.totalInvoiceAmount || 0).toLocaleString()}`}
                icon={<TrendingUpIcon sx={{ fontSize: 40 }} />}
                color="#ff9800"
                trend="+15%"
                subtitle="Revenue growth"
              />
            </Grid>
          </Grid>
        )}
      </Box>
    </MainLayout>
  );
};

export default Dashboard;
