import React, { useState, useRef } from 'react';
import { useDrop } from 'react-dnd';
import { motion, AnimatePresence } from 'framer-motion';
import Token from './Token';
import VoiceInput from './VoiceInput';

const CHARACTERS = [
    { id: 'emma', name: 'Princess Emma', emoji: '👸' },
    { id: 'olivia', name: 'Olivia', emoji: '🧒' },
    { id: 'liam', name: 'Liam', emoji: '👦' },
];

const SUBJECTS = [
    { id: 'math', name: 'Math', emoji: '🔢' },
    { id: 'language', name: 'Language', emoji: '📚' },
    { id: 'music', name: 'Music', emoji: '🎵' },
];

// TODO: Replace with your actual Lambda endpoint
const LAMBDA_ENDPOINT = 'https://i960nau5j0.execute-api.us-east-1.amazonaws.com/generate';

const DropZone = ({ type, onDrop, children, label }) => {
    const [{ isOver }, drop] = useDrop(() => ({
        accept: type,
        drop: (item) => onDrop(item),
        collect: (monitor) => ({
            isOver: !!monitor.isOver(),
        }),
    }));

    return (
        <div className="flex flex-col items-center">
            <div
                ref={drop}
                className={`w-32 h-32 rounded-full border-4 border-dashed flex items-center justify-center
        ${isOver ? 'border-sky-400 bg-sky-50 shadow-[0_0_20px_rgba(56,189,248,0.5)]' : 'border-gray-300 bg-white'}
        transition-all duration-200 shadow-lg`}
            >
                {children}
            </div>
            <span className="mt-2 text-sm font-medium text-gray-600">{label}</span>
        </div>
    );
};

function LearningPlatform({ userLevels, generateExperience }) {
    const [character, setCharacter] = useState(null);
    const [subject, setSubject] = useState(null);
    const [selectedMode, setSelectedMode] = useState(null);
    const [experience, setExperience] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isListening, setIsListening] = useState(false);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [userAnswer, setUserAnswer] = useState('');
    const [feedback, setFeedback] = useState(null);
    const audioRef = useRef(null);

    const playAudio = (audioBase64, onEnded) => {
        if (!audioBase64) return;
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
        const audio = new Audio(`data:audio/mp3;base64,${audioBase64}`);
        audioRef.current = audio;
        if (onEnded) audio.addEventListener('ended', onEnded);
        audio.play();
    };

    const handleGenerate = async () => {
        if (!character || !subject || !selectedMode) return;

        setIsLoading(true);
        setError(null);
        setCurrentQuestionIndex(0);

        try {
            console.log('Sending request to Lambda:', {
                character: character.name,
                subject: subject.name,
                mode: selectedMode,
                level: userLevels[subject.id]
            });

            const response = await fetch(LAMBDA_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    character: character.name,
                    subject: subject.name,
                    mode: selectedMode,
                    level: userLevels[subject.id]
                })
            });

            const data = await response.json();
            console.log('Lambda response:', data);

            if (!response.ok) {
                throw new Error(data.error || 'Failed to generate experience');
            }

            setExperience(data);

            // Play audio based on mode
            if (selectedMode === 'game' && data.questions?.[0]?.audio) {
                playAudio(data.questions[0].audio);
            } else if (selectedMode === 'learn' && data.audio) {
                playAudio(data.audio);
            }
        } catch (err) {
            console.error('Error details:', err);
            setError(err.message || 'Oops! Something went wrong. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleTranscriptComplete = async (transcript) => {
        if (selectedMode === 'game' && experience?.questions) {
            const currentQuestion = experience.questions[currentQuestionIndex];
            setUserAnswer(transcript);

            // Super forgiving answer check with number/word mapping
            const numberWords = {
                '0': 'zero', '1': 'one', '2': 'two', '3': 'three', '4': 'four', '5': 'five',
                '6': 'six', '7': 'seven', '8': 'eight', '9': 'nine', '10': 'ten',
                '11': 'eleven', '12': 'twelve', '13': 'thirteen', '14': 'fourteen', '15': 'fifteen',
                '16': 'sixteen', '17': 'seventeen', '18': 'eighteen', '19': 'nineteen', '20': 'twenty'
            };
            const wordNumbers = Object.fromEntries(Object.entries(numberWords).map(([k, v]) => [v, k]));

            let possibleAnswers = [];
            const answerRaw = currentQuestion.answer;
            const braceMatch = answerRaw.match(/\{([^}]+)\}/);
            if (braceMatch) {
                possibleAnswers = braceMatch[1].split(',').map(s => s.trim());
            } else if (answerRaw.includes(',')) {
                possibleAnswers = answerRaw.split(',').map(s => s.trim());
            } else {
                possibleAnswers = [answerRaw.trim()];
            }
            // Expand possible answers to include both numeric and word forms
            let expandedAnswers = [];
            possibleAnswers.forEach(ans => {
                expandedAnswers.push(ans);
                // If answer is a number, add word form
                if (numberWords[ans]) expandedAnswers.push(numberWords[ans]);
                // If answer is a word number, add digit form
                if (wordNumbers[ans.toLowerCase()]) expandedAnswers.push(wordNumbers[ans.toLowerCase()]);
            });
            // Remove duplicates
            expandedAnswers = [...new Set(expandedAnswers)];
            // Normalize function: lower, remove punctuation, trim
            const normalize = str => str.toLowerCase().replace(/[^a-z0-9 ]/gi, '').trim();
            const userNorm = normalize(transcript);
            const expandedNorm = expandedAnswers.map(normalize);
            console.log('User transcript:', transcript, '| Normalized:', userNorm);
            console.log('Possible answers:', possibleAnswers);
            console.log('Expanded answers:', expandedAnswers);
            console.log('Expanded normalized answers:', expandedNorm);
            // Only accept exact matches after normalization
            const isCorrect = expandedNorm.some(ans => userNorm === ans);

            setFeedback({
                isCorrect,
                message: isCorrect ? currentQuestion.correct_response : currentQuestion.wrong_response
            });

            // Get feedback audio from Lambda
            try {
                const response = await fetch(LAMBDA_ENDPOINT, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        type: 'feedback',
                        character: character.name,
                        is_correct: isCorrect,
                        question_data: currentQuestion
                    })
                });

                const data = await response.json();
                if (data.audio) {
                    playAudio(data.audio, () => {
                        // After feedback audio ends, move to next question or finish
                        if (currentQuestionIndex < experience.questions.length - 1) {
                            setCurrentQuestionIndex(prev => prev + 1);
                            setFeedback(null);
                            setUserAnswer('');
                            // Play next question audio
                            const nextQuestion = experience.questions[currentQuestionIndex + 1];
                            if (nextQuestion.audio) {
                                playAudio(nextQuestion.audio);
                            }
                        } else {
                            // Game completed
                            setFeedback({
                                isCorrect: true,
                                message: "Congratulations! You've completed all questions! 🎉"
                            });
                        }
                    });
                } else {
                    // If no audio, fallback to timeout
                    setTimeout(() => {
                        if (currentQuestionIndex < experience.questions.length - 1) {
                            setCurrentQuestionIndex(prev => prev + 1);
                            setFeedback(null);
                            setUserAnswer('');
                            const nextQuestion = experience.questions[currentQuestionIndex + 1];
                            if (nextQuestion.audio) {
                                playAudio(nextQuestion.audio);
                            }
                        } else {
                            setFeedback({
                                isCorrect: true,
                                message: "Congratulations! You've completed all questions! 🎉"
                            });
                        }
                    }, 3000);
                }
            } catch (err) {
                console.error('Error getting feedback audio:', err);
            }
        }
    };

    const handleReset = () => {
        setCharacter(null);
        setSubject(null);
        setSelectedMode(null);
        setExperience(null);
        setError(null);
    };

    const isGoButtonEnabled = character && subject && selectedMode && !isLoading;

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-sky-50 to-blue-50">
            {/* Instruction Text */}
            <motion.p
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-lg text-gray-600 mb-8 text-center max-w-md"
            >
                Drag a character + subject and pick your learning adventure!
            </motion.p>

            {/* Character Tokens - Left Side */}
            <div className="absolute left-8 top-1/2 -translate-y-1/2 flex flex-col gap-6">
                {CHARACTERS.map((char) => (
                    <Token
                        key={char.id}
                        {...char}
                        type="character"
                    />
                ))}
            </div>

            {/* Subject Tokens - Right Side */}
            <div className="absolute right-8 top-1/2 -translate-y-1/2 flex flex-col gap-6">
                {SUBJECTS.map((subj) => (
                    <Token
                        key={subj.id}
                        {...subj}
                        type="subject"
                    />
                ))}
            </div>

            {/* Platform */}
            <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                className="bg-white rounded-3xl p-8 shadow-2xl relative mt-auto mb-16"
            >
                <div className="flex gap-12 mb-8">
                    <DropZone type="character" onDrop={setCharacter} label="Character">
                        {character && <Token {...character} type="character" />}
                    </DropZone>
                    <DropZone type="subject" onDrop={setSubject} label="Category">
                        {subject && <Token {...subject} type="subject" />}
                    </DropZone>
                </div>

                {/* Mode Selection Buttons */}
                <div className="flex gap-4 justify-center mb-6">
                    <button
                        onClick={() => setSelectedMode('game')}
                        className={`px-6 py-2 rounded-full transition-all duration-200
                          ${selectedMode === 'game'
                                ? 'bg-sky-400 text-white shadow-lg scale-105'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}
                          shadow-md hover:shadow-lg transform hover:-translate-y-0.5`}
                    >
                        Game
                    </button>
                    <button
                        onClick={() => setSelectedMode('learn')}
                        className={`px-6 py-2 rounded-full transition-all duration-200
                          ${selectedMode === 'learn'
                                ? 'bg-emerald-400 text-white shadow-lg scale-105'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}
                          shadow-md hover:shadow-lg transform hover:-translate-y-0.5`}
                    >
                        Learn
                    </button>
                </div>

                {/* Go Button */}
                <div className="flex justify-center">
                    <button
                        onClick={handleGenerate}
                        disabled={!isGoButtonEnabled}
                        className={`px-8 py-3 rounded-full text-lg font-medium transition-all duration-200
                          ${isGoButtonEnabled
                                ? 'bg-gradient-to-r from-sky-400 to-emerald-400 text-white shadow-lg hover:shadow-xl'
                                : 'bg-gray-100 text-gray-400 cursor-not-allowed'}
                          transform hover:-translate-y-0.5`}
                    >
                        {isLoading ? (
                            <span className="flex items-center gap-2">
                                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Generating...
                            </span>
                        ) : 'Go!'}
                    </button>
                </div>

                {/* Reset Button */}
                {(character || subject || selectedMode) && (
                    <motion.button
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        onClick={handleReset}
                        className="absolute -top-4 -right-4 w-8 h-8 bg-white rounded-full shadow-lg
                          flex items-center justify-center text-gray-600 hover:text-gray-800
                          hover:bg-gray-50 transition-colors"
                    >
                        ↺
                    </motion.button>
                )}
            </motion.div>

            {/* Experience Result */}
            <AnimatePresence>
                {experience && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="mt-8 bg-white rounded-xl p-6 shadow-lg max-w-md w-full"
                    >
                        <h3 className="text-xl font-bold text-gray-800 mb-4">{experience.title}</h3>
                        {selectedMode === 'game' ? (
                            <div className="space-y-4">
                                {experience.questions.map((q, index) => (
                                    <div
                                        key={index}
                                        className={`bg-sky-50 p-4 rounded-lg ${index === currentQuestionIndex ? 'ring-2 ring-sky-400' : ''
                                            }`}
                                    >
                                        <p className="font-medium text-gray-800 mb-2">Q: {q.question}</p>
                                        {index === currentQuestionIndex ? (
                                            <>
                                                <div className="mt-4">
                                                    <VoiceInput
                                                        onTranscriptComplete={handleTranscriptComplete}
                                                        isListening={isListening}
                                                        onListeningChange={setIsListening}
                                                    />
                                                </div>
                                                {userAnswer && (
                                                    <motion.div
                                                        initial={{ opacity: 0, y: 10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        className="mt-4 text-gray-600"
                                                    >
                                                        <p className="font-medium">Your answer:</p>
                                                        <p className="text-sm mt-1">{userAnswer}</p>
                                                    </motion.div>
                                                )}
                                                {feedback && (
                                                    <motion.div
                                                        initial={{ opacity: 0, y: 10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        className={`mt-4 p-3 rounded-lg ${feedback.isCorrect
                                                            ? 'bg-green-50 text-green-700'
                                                            : 'bg-yellow-50 text-yellow-700'
                                                            }`}
                                                    >
                                                        {feedback.message}
                                                    </motion.div>
                                                )}
                                            </>
                                        ) : (
                                            <p className="text-gray-600">A: {q.answer}</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="prose prose-sm text-gray-600">
                                {experience.content}
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Error Message */}
            <AnimatePresence>
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="mt-4 bg-red-50 text-red-600 px-4 py-2 rounded-lg max-w-md"
                    >
                        <p className="font-medium">Error</p>
                        <p className="text-sm mt-1">{error}</p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default LearningPlatform; 