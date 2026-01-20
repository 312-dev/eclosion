/**
 * useAppTour Hook
 *
 * Manages tour state and configuration for the app shell.
 * Determines which tour to show based on current page.
 */

import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useDemo } from '../context/DemoContext';
import { useRecurringTour, useNotesTour, useWishlistTour } from './';
import type { DashboardData } from '../types';

interface UseAppTourParams {
  dashboardData: DashboardData | undefined;
  wishlistItemCount: number;
  pendingCount: number;
  isBrowserConfigured: boolean;
  isDesktop: boolean;
}

export function useAppTour({
  dashboardData,
  wishlistItemCount,
  pendingCount,
  isBrowserConfigured,
  isDesktop,
}: UseAppTourParams) {
  const [showTour, setShowTour] = useState(false);
  const location = useLocation();
  const isDemo = useDemo();

  // Demo-aware path prefix
  const pathPrefix = isDemo ? '/demo' : '';

  // Check which page we're on
  const isRecurringPage =
    location.pathname === '/recurring' || location.pathname === '/demo/recurring';
  const isNotesPage = location.pathname === '/notes' || location.pathname === '/demo/notes';
  const isWishlistPage =
    location.pathname === '/wishlist' || location.pathname === '/demo/wishlist';
  const hasTour = isRecurringPage || isNotesPage || isWishlistPage;

  // Check if recurring is configured (setup wizard completed)
  const isRecurringConfigured = dashboardData?.config.target_group_id != null;

  // Get recurring tour steps and state
  const {
    steps: recurringTourSteps,
    hasSeenTour: hasSeenRecurringTour,
    markAsSeen: markRecurringTourSeen,
    hasTourSteps: hasRecurringTourSteps,
  } = useRecurringTour(dashboardData);

  // Get notes tour steps and state
  const {
    steps: notesTourSteps,
    hasSeenTour: hasSeenNotesTour,
    markAsSeen: markNotesTourSeen,
    hasTourSteps: hasNotesTourSteps,
  } = useNotesTour();

  // Get wishlist tour steps and state
  const {
    steps: wishlistTourSteps,
    hasSeenTour: hasSeenWishlistTour,
    markAsSeen: markWishlistTourSeen,
    hasTourSteps: hasWishlistTourSteps,
  } = useWishlistTour({
    itemCount: wishlistItemCount,
    pendingCount,
    isBrowserConfigured,
    isDesktop,
  });

  // Get the correct tour state based on current page
  const getTourConfig = () => {
    if (isWishlistPage)
      return {
        steps: wishlistTourSteps,
        seen: hasSeenWishlistTour,
        hasSteps: hasWishlistTourSteps,
      };
    if (isNotesPage)
      return { steps: notesTourSteps, seen: hasSeenNotesTour, hasSteps: hasNotesTourSteps };
    return {
      steps: recurringTourSteps,
      seen: hasSeenRecurringTour,
      hasSteps: hasRecurringTourSteps,
    };
  };

  const {
    steps: currentTourSteps,
    seen: hasSeenCurrentTour,
    hasSteps: hasCurrentTourSteps,
  } = getTourConfig();

  // Auto-start tour on first visit to a page with a tour
  useEffect(() => {
    // Don't start recurring tour if setup wizard is still showing
    if (isRecurringPage && !isRecurringConfigured) return;

    if (hasTour && hasCurrentTourSteps && !hasSeenCurrentTour) {
      // Get the first step's selector to wait for it to exist
      const firstStepSelector = currentTourSteps[0]?.selector;
      if (!firstStepSelector) return;

      // Poll for the target element to exist before starting tour
      let attempts = 0;
      const maxAttempts = 50; // 5 seconds max wait
      const pollInterval = 100;

      const checkElement = () => {
        attempts++;
        const element = document.querySelector(firstStepSelector);
        if (element) {
          setShowTour(true);
        } else if (attempts < maxAttempts) {
          timerId = setTimeout(checkElement, pollInterval);
        }
      };

      let timerId = setTimeout(checkElement, pollInterval);
      return () => clearTimeout(timerId);
    }
  }, [
    hasTour,
    hasCurrentTourSteps,
    hasSeenCurrentTour,
    isRecurringPage,
    isNotesPage,
    isWishlistPage,
    isRecurringConfigured,
    currentTourSteps,
  ]);

  // Handle tour close - mark as seen
  const handleTourClose = () => {
    setShowTour(false);
    if (isWishlistPage) {
      markWishlistTourSeen();
    } else if (isNotesPage) {
      markNotesTourSeen();
    } else if (isRecurringPage) {
      markRecurringTourSeen();
    }
  };

  // Key to force TourProvider remount when switching between tour types
  const getTourKey = () => {
    if (isWishlistPage) return 'wishlist-tour';
    if (isNotesPage) return 'notes-tour';
    return 'recurring-tour';
  };

  return {
    showTour,
    setShowTour,
    currentTourSteps,
    tourKey: getTourKey(),
    hasTour,
    handleTourClose,
    pathPrefix,
  };
}
