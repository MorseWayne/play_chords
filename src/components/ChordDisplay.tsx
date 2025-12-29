import React from 'react';
// @ts-ignore
import Chord from '@tombatossals/react-chords/lib/Chord';
import { ChordPosition } from '@/lib/chords';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ChordDisplayProps {
  positions: ChordPosition[];
  currentVariant: number;
  onVariantChange: (index: number) => void;
}

export function ChordDisplay({
  positions,
  currentVariant,
  onVariantChange,
}: ChordDisplayProps) {
  if (!positions || positions.length === 0) {
    return <div className="text-center text-muted-foreground">No chord data available</div>;
  }

  // Ensure variant index is within bounds to prevent crashes during state updates
  const safeVariant = Math.min(Math.max(0, currentVariant), positions.length - 1);
  const chord = positions[safeVariant];

  if (!chord) {
    return <div className="text-center text-muted-foreground">Invalid chord data</div>;
  }
  
  const instrument = {
    strings: 6,
    fretsOnChord: 4,
    name: 'Guitar',
    keys: [],
    tunings: {
      standard: ['E', 'A', 'D', 'G', 'B', 'E']
    }
  };

  const liteChord = {
    frets: chord.frets,
    fingers: chord.fingers,
    barres: chord.barres,
    capo: chord.capo,
    baseFret: chord.baseFret
  };

  return (
    <div className="flex flex-col items-center">
      <div className="bg-white p-4 rounded-xl shadow-sm border mb-4">
        {/* React Chords renders an SVG */}
        <div className="w-64 h-72">
            <Chord
                chord={liteChord}
                instrument={instrument}
                lite={false}
            />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => onVariantChange(Math.max(0, currentVariant - 1))}
          disabled={currentVariant === 0}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <span className="text-sm font-medium">
          Variant {currentVariant + 1} / {positions.length}
        </span>

        <Button
          variant="outline"
          size="icon"
          onClick={() => onVariantChange(Math.min(positions.length - 1, currentVariant + 1))}
          disabled={currentVariant === positions.length - 1}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

