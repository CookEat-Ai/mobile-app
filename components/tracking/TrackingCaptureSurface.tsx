import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppTheme as theme, AppRadii } from '../../constants/AppTheme';
import { useMotionAllowed } from '../../contexts/MotionPreferences';
import { AppModal } from '../ui/AppModal';

/** One surface grows from the camera bottom sheet to the rounded meal review. */
export function TrackingCaptureSurface({expanded,visible,onRequestClose,onDismiss,children}: {expanded:boolean;visible:boolean;onRequestClose:()=>void;onDismiss:()=>void;children:React.ReactNode}) {
  const insets=useSafeAreaInsets(), window=useWindowDimensions(), motion=useMotionAllowed();
  const progress=useRef(new Animated.Value(expanded?1:0)).current;
  useEffect(()=>{
    if(!motion){progress.stopAnimation();progress.setValue(expanded?1:0);return;}
    const animation=Animated.timing(progress,{toValue:expanded?1:0,duration:480,easing:Easing.inOut(Easing.cubic),useNativeDriver:false});
    animation.start();return()=>animation.stop();
  },[expanded,motion,progress]);
  return <AppModal transparent visible={visible} onRequestClose={onRequestClose} onDismiss={onDismiss}
    backdrop={<Animated.View pointerEvents="none" style={[styles.scrim,{opacity:progress.interpolate({inputRange:[0,1],outputRange:[.34,1]})}]}/>}
  ><View style={styles.root}>
    <Animated.View style={[styles.surface,{top:progress.interpolate({inputRange:[0,1],outputRange:[Math.max(insets.top+12,window.height*.08),Math.max(insets.top+12,window.height*.04)]}),borderTopLeftRadius:AppRadii.sheet,borderTopRightRadius:AppRadii.sheet}]}>
      {children}
      {!expanded&&<View pointerEvents="none" style={styles.handle}/>}
    </Animated.View>
  </View></AppModal>;
}
const styles=StyleSheet.create({handle:{position:'absolute',top:7,left:'50%',marginLeft:-20,width:40,height:4,borderRadius:2,backgroundColor:'#92968E',opacity:.65},root:{flex:1,backgroundColor:'transparent'},scrim:{position:'absolute',top:0,left:0,right:0,bottom:0,backgroundColor:'#000000'},surface:{position:'absolute',left:0,right:0,bottom:0,overflow:'hidden',backgroundColor:theme.background}});
