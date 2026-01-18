/**
 * HelpDropdown - Help button with dropdown menu for documentation and support
 *
 * Always shows a dropdown with:
 * - Interactive Guide (when tour is available for current page)
 * - User Guide (external docs link)
 * - Contact developer (mailto link)
 */

import { useState, useRef, useEffect } from 'react';
import { HelpCircle, BookOpen, Play, Mail } from 'lucide-react';
import { getDocsUrl } from '../../utils';

// Vite injects app version at build time
declare const __APP_VERSION__: string;

interface HelpDropdownProps {
  readonly hasTour: boolean;
  readonly onStartTour: () => void;
}

export function HelpDropdown({ hasTour, onStartTour }: HelpDropdownProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showDropdown]);

  // Build versioned docs URL (environment-aware: beta -> beta.eclosion.app)
  const userGuideUrl = getDocsUrl(__APP_VERSION__);

  // Build mailto link with pre-populated subject
  const emailSubject = `[Eclosion v${__APP_VERSION__}] My feedback`;
  const contactMailto = `mailto:ope@312.dev?subject=${encodeURIComponent(emailSubject)}`;

  const openUserGuide = () => {
    window.open(userGuideUrl, '_blank');
  };

  const handleClick = () => {
    setShowDropdown(!showDropdown);
  };

  const handleStartTour = () => {
    setShowDropdown(false);
    onStartTour();
  };

  const handleOpenGuide = () => {
    setShowDropdown(false);
    openUserGuide();
  };

  const handleContact = () => {
    setShowDropdown(false);
    globalThis.location.href = contactMailto;
  };

  return (
    <div className="relative hidden sm:block" ref={dropdownRef}>
      <button
        type="button"
        onClick={handleClick}
        className="app-header-btn flex items-center gap-1"
        style={{ color: 'var(--monarch-text-muted)' }}
        aria-label="Get help"
        aria-expanded={showDropdown}
        aria-haspopup="menu"
      >
        <HelpCircle className="app-header-icon" aria-hidden="true" />
      </button>
      {showDropdown && (
        <div
          className="absolute right-0 mt-2 w-48 rounded-lg shadow-lg py-1 z-50"
          style={{
            backgroundColor: 'var(--monarch-bg-card)',
            border: '1px solid var(--monarch-border)',
          }}
          role="menu"
          aria-orientation="vertical"
        >
          {hasTour && (
            <button
              type="button"
              onClick={handleStartTour}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors hover:bg-(--monarch-bg-page)"
              style={{ color: 'var(--monarch-text-dark)' }}
              role="menuitem"
            >
              <Play
                className="h-4 w-4"
                style={{ color: 'var(--monarch-orange)' }}
                aria-hidden="true"
              />
              Interactive Guide
            </button>
          )}
          <button
            type="button"
            onClick={handleOpenGuide}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors hover:bg-(--monarch-bg-page)"
            style={{ color: 'var(--monarch-text-dark)' }}
            role="menuitem"
          >
            <BookOpen
              className="h-4 w-4"
              style={{ color: 'var(--monarch-orange)' }}
              aria-hidden="true"
            />
            User Guide
          </button>
          <hr
            className="my-1 mx-3 border-0"
            style={{ borderTop: '1px solid var(--monarch-border)' }}
          />
          <button
            type="button"
            onClick={handleContact}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors hover:bg-(--monarch-bg-page)"
            style={{ color: 'var(--monarch-text-dark)' }}
            role="menuitem"
          >
            <Mail
              className="h-4 w-4"
              style={{ color: 'var(--monarch-orange)' }}
              aria-hidden="true"
            />
            Contact developer: 312.dev
          </button>
        </div>
      )}
    </div>
  );
}
