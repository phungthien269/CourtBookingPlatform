import { useEffect, useState } from 'react';

interface ToastProps {
    message: string;
    type?: 'success' | 'error' | 'warning' | 'info';
    duration?: number;
    onClose: () => void;
}

const typeStyles = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    warning: 'bg-yellow-500',
    info: 'bg-blue-500',
};

const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ',
};

export function Toast({ message, type = 'info', duration = 3000, onClose }: ToastProps) {
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsVisible(false);
            setTimeout(onClose, 300); // Wait for animation
        }, duration);

        return () => clearTimeout(timer);
    }, [duration, onClose]);

    return (
        <div
            className={`
        fixed bottom-20 right-4 flex items-center gap-3 px-4 py-3 rounded-lg text-white shadow-lg
        transition-all duration-300 z-50
        ${typeStyles[type]}
        ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}
      `}
        >
            <span className="text-lg">{icons[type]}</span>
            <span>{message}</span>
            <button onClick={onClose} className="ml-2 hover:opacity-80">
                ✕
            </button>
        </div>
    );
}

// Toast container for managing multiple toasts
interface ToastItem {
    id: string;
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
}

let toastId = 0;
let addToastFn: ((toast: Omit<ToastItem, 'id'>) => void) | null = null;

export function ToastContainer() {
    const [toasts, setToasts] = useState<ToastItem[]>([]);

    addToastFn = (toast) => {
        const id = String(toastId++);
        setToasts((prev) => [...prev, { ...toast, id }]);
    };

    const removeToast = (id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    };

    return (
        <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-50">
            {toasts.map((toast) => (
                <Toast
                    key={toast.id}
                    message={toast.message}
                    type={toast.type}
                    onClose={() => removeToast(toast.id)}
                />
            ))}
        </div>
    );
}

export function toast(message: string, type: ToastItem['type'] = 'info') {
    addToastFn?.({ message, type });
}
