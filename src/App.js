import React, { useState } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import LearningPlatform from './components/LearningPlatform';
import './App.css';

function App() {
  const [userLevels, setUserLevels] = useState({
    math: 2,
    language: 1,
    music: 1
  });

  const generateExperience = (mode, character, subject, level) => {
    // Mock function for now
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          title: `${character} ${mode}s ${subject}`,
          content: `This is a ${mode} experience with ${character} about ${subject} at level ${level}!`,
          type: mode
        });
      }, 1000);
    });
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="min-h-screen bg-cover bg-center" style={{ backgroundImage: "url('/assets/background.png')" }}>
        <LearningPlatform
          userLevels={userLevels}
          generateExperience={generateExperience}
        />
      </div>
    </DndProvider>
  );
}

export default App;
