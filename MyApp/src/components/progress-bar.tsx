import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const HEIGHT = Spacing.two;
const RADIUS = Spacing.two;

export function ProgressBar({ percent, color }: { percent: number; color?: string }) {
  const theme = useTheme();
  const clamped = Math.max(0, Math.min(100, percent));
  const gradientId = color ? undefined : 'progressGrad';

  return (
    <View style={[styles.track, { backgroundColor: theme.background }]}>
      <View style={[styles.fillClip, { width: `${clamped}%` }]}>
        <Svg width="100%" height={HEIGHT} viewBox="0 0 100 1" preserveAspectRatio="none">
          {gradientId && (
            <Defs>
              <LinearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor={theme.accent} />
                <Stop offset="1" stopColor={theme.primary} />
              </LinearGradient>
            </Defs>
          )}
          <Rect x={0} y={0} width={100} height={1} fill={color ?? `url(#${gradientId})`} />
        </Svg>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: HEIGHT,
    borderRadius: RADIUS,
    overflow: 'hidden',
    width: '100%',
  },
  fillClip: {
    height: '100%',
    borderRadius: RADIUS,
    overflow: 'hidden',
  },
});
