import { AppIconBadge } from './ui/AppIconBadge';
import { AppRadii, AppTheme as theme } from '../constants/AppTheme';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { ChatSheet } from './chat/ChatSheet';
import { apiService } from '../services/api';
import { getAnonymousUserId } from '../services/anonymousSession';
import { invalidatePlanning } from '../services/planningUpdates';
import { clearPersonalRecipe, personalRecipeFingerprint, personalRecipeKey, readPersonalRecipe, writePersonalRecipe, type RecipeChatMessage } from '../services/personalRecipe';

type Props = { recipe: any; context: string; onChange: (recipe: any) => void };
export function RecipeChat({ recipe, context, onChange }: Props) {
  const { t } = useTranslation();
  const original = useRef(recipe);
  const base = useRef(personalRecipeFingerprint(recipe));
  const storageKey = useRef('');
  const active = useRef(true);
  const busy = useRef(false);
  const failed = useRef<{text: string; history: RecipeChatMessage[]} | null>(null);
  const [visible, setVisible] = useState(false);
  const [ready, setReady] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [messages, setMessages] = useState<RecipeChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(false);
  const [personal, setPersonal] = useState(false);
  const patchRef = useRef<Record<string, any> | null>(null);
  const exampleIngredient = String(recipe.ingredients?.[1]?.name || recipe.ingredients?.[0]?.name || '').trim().slice(0, 80);

  useEffect(() => {
    active.current = true;
    (async () => {
      const userId = await getAnonymousUserId();
      const key = personalRecipeKey(userId, original.current.id, context);
      const stored = await readPersonalRecipe(key, base.current);
      if (!active.current) return;
      storageKey.current = key;
      if (stored) {
        setMessages(stored.messages);
        patchRef.current = stored.patch;
        if (stored.patch) {
          onChange({ ...original.current, ...stored.patch, _localPersonal: true });
          setPersonal(true);
        }
      }
      setReady(true);
    })().catch(() => { if (active.current) setError(true); });
    return () => { active.current = false; };
    // A keyed instance owns one recipe/slot and its immutable original.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadAttempt]);

  useEffect(() => {
    if (!ready || !personal || !patchRef.current || patchRef.current.servings === recipe.servings) return;
    const patch = {...patchRef.current, servings: recipe.servings, ingredients: recipe.ingredients, steps: recipe.steps, estimatedCost: recipe.estimatedCost};
    writePersonalRecipe(storageKey.current, {version:1, base:base.current, patch, messages}).then(() => {patchRef.current = patch; invalidatePlanning();}).catch(() => setError(true));
  }, [recipe.servings, recipe.ingredients, recipe.steps, recipe.estimatedCost, ready, personal, messages]);

  const send = async (retry = false) => {
    const text = retry ? failed.current?.text || '' : draft.trim();
    if (!text || !ready || busy.current) return;
    const history = retry ? failed.current?.history || messages : messages;
    const pending = [...history, {role: 'user' as const, text}].slice(-39);
    busy.current = true; setSending(true); setError(false);
    failed.current = {text, history};
    setMessages(pending);
    if (!retry) setDraft('');
    try {
      const response = await apiService.chatAboutRecipe({ recipe, message: text, history: history.slice(-12) });
      if (!active.current) return;
      if (!response.data?.reply) throw new Error('chat_unavailable');
      const next = [...pending, {role: 'assistant' as const, text: response.data.reply}].slice(-40);
      const nextPatch = response.data.action === 'modify' && response.data.recipe
        ? { ...response.data.recipe, image: '', artworkOnly: true, chef_tip: t('recipeChat.adaptedNote'), source: recipe.source ? {...recipe.source, adapted: true} : undefined }
        : patchRef.current;
      await writePersonalRecipe(storageKey.current, {version: 1, base: base.current, patch: nextPatch, messages: next});
      if (!active.current) return;
      setMessages(next); failed.current = null;
      patchRef.current = nextPatch;
      if (response.data.action === 'modify' && nextPatch) {
        onChange({ ...recipe, ...nextPatch, _localPersonal: true }); setPersonal(true); invalidatePlanning();
      }
    } catch { if (active.current) setError(true); }
    finally { busy.current = false; if (active.current) setSending(false); }
  };
  const reset = () => Alert.alert(t('recipeChat.reset'), t('recipeChat.resetDescription'), [
    { text: t('common.cancel'), style: 'cancel' },
    { text: t('recipeChat.reset'), onPress: () => {
      if (busy.current) return;
      clearPersonalRecipe(storageKey.current).then(() => {
        if (!active.current) return;
        patchRef.current = null; setPersonal(false); setMessages([]); setError(false);
        onChange(original.current); invalidatePlanning();
      }).catch(() => setError(true));
    } },
  ]);
  return <>
    <View style={styles.card}>
      <TouchableOpacity accessibilityRole="button" onPress={() => setVisible(true)} style={styles.entry}>
        <AppIconBadge name="chatbubbles-outline" />
        <View style={{flex: 1}}><Text style={styles.title}>{t('recipeChat.title')}</Text><Text style={styles.caption}>{t('recipeChat.subtitle')}</Text></View>
        <Ionicons name="chevron-forward" size={20} color={theme.muted} />
      </TouchableOpacity>
      {personal && <TouchableOpacity accessibilityRole="button" disabled={sending} onPress={reset} style={styles.reset}><Text style={styles.link}>{t('recipeChat.reset')}</Text></TouchableOpacity>}
    </View>
    <ChatSheet visible={visible} onClose={() => setVisible(false)} title={t('recipeChat.title')} subtitle={recipe.title}
      messages={messages} draft={draft} onDraft={setDraft} onSend={() => {void send();}} sending={sending} ready={ready}
      error={error ? t(ready ? 'recipeChat.error' : 'recipeChat.loadError') : ''}
      onRetry={() => { if (ready) void send(true); else {setError(false);setLoadAttempt(n=>n+1);} }}
      suggestions={exampleIngredient ? ['questionExample','changeExample'].map(key=>t(`recipeChat.${key}`,{ingredient:exampleIngredient})) : []}/>

  </>;
}
const styles = StyleSheet.create({
  card: { marginVertical:12, borderRadius:theme.radius, backgroundColor:theme.surface, borderWidth:1, borderColor:theme.line},
  entry: {flexDirection:'row', alignItems:'center', gap:12, padding:16, minHeight:80}, symbol:{width:44,height:44,borderRadius:AppRadii.control,backgroundColor:theme.yellowSoft,alignItems:'center',justifyContent:'center'},
  title:{fontFamily:'Degular',fontSize:20,color:theme.ink}, caption:{fontFamily:'CronosPro',fontSize:15,color:theme.muted}, reset:{paddingHorizontal:16,paddingBottom:16},link:{fontFamily:'CronosPro',fontSize:16,color:theme.yellow,textDecorationLine:'underline'},
});
