// Animation Utilities and Helpers

// Animation durations (in milliseconds)
export const DURATIONS = {
  INSTANT: 0,
  FAST: 150,
  NORMAL: 300,
  SLOW: 500,
  VERY_SLOW: 1000,
};

// Easing functions
export const EASINGS = {
  LINEAR: 'linear',
  EASE: 'ease',
  EASE_IN: 'ease-in',
  EASE_OUT: 'ease-out',
  EASE_IN_OUT: 'ease-in-out',
  EASE_IN_QUAD: 'cubic-bezier(0.55, 0.085, 0.68, 0.53)',
  EASE_OUT_QUAD: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  EASE_IN_OUT_QUAD: 'cubic-bezier(0.455, 0.03, 0.515, 0.955)',
  EASE_IN_CUBIC: 'cubic-bezier(0.55, 0.055, 0.675, 0.19)',
  EASE_OUT_CUBIC: 'cubic-bezier(0.215, 0.61, 0.355, 1)',
  EASE_IN_OUT_CUBIC: 'cubic-bezier(0.645, 0.045, 0.355, 1)',
  SPRING: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
};

// Check if user prefers reduced motion
export function shouldReduceMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Get animation duration based on user preference
export function getAnimationDuration(duration = DURATIONS.NORMAL) {
  return shouldReduceMotion() ? 0 : duration;
}

// Fade animations
export const fadeIn = (duration = DURATIONS.NORMAL, easing = EASINGS.EASE_OUT) => ({
  from: { opacity: 0 },
  to: { opacity: 1 },
  config: { duration: getAnimationDuration(duration), easing },
});

export const fadeOut = (duration = DURATIONS.NORMAL, easing = EASINGS.EASE_IN) => ({
  from: { opacity: 1 },
  to: { opacity: 0 },
  config: { duration: getAnimationDuration(duration), easing },
});

// Slide animations
export const slideInFromRight = (duration = DURATIONS.NORMAL) => ({
  from: { transform: 'translateX(100%)', opacity: 0 },
  to: { transform: 'translateX(0)', opacity: 1 },
  config: { duration: getAnimationDuration(duration), easing: EASINGS.EASE_OUT_CUBIC },
});

export const slideInFromLeft = (duration = DURATIONS.NORMAL) => ({
  from: { transform: 'translateX(-100%)', opacity: 0 },
  to: { transform: 'translateX(0)', opacity: 1 },
  config: { duration: getAnimationDuration(duration), easing: EASINGS.EASE_OUT_CUBIC },
});

export const slideInFromTop = (duration = DURATIONS.NORMAL) => ({
  from: { transform: 'translateY(-100%)', opacity: 0 },
  to: { transform: 'translateY(0)', opacity: 1 },
  config: { duration: getAnimationDuration(duration), easing: EASINGS.EASE_OUT_CUBIC },
});

export const slideInFromBottom = (duration = DURATIONS.NORMAL) => ({
  from: { transform: 'translateY(100%)', opacity: 0 },
  to: { transform: 'translateY(0)', opacity: 1 },
  config: { duration: getAnimationDuration(duration), easing: EASINGS.EASE_OUT_CUBIC },
});

// Scale animations
export const scaleIn = (duration = DURATIONS.NORMAL) => ({
  from: { transform: 'scale(0.8)', opacity: 0 },
  to: { transform: 'scale(1)', opacity: 1 },
  config: { duration: getAnimationDuration(duration), easing: EASINGS.EASE_OUT_CUBIC },
});

export const scaleOut = (duration = DURATIONS.NORMAL) => ({
  from: { transform: 'scale(1)', opacity: 1 },
  to: { transform: 'scale(0.8)', opacity: 0 },
  config: { duration: getAnimationDuration(duration), easing: EASINGS.EASE_IN_CUBIC },
});

// Bounce animation
export const bounce = (duration = DURATIONS.SLOW) => ({
  keyframes: [
    { transform: 'translateY(0)', offset: 0 },
    { transform: 'translateY(-30px)', offset: 0.5 },
    { transform: 'translateY(0)', offset: 1 },
  ],
  config: { duration: getAnimationDuration(duration), easing: EASINGS.EASE_IN_OUT_QUAD },
});

// Shake animation
export const shake = (duration = DURATIONS.FAST) => ({
  keyframes: [
    { transform: 'translateX(0)', offset: 0 },
    { transform: 'translateX(-10px)', offset: 0.25 },
    { transform: 'translateX(10px)', offset: 0.5 },
    { transform: 'translateX(-10px)', offset: 0.75 },
    { transform: 'translateX(0)', offset: 1 },
  ],
  config: { duration: getAnimationDuration(duration), easing: EASINGS.LINEAR },
});

// Pulse animation
export const pulse = (duration = DURATIONS.SLOW) => ({
  keyframes: [
    { transform: 'scale(1)', offset: 0 },
    { transform: 'scale(1.05)', offset: 0.5 },
    { transform: 'scale(1)', offset: 1 },
  ],
  config: { duration: getAnimationDuration(duration), easing: EASINGS.EASE_IN_OUT_QUAD },
});

// Spin animation
export const spin = (duration = DURATIONS.VERY_SLOW) => ({
  keyframes: [
    { transform: 'rotate(0deg)', offset: 0 },
    { transform: 'rotate(360deg)', offset: 1 },
  ],
  config: { duration: getAnimationDuration(duration), easing: EASINGS.LINEAR, iterations: Infinity },
});

// Animate element with Web Animations API
export function animate(element, animation, options = {}) {
  if (!element || shouldReduceMotion()) {
    return Promise.resolve();
  }

  const { keyframes, config } = animation;
  const animationOptions = {
    duration: config.duration || DURATIONS.NORMAL,
    easing: config.easing || EASINGS.EASE_OUT,
    fill: options.fill || 'forwards',
    iterations: config.iterations || 1,
    ...options,
  };

  if (keyframes) {
    return element.animate(keyframes, animationOptions).finished;
  }

  if (animation.from && animation.to) {
    return element.animate([animation.from, animation.to], animationOptions).finished;
  }

  return Promise.resolve();
}

// Stagger animations for lists
export function staggerAnimation(elements, animation, staggerDelay = 50) {
  if (shouldReduceMotion()) {
    return Promise.resolve();
  }

  const promises = Array.from(elements).map((element, index) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        animate(element, animation).then(resolve);
      }, index * staggerDelay);
    });
  });

  return Promise.all(promises);
}

// Transition helper for enter/exit animations
export class TransitionManager {
  constructor(element, enterAnimation, exitAnimation) {
    this.element = element;
    this.enterAnimation = enterAnimation;
    this.exitAnimation = exitAnimation;
    this.isVisible = false;
  }

  async enter() {
    if (this.isVisible) return;
    this.isVisible = true;
    this.element.style.display = 'block';
    await animate(this.element, this.enterAnimation);
  }

  async exit() {
    if (!this.isVisible) return;
    this.isVisible = false;
    await animate(this.element, this.exitAnimation);
    this.element.style.display = 'none';
  }

  toggle() {
    return this.isVisible ? this.exit() : this.enter();
  }
}

// Scroll animations
export function scrollToElement(element, options = {}) {
  if (!element) return;

  const behavior = shouldReduceMotion() ? 'auto' : 'smooth';

  element.scrollIntoView({
    behavior,
    block: options.block || 'start',
    inline: options.inline || 'nearest',
  });
}

export function scrollToTop(options = {}) {
  const behavior = shouldReduceMotion() ? 'auto' : 'smooth';

  window.scrollTo({
    top: 0,
    left: 0,
    behavior,
    ...options,
  });
}

// Parallax effect
export function createParallaxEffect(element, speed = 0.5) {
  if (shouldReduceMotion()) return () => {};

  const handleScroll = () => {
    const scrolled = window.pageYOffset;
    const offset = scrolled * speed;
    element.style.transform = `translateY(${offset}px)`;
  };

  window.addEventListener('scroll', handleScroll);
  return () => window.removeEventListener('scroll', handleScroll);
}

// Intersection Observer for scroll-triggered animations
export function animateOnScroll(elements, animation, options = {}) {
  if (shouldReduceMotion()) return () => {};

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animate(entry.target, animation);
          if (options.once) {
            observer.unobserve(entry.target);
          }
        }
      });
    },
    {
      threshold: options.threshold || 0.1,
      rootMargin: options.rootMargin || '0px',
    }
  );

  elements.forEach((element) => observer.observe(element));

  return () => observer.disconnect();
}

// CSS class-based animations
export function addAnimationClass(element, className, duration = DURATIONS.NORMAL) {
  if (shouldReduceMotion()) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    element.classList.add(className);
    setTimeout(() => {
      element.classList.remove(className);
      resolve();
    }, duration);
  });
}

// Tailwind animation classes
export const ANIMATION_CLASSES = {
  FADE_IN: 'animate-fade-in',
  FADE_OUT: 'animate-fade-out',
  SLIDE_IN_RIGHT: 'animate-slide-in-right',
  SLIDE_IN_LEFT: 'animate-slide-in-left',
  SLIDE_IN_UP: 'animate-slide-in-up',
  SLIDE_IN_DOWN: 'animate-slide-in-down',
  SCALE_IN: 'animate-scale-in',
  SCALE_OUT: 'animate-scale-out',
  BOUNCE: 'animate-bounce',
  PULSE: 'animate-pulse',
  SPIN: 'animate-spin',
  PING: 'animate-ping',
};

// Usage examples:
/*
// Basic animation
import { animate, fadeIn, slideInFromRight } from './lib/animations';

const element = document.querySelector('.my-element');
animate(element, fadeIn());

// Stagger animation for list items
import { staggerAnimation, scaleIn } from './lib/animations';

const items = document.querySelectorAll('.list-item');
staggerAnimation(items, scaleIn(), 100);

// Transition manager
import { TransitionManager, fadeIn, fadeOut } from './lib/animations';

const modal = document.querySelector('.modal');
const transition = new TransitionManager(modal, fadeIn(), fadeOut());

// Show modal
transition.enter();

// Hide modal
transition.exit();

// Scroll animations
import { animateOnScroll, slideInFromBottom } from './lib/animations';

const cards = document.querySelectorAll('.card');
const cleanup = animateOnScroll(cards, slideInFromBottom(), { once: true });

// Cleanup when component unmounts
cleanup();

// React hook example
import { useEffect, useRef } from 'react';
import { animate, fadeIn } from './lib/animations';

function MyComponent() {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current) {
      animate(ref.current, fadeIn());
    }
  }, []);

  return <div ref={ref}>Content</div>;
}
*/
