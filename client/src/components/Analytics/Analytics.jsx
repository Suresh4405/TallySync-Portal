import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Paper,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  ToggleButton,
  ToggleButtonGroup,
  Stack,
  Chip,
  CircularProgress
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  AccountBalance as LedgerIcon,
  Receipt as InvoiceIcon,
  Sync as SyncIcon,
  ShowChart,
  Timeline,
} from '@mui/icons-material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart as RechartPieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import MainLayout from '../Layout/MainLayout';
import api from '../../services/api';
import toast from 'react-hot-toast';

const Analytics = () => {
  const [ledgerData, setLedgerData] = useState([]);
  const [invoiceData, setInvoiceData] = useState([]);
  const [syncData, setSyncData] = useState([]);
  const [timeRange, setTimeRange] = useState('month');
  const [chartType, setChartType] = useState('bar');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalyticsData();
  }, [timeRange]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      
      const [ledgersResponse, invoicesResponse, syncLogsResponse] = await Promise.all([
        api.get('/tally/ledgers', { params: { limit: 100 } }),
        api.get('/tally/invoices'),
        api.get('/tally/sync-logs', { params: { limit: 50 } })
      ]);

      const ledgers = ledgersResponse.data.data.ledgers;
      const invoices = invoicesResponse.data.data.invoices;

      const ledgerAnalysis = ledgers
        .filter(ledger => Math.abs(ledger.opening_balance || 0) > 0)
        .sort((a, b) => Math.abs(b.opening_balance) - Math.abs(a.opening_balance))
        .slice(0, 15)
        .map(ledger => ({
          name: ledger.ledger_name.length > 15 
            ? ledger.ledger_name.substring(0, 12) + '...' 
            : ledger.ledger_name,
          fullName: ledger.ledger_name,
          openingBalance: Math.abs(ledger.opening_balance || 0),
          balance: ledger.opening_balance || 0,
          isPositive: (ledger.opening_balance || 0) >= 0,
          parentGroup: ledger.parent_group,
          isActive: ledger.is_active,
        }));

      const monthlyInvoices = invoices.reduce((acc, invoice) => {
        const date = new Date(invoice.date);
        const month = date.getMonth();
        const year = date.getFullYear();
        const key = `${year}-${month}`;
        
        if (!acc[key]) {
          acc[key] = {
            month: date.toLocaleString('default', { month: 'short', year: 'numeric' }),
            amount: 0,
            count: 0,
            average: 0,
            year,
            monthNum: month,
          };
        }
        
        acc[key].amount += parseFloat(invoice.total_amount || 0);
        acc[key].count += 1;
        acc[key].average = acc[key].amount / acc[key].count;
        
        return acc;
      }, {});

      const invoiceTrends = Object.values(monthlyInvoices)
        .sort((a, b) => a.year === b.year ? a.monthNum - b.monthNum : a.year - b.year)
        .slice(-12)
        .map((item, index, array) => ({
          ...item,
          growth: index > 0 
            ? ((item.amount - array[index - 1].amount) / array[index - 1].amount * 100).toFixed(1)
            : 0,
        }));
      const ledgerDistribution = ledgers.reduce((acc, ledger) => {
        const group = ledger.parent_group || 'Others';
        if (!acc[group]) {
          acc[group] = { name: group, value: 0, amount: 0 };
        }
        acc[group].value++;
        acc[group].amount += Math.abs(ledger.opening_balance || 0);
        return acc;
      }, {});

      const distributionData = Object.values(ledgerDistribution)
        .sort((a, b) => b.value - a.value)
        .slice(0, 8);

      setLedgerData({
        analysis: ledgerAnalysis,
        distribution: distributionData,
      });
      
      setInvoiceData({
        trends: invoiceTrends,
      });

    } catch (error) {
      toast.error('Failed to fetch analytics data');
    } finally {
      setLoading(false);
    }
  };

  const COLORS = [
    '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8',
    '#82CA9D', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'
  ];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <Paper sx={{ p: 2, bgcolor: 'background.paper', boxShadow: 3, borderRadius: 2 }}>
          <Typography variant="subtitle2" fontWeight="bold" gutterBottom>{label}</Typography>
          {payload.map((entry, index) => (
            <Typography key={index} variant="body2" sx={{ color: entry.color, mb: 0.5 }}>
              <strong>{entry.name}:</strong> {
                entry.name.includes('Amount') || entry.name.includes('Balance') 
                  ? `₹${entry.value.toLocaleString()}`
                  : entry.name.includes('Growth')
                  ? `${entry.value}%`
                  : entry.value
              }
            </Typography>
          ))}
        </Paper>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <MainLayout>
        <Box display="flex" justifyContent="center" alignItems="center" height="400px">
          <CircularProgress />
        </Box>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        Analytics Dashboard
      </Typography>
      
      <Stack direction="row" spacing={2} sx={{ mb: 4 }}>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Time Range</InputLabel>
          <Select
            value={timeRange}
            label="Time Range"
            onChange={(e) => setTimeRange(e.target.value)}
            sx={{ borderRadius: 2 }}
          >
            <MenuItem value="week">Last Week</MenuItem>
            <MenuItem value="month">Last Month</MenuItem>
            <MenuItem value="quarter">Last Quarter</MenuItem>
            <MenuItem value="year">Last Year</MenuItem>
          </Select>
        </FormControl>

        <ToggleButtonGroup
          value={chartType}
          exclusive
          onChange={(e, value) => value && setChartType(value)}
          sx={{ height: 40 }}
        >
          <ToggleButton value="bar">
            <ShowChart sx={{ mr: 1 }} /> Bar
          </ToggleButton>
          <ToggleButton value="line">
            <Timeline sx={{ mr: 1 }} /> Line
          </ToggleButton>
          <ToggleButton value="area">
            <TrendingUpIcon sx={{ mr: 1 }} /> Area
          </ToggleButton>
        </ToggleButtonGroup>
      </Stack>
      <Grid container spacing={3}>
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h6" fontWeight="bold">
                  Top 15 Ledgers by Opening Balance
                </Typography>
                <Chip label="Real-time" color="primary" size="small" />
              </Box>
              <ResponsiveContainer width="100%" height={400}>
                {chartType === 'bar' ? (
                  <BarChart data={ledgerData.analysis}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="name" 
                      angle={-45} 
                      textAnchor="end" 
                      height={70}
                      fontSize={12}
                    />
                    <YAxis 
                      tickFormatter={(value) => `₹${(value/1000).toFixed(0)}k`}
                      fontSize={12}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar 
                      dataKey="openingBalance" 
                      name="Opening Balance (₹)" 
                      radius={[4, 4, 0, 0]}
                    >
                      {ledgerData.analysis?.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.isPositive ? '#4CAF50' : '#F44336'} 
                        />
                      ))}
                    </Bar>
                  </BarChart>
                ) : chartType === 'line' ? (
                  <LineChart data={ledgerData.analysis}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="name" 
                      angle={-45} 
                      textAnchor="end" 
                      height={70}
                      fontSize={12}
                    />
                    <YAxis 
                      tickFormatter={(value) => `₹${(value/1000).toFixed(0)}k`}
                      fontSize={12}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="openingBalance"
                      name="Opening Balance (₹)"
                      stroke="#8884d8"
                      strokeWidth={3}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                ) : (
                  <AreaChart data={ledgerData.analysis}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="name" 
                      angle={-45} 
                      textAnchor="end" 
                      height={70}
                      fontSize={12}
                    />
                    <YAxis 
                      tickFormatter={(value) => `₹${(value/1000).toFixed(0)}k`}
                      fontSize={12}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="openingBalance"
                      name="Opening Balance (₹)"
                      stroke="#8884d8"
                      fill="#8884d8"
                      fillOpacity={0.6}
                    />
                  </AreaChart>
                )}
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Ledger Distribution by Group
              </Typography>
              <ResponsiveContainer width="100%" height={400}>
                <RechartPieChart>
                  <Pie
                    data={ledgerData.distribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    innerRadius={40}
                    fill="#8884d8"
                    dataKey="value"
                    paddingAngle={2}
                  >
                    {ledgerData.distribution?.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [value, 'Count']} />
                  <Legend />
                </RechartPieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h6" fontWeight="bold">
                  Invoice Trends & Growth (Last 12 Months)
                </Typography>
                <Chip label="Revenue" color="success" size="small" />
              </Box>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={invoiceData.trends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" fontSize={12} />
                  <YAxis 
                    yAxisId="left"
                    tickFormatter={(value) => `₹${(value/1000).toFixed(0)}k`}
                    fontSize={12}
                  />
                  <YAxis 
                    yAxisId="right" 
                    orientation="right"
                    tickFormatter={(value) => `${value}%`}
                    fontSize={12}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="amount"
                    name="Invoice Amount (₹)"
                    stroke="#8884d8"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="growth"
                    name="Growth %"
                    stroke="#82ca9d"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

    </MainLayout>
  );
};

export default Analytics;