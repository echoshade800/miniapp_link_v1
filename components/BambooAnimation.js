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

const BambooAnimation = ({ 
  bambooCount, 
  startPositions, 
  endPosition, 
  onAnimationComplete 
}) => {
  const bambooItems = Array.from({ length: bambooCount }, (_, index) => ({
    id: index,
    translateX: useSharedValue(startPositions[index]?.x || startPositions[0].x),
    translateY: useSharedValue(startPositions[index]?.y || startPositions[0].y),
    opacity: useSharedValue(0),
    scale: useSharedValue(0.5),
  }));

  useEffect(() => {
    // 启动动画
    bambooItems.forEach((item, index) => {
      const delay = index * 100; // 每个竹子延迟100ms
      
      // 淡入和放大
      item.opacity.value = withDelay(delay, withTiming(1, { duration: 200 }));
      item.scale.value = withDelay(delay, withTiming(1, { duration: 200 }));
      
      // 飞行轨迹动画
      item.translateX.value = withDelay(
        delay + 200,
        withTiming(endPosition.x, {
          duration: 800,
          easing: Easing.out(Easing.cubic),
        })
      );
      
      item.translateY.value = withDelay(
        delay + 200,
        withSequence(
          // 先向上弹跳
          withTiming((startPositions[index]?.y || startPositions[0].y) - 30, {
            duration: 300,
            easing: Easing.out(Easing.quad),
          }),
          // 然后飞向目标位置
          withTiming(endPosition.y, {
            duration: 500,
            easing: Easing.in(Easing.quad),
          })
        )
      );
      
      // 最后一个竹子动画完成后回调
      if (index === bambooItems.length - 1) {
        item.translateY.value = withDelay(
          delay + 1000,
          withTiming(endPosition.y, {
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
      {bambooItems.map((item, index) => {
        const animatedStyle = useAnimatedStyle(() => ({
          transform: [
            { translateX: item.translateX.value },
            { translateY: item.translateY.value },
            { scale: item.scale.value },
          ],
          opacity: item.opacity.value,
        }));

        return (
          <Animated.View key={item.id} style={[styles.bambooItem, animatedStyle]}>
            <Text style={styles.bambooEmoji}>🎍</Text>
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
  bambooItem: {
    position: 'absolute',
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bambooEmoji: {
    fontSize: 24,
  },
});

export default BambooAnimation;