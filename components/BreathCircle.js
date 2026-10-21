import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet, Platform, Easing } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const ProgressCircle = Platform.OS === 'web' ? Circle : AnimatedCircle;

export default function BreathCircle({ scaleAnim, timerText, phase, progress = 0, themeColor = '#22c55e', breathSpeed = 1.55 }) {
  const animatedProgress = useRef(new Animated.Value(0)).current;
  const previousProgress = useRef(0);
  const previousPhase = useRef(phase);
  const textParts = timerText.split(' / ');
  const isFraction = textParts.length === 2;

  const shouldSnap = progress < previousProgress.current || (phase !== previousPhase.current && progress === 0);
  const progressDuration = shouldSnap ? 0 : (isFraction ? breathSpeed * 2 * 1000 : 1000);

  useEffect(() => {
    if (Platform.OS !== 'web' && shouldSnap) {
      animatedProgress.stopAnimation();
      animatedProgress.setValue(progress);
    } else if (Platform.OS !== 'web') {
      Animated.timing(animatedProgress, {
        toValue: progress,
        duration: progressDuration,
        easing: Easing.linear,
        useNativeDriver: false,
      }).start();
    }
    previousProgress.current = progress;
    previousPhase.current = phase;
  }, [progress, isFraction, breathSpeed, progressDuration, shouldSnap, phase]);

  const radius = 135; 
  const circumference = 2 * Math.PI * radius;
  const sectorRadius = radius / 2;
  const sectorCircumference = 2 * Math.PI * sectorRadius;
  const strokeDashoffset = Platform.OS === 'web'
    ? circumference * (1 - progress)
    : animatedProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [circumference, 0]
      });
  const sectorDashoffset = Platform.OS === 'web'
    ? sectorCircumference * (1 - progress)
    : animatedProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [sectorCircumference, 0]
      });

  // Animate the text in sync with the lung movement.
  const numberScale = scaleAnim.interpolate({
    inputRange: [0.3, 1.2],
    outputRange: [0.85, 1.15] // Mic pe Out, Mare pe In
  });

  const numberColor = scaleAnim.interpolate({
    inputRange: [0.3, 1.2],
    outputRange: ['#9ca3af', '#ffffff'] // Gray on exhale, bright white on inhale.
  });

  return (
    <View style={styles.wrapper}>
      
      <View style={styles.textContainer}>
        {isFraction ? (
          <View style={styles.fractionContainer}>
            {/* Remaining breath count (animated). */}
            <Animated.Text 
              style={[
                styles.timerText, 
                { 
                  color: numberColor, 
                  transform: [{ scale: numberScale }] 
                }
              ]}
              {...(Platform.OS !== 'web' ? { collapsable: false } : {})}
            >
              {textParts[0]}
            </Animated.Text>
            
            {/* Static total (for example, " / 30"). */}
            <Text style={styles.staticFractionText}>
              {' / ' + textParts[1]}
            </Text>
          </View>
        ) : (
          <Text style={styles.timerText}>{timerText}</Text>
        )}
      </View>

      <View style={styles.circleContainer}>
        <View style={styles.progressRingContainer}>
          <Svg width="300" height="300">
            <Circle
              cx="150" cy="150" r={radius} stroke={themeColor} strokeWidth="5"
              strokeOpacity={0.3} fill="none"
              style={Platform.OS === 'web' ? { transition: 'stroke 300ms ease' } : undefined}
            />
            <ProgressCircle
              cx="150" cy="150" r={sectorRadius} stroke={themeColor} strokeWidth={radius}
              strokeOpacity={0.3} fill="none" strokeDasharray={sectorCircumference}
              strokeDashoffset={sectorDashoffset} strokeLinecap="butt"
              transform="rotate(-90 150 150)"
              style={Platform.OS === 'web' ? { transition: shouldSnap ? 'none' : `stroke-dashoffset ${progressDuration}ms linear` } : undefined}
            />
            <ProgressCircle
              cx="150" cy="150" r={radius} stroke={themeColor} strokeWidth="5"
              fill="none" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
              style={Platform.OS === 'web' ? { transition: shouldSnap ? 'none' : `stroke-dashoffset ${progressDuration}ms linear` } : undefined}
              strokeLinecap="round" transform="rotate(-90 150 150)"
            />
          </Svg>
        </View>

        {/* Animated 3D-style lungs. */}
        <Animated.View {...(Platform.OS !== 'web' ? { collapsable: false } : {})} style={[styles.lungsContainer, { transform: [{ scale: scaleAnim }] }]}>
          <Svg width="180" height="180" viewBox="-100 -70 200 200">
            
            {/* 1. Trachea and main bronchi. */}
            <Path 
              d="M -6 -50 L 6 -50 L 6 -15 L 20 2 L 14 8 L 0 -5 L -14 8 L -20 2 L -6 -15 Z" 
              fill={themeColor} opacity="0.95" 
            />

            {/* 2. Right lung on the left: elongated shape with a flat base. */}
            <Path 
              d="M -15 5 C -15 -25, -30 -40, -45 -35 C -70 -20, -85 20, -75 80 C -65 110, -25 105, -15 85 C -5 65, -10 30, -15 5 Z" 
              fill={themeColor} opacity="0.85" 
            />

            {/* 3. Left lung on the right, with a cardiac notch. */}
            <Path 
              d="M 15 5 C 15 -25, 30 -40, 45 -35 C 70 -20, 85 20, 75 80 C 65 110, 35 105, 20 85 C 35 60, 40 40, 15 5 Z" 
              fill={themeColor} opacity="0.85" 
            />

            {/* 4. Branches (bronchioles) placed inside the lobes. */}
            <Path 
              d="M -25 15 Q -45 20 -60 30 M -30 35 Q -45 50 -55 65 M -25 60 Q -35 75 -40 85" 
              stroke="#ffffff" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.35" 
            />
            <Path 
              d="M 25 15 Q 45 20 60 30 M 38 35 Q 50 45 55 60 M 40 60 Q 45 75 45 85" 
              stroke="#ffffff" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.35" 
            />

            {/* 5. 3D highlights on the upper lobes. */}
            <Path 
              d="M -45 -30 C -65 -15, -75 10, -70 40 C -70 20, -55 -10, -40 -20 Z" 
              fill="#ffffff" opacity="0.25" 
            />
            <Path 
              d="M 45 -30 C 65 -15, 75 10, 70 40 C 70 20, 55 -10, 40 -20 Z" 
              fill="#ffffff" opacity="0.25" 
            />

            {/* 6. 3D shadows at the base for added volume. */}
            <Path 
              d="M -75 80 C -65 110, -25 105, -15 85 C -25 100, -60 100, -70 70 Z" 
              fill="#000000" opacity="0.15" 
            />
            <Path 
              d="M 75 80 C 65 110, 35 105, 20 85 C 30 100, 60 100, 70 70 Z" 
              fill="#000000" opacity="0.15" 
            />

          </Svg>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center', justifyContent: 'center' },
  textContainer: { 
    height: 60, 
    justifyContent: 'center', 
    alignItems: 'center',
    marginBottom: 10 
  },
  fractionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerText: {
    color: '#ffffff',
    fontSize: 42,
    fontWeight: 'bold',
  },
  staticFractionText: {
    color: '#4b5563', // Darker gray to avoid distraction.
    fontSize: 32,
    fontWeight: '600',
    marginTop: 5, // Small adjustment to align with the animated number.
  },
  circleContainer: { width: 300, height: 300, alignItems: 'center', justifyContent: 'center' },
  progressRingContainer: { position: 'absolute' },
  lungsContainer: { position: 'absolute', alignItems: 'center', justifyContent: 'center' }
});