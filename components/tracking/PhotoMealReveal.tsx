import { NavigationIconButton } from '../NavigationIconButton';
import { CameraBrand } from '../CameraBrand';
import { AppControl, AppRadii, AppTheme as theme, appStyles } from '../../constants/AppTheme';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Ellipse } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { useMotionAllowed, useMotionPreferences } from '../../contexts/MotionPreferences';
import { containedPhotoFrame, coverPhotoFrame, photoDetectionFocus, photoSampleGeometry, type FoodNutrition, type MealPhotoAnalysis, type PhotoFood } from '../../services/mealTracking';
import { feedback } from '../../services/haptics';
import { PhotoMealReview } from './PhotoMealReview';
const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);
type RevealJob = {
  food: PhotoFood;
  sample: PhotoFood | null;
  ring: Animated.Value;
  morph: Animated.Value;
  flight: Animated.Value;
  alignment: Animated.Value;
  targetFood: PhotoFood | null;
  aligned?: Promise<boolean>;
  locationChanged?: () => void;
  phase: 'queued' | 'ring' | 'locating' | 'holding' | 'morph' | 'flight';
  launch?: () => void;
};

/** A borderless cover photo stays above a rounded sheet, in one scrollable modal. */
export function PhotoMealReveal({photo,analysis,progressItems=[],title,items,onTitle,onItems,mealType,onMealType,onSave,onComplete,onExpand,onBack,onRetry,onRetake,processing=true,saving,error,editing=false,nutritionOverride,onNutritionOverride,saveActionLabel,autoSaved}: {
  photo:{uri:string;width:number;height:number};analysis:MealPhotoAnalysis|null;progressItems?:PhotoFood[];title:string;items:PhotoFood[];
  mealType?: 'breakfast'|'lunch'|'snack'|'dinner'|null;onMealType?:(value:'breakfast'|'lunch'|'snack'|'dinner')=>void;
  saveActionLabel?:string;autoSaved?:boolean;
  nutritionOverride?:FoodNutrition|null;onNutritionOverride?:(value:FoodNutrition|null)=>void;
  onTitle:(value:string)=>void;onItems:(items:PhotoFood[])=>void;onSave:()=>void;onComplete:()=>void;onExpand?:()=>void;
  onBack:()=>void;onRetry:()=>void;onRetake:()=>void;processing?:boolean;saving:boolean;error:string;editing?:boolean;
}) {
  const {t}=useTranslation(), motion=useMotionAllowed(), {enabled,foreground,ready}=useMotionPreferences(), window=useWindowDimensions();
  const [size,setSize]=useState({width:window.width,height:window.height});
  const [completed,setCompleted]=useState<PhotoFood[]>([]), [activeJobs,setActiveJobs]=useState<RevealJob[]>([]), [finished,setFinished]=useState(editing);
  const sweep=useRef(new Animated.Value(0)).current;
  const root=useRef<View>(null), photoView=useRef<View>(null), dropSlot=useRef<View>(null);
  const [photoOrigin,setPhotoOrigin]=useState({x:0,y:0}), [drop,setDrop]=useState({x:20,y:400});
  const callbacks=useRef({onComplete,onExpand});
  const source=useRef({analysis,progressItems,error});
  source.current={analysis,progressItems,error};
  const pump=useRef<()=>void>(()=>{}), completedScan=useRef<string|null>(null);
  const delivered=useRef<PhotoFood[]>([]), sessionPhoto=useRef(photo.uri);
  callbacks.current={onComplete,onExpand};
  const photoWidth=Math.max(1,size.width), photoHeight=Math.round(window.height*(window.width>=768?.32:.4));
  const frame=(finished?coverPhotoFrame:containedPhotoFrame)(photo,{width:photoWidth,height:photoHeight}), frozenFrame=coverPhotoFrame(photo,size);
  const presentation=useRef({frame,viewport:{width:photoWidth,height:photoHeight}});
  presentation.current={frame,viewport:{width:photoWidth,height:photoHeight}};
  const measurePhoto=()=>photoView.current?.measureInWindow((x,y)=>root.current?.measureInWindow((rx,ry)=>setPhotoOrigin({x:x-rx,y:y-ry})));
  const measureDrop=()=>dropSlot.current?.measureInWindow((x,y,w,h)=>root.current?.measureInWindow((rx,ry)=>setDrop({x:x-rx+w/2-45,y:y-ry+h/2-45})));

  useEffect(()=>{
    if(analysis||progressItems.length||!motion||!processing)return;
    const loop=Animated.loop(Animated.sequence([
      Animated.timing(sweep,{toValue:1,duration:1800,easing:Easing.inOut(Easing.quad),useNativeDriver:true,isInteraction:false}),
      Animated.timing(sweep,{toValue:0,duration:1800,easing:Easing.inOut(Easing.quad),useNativeDriver:true,isInteraction:false}),
    ]));loop.start();return()=>loop.stop();
  },[analysis,progressItems.length,motion,processing,sweep]);

  useEffect(()=>{
    let disposed=false, expanded=false, complete=false;
    if(sessionPhoto.current!==photo.uri){sessionPhoto.current=photo.uri;delivered.current=[];completedScan.current=null;}
    const started=new Set(delivered.current.map(item=>item.id)), jobs=new Map<string,RevealJob>();
    const timers=new Set<ReturnType<typeof setTimeout>>(), cancelSteps=new Set<()=>void>();
    setFinished(editing);setCompleted(delivered.current);setActiveJobs([]);
    if(source.current.analysis&&completedScan.current===source.current.analysis.scanId){setFinished(true);return;}
    const publish=()=>{if(!disposed&&!complete)setActiveJobs([...jobs.values()]);};
    const finish=()=>{
      const final=source.current.analysis;
      if(disposed||complete||!final)return;
      const landed=new Set(delivered.current.map(food=>food.id));
      if(jobs.size||!final.items.every(food=>landed.has(food.id)))return;
      complete=true;
      for(const timer of timers)clearTimeout(timer);
      for(const cancel of [...cancelSteps])cancel();
      delivered.current=final.items;setCompleted(final.items);setActiveJobs([]);setFinished(true);
      if(completedScan.current!==final.scanId){completedScan.current=final.scanId;callbacks.current.onComplete();}
    };
    const painted=()=>new Promise<void>(resolve=>{
      let frame:number;
      const done=()=>{cancelSteps.delete(cancel);resolve();};
      const cancel=()=>{cancelAnimationFrame(frame);done();};
      cancelSteps.add(cancel);
      // Start after the committed SVG has had a visible frame, not while its
      // state update is still waiting behind other recognition renders.
      frame=requestAnimationFrame(()=>{frame=requestAnimationFrame(done);});
    });
    const wait=(duration:number)=>new Promise<void>(resolve=>{
      const done=()=>{clearTimeout(timer);timers.delete(timer);cancelSteps.delete(done);resolve();};
      const timer=setTimeout(done,duration);timers.add(timer);cancelSteps.add(done);
    });
    const run=(value:Animated.Value,duration:number,native:boolean)=>new Promise<boolean>(resolve=>{
      let settled=false;
      const animation=Animated.timing(value,{toValue:1,duration,easing:Easing.inOut(Easing.cubic),useNativeDriver:native,isInteraction:false});
      const settle=(finished:boolean)=>{if(settled)return;settled=true;clearTimeout(timer);timers.delete(timer);cancelSteps.delete(cancel);resolve(finished);};
      const cancel=()=>{settle(false);animation.stop();};
      const timer=setTimeout(cancel,duration+1000);timers.add(timer);cancelSteps.add(cancel);
      try{animation.start(({finished})=>settle(finished));}catch{cancel();}
    });
    const play=async(value:Animated.Value,duration:number,native:boolean)=>{
      for(let attempt=0;attempt<2;attempt++){
        if(disposed||complete)return false;
        const succeeded=await run(value,duration,native).catch(()=>false);
        if(disposed||complete)return false;
        if(succeeded){value.setValue(1);return true;}
        value.setValue(0);await painted();
      }
      // A failed/missing native callback must not skip this food. Show the
      // finished shape on screen; the closed-contour hold still runs below.
      value.setValue(1);await painted();return !disposed&&!complete;
    };
    const latestFood=(job:RevealJob)=>(source.current.analysis?.items||source.current.progressItems).find(food=>food.id===job.food.id)||job.food;
    const align=(job:RevealJob,food:PhotoFood)=>{
      const view=presentation.current;
      if(job.targetFood||job.phase==='queued'||job.phase==='flight'||!food.visible||food.locationPending||!food.box||!photoSampleGeometry(food.box,view.frame,view.viewport))return;
      job.targetFood=food;
      const original=job.food.visible&&!job.food.locationPending?job.food.box:null;
      if(original&&(['x','y','width','height'] as const).every(key=>original[key]===food.box![key])){job.alignment.setValue(1);job.aligned=Promise.resolve(true);return;}
      // Keep the current stroke progress. Only its position changes, as soon
      // as independently verified pixels arrive, including during drawing.
      job.aligned=play(job.alignment,180,false);publish();
    };
    const animate=async(job:RevealJob)=>{
      await painted();
      if(disposed||complete||!jobs.has(job.food.id)||!await play(job.ring,500,false))return;
      if(latestFood(job).locationPending&&!source.current.analysis&&!source.current.error){
        job.phase='locating';publish();
        await new Promise<void>(resolve=>{
          const done=()=>{cancelSteps.delete(done);job.locationChanged=undefined;resolve();};
          job.locationChanged=()=>{if(!latestFood(job).locationPending||source.current.analysis||source.current.error)done();};
          cancelSteps.add(done);job.locationChanged();
        });
      }
      if(disposed||complete||!jobs.has(job.food.id))return;
      const latest=latestFood(job);align(job,latest);
      if(job.aligned&&!await job.aligned)return;
      if(disposed||complete||!jobs.has(job.food.id))return;
      job.phase='holding';publish();
      await painted();await wait(240);
      if(disposed||complete||!jobs.has(job.food.id))return;
      const view=presentation.current;
      job.sample=latest.visible&&!latest.locationPending&&latest.box&&photoSampleGeometry(latest.box,view.frame,view.viewport)?latest:null;
      job.phase='morph';publish();
      if(!await play(job.morph,200,false)||!jobs.has(job.food.id))return;
      job.phase='flight';publish();void feedback.selection();
      if(!await play(job.flight,480,true)||!jobs.has(job.food.id))return;
      const landed={...latest,box:job.sample?.box||null};
      if(!delivered.current.some(food=>food.id===landed.id))delivered.current=[...delivered.current,landed];
      setCompleted(delivered.current);jobs.delete(job.food.id);publish();finish();
    };
    const next=()=>{
      if(disposed||complete)return;
      const {analysis:final,progressItems:partial,error:failure}=source.current;
      const recognized=final?.items||partial;
      if(final){
        const confirmed=new Set(final.items.map(food=>food.id));
        // A completed nutrition review may reject a provisional detection.
        // Remove that job and its row; confirmed foods keep their animations.
        for(const [id,job] of jobs)if(!confirmed.has(id)){job.locationChanged?.();jobs.delete(id);}
        delivered.current=delivered.current.filter(food=>confirmed.has(food.id));
        setCompleted(delivered.current);
      }
      for(const job of jobs.values()){align(job,latestFood(job));job.locationChanged?.();}
      if(!final&&!recognized.length)return;
      if(!expanded){expanded=true;callbacks.current.onExpand?.();}
      if(!ready||!foreground)return;
      if(!enabled||editing){for(const food of recognized)started.add(food.id);delivered.current=recognized;setCompleted(recognized);finish();return;}
      if(failure)return;
      // Each detection owns its animation: no location barrier and no serial
      // queue that falls behind the recognition stream.
      for(const food of recognized)if(!started.has(food.id)){
        started.add(food.id);
        const job:RevealJob={food,sample:null,ring:new Animated.Value(0),morph:new Animated.Value(0),flight:new Animated.Value(0),alignment:new Animated.Value(0),targetFood:null,phase:'queued'};
        job.launch=()=>{void animate(job).catch(()=>{});};
        jobs.set(food.id,job);
      }
      publish();
      if(final)finish();
    };
    pump.current=next;next();
    return()=>{
      disposed=true;pump.current=()=>{};
      for(const timer of timers)clearTimeout(timer);
      for(const cancel of [...cancelSteps])cancel();
    };
  },[photo.uri,editing,enabled,foreground,ready]);
  useEffect(()=>{
    if(!ready||!foreground||!enabled||editing)return;
    const {frame,viewport}=presentation.current;
    const labelWidth=Math.min(144,viewport.width-32);
    const footprint=(food:PhotoFood)=>{
      const zone=photoDetectionFocus(food,frame,viewport);
      const left=Math.max(8,Math.min(viewport.width-labelWidth-8,(zone.left+zone.right-labelWidth)/2));
      return {left:Math.min(zone.left,left),right:Math.max(zone.right,left+labelWidth),top:zone.top,bottom:Math.min(viewport.height,zone.bottom+28)};
    };
    const drawing=activeJobs.filter(job=>job.phase==='ring'||job.phase==='holding'||job.phase==='morph').map(job=>footprint(job.targetFood||job.food));
    let launched=false;
    for(const job of activeJobs)if(job.phase==='queued'){
      // Use a position already verified while this food was waiting. Freeze it
      // once drawing starts so stream refinements cannot move a partial ring.
      job.food=(source.current.analysis?.items||source.current.progressItems).find(food=>food.id===job.food.id)||job.food;
      const zone=footprint(job.food);
      const area=(zone.right-zone.left)*(zone.bottom-zone.top);
      // IoU misses a small contour enclosed by a broad fallback zone. Compare
      // against the smaller area, including the ingredient's visible label.
      if(drawing.some(other=>{
        const overlap=Math.max(0,Math.min(zone.right,other.right)-Math.max(zone.left,other.left))*Math.max(0,Math.min(zone.bottom,other.bottom)-Math.max(zone.top,other.top));
        return overlap/Math.min(area,(other.right-other.left)*(other.bottom-other.top))>.2;
      }))continue;
      drawing.push(zone);job.phase='ring';job.launch?.();launched=true;
    }
    if(launched)setActiveJobs([...activeJobs]);
  },[activeJobs,ready,foreground,enabled,editing]);
  useEffect(()=>{pump.current();},[analysis,progressItems,error]);

  const hasData=!!analysis||progressItems.length>0;
  const current=(activeJobs.find(job=>job.phase==='ring'||job.phase==='holding')||activeJobs.find(job=>job.phase==='locating'||job.phase==='morph'||job.phase==='flight'))?.food||null;
  const contourLabelWidth=Math.min(144,photoWidth-32);
  const visuals=activeJobs.map(job=>{
    const focus=photoDetectionFocus(job.food,frame,{width:photoWidth,height:photoHeight});
    const alignedFocus=job.targetFood?photoDetectionFocus(job.targetFood,frame,{width:photoWidth,height:photoHeight}):focus;
    const crop=job.sample?.box?photoSampleGeometry(job.sample.box,frame,{width:photoWidth,height:photoHeight}):null;
    const cx=(focus.left+focus.right)/2,cy=(focus.top+focus.bottom)/2,rx=(focus.right-focus.left)/2,ry=(focus.bottom-focus.top)/2;
    const target=crop?.focus;
    const targetX=target?(target.left+target.right)/2:cx,targetY=target?(target.top+target.bottom)/2:cy;
    const circumference=2*Math.PI*Math.sqrt((rx*rx+ry*ry)/2);
    const alignedX=(alignedFocus.left+alignedFocus.right)/2,alignedY=(alignedFocus.top+alignedFocus.bottom)/2;
    return {job,focus,crop,cx,cy,rx,ry,alignedX,alignedY,targetX,targetY,circumference,
      labelLeft:Math.max(8,Math.min(photoWidth-contourLabelWidth-8,alignedX-contourLabelWidth/2)),labelTop:Math.min(photoHeight-28,alignedFocus.bottom),
      sourceX:photoOrigin.x+targetX-45,sourceY:photoOrigin.y+targetY-45};
  });
  const header=<LinearGradient pointerEvents="box-none" colors={['rgba(0,0,0,.72)','transparent']} style={styles.topOverlay}>
    <View style={styles.header}>
      <NavigationIconButton kind="close" tone="overlay" accessibilityLabel={t('common.close')} disabled={saving} onPress={onBack}/>
      <CameraBrand/>
      <View pointerEvents="none" style={styles.headerSpacer}/>
    </View>
  </LinearGradient>;
  const hero=<View ref={photoView} collapsable={false} onLayout={measurePhoto} style={[styles.mealPhoto,{height:photoHeight}]}>
    <Image source={{uri:photo.uri}} accessibilityLabel={t('tracking.mealPhoto')} contentFit={finished?'cover':'contain'} transition={0} style={StyleSheet.absoluteFill}/>
    {header}
    <Svg pointerEvents="none" style={StyleSheet.absoluteFill} width={photoWidth} height={photoHeight}>{visuals.map(({job,cx,cy,rx,ry,alignedX,alignedY,crop,circumference})=><AnimatedEllipse key={job.food.id} testID={`food-contour-${job.food.id}`} cx={job.alignment.interpolate({inputRange:[0,1],outputRange:[cx,alignedX]})} cy={job.alignment.interpolate({inputRange:[0,1],outputRange:[cy,alignedY]})} rx={job.morph.interpolate({inputRange:[0,1],outputRange:[rx,crop?(crop.focus.right-crop.focus.left)/2:22]})} ry={job.morph.interpolate({inputRange:[0,1],outputRange:[ry,crop?(crop.focus.bottom-crop.focus.top)/2:22]})} opacity={job.phase==='queued'?0:job.morph.interpolate({inputRange:[0,1],outputRange:[1,0]})} stroke={theme.yellow} strokeWidth={5} fill="rgba(254,181,10,.12)" strokeDasharray={`${circumference}`} strokeDashoffset={job.ring.interpolate({inputRange:[0,1],outputRange:[circumference,0]})}/>)}</Svg>
    {visuals.filter(({job})=>job.phase==='ring'||job.phase==='holding').map(({job,labelLeft,labelTop})=><View key={job.food.id} pointerEvents="none" testID={`food-contour-label-${job.food.id}`} style={[styles.contourLabel,{width:contourLabelWidth,left:labelLeft,top:labelTop}]}><Text numberOfLines={1} style={styles.contourLabelText}>{job.food.icon||'🍽️'} {job.food.name}</Text></View>)}
  </View>;
  return <View ref={root} collapsable={false} style={[styles.root,hasData&&{backgroundColor:theme.background}]} onLayout={event=>setSize({width:event.nativeEvent.layout.width,height:event.nativeEvent.layout.height})}>
    {!hasData ? <>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}><Image source={{uri:photo.uri}} style={{position:'absolute',...frozenFrame}} contentFit="fill" transition={0}/>{motion&&processing&&<Animated.View style={[styles.sweep,{transform:[{translateY:sweep.interpolate({inputRange:[0,1],outputRange:[0,Math.max(1,size.height-4)]})}]}]}/>}</View>
      {header}
      <View style={styles.waiting}><View style={styles.status}><Text accessibilityLiveRegion="polite" style={styles.statusTitle}>{t(error?'tracking.analysisPaused':'tracking.analyzing')}</Text>{!error&&<Text style={styles.statusBody}>{t('tracking.analyzingNote')}</Text>}{!!error&&<Text accessibilityRole="alert" style={styles.statusBody}>{error}</Text>}</View>{!!error&&<><TouchableOpacity accessibilityRole="button" onPress={onRetry} style={appStyles.button}><Text style={appStyles.buttonText}>{t('common.retry')}</Text></TouchableOpacity><TouchableOpacity accessibilityRole="button" onPress={onRetake} style={styles.retake}><Text style={styles.statusBody}>{t('tracking.backToCamera')}</Text></TouchableOpacity></>}</View>
    </> : <PhotoMealReview autoSaved={autoSaved} saveActionLabel={saveActionLabel} embedded photo={photo} hero={hero} onPhotoLayout={measurePhoto} nutritionOverride={nutritionOverride} onNutritionOverride={onNutritionOverride} analysis={analysis} title={title} items={analysis?items:progressItems} mealType={mealType} onMealType={onMealType} onTitle={onTitle} onItems={onItems} onSave={onSave} onBack={onBack} saving={saving} error={error} editing={editing} streaming={!analysis} pending={!finished} progressItems={completed} currentFood={current} dropTargetRef={dropSlot} onDropLayout={measureDrop} onRetake={onRetake} onRetry={!analysis?onRetry:undefined}/>}
    {visuals.map(({job,crop,sourceX,sourceY})=><Animated.View key={job.food.id} testID={`food-flight-${job.food.id}`} pointerEvents="none" style={[styles.flying,{opacity:job.flight.interpolate({inputRange:[0,.9,1],outputRange:[1,1,0]}),transform:[{translateX:job.flight.interpolate({inputRange:[0,.45,1],outputRange:[sourceX,Math.min(size.width-90,sourceX+75),drop.x]})},{translateY:job.flight.interpolate({inputRange:[0,.4,1],outputRange:[sourceY,Math.min(sourceY-38,drop.y-100),drop.y]})},{scale:job.flight.interpolate({inputRange:[0,1],outputRange:[crop?Math.max(crop.bounds.width,crop.bounds.height)/90:.72,.46]})}]}]}>
      <Animated.View style={[styles.fragment,{opacity:job.morph.interpolate({inputRange:[0,.8,1],outputRange:[0,1,1]})}]}>
        {crop?<Image testID={`food-photo-${job.food.id}`} source={{uri:photo.uri}} style={{position:'absolute',width:frame.width*crop.crop.scale,height:frame.height*crop.crop.scale,left:crop.crop.left,top:crop.crop.top}} contentFit="fill"/>:<Text testID={`food-emoji-${job.food.id}`} style={styles.emoji}>{job.food.icon||'🍽️'}</Text>}
      </Animated.View>
    </Animated.View>)}
  </View>;
}
const styles=StyleSheet.create({
  root:{flex:1,backgroundColor:'#000000'},mealPhoto:{width:'100%',overflow:'hidden',backgroundColor:'#000000'},
  sweep:{position:'absolute',left:0,right:0,height:3,backgroundColor:theme.yellow,shadowColor:theme.yellow,shadowRadius:14,shadowOpacity:1,shadowOffset:{width:0,height:0}},
  topOverlay:{position:'absolute',top:0,left:0,right:0,paddingTop:24,paddingHorizontal:16,paddingBottom:45,zIndex:2},
  header:{flexDirection:'row',alignItems:'center',gap:8,padding:6},
  headerSpacer:{width:AppControl.size,height:AppControl.size,flexShrink:0},
  waiting:{position:'absolute',left:24,right:24,bottom:36,gap:12},status:{padding:16,borderRadius:AppRadii.card,backgroundColor:'rgba(0,0,0,.72)',gap:8},statusTitle:{fontFamily:'Degular',fontSize:22,color:theme.onPrimary},statusBody:{fontFamily:'CronosPro',fontSize:16,lineHeight:22,color:theme.onPrimary},retake:{minHeight:44,alignItems:'center',justifyContent:'center'},
  flying:{position:'absolute',left:0,top:0,width:90,height:90,zIndex:20},
  contourLabel:{position:'absolute',height:28,paddingHorizontal:8,justifyContent:'center',borderRadius:AppRadii.chip,backgroundColor:theme.surface,borderColor:theme.yellow,borderWidth:1},
  contourLabelText:{fontFamily:'CronosPro',fontSize:14,color:theme.ink},
  emoji:{fontSize:52,lineHeight:68,textAlign:'center'},
  fragment:{width:90,height:90,alignItems:'center',justifyContent:'center',borderRadius:AppRadii.card,borderWidth:3,borderColor:theme.yellow,backgroundColor:theme.surface,overflow:'hidden',zIndex:20},
});
