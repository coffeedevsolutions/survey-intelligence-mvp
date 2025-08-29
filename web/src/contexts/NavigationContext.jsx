import React, { useState } from 'react';
import { NavigationContext } from '../constants/navigation.js';

export function NavigationProvider({ children }) {
  const [activeSection, setActiveSection] = useState('dashboard');

  const navigate = (sectionId) => {
    setActiveSection(sectionId);
  };

  return (
    <NavigationContext.Provider value={{
      activeSection,
      navigate
    }}>
      {children}
    </NavigationContext.Provider>
  );
}
