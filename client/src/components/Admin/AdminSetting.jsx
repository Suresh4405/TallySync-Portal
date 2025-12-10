import React, { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Chip,
  Typography,
  Grid,
  Card,
  CardContent,
  Alert,
  Switch,
  Tooltip,
  Avatar,
  CircularProgress,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  AdminPanelSettings as AdminIcon,
  AccountCircle as AccountantIcon,
  Analytics as AnalystIcon,
  LockReset as ResetIcon,
  Search as SearchIcon,
  CheckCircle,
  Cancel,
} from "@mui/icons-material";
import MainLayout from "../Layout/MainLayout";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import toast from "react-hot-toast";

const AdminSettings = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [openForm, setOpenForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    role: "analyst",
    is_active: true,
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await api.get("/admin/users");
      setUsers(response.data.data);
    } catch (error) {
      toast.error("Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      if (editingUser) {
        await api.put(`/admin/users/${editingUser.id}`, formData);
        toast.success("User updated successfully");
      } else {
        await api.post("/admin/users", formData);
        toast.success("User created successfully");
      }
      setOpenForm(false);
      setEditingUser(null);
      setFormData({
        username: "",
        email: "",
        password: "",
        role: "analyst",
        is_active: true,
      });
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.message || "Operation failed");
    }
  };

  const handleDelete = async () => {
    if (!userToDelete) return;

    try {
      await api.delete(`/admin/users/${userToDelete.id}`);
      toast.success("User deleted successfully");
      setDeleteDialog(false);
      setUserToDelete(null);
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete user");
    }
  };

  const handleStatusToggle = async (userData) => {
    try {
      await api.put(`/admin/users/${userData.id}`, {
        is_active: !userData.is_active,
      });
      toast.success(
        `User ${!userData.is_active ? "activated" : "deactivated"}`
      );
      fetchUsers();
    } catch (error) {
      toast.error("Failed to update user status");
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case "admin":
        return <AdminIcon />;
      case "accountant":
        return <AccountantIcon />;
      default:
        return <AnalystIcon />;
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case "admin":
        return "error";
      case "accountant":
        return "warning";
      default:
        return "success";
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.username.toLowerCase().includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase()) ||
      user.role.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <MainLayout>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          Admin Settings
        </Typography>

        <Card sx={{ mb: 3, background: "#2196f3", color: "white" }}>
          <CardContent>
            <Grid container alignItems="center" justifyContent="space-between">
              <Grid item>
                <Box display="flex" alignItems="center" gap={3}>
                  <Avatar
                    sx={{
                      bgcolor: "rgba(255,255,255,0.2)",
                      width: 60,
                      height: 60,
                    }}
                  >
                    <AdminIcon sx={{ fontSize: 32 }} />
                  </Avatar>
                  <Box>
                    <Typography variant="h5" fontWeight="bold">
                      manage permi
                    </Typography>
                  </Box>
                </Box>
              </Grid>
              <Grid item>
                <Button
                  variant="contained"
                  color="secondary"
                  startIcon={<AddIcon />}
                  onClick={() => setOpenForm(true)}
                  sx={{
                    background: "white",
                    color: "error.main",
                    "&:hover": { background: "rgba(255,255,255,0.9)" },
                  }}
                >
                  Add New User
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        <TableContainer
          component={Paper}
          sx={{ borderRadius: 1, overflow: "hidden" }}
        >
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: "#2196f3" }}>
                <TableCell sx={{ color: "white", fontWeight: "bold", py: 2 }}>
                  USER
                </TableCell>
                <TableCell sx={{ color: "white", fontWeight: "bold", py: 2 }}>
                  EMAIL
                </TableCell>
                <TableCell sx={{ color: "white", fontWeight: "bold", py: 2 }}>
                  ROLE
                </TableCell>
                <TableCell sx={{ color: "white", fontWeight: "bold", py: 2 }}>
                  STATUS
                </TableCell>
                <TableCell sx={{ color: "white", fontWeight: "bold", py: 2 }}>
                  JOINED
                </TableCell>
                <TableCell sx={{ color: "white", fontWeight: "bold", py: 2 }}>
                  ACTIONS
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Box py={4}>
                      <CircularProgress />
                    </Box>
                  </TableCell>
                </TableRow>
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Box py={6} textAlign="center">
                      <PersonIcon
                        sx={{
                          fontSize: 60,
                          color: "text.secondary",
                          mb: 2,
                          opacity: 0.5,
                        }}
                      />
                      <Typography color="text.secondary">
                        No users found
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((userItem) => (
                  <TableRow
                    key={userItem.id}
                    hover
                    sx={{
                      "&:hover": { bgcolor: "action.hover" },
                      borderBottom: "1px solid",
                      borderColor: "divider",
                    }}
                  >
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={2}>
                        <Avatar
                          sx={{
                            bgcolor: "primary.main",
                            width: 40,
                            height: 40,
                          }}
                        >
                          {userItem.username?.charAt(0).toUpperCase()}
                        </Avatar>
                        <Box>
                          <Typography fontWeight="medium">
                            {userItem.username}
                            {user.id === userItem.id && (
                              <Chip
                                label="You"
                                size="small"
                                color="primary"
                                sx={{ ml: 1, height: 20 }}
                              />
                            )}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            ID: {userItem.id}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>{userItem.email}</TableCell>
                    <TableCell>
                      <Chip
                        icon={getRoleIcon(userItem.role)}
                        label={userItem.role.toUpperCase()}
                        color={getRoleColor(userItem.role)}
                        size="small"
                        sx={{ borderRadius: 1 }}
                      />
                    </TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Switch
                          checked={userItem.is_active}
                          onChange={() => handleStatusToggle(userItem)}
                          size="small"
                          disabled={user.id === userItem.id}
                        />
                        <Chip
                          icon={
                            userItem.is_active ? <CheckCircle /> : <Cancel />
                          }
                          label={userItem.is_active ? "Active" : "Inactive"}
                          color={userItem.is_active ? "success" : "default"}
                          size="small"
                          sx={{ borderRadius: 1 }}
                        />
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {new Date(userItem.created_at).toLocaleDateString()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box display="flex" gap={1}>
                        <Tooltip title="Edit">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => {
                              setEditingUser(userItem);
                              setFormData({
                                username: userItem.username,
                                email: userItem.email,
                                role: userItem.role,
                                is_active: userItem.is_active,
                                password: "",
                              });
                              setOpenForm(true);
                            }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => {
                              setUserToDelete(userItem);
                              setDeleteDialog(true);
                            }}
                            disabled={user.id === userItem.id}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      <Dialog
        open={openForm}
        onClose={() => {
          setOpenForm(false);
          setEditingUser(null);
          setFormData({
            username: "",
            email: "",
            password: "",
            role: "analyst",
            is_active: true,
          });
        }}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ bgcolor: "error.main", color: "white" }}>
          {editingUser ? "Edit User" : "Add New User"}
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <Box sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Username"
                  value={formData.username}
                  onChange={(e) =>
                    setFormData({ ...formData, username: e.target.value })
                  }
                  sx={{ borderRadius: 2 }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  sx={{ borderRadius: 2 }}
                />
              </Grid>
              {!editingUser && (
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Password"
                    type="password"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    sx={{ borderRadius: 2 }}
                  />
                </Grid>
              )}
              <Grid item xs={12}>
                <TextField
                  select
                  fullWidth
                  label="Role"
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({ ...formData, role: e.target.value })
                  }
                  sx={{ borderRadius: 2 }}
                >
                  <MenuItem value="admin">Admin</MenuItem>
                  <MenuItem value="accountant">Accountant</MenuItem>
                  <MenuItem value="analyst">Analyst</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <Box display="flex" alignItems="center" gap={1}>
                  <Switch
                    checked={formData.is_active}
                    onChange={(e) =>
                      setFormData({ ...formData, is_active: e.target.checked })
                    }
                  />
                  <Typography>Active Account</Typography>
                </Box>
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button
            onClick={() => {
              setOpenForm(false);
              setEditingUser(null);
              setFormData({
                username: "",
                email: "",
                password: "",
                role: "analyst",
                is_active: true,
              });
            }}
            sx={{ borderRadius: 2 }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            color="error"
            sx={{ borderRadius: 2 }}
          >
            {editingUser ? "Update" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={deleteDialog}
        onClose={() => {
          setDeleteDialog(false);
          setUserToDelete(null);
        }}
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle>Delete User</DialogTitle>
        <DialogContent>
          <Typography paragraph>
            Are you sure you want to delete the user "{userToDelete?.username}"?
          </Typography>
          <Alert severity="error">
            This action cannot be undone. All user data will be permanently
            deleted.
          </Alert>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button
            onClick={() => {
              setDeleteDialog(false);
              setUserToDelete(null);
            }}
            sx={{ borderRadius: 2 }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDelete}
            variant="contained"
            color="error"
            sx={{ borderRadius: 2 }}
          >
            Delete User
          </Button>
        </DialogActions>
      </Dialog>
    </MainLayout>
  );
};

export default AdminSettings;
