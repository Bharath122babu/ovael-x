/**
 * Safe Error Interpretation and Formatting Utilities
 * Prevents raw stack dumps and internal tracebacks from reaching user-facing views.
 */
import { ApiErrorInfo } from './types';

export function formatApiError(err: unknown): ApiErrorInfo {
  if (!err) {
    return {
      message: 'An unknown error occurred.',
      isNetworkError: false,
      isRecoverable: false,
    };
  }

  // Handle existing ApiErrorInfo object
  if (typeof err === 'object' && err !== null && 'message' in err && 'isNetworkError' in err) {
    return err as ApiErrorInfo;
  }

  const rawMessage = (err as any)?.message || String(err);

  // 1. Detect Network Connection Failures
  const isNetwork =
    rawMessage.includes('Cannot reach OVAEL backend') ||
    rawMessage.includes('Failed to fetch') ||
    rawMessage.includes('NetworkError') ||
    rawMessage.includes('Network request failed') ||
    rawMessage.includes('ECONNREFUSED');

  if (isNetwork) {
    return {
      message: 'Unable to reach the OVAEL server. Please verify the backend is running and check your connection.',
      isNetworkError: true,
      isRecoverable: true,
      rawDetails: rawMessage,
    };
  }

  // 2. Detect Common HTTP Status Patterns
  const statusMatch = rawMessage.match(/\b([1-5]\d{2})\b/);
  const status = statusMatch ? parseInt(statusMatch[1], 10) : undefined;

  let cleanMessage = rawMessage;
  let isRecoverable = false;

  // Clean out common prefix junk like "Error: "
  cleanMessage = cleanMessage.replace(/^Error:\s*/i, '').trim();

  // Strip potential stack traces or JSON blobs
  if (cleanMessage.includes('\n')) {
    cleanMessage = cleanMessage.split('\n')[0].trim();
  }
  if (cleanMessage.includes('Traceback (most recent call last):')) {
    cleanMessage = 'Internal server operation failed. Please retry in a moment.';
  }

  switch (status) {
    case 401:
      cleanMessage = 'Your session has expired. Please sign in again to continue.';
      isRecoverable = false;
      break;
    case 403:
      cleanMessage = 'You do not have permission to perform this action.';
      isRecoverable = false;
      break;
    case 404:
      cleanMessage = 'The requested resource could not be found.';
      isRecoverable = false;
      break;
    case 409:
      cleanMessage = 'Conflict: The record has been modified or already exists.';
      isRecoverable = false;
      break;
    case 413:
      cleanMessage = 'The uploaded file exceeds the allowed server upload size limit.';
      isRecoverable = false;
      break;
    case 422:
      cleanMessage = 'Validation failed: Please verify all required form fields.';
      isRecoverable = false;
      break;
    case 429:
      cleanMessage = 'Too many requests. Please wait a moment before trying again.';
      isRecoverable = true;
      break;
    case 500:
      cleanMessage = 'The server encountered an error while processing your request. Please try again.';
      isRecoverable = true;
      break;
    case 502:
    case 503:
    case 504:
      cleanMessage = 'The requested service or extraction model is temporarily unavailable. Please retry shortly.';
      isRecoverable = true;
      break;
    default:
      // Keep sanitized clean message
      if (cleanMessage.length > 200) {
        cleanMessage = cleanMessage.slice(0, 197) + '...';
      }
      isRecoverable = status ? status >= 500 : false;
      break;
  }

  return {
    message: cleanMessage,
    status,
    isNetworkError: false,
    isRecoverable,
    rawDetails: rawMessage !== cleanMessage ? rawMessage : undefined,
  };
}
