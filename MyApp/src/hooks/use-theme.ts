/**
 * The driver app always uses the light royal-blue/white theme regardless of the
 * phone's system dark-mode setting, so it stays visually consistent with the admin
 * portal's branding rather than switching to a dark palette.
 */

import { Colors } from '@/constants/theme';

export function useTheme() {
  return Colors.light;
}
