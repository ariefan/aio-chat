import { LucideIcon } from 'lucide-react';
import { cn } from '@workspace/ui/lib/utils';
import { Button } from '@workspace/ui/components/button';

/**
 * Unified empty state component
 * Replaces all inconsistent empty state implementations
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface EmptyStateProps {
  /** Icon to display */
  icon: LucideIcon;
  /** Main title */
  title: string;
  /** Optional description */
  description?: string;
  /** Optional action button */
  action?: {
    label: string;
    onClick: () => void;
  };
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Additional className */
  className?: string;
}

// ============================================================================
// SIZE CONFIGURATIONS
// ============================================================================

const sizeConfig = {
  sm: {
    container: 'py-6',
    icon: 'h-8 w-8',
    title: 'text-sm',
    description: 'text-xs',
    gap: 'gap-2',
  },
  md: {
    container: 'py-8',
    icon: 'h-10 w-10',
    title: 'text-base',
    description: 'text-sm',
    gap: 'gap-3',
  },
  lg: {
    container: 'py-12',
    icon: 'h-12 w-12',
    title: 'text-lg',
    description: 'text-base',
    gap: 'gap-4',
  },
};

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * EmptyState - Unified empty state component
 *
 * @example
 * ```tsx
 * <EmptyState
 *   icon={Users}
 *   title="Tidak ada data peserta"
 *   description="Tambahkan peserta BPJS untuk memulai"
 *   action={{
 *     label: "Tambah Peserta",
 *     onClick: () => setShowModal(true)
 *   }}
 * />
 * ```
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  size = 'md',
  className,
}: EmptyStateProps) {
  const config = sizeConfig[size];

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        config.container,
        config.gap,
        className
      )}
      role="status"
      aria-label={title}
    >
      <Icon
        className={cn(
          config.icon,
          'text-muted-foreground opacity-50'
        )}
        aria-hidden="true"
      />

      <div className={cn('space-y-1', config.gap)}>
        <h3 className={cn(config.title, 'font-medium text-foreground')}>
          {title}
        </h3>

        {description && (
          <p className={cn(config.description, 'text-muted-foreground')}>
            {description}
          </p>
        )}
      </div>

      {action && (
        <Button
          onClick={action.onClick}
          variant="outline"
          size={size === 'lg' ? 'default' : 'sm'}
          className="mt-2"
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}

// ============================================================================
// CONVENIENCE VARIANTS
// ============================================================================

/**
 * Empty table state
 */
export function EmptyTable({
  icon: Icon,
  title,
  description,
}: Omit<EmptyStateProps, 'size'>) {
  return (
    <tr>
      <td colSpan={100} className="py-8">
        <EmptyState
          icon={Icon}
          title={title}
          description={description}
          size="md"
        />
      </td>
    </tr>
  );
}

/**
 * Empty list state
 */
export function EmptyList({
  icon: Icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <EmptyState
      icon={Icon}
      title={title}
      description={description}
      action={action}
      size="md"
    />
  );
}

/**
 * Empty section state - smaller for sections within pages
 */
export function EmptySection({
  icon: Icon,
  title,
  description,
}: Omit<EmptyStateProps, 'size' | 'action'>) {
  return (
    <EmptyState
      icon={Icon}
      title={title}
      description={description}
      size="sm"
    />
  );
}

/**
 * Empty page state - large for entire pages
 */
export function EmptyPage({
  icon: Icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <EmptyState
        icon={Icon}
        title={title}
        description={description}
        action={action}
        size="lg"
      />
    </div>
  );
}
