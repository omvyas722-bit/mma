import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('animations', () => {
  let mod;

  beforeEach(async () => {
    vi.restoreAllMocks();
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false })));
    mod = await import('./animations');
  });

  describe('DURATIONS', () => {
    it('contains expected duration constants', () => {
      expect(mod.DURATIONS.INSTANT).toBe(0);
      expect(mod.DURATIONS.FAST).toBe(150);
      expect(mod.DURATIONS.NORMAL).toBe(300);
      expect(mod.DURATIONS.SLOW).toBe(500);
      expect(mod.DURATIONS.VERY_SLOW).toBe(1000);
    });
  });

  describe('EASINGS', () => {
    it('contains expected easing constants', () => {
      expect(mod.EASINGS.LINEAR).toBe('linear');
      expect(mod.EASINGS.EASE).toBe('ease');
      expect(mod.EASINGS.EASE_OUT).toBe('ease-out');
    });
  });

  describe('shouldReduceMotion', () => {
    it('returns false by default', () => {
      expect(mod.shouldReduceMotion()).toBe(false);
    });

    it('returns true when prefers-reduced-motion matches', () => {
      vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true })));
      expect(mod.shouldReduceMotion()).toBe(true);
    });
  });

  describe('getAnimationDuration', () => {
    it('returns 0 when reduced motion', () => {
      vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true })));
      expect(mod.getAnimationDuration(300)).toBe(0);
    });

    it('returns the duration normally', () => {
      expect(mod.getAnimationDuration(300)).toBe(300);
    });
  });

  describe('fadeIn', () => {
    it('returns from/to/config shape', () => {
      const anim = mod.fadeIn();
      expect(anim.from).toEqual({ opacity: 0 });
      expect(anim.to).toEqual({ opacity: 1 });
      expect(anim.config.duration).toBe(300);
      expect(anim.config.easing).toBe('ease-out');
    });
  });

  describe('fadeOut', () => {
    it('returns from/to/config shape', () => {
      const anim = mod.fadeOut();
      expect(anim.from).toEqual({ opacity: 1 });
      expect(anim.to).toEqual({ opacity: 0 });
    });
  });

  describe('slideInFromRight', () => {
    it('returns slide animation from right', () => {
      const anim = mod.slideInFromRight();
      expect(anim.from.transform).toContain('translateX(100%)');
      expect(anim.to.transform).toContain('translateX(0)');
    });
  });

  describe('slideInFromLeft', () => {
    it('returns slide animation from left', () => {
      const anim = mod.slideInFromLeft();
      expect(anim.from.transform).toContain('translateX(-100%)');
    });
  });

  describe('slideInFromTop', () => {
    it('returns slide animation from top', () => {
      const anim = mod.slideInFromTop();
      expect(anim.from.transform).toContain('translateY(-100%)');
    });
  });

  describe('slideInFromBottom', () => {
    it('returns slide animation from bottom', () => {
      const anim = mod.slideInFromBottom();
      expect(anim.from.transform).toContain('translateY(100%)');
    });
  });

  describe('scaleIn', () => {
    it('returns scale animation', () => {
      const anim = mod.scaleIn();
      expect(anim.from.transform).toContain('scale(0.8)');
      expect(anim.to.transform).toContain('scale(1)');
    });
  });

  describe('scaleOut', () => {
    it('returns scale out animation', () => {
      const anim = mod.scaleOut();
      expect(anim.from.transform).toContain('scale(1)');
      expect(anim.to.transform).toContain('scale(0.8)');
    });
  });

  describe('bounce', () => {
    it('returns keyframes array', () => {
      const anim = mod.bounce();
      expect(Array.isArray(anim.keyframes)).toBe(true);
      expect(anim.keyframes.length).toBe(3);
    });
  });

  describe('shake', () => {
    it('returns keyframes with offset values', () => {
      const anim = mod.shake();
      expect(anim.keyframes.length).toBe(5);
      expect(anim.keyframes[0].offset).toBe(0);
    });
  });

  describe('pulse', () => {
    it('returns keyframes array', () => {
      const anim = mod.pulse();
      expect(anim.keyframes.length).toBe(3);
    });
  });

  describe('spin', () => {
    it('returns keyframes with Infinity iterations', () => {
      const anim = mod.spin();
      expect(anim.keyframes.length).toBe(2);
      expect(anim.config.iterations).toBe(Infinity);
    });
  });

  describe('animate', () => {
    it('returns resolved promise when element is null', async () => {
      const result = await mod.animate(null, mod.fadeIn());
      expect(result).toBeUndefined();
    });

    it('returns resolved promise when reduced motion', async () => {
      vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true })));
      const el = {};
      const result = await mod.animate(el, mod.fadeIn());
      expect(result).toBeUndefined();
    });

    it('calls element.animate with from/to keyframes', () => {
      const el = { animate: vi.fn(() => ({ finished: Promise.resolve() })) };
      mod.animate(el, mod.fadeIn());
      expect(el.animate).toHaveBeenCalled();
    });

    it('calls element.animate with keyframes array', () => {
      const el = { animate: vi.fn(() => ({ finished: Promise.resolve() })) };
      mod.animate(el, mod.bounce());
      expect(el.animate).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ offset: expect.any(Number) })]),
        expect.any(Object),
      );
    });
  });

  describe('staggerAnimation', () => {
    it('returns resolved promise when reduced motion', async () => {
      vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true })));
      const result = await mod.staggerAnimation([{}, {}], mod.fadeIn());
      expect(result).toBeUndefined();
    });

    it('uses setTimeout for stagger delay', async () => {
      vi.useFakeTimers();
      const el1 = { animate: vi.fn(() => ({ finished: Promise.resolve() })) };
      const el2 = { animate: vi.fn(() => ({ finished: Promise.resolve() })) };
      const promise = mod.staggerAnimation([el1, el2], mod.fadeIn(), 50);
      expect(el1.animate).not.toHaveBeenCalled();
      vi.advanceTimersByTime(50);
      await Promise.resolve();
      expect(el1.animate).toHaveBeenCalled();
      vi.advanceTimersByTime(50);
      await Promise.resolve();
      expect(el2.animate).toHaveBeenCalled();
      vi.useRealTimers();
    });
  });

  describe('TransitionManager', () => {
    it('enter sets display block and animates', async () => {
      const el = { style: { display: 'none' }, animate: vi.fn(() => ({ finished: Promise.resolve() })) };
      const tm = new mod.TransitionManager(el, mod.fadeIn(), mod.fadeOut());
      await tm.enter();
      expect(el.style.display).toBe('block');
      expect(el.animate).toHaveBeenCalled();
    });

    it('exit animates then sets display none', async () => {
      const el = { style: { display: 'block' }, animate: vi.fn(() => ({ finished: Promise.resolve() })) };
      const tm = new mod.TransitionManager(el, mod.fadeIn(), mod.fadeOut());
      tm.isVisible = true;
      await tm.exit();
      expect(el.style.display).toBe('none');
    });

    it('toggle calls enter or exit based on visibility', () => {
      const el = { style: { display: 'none' }, animate: vi.fn(() => ({ finished: Promise.resolve() })) };
      const tm = new mod.TransitionManager(el, mod.fadeIn(), mod.fadeOut());
      tm.toggle();
      expect(el.style.display).toBe('block');
    });
  });

  describe('scrollToElement', () => {
    it('does nothing when element null', () => {
      expect(() => mod.scrollToElement(null)).not.toThrow();
    });

    it('calls scrollIntoView with options', () => {
      const el = { scrollIntoView: vi.fn() };
      mod.scrollToElement(el, { block: 'center' });
      expect(el.scrollIntoView).toHaveBeenCalledWith({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest',
      });
    });
  });

  describe('scrollToTop', () => {
    it('calls window.scrollTo', () => {
      const spy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
      mod.scrollToTop();
      expect(spy).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'smooth' });
    });
  });

  describe('createParallaxEffect', () => {
    it('returns empty fn when reduced motion', () => {
      vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true })));
      const cleanup = mod.createParallaxEffect({ style: {} }, 0.5);
      expect(typeof cleanup).toBe('function');
    });

    it('adds scroll listener, returns cleanup', () => {
      const addSpy = vi.spyOn(window, 'addEventListener');
      const removeSpy = vi.spyOn(window, 'removeEventListener');
      const el = { style: { transform: '' } };
      const cleanup = mod.createParallaxEffect(el, 0.5);
      expect(addSpy).toHaveBeenCalledWith('scroll', expect.any(Function));
      cleanup();
      expect(removeSpy).toHaveBeenCalledWith('scroll', expect.any(Function));
    });
  });

  describe('animateOnScroll', () => {
    it('returns empty fn when reduced motion', () => {
      vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true })));
      const cleanup = mod.animateOnScroll([], mod.fadeIn());
      expect(typeof cleanup).toBe('function');
    });

    it('creates IntersectionObserver and observes elements', () => {
      const observe = vi.fn();
      const disconnect = vi.fn();
      vi.stubGlobal('IntersectionObserver', vi.fn(function() { this.observe = observe; this.disconnect = disconnect; }));
      const el = { animate: vi.fn(() => ({ finished: Promise.resolve() })) };
      const cleanup = mod.animateOnScroll([el], mod.fadeIn());
      expect(observe).toHaveBeenCalledWith(el);
      cleanup();
      expect(disconnect).toHaveBeenCalled();
    });
  });

  describe('addAnimationClass', () => {
    it('returns resolved promise when reduced motion', async () => {
      vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true })));
      const el = { classList: { add: vi.fn(), remove: vi.fn() } };
      const result = await mod.addAnimationClass(el, 'animate-fade-in');
      expect(result).toBeUndefined();
    });

    it('adds and removes class with timeout', async () => {
      vi.useFakeTimers();
      const el = { classList: { add: vi.fn(), remove: vi.fn() } };
      const promise = mod.addAnimationClass(el, 'animate-fade-in', 300);
      expect(el.classList.add).toHaveBeenCalledWith('animate-fade-in');
      vi.advanceTimersByTime(300);
      await promise;
      expect(el.classList.remove).toHaveBeenCalledWith('animate-fade-in');
      vi.useRealTimers();
    });
  });

  describe('ANIMATION_CLASSES', () => {
    it('contains expected class constants', () => {
      expect(mod.ANIMATION_CLASSES.FADE_IN).toBe('animate-fade-in');
      expect(mod.ANIMATION_CLASSES.FADE_OUT).toBe('animate-fade-out');
      expect(mod.ANIMATION_CLASSES.SLIDE_IN_RIGHT).toBe('animate-slide-in-right');
      expect(mod.ANIMATION_CLASSES.SPIN).toBe('animate-spin');
    });
  });
});
