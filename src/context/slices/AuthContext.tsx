import React, { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { AppUser } from '../../types';
import { supabaseService } from '../../services/supabaseService';
import { LOCAL_STORAGE_PREFIX, safeStorageSet, generatePlaceholderPassword } from '../shared/storage';
import { useToast } from './ToastContext';

// Không seed tài khoản mặc định kèm mật khẩu/email thật trong bundle client.
// Dữ liệu user thật lấy từ syncWithServer(); dùng `npm run db:seed:admin` ở backend để tạo tài khoản admin đầu tiên.
export const DEFAULT_APP_USERS: AppUser[] = [];

// Placeholder trung tính dùng khi chưa có user nào (trước khi đăng nhập/đồng bộ) — không phải tài khoản thật,
// không có quyền gì, chỉ để thỏa kiểu AppUser (non-optional) cho currentUser.
const GUEST_PLACEHOLDER_USER: AppUser = {
  id: 'guest',
  name: '',
  username: '',
  password: '',
  role: 'STAFF',
  roleTitle: '',
  email: '',
  phone: '',
  avatar: '',
  status: 'LOCKED',
  permissions: {
    canViewReports: false,
    canManageProducts: false,
    canStockIn: false,
    canManageSuppliers: false,
    canManageCustomers: false,
    canAuditInventory: false,
    canBalanceAudit: false,
    canManageCashbook: false,
    canAccessDataCenter: false,
    canSellPOS: false,
    canViewInvoices: false,
    canDeleteInvoices: false,
    canEditSystemSettings: false,
    canManageUsers: false,
    canImportData: false,
  },
};

interface AuthContextType {
  users: AppUser[];
  setUsers: React.Dispatch<React.SetStateAction<AppUser[]>>;
  currentUser: AppUser;
  setCurrentUser: React.Dispatch<React.SetStateAction<AppUser>>;
  isAuthenticated: boolean;
  login: (usernameOrEmail: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  changePassword: (oldPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  resetUserPassword: (userId: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  saveUser: (userData: Partial<AppUser> & { name: string }) => Promise<{ success: boolean; error?: string; user?: AppUser }>;
  deleteUser: (userId: string) => Promise<{ success: boolean; error?: string }>;
  toggleUserLock: (userId: string) => Promise<{ success: boolean; error?: string }>;
  updateUserProfile: (profileData: Partial<AppUser>) => Promise<{ success: boolean; error?: string }>;
  switchUser: (userId: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  isUserSwitcherOpen: boolean;
  setIsUserSwitcherOpen: (open: boolean) => void;
  isUserProfileOpen: boolean;
  setIsUserProfileOpen: (open: boolean) => void;
  isChangePasswordOpen: boolean;
  setIsChangePasswordOpen: (open: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { showToast } = useToast();

  const [users, setUsers] = useState<AppUser[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_PREFIX + 'users');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    return DEFAULT_APP_USERS;
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const isAuth = localStorage.getItem(LOCAL_STORAGE_PREFIX + 'is_authenticated');
      const authUserId = localStorage.getItem(LOCAL_STORAGE_PREFIX + 'current_user_id');
      return isAuth === 'true' && !!authUserId;
    }
    return false;
  });

  const [currentUser, setCurrentUser] = useState<AppUser>(() => {
    const savedId = typeof window !== 'undefined' ? localStorage.getItem(LOCAL_STORAGE_PREFIX + 'current_user_id') : null;
    return users.find((u) => u.id === savedId) || users[0] || GUEST_PLACEHOLDER_USER;
  });

  const [isUserProfileOpen, setIsUserProfileOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  const [isUserSwitcherOpen, setIsUserSwitcherOpen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      try {
        return new URLSearchParams(window.location.search).get('modal') === 'users';
      } catch (e) {}
    }
    return false;
  });

  const login = async (usernameOrEmail: string, password: string): Promise<{ success: boolean; error?: string }> => {
    const term = usernameOrEmail.trim().toLowerCase();
    // 1. Try server login
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: term, password }),
      });
      const data = await res.json();
      if (data.success && data.user) {
        const found = users.find((u) => u.id === data.user.id) || (data.user as AppUser);
        setCurrentUser(found);
        setIsAuthenticated(true);
        safeStorageSet(LOCAL_STORAGE_PREFIX + 'is_authenticated', 'true');
        safeStorageSet(LOCAL_STORAGE_PREFIX + 'current_user_id', found.id);
        showToast(data.message || `Đăng nhập thành công! Chào mừng ${found.name}`, 'success');
        return { success: true };
      } else if (!data.success && res.status !== 500 && res.status !== 502 && res.status !== 503) {
        return { success: false, error: data.error || 'Tên đăng nhập hoặc mật khẩu không chính xác!' };
      }
    } catch (e) {
      console.warn('[Auth] Server login failed, checking offline state:', e);
    }

    // 2. Offline fallback
    const localUser = users.find(
      (u) =>
        u.username?.toLowerCase() === term ||
        u.email?.toLowerCase() === term ||
        u.phone?.trim() === term ||
        u.name?.toLowerCase() === term
    );

    if (!localUser) {
      return { success: false, error: 'Tên đăng nhập hoặc tài khoản không tồn tại!' };
    }

    if (localUser.status === 'LOCKED') {
      return { success: false, error: 'Tài khoản này đã bị khóa. Vui lòng liên hệ Quản trị viên!' };
    }

    if (localUser.password && localUser.password !== password) {
      return { success: false, error: 'Mật khẩu không chính xác! Vui lòng thử lại.' };
    }

    setCurrentUser(localUser);
    setIsAuthenticated(true);
    safeStorageSet(LOCAL_STORAGE_PREFIX + 'is_authenticated', 'true');
    safeStorageSet(LOCAL_STORAGE_PREFIX + 'current_user_id', localUser.id);
    showToast(`Đăng nhập thành công! Chào mừng ${localUser.name}`, 'success');
    return { success: true };
  };

  const logout = () => {
    setIsAuthenticated(false);
    safeStorageSet(LOCAL_STORAGE_PREFIX + 'is_authenticated', 'false');
    localStorage.removeItem(LOCAL_STORAGE_PREFIX + 'is_authenticated');
    showToast('Đã đăng xuất khỏi hệ thống an toàn!', 'info');
  };

  const changePassword = async (oldPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> => {
    if (!currentUser) return { success: false, error: 'Chưa có thông tin tài khoản' };
    if (newPassword.length < 6) {
      return { success: false, error: 'Mật khẩu mới phải có ít nhất 6 ký tự!' };
    }
    if (currentUser.password && currentUser.password !== oldPassword) {
      return { success: false, error: 'Mật khẩu hiện tại không đúng!' };
    }

    const updatedUser: AppUser = { ...currentUser, password: newPassword, updatedAt: Date.now() };
    const updatedUsers = users.map((u) => (u.id === currentUser.id ? updatedUser : u));
    setUsers(updatedUsers);
    setCurrentUser(updatedUser);
    safeStorageSet(LOCAL_STORAGE_PREFIX + 'users', updatedUsers);

    try {
      await Promise.allSettled([
        fetch('/api/auth/change-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: currentUser.id, oldPassword, newPassword }),
        }),
        supabaseService.upsertUser(updatedUser),
      ]);
    } catch (e) {}

    showToast('Đổi mật khẩu thành công!', 'success');
    setIsChangePasswordOpen(false);
    return { success: true };
  };

  const resetUserPassword = async (userId: string, newPassword: string): Promise<{ success: boolean; error?: string }> => {
    if (currentUser.role !== 'ADMIN' && !currentUser.permissions.canManageUsers) {
      return { success: false, error: 'Bạn không có quyền thực hiện thao tác này!' };
    }
    if (newPassword.length < 6) {
      return { success: false, error: 'Mật khẩu mới phải có ít nhất 6 ký tự!' };
    }

    const updatedUsers = users.map((u) => (u.id === userId ? { ...u, password: newPassword, updatedAt: Date.now() } : u));
    setUsers(updatedUsers);
    safeStorageSet(LOCAL_STORAGE_PREFIX + 'users', updatedUsers);

    try {
      const target = updatedUsers.find((u) => u.id === userId);
      await Promise.allSettled([
        fetch(`/api/users/${userId}/reset-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ newPassword }),
        }),
        target ? supabaseService.upsertUser(target) : Promise.resolve(),
      ]);
    } catch (e) {}

    showToast('Đã đặt lại mật khẩu cho nhân viên thành công!', 'success');
    return { success: true };
  };

  const saveUser = async (userData: Partial<AppUser> & { name: string }): Promise<{ success: boolean; error?: string; user?: AppUser }> => {
    if (currentUser.role !== 'ADMIN' && !currentUser.permissions.canManageUsers) {
      return { success: false, error: 'Bạn không có quyền quản trị người dùng!' };
    }

    let savedUser: AppUser;
    const existingIndex = userData.id ? users.findIndex((u) => u.id === userData.id) : -1;
    if (existingIndex >= 0) {
      const existing = users[existingIndex];
      savedUser = {
        ...existing,
        ...userData,
        username: userData.username?.trim() || existing.username || userData.email?.split('@')[0] || existing.email?.split('@')[0] || `user_${existing.id}`,
        password: userData.password?.trim() ? userData.password : existing.password,
        updatedAt: Date.now(),
      };
      const updatedList = [...users];
      updatedList[existingIndex] = savedUser;
      setUsers(updatedList);
      safeStorageSet(LOCAL_STORAGE_PREFIX + 'users', updatedList);
      if (currentUser.id === savedUser.id) {
        setCurrentUser(savedUser);
      }
    } else {
      const newId = userData.id || `user-${Date.now()}`;
      savedUser = {
        id: newId,
        name: userData.name,
        username: userData.username?.trim() || userData.email?.split('@')[0] || `user_${Date.now().toString().slice(-4)}`,
        password: userData.password?.trim() || generatePlaceholderPassword(),
        role: userData.role || 'STAFF',
        roleTitle: userData.roleTitle || (userData.role === 'ADMIN' ? 'Full Access Admin (Toàn quyền hệ thống)' : userData.role === 'MANAGER' ? 'Quản lý cửa hàng (Store Manager)' : 'Nhân viên bán hàng (Cashier / POS)'),
        email: userData.email || '',
        phone: userData.phone || '',
        avatar: userData.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
        permissions: userData.permissions || {
          canViewReports: false,
          canManageProducts: false,
          canStockIn: false,
          canManageSuppliers: false,
          canManageCustomers: false,
          canAuditInventory: false,
          canBalanceAudit: false,
          canManageCashbook: false,
          canAccessDataCenter: false,
          canSellPOS: true,
          canViewInvoices: true,
          canDeleteInvoices: false,
          canEditSystemSettings: false,
          canManageUsers: false,
          canImportData: false,
        },
        bio: userData.bio || '',
        status: userData.status || 'ACTIVE',
        updatedAt: Date.now(),
      };
      const updatedList = [...users, savedUser];
      setUsers(updatedList);
      safeStorageSet(LOCAL_STORAGE_PREFIX + 'users', updatedList);
    }

    try {
      await Promise.allSettled([
        fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(savedUser),
        }),
        supabaseService.upsertUser(savedUser),
      ]);
    } catch (e) {}

    showToast('Lưu thông tin người dùng thành công!', 'success');
    return { success: true, user: savedUser };
  };

  const toggleUserLock = async (userId: string): Promise<{ success: boolean; error?: string }> => {
    if (currentUser.role !== 'ADMIN' && !currentUser.permissions.canManageUsers) {
      return { success: false, error: 'Bạn không có quyền quản lý người dùng!' };
    }
    const target = users.find((u) => u.id === userId);
    if (!target) return { success: false, error: 'Không tìm thấy tài khoản!' };
    if (target.role === 'ADMIN') {
      return { success: false, error: 'Không thể khóa tài khoản Quản trị viên cấp cao!' };
    }

    const newStatus: 'ACTIVE' | 'LOCKED' = target.status === 'LOCKED' ? 'ACTIVE' : 'LOCKED';
    const updatedUsers = users.map((u) => (u.id === userId ? { ...u, status: newStatus, updatedAt: Date.now() } : u));
    setUsers(updatedUsers);
    safeStorageSet(LOCAL_STORAGE_PREFIX + 'users', updatedUsers);

    try {
      const updatedTarget = updatedUsers.find((u) => u.id === userId);
      await Promise.allSettled([
        fetch(`/api/users/${userId}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        }),
        updatedTarget ? supabaseService.upsertUser(updatedTarget) : Promise.resolve(),
      ]);
    } catch (e) {}

    showToast(newStatus === 'ACTIVE' ? `Đã mở khóa tài khoản ${target.name}` : `Đã khóa tài khoản ${target.name}`, 'info');
    return { success: true };
  };

  const deleteUser = async (userId: string): Promise<{ success: boolean; error?: string }> => {
    if (currentUser.role !== 'ADMIN' && !currentUser.permissions.canManageUsers) {
      return { success: false, error: 'Bạn không có quyền quản lý người dùng!' };
    }
    const target = users.find((u) => u.id === userId);
    if (!target) return { success: false, error: 'Không tìm thấy tài khoản!' };
    if (target.role === 'ADMIN') {
      return { success: false, error: 'Không thể xóa tài khoản Quản trị viên cấp cao!' };
    }

    const updatedUsers = users.filter((u) => u.id !== userId);
    setUsers(updatedUsers);
    safeStorageSet(LOCAL_STORAGE_PREFIX + 'users', updatedUsers);

    try {
      await Promise.allSettled([
        fetch(`/api/users/${userId}`, { method: 'DELETE' }),
        supabaseService.deleteUser(userId),
      ]);
    } catch (e) {}

    showToast(`Đã xóa tài khoản ${target.name} thành công!`, 'success');
    return { success: true };
  };

  const updateUserProfile = async (profileData: Partial<AppUser>): Promise<{ success: boolean; error?: string }> => {
    if (!currentUser) return { success: false, error: 'Chưa có thông tin đăng nhập' };
    const updated: AppUser = { ...currentUser, ...profileData, updatedAt: Date.now() };
    setCurrentUser(updated);
    const updatedUsers = users.map((u) => (u.id === currentUser.id ? updated : u));
    setUsers(updatedUsers);
    safeStorageSet(LOCAL_STORAGE_PREFIX + 'users', updatedUsers);

    try {
      await Promise.allSettled([
        fetch(`/api/users/${currentUser.id}/profile`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(profileData),
        }),
        supabaseService.upsertUser(updated),
      ]);
    } catch (e) {}

    showToast('Cập nhật hồ sơ cá nhân thành công!', 'success');
    setIsUserProfileOpen(false);
    return { success: true };
  };

  const switchUser = async (userId: string, password?: string): Promise<{ success: boolean; error?: string }> => {
    const found = users.find((u) => u.id === userId);
    if (!found) return { success: false, error: 'Không tìm thấy người dùng' };
    if (found.status === 'LOCKED') {
      return { success: false, error: 'Tài khoản này đang bị khóa!' };
    }
    if (password !== undefined) {
      if (found.password && found.password !== password) {
        return { success: false, error: 'Mật khẩu không chính xác!' };
      }
    }
    setCurrentUser(found);
    setIsAuthenticated(true);
    safeStorageSet(LOCAL_STORAGE_PREFIX + 'is_authenticated', 'true');
    safeStorageSet(LOCAL_STORAGE_PREFIX + 'current_user_id', found.id);
    showToast(`Đã chuyển phiên làm việc sang: ${found.name} (${found.roleTitle})`, 'success');
    return { success: true };
  };

  useEffect(() => {
    safeStorageSet(LOCAL_STORAGE_PREFIX + 'users', users);
  }, [users]);

  const value = useMemo<AuthContextType>(
    () => ({
      users,
      setUsers,
      currentUser,
      setCurrentUser,
      isAuthenticated,
      login,
      logout,
      changePassword,
      resetUserPassword,
      saveUser,
      deleteUser,
      toggleUserLock,
      updateUserProfile,
      switchUser,
      isUserSwitcherOpen,
      setIsUserSwitcherOpen,
      isUserProfileOpen,
      setIsUserProfileOpen,
      isChangePasswordOpen,
      setIsChangePasswordOpen,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [users, currentUser, isAuthenticated, isUserSwitcherOpen, isUserProfileOpen, isChangePasswordOpen]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
