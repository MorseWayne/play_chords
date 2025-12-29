'use client';

import * as React from 'react';
// @ts-ignore
import Chord from '@tombatossals/react-chords/lib/Chord';
import type { ChordPosition } from '@/lib/chords';

interface ChordDiagramProps {
  position: ChordPosition;
}

export function ChordDiagram({ position }: ChordDiagramProps) {
  const instrument = {
    strings: 6,
    fretsOnChord: 5,
    name: 'Guitar',
    keys: [],
    tunings: {
      standard: ['E', 'A', 'D', 'G', 'B', 'E'],
    },
  };

  const liteChord = {
    frets: position.frets,
    fingers: position.fingers,
    barres: position.barres,
    capo: position.capo,
    baseFret: position.baseFret,
  };

  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="w-64 h-80 mx-auto dark:[&_svg]:invert dark:[&_svg]:hue-rotate-180 dark:[&_svg]:contrast-125">
        <Chord chord={liteChord} instrument={instrument} lite={false} />
      </div>
    </div>
  );
}


