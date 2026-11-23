import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

// Keep a module-level cache so beforeinstallprompt is never lost across mounts/unmounts
let globalDeferredPrompt: BeforeInstallPromptEvent | null = null;
let listenersAttached = false;
const PROMPT_UPDATED_EVENT = 'seulawah_pwa_prompt_updated';

function attachGlobalListeners() {
  if (listenersAttached || typeof window === 'undefined') return;
  listenersAttached = true;

  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();
    globalDeferredPrompt = e as BeforeInstallPromptEvent;
    window.dispatchEvent(new CustomEvent(PROMPT_UPDATED_EVENT));
  });

  window.addEventListener('appinstalled', () => {
    globalDeferredPrompt = null;
    window.dispatchEvent(new CustomEvent('seulawah_pwa_installed'));
    window.dispatchEvent(new CustomEvent(PROMPT_UPDATED_EVENT));
  });
}

attachGlobalListeners();

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(
    () => globalDeferredPrompt
  );
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isInIframe, setIsInIframe] = useState(false);

  useEffect(() => {
    attachGlobalListeners();

    const checkStandalone = () => {
      const standalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true;
      setIsInstalled(standalone);
    };

    checkStandalone();

    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleDisplayChange = () => checkStandalone();
    mediaQuery.addEventListener?.('change', handleDisplayChange);

    const userAgent = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(userAgent));
    setIsAndroid(/android/.test(userAgent));

    try {
      setIsInIframe(window.self !== window.top);
    } catch {
      setIsInIframe(true);
    }

    const syncPrompt = () => setDeferredPrompt(globalDeferredPrompt);
    const onInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener(PROMPT_UPDATED_EVENT, syncPrompt);
    window.addEventListener('seulawah_pwa_installed', onInstalled);

    return () => {
      mediaQuery.removeEventListener?.('change', handleDisplayChange);
      window.removeEventListener(PROMPT_UPDATED_EVENT, syncPrompt);
      window.removeEventListener('seulawah_pwa_installed', onInstalled);
    };
  }, []);

  const install = async () => {
    const promptEvt = deferredPrompt || globalDeferredPrompt;
    if (!promptEvt) return false;
    await promptEvt.prompt();
    const { outcome } = await promptEvt.userChoice;
    if (outcome === 'accepted') {
      globalDeferredPrompt = null;
      setIsInstalled(true);
      setDeferredPrompt(null);
      return true;
    }
    return false;
  };

  return {
    isInstallable: !!deferredPrompt,
    isInstalled,
    isIOS,
    isAndroid,
    isInIframe,
    install,
  };
}
