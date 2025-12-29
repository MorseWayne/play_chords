import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getAvailableKeys, getSuffixesForKey, formatSuffix, getSuffixLabel } from '@/lib/chords';

interface ChordSelectorProps {
  selectedKey: string;
  selectedSuffix: string;
  onKeyChange: (key: string) => void;
  onSuffixChange: (suffix: string) => void;
}

export function ChordSelector({
  selectedKey,
  selectedSuffix,
  onKeyChange,
  onSuffixChange,
}: ChordSelectorProps) {
  const keys = getAvailableKeys();
  const suffixes = getSuffixesForKey(selectedKey);

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="flex-1">
        <label className="text-sm font-medium mb-1 block text-muted-foreground">根音 (Root)</label>
        <Select value={selectedKey} onValueChange={onKeyChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select Key" />
          </SelectTrigger>
          <SelectContent>
            {keys.map((k) => (
              <SelectItem key={k} value={k}>
                {k}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1">
        <label className="text-sm font-medium mb-1 block text-muted-foreground">类型 (Type)</label>
        <Select value={selectedSuffix} onValueChange={onSuffixChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select Type" />
          </SelectTrigger>
          <SelectContent>
            {suffixes.length > 0 ? (
              suffixes.map((s) => (
                <SelectItem key={s} value={s}>
                  <div className="flex items-center justify-between gap-4">
                    <div className="font-medium">
                      {selectedKey}
                      <span className="ml-1 text-muted-foreground">{formatSuffix(s)}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">{getSuffixLabel(s)}</div>
                  </div>
                </SelectItem>
              ))
            ) : (
              <SelectItem value="none" disabled>No chords available</SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

