import React, { useEffect, useRef } from 'react';
import { InteractionManager, Modal, Platform, type ModalProps } from 'react-native';
import { useMotionAllowed } from '../../contexts/MotionPreferences';
import { MODAL_ANIMATION } from '../../constants/ModalPresentation';

type Props = Omit<ModalProps, 'animationType'>;

/** Shared bottom entrance; callers choose the size appropriate to their content. */
export function AppModal({ visible = true, onDismiss, statusBarTranslucent = true, ...props }: Props) {
  const motion = useMotionAllowed();
  const wasVisible = useRef(visible);
  const dismiss = useRef(onDismiss);
  dismiss.current = onDismiss;

  // React Native only emits onDismiss on iOS. On Android, the native host is
  // removed in the close commit; defer follow-up UI until that work finishes.
  useEffect(() => {
    const closed = wasVisible.current && !visible;
    wasVisible.current = visible;
    if (Platform.OS === 'ios' || !closed) return;
    const task = InteractionManager.runAfterInteractions(() => dismiss.current?.());
    return () => task.cancel();
  }, [visible]);

  return <Modal {...props} visible={visible} animationType={motion ? MODAL_ANIMATION : 'none'}
    statusBarTranslucent={statusBarTranslucent}
    onDismiss={Platform.OS === 'ios' ? onDismiss : undefined} />;
}
