import React from 'react';
import {
  Animated,
  Dimensions,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Colors } from '../constants/Colors';

const { width } = Dimensions.get('window');

interface RecordDisplayProps {
  liveText: string;
  isRecording: boolean;
}

export default function RecordDisplay({ liveText, isRecording }: RecordDisplayProps) {
  if (!isRecording && !liveText) {
    return null;
  }

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

  return (
    <View style={styles.liveTextContainer}>
      {renderLiveText(liveText || "Écoutez...")}
    </View>
  );
}

const styles = StyleSheet.create({
  liveTextContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  liveText: {
    color: Colors.light.button, // Utiliser la couleur du texte de l'app
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 2, // Espace entre les lignes
  },
}); 