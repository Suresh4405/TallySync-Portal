import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Grid,
  MenuItem,
  Typography,
  Divider,
  Stepper,
  Step,
  StepLabel,
  Alert,
} from '@mui/material';
import { useFormik } from 'formik';
import * as Yup from 'yup';

const validationSchema = Yup.object({
  ledger_name: Yup.string().required('Ledger name is required'),
  ledger_alias: Yup.string(),
  parent_group: Yup.string(),
  opening_balance: Yup.number().default(0),
  address: Yup.string(),
  state: Yup.string(),
  pincode: Yup.string().matches(/^\d*$/, 'Pincode must contain only numbers'),
  mobile: Yup.string().matches(/^\d*$/, 'Mobile must contain only numbers'),
  email: Yup.string().email('Invalid email'),
  gst_number: Yup.string(),
  pan_number: Yup.string().matches(/^[A-Z0-9]*$/, 'PAN must be uppercase letters and numbers'),
});

const parentGroups = [
  'Sundry Debtors',
  'Sundry Creditors',
  'Bank Accounts',
  'Cash-in-Hand',
  'Direct Incomes',
  'Indirect Incomes',
  'Direct Expenses',
  'Indirect Expenses',
  'Fixed Assets',
  'Current Assets',
  'Current Liabilities',
];

const LedgerForm = ({ initialData, onSubmit, onCancel, isEdit }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);

  const formik = useFormik({
    initialValues: initialData || {
      ledger_name: '',
      ledger_alias: '',
      parent_group: 'Sundry Debtors',
      opening_balance: 0,
      address: '',
      state: '',
      pincode: '',
      mobile: '',
      email: '',
      gst_number: '',
      pan_number: '',
    },
    validationSchema,
    onSubmit: async (values) => {
      setLoading(true);
      try {
        await onSubmit(values);
      } finally {
        setLoading(false);
      }
    },
  });

  const steps = ['Basic Details', 'Contact Information', 'Tax Details'];

  const handleNext = () => {
    setActiveStep((prevStep) => prevStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Ledger Name *"
                name="ledger_name"
                value={formik.values.ledger_name}
                onChange={formik.handleChange}
                error={formik.touched.ledger_name && Boolean(formik.errors.ledger_name)}
                helperText={formik.touched.ledger_name && formik.errors.ledger_name}
                sx={{ mb: 2 }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Ledger Alias"
                name="ledger_alias"
                value={formik.values.ledger_alias}
                onChange={formik.handleChange}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                select
                fullWidth
                label="Parent Group"
                name="parent_group"
                value={formik.values.parent_group}
                onChange={formik.handleChange}
              >
                {parentGroups.map((group) => (
                  <MenuItem key={group} value={group}>
                    {group}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Opening Balance"
                name="opening_balance"
                type="number"
                value={formik.values.opening_balance}
                onChange={formik.handleChange}
                InputProps={{
                  startAdornment: <Typography sx={{ mr: 1 }}>₹</Typography>,
                }}
              />
            </Grid>
          </Grid>
        );

      case 1:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Address"
                name="address"
                multiline
                rows={2}
                value={formik.values.address}
                onChange={formik.handleChange}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="State"
                name="state"
                value={formik.values.state}
                onChange={formik.handleChange}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Pincode"
                name="pincode"
                value={formik.values.pincode}
                onChange={formik.handleChange}
                error={formik.touched.pincode && Boolean(formik.errors.pincode)}
                helperText={formik.touched.pincode && formik.errors.pincode}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Mobile"
                name="mobile"
                value={formik.values.mobile}
                onChange={formik.handleChange}
                error={formik.touched.mobile && Boolean(formik.errors.mobile)}
                helperText={formik.touched.mobile && formik.errors.mobile}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Email"
                name="email"
                type="email"
                value={formik.values.email}
                onChange={formik.handleChange}
                error={formik.touched.email && Boolean(formik.errors.email)}
                helperText={formik.touched.email && formik.errors.email}
              />
            </Grid>
          </Grid>
        );

      case 2:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="GST Number"
                name="gst_number"
                value={formik.values.gst_number}
                onChange={formik.handleChange}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="PAN Number"
                name="pan_number"
                value={formik.values.pan_number}
                onChange={formik.handleChange}
                error={formik.touched.pan_number && Boolean(formik.errors.pan_number)}
                helperText={formik.touched.pan_number && formik.errors.pan_number}
              />
            </Grid>

            <Grid item xs={12}>
              <Alert severity="info" sx={{ borderRadius: 2 }}>
                This ledger will be automatically synced with Tally ERP after creation.
              </Alert>
            </Grid>
          </Grid>
        );

      default:
        return null;
    }
  };

  return (
    <Box component="form" onSubmit={formik.handleSubmit} sx={{ mt: 2 }}>
      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {renderStepContent(activeStep)}

      <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-between' }}>
        <Button
          onClick={activeStep === 0 ? onCancel : handleBack}
          disabled={loading}
          sx={{ borderRadius: 2 }}
        >
          {activeStep === 0 ? 'Cancel' : 'Back'}
        </Button>

        <Box>
          {activeStep < steps.length - 1 ? (
            <Button
              onClick={handleNext}
              variant="contained"
              sx={{ borderRadius: 2 }}
            >
              Next
            </Button>
          ) : (
            <Button
              type="submit"
              variant="contained"
              disabled={loading}
              sx={{ borderRadius: 2 }}
            >
              {loading ? 'Saving...' : isEdit ? 'Update Ledger' : 'Create Ledger'}
            </Button>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default LedgerForm;