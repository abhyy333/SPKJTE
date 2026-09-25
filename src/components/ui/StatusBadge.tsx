import React from 'react';
import { cn } from '../../lib/utils';

export type BadgeVariant =
  | 'wajib'
  | 'pilihan'
  | 'aktif'
  | 'nonaktif'
  | 'cuti'
  | 'terjadwal'
  | 'bentrok'
  | 'kritis'
  | 'tinggi'
  | 'sedang'
  | 'rendah'
  | 'terbit'
  | 'draft'
  | 'tersedia'
  | 'terbatas'
  | 'tidak-tersedia'
  | 'reguler'
  | 'default';

interface StatusBadgeProps {
  label: string;
  variant?: BadgeVariant;
  showDot?: boolean;
  className?: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  label,
  variant,
  showDot = false,
  className,
  size = 'md',
}) => {
  // Infer variant if not provided
  let computedVariant: BadgeVariant = variant || 'default';
  if (!variant) {
    const l = label.toLowerCase();
    if (l === 'wajib') computedVariant = 'wajib';
    else if (l === 'pilihan') computedVariant = 'pilihan';
    else if (l === 'aktif' || l === 'terjadwal' || l === 'tersedia') computedVariant = 'aktif';
    else if (l === 'nonaktif' || l === 'cuti') computedVariant = 'nonaktif';
    else if (l === 'bentrok' || l === 'kritis') computedVariant = 'kritis';
    else if (l === 'tinggi') computedVariant = 'tinggi';
    else if (l === 'sedang') computedVariant = 'sedang';
    else if (l === 'rendah') computedVariant = 'rendah';
    else if (l === 'terbit' || l === 'published') computedVariant = 'terbit';
    else if (l === 'draft') computedVariant = 'draft';
    else if (l === 'terbatas') computedVariant = 'terbatas';
    else if (l === 'tidak tersedia' || l === 'tidak-tersedia') computedVariant = 'tidak-tersedia';
    else if (l === 'reguler') computedVariant = 'reguler';
  }

  const styles: Record<BadgeVariant, { bg: string; text: string; border: string; dot?: string }> = {
    wajib: {
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      border: 'border-blue-200',
      dot: 'bg-blue-600',
    },
    pilihan: {
      bg: 'bg-purple-50',
      text: 'text-purple-700',
      border: 'border-purple-200',
      dot: 'bg-purple-600',
    },
    aktif: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      border: 'border-emerald-200',
      dot: 'bg-emerald-500',
    },
    terjadwal: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      border: 'border-emerald-200',
      dot: 'bg-emerald-500',
    },
    tersedia: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      border: 'border-emerald-200',
      dot: 'bg-emerald-500',
    },
    terbit: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      border: 'border-emerald-200',
      dot: 'bg-emerald-500',
    },
    nonaktif: {
      bg: 'bg-rose-50',
      text: 'text-rose-700',
      border: 'border-rose-200',
      dot: 'bg-rose-500',
    },
    cuti: {
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      border: 'border-amber-200',
      dot: 'bg-amber-500',
    },
    bentrok: {
      bg: 'bg-rose-50',
      text: 'text-rose-700',
      border: 'border-rose-200',
      dot: 'bg-rose-600',
    },
    kritis: {
      bg: 'bg-rose-100',
      text: 'text-rose-800 font-semibold',
      border: 'border-rose-300',
      dot: 'bg-rose-600',
    },
    tinggi: {
      bg: 'bg-orange-50',
      text: 'text-orange-700 font-semibold',
      border: 'border-orange-200',
      dot: 'bg-orange-500',
    },
    sedang: {
      bg: 'bg-amber-50',
      text: 'text-amber-800',
      border: 'border-amber-200',
      dot: 'bg-amber-500',
    },
    rendah: {
      bg: 'bg-slate-100',
      text: 'text-slate-700',
      border: 'border-slate-200',
      dot: 'bg-slate-400',
    },
    draft: {
      bg: 'bg-sky-50',
      text: 'text-sky-700',
      border: 'border-sky-200',
      dot: 'bg-sky-500',
    },
    terbatas: {
      bg: 'bg-amber-50',
      text: 'text-amber-800',
      border: 'border-amber-200',
      dot: 'bg-amber-500',
    },
    'tidak-tersedia': {
      bg: 'bg-rose-50',
      text: 'text-rose-700',
      border: 'border-rose-200',
      dot: 'bg-rose-500',
    },
    reguler: {
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      border: 'border-blue-200',
      dot: 'bg-blue-500',
    },
    default: {
      bg: 'bg-slate-100',
      text: 'text-slate-700',
      border: 'border-slate-200',
      dot: 'bg-slate-400',
    },
  };

  const style = styles[computedVariant] || styles.default;
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium border transition-colors',
        style.bg,
        style.text,
        style.border,
        sizeClasses,
        className
      )}
    >
      {showDot && (
        <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', style.dot)} />
      )}
      {label}
    </span>
  );
};
