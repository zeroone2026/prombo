import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { AuthService } from '../services/authService';
import { CommunityUser } from '../types';
import { GuestRestrictionModal } from '../components/GuestRestrictionModal';

interface GuestRestrictionContextType {
  isGuest: boolean;
  currentUser: CommunityUser | null;
  requireAuth: (callback: (user?: CommunityUser) => void) => void;
  openGuestInterceptorModal: () => void;
  openAuthModal: (
    tab?: 'signup' | 'signin' | 'guest' | 'reset' | 'forgot',
    onComplete?: (user?: CommunityUser) => void,
    email?: string
  ) => void;
  // Auth Drawer unified state and handlers
  isAuthDrawerOpen: boolean;
  setIsAuthDrawerOpen: (open: boolean) => void;
  openAuthDrawer: (
    mode?: 'signin' | 'signup' | 'guest' | 'reset' | 'forgot',
    onComplete?: (user?: CommunityUser) => void,
    email?: string
  ) => void;
  closeAuthDrawer: () => void;
  authDrawerMode: 'signin' | 'signup' | 'forgot' | 'reset';
  authDrawerEmail: string;
  handleAuthSuccess: (user: CommunityUser) => void;
}

const GuestRestrictionContext = createContext<GuestRestrictionContextType | undefined>(undefined);

export const GuestRestrictionProvider: React.FC<{
  currentUser?: CommunityUser | null;
  onAuthSuccess?: (user: CommunityUser) => void;
  children: React.ReactNode;
}> = ({ currentUser: propUser, onAuthSuccess, children }) => {
  const [currentUser, setCurrentUser] = useState<CommunityUser | null>(
    () => propUser || AuthService.getCurrentUser()
  );
  const [isInterceptorOpen, setIsInterceptorOpen] = useState(false);
  const [isAuthDrawerOpen, setIsAuthDrawerOpen] = useState(false);
  const [authDrawerMode, setAuthDrawerMode] = useState<'signup' | 'signin' | 'reset' | 'forgot'>('signin');
  const [authDrawerEmail, setAuthDrawerEmail] = useState<string>('');
  const pendingCallbackRef = useRef<((user?: CommunityUser) => void) | null>(null);

  // Keep synced with prop and storage events
  useEffect(() => {
    if (propUser !== undefined) {
      setCurrentUser(propUser);
    }
  }, [propUser]);

  useEffect(() => {
    const handleAuthChange = (e: any) => {
      setCurrentUser(e.detail || AuthService.getCurrentUser());
    };
    window.addEventListener('prombo_auth_change', handleAuthChange);
    return () => window.removeEventListener('prombo_auth_change', handleAuthChange);
  }, []);

  // Open Auth Drawer in reset mode on password recovery event (e.g. from magic link landing)
  useEffect(() => {
    const handleRecovery = (e: any) => {
      // Check if this recovery event belongs to an active Admin recovery flow or admin route
      try {
        const path = window.location.pathname;
        const hash = window.location.hash;
        const isAdminRoute = path.startsWith('/admin') || hash.startsWith('#admin');
        const isAdminRecoveryActive = sessionStorage.getItem('prombo_admin_recovery_active') === 'true';
        if (isAdminRoute || isAdminRecoveryActive || e?.detail?.source === 'admin') {
          return; // ISOLATE: Never open the user side drawer during admin recovery
        }
      } catch {}

      const recoveryEmail = (e?.detail?.email || '').trim();
      if (recoveryEmail) {
        try {
          sessionStorage.setItem('prombo_recovery_email', recoveryEmail);
        } catch {}
        setAuthDrawerEmail(recoveryEmail);
      }
      setAuthDrawerMode('reset');
      setIsAuthDrawerOpen(true);
    };
    window.addEventListener('prombo_password_recovery', handleRecovery);
    return () => window.removeEventListener('prombo_password_recovery', handleRecovery);
  }, []);

  // Unauthenticated or Guest check
  const isGuest = !currentUser || Boolean(currentUser.isGuest);

  const openAuthDrawer = (
    mode: 'signup' | 'signin' | 'guest' | 'reset' | 'forgot' = 'signin',
    onComplete?: (user?: CommunityUser) => void,
    email?: string
  ) => {
    if (onComplete) {
      pendingCallbackRef.current = onComplete;
    }
    const cleanMode = mode === 'guest' ? 'signin' : mode;
    setAuthDrawerMode(cleanMode);
    if (email !== undefined) {
      setAuthDrawerEmail(email);
    }
    setIsAuthDrawerOpen(true);
  };

  const closeAuthDrawer = () => {
    setIsAuthDrawerOpen(false);
    setAuthDrawerEmail('');
    pendingCallbackRef.current = null;
  };

  const requireAuth = (callback: (user?: CommunityUser) => void) => {
    if (isGuest) {
      pendingCallbackRef.current = callback;
      openAuthDrawer('signin');
    } else {
      callback(currentUser || undefined);
    }
  };

  const handleQuickRegister = () => {
    setIsInterceptorOpen(false);
    openAuthDrawer('signin');
  };

  const handleAuthSuccess = (user: CommunityUser) => {
    setCurrentUser(user);
    setIsAuthDrawerOpen(false);
    setAuthDrawerEmail('');
    if (pendingCallbackRef.current) {
      const cb = pendingCallbackRef.current;
      pendingCallbackRef.current = null;
      try {
        cb(user);
      } catch (err) {
        console.error('Error executing pending action post-auth:', err);
      }
    }
    if (onAuthSuccess) {
      onAuthSuccess(user);
    }
  };

  return (
    <GuestRestrictionContext.Provider
      value={{
        isGuest,
        currentUser,
        requireAuth,
        openGuestInterceptorModal: () => openAuthDrawer('signin'),
        openAuthModal: openAuthDrawer,
        isAuthDrawerOpen,
        setIsAuthDrawerOpen,
        openAuthDrawer,
        closeAuthDrawer,
        authDrawerMode,
        authDrawerEmail,
        handleAuthSuccess,
      }}
    >
      {children}

      {/* Guest Interceptor Modal */}
      <GuestRestrictionModal
        isOpen={isInterceptorOpen}
        onClose={() => setIsInterceptorOpen(false)}
        onQuickRegister={handleQuickRegister}
      />
    </GuestRestrictionContext.Provider>
  );
};

export const useGuestRestriction = () => {
  const context = useContext(GuestRestrictionContext);
  if (!context) {
    return {
      isGuest: false,
      currentUser: null,
      requireAuth: (cb: () => void) => cb(),
      openGuestInterceptorModal: () => {},
      openAuthModal: () => {},
      isAuthDrawerOpen: false,
      setIsAuthDrawerOpen: () => {},
      openAuthDrawer: () => {},
      closeAuthDrawer: () => {},
      authDrawerMode: 'signin' as const,
      authDrawerEmail: '',
      handleAuthSuccess: () => {},
    };
  }
  return context;
};
