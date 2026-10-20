import { AppModal as Modal } from '../ui/AppModal';
import { NavigationIconButton } from '../NavigationIconButton';
import { AppRadii, AppTheme as theme } from '../../constants/AppTheme';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Keyboard, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions, type KeyboardEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { useMotionAllowed } from '../../contexts/MotionPreferences';
import type { RecipeChatMessage } from '../../services/personalRecipe';

/** Measures the modal window itself: a page sheet does not share the screen's origin. */
export function keyboardOverlap(bottom: number, keyboardTop: number | null) {
  return keyboardTop === null ? 0 : Math.max(0, bottom - keyboardTop);
}
function TypingDots() {
  const motion = useMotionAllowed();
  const dots = useRef([new Animated.Value(0), new Animated.Value(0), new Animated.Value(0)]).current;
  useEffect(() => {
    if (!motion) return;
    const loop = Animated.loop(Animated.stagger(140, dots.map(dot => Animated.sequence([
      Animated.timing(dot, {toValue:1,duration:280,useNativeDriver:true}),
      Animated.timing(dot, {toValue:0,duration:280,useNativeDriver:true}),
      Animated.delay(420),
    ]))));
    loop.start(); return () => loop.stop();
  }, [motion, dots]);
  const {t} = useTranslation();
  return <View accessible accessibilityLabel={t('recipeChat.thinking')} accessibilityLiveRegion="polite" style={styles.typing}>{dots.map((dot,i)=><Animated.View key={i} style={[styles.dot,{opacity:motion?dot.interpolate({inputRange:[0,1],outputRange:[.35,1]}):.7,transform:[{translateY:motion?dot.interpolate({inputRange:[0,1],outputRange:[0,-4]}):0}]}]}/>)}</View>;
}
export function ChatSheet({visible,onClose,title,subtitle,messages,draft,onDraft,onSend,onRetry,sending,ready=true,error,suggestions=[],welcome}: {
  visible:boolean; onClose:()=>void; title:string; subtitle:string; messages:RecipeChatMessage[];
  draft:string; onDraft:(s:string)=>void; onSend:()=>void; onRetry?:()=>void;
  sending:boolean; ready?:boolean; error?:string; suggestions?:string[]; welcome?:string;
}) {
  const {t}=useTranslation(), insets=useSafeAreaInsets(), window=useWindowDimensions();
  const viewport=useRef<View>(null), list=useRef<ScrollView>(null), top=useRef<number|null>(null);
  const [overlap,setOverlap]=useState(0),[keyboardOpen,setKeyboardOpen]=useState(false);
  const fit=useCallback(()=>{
    if(Platform.OS==='ios') {setOverlap(keyboardOverlap(window.height,top.current));return;}
    viewport.current?.measureInWindow((_x,y,_w,h)=>setOverlap(keyboardOverlap(y+h,top.current)));
  },[window.height]);
  useEffect(()=>{
    if(!visible) {setOverlap(0);setKeyboardOpen(false);top.current=null;return;}
    const show=(event:KeyboardEvent)=>{top.current=event.endCoordinates.screenY;setKeyboardOpen(true); if(Platform.OS==='ios') Keyboard.scheduleLayoutAnimation(event); fit();};
    const hide=()=>{top.current=null;setOverlap(0);setKeyboardOpen(false);};
    const subscriptions=[Keyboard.addListener('keyboardDidShow',show),Keyboard.addListener('keyboardDidHide',hide)];
    if(Platform.OS==='ios') subscriptions.push(Keyboard.addListener('keyboardWillChangeFrame',show),Keyboard.addListener('keyboardWillHide',hide));
    return ()=>subscriptions.forEach(s=>s.remove());
  },[visible,fit]);
  const close=()=>{Keyboard.dismiss();onClose();};
  return <Modal visible={visible} presentationStyle="pageSheet" onRequestClose={close} onShow={fit}>
    <View ref={viewport} collapsable={false} style={styles.sheet} onLayout={fit}>
      <View style={[styles.content,{paddingBottom:overlap}]}>
        <View style={[styles.header,{paddingTop:Platform.OS==='android'?insets.top+12:20}]}>
          <View style={{flex:1,gap:4}}><Text accessibilityRole="header" style={styles.heading}>{title}</Text><Text style={styles.caption} numberOfLines={1}>{subtitle}</Text></View>
          <NavigationIconButton kind="close" accessibilityRole="button" accessibilityLabel={t('recipeChat.close')} onPress={close} style={styles.close} />
        </View>
        <ScrollView ref={list} style={{flex:1}} contentContainerStyle={styles.messages} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive" onLayout={()=>list.current?.scrollToEnd({animated:false})} onContentSizeChange={()=>list.current?.scrollToEnd({animated:true})}>
          {!messages.length&&<><Text style={styles.intro}>{welcome||t('recipeChat.welcome')}</Text>{suggestions.map(text=><TouchableOpacity key={text} accessibilityRole="button" onPress={()=>onDraft(text)} style={styles.suggestion}><Text style={styles.body}>{text}</Text><Ionicons name="arrow-up-left-box" size={18} color={theme.muted}/></TouchableOpacity>)}</>}
          {messages.map((message,index)=><View key={index} style={[styles.bubble,message.role==='user'?styles.user:styles.assistant]}><Text selectable style={styles.body}>{message.text}</Text></View>)}
          {sending&&<TypingDots/>}
          {!!error&&<View style={styles.failure}><Text accessibilityRole="alert" style={styles.error}>{error}</Text>{onRetry&&<TouchableOpacity accessibilityRole="button" onPress={onRetry} style={styles.retry}><Text style={styles.retryText}>{t('recipeChat.retry')}</Text><Ionicons name="refresh" size={18} color={theme.ink}/></TouchableOpacity>}</View>}
        </ScrollView>
        <View style={[styles.composer,{paddingBottom:keyboardOpen?12:Math.max(12,insets.bottom)}]}>
          <TextInput accessibilityLabel={t('recipeChat.placeholder')} placeholder={t('recipeChat.placeholder')} placeholderTextColor={theme.muted} value={draft} onChangeText={onDraft} multiline maxLength={1200} editable={ready} onFocus={fit} style={styles.input}/>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('recipeChat.send')} disabled={!draft.trim()||sending||!ready} onPress={onSend} style={[styles.send,(!draft.trim()||sending||!ready)&&{opacity:.4}]}><Ionicons name="arrow-up" size={24} color={theme.onPrimary}/></TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>;
}
const styles=StyleSheet.create({
  sheet:{flex:1,backgroundColor:theme.surface},content:{flex:1},header:{padding:20,flexDirection:'row',alignItems:'center',gap:12,borderBottomWidth:1,borderColor:theme.soft},heading:{fontFamily:'Degular',fontSize:25,color:theme.ink},caption:{fontFamily:'CronosPro',fontSize:15,color:theme.muted},close:{width:44,height:44,borderRadius:AppRadii.card,alignItems:'center',justifyContent:'center',backgroundColor:theme.soft},
  messages:{padding:20,gap:14,paddingBottom:24},intro:{fontFamily:'Degular',fontSize:25,lineHeight:29,color:theme.ink,marginVertical:12},suggestion:{flexDirection:'row',alignItems:'center',gap:12,padding:16,borderWidth:1,borderColor:theme.soft,borderRadius:AppRadii.control,minHeight:56},body:{fontFamily:'CronosPro',fontSize:18,lineHeight:25,color:theme.ink,flexShrink:1},bubble:{paddingHorizontal:16,paddingVertical:12,borderRadius:AppRadii.card,maxWidth:'92%'},user:{alignSelf:'flex-end',backgroundColor:theme.yellowSoft,borderBottomRightRadius:AppRadii.small},assistant:{alignSelf:'flex-start',backgroundColor:theme.soft,borderBottomLeftRadius:AppRadii.small},typing:{flexDirection:'row',gap:5,padding:17,alignSelf:'flex-start',backgroundColor:theme.soft,borderRadius:AppRadii.card,minHeight:46,alignItems:'center'},dot:{width:7,height:7,borderRadius:4,backgroundColor:theme.muted},
  failure:{gap:8,padding:12,borderRadius:AppRadii.control,backgroundColor:theme.dangerSoft},error:{fontFamily:'CronosPro',fontSize:16,color:theme.danger},retry:{flexDirection:'row',alignItems:'center',gap:8,minHeight:44},retryText:{fontFamily:'CronosProBold',fontSize:16,color:theme.ink},composer:{padding:14,flexDirection:'row',alignItems:'flex-end',gap:10,borderTopWidth:1,borderColor:theme.soft,backgroundColor:theme.surface},input:{flex:1,fontFamily:'CronosPro',fontSize:18,lineHeight:24,color:theme.ink,backgroundColor:theme.soft,borderRadius:AppRadii.control,paddingHorizontal:16,paddingTop:12,paddingBottom:12,minHeight:48,maxHeight:130},send:{width:48,height:48,borderRadius:AppRadii.card,backgroundColor:theme.yellow,alignItems:'center',justifyContent:'center'},
});
