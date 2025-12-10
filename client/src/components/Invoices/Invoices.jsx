import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  Chip,
  Grid,
  Typography,
  Card,
  CardContent,
  LinearProgress,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  Stack,
  Avatar,
  InputAdornment,  CircularProgress,
  
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Receipt as InvoiceIcon,
  Visibility as ViewIcon,
  FileDownload as DownloadIcon,
  CalendarMonth as CalendarIcon,
  FilterList as FilterIcon,
  CheckCircle,
  Pending,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import MainLayout from '../Layout/MainLayout';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import InvoiceForm from './InvoiceForm';

const Invoices = () => {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState('');
  const [openForm, setOpenForm] = useState(false);
  const [viewInvoice, setViewInvoice] = useState(null);
  const [dateRange, setDateRange] = useState([null, null]);
  const [syncStatus, setSyncStatus] = useState('');
  const [stats, setStats] = useState(null);
  const [ledgers, setLedgers] = useState([]);

  useEffect(() => {
    fetchInvoices();
    fetchLedgers();
  }, [page, rowsPerPage, search, dateRange, syncStatus]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const params = {
        page: page + 1,
        limit: rowsPerPage,
        search,
        sortBy: 'date',
        sortOrder: 'DESC',
      };

      if (dateRange[0]) params.startDate = dateRange[0].toISOString().split('T')[0];
      if (dateRange[1]) params.endDate = dateRange[1].toISOString().split('T')[0];
      if (syncStatus) params.sync_status = syncStatus;

      const response = await api.get('/tally/invoices', { params });
      setInvoices(response.data.data.invoices);
      setStats(response.data.data.totals);
    } catch (error) {
      toast.error('Failed to fetch invoices');
    } finally {
      setLoading(false);
    }
  };

  const fetchLedgers = async () => {
    try {
      const response = await api.get('/tally/ledgers');
      setLedgers(response.data.data.ledgers);
    } catch (error) {
      console.error('failed to get  ledgers');
    }
  };

  const handlePageChange = (event, newPage) => {
    setPage(newPage);
  };

  const handleRowsPerPageChange = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'success': return 'success';
      case 'failed': return 'error';
      case 'pending': return 'warning';
      default: return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success': return <CheckCircle fontSize="small" />;
      case 'failed': return <ErrorIcon fontSize="small" />;
      case 'pending': return <Pending fontSize="small" />;
      default: return null;
    }
  };

  const isAdmin = user?.role === 'admin';
  const isAccountant = user?.role === 'accountant';

  return (
    <MainLayout>
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Invoice Management
          </Typography>
          
          <Card sx={{ mb: 3, background: 'linear-gradient(135deg, #6172c0ff 0%, #5a68b6ff 100%)', color: 'white' }}>
            <CardContent>
              <Grid container alignItems="center" justifyContent="space-between">
                <Grid item>
                  <Box display="flex" alignItems="center" gap={3}>
                    <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 60, height: 60 }}>
                      <InvoiceIcon sx={{ fontSize: 32 }} />
                    </Avatar>
                    <Box>
                      <Typography variant="h5" fontWeight="bold">
                        Total Invoices: {stats?.total_invoices || 0}
                      </Typography>
                      <Typography variant="body2" sx={{ opacity: 0.9 }}>
                        Total Amount: ₹{(stats?.grand_total || 0).toLocaleString()}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
                <Grid item>
                  {(isAdmin || isAccountant) && (
                    <Button
                      variant="contained"
                      color="primary"
                      startIcon={<AddIcon />}
                      onClick={() => setOpenForm(true)}
                      sx={{ 
                        background: 'white',
                        color: 'secondary.main',
                        '&:hover': { background: 'rgba(255,255,255,0.9)' }
                      }}
                    >
                      Create Invoice
                    </Button>
                  )}
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          <TableContainer component={Paper} sx={{ borderRadius: 1, overflow: 'hidden' }} >
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: '#2196f3' }}>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold', py: 2 }}>INVOICE</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold', py: 2 }}>DATE</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold', py: 2 }}>PARTY</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold', py: 2 }}>AMOUNT</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold', py: 2 }}>TYPE</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold', py: 2 }}>ACTIONS</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Box py={4}>
                        <CircularProgress />
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : invoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Box py={6} textAlign="center">
                        <InvoiceIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2, opacity: 0.5 }} />
                        <Typography color="text.secondary">
                          No invoices found
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Try creating a new invoice or adjust your filters
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : (
                  invoices.map((invoice) => (
                    <TableRow 
                      key={invoice.id} 
                      hover
                      sx={{ 
                        '&:hover': { bgcolor: 'action.hover' },
                        borderBottom: '1px solid',
                        borderColor: 'divider'
                      }}
                    >
                      <TableCell>
                        <Box>
                          <Typography fontWeight="bold">
                            {invoice.voucher_number}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {invoice.narration?.substring(0, 50) || 'No narration'}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography>
                          {new Date(invoice.date).toLocaleDateString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography fontWeight="medium">
                          {invoice.party_ledger_name}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography fontWeight="bold" color="primary">
                            ₹{invoice.total_amount.toLocaleString()}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Tax: ₹{invoice.tax_amount?.toLocaleString() || 0}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={invoice.voucher_type} 
                          size="small" 
                          color="primary"
                          variant="outlined"
                          sx={{ borderRadius: 1 }}
                        />
                      </TableCell>
                      
                      <TableCell>
                        <Stack direction="row" spacing={1}>
                          <Tooltip title="View Details">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => setViewInvoice(invoice)}
                            >
                              <ViewIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <TablePagination
              rowsPerPageOptions={[5, 10, 25]}
              component="div"
              count={invoices.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handlePageChange}
              onRowsPerPageChange={handleRowsPerPageChange}
              sx={{ borderTop: '1px solid', borderColor: 'divider' }}
            />
          </TableContainer>
        </Box>

        <Dialog
          open={openForm}
          onClose={() => setOpenForm(false)}
          maxWidth="md"
          fullWidth
          PaperProps={{ sx: { borderRadius: 1 } }}
        >
          <DialogTitle sx={{ bgcolor: '#2196f3', color: 'white' }}>
            Create New Invoice
          </DialogTitle>
          <DialogContent sx={{ p: 3 }}>
            <InvoiceForm
              ledgers={ledgers}
              onSuccess={() => {
                setOpenForm(false);
                fetchInvoices();
              }}
              onCancel={() => setOpenForm(false)}
            />
          </DialogContent>
        </Dialog>

        {viewInvoice && (
          <Dialog
            open={!!viewInvoice}
            onClose={() => setViewInvoice(null)}
            maxWidth="sm"
            fullWidth
            PaperProps={{ sx: { borderRadius: 3 } }}
          >
            <DialogTitle>
              Invoice Details
            </DialogTitle>
            <DialogContent>
              <Stack spacing={3} sx={{ mt: 2 }}>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Voucher Number
                    </Typography>
                    <Typography variant="body1" fontWeight="bold">
                      {viewInvoice.voucher_number}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Date
                    </Typography>
                    <Typography variant="body1">
                      {new Date(viewInvoice.date).toLocaleDateString()}
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Party Ledger
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {viewInvoice.party_ledger_name}
                    </Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Amount
                    </Typography>
                    <Typography variant="body1" fontWeight="bold">
                      ₹{viewInvoice.amount?.toLocaleString()}
                    </Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Tax
                    </Typography>
                    <Typography variant="body1">
                      ₹{viewInvoice.tax_amount?.toLocaleString() || 0}
                    </Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Total
                    </Typography>
                    <Typography variant="body1" color="primary" fontWeight="bold">
                      ₹{viewInvoice.total_amount?.toLocaleString()}
                    </Typography>
                  </Grid>
                  {viewInvoice.narration && (
                    <Grid item xs={12}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Narration
                      </Typography>
                      <Typography variant="body1">
                        {viewInvoice.narration}
                      </Typography>
                    </Grid>
                  )}
                 
                </Grid>
              </Stack>
            </DialogContent>
            <DialogActions sx={{ p: 3, pt: 0 }}>
              <Button onClick={() => setViewInvoice(null)} sx={{ borderRadius: 2 }}>
                Close
              </Button>
            </DialogActions>
          </Dialog>
        )}
      </LocalizationProvider>
    </MainLayout>
  );
};

export default Invoices;