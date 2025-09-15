import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  Easing,
  runOnJS,
} from 'react-native-reanimated';

const SparkAnimation = ({ 
  sparkCount, 
  startPosition, 
  targetPositions, 
  onAnimationComplete 
}) => {
  const SPARK_SIZE = 24;
  const HALF = SPARK_SIZE / 2;

  const sparkItems = Array.from({ length: sparkCount }, (_, index) => ({
    id: index,
    // 传入的坐标为“目标中心点”，将火花平移到以中心对齐
    translateX: useSharedValue(startPosition.x - HALF),
    translateY: useSharedValue(startPosition.y - HALF),
    opacity: useSharedValue(0),
    scale: useSharedValue(0.5),
    rotation: useSharedValue(0),
  }));

  useEffect(() => {
    // 启动火花动画
    sparkItems.forEach((spark, index) => {
      const delay = index * 80; // 每个火花延迟80ms
      const targetPos = targetPositions[index] || targetPositions[0];
      
      // 淡入和放大
      spark.opacity.value = withDelay(delay, withTiming(1, { duration: 150 }));
      spark.scale.value = withDelay(delay, withTiming(1.2, { duration: 150 }));
      
      // 旋转效果
      spark.rotation.value = withDelay(
        delay,
        withTiming(360 * (Math.random() > 0.5 ? 1 : -1), {
          duration: 800,
          easing: Easing.out(Easing.cubic),
        })
      );
      
      // 抛物线飞行轨迹
      const midX = (startPosition.x + targetPos.x) / 2;
      const midY = Math.min(startPosition.y, targetPos.y) - 80; // 更高的抛物线顶点
      
      // X轴移动：起点 → 中点 → 终点
      spark.translateX.value = withDelay(
        delay + 150,
        withSequence(
          withTiming(midX - HALF, {
            duration: 400,
            easing: Easing.out(Easing.quad),
          }),
          withTiming(targetPos.x - HALF, {
            duration: 400,
            easing: Easing.in(Easing.quad),
          })
        )
      );
      
      // Y轴移动：起点 → 顶点 → 终点
      spark.translateY.value = withDelay(
        delay + 150,
        withSequence(
          withTiming(midY - HALF, {
            duration: 400,
            easing: Easing.out(Easing.quad),
          }),
          withTiming(targetPos.y - HALF, {
            duration: 400,
            easing: Easing.in(Easing.quad),
          })
        )
      );
      
      // 最后一个火花动画完成后回调
      if (index === sparkItems.length - 1) {
        spark.translateY.value = withDelay(
          delay + 950,
          withTiming(targetPos.y - HALF, {
            duration: 0,
          }, () => {
            runOnJS(onAnimationComplete)();
          })
        );
      }
    });
  }, []);

  return (
    <View style={styles.container}>
      {sparkItems.map((spark, index) => {
        const animatedStyle = useAnimatedStyle(() => ({
          transform: [
            { translateX: spark.translateX.value },
            { translateY: spark.translateY.value },
            { scale: spark.scale.value },
            { rotate: `${spark.rotation.value}deg` },
          ],
          opacity: spark.opacity.value,
        }));

        return (
          <Animated.View key={spark.id} style={[styles.sparkItem, animatedStyle]}>
            <Text style={styles.sparkEmoji}>🔥</Text>
          </Animated.View>
        );
      })}
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
  sparkItem: {
    position: 'absolute',
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sparkEmoji: {
    fontSize: 20,
  },
});

export default SparkAnimation;