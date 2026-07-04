import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import Svg, { Defs, Ellipse, G, Line, LinearGradient, Path, Rect, Stop, ClipPath } from 'react-native-svg';

import { useTheme } from '@/hooks/use-theme';

const AnimatedPath = Animated.createAnimatedComponent(Path);

// How far the water surface tilts left/right at the peak of each slosh, in SVG units.
const WAVE_AMPLITUDE = 7;
// One full left-right-left cycle, in ms — slow enough to read as a gentle slosh, not a jitter.
const WAVE_PERIOD = 2600;

// Sized to sit comfortably beside a stat column in a row layout — the original 140x216 build
// was correct in concept but too large for that context, and being a fixed-size (flexShrink: 0
// by default) sibling in a flex row, it forced the neighboring text down to a near-zero width
// and wrapped it character-by-character.
const VIEW_W = 100;
const VIEW_H = 155;
const BODY_X = 7;
const BODY_Y = 42;
const BODY_W = 86;
const BODY_H = 100;
const BODY_RX = 17;

interface TermJarProps {
  termMonths: number;
  monthsPaid: number;
}

export function TermJar({ termMonths, monthsPaid }: TermJarProps) {
  const theme = useTheme();
  const percent = termMonths > 0 ? Math.max(0, Math.min(1, monthsPaid / termMonths)) : 0;

  const fillY = useSharedValue(BODY_Y + BODY_H);
  // Runs 0 -> 2π forever; sin() of this drives a continuous left-right tilt of the water
  // surface, like the jar was just given a gentle shake.
  const wavePhase = useSharedValue(0);

  useEffect(() => {
    const targetHeight = BODY_H * percent;
    fillY.value = withTiming(BODY_Y + BODY_H - targetHeight, {
      duration: 900,
      easing: Easing.out(Easing.cubic),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [percent]);

  useEffect(() => {
    wavePhase.value = withRepeat(withTiming(Math.PI * 2, { duration: WAVE_PERIOD, easing: Easing.linear }), -1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const bottom = BODY_Y + BODY_H + 20;
  const left = BODY_X;
  const right = BODY_X + BODY_W;
  const mid = BODY_X + BODY_W / 2;

  const animatedProps = useAnimatedProps(() => {
    const tilt = WAVE_AMPLITUDE * Math.sin(wavePhase.value);
    const leftY = fillY.value + tilt;
    const rightY = fillY.value - tilt;
    // A gentle bow instead of a straight diagonal so the surface still reads as liquid, not a
    // tilted plank, while it sloshes from side to side.
    const midY = fillY.value + tilt * 0.15;
    return {
      d: `M ${left} ${bottom} L ${left} ${leftY} Q ${mid} ${midY} ${right} ${rightY} L ${right} ${bottom} Z`,
    };
  });

  const ticks = Array.from({ length: Math.max(0, termMonths - 1) }, (_, i) => i + 1).map((month) => {
    const y = BODY_Y + BODY_H - (BODY_H * month) / termMonths;
    return <Line key={month} x1={BODY_X} x2={BODY_X + BODY_W} y1={y} y2={y} stroke="#ffffff" strokeOpacity={0.28} strokeWidth={1} />;
  });

  return (
    <View style={styles.wrapper}>
      <Svg width={VIEW_W} height={VIEW_H} viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}>
        <Defs>
          <LinearGradient id="waterGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={theme.accent} stopOpacity={0.9} />
            <Stop offset="1" stopColor={theme.primary} stopOpacity={0.95} />
          </LinearGradient>
          <ClipPath id="jarClip">
            <Rect x={BODY_X} y={BODY_Y} width={BODY_W} height={BODY_H} rx={BODY_RX} ry={BODY_RX} />
          </ClipPath>
        </Defs>

        {/* Soft grounding shadow beneath the jar */}
        <Ellipse
          cx={BODY_X + BODY_W / 2}
          cy={BODY_Y + BODY_H + 6}
          rx={BODY_W / 2.4}
          ry={4}
          fill={theme.text}
          fillOpacity={0.1}
        />

        {/* Pipe from the top of the screen down into the jar's neck */}
        <Rect x={44} y={0} width={13} height={24} rx={3} fill={theme.textSecondary} fillOpacity={0.35} />
        <Path d="M44,24 L57,24 L65,35 L36,35 Z" fill={theme.textSecondary} fillOpacity={0.35} />
        <Rect x={36} y={35} width={29} height={10} fill={theme.textSecondary} fillOpacity={0.2} />

        {/* Jar body glass — deliberately NOT theme.backgroundElement, which is what the
            surrounding card itself is filled with; using the same tone made the jar all but
            disappear into the card, corners included. theme.background gives real contrast. */}
        <Rect
          x={BODY_X}
          y={BODY_Y}
          width={BODY_W}
          height={BODY_H}
          rx={BODY_RX}
          ry={BODY_RX}
          fill={theme.background}
        />

        <G clipPath="url(#jarClip)">
          <AnimatedPath fill="url(#waterGrad)" animatedProps={animatedProps} />
          {ticks}
        </G>

        {/* Glass outline + neck + glossy highlight, drawn on top. A stronger, more opaque
            stroke than before so the rounded corners actually read against the card. */}
        <Rect
          x={BODY_X}
          y={BODY_Y}
          width={BODY_W}
          height={BODY_H}
          rx={BODY_RX}
          ry={BODY_RX}
          fill="none"
          stroke={theme.textSecondary}
          strokeOpacity={0.45}
          strokeWidth={2.25}
        />
        <Rect x={36} y={35} width={29} height={10} fill="none" stroke={theme.textSecondary} strokeOpacity={0.45} strokeWidth={1.5} />
        <Rect
          x={BODY_X + 9}
          y={BODY_Y + 10}
          width={7}
          height={BODY_H - 20}
          rx={3.5}
          fill="#ffffff"
          fillOpacity={0.18}
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
});
