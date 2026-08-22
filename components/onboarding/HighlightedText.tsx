import React from 'react';
import { StyleProp, Text, TextStyle } from 'react-native';
import { Colors } from '../../constants/Colors';

/**
 * Met en avant les valeurs chiffrées d'une phrase (68 %, 26 €, 2,2 kg, 10 000).
 *
 * L'onboarding existant a la même logique dans `formQuestion` (`renderQuestionText`),
 * mais restreinte aux formats des interstitiels écrits en dur. Les écrans
 * personnalisés interpolent des nombres formatés par la locale (espace insécable
 * comme séparateur de milliers en français), d'où une regex plus large ici.
 */
const NUMBER_PATTERN = /(\d[\d  \s.,]*\s?(?:%|€|kg|h|min)?)/g;

export function HighlightedText({
  text,
  style,
  highlightStyle,
}: {
  text: string;
  style?: StyleProp<TextStyle>;
  highlightStyle?: StyleProp<TextStyle>;
}) {
  if (!text) return null;

  const parts = text.split(NUMBER_PATTERN).filter((part) => part !== '');

  return (
    <Text style={style}>
      {parts.map((part, i) =>
        /\d/.test(part) ? (
          <Text key={i} style={[{ color: Colors.light.button }, highlightStyle]}>
            {part}
          </Text>
        ) : (
          <Text key={i}>{part}</Text>
        )
      )}
    </Text>
  );
}
