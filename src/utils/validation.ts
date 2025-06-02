
// Email validation regex
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// Password requirements
const PASSWORD_REQUIREMENTS = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true
};

export const validateEmail = (email: string): { isValid: boolean; message?: string } => {
  if (!email.trim()) {
    return { isValid: false, message: "Email is required" };
  }
  
  if (!EMAIL_REGEX.test(email)) {
    return { isValid: false, message: "Please enter a valid email address" };
  }
  
  if (email.length > 254) {
    return { isValid: false, message: "Email address is too long" };
  }
  
  return { isValid: true };
};

export const validatePassword = (password: string): { isValid: boolean; message?: string } => {
  if (!password) {
    return { isValid: false, message: "Password is required" };
  }
  
  if (password.length < PASSWORD_REQUIREMENTS.minLength) {
    return { isValid: false, message: `Password must be at least ${PASSWORD_REQUIREMENTS.minLength} characters long` };
  }
  
  if (password.length > 128) {
    return { isValid: false, message: "Password is too long (max 128 characters)" };
  }
  
  if (PASSWORD_REQUIREMENTS.requireUppercase && !/[A-Z]/.test(password)) {
    return { isValid: false, message: "Password must contain at least one uppercase letter" };
  }
  
  if (PASSWORD_REQUIREMENTS.requireLowercase && !/[a-z]/.test(password)) {
    return { isValid: false, message: "Password must contain at least one lowercase letter" };
  }
  
  if (PASSWORD_REQUIREMENTS.requireNumbers && !/\d/.test(password)) {
    return { isValid: false, message: "Password must contain at least one number" };
  }
  
  if (PASSWORD_REQUIREMENTS.requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return { isValid: false, message: "Password must contain at least one special character" };
  }
  
  return { isValid: true };
};

export const sanitizeInput = (input: string, maxLength: number = 100): string => {
  if (!input || typeof input !== 'string') return '';
  
  // Remove HTML tags and normalize whitespace
  return input
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()
    .slice(0, maxLength); // Limit length
};

export const validateTaskTitle = (title: string): { isValid: boolean; message?: string; sanitized?: string } => {
  const sanitized = sanitizeInput(title, 100);
  
  if (!sanitized) {
    return { isValid: false, message: "Task title is required" };
  }
  
  if (sanitized.length < 2) {
    return { isValid: false, message: "Task title must be at least 2 characters long" };
  }
  
  return { isValid: true, sanitized };
};

export const validatePoints = (points: string | number): { isValid: boolean; message?: string; value?: number } => {
  const numericValue = typeof points === 'string' ? parseInt(points) : points;
  
  if (isNaN(numericValue)) {
    return { isValid: false, message: "Points must be a valid number" };
  }
  
  if (numericValue < 1 || numericValue > 1000) {
    return { isValid: false, message: "Points must be between 1 and 1000" };
  }
  
  return { isValid: true, value: numericValue };
};
