import React from 'react';
import { Modal, Typography } from '@mui/material';
import styles from './notification.module.css';

interface NotificationModalProps {
  open: boolean;
  onClose: () => void;
  type: 'info' | 'warning' | 'error' | 'success';
  message: string;
}

const NotificationModal: React.FC<NotificationModalProps> = ({
  open,
  onClose,
  type,
  message,
}) => {
  const getClassName = () => {
    switch (type) {
      case 'info':
        return styles.info;
      case 'warning':
        return styles.warning;
      case 'error':
        return styles.error;
      case 'success':
        return styles.success;
      default:
        return '';
    }
  };

  return (
    <Modal open={open} onClose={onClose} className={styles.modal}>
      <div className={styles.modalContent}>
        {type !== '' && (
          <Typography variant="h6" className={getClassName()}>
            {type[0].toUpperCase() + type.slice(1)}
          </Typography>
        )}
        <Typography variant="body1">{message}</Typography>
      </div>
    </Modal>
  );
};

export default NotificationModal;
