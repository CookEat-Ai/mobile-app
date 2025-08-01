import { useEffect, useState, useRef } from 'react';
import Voice from '@react-native-voice/voice';
import { useTranslation } from 'react-i18next';

interface UseVoiceOptions {
  onTextReceived?: (text: string) => void;
  onRecordingStateChange?: (isRecording: boolean) => void;
  onLiveTextChange?: (text: string) => void;
}

// Variable globale pour suivre l'état d'enregistrement
let globalIsRecording = false;
let voiceInstance: any = null;

// Fonction pour créer une nouvelle instance de Voice
const createVoiceInstance = () => {
  try {
    // Détruire l'ancienne instance si elle existe
    if (voiceInstance) {
      Voice.destroy().then(() => {
        Voice.removeAllListeners();
      }).catch(() => {
        Voice.removeAllListeners();
      });
    }

    // Créer une nouvelle instance
    voiceInstance = Voice;
    return true;
  } catch (error) {
    console.error('Erreur lors de la création de l\'instance Voice:', error);
    return false;
  }
};

// Fonction globale pour forcer l'arrêt de Voice
export const forceStopVoiceGlobally = async () => {
  try {
    if (globalIsRecording) {
      await Voice.stop();
      globalIsRecording = false;
      console.log('Voice arrêté globalement');
    }
  } catch (error) {
    console.error('Erreur lors de l\'arrêt global de Voice:', error);
    globalIsRecording = false;
  }
};

// Fonction pour nettoyer Voice complètement
export const cleanupVoiceGlobally = async () => {
  try {
    await forceStopVoiceGlobally();
    await Voice.destroy();
    Voice.removeAllListeners();
    voiceInstance = null;
    console.log('Voice nettoyé globalement');
  } catch (error) {
    console.error('Erreur lors du nettoyage global de Voice:', error);
    voiceInstance = null;
  }
};

// Fonction pour réinitialiser complètement Voice
export const resetVoiceCompletely = async () => {
  try {
    // Arrêter l'enregistrement en cours
    await forceStopVoiceGlobally();

    // Détruire complètement Voice
    await Voice.destroy();
    Voice.removeAllListeners();

    // Réinitialiser les variables globales
    globalIsRecording = false;
    voiceInstance = null;

    // Attendre un peu pour s'assurer que tout est nettoyé
    await new Promise(resolve => setTimeout(resolve, 300));

    console.log('Voice complètement réinitialisé');
  } catch (error) {
    console.error('Erreur lors de la réinitialisation de Voice:', error);
    globalIsRecording = false;
    voiceInstance = null;
  }
};

export const useVoice = (options: UseVoiceOptions = {}) => {
  const { i18n } = useTranslation();
  const [isRecording, setIsRecording] = useState(false);
  const [liveText, setLiveText] = useState('');
  const isInitialized = useRef(false);

  // Initialiser Voice une seule fois globalement
  useEffect(() => {
    if (isInitialized.current) return;

    try {
      // Créer une nouvelle instance de Voice
      if (!createVoiceInstance()) {
        return;
      }

      Voice.onSpeechStart = onSpeechStart;
      Voice.onSpeechEnd = onSpeechEnd;
      Voice.onSpeechResults = onSpeechResults;
      Voice.onSpeechError = onSpeechError;
      isInitialized.current = true;
    } catch (error) {
      console.error('Erreur lors de l\'initialisation de Voice:', error);
    }

    return () => {
      // Ne pas détruire Voice ici, car il peut être utilisé par d'autres composants
    };
  }, []);

  // Nettoyer quand le composant se démonte
  useEffect(() => {
    return () => {
      try {
        // S'assurer que l'enregistrement est arrêté pour ce composant
        if (isRecording) {
          forceStopRecording();
        }
      } catch (error) {
        console.error('Erreur lors du nettoyage de Voice:', error);
      }
    };
  }, [isRecording]);

  const onSpeechStart = () => {
    globalIsRecording = true;
    setIsRecording(true);
    options.onRecordingStateChange?.(true);
  };

  const onSpeechEnd = () => {
    globalIsRecording = false;
    setIsRecording(false);
    options.onRecordingStateChange?.(false);
  };

  const onSpeechResults = (event: any) => {
    if (event.value && event.value.length > 0) {
      const newText = event.value[0];
      setLiveText(newText);
      options.onTextReceived?.(newText);
      options.onLiveTextChange?.(newText);
    }
  };

  const onSpeechError = (error: any) => {
    console.error('Erreur de reconnaissance vocale:', error);
    globalIsRecording = false;
    setIsRecording(false);
    options.onRecordingStateChange?.(false);
  };

  const forceStopRecording = async () => {
    try {
      await Voice.stop();
      globalIsRecording = false;
      setIsRecording(false);
      options.onRecordingStateChange?.(false);
    } catch (error) {
      console.error('Erreur lors de l\'arrêt forcé de l\'enregistrement:', error);
      globalIsRecording = false;
      setIsRecording(false);
      options.onRecordingStateChange?.(false);
    }
  };

  const startRecording = async () => {
    try {
      // Vérifier si un enregistrement est déjà en cours globalement
      if (globalIsRecording) {
        console.log('Un enregistrement est déjà en cours globalement');
        // Forcer l'arrêt de l'enregistrement précédent
        await forceStopRecording();
        // Attendre un peu avant de redémarrer
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      // Recréer l'instance Voice pour éviter les conflits
      if (!createVoiceInstance()) {
        console.error('Impossible de créer une instance Voice');
        return;
      }

      // Réinitialiser les listeners
      Voice.onSpeechStart = onSpeechStart;
      Voice.onSpeechEnd = onSpeechEnd;
      Voice.onSpeechResults = onSpeechResults;
      Voice.onSpeechError = onSpeechError;

      const isAvailable = await Voice.isAvailable();
      if (!isAvailable) {
        console.error('La reconnaissance vocale n\'est pas disponible');
        return;
      }

      await Voice.start(i18n.language === 'fr' ? 'fr-FR' : 'en-US');
    } catch (error) {
      console.error('Erreur lors du démarrage de l\'enregistrement:', error);
      globalIsRecording = false;
      setIsRecording(false);
      options.onRecordingStateChange?.(false);
    }
  };

  const stopRecording = async () => {
    try {
      await Voice.stop();
      globalIsRecording = false;
      setIsRecording(false);
      options.onRecordingStateChange?.(false);
    } catch (error) {
      console.error('Erreur lors de l\'arrêt de l\'enregistrement:', error);
      // Forcer la mise à jour de l'état même en cas d'erreur
      globalIsRecording = false;
      setIsRecording(false);
      options.onRecordingStateChange?.(false);
    }
  };

  const clearLiveText = () => {
    setLiveText('');
  };

  return {
    isRecording,
    liveText,
    startRecording,
    stopRecording,
    clearLiveText,
    forceStopRecording,
  };
}; 