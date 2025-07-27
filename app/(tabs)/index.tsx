import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Micro from '../../components/Micro';
import RecordDisplay from '../../components/RecordDisplay';
import UserHeader from '../../components/UserHeader';
import { Colors } from '../../constants/Colors';
import '../../i18n';

export default function HomeScreen() {
  const colors = Colors.light;
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [recognizedText, setRecognizedText] = useState('');
  const [liveText, setLiveText] = useState('');
  const [isRecording, setIsRecording] = useState(false);

  // Animations pour masquer/afficher le contenu
  const headerOpacity = useRef(new Animated.Value(1)).current;
  const titleOpacity = useRef(new Animated.Value(1)).current;
  const introOpacity = useRef(new Animated.Value(1)).current;

  const handleTextReceived = (text: string) => {
    setRecognizedText(text);
    console.log('Texte reçu:', text);
  };

  const handleLiveTextChange = (text: string) => {
    setLiveText(text);
  };

  const handleRecordingStateChange = (recording: boolean) => {
    setIsRecording(recording);
    console.log('État d\'enregistrement:', recording);

    if (recording) {
      // Effacer le texte précédent quand l'enregistrement commence
      setLiveText('');
      setRecognizedText('');
      hideContent();
    } else {
      showContent();
    }
  };

  const hideContent = () => {
    Animated.parallel([
      Animated.timing(headerOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(titleOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(introOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const showContent = () => {
    Animated.parallel([
      Animated.timing(headerOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(titleOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(introOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleNotificationPress = () => {
    console.log('Notifications pressed');
  };

  const handleProfilePress = () => {
    console.log('Profile pressed');
  };

  return (
    <View style={[styles.container, {
      backgroundColor: colors.background,
      paddingTop: insets.top
    }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header avec profil utilisateur */}
        <Animated.View
          style={[
            styles.headerContainer,
            {
              opacity: headerOpacity,
              transform: [{
                translateY: headerOpacity.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-50, 0], // Déplace le header vers le haut
                })
              }]
            }
          ]}
        >
          <UserHeader
            userName="Samantha"
            onNotificationPress={handleNotificationPress}
            onProfilePress={handleProfilePress}
          />
        </Animated.View>

        {/* Titre principal */}
        <Animated.View
          style={[
            styles.titleContainer,
            {
              opacity: titleOpacity,
              transform: [{
                translateY: titleOpacity.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-50, 0], // Déplace le titre vers le haut
                })
              }]
            }
          ]}
        >
          <Text style={[styles.mainTitle, { color: colors.button }]}>
            {t('home.title')}
          </Text>
        </Animated.View>

        {/* Texte d'introduction */}
        <Animated.View
          style={[
            styles.introContainer,
            {
              opacity: introOpacity,
              transform: [{
                translateY: introOpacity.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-50, 0], // Déplace l'intro vers le haut
                })
              }]
            }
          ]}
        >
          <Text style={[styles.introText, { color: colors.button }]}>
            {t('home.intro')}
          </Text>
        </Animated.View>

        {/* Composant Micro réutilisable */}
        <View style={styles.microContainer}>
          <RecordDisplay
            liveText={liveText}
            isRecording={isRecording}
          />
          <Micro
            onTextReceived={handleTextReceived}
            onRecordingStateChange={handleRecordingStateChange}
            onLiveTextChange={handleLiveTextChange}
          />
        </View>

        {/* Espace en bas pour la barre de navigation */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    // Pas de position absolue pour rester dans le flux normal
  },
  titleContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    lineHeight: 34,
  },
  introContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  introText: {
    fontSize: 18,
    lineHeight: 24,
  },
  bottomSpacer: {
    height: 100, // Espace pour la barre de navigation
  },
  microContainer: {
    position: 'relative',
    alignItems: 'center',
  },
});
