import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useToast, type Toast } from '../contexts/ToastContext';
import { cn } from './ui/utils';

const icons = {
    success: CheckCircle,
    error: XCircle,
    warning: AlertTriangle,
    info: Info,
};

const styles = {
    success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
    error: 'border-red-500/30 bg-red-500/10 text-red-400',
    warning: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
    info: 'border-blue-500/30 bg-blue-500/10 text-blue-400',
};

function ToastItem({ toast }: { toast: Toast }) {
    const { hideToast } = useToast();
    const Icon = icons[toast.type];

    return (
        <div
            className={cn(
                'pointer-events-auto flex items-start gap-3 rounded-2xl border p-4 shadow-glass backdrop-blur-sm',
                'animate-in slide-in-from-right duration-300',
                styles[toast.type]
            )}
        >
            <Icon className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <p className="flex-1 text-sm text-white">{toast.message}</p>
            <button
                type="button"
                onClick={() => hideToast(toast.id)}
                className="flex-shrink-0 rounded-full p-1 transition hover:bg-white/10"
                aria-label="Fechar notificação"
            >
                <X className="h-4 w-4" />
            </button>
        </div>
    );
}

export default function ToastContainer() {
    const { toasts } = useToast();

    if (toasts.length === 0) return null;

    return (
        <div className="pointer-events-none fixed right-4 top-4 z-[9999] flex max-w-sm flex-col gap-2">
            {toasts.map((toast) => (
                <ToastItem key={toast.id} toast={toast} />
            ))}
        </div>
    );
}
