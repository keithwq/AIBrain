export type ToastType = 'error' | 'info';

let toastId = 0;
let addToastFn: ((id: number, message: string, type: ToastType) => void) | null = null;

export function showToast(message: string, type: ToastType = 'error') {
  addToastFn?.(++toastId, message, type);
}

export function bindToastStore(handler: ((id: number, message: string, type: ToastType) => void) | null) {
  addToastFn = handler;
}
