import { useEffect } from 'react';

export function useWebViewWarning(
  showAlert: (
    title: string,
    message: string,
    type?: 'info' | 'error' | 'warning',
  ) => void,
) {
  useEffect(() => {
    if (typeof window !== 'undefined' && typeof navigator !== 'undefined') {
      const ua = navigator.userAgent.toLowerCase();
      const isWebView =
        ua.includes('instagram') ||
        ua.includes('fb_iab') ||
        ua.includes('line') ||
        ua.includes('fbav') ||
        ua.includes('messenger') ||
        ua.includes('webview');

      if (isWebView) {
        const isAndroid = ua.includes('android');
        const message = isAndroid
          ? "You are reading this inside an in-app browser. Speech synthesis (Text-to-Speech) is highly restricted here. For a premium experience, click the three dots in the top-right and select 'Open in Chrome'."
          : "You are reading this inside an in-app browser. Speech synthesis (Text-to-Speech) is highly restricted here. For a premium experience, click the share/Safari icon and select 'Open in Safari'.";

        setTimeout(() => {
          showAlert('In-App Browser Detected', message, 'warning');
        }, 2500);
      }
    }
  }, [showAlert]);
}
