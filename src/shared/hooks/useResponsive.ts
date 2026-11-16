import { Grid } from 'antd';

const { useBreakpoint } = Grid;

export interface ResponsiveState {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isXs: boolean;
  isSm: boolean;
  isMd: boolean;
  isLg: boolean;
  isXl: boolean;
  isXxl: boolean;
  screens: Record<string, boolean>;
}

/**
 * Unified responsive hook using Ant Design's responsive Grid system.
 * Eliminates duplicate window resize event listeners across hundreds of components.
 */
export function useResponsive(): ResponsiveState {
  const screens = useBreakpoint();

  // If screens hasn't mounted yet or is empty, fallback safely
  const isMobile = !screens.md;
  const isTablet = !!(screens.md && !screens.lg);
  const isDesktop = !!screens.lg;

  return {
    isMobile,
    isTablet,
    isDesktop,
    isXs: !!screens.xs,
    isSm: !!screens.sm,
    isMd: !!screens.md,
    isLg: !!screens.lg,
    isXl: !!screens.xl,
    isXxl: !!screens.xxl,
    screens,
  };
}

/**
 * Drop-in replacement for legacy useIsMobile hooks
 */
export function useIsMobile(): boolean {
  const screens = useBreakpoint();
  return !screens.md;
}
