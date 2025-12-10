import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Grid,
  MenuItem,
  Typography,
  Divider,
  Alert,
  InputAdornment,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import api from '../../services/api';
import toast from 'react-hot-toast';

const validationSchema = Yup.object({
  voucher_type: Yup.string().required('Required'),
  date: Yup.date().required('Date is required'),
  party_ledger_name: Yup.string().required('Party ledger is required'),
  amount: Yup.number().min(0.01, 'Amount must be greater than 0').required('Required'),
  tax_amount: Yup.number().min(0, 'Tax must be positive').default(0),
  total_amount: Yup.number().min(0.01, 'Total must be greater than 0').required('Required'),
  narration: Yup.string(),
});

const InvoiceForm = ({ ledgers, onSuccess, onCancel }) => {
  const [loading, setLoading] = useState(false);

  const formik = useFormik({
    initialValues: {
      voucher_type: 'Sales',
      date: new Date(),
      party_ledger_name: '',
      amount: 0,
      tax_amount: 0,
      total_amount: 0,
      narration: '',
    },
    validationSchema,
    onSubmit: async (values) => {
      setLoading(true);
      try {
        const response = await api.post('/tally/invoices', {
          ...values,
          date: values.date.toISOString().split('T')[0],
        });
        
        toast.success(response.data.message);
        onSuccess();
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to create invoice');
      } finally {
        setLoading(false);
      }
    },
  });

  const handleAmountChange = (e) => {
    const amount = parseFloat(e.target.value) || 0;
    const tax = formik.values.tax_amount || 0;
    formik.setFieldValue('amount', amount);
    formik.setFieldValue('total_amount', amount + tax);
  };

  const handleTaxChange = (e) => {
    const tax = parseFloat(e.target.value) || 0;
    const amount = formik.values.amount || 0;
    formik.setFieldValue('tax_amount', tax);
    formik.setFieldValue('total_amount', amount + tax);
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box component="form" onSubmit={formik.handleSubmit} sx={{ mt: 2 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <TextField
              select
              fullWidth
              label="Voucher Type"
              name="voucher_type"
              value={formik.values.voucher_type}
              onChange={formik.handleChange}
              sx={{ borderRadius: 2 }}
            >
              <MenuItem value="Sales">Sales</MenuItem>
              <MenuItem value="Purchase">Purchase</MenuItem>
              <MenuItem value="Receipt">Receipt</MenuItem>
              <MenuItem value="Payment">Payment</MenuItem>
              <MenuItem value="Contra">Contra</MenuItem>
            </TextField>
          </Grid>

          <Grid item xs={12} md={6}>
            <DatePicker
              label="Date"
              value={formik.values.date}
              onChange={(value) => formik.setFieldValue('date', value)}
              slotProps={{
                textField: {
                  fullWidth: true,
                  sx: { borderRadius: 2 },
                  error: formik.touched.date && Boolean(formik.errors.date),
                  helperText: formik.touched.date && formik.errors.date,
                },
              }}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              select
              fullWidth
              label="Party Ledger *"
              name="party_ledger_name"
              value={formik.values.party_ledger_name}
              onChange={formik.handleChange}
              error={formik.touched.party_ledger_name && Boolean(formik.errors.party_ledger_name)}
              helperText={formik.touched.party_ledger_name && formik.errors.party_ledger_name}
              sx={{ borderRadius: 2 }}
            >
              {ledgers.map((ledger) => (
                <MenuItem key={ledger.id} value={ledger.ledger_name}>
                  {ledger.ledger_name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Narration"
              name="narration"
              multiline
              rows={2}
              value={formik.values.narration}
              onChange={formik.handleChange}
              sx={{ borderRadius: 2 }}
            />
          </Grid>

          <Grid item xs={12}>
            <Divider sx={{ my: 2 }} />
            <Typography variant="h6" gutterBottom>
              Amount Details
            </Typography>
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Amount *"
              name="amount"
              type="number"
              value={formik.values.amount}
              onChange={handleAmountChange}
              error={formik.touched.amount && Boolean(formik.errors.amount)}
              helperText={formik.touched.amount && formik.errors.amount}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Typography>₹</Typography>
                  </InputAdornment>
                ),
                sx: { borderRadius: 2 }
              }}
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Tax Amount"
              name="tax_amount"
              type="number"
              value={formik.values.tax_amount}
              onChange={handleTaxChange}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Typography>₹</Typography>
                  </InputAdornment>
                ),
                sx: { borderRadius: 2 }
              }}
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Total Amount *"
              name="total_amount"
              type="number"
              value={formik.values.total_amount}
              InputProps={{
                readOnly: true,
                startAdornment: (
                  <InputAdornment position="start">
                    <Typography>₹</Typography>
                  </InputAdornment>
                ),
                sx: { 
                  borderRadius: 2,
                  '& .MuiInputBase-input': {
                    fontWeight: 'bold',
                    color: 'primary.main',
                  },
                }
              }}
            />
          </Grid>

          <Grid item xs={12}>
            <Alert severity="info" sx={{ mt: 2, borderRadius: 2 }}>
              Add invoices
            </Alert>
          </Grid>
        </Grid>

        <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
          <Button 
            onClick={onCancel} 
            disabled={loading}
            sx={{ borderRadius: 2 }}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading}
            sx={{ borderRadius: 2 }}
          >
            {loading ? 'Creating...' : 'Create Invoice'}
          </Button>
        </Box>
      </Box>
    </LocalizationProvider>
  );
};

export default InvoiceForm;