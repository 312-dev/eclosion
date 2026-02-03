import { describe, it, expect } from 'vitest';
import { validateSubdomain } from './validation';

describe('validateSubdomain', () => {
  it('accepts valid subdomains', () => {
    expect(validateSubdomain('my-home')).toEqual({ valid: true });
    expect(validateSubdomain('abc')).toEqual({ valid: true });
    expect(validateSubdomain('a1b2c3')).toEqual({ valid: true });
    expect(validateSubdomain('my-super-long-subdomain-name-12')).toEqual({ valid: true });
    expect(validateSubdomain('cool-project')).toEqual({ valid: true });
  });

  it('rejects empty input', () => {
    const result = validateSubdomain('');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('required');
  });

  it('rejects subdomains shorter than 3 characters', () => {
    expect(validateSubdomain('ab').valid).toBe(false);
    expect(validateSubdomain('a').valid).toBe(false);
  });

  it('rejects subdomains longer than 32 characters', () => {
    const long = 'a'.repeat(33);
    expect(validateSubdomain(long).valid).toBe(false);
  });

  it('rejects leading hyphens', () => {
    expect(validateSubdomain('-abc').valid).toBe(false);
  });

  it('rejects trailing hyphens', () => {
    expect(validateSubdomain('abc-').valid).toBe(false);
  });

  it('normalizes uppercase to lowercase before validating', () => {
    // validateSubdomain normalizes input, so uppercase is accepted
    expect(validateSubdomain('ABC').valid).toBe(true);
    // But uppercase reserved names are still caught after normalization
    expect(validateSubdomain('API').valid).toBe(false);
    expect(validateSubdomain('Admin').valid).toBe(false);
  });

  it('rejects special characters', () => {
    expect(validateSubdomain('ab.cd').valid).toBe(false);
    expect(validateSubdomain('ab_cd').valid).toBe(false);
    expect(validateSubdomain('ab cd').valid).toBe(false);
    expect(validateSubdomain('ab@cd').valid).toBe(false);
  });

  it('rejects reserved names', () => {
    const reserved = ['www', 'api', 'app', 'admin', 'mail', 'cdn', 'docs', 'blog', 'status', 'help', 'support', 'tunnel', 'demo', 'beta', 'test', 'dev', 'dashboard', 'ftp', 'smtp', 'webmaster'];
    for (const name of reserved) {
      const result = validateSubdomain(name);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('reserved');
    }
  });

  it('allows names similar to but not matching reserved names', () => {
    expect(validateSubdomain('my-api').valid).toBe(true);
    expect(validateSubdomain('admin2').valid).toBe(true);
    expect(validateSubdomain('the-blog').valid).toBe(true);
  });

  it('rejects offensive terms', () => {
    expect(validateSubdomain('my-porn-site').valid).toBe(false);
    expect(validateSubdomain('xxx123').valid).toBe(false);
    expect(validateSubdomain('nazistuff').valid).toBe(false);
  });

  it('rejects brand impersonation', () => {
    expect(validateSubdomain('eclosion-official').valid).toBe(false);
    expect(validateSubdomain('my-paypal').valid).toBe(false);
    expect(validateSubdomain('cloudflare-cdn').valid).toBe(false);
  });

  it('rejects phishing patterns', () => {
    expect(validateSubdomain('login-here').valid).toBe(false);
    expect(validateSubdomain('verify-account').valid).toBe(false);
    expect(validateSubdomain('secure-banking').valid).toBe(false);
  });

  it('gives generic error for blocked terms (no revealing which term matched)', () => {
    const result = validateSubdomain('xxx123');
    expect(result.error).toBe('This subdomain is not allowed');
  });
});
