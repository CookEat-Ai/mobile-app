import React, { useMemo, useState } from 'react';
import { FlatList, Linking, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { AppRadii, AppTheme as theme, appStyles } from '../constants/AppTheme';
import { contentColumn, useResponsive } from '../hooks/useResponsive';
import { AppScreenHeading } from '../components/AppScreenHeading';
import { NavigationIconButton } from '../components/NavigationIconButton';
import credits from '../assets/data/recipe-credits.json';

export default function RecipeCreditsScreen() {
  const { t, i18n } = useTranslation();
  const insets=useSafeAreaInsets(), {gutter}=useResponsive();
  const [query,setQuery]=useState('');
  const locale=i18n.language.toLowerCase();
  const rows=useMemo(()=>credits.map(entry=>({...entry,title:(entry.titles as Record<string,string>)[locale] || (entry.titles as Record<string,string>)[locale.split('-')[0]] || entry.titles.fr})).filter(entry=>!query.trim() || `${entry.title} ${entry.originalTitle}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())).sort((a,b)=>a.title.localeCompare(b.title,locale)),[locale,query]);
  return <View style={appStyles.screen}>
    <FlatList data={rows} keyExtractor={entry=>entry.id} keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled" initialNumToRender={8}
      contentContainerStyle={{...contentColumn(),paddingTop:insets.top+8,paddingHorizontal:gutter,paddingBottom:insets.bottom+24,gap:12}}
      ListHeaderComponent={<><AppScreenHeading title={t('recipeCredits.title')} action={<NavigationIconButton kind="close" onPress={()=>router.back()}/>} />
        <Text style={appStyles.subtitle}>{t('recipeCredits.description')}</Text>
        <TextInput value={query} onChangeText={setQuery} placeholder={t('common.searchPlaceholder')} accessibilityLabel={t('common.searchPlaceholder')} style={styles.search}/>
      </>}
      ListEmptyComponent={<Text style={appStyles.subtitle}>{t('recipeCredits.empty')}</Text>}
      renderItem={({item})=><View style={styles.card}>
        <Text style={appStyles.section}>{item.title}</Text><Text style={appStyles.subtitle}>{item.publisher}</Text>
        <View style={styles.links}>
          {[{url:item.url,label:t('mealCost.recipeSource')},{url:item.authorsUrl,label:t('mealCost.authors')},{url:item.licenseUrl,label:item.license}].map(link=>link.url&&<TouchableOpacity key={link.url} accessibilityRole="link" onPress={()=>void Linking.openURL(link.url)} style={styles.link}><Text style={styles.linkText}>{link.label}</Text></TouchableOpacity>)}
        </View><Text style={appStyles.subtitle}>{t('recipeCredits.adaptations')}</Text>
      </View>} />
  </View>;
}
const styles=StyleSheet.create({
  search:{...appStyles.card,minHeight:52,marginVertical:20,fontFamily:'CronosPro',fontSize:17,color:theme.ink},
  card:{...appStyles.card,gap:8},links:{flexDirection:'row',flexWrap:'wrap',gap:8},
  link:{minHeight:44,justifyContent:'center',paddingHorizontal:12,backgroundColor:theme.soft,borderRadius:AppRadii.control},
  linkText:{fontFamily:'CronosProBold',fontSize:15,color:theme.ink,textDecorationLine:'underline'},
});
