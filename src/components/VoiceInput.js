import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

const VoiceInput = ({ onTranscriptComplete, isListening, onListeningChange }) => {
    const [transcript, setTranscript] = useState('');
    const transcriptRef = useRef('');
    const [recognition, setRecognition] = useState(null);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (SpeechRecognition) {
                const recognition = new SpeechRecognition();
                recognition.continuous = true;
                recognition.interimResults = true;
                recognition.lang = 'en-US';

                recognition.onresult = (event) => {
                    const current = event.resultIndex;
                    const transcript = event.results[current][0].transcript;
                    setTranscript(transcript);
                    transcriptRef.current = transcript;
                };

                recognition.onend = () => {
                    if (isListening) {
                        recognition.start();
                    } else {
                        onTranscriptComplete(transcriptRef.current);
                    }
                };

                setRecognition(recognition);
            }
        }
    }, []);

    const toggleListening = () => {
        if (!recognition) return;

        if (isListening) {
            recognition.stop();
            onListeningChange(false);
        } else {
            setTranscript('');
            recognition.start();
            onListeningChange(true);
        }
    };

    return (
        <div className="flex flex-col items-center gap-4">
            <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={toggleListening}
                className={`w-16 h-16 rounded-full flex items-center justify-center
                    ${isListening
                        ? 'bg-green-500 hover:bg-green-600'
                        : 'bg-red-500 hover:bg-red-600'
                    } text-white shadow-lg transition-colors`}
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-8 w-8"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                    />
                </svg>
            </motion.button>

            {isListening && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-gray-600 text-center"
                >
                    <p className="font-medium">Listening...</p>
                    <p className="text-sm mt-1">{transcript || 'Speak now...'}</p>
                </motion.div>
            )}
        </div>
    );
};

export default VoiceInput; 