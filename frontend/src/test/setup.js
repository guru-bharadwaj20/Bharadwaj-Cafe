import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.clearAllMocks();
});

// jsdom does not implement these; several components call them on mount.
window.scrollTo = vi.fn();
Element.prototype.scrollIntoView = vi.fn();
