import { useState } from 'react';

export default function useScrollLock() {
  const [
    scrollEnabled,
    setScrollEnabled,
  ] = useState(true);

  const lockScroll =
    () =>
      setScrollEnabled(
        false
      );

  const unlockScroll =
    () =>
      setScrollEnabled(
        true
      );

  return {
    scrollEnabled,
    lockScroll,
    unlockScroll,
  };
}