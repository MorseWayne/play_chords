'use client';

import * as React from 'react';
import { Note } from '@tonaljs/tonal';
import { cn } from '@/lib/utils';

const STRING_LABELS_HIGH_TO_LOW = ['E', 'B', 'G', 'D', 'A', 'E'] as const;
const STANDARD_TUNING_MIDI_LOW_TO_HIGH = [40, 45, 50, 55, 59, 64];

function midiToPitchClass(midi: number): string {
  const pcs = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  return pcs[((midi % 12) + 12) % 12];
}

function pitchClassToChroma(pc: string): number {
  const c = Note.chroma(pc);
  return typeof c === 'number' ? c : -1;
}

export interface FretboardProps {
  fretsLowToHigh: number[]; // length 6, low E -> high E, -1 mute, 0 open, >0 fret
  chordRoot?: string; // pitch class (e.g. C, F#, Bb)
  maxFret?: number; // inclusive
  className?: string;
}

export function Fretboard({ fretsLowToHigh, chordRoot, maxFret = 15, className }: FretboardProps) {
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

  const rootChroma = chordRoot ? pitchClassToChroma(chordRoot) : -1;

  // Convert to high->low for rendering lines
  const fretsHighToLow = [...fretsLowToHigh].reverse();

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

        {/* notes */}
        {fretsHighToLow.map((fret, idxHighToLow) => {
          const y = topPad + stringGap * idxHighToLow;
          const stringIndexLowToHigh = 5 - idxHighToLow;
          const openMidi = STANDARD_TUNING_MIDI_LOW_TO_HIGH[stringIndexLowToHigh];

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

          const midi = openMidi + fret;
          const chroma = midi % 12;
          const isRoot = rootChroma >= 0 ? chroma === rootChroma : false;

          // open string: show hollow circle near nut
          if (fret === 0) {
            return (
              <g key={`o-${idxHighToLow}`}>
                <circle
                  cx={leftPad + 22}
                  cy={y}
                  r={8}
                  className={cn(
                    'fill-background stroke-border',
                    isRoot && 'stroke-primary',
                  )}
                  strokeWidth={2}
                />
                {isRoot && (
                  <circle cx={leftPad + 22} cy={y} r={3} className="fill-primary" />
                )}
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
                className={cn(
                  isRoot ? 'fill-primary' : 'fill-foreground',
                )}
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
                className={cn(isRoot ? 'fill-primary-foreground' : 'fill-background')}
                fontSize="10"
                fontWeight={700}
                textAnchor="middle"
              >
                {midiToPitchClass(midi)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}


