import { NavigationIconButton } from '../NavigationIconButton';
import { AppRadii, AppTheme as theme, appStyles } from '../../constants/AppTheme';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { Image } from 'expo-image';
import Svg, { Ellipse } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { useMotionAllowed } from '../../contexts/MotionPreferences';
import { coverPhotoFrame, visiblePhotoBox, type FoodNutrition, type MealPhotoAnalysis, type PhotoFood } from '../../services/mealTracking';
import { feedback } from '../../services/haptics';
import { PhotoMealReview } from './PhotoMealReview';
const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);

/** A borderless cover photo stays above a rounded sheet, in one scrollable modal. */
export function PhotoMealReveal({photo,analysis,title,items,onTitle,onItems,mealType,onMealType,onSave,onComplete,onExpand,onBack,onRetry,onRetake,processing=true,saving,error,editing=false,nutritionOverride,onNutritionOverride,saveActionLabel,autoSaved}: {
  photo:{uri:string;width:number;height:number};analysis:MealPhotoAnalysis|null;title:string;items:PhotoFood[];
  mealType?: 'breakfast'|'lunch'|'snack'|'dinner'|null;onMealType?:(value:'breakfast'|'lunch'|'snack'|'dinner')=>void;
  saveActionLabel?:string;autoSaved?:boolean;
  nutritionOverride?:FoodNutrition|null;onNutritionOverride?:(value:FoodNutrition|null)=>void;
  onTitle:(value:string)=>void;onItems:(items:PhotoFood[])=>void;onSave:()=>void;onComplete:()=>void;onExpand?:()=>void;
  onBack:()=>void;onRetry:()=>void;onRetake:()=>void;processing?:boolean;saving:boolean;error:string;editing?:boolean;
}) {
  const {t}=useTranslation(), motion=useMotionAllowed(), window=useWindowDimensions();
  const [size,setSize]=useState({width:window.width,height:window.height});
  const [completed,setCompleted]=useState<PhotoFood[]>([]), [current,setCurrent]=useState<PhotoFood|null>(null), [finished,setFinished]=useState(editing);
  const ring=useRef(new Animated.Value(0)).current, flight=useRef(new Animated.Value(0)).current, sweep=useRef(new Animated.Value(0)).current;
  const root=useRef<View>(null), photoView=useRef<View>(null), dropSlot=useRef<View>(null);
  const [photoOrigin,setPhotoOrigin]=useState({x:0,y:0}), [drop,setDrop]=useState({x:20,y:400});
  const generation=useRef(0), completedScan=useRef<string|null>(null), callbacks=useRef({onComplete,onExpand});
  callbacks.current={onComplete,onExpand};
  const photoWidth=Math.max(1,size.width), photoHeight=Math.round(window.height*(window.width>=768?.32:.4));
  const frame=coverPhotoFrame(photo,{width:photoWidth,height:photoHeight}), frozenFrame=coverPhotoFrame(photo,size);
  const measurePhoto=()=>photoView.current?.measureInWindow((x,y)=>root.current?.measureInWindow((rx,ry)=>setPhotoOrigin({x:x-rx,y:y-ry})));
  const measureDrop=()=>dropSlot.current?.measureInWindow((x,y,w,h)=>root.current?.measureInWindow((rx,ry)=>setDrop({x:x-rx+w/2-45,y:y-ry+h/2-45})));

  useEffect(()=>{
    if(analysis||!motion||!processing)return;
    const loop=Animated.loop(Animated.sequence([
      Animated.timing(sweep,{toValue:1,duration:1800,easing:Easing.inOut(Easing.quad),useNativeDriver:true,isInteraction:false}),
      Animated.timing(sweep,{toValue:0,duration:1800,easing:Easing.inOut(Easing.quad),useNativeDriver:true,isInteraction:false}),
    ]));loop.start();return()=>loop.stop();
  },[analysis,motion,processing,sweep]);

  useEffect(()=>{
    const attempt=++generation.current;
    if(!analysis){completedScan.current=null;setFinished(false);setCompleted([]);setCurrent(null);return;}
    if(completedScan.current===analysis.scanId)return;
    const timers=new Set<ReturnType<typeof setTimeout>>(), cancelSteps=new Set<()=>void>();
    const finish=()=>{
      if(attempt!==generation.current||completedScan.current===analysis.scanId)return;
      completedScan.current=analysis.scanId;
      for(const timer of timers)clearTimeout(timer);
      for(const cancel of [...cancelSteps])cancel();
      setCompleted(analysis.items);setCurrent(null);setFinished(true);
      callbacks.current.onComplete();
    };
    // Native animation callbacks can be interrupted or lost; data must remain usable.
    const run=(animation:Animated.CompositeAnimation,duration:number)=>new Promise<boolean>(resolve=>{
      let settled=false;
      const settle=(done:boolean)=>{if(settled)return;settled=true;clearTimeout(timer);timers.delete(timer);cancelSteps.delete(cancel);resolve(done);};
      const cancel=()=>{settle(false);animation.stop();};
      const timer=setTimeout(cancel,duration+300);timers.add(timer);cancelSteps.add(cancel);
      animation.start(({finished:done})=>settle(done));
    });
    callbacks.current.onExpand?.();
    if(!motion||editing||!analysis.items.length){finish();return;}
    setFinished(false);setCompleted([]);
    const deadline=setTimeout(()=>{finish();for(const cancel of [...cancelSteps])cancel();},12000);timers.add(deadline);
    void(async()=>{
      for(const item of analysis.items){
        if(attempt!==generation.current||completedScan.current===analysis.scanId)return;
        setCurrent(item);ring.setValue(0);flight.setValue(0);
        const ringDuration=analysis.items.length>8?160:320, flightDuration=item.box?(analysis.items.length>8?280:480):180;
        if(!await run(Animated.timing(ring,{toValue:1,duration:ringDuration,easing:Easing.out(Easing.cubic),useNativeDriver:false,isInteraction:false}),ringDuration)){finish();return;}
        if(attempt!==generation.current)return;
        void feedback.selection();
        if(!await run(Animated.timing(flight,{toValue:1,duration:flightDuration,easing:Easing.inOut(Easing.cubic),useNativeDriver:true,isInteraction:false}),flightDuration)){finish();return;}
        if(attempt!==generation.current)return;
        setCompleted(previous=>[...previous,item]);setCurrent(null);
      }
      clearTimeout(deadline);timers.delete(deadline);finish();
    })().catch(finish);
    return()=>{generation.current++;for(const timer of timers)clearTimeout(timer);for(const cancel of [...cancelSteps])cancel();ring.stopAnimation();flight.stopAnimation();};
  },[analysis,editing,motion,ring,flight]);

  const box=current?.visible?current.box:null, bounds=box?visiblePhotoBox(box,frame,{width:photoWidth,height:photoHeight}):null;
  const rx=bounds?bounds.width/2:0, ry=bounds?bounds.height/2:0, circumference=2*Math.PI*Math.sqrt((rx*rx+ry*ry)/2);
  const cropScale=bounds?90/Math.max(bounds.width,bounds.height):1;
  const sourceX=photoOrigin.x+(bounds?bounds.left+bounds.width/2-45:0), sourceY=photoOrigin.y+(bounds?bounds.top+bounds.height/2-45:0);
  const hero=<View ref={photoView} collapsable={false} onLayout={measurePhoto} style={[styles.mealPhoto,{height:photoHeight}]}>
    <Image source={{uri:photo.uri}} accessibilityLabel={t('tracking.mealPhoto')} contentFit="cover" transition={0} style={StyleSheet.absoluteFill}/>
    <NavigationIconButton kind="close" tone="overlay" accessibilityLabel={t('common.close')} disabled={saving} onPress={onBack} style={styles.close}/>
    {current&&bounds&&<Svg pointerEvents="none" style={StyleSheet.absoluteFill} width={photoWidth} height={photoHeight}><AnimatedEllipse cx={bounds.left+rx} cy={bounds.top+ry} rx={rx} ry={ry} stroke={theme.yellow} strokeWidth={3.5} fill="rgba(254,181,10,.12)" strokeDasharray={`${circumference}`} strokeDashoffset={ring.interpolate({inputRange:[0,1],outputRange:[circumference,0]})}/></Svg>}
  </View>;
  return <View ref={root} collapsable={false} style={[styles.root,analysis&&{backgroundColor:theme.background}]} onLayout={event=>setSize({width:event.nativeEvent.layout.width,height:event.nativeEvent.layout.height})}>
    {!analysis ? <>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}><Image source={{uri:photo.uri}} style={{position:'absolute',...frozenFrame}} contentFit="fill" transition={0}/>{motion&&processing&&<Animated.View style={[styles.sweep,{transform:[{translateY:sweep.interpolate({inputRange:[0,1],outputRange:[0,Math.max(1,size.height-4)]})}]}]}/>}</View>
      <NavigationIconButton kind="close" tone="overlay" accessibilityLabel={t('common.close')} onPress={onBack} style={styles.close}/>
      <View style={styles.waiting}><View style={styles.status}><Text accessibilityLiveRegion="polite" style={styles.statusTitle}>{t(error?'tracking.analysisPaused':'tracking.analyzing')}</Text>{!!error&&<Text accessibilityRole="alert" style={styles.statusBody}>{error}</Text>}</View>{!!error&&<><TouchableOpacity accessibilityRole="button" onPress={onRetry} style={appStyles.button}><Text style={appStyles.buttonText}>{t('common.retry')}</Text></TouchableOpacity><TouchableOpacity accessibilityRole="button" onPress={onRetake} style={styles.retake}><Text style={styles.statusBody}>{t('tracking.backToCamera')}</Text></TouchableOpacity></>}</View>
    </> : <PhotoMealReview autoSaved={autoSaved} saveActionLabel={saveActionLabel} embedded photo={photo} hero={hero} onPhotoLayout={measurePhoto} nutritionOverride={nutritionOverride} onNutritionOverride={onNutritionOverride} analysis={analysis} title={title} items={items} mealType={mealType} onMealType={onMealType} onTitle={onTitle} onItems={onItems} onSave={onSave} onBack={onBack} saving={saving} error={error} editing={editing} pending={!finished} progressItems={completed} currentFood={current} dropTargetRef={dropSlot} onDropLayout={measureDrop} onRetake={onRetake}/>}
    {current&&bounds&&box&&<Animated.View pointerEvents="none" style={[styles.fragment,{opacity:flight.interpolate({inputRange:[0,.05,.9,1],outputRange:[0,1,1,0]}),transform:[{translateX:flight.interpolate({inputRange:[0,.45,1],outputRange:[sourceX,Math.min(size.width-90,sourceX+75),drop.x]})},{translateY:flight.interpolate({inputRange:[0,.4,1],outputRange:[sourceY,Math.min(sourceY-38,drop.y-100),drop.y]})},{scale:flight.interpolate({inputRange:[0,1],outputRange:[Math.max(bounds.width,bounds.height)/90,.46]})}]}]}><Image source={{uri:photo.uri}} style={{position:'absolute',width:frame.width*cropScale,height:frame.height*cropScale,left:(frame.left-bounds.left)*cropScale+(90-bounds.width*cropScale)/2,top:(frame.top-bounds.top)*cropScale+(90-bounds.height*cropScale)/2}} contentFit="fill"/></Animated.View>}
  </View>;
}
const styles=StyleSheet.create({
  root:{flex:1,backgroundColor:'#000000'},mealPhoto:{width:'100%',overflow:'hidden',backgroundColor:theme.soft},
  sweep:{position:'absolute',left:0,right:0,height:3,backgroundColor:theme.yellow,shadowColor:theme.yellow,shadowRadius:14,shadowOpacity:1,shadowOffset:{width:0,height:0}},
  close:{position:'absolute',top:24,left:22,zIndex:2},
  waiting:{position:'absolute',left:24,right:24,bottom:36,gap:12},status:{padding:16,borderRadius:AppRadii.card,backgroundColor:'rgba(0,0,0,.72)',gap:8},statusTitle:{fontFamily:'Degular',fontSize:22,color:theme.onPrimary},statusBody:{fontFamily:'CronosPro',fontSize:16,lineHeight:22,color:theme.onPrimary},retake:{minHeight:44,alignItems:'center',justifyContent:'center'},
  fragment:{position:'absolute',left:0,top:0,width:90,height:90,borderRadius:AppRadii.card,borderWidth:3,borderColor:theme.yellow,backgroundColor:theme.surface,overflow:'hidden',zIndex:20},
});
