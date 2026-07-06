/**
 * The driver app always uses its own navy/blueLight/slate theme regardless of the phone's
 * system dark-mode setting — `Colors.light` and `Colors.dark` are identical (see theme.ts),
 * so there's nothing to switch between.
 */

import { Colors } from '@/constants/theme';

export function useTheme() {
  return Colors.light;
}
