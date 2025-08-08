export interface ValidationError {
  field: string;
  message: string;
}

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validateName = (name: string): boolean => {
  return name.trim().length >= 2;
};

export const validateLeadForm = (data: { name: string; email: string; industry: string }): ValidationError[] => {
  const errors: ValidationError[] = [];

  if (!data.name.trim()) {
    errors.push({ field: 'name', message: 'Name is required' });
  } else if (!validateName(data.name)) {
    errors.push({ field: 'name', message: 'Name must be at least 2 characters' });
  }

  if (!data.email.trim()) {
    errors.push({ field: 'email', message: 'Email is required' });
  } else if (!validateEmail(data.email)) {
    errors.push({ field: 'email', message: 'Please enter a valid email address' });
  }

  if (!data.industry.trim()) {
    errors.push({ field: 'industry', message: 'Please select your industry' });
  }

  return errors;
};