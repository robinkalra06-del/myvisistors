import React from 'react';

export function CountryFlag({ countryCode = 'XX', countryName = 'Unknown', showName = false, className = '' }) {
  // Convert 2-letter ISO code to Regional Indicator Emoji
  const getFlagEmoji = (code) => {
    if (!code || code === 'XX' || code.length !== 2) return '🌐';
    const codePoints = code
      .toUpperCase()
      .split('')
      .map(char => 127397 + char.charCodeAt(0));
    try {
      return String.fromCodePoint(...codePoints);
    } catch {
      return '🌐';
    }
  };

  const flag = getFlagEmoji(countryCode);

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`} title={countryName}>
      <span className="text-base leading-none select-none">{flag}</span>
      {showName && <span className="text-xs text-slate-300 font-medium">{countryName}</span>}
    </span>
  );
}
