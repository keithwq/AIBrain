import { useEffect, useState } from 'react';

interface ToastItem {
  id: number;
  message: string;
  type: 'error' | 'info';
}

let toastId = 0;
let addToastFn: ((msg: string, type: 'error' | 'info') => void) | null = null;

export function showToast(message: string, type: 'error' | 'info' = 'error') {
  addToastFn?.(message, type);
}

export default function Toast() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    addToastFn = (message, type) => {
      const id = ++toastId;
      setItems(prev => [...prev, { id, message, type }]);
      setTimeout(() => setItems(prev => prev.filter(i => i.id !== id)), 3000);
    };
    return () => { addToastFn = null; };
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {items.map(item => (
        <div
          key={item.id}
          className={`px-4 py-2 rounded-lg shadow-lg text-sm text-white transition-all ${
            item.type === 'error' ? 'bg-red-500' : 'bg-blue-500'
          }`}
        >
          {item.message}
        </div>
      ))}
    </div>
  );
}
