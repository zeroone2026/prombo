import React, { createContext, useContext, useState, useCallback } from 'react';
import { ReportTargetPayload } from '../types';
import { ReportModal } from '../components/reporting/ReportModal';
import { TopReportToast } from '../components/reporting/TopReportToast';
import { useGuestRestriction } from './GuestRestrictionContext';

interface ReportModalContextType {
  openReportModal: (target: ReportTargetPayload) => void;
  closeReportModal: () => void;
  showReportSuccessToast: (message?: string) => void;
}

const ReportModalContext = createContext<ReportModalContextType | undefined>(undefined);

export const ReportModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isGuest, openAuthModal } = useGuestRestriction();
  const [activeTarget, setActiveTarget] = useState<ReportTargetPayload | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isToastVisible, setIsToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('شكراً على تقديم البلاغ');

  const openReportModal = useCallback((target: ReportTargetPayload) => {
    if (isGuest) {
      openAuthModal('signin');
      return;
    }
    setActiveTarget(target);
    setIsModalOpen(true);
  }, [isGuest, openAuthModal]);

  const closeReportModal = useCallback(() => {
    setIsModalOpen(false);
    setActiveTarget(null);
  }, []);

  const showReportSuccessToast = useCallback((msg?: string) => {
    if (msg) setToastMessage(msg);
    setIsToastVisible(true);
  }, []);

  return (
    <ReportModalContext.Provider
      value={{
        openReportModal,
        closeReportModal,
        showReportSuccessToast,
      }}
    >
      {children}

      {/* Global High-Contrast White Report Modal */}
      <ReportModal
        isOpen={isModalOpen}
        onClose={closeReportModal}
        target={activeTarget}
        onSuccessNotification={() => {
          showReportSuccessToast();
        }}
      />

      {/* Thin Top Off-White Toast Notification with Dark Blue text */}
      <TopReportToast
        isVisible={isToastVisible}
        onDismiss={() => setIsToastVisible(false)}
        message={toastMessage}
      />
    </ReportModalContext.Provider>
  );
};

export const useReportModal = (): ReportModalContextType => {
  const context = useContext(ReportModalContext);
  if (!context) {
    throw new Error('useReportModal must be used within a ReportModalProvider');
  }
  return context;
};
