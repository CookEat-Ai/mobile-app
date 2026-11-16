import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, InteractionManager, Modal, Platform, StyleSheet, View, useWindowDimensions, type ModalProps } from 'react-native';
import { useMotionAllowed } from '../../contexts/MotionPreferences';
import { MODAL_ANIMATION } from '../../constants/ModalPresentation';
import { AppTheme } from '../../constants/AppTheme';

type Props = Omit<ModalProps, 'animationType'> & {
  /** Optional dimming layer, kept stationary and faded with the panel transition. */
  backdrop?: React.ReactNode;
  /** A transparent modal route already supplies the native presentation host. */
  host?: 'native' | 'route';
};

/** Transparent sheets move above a fixed backdrop; full pages retain native presentation. */
export function AppModal({ visible = true, transparent = false, backdrop, host = 'native', onDismiss, onShow, children, statusBarTranslucent = true, ...props }: Props) {
  const routeHost = transparent && host === 'route';
  const motion = useMotionAllowed();
  const { height } = useWindowDimensions();
  const [presented, setPresented] = useState(visible);
  const progress = useRef(new Animated.Value(0)).current;
  const animation = useRef<Animated.CompositeAnimation | null>(null);
  const shown = useRef(false);
  const requestedVisible = useRef(visible);
  requestedVisible.current = visible;
  const nativeVisible = transparent ? visible || presented : visible;
  const wasVisible = useRef(visible);
  const dismiss = useRef(onDismiss);
  dismiss.current = onDismiss;

  const move = useCallback((toValue: number, complete?: () => void) => {
    animation.current?.stop();
    if (!motion) { progress.setValue(toValue); complete?.(); return; }
    const next = Animated.timing(progress, {
      toValue, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true,
    });
    animation.current = next;
    next.start(({ finished }) => { if (finished) complete?.(); });
  }, [motion, progress]);

  useEffect(() => {
    if (!transparent) return;
    if (visible) {
      setPresented(true);
      // Start after the native host is on screen, including a first visible mount.
      if (shown.current || !motion) move(1);
    } else if (presented) {
      const finish = () => { if (!requestedVisible.current) setPresented(false); };
      if (shown.current) move(0, finish);
      else { progress.setValue(0); finish(); }
    }
    return () => animation.current?.stop();
  }, [visible, transparent, presented, motion, move, progress]);

  // Route-hosted panels and Android have no native onDismiss event. Wait for
  // the close commit before handing navigation back to the caller.
  useEffect(() => {
    const closed = wasVisible.current && !nativeVisible;
    wasVisible.current = nativeVisible;
    if (!nativeVisible) shown.current = false;
    if ((!routeHost && Platform.OS === 'ios') || !closed) return;
    const task = InteractionManager.runAfterInteractions(() => dismiss.current?.());
    return () => task.cancel();
  }, [nativeVisible, routeHost]);

  const panel = <Animated.View pointerEvents={visible ? 'auto' : 'none'} style={[styles.content, {
    transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [height, 0] }) }],
  }]}>{children}</Animated.View>;

  const surface = <View style={backdrop ? styles.customBackdrop : styles.backdrop}
    onLayout={routeHost ? () => {
      if (shown.current || !requestedVisible.current) return;
      shown.current = true;
      move(1);
    } : undefined}>
    {backdrop ? <>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: progress }]}>
        {backdrop}
      </Animated.View>
      {panel}
    </> : panel}
  </View>;

  // Start at the route's first layout instead of presenting a second native
  // modal and waiting for its onShow round trip before any movement.
  if (routeHost) return nativeVisible ? surface : null;

  return <Modal {...props} visible={nativeVisible} transparent={transparent}
    animationType={!transparent && motion ? MODAL_ANIMATION : 'none'}
    statusBarTranslucent={statusBarTranslucent}
    onShow={event => {
      shown.current = true;
      if (transparent && requestedVisible.current) move(1);
      onShow?.(event);
    }}
    onDismiss={Platform.OS === 'ios' ? () => { shown.current = false; dismiss.current?.(); } : undefined}>
    {transparent ? surface : children}
  </Modal>;
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: AppTheme.overlay },
  customBackdrop: { flex: 1, backgroundColor: 'transparent' },
  content: { flex: 1 },
});
