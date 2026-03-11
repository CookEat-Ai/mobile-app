import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  Dimensions,
  Platform,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
  TouchableOpacity,
  Text,
  Animated,
  Easing,
  PanResponder,
  GestureResponderEvent,
  StatusBar,
  Alert
} from 'react-native';
import { Image } from 'expo-image';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import { useVideoPlayer, VideoView } from 'expo-video';
import Svg, { Circle } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconSymbol } from '../components/ui/IconSymbol';
import { router, useLocalSearchParams, useGlobalSearchParams } from 'expo-router';
import { Colors } from '../constants/Colors';
import * as Haptics from 'expo-haptics';
import apiService from '../services/api';
import I18n from '../i18n';

const { width } = Dimensions.get('window');
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const MAX_PHOTOS = 30;
const MAX_VIDEO_DURATION = 40; // seconds

export default function CameraScreen() {
  const insets = useSafeAreaInsets();
  const params = useGlobalSearchParams();
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [mode, setMode] = useState<'photo' | 'video'>('photo');

  useEffect(() => {
    if (params.initialMode) {
      setMode(params.initialMode as 'photo' | 'video');
    }
  }, []);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedVideoUri, setRecordedVideoUri] = useState<string | null>(null);
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [zoom, setZoom] = useState(0);
  const [focusPulsePoint, setFocusPulsePoint] = useState<{ x: number; y: number } | null>(null);
  const zoomRef = useRef(0);
  const isRecordingRef = useRef(false);
  const cameraRef = useRef<CameraView>(null);
  const focusPulseScale = useRef(new Animated.Value(0.7)).current;
  const focusPulseOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);


  const player = useVideoPlayer(recordedVideoUri || null);

  useEffect(() => {
    if (recordedVideoUri && player) {
      player.replace(recordedVideoUri);
      player.loop = true;
      player.play();
    }
  }, [player, recordedVideoUri]);

  // Animation states
  const [loadingTextIndex, setLoadingTextIndex] = useState(0);
  const loadingTextIndexRef = useRef(0);
  const loadingProgress = useRef(new Animated.Value(0)).current;
  const videoProgress = useRef(new Animated.Value(0)).current;
  const loadingTextOpacity = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const flashOpacity = useRef(new Animated.Value(0)).current;
  const shutterScale = useRef(new Animated.Value(1)).current;

  // Circle progress calculation
  const circleSize = 75; // Inner size (85 - 2*5 border)
  const strokeWidth = 3;
  const radius = (circleSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Zoom logic
  const zoomBase = useRef(0);
  const pinchStartDistance = useRef<number | null>(null);
  const recordingStartPos = useRef<{ x: number, y: number } | null>(null);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (evt) => {
        const { touches } = evt.nativeEvent;
        return touches.length === 2; // On ne capture que les 2 doigts au départ
      },
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        const { touches } = evt.nativeEvent;
        // On capture le mouvement si :
        // 1. Il y a 2 doigts (pinch)
        // 2. On enregistre ET qu'on glisse verticalement (slide zoom)
        return touches.length === 2 || (isRecordingRef.current && Math.abs(gestureState.dy) > 5);
      },
      onPanResponderGrant: (evt) => {
        const { touches } = evt.nativeEvent;
        if (touches.length === 2) {
          pinchStartDistance.current = Math.hypot(
            touches[0].pageX - touches[1].pageX,
            touches[0].pageY - touches[1].pageY
          );
          zoomBase.current = zoomRef.current;
        } else if (isRecordingRef.current) {
          zoomBase.current = zoomRef.current;
        }
      },
      onPanResponderMove: (evt, gestureState) => {
        const { touches } = evt.nativeEvent;

        // 1. Pinch to zoom (prioritaire)
        if (touches.length === 2) {
          const distance = Math.hypot(
            touches[0].pageX - touches[1].pageX,
            touches[0].pageY - touches[1].pageY
          );

          if (pinchStartDistance.current) {
            const delta = (distance - pinchStartDistance.current) / 1000;
            const newZoom = Math.max(0, Math.min(1, zoomBase.current + delta));
            setZoom(newZoom);
          }
        }
        // 2. Slide up from recording button to zoom
        else if (isRecordingRef.current) {
          // On utilise dy (négatif vers le haut)
          const deltaY = -gestureState.dy;
          const deltaZoom = deltaY / 1000;
          const newZoom = Math.max(0, Math.min(1, zoomBase.current + deltaZoom));
          setZoom(newZoom);
        }
      },
      onPanResponderRelease: () => {
        pinchStartDistance.current = null;
        recordingStartPos.current = null;
      },
    })
  ).current;

  const loadingMessages = useMemo(() => {
    return mode === 'photo'
      ? I18n.t('camera.loadingMessagesPhoto')
      : I18n.t('camera.loadingMessagesVideo');
  }, [mode]);

  useEffect(() => {
    if (!permission) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  const showOnboarding = useCallback(async () => {
    if (mode === 'video') {
      Alert.alert(
        I18n.t('camera.onboarding.video.title'),
        I18n.t('camera.onboarding.video.message'),
        [{ text: I18n.t('camera.onboarding.video.button'), onPress: () => AsyncStorage.setItem('hasSeenCameraOnboarding_video', 'true') }]
      );
    } else {
      Alert.alert(
        I18n.t('camera.onboarding.photo.title'),
        I18n.t('camera.onboarding.photo.message'),
        [{ text: I18n.t('camera.onboarding.photo.button'), onPress: () => AsyncStorage.setItem('hasSeenCameraOnboarding_photo', 'true') }]
      );
    }
  }, [mode]);

  useEffect(() => {
    const checkOnboarding = async () => {
      const hasSeenOnboarding = await AsyncStorage.getItem(`hasSeenCameraOnboarding_${mode}`);
      if (!hasSeenOnboarding) {
        showOnboarding();
      }
    };

    if (permission?.granted) {
      checkOnboarding();
    }
  }, [mode, permission?.granted, showOnboarding]);

  useEffect(() => {
    if (isLoading) {
      // Animation de la barre de progression sur 15 secondes
      Animated.timing(loadingProgress, {
        toValue: 1,
        duration: 15000,
        easing: Easing.linear,
        useNativeDriver: false,
      }).start();

      // Animation de pulsation pour la mascotte
      Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.15,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Cycle des messages
      const messageInterval = setInterval(() => {
        if (loadingTextIndexRef.current < loadingMessages.length - 1) {
          loadingTextIndexRef.current += 1;
          const nextIndex = loadingTextIndexRef.current;

          Animated.timing(loadingTextOpacity, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }).start(() => {
            setLoadingTextIndex(nextIndex);
            Animated.timing(loadingTextOpacity, {
              toValue: 1,
              duration: 400,
              useNativeDriver: true,
            }).start();
          });
        }
      }, 3000);

      return () => clearInterval(messageInterval);
    }
  }, [isLoading, loadingMessages.length, loadingProgress, loadingTextOpacity, scaleAnim]);

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionContainer}>
          <Text style={styles.message}>{I18n.t('camera.permissionMessage')}</Text>
          <TouchableOpacity onPress={requestPermission} style={styles.permissionButton}>
            <Text style={styles.permissionButtonText}>{I18n.t('camera.grantPermission')}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>{I18n.t('camera.back')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const takePicture = async () => {
    if (isCapturing || capturedImages.length >= MAX_PHOTOS) {
      if (capturedImages.length >= MAX_PHOTOS) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      return;
    }

    if (cameraRef.current) {
      setIsCapturing(true);
      // Shutter effect and button animation
      Animated.parallel([
        Animated.sequence([
          Animated.timing(flashOpacity, {
            toValue: 1,
            duration: 50,
            useNativeDriver: true,
          }),
          Animated.timing(flashOpacity, {
            toValue: 0,
            duration: 150,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(shutterScale, {
            toValue: 0.9,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(shutterScale, {
            toValue: 1,
            duration: 100,
            useNativeDriver: true,
          }),
        ]),
      ]).start();

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.7,
          base64: false,
          exif: false,
        });

        if (photo) {
          setCapturedImages(prev => [...prev, photo.uri]);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      } catch (error) {
        console.error('Failed to take picture:', error);
      } finally {
        setIsCapturing(false);
      }
    }
  };

  const handleVideoCapture = async () => {
    if (isRecording) {
      cameraRef.current?.stopRecording();
      setIsRecording(false);
      videoProgress.stopAnimation();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else {
      if (cameraRef.current) {
        try {
          setIsRecording(true);
          videoProgress.setValue(0);

          // Animation du cercle de progression sur MAX_VIDEO_DURATION secondes
          Animated.timing(videoProgress, {
            toValue: 1,
            duration: MAX_VIDEO_DURATION * 1000,
            easing: Easing.linear,
            useNativeDriver: false,
          }).start(({ finished }) => {
            if (finished) {
              setIsRecording(false);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            }
          });

          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          const video = await cameraRef.current.recordAsync({
            maxDuration: MAX_VIDEO_DURATION,
          });
          if (video) {
            setRecordedVideoUri(video.uri);
            setIsRecording(false);
            videoProgress.stopAnimation();
          }
        } catch (error) {
          console.error('Failed to record video:', error);
          setIsRecording(false);
          videoProgress.stopAnimation();
        }
      }
    }
  };

  const handleClose = () => {
    if (recordedVideoUri) {
      setRecordedVideoUri(null);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      return;
    }
    if (capturedImages.length > 0) {
      setCapturedImages([]);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      return;
    }
    router.back();
  };

  const handleTapToFocus = (event: GestureResponderEvent) => {
    if (recordedVideoUri || isLoading || isRecording || isCapturing) return;
    if (focusPulsePoint) return;

    const { locationX, locationY } = event.nativeEvent;

    setFocusPulsePoint({ x: locationX, y: locationY });
    focusPulseScale.setValue(0.6);
    focusPulseOpacity.setValue(0.85);
    Animated.parallel([
      Animated.spring(focusPulseScale, {
        toValue: 1,
        friction: 6,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.timing(focusPulseOpacity, {
        toValue: 0,
        duration: 500,
        delay: 200,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(() => {
      setFocusPulsePoint(null);
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
  };

  const finishCapture = async () => {
    if (mode === 'photo' && capturedImages.length === 0) return;
    if (mode === 'video' && !recordedVideoUri) return;

    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      let response;

      if (mode === 'photo') {
        // Compression et redimensionnement des images avant l'envoi
        const compressedImages = await Promise.all(
          capturedImages.map(async (uri) => {
            const result = await ImageManipulator.manipulateAsync(
              uri,
              [{ resize: { width: 1200 } }],
              { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
            );
            return result.uri;
          })
        );
        response = await apiService.processImageIngredients(compressedImages);
      } else {
        // Pour la vidéo, on envoie le fichier vidéo (la compression se fait idéalement côté backend ou via frame sampling)
        // Ici on envoie la vidéo telle quelle pour l'instant
        response = await apiService.processVideoIngredients(recordedVideoUri!);
      }

      if (response.data?.ingredients) {
        const ingredientsString = JSON.stringify(response.data.ingredients);

        loadingTextIndexRef.current = loadingMessages.length - 1;
        setLoadingTextIndex(loadingMessages.length - 1);

        // Accélérer la barre de chargement jusqu'à 100%
        Animated.timing(loadingProgress, {
          toValue: 1,
          duration: 800,
          easing: Easing.out(Easing.quad),
          useNativeDriver: false,
        }).start(() => {
          setTimeout(async () => {
            if (params.mode === 'append') {
              // Depuis la modale d'ajout : on revient à l'écran existant et on lui passe les ingrédients via AsyncStorage
              await AsyncStorage.setItem('cookeat_camera_ingredients_append', ingredientsString);
              router.back();
            } else {
              router.replace({
                pathname: '/ingredient-list',
                params: {
                  ingredients: ingredientsString,
                  isOnboarding: params.isOnboarding as string,
                  mode: params.mode as string
                }
              });
            }
          }, 500);
        });
      } else {
        throw new Error(response.error || 'Erreur lors de l\'extraction');
      }
    } catch (error) {
      console.error('Erreur extraction ingrédients:', error);
      Alert.alert(
        I18n.t('camera.errorTitle'),
        I18n.t('camera.errorDescription'),
        [{ text: I18n.t('common.ok'), onPress: () => setIsLoading(false) }]
      );
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.loadingContent}>
          <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <Image
              source={require('../assets/images/mascot.png')}
              contentFit="contain"
              style={styles.loadingMascot}
            />
          </Animated.View>

          <View style={styles.loadingTextWrapper}>
            <Animated.Text style={[styles.loadingText, { opacity: loadingTextOpacity }]}>
              {loadingMessages[loadingTextIndex]}
            </Animated.Text>
          </View>

          <View style={styles.loadingBarTrack}>
            <Animated.View
              style={[
                styles.loadingBarFill,
                {
                  width: loadingProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          </View>
        </View>
      </View>
    );
  }

  const lastImage = capturedImages.length > 0 ? capturedImages[capturedImages.length - 1] : null;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <CameraView
        style={styles.camera}
        facing={facing}
        ref={cameraRef}
        mode={mode === 'photo' ? 'picture' : 'video'}
        zoom={zoom}
      />
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: 'white', opacity: flashOpacity, zIndex: 100 }
        ]}
        pointerEvents="none"
      />
      {recordedVideoUri && (
        <View style={styles.videoPreviewContainer}>
          <VideoView
            player={player}
            style={styles.videoPreview}
            contentFit="cover"
          />
        </View>
      )}

      <View style={styles.overlay} {...panResponder.panHandlers} onTouchEnd={handleTapToFocus}>
        {focusPulsePoint && (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.focusPulse,
              {
                left: focusPulsePoint.x - 20,
                top: focusPulsePoint.y - 20,
                opacity: focusPulseOpacity,
                transform: [{ scale: focusPulseScale }],
              },
            ]}
          />
        )}
        <View style={styles.topBar}>
          {!isRecording && (
            <>
              <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
                <IconSymbol name="close" size={30} color="white" />
              </TouchableOpacity>

              <View style={styles.headerLogo}>
                <Image
                  source={require('../assets/images/mascot.png')}
                  style={styles.headerMascot}
                  contentFit="contain"
                />
                <Text style={styles.headerText}>CookEat Ai</Text>
              </View>

              <TouchableOpacity style={styles.helpButton} onPress={showOnboarding}>
                <IconSymbol name="help" size={30} color="white" />
              </TouchableOpacity>
            </>
          )}
        </View>

        <View style={[styles.bottomSection, { paddingBottom: Math.max(insets.bottom, 25) + 25 }]}>
          {/* {!isRecording && capturedImages.length === 0 && !recordedVideoUri && (
            <View style={styles.modeSwitcher}>
              <TouchableOpacity
                style={[styles.modeButton, mode === 'photo' && styles.modeButtonActive]}
                onPress={() => {
                  setMode('photo');
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <Text style={[styles.modeText, mode === 'photo' && styles.modeTextActive]}>{I18n.t('camera.modes.photo')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeButton, mode === 'video' && styles.modeButtonActive]}
                onPress={() => {
                  setMode('video');
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <Text style={[styles.modeText, mode === 'video' && styles.modeTextActive]}>{I18n.t('camera.modes.video')}</Text>
              </TouchableOpacity>
            </View>
          )} */}

          <View style={styles.bottomBar}>
            <View style={styles.sideButtonContainer}>
            </View>

            <View style={styles.captureContainer}>
              {!recordedVideoUri && (
                <Animated.View
                  style={{ transform: [{ scale: shutterScale }] }}
                >
                  <TouchableOpacity
                    style={[
                      styles.captureButton,
                      mode === 'video' && isRecording && styles.captureButtonRecording,
                      (isCapturing || (mode === 'photo' && capturedImages.length >= MAX_PHOTOS)) && styles.captureButtonDisabled
                    ]}
                    onPress={mode === 'photo' ? takePicture : handleVideoCapture}
                    activeOpacity={(isCapturing || (mode === 'photo' && capturedImages.length >= MAX_PHOTOS)) ? 1 : 0.7}
                    disabled={isCapturing}
                  >
                    {mode === 'video' && isRecording && (
                      <View style={StyleSheet.absoluteFill}>
                        <Svg width={circleSize} height={circleSize} style={{ transform: [{ rotate: '-90deg' }] }}>
                          <AnimatedCircle
                            cx={circleSize / 2}
                            cy={circleSize / 2}
                            r={radius}
                            stroke="#FF3B30"
                            strokeWidth={strokeWidth}
                            fill="transparent"
                            strokeDasharray={circumference}
                            strokeDashoffset={videoProgress.interpolate({
                              inputRange: [0, 1],
                              outputRange: [circumference, 0],
                            })}
                            strokeLinecap="round"
                          />
                        </Svg>
                      </View>
                    )}
                    <View style={[
                      styles.captureButtonInner,
                      mode === 'video' && styles.captureButtonInnerVideo,
                      mode === 'video' && isRecording && styles.captureButtonInnerRecording
                    ]}>
                      {mode === 'photo' && capturedImages.length > 0 && capturedImages.length < MAX_PHOTOS && (
                        <IconSymbol name="plus" size={40} color={Colors.light.button} weight="bold" />
                      )}
                      {mode === 'photo' && capturedImages.length >= MAX_PHOTOS && (
                        <IconSymbol name="checkmark" size={40} color={Colors.light.button} weight="bold" />
                      )}
                    </View>
                  </TouchableOpacity>
                </Animated.View>
              )}
              {mode === 'photo' && capturedImages.length >= MAX_PHOTOS && (
                <Text style={styles.limitText}>{I18n.t('camera.maxPhotosReached')}</Text>
              )}
            </View>

            <View style={styles.sideButtonContainer}>
              {mode === 'photo' && lastImage && (
                <TouchableOpacity
                  style={styles.thumbnailWrapper}
                  activeOpacity={0.8}
                >
                  <View style={styles.thumbnailImageContainer}>
                    <Image source={{ uri: lastImage }} style={styles.thumbnail} />
                  </View>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{capturedImages.length}</Text>
                  </View>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {((mode === 'photo' && capturedImages.length > 0) || (mode === 'video' && recordedVideoUri)) && (
            <TouchableOpacity style={styles.finishButton} onPress={finishCapture}>
              <Text style={styles.finishButtonText}>{I18n.t('camera.finishButton')}</Text>
              <IconSymbol name="chevron-forward" size={20} color="white" weight="bold" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  topBar: {
    paddingTop: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  closeButton: {
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  helpButton: {
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  headerLogo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerMascot: {
    width: 52,
    height: 52,
    marginRight: 2,
    transform: [{ rotate: '20deg' }],
  },
  headerText: {
    color: 'white',
    fontSize: 22,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    fontFamily: 'Degular'
  },
  bottomSection: {
    gap: 20,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 30,
  },
  sideButtonContainer: {
    width: 60,
    alignItems: 'center',
  },
  captureContainer: {
    alignItems: 'center',
  },
  captureButton: {
    width: 85,
    height: 85,
    borderRadius: 42.5,
    borderWidth: 5,
    borderColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonInner: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonDisabled: {
    borderColor: 'rgba(255,255,255,0.5)',
  },
  limitText: {
    color: 'white',
    fontSize: 12,
    fontFamily: 'CronosProBold',
    marginTop: 8,
  },
  thumbnailWrapper: {
    width: 55,
    height: 55,
    position: 'relative',
  },
  thumbnailImageContainer: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'white',
    overflow: 'hidden',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: Colors.light.button,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
    zIndex: 10,
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  finishButton: {
    backgroundColor: Colors.light.button,
    marginHorizontal: 40,
    height: 56,
    borderRadius: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  finishButtonText: {
    color: 'white',
    fontSize: 20,
    fontFamily: 'CronosProBold',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  message: {
    textAlign: 'center',
    paddingBottom: 20,
    color: 'white',
    fontSize: 18,
    fontFamily: 'CronosPro',
  },
  permissionButton: {
    backgroundColor: Colors.light.button,
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 30,
    marginBottom: 20,
  },
  permissionButtonText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'CronosProBold',
  },
  backButton: {
    padding: 10,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'CronosPro',
  },
  // Mode Switcher
  modeSwitcher: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
    marginBottom: 10,
  },
  modeButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  modeButtonActive: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  modeText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  modeTextActive: {
    color: 'white',
  },
  // Video Preview
  videoPreviewContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'black',
  },
  videoPreview: {
    flex: 1,
  },
  // Enhanced Capture Button
  captureButtonRecording: {
    borderColor: 'rgba(255,0,0,0.5)',
  },
  captureButtonInnerVideo: {
    backgroundColor: 'white',
  },
  captureButtonInnerRecording: {
    backgroundColor: '#FF3B30',
    width: 34,
    height: 34,
    borderRadius: 6,
  },
  // Loading Styles
  loadingContainer: {
    backgroundColor: "#FDF9E2",
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loadingContent: {
    width: '100%',
    alignItems: 'center',
    gap: 32,
  },
  loadingMascot: {
    width: width * 0.5,
    height: width * 0.5,
    transform: [{ rotate: '20deg' }],
  },
  loadingTextWrapper: {
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontFamily: 'Degular',
    fontSize: width * 0.06,
    color: Colors.light.text,
    textAlign: 'center',
    lineHeight: width * 0.07,
  },
  loadingBarTrack: {
    width: '100%',
    height: 10,
    backgroundColor: '#F1EACB',
    borderRadius: 5,
    overflow: 'hidden',
  },
  loadingBarFill: {
    height: '100%',
    backgroundColor: Colors.light.button,
    borderRadius: 5,
  },
  focusPulse: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    backgroundColor: 'rgba(255,255,255,0.12)',
    zIndex: 120,
  },
});
