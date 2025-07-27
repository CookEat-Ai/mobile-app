import Voice from '@react-native-voice/voice';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Animated,
  Dimensions,
  StyleSheet,
  TouchableOpacity,
  View
} from 'react-native';
import { Colors } from '../constants/Colors';
import { IconSymbol } from "./ui/IconSymbol";

const { width, height } = Dimensions.get('window');

interface MicroProps {
  onTextReceived?: (text: string) => void;
  onRecordingStateChange?: (isRecording: boolean) => void;
  onLiveTextChange?: (text: string) => void;
  onClick?: () => void;
}

let timeout: any = null;
export default function Micro({
  onTextReceived,
  onRecordingStateChange,
  onLiveTextChange,
  onClick
}: MicroProps) {
  const colors = Colors.light;
  const { i18n } = useTranslation();

  const [isRecording, setIsRecording] = useState(false);
  const [isRecordingAnimationDelayFinished, setIsRecordingAnimationDelayFinished] = useState(false);

  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const outerCircleAnim = useRef(new Animated.Value(1)).current;
  const middleCircleAnim = useRef(new Animated.Value(1)).current;
  const microphonePosition = useRef(new Animated.Value(0)).current;

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
    onRecordingStateChange?.(true);

    timeout = setTimeout(() => {
      setIsRecordingAnimationDelayFinished(true);
    }, 1000);

    startPulseAnimation();
    moveMicrophoneToCenter();

    // Masquer la tabbar
    if ((global as any).setTabBarVisibility) {
      (global as any).setTabBarVisibility(false);
    }
  };

  const onSpeechEnd = () => {
    setIsRecording(false);
    onRecordingStateChange?.(false);
    setIsRecordingAnimationDelayFinished(false);
    stopPulseAnimation();
    moveMicrophoneBack();

    // Afficher la tabbar
    if ((global as any).setTabBarVisibility) {
      (global as any).setTabBarVisibility(true);
    }
  };

  const onSpeechResults = (event: any) => {
    if (event.value && event.value.length > 0) {
      const newText = event.value[0];
      onTextReceived?.(newText);
      onLiveTextChange?.(newText);
    }
  };

  const onSpeechError = (error: any) => {
    setIsRecording(false);
    onRecordingStateChange?.(false);
    stopPulseAnimation();
  };

  const moveMicrophoneToCenter = () => {
    Animated.timing(microphonePosition, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  };

  const moveMicrophoneBack = () => {
    Animated.timing(microphonePosition, {
      toValue: 0,
      duration: 500,
      useNativeDriver: true,
    }).start();
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
        return;
      }
      await Voice.start(i18n.language === 'fr' ? 'fr-FR' : 'en-US');
    } catch (error) {
      console.error('Erreur lors du démarrage de l\'enregistrement:', error);
      // Fallback en cas d'erreur
      setIsRecording(false);
      onRecordingStateChange?.(false);
      setIsRecordingAnimationDelayFinished(false);
      moveMicrophoneBack();
      // Afficher la tabbar
      if ((global as any).setTabBarVisibility) {
        (global as any).setTabBarVisibility(true);
      }
    }
  };

  const stopRecording = async () => {
    try {
      await Voice.stop();
      setIsRecording(false);
      onRecordingStateChange?.(false);
      if (timeout) {
        clearTimeout(timeout);
      }
      setIsRecordingAnimationDelayFinished(false);
      moveMicrophoneBack();
      // Afficher la tabbar
      if ((global as any).setTabBarVisibility) {
        (global as any).setTabBarVisibility(true);
      }
    } catch (error) {
      console.error('Erreur lors de l\'arrêt de l\'enregistrement:', error);
      if (timeout) {
        clearTimeout(timeout);
      }
      setIsRecordingAnimationDelayFinished(false);
      moveMicrophoneBack();
      // Afficher la tabbar
      if ((global as any).setTabBarVisibility) {
        (global as any).setTabBarVisibility(true);
      }
    }
  };

  return (
    <>
      {/* Interface vocale */}
      <View style={styles.voiceInterfaceContainer}>
        {/* Le micro unique qui se transforme avec ses cercles */}
        <View style={styles.microphoneWithCircles}>
          {/* Cercles d'animation qui apparaissent seulement pendant l'enregistrement */}
          {isRecordingAnimationDelayFinished && (
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
              onPress={() => {
                onClick?.();
                if (isRecording)
                  stopRecording();
                else
                  startRecording();
              }}
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
          {isRecording ? 'Donner nous la liste de vos ingrédients, on vous écoute... 👂🏼' : 'Appuyez pour commencer'}
        </Animated.Text>
      </View>

      {/* Bouton d'arrêt qui apparaît en bas */}
      <Animated.View
        style={[
          styles.stopButtonContainer,
          {
            opacity: isRecording ? 1 : 0,
            transform: [{ translateY: isRecording ? 0 : 100 }],
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
    </>
  );
}

const styles = StyleSheet.create({
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

  voiceText: {
    paddingHorizontal: 20,
    fontSize: 20,
    textAlign: 'center',
  },
}); 