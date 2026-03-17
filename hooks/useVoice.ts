import { useEffect, useState, useRef } from 'react';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import { useTranslation } from 'react-i18next';

interface UseVoiceOptions {
  onTextReceived?: (text: string) => void;
  onRecordingStateChange?: (isRecording: boolean) => void;
  onLiveTextChange?: (text: string) => void;
}

export const forceStopVoiceGlobally = async () => {
  try {
    ExpoSpeechRecognitionModule.abort();
  } catch (error) {
    console.error('Erreur lors de l\'arrêt global de Voice:', error);
  }
};

export const cleanupVoiceGlobally = async () => {
  await forceStopVoiceGlobally();
};

export const resetVoiceCompletely = async () => {
  await forceStopVoiceGlobally();
};

export const useVoice = (options: UseVoiceOptions = {}) => {
  const { i18n } = useTranslation();
  const [isRecording, setIsRecording] = useState(false);
  const [liveText, setLiveText] = useState('');
  const recordingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useSpeechRecognitionEvent('start', () => {
    setIsRecording(true);
    optionsRef.current.onRecordingStateChange?.(true);

    if (recordingTimeoutRef.current) {
      clearTimeout(recordingTimeoutRef.current);
    }
    recordingTimeoutRef.current = setTimeout(() => {
      ExpoSpeechRecognitionModule.stop();
    }, 40000);
  });

  useSpeechRecognitionEvent('end', () => {
    setIsRecording(false);
    optionsRef.current.onRecordingStateChange?.(false);
    if (recordingTimeoutRef.current) {
      clearTimeout(recordingTimeoutRef.current);
      recordingTimeoutRef.current = null;
    }
  });

  useSpeechRecognitionEvent('result', (event) => {
    const transcript = event.results[0]?.transcript;
    if (transcript) {
      setLiveText(transcript);
      optionsRef.current.onTextReceived?.(transcript);
      optionsRef.current.onLiveTextChange?.(transcript);
    }
  });

  useSpeechRecognitionEvent('error', (event) => {
    console.error('Erreur de reconnaissance vocale:', event.error, event.message);
    setIsRecording(false);
    optionsRef.current.onRecordingStateChange?.(false);
    if (recordingTimeoutRef.current) {
      clearTimeout(recordingTimeoutRef.current);
      recordingTimeoutRef.current = null;
    }
  });

  useEffect(() => {
    return () => {
      if (recordingTimeoutRef.current) {
        clearTimeout(recordingTimeoutRef.current);
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      ExpoSpeechRecognitionModule.start({
        lang: i18n.language === 'fr' ? 'fr-FR' : 'en-US',
        interimResults: true,
        continuous: false,
      });
    } catch (error) {
      console.error('Erreur lors du démarrage de l\'enregistrement:', error);
      setIsRecording(false);
      optionsRef.current.onRecordingStateChange?.(false);
    }
  };

  const stopRecording = async () => {
    try {
      if (recordingTimeoutRef.current) {
        clearTimeout(recordingTimeoutRef.current);
        recordingTimeoutRef.current = null;
      }
      ExpoSpeechRecognitionModule.stop();
    } catch (error) {
      console.error('Erreur lors de l\'arrêt de l\'enregistrement:', error);
      setIsRecording(false);
      optionsRef.current.onRecordingStateChange?.(false);
    }
  };

  const forceStopRecording = async () => {
    try {
      if (recordingTimeoutRef.current) {
        clearTimeout(recordingTimeoutRef.current);
        recordingTimeoutRef.current = null;
      }
      ExpoSpeechRecognitionModule.abort();
      setIsRecording(false);
      setLiveText('');
      optionsRef.current.onRecordingStateChange?.(false);
    } catch (error) {
      console.error('Erreur lors de l\'arrêt forcé:', error);
      setIsRecording(false);
      optionsRef.current.onRecordingStateChange?.(false);
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
