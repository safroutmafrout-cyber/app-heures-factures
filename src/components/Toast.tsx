'use client';

import { useEffect, useRef } from 'react';

interface Props {
  message: string;
  type: string;
  onClose: () => void;
}

export default function Toast({ message, type, onClose }: Props) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const timer = setTimeout(() => onCloseRef.current(), 3000);
    return () => clearTimeout(timer);
  }, [message]);

  const bgColor = type === 'success'
    ? 'bg-emerald-500/90'
    : type === 'error'
    ? 'bg-red-500/90'
    : 'bg-blue-500/90';

  return (
    <div className="fixed top-5 right-5 z-[9999]" style={{ animation: 'slideIn 0.3s ease' }}>
      <div className={`${bgColor} backdrop-blur-lg px-5 py-3 rounded-xl text-white text-sm font-medium shadow-lg max-w-sm`}>
        {message}
      </div>
    </div>
  );
}

