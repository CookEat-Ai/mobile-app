import React from 'react';
import { Image, Platform, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';

type IphoneVideoDemoProps = {
  style?: StyleProp<ViewStyle>;
};

const videoSource = require('../assets/videos/demo.mp4');

export default function IphoneVideoDemo({ style }: IphoneVideoDemoProps) {
  const frameSource = Platform.OS === 'ios' ? require('../assets/images/iphone.png') : require('../assets/images/android.png');

  const player = useVideoPlayer(videoSource, player => {
    player.loop = true;
    player.muted = true;
    player.play();
  });

  return (
    <View style={[styles.wrapper, style]}>
      <VideoView
        player={player}
        style={styles.video}
        nativeControls={false}
      />
      <Image source={frameSource} style={styles.frame} />
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
