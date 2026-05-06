import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Info } from 'lucide-react';

export default function InfoPopover({ painPoint, intent, whatItDoes }) {
  const [open, setOpen] = useState(false);
  const [style, setStyle] = useState({});
  const btnRef = useRef(null);

  function handleClick(e) {
    e.stopPropagation();
    if (!open) {
      const rect = btnRef.current.getBoundingClientRect();
      const flipLeft = rect.right + 300 > window.innerWidth;
      setStyle({
        position: 'fixed',
        top: rect.top + rect.height / 2,
        ...(flipLeft
          ? { left: rect.left - 288 }
          : { left: rect.right + 8 }),
        transform: 'translateY(-50%)',
        width: 280,
        zIndex: 9999,
      });
    }
    setOpen(v => !v);
  }

  useEffect(() => {
    if (!open) return;
    function handleOutside(e) {
      if (!btnRef.current?.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  return (
    <>
      <button
        ref={btnRef}
        onClick={handleClick}
        className="inline-flex items-center text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
        aria-label="Why this matters"
      >
        <Info size={13} />
      </button>

      {open && createPortal(
        <div
          style={style}
          className="bg-white rounded-xl border border-gray-200 shadow-xl p-4"
        >
          <p style={{ fontSize: 13, lineHeight: 1.6 }} className="text-red-600 mb-1.5">
            🔴 <span className="font-medium">Pain point:</span> {painPoint}
          </p>
          <p style={{ fontSize: 13, lineHeight: 1.6 }} className="text-gray-700 mb-1.5">
            🎯 <span className="font-medium">Intent:</span> {intent}
          </p>
          <p style={{ fontSize: 13, lineHeight: 1.6 }} className="text-gray-700">
            ✅ <span className="font-medium">What it does:</span> {whatItDoes}
          </p>
        </div>,
        document.body
      )}
    </>
  );
}
