import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Info } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function InfoPopover({ painPoint, intent, whatItDoes, isFirst = false }) {
  const { showPulse, firstInfoClicked, markInfoClicked } = useApp();
  const [open, setOpen] = useState(false);
  const [popoverStyle, setPopoverStyle] = useState({});
  const [tooltipPos, setTooltipPos] = useState(null);
  const btnRef = useRef(null);

  const showFirstTooltip = isFirst && showPulse && !firstInfoClicked;
  const pulseActive = showPulse && !firstInfoClicked;

  // Position the first-time tooltip below the icon
  useEffect(() => {
    if (!showFirstTooltip || !btnRef.current) { setTooltipPos(null); return; }

    function update() {
      const rect = btnRef.current?.getBoundingClientRect();
      if (!rect) return;
      setTooltipPos({ top: rect.bottom + 10, centerX: rect.left + rect.width / 2 });
    }
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [showFirstTooltip]);

  function handleClick(e) {
    e.stopPropagation();
    // Mark the first info click globally
    markInfoClicked();

    if (!open) {
      const rect = btnRef.current.getBoundingClientRect();
      const flipLeft = rect.right + 300 > window.innerWidth;
      setPopoverStyle({
        position: 'fixed',
        top: rect.top + rect.height / 2,
        ...(flipLeft ? { left: rect.left - 288 } : { left: rect.right + 8 }),
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
        className={`inline-flex items-center transition-colors flex-shrink-0 ${
          pulseActive
            ? 'info-pulse-ring text-[#1A6BFF]'
            : 'text-gray-400 hover:text-gray-600'
        }`}
        aria-label="Why this matters"
      >
        <Info size={13} />
      </button>

      {/* First-time tooltip: "Click any ℹ️ to learn..." */}
      {showFirstTooltip && tooltipPos && createPortal(
        <div
          style={{
            position: 'fixed',
            top: tooltipPos.top,
            left: tooltipPos.centerX,
            transform: 'translateX(-50%)',
            zIndex: 9997,
            pointerEvents: 'none',
          }}
          className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-lg"
        >
          {/* Arrow pointing up */}
          <div style={{
            position: 'absolute',
            top: -7,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 0,
            height: 0,
            borderLeft: '6px solid transparent',
            borderRight: '6px solid transparent',
            borderBottom: '7px solid #111827',
          }} />
          Click any ℹ️ to learn what problem this solves
        </div>,
        document.body
      )}

      {/* Main info popover */}
      {open && createPortal(
        <div style={popoverStyle} className="bg-white rounded-xl border border-gray-200 shadow-xl p-4">
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
