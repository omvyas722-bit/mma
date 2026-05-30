// Custom hooks for common operations
// NOTE: Most hooks are re-exported from useCustomHooks.js (canonical source)

import { useState, useCallback, useRef } from 'react';

// Hook for managing form state (deprecated, renamed to avoid collision with useCustomHooks.js)
// Use useForm from useCustomHooks.js for new code
export function useManagedForm(initialValues, validator) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const errorsRef = useRef(errors);
  errorsRef.current = errors;

  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    setValues(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    if (errorsRef.current[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  }, []);

  const handleBlur = useCallback((e) => {
    const { name } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
  }, []);

  const validate = useCallback(() => {
    if (validator) {
      const validationErrors = validator(values);
      setErrors(validationErrors);
      return Object.keys(validationErrors).length === 0;
    }
    return true;
  }, [values, validator]);

  const handleSubmit = useCallback((onSubmit) => {
    return async (e) => {
      e.preventDefault();
      setIsSubmitting(true);

      const allTouched = Object.keys(values).reduce((acc, key) => {
        acc[key] = true;
        return acc;
      }, {});
      setTouched(allTouched);

      if (validate()) {
        try {
          await onSubmit(values);
        } catch (error) {
          console.error('Form submission error:', error);
          setErrors(typeof error?.response?.data?.error === 'object' ? error.response.data.error : { form: error?.response?.data?.error || error.message || 'Form submission failed' });
        }
      }

      setIsSubmitting(false);
    };
  }, [values, validate]);

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
  }, [initialValues]);

  return {
    values,
    errors,
    touched,
    isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit,
    validate,
    reset,
    setValues,
    setErrors,
  };
}

// Re-export canonical implementations from useCustomHooks
export {
  useDebounce,
  usePrevious,
  useToggle,
  useLocalStorage,
  useClickOutside,
  useKeyPress,
  useMediaQuery,
  useWindowSize,
  useInterval,
  useTimeout,
  useAsync,
  useForm,
} from './useCustomHooks';
