import Voice from '@react-native-voice/voice';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { IconSymbol } from "../../components/ui/IconSymbol";
import UserHeader from '../../components/UserHeader';
import { Colors } from '../../constants/Colors';
import '../../i18n';

export default function HomeScreen() {
  const colors = Colors.light;
  const { t } = useTranslation();
  const [isRecording, setIsRecording] = useState(false);
  const [recognizedText, setRecognizedText] = useState('');
  const [liveText, setLiveText] = useState('');
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const outerCircleAnim = useRef(new Animated.Value(1)).current;
  const middleCircleAnim = useRef(new Animated.Value(1)).current;
  const headerOpacity = useRef(new Animated.Value(1)).current;
  const titleOpacity = useRef(new Animated.Value(1)).current;
  const introOpacity = useRef(new Animated.Value(1)).current;
  const stopButtonOpacity = useRef(new Animated.Value(0)).current;
  const stopButtonTranslateY = useRef(new Animated.Value(100)).current;
  const microphonePosition = useRef(new Animated.Value(0)).current; // 0 = position initiale, 1 = centre
  const { i18n } = useTranslation();

  useEffect(() => {
    try {
      Voice.onSpeechStart = onSpeechStart;
      Voice.onSpeechEnd = onSpeechEnd;
      Voice.onSpeechResults = onSpeechResults;
      Voice.onSpeechError = onSpeechError;
    } catch (error) {
      console.error('Erreur lors de l\'initialisation de Voice:', error);
    }

    return () => {
      try {
        Voice.destroy().then(Voice.removeAllListeners);
      } catch (error) {
        console.error('Erreur lors de la destruction de Voice:', error);
      }
    };
  }, []);

  const onSpeechStart = () => {
    setIsRecording(true);
    startPulseAnimation();
    moveMicrophoneToCenter();
    hideContent();
    showStopButton();
    // Masquer la tabbar
    if ((global as any).setTabBarVisibility) {
      (global as any).setTabBarVisibility(false);
    }
  };

  const onSpeechEnd = () => {
    setIsRecording(false);
    stopPulseAnimation();
    moveMicrophoneBack();
    showContent();
    hideStopButton();
    setLiveText(''); // Réinitialiser le texte en temps réel
    // Afficher la tabbar
    if ((global as any).setTabBarVisibility) {
      (global as any).setTabBarVisibility(true);
    }
  };

  const onSpeechResults = (event: any) => {
    if (event.value && event.value.length > 0) {
      const newText = event.value[0];
      setRecognizedText(newText);
      setLiveText(newText);
    }
  };

  const onSpeechError = (error: any) => {
    setIsRecording(false);
    stopPulseAnimation();
  };

  const moveMicrophoneToCenter = () => {
    Animated.timing(microphonePosition, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    });
  };

  const moveMicrophoneBack = () => {
    Animated.timing(microphonePosition, {
      toValue: 0,
      duration: 500,
      useNativeDriver: true,
    });
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

  const showStopButton = () => {
    Animated.parallel([
      Animated.timing(stopButtonOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(stopButtonTranslateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const hideStopButton = () => {
    Animated.parallel([
      Animated.timing(stopButtonOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(stopButtonTranslateY, {
        toValue: 100,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const getLastWords = (text: string, count: number = 20) => {
    const words = text.trim().split(/\s+/);
    if (words.length <= count) {
      return text;
    }
    return words.slice(-count).join(' ');
  };

  const renderLiveText = (text: string) => {
    const words = text.trim().split(/\s+/);
    const maxWords = 20;

    if (words.length <= maxWords) {
      return (
        <Text style={styles.liveText}>
          {text}
        </Text>
      );
    }

    // Diviser en lignes avec disparition plus lente
    const lines: React.ReactNode[] = [];
    const wordsPerLine = 8; // Plus de mots par ligne
    const maxVisibleLines = 4; // Plus de lignes visibles

    // Prendre seulement les dernières lignes
    const allLines = [];
    for (let i = 0; i < words.length; i += wordsPerLine) {
      allLines.push(words.slice(i, i + wordsPerLine).join(' '));
    }

    const lastLines = allLines.slice(-maxVisibleLines);

    lastLines.forEach((line, index) => {
      const opacity = 0.3 + (index * 0.25); // Premier (ancien) = 0.3, dernier (nouveau) = 1

      lines.push(
        <Animated.Text
          key={index}
          style={[
            styles.liveText,
            {
              opacity: opacity,
              fontSize: 18 - (maxVisibleLines - 1 - index) * 1,
            }
          ]}
        >
          {line}
        </Animated.Text>
      );
    });

    return lines;
  };

  const startPulseAnimation = () => {
    // Animation du micro principal
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Animation du cercle externe - grossit puis rétrécit
    Animated.loop(
      Animated.sequence([
        Animated.timing(outerCircleAnim, {
          toValue: 1.8,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(outerCircleAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Animation du cercle moyen - grossit puis rétrécit
    Animated.loop(
      Animated.sequence([
        Animated.timing(middleCircleAnim, {
          toValue: 1.8,
          duration: 1600,
          useNativeDriver: true,
        }),
        Animated.timing(middleCircleAnim, {
          toValue: 1,
          duration: 1600,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const stopPulseAnimation = () => {
    pulseAnim.stopAnimation();
    outerCircleAnim.stopAnimation();
    middleCircleAnim.stopAnimation();
    pulseAnim.setValue(1);
    outerCircleAnim.setValue(1);
    middleCircleAnim.setValue(1);
  };

  const startRecording = async () => {
    try {
      // Vérifier si Voice est disponible
      const isAvailable = await Voice.isAvailable();
      if (!isAvailable) {
        // Fallback pour le développement
        setIsRecording(true);
        startPulseAnimation();
        moveMicrophoneToCenter();
        hideContent();
        showStopButton();
        // Masquer la tabbar
        if ((global as any).setTabBarVisibility) {
          (global as any).setTabBarVisibility(false);
        }
        // Simuler un texte reconnu après 3 secondes
        setTimeout(() => {
          const demoText = i18n.language === 'fr' ? "poulet, riz, tomates, oignons" : "chicken, rice, tomatoes, onions";
          setRecognizedText(demoText);
          setLiveText(demoText);
          setIsRecording(false);
        }, 3000);
        return;
      }

      // Utiliser la langue détectée par i18n pour la reconnaissance vocale
      const voiceLanguage = i18n.language === 'fr' ? 'fr-FR' : 'en-US';
      await Voice.start(voiceLanguage);
    } catch (error) {
      console.error('Erreur lors du démarrage de l\'enregistrement:', error);
      // Fallback en cas d'erreur
      setIsRecording(true);
      startPulseAnimation();
      moveMicrophoneToCenter();
      hideContent();
      showStopButton();
      // Masquer la tabbar
      if ((global as any).setTabBarVisibility) {
        (global as any).setTabBarVisibility(false);
      }
      setTimeout(() => {
        const demoText = i18n.language === 'fr' ? "poulet, riz, tomates, oignons" : "chicken, rice, tomatoes, onions";
        setRecognizedText(demoText);
        setLiveText(demoText);
        setIsRecording(false);
      }, 3000);
    }
  };

  const stopRecording = async () => {
    try {
      await Voice.stop();
      moveMicrophoneBack();
      showContent();
      hideStopButton();
      setLiveText(''); // Réinitialiser le texte en temps réel
      // Afficher la tabbar
      if ((global as any).setTabBarVisibility) {
        (global as any).setTabBarVisibility(true);
      }
    } catch (error) {
      console.error('Erreur lors de l\'arrêt de l\'enregistrement:', error);
      moveMicrophoneBack();
      showContent();
      hideStopButton();
      setLiveText(''); // Réinitialiser le texte en temps réel
      // Afficher la tabbar
      if ((global as any).setTabBarVisibility) {
        (global as any).setTabBarVisibility(true);
      }
    }
  };

  const handleNotificationPress = () => {
    console.log('Notifications pressed');
  };

  const handleProfilePress = () => {
    console.log('Profile pressed');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Texte en temps réel pendant l'enregistrement */}
      {isRecording && liveText && (
        <Animated.View
          style={[
            styles.liveTextContainer,
            {
              opacity: headerOpacity.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 0],
              }),
            }
          ]}
        >
          {renderLiveText(liveText)}
        </Animated.View>
      )}

      <Animated.View style={styles.contentContainer}>
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

          {/* Interface vocale unifiée */}
          <View style={styles.voiceInterfaceContainer}>
            {/* Le micro unique qui se transforme avec ses cercles */}
            <View style={styles.microphoneWithCircles}>
              {/* Cercles d'animation qui apparaissent seulement pendant l'enregistrement */}
              {isRecording && (
                <>
                  <Animated.View
                    style={[
                      styles.outerCircle,
                      {
                        transform: [{ scale: outerCircleAnim }],
                        borderColor: "grey",
                        opacity: outerCircleAnim.interpolate({
                          inputRange: [1, 1.4, 1.8],
                          outputRange: [0.6, 0.3, 0],
                        })
                      }
                    ]}
                  />
                  <Animated.View
                    style={[
                      styles.middleCircle,
                      {
                        transform: [{ scale: middleCircleAnim }],
                        borderColor: "grey",
                        opacity: middleCircleAnim.interpolate({
                          inputRange: [1, 1.25, 1.5],
                          outputRange: [0.7, 0.4, 0.1],
                        })
                      }
                    ]}
                  />
                </>
              )}

              {/* Le micro unique qui se transforme */}
              <Animated.View
                style={[
                  styles.microphoneButton,
                  {
                    transform: [
                      {
                        translateY: microphonePosition.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, 10], // Se déplace vers le haut
                        })
                      },
                      {
                        scale: microphonePosition.interpolate({
                          inputRange: [0, 1],
                          outputRange: [1, 1.5], // Grossit
                        })
                      },
                      { scale: pulseAnim } // Animation de pulsation
                    ]
                  }
                ]}
              >
                <TouchableOpacity
                  style={[styles.microphoneInner, { backgroundColor: isRecording ? "#DB5244" : colors.button }]}
                  onPress={isRecording ? stopRecording : startRecording}
                >
                  <IconSymbol
                    name={"mic"}
                    size={isRecording ? 40 : 30}
                    color={colors.background}
                  />
                </TouchableOpacity>
              </Animated.View>
            </View>

            {/* Texte qui change selon l'état */}
            <Animated.Text
              style={[
                styles.voiceText,
                {
                  // marginTop: 10,
                  transform: [{
                    translateY: microphonePosition.interpolate({
                      inputRange: [0, 1],
                      outputRange: [10, 60],
                    })
                  }],
                  color: colors.button,
                }
              ]}
            >
              {isRecording ? t('home.voice.recording') : t('home.voice.start')}
            </Animated.Text>
          </View>

          {/* Espace en bas pour la barre de navigation */}
          <View style={styles.bottomSpacer} />
        </ScrollView>
      </Animated.View>

      {/* Bouton d'arrêt qui apparaît en bas */}
      <Animated.View
        style={[
          styles.stopButtonContainer,
          {
            opacity: stopButtonOpacity,
            transform: [{ translateY: stopButtonTranslateY }],
          }
        ]}
      >
        <TouchableOpacity
          style={styles.stopButton}
          onPress={stopRecording}
        >
          <IconSymbol name="xmark" size={24} color="white" />
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
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
  categoriesContainer: {
    paddingHorizontal: 16,
    marginBottom: 24,
    // width: '100%',
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    // justifyContent: 'space-between',
    gap: 5,
  },
  trendingSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  recipesList: {
    paddingHorizontal: 20,
  },
  bottomSpacer: {
    height: 100, // Espace pour la barre de navigation
  },
  voiceContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  voiceText: {
    paddingHorizontal: 20,
    fontSize: 20,
    textAlign: 'center',
  },
  recognizedText: {
    fontSize: 18,
    marginTop: 10,
    textAlign: 'center',
  },
  microphoneButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  microphoneInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  introContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  introText: {
    fontSize: 18,
    lineHeight: 24,
  },
  microphoneContainer: {
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 40, // Ajouter de l'espace au-dessus du micro
  },
  animationContainer: {
    position: 'relative',
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  microphoneWrapper: {
    // Supprimer position absolute qui cause des problèmes
  },
  outerCircle: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: 'transparent',
    top: -5,
    left: -15,
  },
  middleCircle: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: 'transparent',
    top: 5,
    left: -5,
  },
  voiceInterfaceContainer: {
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 60, // Ajouter de l'espace au-dessus du micro
    position: 'relative', // Pour le positionnement absolu des cercles
  },
  microphoneWithCircles: {
    position: 'relative',
    width: 90, // Taille du micro qui grossit
    height: 90,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stopButtonContainer: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  stopButton: {
    backgroundColor: Colors.light.button,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  liveTextContainer: {
    position: 'absolute',
    top: 100, // Plus bas que le haut
    left: 0,
    right: 0,
    paddingVertical: 10,
    paddingHorizontal: 20,
    zIndex: 1,
    alignItems: 'center',
  },
  liveText: {
    color: Colors.light.button, // Utiliser la couleur du texte de l'app
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 2, // Espace entre les lignes
  },
});
