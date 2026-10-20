import { AppIconBadge } from '../ui/AppIconBadge';
import { AppRadii, AppTheme as theme, appStyles } from '../../constants/AppTheme';
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { ChatSheet } from '../chat/ChatSheet';
import { apiService } from '../../services/api';
import type { RecipeChatMessage } from '../../services/personalRecipe';
import type { PhotoFood } from '../../services/mealTracking';
export function TrackingMealChat({title,items,onChange,disabled}: {title:string;items:PhotoFood[];onChange:(title:string,items:PhotoFood[])=>void;disabled?:boolean}) {
  const {t}=useTranslation();
  const [visible,setVisible]=useState(false),[draft,setDraft]=useState(''),[messages,setMessages]=useState<RecipeChatMessage[]>([]),[sending,setSending]=useState(false),[error,setError]=useState(false);
  const active=useRef(true),busy=useRef(false),failed=useRef<{text:string;history:RecipeChatMessage[]}|null>(null);
  useEffect(()=>{active.current=true;return()=>{active.current=false;};},[]);
  const send=async(retry=false)=>{
    const text=retry?failed.current?.text||'':draft.trim();
    if(!text||busy.current||disabled) return;
    const history=retry?failed.current?.history||messages:messages;
    const pending=[...history,{role:'user' as const,text}].slice(-39);
    busy.current=true;setSending(true);setError(false);failed.current={text,history};setMessages(pending);if(!retry)setDraft('');
    try {
      const response=await apiService.chatAboutTrackedMeal({title,items,message:text,history:history.slice(-12)});
      if(!active.current)return;
      if(!response.data?.reply)throw new Error('missing_reply');
      if(response.data.action==='modify'&&response.data.meal) {
        const changed=response.data.meal;
        // Photo locations describe the original observation; keep only unchanged identities.
        const next=changed.items.map(item=>{const prior=items.find(old=>old.id===item.id&&old.foodKey===item.foodKey);return prior?{...prior,...item,box:prior.box,visible:prior.visible,confidence:prior.confidence}:item;});
        onChange(changed.title,next);
      }
      setMessages([...pending,{role:'assistant',text:response.data.reply}].slice(-40) as RecipeChatMessage[]);failed.current=null;
    } catch {if(active.current)setError(true);}
    finally {busy.current=false;if(active.current)setSending(false);}
  };
  return <>
    <TouchableOpacity accessibilityRole="button" disabled={disabled} onPress={()=>setVisible(true)} style={[styles.entry,disabled&&{opacity:.45}]}>
      <AppIconBadge name="chatbubbles-outline" /><View style={{flex:1,gap:3}}><Text style={appStyles.textAction}>{t('tracking.chatTitle')}</Text><Text style={styles.caption}>{t('tracking.chatSubtitle')}</Text></View><Ionicons name="chevron-forward" size={20} color={theme.muted}/>
    </TouchableOpacity>
    <ChatSheet visible={visible} onClose={()=>setVisible(false)} title={t('tracking.chatTitle')} welcome={t('tracking.chatWelcome')} subtitle={title} messages={messages} draft={draft} onDraft={setDraft} onSend={()=>{void send();}} sending={sending} ready={!disabled} error={error?t('recipeChat.error'):''} onRetry={()=>{void send(true);}} suggestions={[t('tracking.chatQuantityExample'),t('tracking.chatQuestionExample')]}/>
  </>;
}
const styles=StyleSheet.create({entry:{...appStyles.card,padding:14,flexDirection:'row',alignItems:'center',gap:12},icon:{width:44,height:44,borderRadius:AppRadii.control,backgroundColor:theme.yellow,alignItems:'center',justifyContent:'center'},caption:{fontFamily:'CronosPro',fontSize:14,lineHeight:19,color:theme.muted}});
