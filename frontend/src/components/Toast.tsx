import { useEffect, useState } from 'react';
import { bindToastStore, type ToastType } from './toastStore';

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

export default function Toast() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    bindToastStore((id, message, type) => {
      setItems(prev => [...prev, { id, message, type }]);
      setTimeout(() => setItems(prev => prev.filter(i => i.id !== id)), 3000);
    });
    return () => bindToastStore(null);
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
