import React from 'react';

const ErrorAlert = ({ message, onClose, type = 'error' }) => {
  const styles = {
    error: {
      container: 'bg-red-100 border-red-400 text-red-700',
      heading: 'Error!'
    },
    success: {
      container: 'bg-green-100 border-green-400 text-green-700',
      heading: 'Success!'
    }
  };

  const currentStyle = message.toLowerCase().includes('success') ? styles.success : styles.error;

  return (
    <div className={`fixed z-50 top-4 right-4 ${currentStyle.container} border px-4 py-3 rounded`} role="alert">
      <strong className="font-bold">{currentStyle.heading}</strong>
      <span className="block sm:inline ml-2">{message}</span>
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-0 bottom-0 right-0 px-4 py-3"
          aria-label="Close alert"
        >
          <span className="text-xl">&times;</span>
        </button>
      )}
    </div>
  );
};

export default ErrorAlert;