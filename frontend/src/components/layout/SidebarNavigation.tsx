/**
 * Sidebar Navigation
 *
 * Vertical navigation sidebar with tabs for different app sections.
 * Converts to bottom navigation on mobile screens.
 */

import { useState, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Settings, LogOut, Lightbulb, Github } from 'lucide-react';
import { RecurringIcon } from '../wizards/WizardComponents';
import { useClickOutside } from '../../hooks';

function RedditIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/>
    </svg>
  );
}

interface SidebarNavigationProps {
  onSignOut: () => void;
}

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  settingsHash?: string;
}

const toolkitItems: NavItem[] = [
  { path: '/recurring', label: 'Recurring', icon: <RecurringIcon size={20} />, settingsHash: '#recurring' },
];

const otherItems: NavItem[] = [
  { path: '/settings', label: 'Settings', icon: <Settings size={20} /> },
];

function NavItemLink({ item, onSettingsClick }: Readonly<{ item: NavItem; onSettingsClick?: (hash: string) => void }>) {
  const settingsHash = item.settingsHash;
  return (
    <NavLink
      to={item.path}
      className={({ isActive }: { isActive: boolean }) =>
        `sidebar-nav-item sidebar-nav-item-with-settings ${isActive ? 'sidebar-nav-item-active' : ''}`
      }
    >
      <span className="sidebar-nav-icon" aria-hidden="true">{item.icon}</span>
      <span className="sidebar-nav-label">{item.label}</span>
      {settingsHash !== undefined && onSettingsClick && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onSettingsClick(settingsHash);
          }}
          className="sidebar-settings-cog"
          aria-label={`${item.label} settings`}
        >
          <Settings size={14} aria-hidden="true" />
        </button>
      )}
    </NavLink>
  );
}

export function SidebarNavigation({ onSignOut }: Readonly<SidebarNavigationProps>) {
  const navigate = useNavigate();
  const [ideaMenuOpen, setIdeaMenuOpen] = useState(false);
  const ideaMenuRef = useRef<HTMLDivElement>(null);

  useClickOutside([ideaMenuRef], () => setIdeaMenuOpen(false), ideaMenuOpen);

  const handleSettingsClick = (hash: string) => {
    navigate(`/settings${hash}`);
  };

  // Handle keyboard navigation for idea menu
  const handleIdeaMenuKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIdeaMenuOpen(false);
    }
  };

  return (
    <nav className="sidebar-nav" aria-label="Main navigation">
      {/* Tools section - scrollable on mobile */}
      <div className="sidebar-nav-tools">
        <div className="sidebar-nav-sections">
          <div className="sidebar-nav-section">
            <div className="sidebar-nav-header-row">
              <div className="sidebar-nav-header" id="toolkit-heading">TOOLKIT</div>
              <div className="sidebar-suggest-dropdown" ref={ideaMenuRef}>
                <button
                  type="button"
                  className="sidebar-suggest-btn"
                  onClick={() => setIdeaMenuOpen(!ideaMenuOpen)}
                  aria-expanded={ideaMenuOpen}
                  aria-haspopup="menu"
                  aria-label="Suggest a feature"
                >
                  <Lightbulb size={12} aria-hidden="true" />
                  <span>Suggest</span>
                </button>
                {ideaMenuOpen && (
                  <div
                    className="sidebar-idea-menu"
                    role="menu"
                    aria-label="Suggestion options"
                    onKeyDown={handleIdeaMenuKeyDown}
                    tabIndex={-1}
                  >
                    <a
                      href="https://github.com/chrislee973/ynab-scripts/discussions"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="sidebar-idea-option"
                      onClick={() => setIdeaMenuOpen(false)}
                      role="menuitem"
                    >
                      <Github size={16} aria-hidden="true" />
                      <span>GitHub Discussions</span>
                    </a>
                    <a
                      href="https://www.reddit.com/r/Eclosion/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="sidebar-idea-option"
                      onClick={() => setIdeaMenuOpen(false)}
                      role="menuitem"
                    >
                      <RedditIcon size={16} />
                      <span>Reddit Community</span>
                    </a>
                  </div>
                )}
              </div>
            </div>
            <ul className="sidebar-nav-list" aria-labelledby="toolkit-heading">
              {toolkitItems.map((item) => (
                <li key={item.path}>
                  <NavItemLink item={item} onSettingsClick={handleSettingsClick} />
                </li>
              ))}
            </ul>
          </div>
          <div className="sidebar-nav-divider" aria-hidden="true" />
        </div>
      </div>

      {/* Separator - mobile only */}
      <div className="sidebar-nav-mobile-separator" aria-hidden="true" />

      {/* Settings - fixed position on mobile */}
      <div className="sidebar-nav-settings">
        {otherItems.map((item) => (
          <NavItemLink key={item.path} item={item} />
        ))}
      </div>

      {/* Sign Out - at the bottom */}
      <div className="sidebar-nav-footer sidebar-desktop-only">
        <div className="sidebar-nav-list">
          <button
            type="button"
            onClick={onSignOut}
            className="sidebar-nav-item sidebar-signout"
            aria-label="Sign out of your account"
          >
            <span className="sidebar-nav-icon" aria-hidden="true"><LogOut size={20} /></span>
            <span className="sidebar-nav-label">Sign Out</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
