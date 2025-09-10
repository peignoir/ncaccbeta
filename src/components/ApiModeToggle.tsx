import { useState, useEffect } from 'react';
import ApiConfigManager, { ApiMode } from '../lib/apiConfig';

export default function ApiModeToggle() {
  const [mode, setMode] = useState<ApiMode>(ApiConfigManager.getMode());
  const [isVisible, setIsVisible] = useState(false);
  const [keyBuffer, setKeyBuffer] = useState('');

  useEffect(() => {
    const unsubscribe = ApiConfigManager.onModeChange((newMode) => {
      console.log('[ApiModeToggle] Mode changed to:', newMode);
      setMode(newMode);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      const newBuffer = keyBuffer + e.key;
      setKeyBuffer(newBuffer);
      
      if (newBuffer.includes('pofpof')) {
        setIsVisible(true);
        setKeyBuffer('');
      }
      
      // Clear buffer after 2 seconds of no typing
      setTimeout(() => setKeyBuffer(''), 2000);
    };

    window.addEventListener('keypress', handleKeyPress);
    return () => window.removeEventListener('keypress', handleKeyPress);
  }, [keyBuffer]);

  const handleModeChange = (newMode: ApiMode) => {
    console.log('[ApiModeToggle] User requesting mode change to:', newMode);
    console.log(`[ApiModeToggle] Switching to ${newMode} API`);
    ApiConfigManager.setMode(newMode);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 z-50 border border-gray-200 dark:border-gray-700">
      <div className="flex flex-col gap-3">
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
            API Mode
          </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => handleModeChange('mock')}
            className={`px-3 py-1 text-sm rounded transition-colors ${
              mode === 'mock'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            Mock
          </button>
          
          <button
            onClick={() => handleModeChange('real')}
            className={`px-3 py-1 text-sm rounded transition-colors ${
              mode === 'real'
                ? 'bg-green-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            Real API
          </button>
        </div>
      </div>
    </div>
  );
}