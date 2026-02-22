import React from 'react';
import { Image, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { ResizeMode, Video } from 'expo-av';

type IphoneVideoDemoProps = {
  style?: StyleProp<ViewStyle>;
};

export default function IphoneVideoDemo({ style }: IphoneVideoDemoProps) {
  return (
    <View style={[styles.wrapper, style]}>
      <Video
        source={require('../assets/videos/demo.mp4')}
        resizeMode={ResizeMode.COVER}
        shouldPlay
        isLooping
        isMuted
        style={styles.video}
      />
      <Image source={require('../assets/images/iphone.png')} style={styles.frame} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    aspectRatio: 538 / 1076,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  video: {
    position: 'absolute',
    width: '89.5%',
    height: '98%',
    top: '2%',
    left: '5.25%',
    borderRadius: 32,
  },
  frame: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
});
