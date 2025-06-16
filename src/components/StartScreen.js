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
                    className="mb-40 bg-yellow-400 hover:bg-yellow-500 text-black font-bold py-10 px-12 rounded-full shadow-lg text-4xl font-cartoon"
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                >
                    Start! &gt;&gt;&gt;
                </motion.button>
            </div>
        </div>

    );
};

export default StartScreen; 