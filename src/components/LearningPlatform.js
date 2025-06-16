import React, { useState, useRef, useEffect } from 'react';
import { useDrop } from 'react-dnd';
import { motion, AnimatePresence } from 'framer-motion';
import Token from './Token';
import VoiceInput from './VoiceInput';
import StartScreen from './StartScreen';

const CHARACTERS = [
    { id: 'emma', name: 'Princess Emma', img: '/assets/princess-emma.png' },
    { id: 'olivia', name: 'Olivia', img: '/assets/olivia.png' },
    { id: 'liam', name: 'Liam', img: '/assets/liam.png' },
];

const SUBJECTS = [
    { id: 'addition', name: 'Addition', img: '/assets/addition.png' },
    { id: 'language', name: 'Language', img: '/assets/language.png' },
    { id: 'music', name: 'Music', img: '/assets/music.png' },
];

// TODO: Replace with your actual Lambda endpoint
const LAMBDA_ENDPOINT = 'https://i960nau5j0.execute-api.us-east-1.amazonaws.com/generate';

const DropZone = ({ type, onDrop, children, label, isFilled }) => {
    const [{ isOver }, drop] = useDrop(() => ({
        accept: type,
        drop: (item) => onDrop(item),
        collect: (monitor) => ({
            isOver: !!monitor.isOver(),
        }),
    }));

    return (
        <div className="flex flex-col items-center mb-20 justify-center ml-0.5">
            <div
                ref={drop}
                className={`w-32 h-52 rounded-xl border-4 border-dashed flex items-center justify-center
                    ${isOver ? 'border-sky-400 shadow-[0_0_20px_rgba(56,189,248,0.5)]' : 'border-gray-300'}
                    bg-transparent transition-all duration-200`}
            >
                {children}
            </div>
            {!isFilled && (
                <span className="mt-2 text-sm font-medium text-gray-600">{label}</span>
            )}
        </div>
    );
};

const InstructionStep = ({ step, position }) => {
    const [imageError, setImageError] = useState(false);

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className={`absolute ${position} z-[9999] pointer-events-none select-none`}
        >
            <img
                src={`/assets/step${step}.png`}
                alt={`Step ${step}`}
                className="w-[32rem] h-auto"
                onError={(e) => {
                    console.error(`Failed to load step ${step} image`);
                    setImageError(true);
                }}
                draggable="false"
            />
            {imageError && (
                <div className="text-red-500 text-xl">
                    Step {step} image failed to load
                </div>
            )}
        </motion.div>
    );
};

function LearningPlatform({ userLevels, generateExperience }) {
    const [showStartScreen, setShowStartScreen] = useState(true);
    const [showLoadingScreen, setShowLoadingScreen] = useState(false);
    const [showVoiceInput, setShowVoiceInput] = useState(false);
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
    const [currentStep, setCurrentStep] = useState(1);
    const [correctAnswers, setCorrectAnswers] = useState(0);
    const audioRef = useRef(null);
    const lobbyMusicRef = useRef(null);
    const generatingMusicRef = useRef(null);
    const [isAudioPlaying, setIsAudioPlaying] = useState(false);

    // Reset everything when component mounts
    React.useEffect(() => {
        console.log('Current step changed to:', currentStep);
    }, [currentStep]);

    React.useEffect(() => {
        console.log('Character changed to:', character);
    }, [character]);

    React.useEffect(() => {
        console.log('Subject changed to:', subject);
    }, [subject]);

    React.useEffect(() => {
        console.log('Mode changed to:', selectedMode);
    }, [selectedMode]);

    // Audio fade out function
    const fadeOutAudio = (audio, duration = 1000) => {
        if (!audio) return;
        const startVolume = audio.volume;
        const startTime = Date.now();

        const fadeOut = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            audio.volume = startVolume * (1 - progress);

            if (progress < 1) {
                requestAnimationFrame(fadeOut);
            } else {
                audio.pause();
                audio.volume = startVolume;
            }
        };

        fadeOut();
    };

    // Play audio with fade out
    const playAudio = (audioUrl, onEnd) => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
        const audio = new Audio(`data:audio/mp3;base64,${audioUrl}`);
        audioRef.current = audio;
        audio.volume = 1.0; // Full volume for speech
        setIsAudioPlaying(true);
        audio.play().catch(console.error);
        audio.onended = () => {
            setIsAudioPlaying(false);
            if (onEnd) onEnd();
        };
    };

    // Play sound effect
    const playSoundEffect = (filename) => {
        const audio = new Audio(`/assets/${filename}`);
        audio.volume = 0.8; // Slightly reduced volume for sound effects
        audio.play().catch(console.error);
    };

    // Start lobby music
    useEffect(() => {
        const shouldPlayLobbyMusic = showStartScreen || (!showStartScreen && !showLoadingScreen && !showVoiceInput);

        if (shouldPlayLobbyMusic) {
            lobbyMusicRef.current = new Audio('/assets/lobbymusic.mp3');
            lobbyMusicRef.current.loop = true;
            lobbyMusicRef.current.volume = 0.5;
            lobbyMusicRef.current.play().catch(console.error);
        }

        return () => {
            if (lobbyMusicRef.current) {
                fadeOutAudio(lobbyMusicRef.current);
                lobbyMusicRef.current = null;
            }
        };
    }, [showStartScreen, showLoadingScreen, showVoiceInput]);

    const handleStart = () => {
        if (lobbyMusicRef.current) {
            fadeOutAudio(lobbyMusicRef.current);
        }
        playSoundEffect('start.mp3'); // Optional: use a calm start sound
        setShowStartScreen(false);
        playSoundEffect('pop.mp3');

    };

    const handleCharacterDrop = (char) => {
        playSoundEffect('pop.mp3');

        console.log('Character dropped:', char);
        setCharacter(char);
        setCurrentStep(2);
    };

    const handleSubjectDrop = (subj) => {
        console.log('Subject dropped:', subj);
        setSubject(subj);
        playSoundEffect('pop.mp3');

        setCurrentStep(3);
    };

    const handleModeSelect = (mode) => {
        console.log('Mode selected:', mode);
        setSelectedMode(mode);
        playSoundEffect('correct.mp3');

        setCurrentStep(4);
    };

    const handleGenerate = async () => {
        if (!character || !subject || !selectedMode) return;

        playSoundEffect('shine.mp3'); // Correct placement!
        setShowLoadingScreen(true);
        setIsLoading(true);
        setError(null);
        setCurrentQuestionIndex(0);
        setCorrectAnswers(0);

        generatingMusicRef.current = new Audio('/assets/generating.mp3');
        generatingMusicRef.current.loop = true;
        generatingMusicRef.current.play().catch(console.error);

        try {
            const response = await fetch(LAMBDA_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    character: character.name,
                    subject: subject.name,
                    mode: selectedMode,
                    level: userLevels[subject.id] || 1
                })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to generate experience');

            setExperience(data);
            setShowLoadingScreen(false);
            setShowVoiceInput(true);

            if (generatingMusicRef.current) fadeOutAudio(generatingMusicRef.current);

            if (selectedMode === 'game' && data.intro_audio) {
                playAudio(data.intro_audio, () => {
                    playSoundEffect('start.mp3');
                    setTimeout(() => {
                        if (data.questions?.[0]?.audio) {
                            playAudio(data.questions[0].audio);
                        }
                    }, 1000);
                });
            } else if (selectedMode === 'learn' && data.audio) {
                setTimeout(() => {
                    playAudio(data.audio, () => {
                        // Force reload after learn mode ends
                        window.location.reload(true);
                    });
                }, 1000);
            }
        } catch (err) {
            setError(err.message || 'Oops! Something went wrong.');
            setShowLoadingScreen(false);
            if (generatingMusicRef.current) fadeOutAudio(generatingMusicRef.current);
        } finally {
            setIsLoading(false);
        }
    };

    const handleVoiceInputResult = async (result) => {
        console.log('Voice input result:', result);

        if (!experience || !experience.questions) return;

        const currentQuestion = experience.questions[currentQuestionIndex];

        // Number word ↔ digit maps
        const numberWords = {
            '0': 'zero', '1': 'one', '2': 'two', '3': 'three', '4': 'four',
            '5': 'five', '6': 'six', '7': 'seven', '8': 'eight', '9': 'nine',
            '10': 'ten', '11': 'eleven', '12': 'twelve', '13': 'thirteen',
            '14': 'fourteen', '15': 'fifteen', '16': 'sixteen', '17': 'seventeen',
            '18': 'eighteen', '19': 'nineteen', '20': 'twenty'
        };
        const wordNumbers = Object.fromEntries(Object.entries(numberWords).map(([digit, word]) => [word, digit]));

        // Normalize text
        const normalize = str => str.toLowerCase().replace(/[^a-z0-9]/gi, '').trim();

        // Parse answers from {5, five} or comma-separated
        let possibleAnswers = [];
        const answerRaw = currentQuestion.answer || '';
        const braceMatch = answerRaw.match(/\{([^}]+)\}/);
        if (braceMatch) {
            possibleAnswers = braceMatch[1].split(',').map(s => s.trim());
        } else if (answerRaw.includes(',')) {
            possibleAnswers = answerRaw.split(',').map(s => s.trim());
        } else {
            possibleAnswers = [answerRaw.trim()];
        }

        // Expand to word/digit variants
        const expandedAnswers = new Set();
        for (const ans of possibleAnswers) {
            const norm = normalize(ans);
            expandedAnswers.add(norm);
            if (numberWords[norm]) expandedAnswers.add(normalize(numberWords[norm]));
            if (wordNumbers[norm]) expandedAnswers.add(normalize(wordNumbers[norm]));
        }

        // Normalize user input
        const normalizedUser = normalize(result);
        const isCorrect = expandedAnswers.has(normalizedUser);

        console.log('Transcript:', result);
        console.log('Normalized:', normalizedUser);
        console.log('Possible answers:', possibleAnswers);
        console.log('Expanded normalized answers:', [...expandedAnswers]);

        if (isCorrect) {
            setCorrectAnswers(prev => prev + 1);
            playSoundEffect('correct.mp3');
        } else {
            playSoundEffect('wrong.mp3');
        }

        // Get feedback audio from Lambda
        try {
            const response = await fetch(LAMBDA_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'feedback',
                    character: character.name,
                    is_correct: isCorrect,
                    question_data: currentQuestion
                })
            });

            const data = await response.json();

            if (isCorrect) {
                if (data.audio) {
                    playAudio(data.audio, () => {
                        if (currentQuestionIndex < experience.questions.length - 1) {
                            const nextIndex = currentQuestionIndex + 1;
                            setCurrentQuestionIndex(nextIndex);
                            const nextQuestion = experience.questions[nextIndex];
                            if (nextQuestion?.audio) {
                                playAudio(nextQuestion.audio);
                            }
                        } else {
                            // Last question completed, play outro after delay
                            setTimeout(() => {
                                const outroType = correctAnswers >= 3 ? 'success' : 'retry';
                                const outroText = experience[`outro_${outroType}`];
                                const outroAudio = experience[`outro_${outroType}_audio`];

                                setFeedback({
                                    isCorrect: true,
                                    message: outroText
                                });

                                if (outroAudio) {
                                    playAudio(outroAudio, () => {
                                        playSoundEffect('home.mp3');
                                        // Force reload after game ends
                                        window.location.reload(true);
                                    });
                                } else {
                                    playSoundEffect('home.mp3');
                                    // Force reload after game ends
                                    window.location.reload(true);
                                }
                            }, 1500);
                        }
                    });
                }
            } else {
                // For incorrect answers, play feedback and then move to next question
                if (data.audio) {
                    playAudio(data.audio, () => {
                        if (currentQuestionIndex < experience.questions.length - 1) {
                            const nextIndex = currentQuestionIndex + 1;
                            setCurrentQuestionIndex(nextIndex);
                            const nextQuestion = experience.questions[nextIndex];
                            if (nextQuestion?.audio) {
                                playAudio(nextQuestion.audio);
                            }
                        } else {
                            // Last question completed, play outro after delay
                            setTimeout(() => {
                                const outroType = correctAnswers >= 3 ? 'success' : 'retry';
                                const outroText = experience[`outro_${outroType}`];
                                const outroAudio = experience[`outro_${outroType}_audio`];

                                setFeedback({
                                    isCorrect: true,
                                    message: outroText
                                });

                                if (outroAudio) {
                                    playAudio(outroAudio, () => {
                                        playSoundEffect('home.mp3');
                                        // Force reload after game ends
                                        window.location.reload(true);
                                    });
                                } else {
                                    playSoundEffect('home.mp3');
                                    // Force reload after game ends
                                    window.location.reload(true);
                                }
                            }, 1500);
                        }
                    });
                }
            }
        } catch (err) {
            console.error('Error getting feedback audio:', err);
            playFeedbackSound(isCorrect);
        }
    };

    const handleReset = () => {
        setCharacter(null);
        setSubject(null);
        setSelectedMode(null);
        setExperience(null);
        setError(null);
        setCurrentStep(1);
        setShowVoiceInput(false);
        setShowStartScreen(true);
    };

    const isGoButtonEnabled = character && subject && selectedMode && !isLoading;

    const playFeedbackSound = (isCorrect) => {
        try {
            // Use a simple beep sound if the audio files aren't available
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.type = isCorrect ? 'sine' : 'square';
            oscillator.frequency.setValueAtTime(isCorrect ? 880 : 220, audioContext.currentTime);
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);

            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.5);
        } catch (error) {
            console.error('Error playing feedback sound:', error);
        }
    };

    const handleListeningChange = (listening) => {
        console.log('Listening state changed:', listening);
        setIsListening(listening);
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-transparent">
            {/* Start Screen */}
            <AnimatePresence>
                {showStartScreen && (
                    <StartScreen onStart={handleStart} />
                )}
            </AnimatePresence>

            {/* Loading Screen */}
            <AnimatePresence>
                {showLoadingScreen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 w-full h-full"
                    >
                        <img
                            src="/assets/startbg.png"
                            alt="Loading Background"
                            className="absolute inset-0 w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                className="w-16 h-16 border-4 border-yellow-400 border-t-transparent rounded-full mb-4"
                            />
                            <div className="text-2xl font-cartoon text-white drop-shadow-lg">
                                Generating your {selectedMode === 'game' ? 'game' : 'lesson'}...
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Back Arrow */}
            {showVoiceInput && (
                <motion.button
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    onClick={() => {
                        // Reset all states
                        setShowVoiceInput(false);
                        setShowStartScreen(true);
                        setExperience(null);
                        setCurrentQuestionIndex(0);
                        setCorrectAnswers(0);
                        setFeedback(null);
                        setIsAudioPlaying(false);
                        setCharacter(null);
                        setSubject(null);
                        setSelectedMode(null);
                        setCurrentStep(1);

                        // Stop all audio
                        if (audioRef.current) {
                            audioRef.current.pause();
                            audioRef.current.currentTime = 0;
                        }
                        if (lobbyMusicRef.current) {
                            lobbyMusicRef.current.pause();
                            lobbyMusicRef.current.currentTime = 0;
                        }
                        if (generatingMusicRef.current) {
                            generatingMusicRef.current.pause();
                            generatingMusicRef.current.currentTime = 0;
                        }
                    }}
                    className="fixed top-4 left-4 w-12 h-12 bg-white rounded-full shadow-lg
                        flex items-center justify-center text-gray-600 hover:text-gray-800
                        hover:bg-gray-50 transition-colors z-50"
                >
                    ←
                </motion.button>
            )}

            {/* Voice Input Screen */}
            <AnimatePresence>
                {showVoiceInput && experience && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 w-full h-full flex flex-col items-center justify-center"
                    >
                        <div className="text-2xl font-cartoon mb-8 text-center">
                            {selectedMode === 'game'
                                ? experience.questions[currentQuestionIndex].text
                                : experience.text}
                        </div>
                        <VoiceInput
                            onResult={handleVoiceInputResult}
                            onListeningChange={handleListeningChange}
                            isAnswerTime={selectedMode === 'game'}
                            isAudioPlaying={isAudioPlaying}
                            key={currentQuestionIndex}
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Content */}
            <AnimatePresence>
                {!showStartScreen && !showLoadingScreen && !showVoiceInput && (
                    <>
                        {/* Instruction Steps */}
                        {currentStep === 1 && (
                            <InstructionStep step={1} position="left-1 top-1/4" />
                        )}
                        {currentStep === 2 && (
                            <InstructionStep step={2} position="right-3 top-1/4" />
                        )}
                        {currentStep === 3 && (
                            <InstructionStep step={3} position="left-14 top-1/3" />
                        )}
                        {currentStep === 4 && (
                            <InstructionStep step={4} position="right-16 bottom-0" />
                        )}

                        {/* Character Tokens - Left Side */}
                        <div className="absolute left-8 top-1/2 transform -translate-y-1/2 flex flex-col items-center gap-6">
                            {CHARACTERS.map((char) => (
                                <Token key={char.id} {...char} type="character" />
                            ))}
                        </div>

                        {/* Subject Tokens - Right Side */}
                        <div className="absolute right-8 top-1/2 transform -translate-y-1/2 flex flex-col items-center gap-6">
                            {SUBJECTS.map((subj) => (
                                <Token key={subj.id} {...subj} type="subject" />
                            ))}
                        </div>

                        {/* Platform */}
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1.0, opacity: 1, y: 0 }}
                            className="relative mt-auto mb-16 w-[350px] h-[500px] rounded-3xl  bg-cover bg-center"
                            style={{
                                backgroundImage: selectedMode === 'game' ? "url('/assets/boxgame.png')" :
                                    selectedMode === 'learn' ? "url('/assets/boxlearn.png')" :
                                        "url('/assets/box.png')"
                            }}
                        >
                            <div className="flex gap-4 mb-0 ml-11">
                                {/* Character */}
                                <div className="flex flex-col items-center">
                                    <span className="mb-0 text-black text-xl font-extrabold drop-shadow-md font-cartoon">
                                        Character
                                    </span>

                                    <DropZone type="character" onDrop={handleCharacterDrop} isFilled={!!character} >
                                        {character && (
                                            <motion.div
                                                initial={{ scale: 1 }}
                                                animate={{ scale: 1.3 }}
                                                transition={{ duration: 0.2 }}
                                            >
                                                <Token {...character} type="character" />
                                            </motion.div>
                                        )}
                                    </DropZone>
                                </div>

                                {/* Category to fix!*/}

                                <div className="flex flex-col items-center">
                                    <span className="mb-0 text-black text-xl font-extrabold drop-shadow-md font-cartoon">
                                        Subject
                                    </span>

                                    <DropZone type="subject" onDrop={handleSubjectDrop} isFilled={!!subject}>
                                        {subject && (
                                            <motion.div
                                                initial={{ scale: 1 }}
                                                animate={{ scale: 1.2 }}
                                                transition={{ duration: 0.2 }}
                                            >
                                                <Token {...subject} type="subject" />
                                            </motion.div>
                                        )}
                                    </DropZone>

                                </div>
                            </div>

                            {/* Mode Selection Buttons */}
                            <div className="flex gap-4 justify-center mb-4">
                                <button
                                    onClick={() => handleModeSelect('game')}
                                    className={`px-8 py-15 rounded-full transition-all duration-200 opacity-0
            ${selectedMode === 'game'
                                            ? 'bg-sky-400 text-white shadow-lg scale-105'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}
            shadow-md hover:shadow-lg transform hover:-translate-y-0.5`}
                                >
                                    Game
                                </button>
                                <button
                                    onClick={() => handleModeSelect('learn')}
                                    className={`px-8 py-14 rounded-full transition-all duration-200 opacity-0
            ${selectedMode === 'learn'
                                            ? 'bg-emerald-400 text-white shadow-lg scale-105'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}
            shadow-md hover:shadow-lg transform hover:-translate-y-0.5`}
                                >
                                    Learn
                                </button>
                            </div>

                            {/* Go Button */}
                            <div className="flex justify-center mt-[70px]">

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
                                            <svg
                                                className="animate-spin h-5 w-5 text-white"
                                                xmlns="http://www.w3.org/2000/svg"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                            >
                                                <circle
                                                    className="opacity-25"
                                                    cx="12"
                                                    cy="12"
                                                    r="10"
                                                    stroke="currentColor"
                                                    strokeWidth="4"
                                                ></circle>
                                                <path
                                                    className="opacity-75"
                                                    fill="currentColor"
                                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                                ></path>
                                            </svg>
                                            Generating...
                                        </span>
                                    ) : (
                                        'Go!'
                                    )}
                                </button>
                            </div>

                            {/* Reset Button */}
                            {(character || subject || selectedMode) && (
                                <motion.button
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 2 }}
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
                            {experience && showVoiceInput && selectedMode === 'game' && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 20 }}
                                    className="mt-8 bg-white rounded-xl p-6 shadow-lg max-w-md w-full"
                                >
                                    <h3 className="text-xl font-bold text-gray-800 mb-4">{experience.title}</h3>
                                    <div className="space-y-4">
                                        {experience.questions.map((q, index) => (
                                            <div
                                                key={index}
                                                className={`bg-sky-50 p-4 rounded-lg ${index === currentQuestionIndex ? 'ring-2 ring-sky-400' : ''}`}
                                            >
                                                <p className="font-medium text-gray-800 mb-2">Q: {q.question}</p>
                                                {index === currentQuestionIndex ? (
                                                    <>
                                                        <div className="mt-4">
                                                            <VoiceInput
                                                                onResult={handleVoiceInputResult}
                                                                onListeningChange={handleListeningChange}
                                                                isAnswerTime={selectedMode === 'game'}
                                                                isAudioPlaying={isAudioPlaying}
                                                                key={currentQuestionIndex}
                                                            />
                                                        </div>
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
                                                ) : null}
                                            </div>
                                        ))}
                                    </div>
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
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}

export default LearningPlatform; 