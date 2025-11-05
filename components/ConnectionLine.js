import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import Animated, { 
  useSharedValue, 
  useAnimatedProps, 
  withTiming, 
  Easing,
  runOnJS 
} from 'react-native-reanimated';

const AnimatedPath = Animated.createAnimatedComponent(Path);

const ConnectionLine = ({
  startPosition,
  endPosition,
  pathPoints,
  onAnimationComplete,
  duration = 120,
  tileSize = 32
}) => {
  const strokeDashoffset = useSharedValue(1000);

  useEffect(() => {
    // Start the path drawing animation
    strokeDashoffset.value = withTiming(0, {
      duration,
      easing: Easing.out(Easing.cubic),
    }, () => {
      // Animation complete, trigger callback after a short delay
      setTimeout(() => {
        runOnJS(onAnimationComplete)();
      }, 50);
    });
  }, []);

  // Generate SVG path string from points
  const generatePath = () => {
    if (!pathPoints || pathPoints.length === 0) {
      // Direct line
      return `M ${startPosition.x} ${startPosition.y} L ${endPosition.x} ${endPosition.y}`;
    }

    let path = `M ${startPosition.x} ${startPosition.y}`;
    
    // Add intermediate points
    pathPoints.forEach(point => {
      path += ` L ${point.x} ${point.y}`;
    });
    
    // Add end point
    path += ` L ${endPosition.x} ${endPosition.y}`;
    
    return path;
  };

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: strokeDashoffset.value,
  }));

  // 根据瓦片尺寸动态计算连接线宽度
  const strokeWidth = Math.max(5, Math.round(tileSize * 0.15));

  return (
    <View style={styles.container}>
      <Svg style={StyleSheet.absoluteFillObject}>
        <Defs>
          <LinearGradient id="blueGreenGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="#00C9FF" stopOpacity="1" />
            <Stop offset="100%" stopColor="#92FE9D" stopOpacity="1" />
          </LinearGradient>
        </Defs>

        {/* Main connection line */}
        <AnimatedPath
          d={generatePath()}
          stroke="url(#blueGreenGradient)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          strokeDasharray="1000"
          animatedProps={animatedProps}
          opacity={1.0}
        />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
    zIndex: 1000,
  },
});

export default ConnectionLine;
