'use client';

import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useState } from 'react';

const COOKIE_NAME = 'retro-os';
const ONE_YEAR = 60 * 60 * 24 * 365;

type RetroModeContextValue = {
  isRetro: boolean;
  toggleRetro: () => void;
  setRetro: (value: boolean) => void;
};

const RetroModeContext = createContext<RetroModeContextValue>({
  isRetro: false,
  toggleRetro: () => {},
  setRetro: () => {},
});

const useIsomorphicLayoutEffect = globalThis.window === undefined ? useEffect : useLayoutEffect;

export function useRetroMode() {
  return useContext(RetroModeContext);
}

function readCookie(name: string): boolean {
  if (typeof document === 'undefined') return false;
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${name}=([^;]*)`),
  );
  return match ? match[1] === '1' : false;
}

function writeCookie(name: string, value: boolean) {
  if (typeof document === 'undefined') return;
  // eslint-disable-next-line unicorn/no-document-cookie
  document.cookie = `${name}=${value ? '1' : '0'}; path=/; max-age=${ONE_YEAR}; samesite=lax`;
}

export function RetroModeProvider({ children }: { children: React.ReactNode }) {
  const [isRetro, setIsRetro] = useState(false);

  useIsomorphicLayoutEffect(() => {
    const params = new URLSearchParams(globalThis.location.search);
    const retro = params.get('retro');
    const fromUrl = retro === '1' || retro === 'true';

    if (fromUrl) {
      writeCookie(COOKIE_NAME, true);
      params.delete('retro');
      const search = params.toString();
      const cleanUrl = globalThis.location.pathname + (search ? `?${search}` : '') + globalThis.location.hash;
      globalThis.history.replaceState(globalThis.history.state, '', cleanUrl);
    }

    if (fromUrl || readCookie(COOKIE_NAME)) {
      setIsRetro(true);
    }
  }, []);

  const setRetro = useCallback((value: boolean) => {
    setIsRetro(value);
    writeCookie(COOKIE_NAME, value);
  }, []);

  const toggleRetro = useCallback(() => {
    setIsRetro((prev) => {
      const next = !prev;
      writeCookie(COOKIE_NAME, next);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ isRetro, toggleRetro, setRetro }),
    [isRetro, toggleRetro, setRetro],
  );

  return (
    <RetroModeContext.Provider value={value}>
      {children}
    </RetroModeContext.Provider>
  );
}
