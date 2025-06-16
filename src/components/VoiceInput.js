import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

const VoiceInput = ({ onResult, onListeningChange, isAnswerTime = true, isAudioPlaying = false }) => {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const recognitionRef = useRef(null);
    const lastToggleTime = useRef(0);

    useEffect(() => {
        // Initialize speech recognition
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = false;
            recognitionRef.current.interimResults = false;

            recognitionRef.current.onresult = (event) => {
                const result = event.results[0][0].transcript;
                setTranscript(result);
                onResult(result);
            };

            recognitionRef.current.onend = () => {
                setIsListening(false);
                onListeningChange(false);
            };

            recognitionRef.current.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                setIsListening(false);
                onListeningChange(false);
            };
        }

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
        };
    }, [onResult, onListeningChange]);

    const toggleListening = () => {
        // Prevent rapid toggling
        const now = Date.now();
        if (now - lastToggleTime.current < 1000) return;
        lastToggleTime.current = now;

        if (!isAnswerTime || isAudioPlaying) return;

        if (!isListening && recognitionRef.current) {
            try {
                // Set states before starting recognition
                setIsListening(true);
                onListeningChange(true);
                setTranscript('');

                // Small delay to ensure states are updated
                setTimeout(() => {
                    try {
                        recognitionRef.current.start();
                    } catch (error) {
                        console.error('Error starting recognition:', error);
                        setIsListening(false);
                        onListeningChange(false);
                    }
                }, 100);
            } catch (error) {
                console.error('Error in toggle listening:', error);
                setIsListening(false);
                onListeningChange(false);
            }
        } else if (recognitionRef.current) {
            try {
                recognitionRef.current.stop();
            } catch (error) {
                console.error('Error stopping recognition:', error);
            }
        }
    };

    return (
        <div className="flex flex-col items-center">
            <motion.button
                onClick={toggleListening}
                className={`w-24 h-24 rounded-full flex items-center justify-center shadow-lg
                    ${isListening ? 'bg-red-500' : isAnswerTime && !isAudioPlaying ? 'bg-blue-500' : 'bg-gray-400'} 
                    transition-transform ${!isAnswerTime || isAudioPlaying ? 'cursor-not-allowed' : 'hover:scale-105'}`}
                whileTap={{ scale: isAnswerTime && !isAudioPlaying ? 0.95 : 1 }}
                disabled={!isAnswerTime || isAudioPlaying}
            >
                <div className="text-white text-4xl">
                    {isListening ? '⏹' : '🎤'}
                </div>
            </motion.button>
            {transcript && (
                <div className="mt-4 text-lg text-center max-w-md">
                    {transcript}
                </div>
            )}
        </div>
    );
};

export default VoiceInput; 