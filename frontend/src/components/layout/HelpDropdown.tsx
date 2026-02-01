/**
 * HelpDropdown - Help button with dropdown menu for documentation and support links
 *
 * Shows a dropdown with help options on all platforms.
 * Page-specific help items are shown based on current route.
 */

import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  HelpCircle,
  BookOpen,
  Play,
  ChevronRight,
  Mail,
  HeartHandshake,
  Target,
} from 'lucide-react';
import { FaReddit } from 'react-icons/fa';
import { getDocsUrl } from '../../utils';
import { DiagnosticsPromptDialog } from './DiagnosticsPromptDialog';
import { motion, AnimatePresence, slideDownVariants } from '../motion';
import { OPEN_STASH_VS_GOALS_EVENT } from '../stash';

declare const __APP_VERSION__: string;

interface HelpDropdownProps {
  readonly hasTour: boolean;
  readonly onStartTour: () => void;
}

const SUPPORT_REDDIT_URL =
  'https://www.reddit.com/user/Ok-Quantity7501/comments/1qhb5zu/eclosion_app_support/?sort=qa#comment-tree';

export function HelpDropdown({ hasTour, onStartTour }: HelpDropdownProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showSupportSubmenu, setShowSupportSubmenu] = useState(false);
  const [showDiagnosticsPrompt, setShowDiagnosticsPrompt] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const supportMenuRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  const isDesktop = globalThis.window !== undefined && !!globalThis.electron;
  const isOnStashPage = location.pathname.includes('/stash');
  const userGuideUrl = getDocsUrl(__APP_VERSION__);

  // Show dropdown if on desktop OR if there are page-specific help items
  const hasDropdown = isDesktop || isOnStashPage;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
        setShowSupportSubmenu(false);
      }
    }
    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showDropdown]);

  useEffect(() => {
    if (!showSupportSubmenu) return;
    function handleMouseMove(event: MouseEvent) {
      const target = event.target as Node;
      if (!dropdownRef.current?.contains(target) && !supportMenuRef.current?.contains(target)) {
        setShowSupportSubmenu(false);
      }
    }
    document.addEventListener('mousemove', handleMouseMove);
    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, [showSupportSubmenu]);

  const openUserGuide = () => window.open(userGuideUrl, '_blank');

  const handleClick = () => {
    if (hasDropdown) {
      setShowDropdown(!showDropdown);
    } else if (hasTour) {
      onStartTour();
    } else {
      openUserGuide();
    }
  };

  const handleStartTour = () => {
    setShowDropdown(false);
    onStartTour();
  };
  const handleOpenGuide = () => {
    setShowDropdown(false);
    openUserGuide();
  };
  const handleEmailClick = () => {
    setShowDropdown(false);
    setShowSupportSubmenu(false);
    setShowDiagnosticsPrompt(true);
  };

  const handleStashVsGoalsClick = () => {
    setShowDropdown(false);
    globalThis.dispatchEvent(new CustomEvent(OPEN_STASH_VS_GOALS_EVENT));
  };

  const getAriaLabel = () => {
    if (hasDropdown) return 'Get help';
    if (hasTour) return 'Show tutorial';
    return 'Open user guide';
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={handleClick}
        className="flex items-center justify-center p-1.5 rounded-lg transition-colors hover:bg-(--monarch-bg-hover)"
        style={{ color: 'var(--monarch-text-muted)' }}
        aria-label={getAriaLabel()}
        aria-expanded={hasDropdown ? showDropdown : undefined}
        aria-haspopup={hasDropdown ? 'menu' : undefined}
      >
        <HelpCircle size={16} aria-hidden="true" />
      </button>
      <AnimatePresence>
        {showDropdown && (
          <motion.div
            className="absolute right-0 mt-2 w-48 rounded-lg shadow-lg py-1 z-50 origin-top-right"
            style={{
              backgroundColor: 'var(--monarch-bg-card)',
              border: '1px solid var(--monarch-border)',
            }}
            role="menu"
            aria-orientation="vertical"
            variants={slideDownVariants}
            initial="initial"
            animate="animate"
            exit="exit"
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
            {isOnStashPage && (
              <button
                type="button"
                onClick={handleStashVsGoalsClick}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors hover:bg-(--monarch-bg-page)"
                style={{ color: 'var(--monarch-text-dark)' }}
                role="menuitem"
              >
                <Target
                  className="h-4 w-4"
                  style={{ color: 'var(--monarch-orange)' }}
                  aria-hidden="true"
                />
                Stashes vs. Monarch Goals
              </button>
            )}
            <div className="relative">
              <button
                type="button"
                onMouseEnter={() => setShowSupportSubmenu(true)}
                onClick={() => setShowSupportSubmenu(!showSupportSubmenu)}
                className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-sm text-left transition-colors hover:bg-(--monarch-bg-page)"
                style={{ color: 'var(--monarch-text-dark)' }}
                role="menuitem"
                aria-haspopup="menu"
                aria-expanded={showSupportSubmenu}
              >
                <span className="flex items-center gap-3">
                  <HeartHandshake
                    className="h-4 w-4"
                    style={{ color: 'var(--monarch-orange)' }}
                    aria-hidden="true"
                  />
                  Get Support
                </span>
                <ChevronRight className="h-3 w-3" aria-hidden="true" />
              </button>
              <AnimatePresence>
                {showSupportSubmenu && (
                  <motion.div
                    ref={supportMenuRef}
                    className="absolute right-full top-0 mr-1 w-40 rounded-lg shadow-lg py-1 z-50 origin-top-right"
                    style={{
                      backgroundColor: 'var(--monarch-bg-card)',
                      border: '1px solid var(--monarch-border)',
                    }}
                    role="menu"
                    aria-orientation="vertical"
                    variants={slideDownVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                  >
                    <a
                      href={SUPPORT_REDDIT_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors hover:bg-(--monarch-bg-page)"
                      style={{ color: 'var(--monarch-text-dark)', textDecoration: 'none' }}
                      role="menuitem"
                      onClick={() => {
                        setShowDropdown(false);
                        setShowSupportSubmenu(false);
                      }}
                    >
                      <FaReddit
                        size={16}
                        style={{ color: 'var(--monarch-orange)' }}
                        aria-hidden="true"
                      />
                      via Reddit
                    </a>
                    <button
                      type="button"
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors hover:bg-(--monarch-bg-page)"
                      style={{ color: 'var(--monarch-text-dark)' }}
                      role="menuitem"
                      onClick={handleEmailClick}
                    >
                      <Mail
                        className="h-4 w-4"
                        style={{ color: 'var(--monarch-orange)' }}
                        aria-hidden="true"
                      />
                      via Email
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <DiagnosticsPromptDialog
        isOpen={showDiagnosticsPrompt}
        onClose={() => setShowDiagnosticsPrompt(false)}
      />
    </div>
  );
}
