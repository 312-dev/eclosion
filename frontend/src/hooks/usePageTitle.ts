/**
 * Hook for setting page titles with consistent formatting.
 *
 * Title format:
 * - With user name: "Page | First Name's Eclosion for Monarch"
 * - Without user name: "Page | Eclosion for Monarch"
 */

import { useEffect } from 'react';

const APP_NAME = 'Eclosion for Monarch';

export function usePageTitle(pageName: string, userFirstName?: string | null) {
  useEffect(() => {
    const appTitle = userFirstName
      ? `${userFirstName}'s ${APP_NAME}`
      : APP_NAME;
    document.title = `${pageName} | ${appTitle}`;
  }, [pageName, userFirstName]);
}

export function getAppTitle(userFirstName?: string | null): string {
  return userFirstName
    ? `${userFirstName}'s ${APP_NAME}`
    : APP_NAME;
}
