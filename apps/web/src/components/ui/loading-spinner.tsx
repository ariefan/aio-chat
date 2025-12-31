import { RefreshCw, Loader2 } from 'lucide-react';
import { cn } from '@workspace/ui/lib/utils';

/**
 * Unified loading spinner component
 * Replaces all inconsistent loading state implementations
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface LoadingSpinnerProps {
  /** Size of the spinner */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /** Optional text to display below spinner */
  text?: string;
  /** Variant style */
  variant?: 'primary' | 'secondary' | 'muted';
  /** Icon type */
  icon?: 'spinner' | 'refresh';
  /** Center in container */
  centered?: boolean;
  /** Additional className */
  className?: string;
}

// ============================================================================
// SIZE CONFIGURATIONS
// ============================================================================

const sizeConfig = {
  xs: {
    icon: 'h-3 w-3',
    text: 'text-xs',
    gap: 'gap-1',
  },
  sm: {
    icon: 'h-4 w-4',
    text: 'text-sm',
    gap: 'gap-1.5',
  },
  md: {
    icon: 'h-6 w-6',
    text: 'text-sm',
    gap: 'gap-2',
  },
  lg: {
    icon: 'h-8 w-8',
    text: 'text-base',
    gap: 'gap-2',
  },
  xl: {
    icon: 'h-12 w-12',
    text: 'text-lg',
    gap: 'gap-3',
  },
};

const variantConfig = {
  primary: 'text-primary',
  secondary: 'text-secondary',
  muted: 'text-muted-foreground',
};

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * LoadingSpinner - Unified loading state component
 *
 * @example
 * ```tsx
 * <LoadingSpinner />
 * <LoadingSpinner size="lg" text="Memuat data..." />
 * <LoadingSpinner variant="primary" centered />
 * ```
 */
export function LoadingSpinner({
  size = 'md',
  text,
  variant = 'muted',
  icon = 'spinner',
  centered = false,
  className,
}: LoadingSpinnerProps) {
  const IconComponent = icon === 'refresh' ? RefreshCw : Loader2;
  const config = sizeConfig[size];

  const spinner = (
    <div
      className={cn(
        'flex flex-col items-center',
        config.gap,
        centered && 'justify-center min-h-[200px]',
        className
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <IconComponent
        className={cn(
          config.icon,
          variantConfig[variant],
          'animate-spin'
        )}
        aria-hidden="true"
      />
      {text && (
        <p className={cn(config.text, variantConfig[variant])}>
          {text}
        </p>
      )}
      <span className="sr-only">{text || 'Memuat...'}</span>
    </div>
  );

  return spinner;
}

// ============================================================================
// CONVENIENCE COMPONENTS
// ============================================================================

/**
 * Page-level loading spinner - full screen centered
 */
export function PageLoader({ text = 'Memuat...' }: { text?: string }) {
  return (
    <div className="flex items-center justify-center min-h-[400px] w-full">
      <LoadingSpinner size="lg" text={text} variant="primary" />
    </div>
  );
}

/**
 * Button loading spinner - small inline spinner
 */
export function ButtonLoader() {
  return <LoadingSpinner size="sm" variant="primary" />;
}

/**
 * Section loading spinner - medium centered in section
 */
export function SectionLoader({ text }: { text?: string }) {
  return <LoadingSpinner size="md" text={text} centered />;
}

/**
 * Inline loading spinner - extra small for inline use
 */
export function InlineLoader() {
  return <LoadingSpinner size="xs" variant="muted" />;
}

/**
 * Legacy border spinner for backward compatibility
 * @deprecated Use LoadingSpinner instead
 */
export function BorderSpinner() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary" />
    </div>
  );
}
