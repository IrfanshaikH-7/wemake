import React, { useEffect } from 'react';
import useScreenshareStore from '../../store/screenshareStore';

const ControlHandler = () => {
  const { isControlling, videoRef } = useScreenshareStore();

  useEffect(() => {
    if (!isControlling || !videoRef?.current) return;

    const video = videoRef.current;
    video.focus();

    const handleMouseMove = (e) => {
      const rect = video.getBoundingClientRect();
      const x = Math.round(e.clientX - rect.left);
      const y = Math.round(e.clientY - rect.top);
      
      console.log('Mouse move:', { x, y });
      window.electronAPI.moveMouse(x, y);
    };

    const handleClick = () => {
      console.log('Mouse click');
      window.electronAPI.mouseClick();
    };

    const handleRightClick = (e) => {
      e.preventDefault();
      console.log('Right click');
      window.electronAPI.mouseRightClick();
    };

    const handleDoubleClick = () => {
      console.log('Double click');
      window.electronAPI.mouseDoubleClick();
    };

    const handleKeyDown = (e) => {
      if (e.ctrlKey || e.altKey || e.shiftKey || e.metaKey) {
        const keys = [];
        if (e.ctrlKey) keys.push('Control');
        if (e.altKey) keys.push('Alt');
        if (e.shiftKey) keys.push('Shift');
        if (e.metaKey) keys.push('Meta');
        keys.push(e.key);
        
        console.log('Key combo:', keys);
        window.electronAPI.pressKeyCombo(keys);
      } else {
        console.log('Key:', e.key);
        window.electronAPI.typeKey(e.key);
      }
    };

    video.addEventListener('mousemove', handleMouseMove);
    video.addEventListener('click', handleClick);
    video.addEventListener('contextmenu', handleRightClick);
    video.addEventListener('dblclick', handleDoubleClick);
    video.addEventListener('keydown', handleKeyDown);

    // Add styles to video when controlling
    video.style.cursor = 'none';
    video.tabIndex = 0;

    return () => {
      video.removeEventListener('mousemove', handleMouseMove);
      video.removeEventListener('click', handleClick);
      video.removeEventListener('contextmenu', handleRightClick);
      video.removeEventListener('dblclick', handleDoubleClick);
      video.removeEventListener('keydown', handleKeyDown);
      
      // Reset video styles
      video.style.cursor = '';
      video.removeAttribute('tabIndex');
    };
  }, [isControlling, videoRef]);

  return null; // No need to render anything, we're using the video element directly
};

export default ControlHandler; 