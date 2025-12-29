'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

const STRING_LABELS_HIGH_TO_LOW = ['E', 'B', 'G', 'D', 'A', 'E'] as const;
const STANDARD_TUNING_MIDI_LOW_TO_HIGH = [40, 45, 50, 55, 59, 64];

export interface FretboardProps {
  fretsLowToHigh: number[]; // length 6, low E -> high E, -1 mute, 0 open, >0 fret
  fingersLowToHigh?: number[]; // length 6, 0=open/mute, 1..4
  barres?: number[]; // fret numbers that are barred (e.g. [8])
  maxFret?: number; // inclusive
  className?: string;
}

export function Fretboard({
  fretsLowToHigh,
  fingersLowToHigh,
  barres = [],
  maxFret = 15,
  className,
}: FretboardProps) {
  const width = 980;
  const height = 260;
  const leftPad = 56; // labels area
  const topPad = 28; // fret numbers
  const rightPad = 18;
  const bottomPad = 16;

  const fretCount = maxFret + 1; // 0..maxFret (numbers), but lines are 0..maxFret+1
  const boardWidth = width - leftPad - rightPad;
  const boardHeight = height - topPad - bottomPad;

  const stringCount = 6;
  const stringGap = boardHeight / (stringCount - 1);
  const fretGap = boardWidth / (fretCount);

  // Convert to high->low for rendering lines
  const fretsHighToLow = [...fretsLowToHigh].reverse();
  const fingersHighToLow = (fingersLowToHigh ? [...fingersLowToHigh] : new Array(6).fill(0)).reverse();

  function xForFret(fret: number): number {
    // position inside fret cell (between fret-1 and fret)
    if (fret <= 0) return leftPad + fretGap * 0.35;
    const cellLeft = leftPad + fretGap * fret;
    return cellLeft + fretGap / 2;
  }

  return (
    <div className={cn('w-full overflow-x-auto', className)}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full min-w-[900px] select-none"
        role="img"
        aria-label="吉他指板"
      >
        {/* background */}
        <rect
          x={leftPad}
          y={topPad}
          width={boardWidth}
          height={boardHeight}
          rx={16}
          className="fill-muted/30 stroke-border"
        />

        {/* fret numbers */}
        {Array.from({ length: fretCount }, (_, i) => (
          <text
            key={`fn-${i}`}
            x={leftPad + fretGap * i + fretGap * 0.4}
            y={18}
            className="fill-muted-foreground"
            fontSize="12"
            textAnchor="middle"
          >
            {i}
          </text>
        ))}

        {/* nut (0) */}
        <line
          x1={leftPad + fretGap}
          y1={topPad + 8}
          x2={leftPad + fretGap}
          y2={topPad + boardHeight - 8}
          className="stroke-foreground/70"
          strokeWidth={4}
          strokeLinecap="round"
        />

        {/* frets */}
        {Array.from({ length: fretCount - 1 }, (_, i) => {
          const fret = i + 2; // start after nut line
          const x = leftPad + fretGap * fret;
          return (
            <line
              key={`f-${fret}`}
              x1={x}
              y1={topPad + 8}
              x2={x}
              y2={topPad + boardHeight - 8}
              className="stroke-border"
              strokeWidth={2}
              strokeLinecap="round"
            />
          );
        })}

        {/* strings + labels */}
        {Array.from({ length: stringCount }, (_, s) => {
          const y = topPad + stringGap * s;
          const label = STRING_LABELS_HIGH_TO_LOW[s];
          return (
            <g key={`s-${s}`}>
              <text
                x={leftPad - 26}
                y={y + 4}
                className="fill-muted-foreground"
                fontSize="12"
                textAnchor="middle"
              >
                {label}
              </text>
              <line
                x1={leftPad + 6}
                y1={y}
                x2={leftPad + boardWidth - 6}
                y2={y}
                className="stroke-foreground/40"
                strokeWidth={s === 0 ? 1.5 : 1.2}
                strokeLinecap="round"
              />
            </g>
          );
        })}

        {/* markers: 3,5,7,9,12,15 */}
        {[3, 5, 7, 9, 12, 15].filter((f) => f <= maxFret).map((f) => {
          const x = xForFret(f);
          const y = topPad + boardHeight / 2;
          const isDouble = f === 12;
          return (
            <g key={`m-${f}`}>
              <circle cx={x} cy={y} r={5} className="fill-muted-foreground/25" />
              {isDouble && (
                <circle cx={x} cy={y + 28} r={5} className="fill-muted-foreground/25" />
              )}
            </g>
          );
        })}

        {/* barre overlays */}
        {barres.map((bf) => {
          const x = xForFret(bf);
          const involved: number[] = [];
          fretsHighToLow.forEach((f, idx) => {
            if (f === bf) involved.push(idx);
          });
          if (involved.length < 2) return null;
          const topIdx = Math.min(...involved);
          const botIdx = Math.max(...involved);
          const y1 = topPad + stringGap * topIdx;
          const y2 = topPad + stringGap * botIdx;
          const h = Math.max(14, y2 - y1);
          return (
            <rect
              key={`barre-${bf}`}
              x={x - 12}
              y={y1 - 10}
              width={24}
              height={h + 20}
              rx={12}
              className="fill-primary"
              opacity={0.35}
            />
          );
        })}

        {/* notes */}
        {fretsHighToLow.map((fret, idxHighToLow) => {
          const y = topPad + stringGap * idxHighToLow;
          const finger = fingersHighToLow[idxHighToLow] ?? 0;

          if (fret < 0) {
            return (
              <text
                key={`x-${idxHighToLow}`}
                x={leftPad + 10}
                y={y + 5}
                className="fill-destructive"
                fontSize="14"
                fontWeight={700}
                textAnchor="middle"
              >
                ×
              </text>
            );
          }

          // open string: show hollow circle near nut
          if (fret === 0) {
            return (
              <g key={`o-${idxHighToLow}`}>
                <circle
                  cx={leftPad + 22}
                  cy={y}
                  r={8}
                  className="fill-background stroke-border"
                  strokeWidth={2}
                />
              </g>
            );
          }

          const x = xForFret(fret);
          return (
            <g key={`n-${idxHighToLow}`}>
              <circle
                cx={x}
                cy={y}
                r={10}
                className="fill-foreground"
                opacity={0.9}
              />
              <circle
                cx={x}
                cy={y}
                r={11.5}
                className="fill-transparent stroke-background/40"
                strokeWidth={2}
              />
              <text
                x={x}
                y={y + 4}
                className="fill-background"
                fontSize="10"
                fontWeight={800}
                textAnchor="middle"
              >
                {finger > 0 ? finger : ''}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}


