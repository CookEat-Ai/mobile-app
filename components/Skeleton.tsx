import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, StyleSheet, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const SCREEN_WIDTH = Dimensions.get('window').width;

interface SkeletonProps {
  width: number | string;
  height: number | string;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({ width, height, borderRadius = 8, style }: SkeletonProps) {
  const translateX = useRef(new Animated.Value(-SCREEN_WIDTH)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(translateX, {
        toValue: SCREEN_WIDTH,
        duration: 1200,
        useNativeDriver: true,
      })
    );
    animation.start();
    return () => animation.stop();
  }, [translateX]);

  return (
    <View
      style={[
        styles.skeleton,
        { width: width as any, height, borderRadius, overflow: 'hidden' },
        style,
      ]}
    >
      <Animated.View
        style={{ ...StyleSheet.absoluteFillObject, transform: [{ translateX }] }}
      >
        <LinearGradient
          colors={['transparent', 'rgba(255,255,255,0.5)', 'transparent']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFillObject}
        />
      </Animated.View>
    </View>
  );
}

export function RecipeImageSkeleton() {
  return (
    <View style={styles.imageSkeleton}>
      <Skeleton width="100%" height="100%" borderRadius={0} />
    </View>
  );
}

export function RecipeTitleSkeleton() {
  return (
    <View style={{ marginBottom: 20 }}>
      <Skeleton width="80%" height={28} borderRadius={6} />
    </View>
  );
}

export function RecipeMetricsSkeleton() {
  return (
    <>
      <View style={styles.metricsRow}>
        <Skeleton width="30%" height={90} borderRadius={12} />
        <Skeleton width="30%" height={90} borderRadius={12} />
        <Skeleton width="30%" height={90} borderRadius={12} />
      </View>
      <View style={[styles.metricsRow, { marginTop: 10 }]}>
        <Skeleton width="30%" height={90} borderRadius={12} />
        <Skeleton width="30%" height={90} borderRadius={12} />
        <Skeleton width="30%" height={90} borderRadius={12} />
      </View>
    </>
  );
}

export function RecipeIngredientsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <View style={{ marginTop: 30, marginBottom: 30 }}>
      <Skeleton width="50%" height={20} borderRadius={6} style={{ marginBottom: 16 }} />
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={styles.ingredientRow}>
          <Skeleton width={40} height={40} borderRadius={20} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Skeleton width="60%" height={16} borderRadius={4} />
            <Skeleton width="30%" height={12} borderRadius={4} style={{ marginTop: 6 }} />
          </View>
          <Skeleton width={50} height={16} borderRadius={4} />
        </View>
      ))}
    </View>
  );
}

export function IngredientItemSkeleton() {
  return (
    <View style={styles.ingredientRow}>
      <Skeleton width={40} height={40} borderRadius={20} />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Skeleton width="60%" height={16} borderRadius={4} />
        <Skeleton width="30%" height={12} borderRadius={4} style={{ marginTop: 6 }} />
      </View>
      <Skeleton width={50} height={16} borderRadius={4} />
    </View>
  );
}

export function StepItemSkeleton() {
  return (
    <View style={styles.stepCard}>
      <Skeleton width="50%" height={18} borderRadius={4} />
      <Skeleton width="100%" height={14} borderRadius={4} style={{ marginTop: 8 }} />
      <Skeleton width="85%" height={14} borderRadius={4} style={{ marginTop: 4 }} />
    </View>
  );
}

export function RecipeStepsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <View>
      <Skeleton width="40%" height={20} borderRadius={6} style={{ marginBottom: 16 }} />
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={styles.stepCard}>
          <Skeleton width="50%" height={18} borderRadius={4} />
          <Skeleton width="100%" height={14} borderRadius={4} style={{ marginTop: 8 }} />
          <Skeleton width="85%" height={14} borderRadius={4} style={{ marginTop: 4 }} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: '#E0E0E0',
  },
  imageSkeleton: {
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 0,
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
  },
  stepCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 18,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
  },
});
