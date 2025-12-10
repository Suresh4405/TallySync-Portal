import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  CircularProgress,
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
  Alert,
  Avatar,
  InputAdornment,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import SyncIcon from '@mui/icons-material/Sync';
import LedgerIcon from '@mui/icons-material/AccountBalance';
import WarningIcon from '@mui/icons-material/Warning';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import FilterIcon from '@mui/icons-material/FilterList';

import MainLayout from '../Layout/MainLayout';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import LedgerForm from './LedgerForm';

const Ledgers = () => {
  const { user } = useAuth();
  const [ledgers, setLedgers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState('');
  const [openForm, setOpenForm] = useState(false);
  const [formData, setFormData] = useState(null);
  const [total, setTotal] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [ledgerToDelete, setLedgerToDelete] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchLedgers();
  }, [page, rowsPerPage, search, filter]);

  const fetchLedgers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/tally/ledgers', {
        params: {
          page: page + 1,
          limit: rowsPerPage,
          search,
          sortBy: 'created_at',
          sortOrder: 'DESC',
        },
      });
      setLedgers(response.data.data.ledgers);
      setTotal(response.data.data.pagination.total);
    } catch (error) {
      toast.error('Failed to fetch ledgers');
    } finally {
      setLoading(false);
    }
  };

  const handleSyncLedgers = async () => {
    setSyncing(true);
    try {
      const response = await api.post('/tally/sync/ledgers');
      toast.success(response.data.message);
      fetchLedgers();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const handleAddLedger = async (data) => {
    try {
      const response = await api.post('/tally/ledgers', data);
      if (response.data.tallySync && !response.data.tallySync.success) {
        toast.error(`Ledger saved locally but Tally sync failed: ${response.data.tallySync.message}`);
      } else {
        toast.success('Ledger created and synced with Tally successfully');
      }
      setOpenForm(false);
      fetchLedgers();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create ledger');
    }
  };

  const handleDeleteLedger = async () => {
    if (!ledgerToDelete) return;
    try {
      await api.delete(`/tally/ledgers/${ledgerToDelete.id}`);
      toast.success('Ledger deleted successfully');
      setDeleteDialog(false);
      setLedgerToDelete(null);
      fetchLedgers();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete ledger');
    }
  };

  const handlePageChange = (event, newPage) => setPage(newPage);
  const handleRowsPerPageChange = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const getBalanceColor = (balance) => (balance >= 0 ? 'success.main' : 'error.main');
  const getBalanceIcon = (balance) => (balance >= 0 ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />);

  const isAdmin = user?.role === 'admin';
  const isAccountant = user?.role === 'accountant';

  return (
    <MainLayout>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          Ledger Management
        </Typography>

        {!isAdmin && !isAccountant && (
          <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
            <strong>Analyst Access:</strong> You can view ledgers but cannot create, edit, or delete them.
            Contact an administrator for write permissions.
          </Alert>
        )}

        <Card sx={{ mb: 3, background: 'linear-gradient(135deg, #2196f3 0%, #1976d2 100%)', color: 'white' }}>
          <CardContent>
            <Grid container alignItems="center" justifyContent="space-between">
              <Grid item>
                <Box display="flex" alignItems="center" gap={3}>
                  <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 60, height: 60 }}>
                    <LedgerIcon sx={{ fontSize: 32 }} />
                  </Avatar>
                  <Box>
                    <Typography variant="h5" fontWeight="bold">
                      Total Ledgers: {total}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      Manage and sync your Tally ledgers
                    </Typography>
                  </Box>
                </Box>
              </Grid>
              <Grid item>
                <Button
                  variant="contained"
                  color="secondary"
                  startIcon={<SyncIcon />}
                  onClick={handleSyncLedgers}
                  disabled={syncing}
                  sx={{
                    background: 'white',
                    color: 'primary.main',
                    '&:hover': { background: 'rgba(255,255,255,0.9)' }
                  }}
                >
                  {syncing ? 'Syncing...' : 'Sync from Tally'}
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        <Paper sx={{ p: 3, mb: 3, borderRadius: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                placeholder="Search ledgers..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: 'action.active' }} />
                    </InputAdornment>
                  ),
                  sx: { borderRadius: 2 }
                }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                select
                fullWidth
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <FilterIcon sx={{ color: 'action.active' }} />
                    </InputAdornment>
                  ),
                  sx: { borderRadius: 2 }
                }}
              >
                <MenuItem value="all">All Ledgers</MenuItem>
                <MenuItem value="synced">Synced</MenuItem>
                <MenuItem value="not_synced">Not Synced</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} md={3} sx={{ textAlign: 'right' }}>
              {(isAdmin || isAccountant) && (
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => {
                    setFormData(null);
                    setOpenForm(true);
                  }}
                  sx={{ borderRadius: 2 }}
                >
                  Add Ledger
                </Button>
              )}
            </Grid>
          </Grid>
        </Paper>

        {syncing && <LinearProgress sx={{ mb: 2 }} />}

        <TableContainer component={Paper} sx={{ borderRadius: 3, overflow: 'hidden' }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'primary.main' }}>
                <TableCell sx={{ color: 'white', fontWeight: 'bold', py: 2 }}>LEDGER</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold', py: 2 }}>PARENT GROUP</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold', py: 2 }}>BALANCE</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold', py: 2 }}>STATUS</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold', py: 2 }}>SYNC</TableCell>
                {(isAdmin || isAccountant) && (
                  <TableCell sx={{ color: 'white', fontWeight: 'bold', py: 2 }}>ACTIONS</TableCell>
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={isAdmin || isAccountant ? 6 : 5} align="center">
                    <Box py={4}>
                      <CircularProgress />
                    </Box>
                  </TableCell>
                </TableRow>
              ) : ledgers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isAdmin || isAccountant ? 6 : 5} align="center">
                    <Box py={6} textAlign="center">
                      <LedgerIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2, opacity: 0.5 }} />
                      <Typography color="text.secondary" component="div">
                        No ledgers found
                      </Typography>
                      <Typography variant="caption" color="text.secondary" component="div">
                        Try syncing from Tally or creating a new ledger
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                ledgers.map((ledger) => (
                  <TableRow
                    key={ledger.id}
                    hover
                    sx={{
                      '&:hover': { bgcolor: 'action.hover' },
                      borderBottom: '1px solid',
                      borderColor: 'divider'
                    }}
                  >
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={2}>
                        <Avatar sx={{ bgcolor: 'primary.light', width: 40, height: 40 }}>
                          {ledger.ledger_name.charAt(0).toUpperCase()}
                        </Avatar>
                        <Box>
                          <Typography fontWeight="medium" component="div">{ledger.ledger_name}</Typography>
                          {ledger.email && (
                            <Typography variant="caption" color="text.secondary" component="div">
                              {ledger.email}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={ledger.parent_group}
                        size="small"
                        color="primary"
                        variant="outlined"
                        sx={{ borderRadius: 1 }}
                      />
                    </TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        {getBalanceIcon(ledger.opening_balance)}
                        <Typography
                          fontWeight="bold"
                          color={getBalanceColor(ledger.opening_balance)}
                          component="div"
                        >
                          ₹{Math.abs(ledger.opening_balance || 0).toLocaleString()}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" component="div">
                          {ledger.opening_balance >= 0 ? 'DR' : 'CR'}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={ledger.is_active ? 'Active' : 'Inactive'}
                        color={ledger.is_active ? 'success' : 'default'}
                        size="small"
                        sx={{ borderRadius: 1 }}
                      />
                    </TableCell>
                    <TableCell>
                      {ledger.tally_guid ? (
                        <Chip
                          label="Synced"
                          size="small"
                          color="success"
                          variant="outlined"
                          icon={<CheckCircleIcon fontSize="small" />}
                          sx={{ borderRadius: 1 }}
                        />
                      ) : (
                        <Chip
                          label="Not Synced"
                          size="small"
                          color="warning"
                          variant="outlined"
                          sx={{ borderRadius: 1 }}
                        />
                      )}
                    </TableCell>
                    {(isAdmin || isAccountant) && (
                      <TableCell>
                        <Box display="flex" gap={1}>
                          <Tooltip title="Edit">
                            <span>
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={() => {
                                  setFormData(ledger);
                                  setOpenForm(true);
                                }}
                                disabled={!isAdmin}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <span>
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => {
                                  setLedgerToDelete(ledger);
                                  setDeleteDialog(true);
                                }}
                                disabled={!isAdmin}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={total}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handlePageChange}
            onRowsPerPageChange={handleRowsPerPageChange}
            sx={{ borderTop: '1px solid', borderColor: 'divider' }}
          />
        </TableContainer>

        <Dialog
          open={openForm}
          onClose={() => setOpenForm(false)}
          maxWidth="md"
          fullWidth
          PaperProps={{ sx: { borderRadius: 3 } }}
        >
          <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white' }}>
            {formData ? 'Edit Ledger' : 'Create New Ledger'}
          </DialogTitle>
          <DialogContent sx={{ p: 3 }}>
            <LedgerForm
              initialData={formData}
              onSubmit={formData ? (data) => console.log('Edit:', data) : handleAddLedger}
              onCancel={() => setOpenForm(false)}
              isEdit={!!formData}
            />
          </DialogContent>
        </Dialog>

        <Dialog
          open={deleteDialog}
          onClose={() => {
            setDeleteDialog(false);
            setLedgerToDelete(null);
          }}
          PaperProps={{ sx: { borderRadius: 3 } }}
        >
          <DialogTitle>
            <Box display="flex" alignItems="center" gap={1}>
              <WarningIcon color="error" />
              <span>Delete Ledger</span>
            </Box>
          </DialogTitle>
          <DialogContent>
            <Typography paragraph component="div">
              Are you sure you want to delete the ledger "{ledgerToDelete?.ledger_name}"?
            </Typography>
            <Alert severity="warning">
              This action will delete the ledger from the database. 
              {isAdmin && ' It will also delete from Tally ERP.'}
            </Alert>
          </DialogContent>
          <DialogActions sx={{ p: 3, pt: 0 }}>
            <Button
              onClick={() => {
                setDeleteDialog(false);
                setLedgerToDelete(null);
              }}
              sx={{ borderRadius: 2 }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteLedger}
              variant="contained"
              color="error"
              startIcon={<DeleteIcon />}
              sx={{ borderRadius: 2 }}
            >
              Delete Ledger
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </MainLayout>
  );
};

export default Ledgers;
