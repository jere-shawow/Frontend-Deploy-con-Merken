'use client';

import { useEffect, useState } from 'react';

function readItems(key) {
  try {
    const saved = JSON.parse(localStorage.getItem(key));
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

export function useLocalState(key) {
  const [items, setItems] = useState(null);
  useEffect(() => {
    function read() {
      setItems(readItems(key));
    }
    read();
    function sync(event) {
      if (event.key === key || event.key === null) read();
    }
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, [key]);
  function update(transform) {
    const next = transform(readItems(key));
    localStorage.setItem(key, JSON.stringify(next));
    setItems(next);
  }
  return [items, update];
}
