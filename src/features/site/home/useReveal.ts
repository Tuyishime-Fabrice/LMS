import { useCallback, useEffect, useState } from "react";

/**
 * One IntersectionObserver for the whole page: an element gets `is-in` the first time it
 * enters the viewport, then is never watched again (every reveal runs once).
 * The CSS for `.reveal` and `.plus-mask` lives in src/index.css and is off under reduced motion.
 * Put the ref on an element without a clip-path: browsers measure visibility after clipping,
 * so a masked photo would never count as visible (`.is-in .plus-mask` handles the child).
 */
let observer: IntersectionObserver | null = null;
const callbacks = new WeakMap<Element, () => void>();

function shared(): IntersectionObserver | null {
  if (typeof window === "undefined" || !("IntersectionObserver" in window)) return null;
  if (!observer) {
    observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        callbacks.get(entry.target)?.();
        observer?.unobserve(entry.target);
      }
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0 });
  }
  return observer;
}

/**
 * Callback ref for an element that reveals once in view, so elements that mount later
 * (after data loads) are picked up too. Pass `ready = false` to hold it (for example, until the intro ends).
 */
export function useReveal<T extends Element>(ready = true) {
  const [element, setElement] = useState<T | null>(null);
  const ref = useCallback((node: T | null) => setElement(node), []);
  useEffect(() => {
    if (!element || !ready) return;
    const show = () => element.classList.add("is-in");
    const io = shared();
    if (!io) { show(); return; }
    callbacks.set(element, show);
    io.observe(element);
    return () => { io.unobserve(element); callbacks.delete(element); };
  }, [element, ready]);
  return ref;
}
