import { usePathname } from 'expo-router';
import { useCallback, useRef } from 'react';

/** Child screens preserve the entrance of the screen beneath them. */
export function useEntranceReplay() {
  const pathname = usePathname();
  const visited = useRef(false);
  const recipeReturn = useRef(false);
  if (visited.current && (pathname === '/recipe-detail' || pathname.startsWith('/planning/'))) recipeReturn.current = true;
  return useCallback(() => {
    const replay = !recipeReturn.current;
    visited.current = true;
    recipeReturn.current = false;
    return replay;
  }, []);
}
