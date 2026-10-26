import React from 'react';
import { AdModal } from './AdModal';
import { AdSlotConfig } from '../../types';

export interface SponsoredAdModalProps {
  isOpen: boolean;
  onClose: () => void;
  slot: AdSlotConfig | undefined;
  masterEnabled: boolean;
  title?: string;
}

export const SponsoredAdModal: React.FC<SponsoredAdModalProps> = (props) => {
  return <AdModal {...props} />;
};

export default SponsoredAdModal;
