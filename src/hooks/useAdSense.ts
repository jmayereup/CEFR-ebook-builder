import { useEffect } from 'react';

export function useAdSense(isPaid: boolean) {
  useEffect(() => {
    const checkAndManageAds = () => {
      let adsConsent = false;
      const consentRegistered = localStorage.getItem('cefr_cookie_consent');
      if (consentRegistered) {
        try {
          const parsed = JSON.parse(consentRegistered);
          if (parsed && typeof parsed === 'object') {
            adsConsent = parsed.ads === true;
          }
        } catch (e) {
          console.error('Error parsing cookie consent:', e);
        }
      }

      const shouldShowAds = !isPaid && adsConsent;
      const scriptId = 'google-adsense';
      const existingScript = document.getElementById(scriptId);

      if (shouldShowAds) {
        if (!existingScript) {
          const script = document.createElement('script');
          script.id = scriptId;
          script.async = true;
          script.src =
            'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7358177326858018';
          script.crossOrigin = 'anonymous';
          document.head.appendChild(script);
        }
      } else {
        if (existingScript) {
          existingScript.remove();
        }
      }
    };

    checkAndManageAds();

    window.addEventListener('cookieConsentUpdated', checkAndManageAds);
    return () => {
      window.removeEventListener('cookieConsentUpdated', checkAndManageAds);
    };
  }, [isPaid]);
}
