import { createContext, useCallback, useContext, useState } from 'react';
import { Box, Text } from '@chakra-ui/react';

type ToastType = 'success' | 'error';

type ToastContextValue = {
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const TOAST_DURATION_MS = 3000;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const [type, setType] = useState<ToastType>('success');

  const showSuccess = useCallback((msg: string) => {
    setType('success');
    setMessage(msg);
    setVisible(true);
    setTimeout(() => {
      setVisible(false);
      setMessage(null);
    }, TOAST_DURATION_MS);
  }, []);

  const showError = useCallback((msg: string) => {
    setType('error');
    setMessage(msg);
    setVisible(true);
    setTimeout(() => {
      setVisible(false);
      setMessage(null);
    }, TOAST_DURATION_MS);
  }, []);

  return (
    <ToastContext.Provider value={{ showSuccess, showError }}>
      {children}
      {visible && message && (
        <Box
          position="fixed"
          top="24px"
          left="50%"
          transform="translateX(-50%)"
          zIndex={9999}
          bg={type === 'error' ? 'red.500' : 'green.500'}
          color="white"
          px={5}
          py={3}
          borderRadius="lg"
          boxShadow="lg"
          transition="opacity 0.25s ease-out"
        >
          <Text fontWeight="medium" fontSize="sm">
            {message}
          </Text>
        </Box>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
