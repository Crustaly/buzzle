import React from 'react';
import { useDrag } from 'react-dnd';
import { motion } from 'framer-motion';

function Token({ id, name, emoji, type }) {
    const [{ isDragging }, drag] = useDrag(() => ({
        type: type,
        item: { id, name, emoji, type },
        collect: (monitor) => ({
            isDragging: !!monitor.isDragging(),
        }),
    }));

    return (
        <motion.div
            ref={drag}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            whileHover={{ scale: 1.1, y: -5 }}
            whileTap={{ scale: 0.9 }}
            className="flex flex-col items-center"
        >
            <div
                className={`w-16 h-16 rounded-full bg-white shadow-lg flex items-center justify-center
        cursor-move select-none text-3xl
        ${isDragging ? 'opacity-50' : 'opacity-100'}
        transition-all duration-200
        hover:shadow-xl`}
            >
                {emoji}
            </div>
            <span className="mt-2 text-xs font-medium text-gray-600 max-w-[80px] text-center">
                {name}
            </span>
        </motion.div>
    );
}

export default Token; 