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
    { id: 'oliver', name: 'Oliver', img: '/assets/oliver.png' },
];

const SUBJECTS = [
    { id: 'addition', name: 'Addition', img: '/assets/addition.png' },
    { id: 'language', name: 'Language', img: '/assets/language.png' },
    { id: 'music', name: 'Music', img: '/assets/music.png' },
    { id: 'foods', name: 'Foods', img: '/assets/foods.png' },
    { id: 'geography', name: 'Geography', img: '/assets/geography.png' },
    { id: 'money', name: 'Money', img: '/assets/money.png' },
    { id: 'science', name: 'Science', img: '/assets/science.png' },
    { id: 'subtraction', name: 'Subtraction', img: '/assets/subtraction.png' },
    { id: 'weather', name: 'Weather', img: '/assets/weather.png' },
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
                <span className="mt-2 text-sm huninn-regular text-gray-600">{label}</span>
            )}
        </div>
    );
};

const InstructionStep = ({ step, position, size = '14rem' }) => {

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
                style={{ width: size, height: 'auto' }}

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

function isMobileDevice() {
    return /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

function isPortrait() {
    return window.innerHeight > window.innerWidth;
}

function LearningPlatform({ userLevels, generateExperience }) {
    const [showStartScreen, setShowStartScreen] = useState(true);
    const [showIntroVideo, setShowIntroVideo] = useState(false);
    const [showLoadingScreen, setShowLoadingScreen] = useState(false);
    const [showVoiceInput, setShowVoiceInput] = useState(false);
    const [showPermissionPrompt, setShowPermissionPrompt] = useState(false);
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
    const [showRotate, setShowRotate] = useState(false);
    const introVideoRef = useRef(null);

    // Check permissions on component mount
    useEffect(() => {
        const checkInitialPermissions = async () => {
            try {
                // Check microphone permission
                const permissions = await navigator.permissions.query({ name: 'microphone' });
                if (permissions.state === 'denied' || permissions.state === 'prompt') {
                    setShowPermissionPrompt(true);
                    return;
                }

                // Test sound functionality
                try {
                    const testAudio = new Audio('/assets/pop.mp3');
                    testAudio.volume = 0.1;
                    await testAudio.play();
                    testAudio.pause();
                    console.log('Sound test passed');
                } catch (soundError) {
                    console.log('Sound test failed, showing permission prompt');
                    setShowPermissionPrompt(true);
                    return;
                }

                console.log('All permissions and sound working correctly');
            } catch (error) {
                console.log('Permission check not supported, showing prompt anyway...');
                setShowPermissionPrompt(true);
            }
        };

        // Check permissions after a short delay to ensure component is fully mounted
        const timer = setTimeout(checkInitialPermissions, 1000);
        return () => clearTimeout(timer);
    }, []);

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

    useEffect(() => {
        function checkOrientation() {
            if (isMobileDevice() && isPortrait()) {
                setShowRotate(true);
            } else {
                setShowRotate(false);
            }
        }
        checkOrientation();
        window.addEventListener('resize', checkOrientation);
        window.addEventListener('orientationchange', checkOrientation);
        return () => {
            window.removeEventListener('resize', checkOrientation);
            window.removeEventListener('orientationchange', checkOrientation);
        };
    }, []);

    // Request microphone and sound permissions
    const requestPermissions = async () => {
        try {
            // Request microphone permission
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(track => track.stop()); // Stop the stream after getting permission

            // Test audio playback
            const testAudio = new Audio('/assets/pop.mp3');
            testAudio.volume = 0.1;
            await testAudio.play();
            testAudio.pause();

            setShowPermissionPrompt(false);
            console.log('Permissions granted successfully');
        } catch (error) {
            console.error('Permission request failed:', error);
            alert('Please enable microphone and sound in your browser settings to enjoy the full experience.');
        }
    };

    // Handle intro video end
    const handleIntroVideoEnd = () => {
        setShowIntroVideo(false);
        setShowStartScreen(false);
        playSoundEffect('pop.mp3');
    };

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

        // Create audio element with proper MIME type
        const audio = new Audio();
        audio.src = `data:audio/mpeg;base64,${audioUrl}`;
        audio.type = 'audio/mpeg';

        // Add error handling
        audio.onerror = (e) => {
            console.error('Audio playback error:', e);
            if (onEnd) onEnd();
        };

        audioRef.current = audio;
        setIsAudioPlaying(true);

        // Use play() with a promise to handle autoplay restrictions
        const playPromise = audio.play();
        if (playPromise !== undefined) {
            playPromise
                .then(() => console.log('✅ Played audio from base64'))
                .catch(error => {
                    console.error('❌ Failed to play audio from base64:', error);
                    // Try to play again after user interaction
                    document.addEventListener('click', () => {
                        audio.play()
                            .then(() => console.log('✅ Played audio from base64 after click'))
                            .catch(err => console.error('❌ Failed to play audio from base64 after click:', err));
                    }, { once: true });
                });
        }

        audio.onended = () => {
            setIsAudioPlaying(false);
            if (onEnd) onEnd();
        };
    };

    // Play sound effect
    const playSoundEffect = (filename) => {
        console.log(`Trying to play /assets/${filename}`);
        const audio = new Audio(`/assets/${filename}`);
        audio.volume = 0.8;

        // Add error handling
        audio.onerror = (e) => {
            console.error(`❌ Error loading /assets/${filename}:`, e);
        };

        // Use play() with a promise to handle autoplay restrictions
        audio.play()
            .then(() => console.log(`✅ Played ${filename}`))
            .catch(err => {
                console.error(`❌ Failed to play ${filename}`, err);
                // Try to play again after user interaction
                document.addEventListener('click', () => {
                    audio.play()
                        .then(() => console.log(`✅ Played ${filename} after click`))
                        .catch(error => console.error(`❌ Failed to play ${filename} after click:`, error));
                }, { once: true });
            });
    };

    // Start lobby music
    useEffect(() => {
        const shouldPlayLobbyMusic = showStartScreen || (!showIntroVideo && !showLoadingScreen && !showVoiceInput);

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
    }, [showStartScreen, showIntroVideo, showLoadingScreen, showVoiceInput]);

    const handleStart = () => {
        if (lobbyMusicRef.current) {
            fadeOutAudio(lobbyMusicRef.current);
        }
        playSoundEffect('start.mp3'); // Optional: use a calm start sound
        setShowIntroVideo(true);
        setShowStartScreen(false);
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

        // Check if it's a game and show permission prompt if needed
        if (selectedMode === 'game') {
            try {
                // Check microphone permission
                const permissions = await navigator.permissions.query({ name: 'microphone' });
                if (permissions.state === 'denied') {
                    setShowPermissionPrompt(true);
                    return;
                }
            } catch (error) {
                console.log('Permission check not supported, proceeding...');
            }
        }

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
                        // Add 1 second break before playing first question
                        setTimeout(() => {
                            if (data.questions?.[0]?.audio) {
                                playAudio(data.questions[0].audio);
                            }
                        }, 1000);
                    }, 1000);
                });
            } else if (selectedMode === 'learn' && data.audio) {
                setTimeout(() => {
                    playAudio(data.audio, () => {
                        // Go back to game selection screen
                        setShowVoiceInput(false);
                        setShowStartScreen(false);
                        setShowIntroVideo(false);
                        setExperience(null);
                        setCurrentQuestionIndex(0);
                        setCorrectAnswers(0);
                        setFeedback(null);
                        setIsAudioPlaying(false);
                        setCharacter(null);
                        setSubject(null);
                        setSelectedMode(null);
                        setCurrentStep(1);
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
                            setTimeout(() => {
                                if (nextQuestion?.audio) {
                                    playAudio(nextQuestion.audio);
                                }
                            }, 1000);
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
                                        // Go back to game selection screen
                                        setShowVoiceInput(false);
                                        setShowStartScreen(false);
                                        setShowIntroVideo(false);
                                        setExperience(null);
                                        setCurrentQuestionIndex(0);
                                        setCorrectAnswers(0);
                                        setFeedback(null);
                                        setIsAudioPlaying(false);
                                        setCharacter(null);
                                        setSubject(null);
                                        setSelectedMode(null);
                                        setCurrentStep(1);
                                    });
                                } else {
                                    playSoundEffect('home.mp3');
                                    // Go back to game selection screen
                                    setShowVoiceInput(false);
                                    setShowStartScreen(false);
                                    setShowIntroVideo(false);
                                    setExperience(null);
                                    setCurrentQuestionIndex(0);
                                    setCorrectAnswers(0);
                                    setFeedback(null);
                                    setIsAudioPlaying(false);
                                    setCharacter(null);
                                    setSubject(null);
                                    setSelectedMode(null);
                                    setCurrentStep(1);
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
                            setTimeout(() => {
                                if (nextQuestion?.audio) {
                                    playAudio(nextQuestion.audio);
                                }
                            }, 1000);
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
                                        // Go back to game selection screen
                                        setShowVoiceInput(false);
                                        setShowStartScreen(false);
                                        setShowIntroVideo(false);
                                        setExperience(null);
                                        setCurrentQuestionIndex(0);
                                        setCorrectAnswers(0);
                                        setFeedback(null);
                                        setIsAudioPlaying(false);
                                        setCharacter(null);
                                        setSubject(null);
                                        setSelectedMode(null);
                                        setCurrentStep(1);
                                    });
                                } else {
                                    playSoundEffect('home.mp3');
                                    // Go back to game selection screen
                                    setShowVoiceInput(false);
                                    setShowStartScreen(false);
                                    setShowIntroVideo(false);
                                    setExperience(null);
                                    setCurrentQuestionIndex(0);
                                    setCorrectAnswers(0);
                                    setFeedback(null);
                                    setIsAudioPlaying(false);
                                    setCharacter(null);
                                    setSubject(null);
                                    setSelectedMode(null);
                                    setCurrentStep(1);
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
        setCurrentStep(1);
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
            {showRotate && (
                <div className="fixed inset-0 z-[99999] bg-black bg-opacity-80 flex flex-col items-center justify-center">
                    <div className="text-white text-3xl huninn-regular p-8 rounded-2xl bg-black bg-opacity-70 border-4 border-yellow-300 shadow-2xl">
                        Please Rotate Your Device
                    </div>
                </div>
            )}
            {/* Permission Prompt */}
            {showPermissionPrompt && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-xl text-center max-w-md shadow-lg">
                        <h2 className="text-xl huninn-regular mb-2">Welcome to Buzzle!</h2>
                        <p className="mb-4 huninn-regular">To enjoy the full experience, please enable your microphone and turn on your sound. We'll test both to make sure they're working properly.</p>
                        <button
                            onClick={requestPermissions}
                            className="bg-yellow-400 hover:bg-yellow-500 text-black px-4 py-2 rounded-full huninn-regular"
                        >
                            Enable Microphone & Sound
                        </button>
                    </div>
                </div>
            )}
            {/* Intro Video */}
            <AnimatePresence>
                {showIntroVideo && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 w-full h-full z-[9999] bg-black"
                    >
                        <video
                            ref={introVideoRef}
                            className="w-full h-full object-cover"
                            autoPlay
                            muted={false}
                            onEnded={handleIntroVideoEnd}
                            onError={(e) => {
                                console.error('Video playback error:', e);
                                handleIntroVideoEnd();
                            }}
                        >
                            <source src="/assets/intro.mp4" type="video/mp4" />
                            Your browser does not support the video tag.
                        </video>
                    </motion.div>
                )}
            </AnimatePresence>
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
                        <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ transform: 'translateY(200px)' }}>

                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                className="w-16 h-16 border-4 border-yellow-400 border-t-transparent rounded-full mb-4"
                            />
                            <div className="text-2xl huninn-regular text-black drop-shadow-lg mt-0">
                                Generating your {selectedMode === 'game' ? 'game... (20 seconds)' : 'lesson... (10 seconds)'}
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
                        setShowStartScreen(false);
                        setShowIntroVideo(false);
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
                        <div className="text-2xl huninn-regular mb-8 text-center">
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
                {!showStartScreen && !showIntroVideo && !showLoadingScreen && !showVoiceInput && (
                    <>
                        {/* Instruction Steps */}
                        {currentStep === 1 && (
                            <InstructionStep step={1} position="left-[350px] top-[60px]" size="13rem" />
                        )}
                        {currentStep === 2 && (<InstructionStep step={2} position="right-[380px] top-[15%]" size="11rem" />
                        )}
                        {currentStep === 3 && (
                            <InstructionStep step={3} position="left-[290px] bottom-[20px]" size="14rem" />
                        )}
                        {currentStep === 4 && (
                            <InstructionStep step={4} position="right-[210px] bottom-[21px]" size="20rem" />
                        )}

                        {/* Character Tokens - Left Side */}
                        <div className="absolute left-[32px] top-1/3 transform -translate-y-1/2">
                            <div className="bg-[#fffde7] rounded-[2rem] shadow-xl px-6 py-4 w-[400px] h-[360px] flex flex-col items-center">
                                <span className="huninn-regular text-2xl mb-4 border-b-4 border-black pb-1">Characters</span>
                                <div className="grid grid-cols-2 gap-4 w-full justify-items-center">
                                    {CHARACTERS.map((char) => (
                                        <Token key={char.id} {...char} type="character" />
                                    ))}
                                </div>

                            </div>
                        </div>



                        {/* Subject Tokens - Right Side */}
                        <div className="absolute right-[32px] top-1/3 transform -translate-y-1/2">
                            <div className="bg-[#fffde7] rounded-[2rem] shadow-xl px-6 py-4 w-[400px] h-[360px] flex flex-col items-center">
                                <span className="huninn-regular text-2xl mb-4 border-b-4 border-black pb-1">Subjects</span>
                                <div className="grid grid-cols-3 gap-4 w-full justify-items-center overflow-y-auto flex-1" style={{ maxHeight: '240px' }}>
                                    {SUBJECTS.map((subj) => (
                                        <Token key={subj.id} {...subj} type="subject" />
                                    ))}
                                </div>
                                {/* You can add a step arrow here if needed */}
                            </div>
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
                                    <span className="mb-0 text-black text-xl drop-shadow-md huninn-regular">
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
                                    <span className="mb-0 text-black text-xl drop-shadow-md huninn-regular">
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
                            <div className="flex justify-center mt-[20px]">

                                <button
                                    onClick={handleGenerate}
                                    disabled={!isGoButtonEnabled}
                                    className={`w-[220px] h-[90px] rounded-full text-3xl huninn-regular transition-all duration-200
            ${isGoButtonEnabled
                                            ? 'bg-red-600 text-white shadow-xl border-4 border-red-900 hover:bg-red-700 hover:scale-105'
                                            : 'bg-gray-200 text-gray-400 border-4 border-gray-400 cursor-not-allowed'}
            flex items-center justify-center`}
                                >
                                    {isLoading ? (
                                        <span className="flex items-center gap-2">
                                            <svg
                                                className="animate-spin h-7 w-7 text-white"
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
                                    <h3 className="text-xl huninn-regular text-gray-800 mb-4">{experience.title}</h3>
                                    <div className="space-y-4">
                                        {experience.questions.map((q, index) => (
                                            <div
                                                key={index}
                                                className={`bg-sky-50 p-4 rounded-lg ${index === currentQuestionIndex ? 'ring-2 ring-sky-400' : ''}`}
                                            >
                                                <p className="huninn-regular text-gray-800 mb-2">Q: {q.question}</p>
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
                                    <p className="huninn-regular">Error</p>
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