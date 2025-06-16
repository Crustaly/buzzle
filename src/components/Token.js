import React from 'react';
import { useDrag } from 'react-dnd';
import { motion } from 'framer-motion';

function Token({ id, name, img, type }) {
    const [{ isDragging }, drag] = useDrag(() => ({
        type: type,
        item: { id, name, img, type },
        collect: (monitor) => ({
            isDragging: !!monitor.isDragging(),
        }),
    }));

    return (
        <div className="flex flex-col items-center">
            {/* Draggable image */}
            <motion.div
                ref={drag}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                whileHover={{ scale: 1.1, y: -5 }}
                whileTap={{ scale: 0.9 }}
                className={`w-30 h-24 flex items-center justify-center
                    cursor-move select-none
                    ${isDragging ? 'opacity-50' : 'opacity-100'}
                    transition-all duration-200`}
            >
                <img src={img} alt={name} className="w-full h-full object-contain" />
            </motion.div>

            {/* Text below the image */}
            <span className="mt-2 text-xs font-medium text-gray-600 max-w-[80px] text-center">
                {name}
            </span>
        </div>
    );
}

export default Token;
