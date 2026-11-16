import { message } from 'antd';
import type { LibraryItem } from '../../../types';

export const STORAGE_KEYS = {
  SIGNATURES: 'esign_saved_signatures',
  STAMPS: 'esign_saved_stamps',
} as const;

export const saveToStorage = (key: string, data: LibraryItem): void => {
  try {
    const existing: LibraryItem[] = JSON.parse(localStorage.getItem(key) || '[]');
    const updated = [...existing, data];
    localStorage.setItem(key, JSON.stringify(updated));
    message.success('Saved to library');
  } catch (error) {
    console.error('Failed to save to storage:', error);
    message.error('Failed to save to library');
  }
};

export const updateInStorage = (key: string, id: string, updates: Partial<LibraryItem>): void => {
  try {
    const existing: LibraryItem[] = JSON.parse(localStorage.getItem(key) || '[]');
    const updated = existing.map((item) =>
      item.id === id ? { ...item, ...updates } : item
    );
    localStorage.setItem(key, JSON.stringify(updated));
    message.success('Updated in library');
  } catch (error) {
    console.error('Failed to update storage:', error);
    message.error('Failed to update library');
  }
};

export const getFromStorage = (key: string): LibraryItem[] => {
  try {
    return JSON.parse(localStorage.getItem(key) || '[]');
  } catch {
    return [];
  }
};

export const deleteFromStorage = (key: string, id: string): void => {
  try {
    const existing: LibraryItem[] = JSON.parse(localStorage.getItem(key) || '[]');
    const updated = existing.filter((item) => item.id !== id);
    localStorage.setItem(key, JSON.stringify(updated));
    message.success('Removed from library');
  } catch (error) {
    console.error('Failed to delete from storage:', error);
    message.error('Failed to remove from library');
  }
};
