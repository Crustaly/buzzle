import React from 'react';
import { motion } from 'framer-motion';

const StartScreen = ({ onStart }) => {
    const playStartSound = () => {
        const audio = new Audio('/assets/pop.mp3');
        audio.play();
        onStart();
    };

    return (
        <div className="fixed inset-0 w-full h-full">
            {/* Background Image */}
            <img
                src="/assets/startbg.png"
                alt="Start Background"
                className="absolute inset-0 w-full h-full object-cover"
            />

            {/* Button Container */}
            <div className="absolute inset-0 flex items-end justify-center">
                <motion.button
                    onClick={playStartSound}
                    className="mb-8"
                    initial={{ y: 100, opacity: 0 }}
                    animate={{
                        y: [0, -10, 0],
                        opacity: 1,
                        transition: {
                            y: {
                                duration: 2,
                                repeat: Infinity,
                                ease: "easeInOut"
                            },
                            opacity: {
                                duration: 0.8,
                                ease: "easeOut"
                            }
                        }
                    }}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                >
                    <img src="/assets/startbutton.png" alt="Start Button" className="w-48 h-auto" />
                </motion.button>
            </div>
        </div>

    );
};

export default StartScreen; 