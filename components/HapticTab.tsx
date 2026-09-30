import { feedback } from '../services/haptics';
import { Pressable } from 'react-native';

export function HapticTab(props: any) {
  // Expo Router 57 embarque désormais sa couche de navigation. On adapte ses
  // quelques props spécifiques vers le Pressable React Native public au lieu
  // de réimporter @react-navigation/elements, désormais incompatible.
  const {
    onPressIn,
    pressColor: _pressColor,
    hoverEffect: _hoverEffect,
    pressOpacity = 0.7,
    style,
    ...pressableProps
  } = props;

  return (
    <Pressable
      {...pressableProps}
      onPressIn={(ev) => {
        if (!props.disabled && !props.accessibilityState?.selected) feedback.selection();
        onPressIn?.(ev);
      }}
      style={(state) => [
        typeof style === 'function' ? style(state) : style,
        state.pressed && { opacity: pressOpacity },
      ]}
    />
  );
}
