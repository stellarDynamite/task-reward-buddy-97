
// Simple encryption for localStorage data
const ENCRYPTION_KEY = 'task-reward-buddy-key';

function simpleEncrypt(text: string): string {
  try {
    // Simple XOR encryption - not cryptographically secure but better than plain text
    const key = ENCRYPTION_KEY;
    let encrypted = '';
    
    for (let i = 0; i < text.length; i++) {
      encrypted += String.fromCharCode(
        text.charCodeAt(i) ^ key.charCodeAt(i % key.length)
      );
    }
    
    return btoa(encrypted);
  } catch (error) {
    console.error('Encryption failed:', error);
    return text; // Fallback to plain text
  }
}

function simpleDecrypt(encryptedText: string): string {
  try {
    const key = ENCRYPTION_KEY;
    const encrypted = atob(encryptedText);
    let decrypted = '';
    
    for (let i = 0; i < encrypted.length; i++) {
      decrypted += String.fromCharCode(
        encrypted.charCodeAt(i) ^ key.charCodeAt(i % key.length)
      );
    }
    
    return decrypted;
  } catch (error) {
    console.error('Decryption failed:', error);
    return encryptedText; // Fallback to original text
  }
}

export const secureStorage = {
  setItem: (key: string, value: string): void => {
    try {
      const encrypted = simpleEncrypt(value);
      localStorage.setItem(key, encrypted);
    } catch (error) {
      console.error('Secure storage set failed:', error);
      localStorage.setItem(key, value); // Fallback
    }
  },

  getItem: (key: string): string | null => {
    try {
      const encrypted = localStorage.getItem(key);
      if (!encrypted) return null;
      
      return simpleDecrypt(encrypted);
    } catch (error) {
      console.error('Secure storage get failed:', error);
      return localStorage.getItem(key); // Fallback
    }
  },

  removeItem: (key: string): void => {
    localStorage.removeItem(key);
  },

  clear: (): void => {
    localStorage.clear();
  }
};
