import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Colors } from '../../constants/Colors';
import analytics from '../../services/analytics';

const { width, height } = Dimensions.get('window');

const RatingBadge = ({ style }: { style?: any }) => {
  return (
    <Animated.View style={[styles.ratingBadgeContainer, style]}>
      <View style={styles.ratingBadgeContent}>
        <View style={styles.laurelContainer}>
          <Ionicons name="leaf" size={32} color="#F3D0B0" style={{ transform: [{ scaleX: -1 }, { rotate: '-30deg' }] }} />
        </View>
        <View style={styles.ratingBadgeCenter}>
          <Text style={styles.ratingBadgeScore}>5.0</Text>
          <View style={styles.ratingBadgeStars}>
            {[1, 2, 3, 4, 5].map(s => (
              <Ionicons key={s} name="star" size={16} color="#FEB50A" />
            ))}
          </View>
        </View>
        <View style={styles.laurelContainer}>
          <Ionicons name="leaf" size={32} color="#F3D0B0" style={{ transform: [{ rotate: '30deg' }] }} />
        </View>
      </View>
    </Animated.View>
  );
};

export default function ReviewRequestScreen() {
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();
  const [isButtonDisabled, setIsButtonDisabled] = useState(false);
  const mascotOpacity = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;

  const count = i18n.language.startsWith('fr') ? '10 000' : '10,000';
  const fullText = t('onboarding.socialProof.title', { count });
  const parts = fullText.split(new RegExp(`(${count})`));

  const reviews = [
    { id: 1, name: 'Marie L.', rating: 5, text: t('onboarding.socialProof.review1') },
    { id: 2, name: 'Thomas D.', rating: 5, text: t('onboarding.socialProof.review2') },
  ];

  useEffect(() => {
    analytics.track('onboarding_review_request_viewed');

    // Animations initiales
    Animated.parallel([
      Animated.timing(mascotOpacity, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 800,
        delay: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleContinue = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    analytics.track('onboarding_review_request_continue');
    router.replace('/onboarding/promoCode');
  };

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top, paddingBottom: Platform.OS === 'ios' ? 0 : insets.bottom + 30 }]}>
      <View style={styles.content}>
        <View style={styles.mascotContainer}>
          <Animated.View style={{ opacity: mascotOpacity, transform: [{ rotate: '20deg' }] }}>
            <Image
              source={require('../../assets/images/mascot.png')}
              contentFit="contain"
              style={styles.mascot}
            />
          </Animated.View>
          <RatingBadge style={styles.ratingBadge} />
        </View>

        <Animated.ScrollView 
          style={[styles.scrollArea, { opacity: contentOpacity }]}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.specialStepContainer}>
            <View style={styles.topBadge}>
              <Text style={styles.topBadgeText}>{t('onboarding.socialProof.topBadge')}</Text>
            </View>

            <Text style={styles.title}>
              {parts.map((part, index) => (
                <Text key={index} style={part === count ? styles.highlight : null}>
                  {part}
                </Text>
              ))}
              <Text> 🎉</Text>
            </Text>

            <View style={styles.ratingSection}>
              <Text
                style={styles.ratingPrompt}
                numberOfLines={2}
                adjustsFontSizeToFit={true}
                minimumFontScale={0.7}
              >
                {t('onboarding.socialProof.subtitle')}
              </Text>
              <View style={styles.starsContainer}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <View key={star}>
                    <Ionicons
                      name="star"
                      size={32}
                      color="#FEB50A"
                    />
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.reviewsContainer}>
              {reviews.map(review => (
                <View key={review.id} style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <Text style={styles.reviewName}>{review.name}</Text>
                    <View style={styles.stars}>
                      {[1, 2, 3, 4, 5].map(s => (
                        <Ionicons key={s} name="star" size={14} color="#FEB50A" />
                      ))}
                    </View>
                  </View>
                  <Text style={styles.reviewText}>{review.text}</Text>
                </View>
              ))}
            </View>
          </View>
        </Animated.ScrollView>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[
              styles.continueButton,
              isButtonDisabled && styles.continueButtonDisabled
            ]}
            onPress={handleContinue}
            disabled={isButtonDisabled}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>
              {t('onboarding.socialProof.button')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FDF9E2",
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },
  mascotContainer: {
    height: width * 0.3,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  mascot: {
    width: width * 0.22,
    height: width * 0.22,
  },
  ratingBadge: {
    position: 'absolute',
    bottom: -10,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
    paddingTop: 20,
  },
  specialStepContainer: {
    alignItems: 'center',
    width: '100%',
  },
  topBadge: {
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: '#FEB50A',
    marginBottom: 16,
  },
  topBadgeText: {
    color: '#FEB50A',
    fontSize: 14,
    fontFamily: 'Degular'
  },
  title: {
    textAlign: 'center',
    fontSize: width * 0.08,
    fontFamily: 'Degular',
    color: Colors.light.text,
    lineHeight: width * 0.1,
  },
  highlight: {
    color: Colors.light.button,
  },
  ratingSection: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 24,
    width: '100%',
    alignItems: 'center',
    marginVertical: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  ratingPrompt: {
    fontSize: 18,
    color: Colors.light.text,
    textAlign: 'center',
    marginBottom: 12,
    fontFamily: 'Degular',
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  reviewsContainer: {
    width: '100%',
    gap: 12,
  },
  reviewCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewName: {
    fontSize: 16,
    color: Colors.light.text,
    fontFamily: 'Degular'
  },
  stars: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewText: {
    fontFamily: 'CronosPro',
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  buttonContainer: {
    marginTop: 10,
  },
  continueButton: {
    backgroundColor: Colors.light.button,
    paddingVertical: 18,
    borderRadius: 100,
    width: '100%',
    alignItems: 'center',
    shadowColor: Colors.light.button,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  continueButtonDisabled: {
    backgroundColor: Colors.light.border,
    opacity: 0.6,
  },
  buttonText: {
    color: 'white',
    fontSize: 19,
    fontFamily: 'Degular',
  },
  ratingBadgeContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingBadgeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ratingBadgeCenter: {
    alignItems: 'center',
  },
  ratingBadgeScore: {
    fontSize: 32,
    color: '#333',
    lineHeight: 36,
    fontFamily: 'Degular'
  },
  ratingBadgeStars: {
    flexDirection: 'row',
    gap: 4,
    marginTop: -4,
  },
  laurelContainer: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
