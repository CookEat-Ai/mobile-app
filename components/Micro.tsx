import React, { useEffect, useRef, useState } from 'react';
import I18n from '../i18n';
import {
  Animated,
  Dimensions,
  StyleProp,
  StyleSheet,
  ViewStyle,
  TouchableOpacity,
  View,
  Alert,
  Linking,
  Platform,
  PermissionsAndroid
} from 'react-native';
import { Colors } from '../constants/Colors';
import { IconSymbol } from "./ui/IconSymbol";
import { useVoice, resetVoiceCompletely } from '../hooks/useVoice';
import Voice from '@react-native-voice/voice';
import { Audio } from 'expo-av';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as Haptics from 'expo-haptics';


const { height } = Dimensions.get('window');

interface MicroProps {
  style?: StyleProp<ViewStyle>;
  onTextReceived?: (text: string) => void;
  onRecordingStateChange?: (isRecording: boolean) => void;
  onLiveTextChange?: (text: string) => void;
  onClick?: () => void;
  hideStatusText?: boolean;
}

let timeout: any = null;
export default function Micro({
  style,
  onTextReceived,
  onRecordingStateChange,
  onLiveTextChange,
  onClick,
  hideStatusText = false
}: MicroProps) {
  const colors = Colors.light;


  const [isRecordingAnimationDelayFinished, setIsRecordingAnimationDelayFinished] = useState(false);

  // Utiliser le hook useVoice
  const { isRecording, startRecording, stopRecording } = useVoice({
    onTextReceived,
    onRecordingStateChange,
    onLiveTextChange
  });

  // Calculer la hauteur de base approximative basée sur les styles
  // marginTop: 60 + marginBottom: 20 + micro: 90 + texte: ~60 = ~230
  const baseHeight = hideStatusText ? 90 : height * 0.145;

  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const outerCircleAnim = useRef(new Animated.Value(1)).current;
  const middleCircleAnim = useRef(new Animated.Value(1)).current;
  const microphonePosition = useRef(new Animated.Value(0)).current;
  const containerHeight = useRef(new Animated.Value(0)).current;

  // Effet pour gérer les changements d'état d'enregistrement
  useEffect(() => {
    if (isRecording) {
      timeout = setTimeout(() => {
        setIsRecordingAnimationDelayFinished(true);
      }, 1000);

      startPulseAnimation();
      moveMicrophoneToCenter();
      expandContainer();

      // Masquer la tabbar
      if ((global as any).setTabBarVisibility) {
        (global as any).setTabBarVisibility(false);
      }
    } else {
      setIsRecordingAnimationDelayFinished(false);
      stopPulseAnimation();
      moveMicrophoneBack();
      shrinkContainer();

      // Afficher la tabbar
      if ((global as any).setTabBarVisibility) {
        (global as any).setTabBarVisibility(true);
      }
    }
  }, [isRecording]);

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

  const expandContainer = () => {
    Animated.timing(containerHeight, {
      toValue: 1,
      duration: 500,
      useNativeDriver: false,
    }).start();
  };

  const shrinkContainer = () => {
    Animated.timing(containerHeight, {
      toValue: 0,
      duration: 500,
      useNativeDriver: false,
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

  // Vérifier les permissions microphone et reconnaissance vocale
  const checkVoicePermissions = async (): Promise<boolean> => {
    try {
      if (Platform.OS === 'android') {
        // Pour Android, vérifier la permission RECORD_AUDIO
        const granted = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);

        if (granted) {
          console.log('Permission microphone déjà accordée');
          return true;
        }

        const result = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: I18n.t('micro.permissionTitle'),
            message: I18n.t('micro.permissionMessage'),
            buttonNeutral: I18n.t('micro.later'),
            buttonNegative: I18n.t('micro.cancel'),
            buttonPositive: I18n.t('micro.allow'),
          }
        );

        if (result !== PermissionsAndroid.RESULTS.GRANTED) {
          showPermissionAlert('microphone');
          return false;
        }

        return true;
      } else {
        // Pour iOS, vérifier explicitement les permissions
        try {
          // 1. Vérifier la permission microphone avec expo-av
          const { status: microphoneStatus } = await Audio.getPermissionsAsync();
          console.log('Statut permission microphone:', microphoneStatus);

          if (microphoneStatus !== 'granted') {
            const { status: newMicrophoneStatus } = await Audio.requestPermissionsAsync();
            console.log('Nouveau statut permission microphone:', newMicrophoneStatus);

            if (newMicrophoneStatus !== 'granted') {
              showPermissionAlert('microphone');
              return false;
            }
          }

          // 2. Vérifier la reconnaissance vocale avec Voice
          const isVoiceAvailable = await Voice.isAvailable();
          console.log('Voice disponible (reconnaissance vocale):', isVoiceAvailable);

          if (!isVoiceAvailable) {
            showPermissionAlert('speech');
            return false;
          }

          console.log('✅ Permissions microphone et reconnaissance vocale OK');
          return true;
        } catch (error: any) {
          console.log('❌ Erreur lors de la vérification des permissions iOS:', error);
          showPermissionAlert('both');
          return false;
        }
      }
    } catch (error) {
      console.error('Erreur lors de la vérification des permissions:', error);
      showPermissionAlert('both');
      return false;
    }
  };

  // Afficher une alerte pour guider l'utilisateur vers les paramètres
  const showPermissionAlert = (permissionType: 'microphone' | 'speech' | 'both') => {
    let title = 'Permissions requises';
    let message = '';

    if (Platform.OS === 'ios') {
      switch (permissionType) {
        case 'microphone':
          title = I18n.t('home.voice.errorTitle');
          message = I18n.t('home.voice.errorDescriptionMicrophone');
          break;
        case 'speech':
          title = I18n.t('home.voice.errorTitle');
          message = I18n.t('home.voice.errorDescriptionSpeech');
          break;
        case 'both':
        default:
          message = I18n.t('home.voice.errorDescriptionBoth');
          break;
      }
    } else {
      title = I18n.t('micro.requiredTitle');
      message = I18n.t('micro.requiredMessage');
    }

    Alert.alert(
      title,
      message,
      [
        {
          text: I18n.t('home.voice.errorButtonCancel'),
          style: 'cancel'
        },
        {
          text: I18n.t('home.voice.errorButtonSettings'),
          onPress: () => Linking.openSettings(),
          style: 'default'
        }
      ]
    );
  };

  // Fonctions wrapper pour gérer les animations et la tabbar
  const handleStartRecording = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      // Vérifier les permissions avant de commencer
      const hasPermissions = await checkVoicePermissions();
      if (!hasPermissions) {
        console.log('Permissions insuffisantes pour démarrer l\'enregistrement');
        return;
      }

      // Réinitialiser Voice avant de commencer
      await resetVoiceCompletely();
      await startRecording();
    } catch (error) {
      console.error('Erreur lors du démarrage de l\'enregistrement:', error);
    }
  };

  const handleStopRecording = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await stopRecording();
      if (timeout) {
        clearTimeout(timeout);
      }
    } catch (error) {
      console.error('Erreur lors de l\'arrêt de l\'enregistrement:', error);
      if (timeout) {
        clearTimeout(timeout);
      }
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        style,
        {
          height: containerHeight.interpolate({
            inputRange: [0, 1],
            outputRange: [baseHeight, height],
          }),
          // marginBottom: containerHeight.interpolate({
          //   inputRange: [0, 1],
          //   outputRange: [0, 20],
          // }),
        }
      ]}
    >
      {/* Interface vocale */}
      <Animated.View
        style={[
          styles.voiceInterfaceContainer,
          {
            transform: [{
              translateY: containerHeight.interpolate({
                inputRange: [0, 1],
                outputRange: [0, height * 0.2], // Centre le contenu quand l'écran s'étend
              })
            }]
          }
        ]}
      >
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
                  handleStopRecording();
                else
                  handleStartRecording();
              }}
            >
              <FontAwesome name="microphone" size={24} color={colors.background} />
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* Texte qui change selon l'état */}
        {!hideStatusText && (
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
                color: colors.textSecondary,
              }
            ]}
          >
            {isRecording ? I18n.t('home.voice.recording') : I18n.t('home.voice.start')}
          </Animated.Text>
        )}
      </Animated.View>

      {/* Bouton d'arrêt qui apparaît en bas */}
      {/* <Animated.View
        style={[
          styles.stopButtonContainer,
          {
            opacity: isRecording ? 1 : 0,
            transform: [{
              translateY: containerHeight.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 100], // Apparaît depuis le bas
              })
            }],
          }
        ]}
      >
        <TouchableOpacity
          style={styles.stopButton}
          onPress={stopRecording}
        >
          <IconSymbol name="xmark" size={24} color="white" />
        </TouchableOpacity>
      </Animated.View> */}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    width: '100%',
  },
  voiceInterfaceContainer: {
    alignItems: 'center',
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
    borderColor: '#e3e3e3',
    top: 5,
    left: -5,
  },
  outerCircle: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: '#e3e3e3',
    top: -5,
    left: -15,
  },
  stopButtonContainer: {
    position: 'absolute',
    bottom: 50,
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
    fontFamily: 'Cronos Pro',
  },
}); 