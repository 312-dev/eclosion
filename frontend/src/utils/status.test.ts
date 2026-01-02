import { describe, it, expect } from 'vitest';
import {
  getStatusLabel,
  getStatusStyles,
  getStatusStylesExtended,
  isAttentionStatus,
  isHealthyStatus,
} from './status';

describe('getStatusLabel', () => {
  it('returns correct labels for each status', () => {
    expect(getStatusLabel('on_track')).toBe('On Track');
    expect(getStatusLabel('funded')).toBe('Funded');
    expect(getStatusLabel('behind')).toBe('Behind');
    expect(getStatusLabel('ahead')).toBe('Ahead');
    expect(getStatusLabel('critical')).toBe('Off Track');
    expect(getStatusLabel('due_now')).toBe('Due Now');
    expect(getStatusLabel('inactive')).toBe('Inactive');
    expect(getStatusLabel('disabled')).toBe('Untracked');
  });

  it('returns Untracked when disabled', () => {
    expect(getStatusLabel('on_track', false)).toBe('Untracked');
    expect(getStatusLabel('funded', false)).toBe('Untracked');
  });
});

describe('getStatusStyles', () => {
  it('returns success colors for healthy statuses', () => {
    const styles = getStatusStyles('on_track');
    expect(styles.bg).toContain('success');
    expect(styles.color).toContain('success');
  });

  it('returns warning colors for behind status', () => {
    const styles = getStatusStyles('behind');
    expect(styles.bg).toContain('warning');
    expect(styles.color).toContain('warning');
  });

  it('returns error colors for critical status', () => {
    const styles = getStatusStyles('critical');
    expect(styles.bg).toContain('error');
    expect(styles.color).toContain('error');
  });

  it('returns muted colors when disabled', () => {
    const styles = getStatusStyles('on_track', false);
    expect(styles.color).toContain('muted');
  });
});

describe('getStatusStylesExtended', () => {
  it('includes progressColor', () => {
    const styles = getStatusStylesExtended('on_track');
    expect(styles).toHaveProperty('bg');
    expect(styles).toHaveProperty('color');
    expect(styles).toHaveProperty('progressColor');
  });

  it('returns correct progress colors for each status', () => {
    expect(getStatusStylesExtended('funded').progressColor).toContain('success');
    expect(getStatusStylesExtended('behind').progressColor).toContain('warning');
    expect(getStatusStylesExtended('critical').progressColor).toContain('error');
  });
});

describe('isAttentionStatus', () => {
  it('returns true for critical and due_now', () => {
    expect(isAttentionStatus('critical')).toBe(true);
    expect(isAttentionStatus('due_now')).toBe(true);
  });

  it('returns false for healthy statuses', () => {
    expect(isAttentionStatus('on_track')).toBe(false);
    expect(isAttentionStatus('funded')).toBe(false);
    expect(isAttentionStatus('ahead')).toBe(false);
  });
});

describe('isHealthyStatus', () => {
  it('returns true for healthy statuses', () => {
    expect(isHealthyStatus('funded')).toBe(true);
    expect(isHealthyStatus('on_track')).toBe(true);
    expect(isHealthyStatus('ahead')).toBe(true);
  });

  it('returns false for unhealthy statuses', () => {
    expect(isHealthyStatus('behind')).toBe(false);
    expect(isHealthyStatus('critical')).toBe(false);
    expect(isHealthyStatus('due_now')).toBe(false);
  });
});
