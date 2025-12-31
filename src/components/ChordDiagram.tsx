'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface ChordDiagramProps {
  frets: number[]; // length 6, low E -> high E, -1 mute, 0 open, >0 fret
  fingers?: number[]; // length 6, 0 = not pressed/open, 1-4 = finger number
  barres?: number[]; // fret numbers where barre occurs
  baseFret?: number; // starting fret position
  chordName?: string; // chord name to display
  size?: 'small' | 'large'; // size variant
  className?: string;
}

export function ChordDiagram({
  frets,
  fingers = [],
  barres = [],
  baseFret = 1,
  chordName,
  size = 'small',
  className,
}: ChordDiagramProps) {
  // Size configurations
  const isLarge = size === 'large';
  const width = isLarge ? 120 : 80;
  const height = isLarge ? 150 : 100;
  const stringCount = 6;
  const fretCount = 4; // show 4 frets
  
  const topPad = isLarge ? 28 : 20; // for open/mute markers
  const bottomPad = isLarge ? 10 : 6;
  const leftPad = isLarge ? 16 : 10;
  const rightPad = isLarge ? 16 : 10;
  
  const boardWidth = width - leftPad - rightPad;
  const boardHeight = height - topPad - bottomPad;
  
  // Size-dependent values
  const dotRadius = isLarge ? 9 : 6;
  const openCircleRadius = isLarge ? 6 : 4;
  const fontSize = isLarge ? 12 : 8;
  const baseFretFontSize = isLarge ? 12 : 9;
  const muteFontSize = isLarge ? 14 : 10;
  const barreHeight = isLarge ? 14 : 10;
  
  const stringGap = boardWidth / (stringCount - 1);
  const fretGap = boardHeight / fretCount;

  // Calculate the display fret range
  const playedFrets = frets.filter(f => f > 0);
  const minFret = playedFrets.length > 0 ? Math.min(...playedFrets) : 1;
  const actualBaseFret = baseFret > 1 ? baseFret : (minFret > 3 ? minFret : 1);
  const showBaseFret = actualBaseFret > 1;

  function xForString(stringIndex: number): number {
    // stringIndex 0 = low E (left), 5 = high E (right)
    return leftPad + stringGap * stringIndex;
  }

  function yForFret(fret: number): number {
    // fret relative to baseFret
    const relativeFret = fret - actualBaseFret + 1;
    return topPad + fretGap * (relativeFret - 0.5);
  }

  // Get barre info
  function getBarreInfo(barreFret: number): { startString: number; endString: number } | null {
    let startString = -1;
    let endString = -1;
    
    for (let i = 0; i < 6; i++) {
      const fret = frets[i];
      if (fret >= barreFret && fret !== -1) {
        if (startString === -1) startString = i;
        endString = i;
      }
    }
    
    if (startString === -1 || startString === endString) return null;
    return { startString, endString };
  }

  return (
    <div className={cn('flex flex-col items-center', className)}>
      {chordName && (
        <div className="text-sm font-semibold mb-1">{chordName}</div>
      )}
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className={cn('w-full', isLarge ? 'max-w-[120px]' : 'max-w-[80px]')}
        role="img"
        aria-label="和弦图"
      >
        {/* Nut or baseFret indicator */}
        {!showBaseFret ? (
          <rect
            x={leftPad - 2}
            y={topPad - (isLarge ? 4 : 3)}
            width={boardWidth + 4}
            height={isLarge ? 5 : 4}
            rx={isLarge ? 2 : 1}
            className="fill-foreground"
          />
        ) : (
          <text
            x={isLarge ? 2 : 4}
            y={topPad + fretGap * 0.5 + 4}
            className="fill-muted-foreground"
            fontSize={baseFretFontSize}
            fontWeight={600}
          >
            {actualBaseFret}
          </text>
        )}

        {/* Frets (horizontal lines) */}
        {Array.from({ length: fretCount + 1 }, (_, i) => (
          <line
            key={`fret-${i}`}
            x1={leftPad}
            y1={topPad + fretGap * i}
            x2={leftPad + boardWidth}
            y2={topPad + fretGap * i}
            className="stroke-border"
            strokeWidth={i === 0 && !showBaseFret ? 0 : 1}
          />
        ))}

        {/* Strings (vertical lines) */}
        {Array.from({ length: stringCount }, (_, i) => (
          <line
            key={`string-${i}`}
            x1={xForString(i)}
            y1={topPad}
            x2={xForString(i)}
            y2={topPad + boardHeight}
            className="stroke-foreground/50"
            strokeWidth={1}
          />
        ))}

        {/* Barre indicators */}
        {barres.map((barreFret) => {
          const info = getBarreInfo(barreFret);
          if (!info) return null;
          
          const y = yForFret(barreFret);
          const startX = xForString(info.startString);
          const endX = xForString(info.endString);
          const barreHalf = barreHeight / 2;
          
          return (
            <rect
              key={`barre-${barreFret}`}
              x={startX - (isLarge ? 6 : 4)}
              y={y - barreHalf}
              width={endX - startX + (isLarge ? 12 : 8)}
              height={barreHeight}
              rx={barreHalf}
              className="fill-foreground"
            />
          );
        })}

        {/* Finger positions, open strings, mutes */}
        {frets.map((fret, stringIndex) => {
          const x = xForString(stringIndex);
          
          // Muted string
          if (fret === -1) {
            return (
              <text
                key={`mute-${stringIndex}`}
                x={x}
                y={topPad - (isLarge ? 8 : 6)}
                className="fill-muted-foreground"
                fontSize={muteFontSize}
                fontWeight={600}
                textAnchor="middle"
              >
                ×
              </text>
            );
          }
          
          // Open string
          if (fret === 0) {
            return (
              <circle
                key={`open-${stringIndex}`}
                cx={x}
                cy={topPad - (isLarge ? 13 : 9)}
                r={openCircleRadius}
                className="fill-none stroke-muted-foreground"
                strokeWidth={isLarge ? 2 : 1.5}
              />
            );
          }
          
          // Check if covered by barre
          const isCoveredByBarre = barres.some((barreFret) => {
            if (fret !== barreFret) return false;
            const info = getBarreInfo(barreFret);
            if (!info) return false;
            return stringIndex >= info.startString && stringIndex <= info.endString;
          });
          
          if (isCoveredByBarre) return null;
          
          // Fretted note
          const y = yForFret(fret);
          const finger = fingers[stringIndex] || 0;
          
          return (
            <g key={`note-${stringIndex}`}>
              <circle
                cx={x}
                cy={y}
                r={dotRadius}
                className="fill-foreground"
              />
              {finger > 0 && (
                <text
                  x={x}
                  y={y + (isLarge ? 4 : 3)}
                  className="fill-background"
                  fontSize={fontSize}
                  fontWeight={700}
                  textAnchor="middle"
                >
                  {finger}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

