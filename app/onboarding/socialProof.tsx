import { Ionicons } from "@expo/vector-icons";
import { router } from 'expo-router';
import React from 'react';
import {
  Dimensions,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { IconSymbol } from '../../components/ui/IconSymbol';

const { width, height } = Dimensions.get('window');

// Données des témoignages
const testimonials = [
  {
    id: '1',
    text: "CookEat AI a révolutionné ma façon de cuisiner. Plus jamais je ne me demande quoi faire à manger !",
    author: "Marie, 28 ans"
  },
  {
    id: '2',
    text: "Enfin une app qui me propose des recettes avec ce que j'ai dans mon frigo. Génial !",
    author: "Thomas, 35 ans"
  },
  {
    id: '3',
    text: "Mes enfants adorent les recettes proposées. L'IA est vraiment intelligente !",
    author: "Sophie, 42 ans"
  }
];

export default function SocialProofScreen() {
  const handleContinue = async () => {
    try {
      // // Rediriger vers l'app principale
      // router.replace('/(tabs)');
    } catch (error) {
      console.error('❌ Erreur lors de la sauvegarde:', error);
    }
  };

  const handleBackPress = () => {
    router.back();
  };

  const renderTestimonial = ({ item }: { item: any }) => (
    <View style={styles.testimonialItem}>
      <View style={styles.testimonialIcon}>
        <Text style={styles.iconText}>💬</Text>
      </View>
      <Text style={styles.testimonialText}>
        &quot;{item.text}&quot;
      </Text>
      <Text style={styles.testimonialAuthor}>- {item.author}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header avec bouton retour */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBackPress}
        >
          <Ionicons name="arrow-back" size={24} color="#2D5A27" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>
          CookEat AI
        </Text>
      </View>

      <View style={styles.content}>
        {/* Section illustration */}
        <View style={styles.illustrationSection}>
          <View style={styles.illustrationContainer}>
            {/* Étoile jaune */}
            <View style={styles.yellowStar}>
              <Text style={styles.starText}>⭐</Text>
            </View>

            {/* Personnage principal (utilisateur satisfait) */}
            <View style={styles.userCharacter}>
              <Text style={styles.userEmoji}>😊</Text>
            </View>

            {/* Graphique de satisfaction */}
            <View style={styles.satisfactionGraph}>
              <View style={styles.graphLine}>
                <View style={styles.graphDot} />
                <View style={styles.graphDot} />
                <View style={styles.graphDot} />
              </View>
            </View>
          </View>
        </View>

        {/* Titre principal */}
        <View style={styles.titleSection}>
          <Text style={styles.mainTitle}>
            Rejoignez des milliers d&apos;utilisateurs satisfaits !
          </Text>
        </View>

        {/* Carrousel des témoignages */}
        <View style={styles.testimonialsSection}>
          <FlatList
            data={testimonials}
            renderItem={renderTestimonial}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.testimonialsList}
            style={{
              visibility: 'visible',
            }}
            snapToInterval={width - 48} // Largeur de l'écran moins le padding
            decelerationRate="fast"
            pagingEnabled={false}
          />
        </View>

        {/* Section preuve sociale */}
        <View style={styles.socialProofSection}>
          <View style={styles.awardContainer}>
            <Text style={styles.awardText}>🏆 Prix de l&apos;Innovation Culinaire</Text>
            <Text style={styles.awardSubtext}>2024 Meilleure IA de Cuisine</Text>
          </View>

          <View style={styles.ratingContainer}>
            <View style={styles.starsContainer}>
              <Text style={styles.star}>⭐</Text>
              <Text style={styles.star}>⭐</Text>
              <Text style={styles.star}>⭐</Text>
              <Text style={styles.star}>⭐</Text>
              <Text style={styles.star}>⭐</Text>
            </View>
            <Text style={styles.reviewsText}>10K+ AVIS</Text>
          </View>
        </View>

        {/* Section boutons */}
        <View style={styles.buttonSection}>
          <TouchableOpacity style={styles.restoreButton}>
            <Ionicons name="refresh" size={16} color="#687076" />
            <Text style={styles.restoreText}>Restaurer les achats</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.mainButton} onPress={handleContinue}>
            <Text style={styles.mainButtonText}>Commencer mes 7 jours gratuits</Text>
            <IconSymbol
              name="arrow.right"
              size={20}
              color="white"
            />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#F1F2F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: 'Degular',
    color: '#2D5A27',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  illustrationSection: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  illustrationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 20,
  },
  yellowStar: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  starText: {
    fontSize: 40,
  },
  userCharacter: {
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FEB50A',
    borderRadius: 40,
  },
  userEmoji: {
    fontSize: 50,
  },
  satisfactionGraph: {
    width: 60,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  graphLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  graphDot: {
    width: 8,
    height: 8,
    backgroundColor: '#2D5A27',
    borderRadius: 4,
  },
  titleSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  mainTitle: {
    fontSize: width * 0.05,
    fontFamily: 'Degular',
    color: '#2D5A27',
    textAlign: 'center',
    lineHeight: 28,
    fontWeight: 'bold',
  },
  testimonialsSection: {
    visibility: 'visible',
    marginBottom: 20,
  },
  testimonialsList: {
    paddingHorizontal: 24,
    visibility: 'visible',
  },
  testimonialItem: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    marginTop: 10,
    marginBottom: 10,
    padding: 16,
    marginRight: 16,
    width: width * 0.8, // Largeur de l'écran moins le padding
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  testimonialIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FEB50A',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconText: {
    fontSize: 16,
  },
  testimonialText: {
    fontSize: 14,
    fontFamily: 'Cronos Pro',
    color: '#2D5A27',
    lineHeight: 20,
    marginBottom: 6,
  },
  testimonialAuthor: {
    fontSize: 12,
    fontFamily: 'Degular',
    color: '#687076',
    fontWeight: '600',
  },
  socialProofSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  awardContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  awardText: {
    fontSize: 16,
    fontFamily: 'Degular',
    color: '#2D5A27',
    fontWeight: 'bold',
    marginBottom: 2,
  },
  awardSubtext: {
    fontSize: 12,
    fontFamily: 'Cronos Pro',
    color: '#687076',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 4,
  },
  star: {
    fontSize: 20,
  },
  reviewsText: {
    fontSize: 14,
    fontFamily: 'Degular',
    color: '#2D5A27',
    fontWeight: 'bold',
  },
  buttonSection: {
    paddingBottom: 20,
  },
  restoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    gap: 8,
  },
  restoreText: {
    fontSize: 14,
    fontFamily: 'Cronos Pro',
    color: '#687076',
  },
  mainButton: {
    backgroundColor: '#2D5A27',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 24,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  mainButtonText: {
    fontSize: 18,
    fontFamily: 'Degular',
    color: 'white',
    fontWeight: 'bold',
    marginRight: 8,
  },
});