/**
 * Utility functions to manage localStorage user data when authentication methods change
 */

export interface UserAuthData {
  userId: string;
  shop_id: string;
  password?: string;
  email?: string;
  hasPassword?: boolean;
  has2FA?: boolean;
  currentMethod?: 'pin' | 'password' | '2fa';
}

/**
 * Updates localStorage user details with new authentication method information
 * while preserving existing user data structure
 */
export const updateUserAuthData = (newAuthData: Partial<UserAuthData>): void => {
  try {
    // Get existing user data from localStorage
    const existingUserStr = localStorage.getItem('user');
    if (!existingUserStr) {
      console.warn('No existing user data found in localStorage');
      return;
    }

    const existingUser = JSON.parse(existingUserStr);
    
    // Merge existing user data with new auth data
    const updatedUser = {
      ...existingUser,
      ...newAuthData,
      // Ensure critical fields are preserved
      userId: newAuthData.userId || existingUser.userId || existingUser._id,
      shop_id: newAuthData.shop_id || existingUser.shop_id,
      // Preserve existing authentication-related fields if not explicitly updated
      password: newAuthData.password !== undefined ? newAuthData.password : existingUser.password,
      email: newAuthData.email !== undefined ? newAuthData.email : existingUser.email,
    };

    // Update localStorage with merged data
    localStorage.setItem('user', JSON.stringify(updatedUser));
    
    console.log('User auth data updated in localStorage:', {
      updated: Object.keys(newAuthData),
      preserved: Object.keys(existingUser).filter(key => !(key in newAuthData))
    });
  } catch (error) {
    console.error('Error updating user auth data in localStorage:', error);
  }
};

/**
 * Gets current user authentication data from localStorage
 */
export const getUserAuthData = (): UserAuthData | null => {
  try {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    
    const user = JSON.parse(userStr);
    return {
      userId: user.userId || user._id,
      shop_id: user.shop_id,
      password: user.password,
      email: user.email,
      hasPassword: user.hasPassword,
      has2FA: user.has2FA,
      currentMethod: user.currentMethod,
    };
  } catch (error) {
    console.error('Error getting user auth data from localStorage:', error);
    return null;
  }
};

/**
 * Updates authentication method status in localStorage
 */
export const updateAuthMethodStatus = (method: 'password' | '2fa', enabled: boolean, additionalData?: any): void => {
  const currentData = getUserAuthData();
  if (!currentData) return;

  const updateData: Partial<UserAuthData> = {};
  
  if (method === 'password') {
    updateData.hasPassword = enabled;
    if (enabled && additionalData?.password) {
      updateData.password = additionalData.password;
    }
    if (enabled && additionalData?.email) {
      updateData.email = additionalData.email;
    }
  } else if (method === '2fa') {
    updateData.has2FA = enabled;
  }

  // Update current method if this method is being enabled
  if (enabled) {
    updateData.currentMethod = method;
  }

  updateUserAuthData(updateData);
};

// Test function to verify localStorage updates (can be run in browser console)
export const testAuthStorageUpdates = () => {
  console.log('=== Testing Auth Storage Updates ===');
  
  // Mock existing user data
  const mockUser = {
    userId: "6783bf8c9a426074802b057c",
    shop_id: "678409b73f1321be48285b3f",
    name: "Test User",
    email: "test@example.com",
    role: "admin"
  };
  
  localStorage.setItem('user', JSON.stringify(mockUser));
  console.log('Initial data:', mockUser);
  
  // Test password enable
  updateAuthMethodStatus('password', true, {
    password: "Kinuthia#98",
    userId: "6783bf8c9a426074802b057c"
  });
  
  const result = getUserAuthData();
  console.log('After password enable:', result);
  
  // Verify structure is preserved
  const finalData = JSON.parse(localStorage.getItem('user') || '{}');
  const preserved = mockUser.userId === finalData.userId && mockUser.shop_id === finalData.shop_id;
  
  console.log('Data structure preserved:', preserved);
  console.log('Password added:', result?.hasPassword === true);
  
  return { preserved, passwordAdded: result?.hasPassword === true };
};
