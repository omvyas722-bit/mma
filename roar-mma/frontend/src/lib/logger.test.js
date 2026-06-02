import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('logger', () => {
  let logger;

  beforeEach(async () => {
    vi.restoreAllMocks();
    logger = (await import('./logger')).default;
    logger.setLevel(0);
  });

  it('logs info message', () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {});
    logger.info('test');
    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/\[INFO\] test$/));
  });

  it('logs warn message', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    logger.warn('warning');
    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/\[WARN\] warning$/));
  });

  it('always logs error', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    logger.error('crash');
    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/\[ERROR\] crash$/));
  });

  it('logs debug message', () => {
    const spy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    logger.debug('detail');
    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/\[DEBUG\] detail$/));
  });
});
