/**
 * SettingsSectionHeader - Lightweight section divider for tool settings
 *
 * Used within tool settings cards to group related settings together.
 */

interface SettingsSectionHeaderProps {
  readonly title: string;
}

export function SettingsSectionHeader({ title }: SettingsSectionHeaderProps) {
  return (
    <div
      className="px-4 pt-4 pb-2"
      style={{ borderTop: '1px solid var(--monarch-border-light, rgba(0,0,0,0.06))' }}
    >
      <h3
        className="text-xs font-semibold uppercase tracking-wider"
        style={{ color: 'var(--monarch-text-muted)' }}
      >
        {title}
      </h3>
    </div>
  );
}
