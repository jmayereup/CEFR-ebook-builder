import { useEffect, useRef } from 'react';
import { safeSetItem } from '../utils/safeStorage';

const STORAGE_KEY = 'tj_webview_warning_dismissed';

export function useWebViewWarning(
  showAlert: (
    title: string,
    message: string,
    type?: 'info' | 'error' | 'warning',
    onClose?: () => void,
  ) => void,
) {
  const showAlertRef = useRef(showAlert);
  showAlertRef.current = showAlert;
  const hasTriggeredRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      return;
    }

    if (hasTriggeredRef.current) {
      return;
    }

    // Check if user has already seen or acknowledged the warning in this or past sessions
    try {
      if (
        sessionStorage.getItem(STORAGE_KEY) === '1' ||
        localStorage.getItem(STORAGE_KEY) === '1'
      ) {
        return;
      }
    } catch {
      // Storage access may be restricted in sandboxed webviews
    }

    const ua = navigator.userAgent.toLowerCase();
    const isWebView =
      ua.includes('instagram') ||
      ua.includes('fb_iab') ||
      ua.includes('line') ||
      ua.includes('fbav') ||
      ua.includes('messenger') ||
      ua.includes('webview');

    if (!isWebView) {
      return;
    }

    hasTriggeredRef.current = true;

    const isAndroid = ua.includes('android');
    const message = isAndroid
      ? "You are reading this inside an in-app browser. Speech synthesis (Text-to-Speech) is highly restricted here. For a premium experience, click the three dots in the top-right and select 'Open in Chrome'."
      : "You are reading this inside an in-app browser. Speech synthesis (Text-to-Speech) is highly restricted here. For a premium experience, click the share/Safari icon and select 'Open in Safari'.";

    const markDismissed = () => {
      try {
        sessionStorage.setItem(STORAGE_KEY, '1');
      } catch {}
      try {
        safeSetItem(STORAGE_KEY, '1');
      } catch {}
    };

    const timer = setTimeout(() => {
      markDismissed();
      showAlertRef.current(
        'In-App Browser Detected',
        message,
        'warning',
        markDismissed,
      );
    }, 2500);

    return () => {
      clearTimeout(timer);
    };
  }, []);
}
