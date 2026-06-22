'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';

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

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsRetro(readCookie(COOKIE_NAME));
  }, []);

  const setRetro = useCallback((value: boolean) => {
    setIsRetro(value);
    writeCookie(COOKIE_NAME, value);
  }, []);

  const toggleRetro = useCallback(() => {
    setRetro(!isRetro);
  }, [isRetro, setRetro]);

  return (
    <RetroModeContext.Provider value={{ isRetro, toggleRetro, setRetro }}>
      {children}
    </RetroModeContext.Provider>
  );
}
