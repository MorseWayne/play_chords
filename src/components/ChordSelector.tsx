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
    <div className="flex gap-2">
      <div className="flex-1">
        <label className="text-xs text-muted-foreground mb-1 block">根音</label>
        <Select value={selectedKey} onValueChange={onKeyChange}>
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Key" />
          </SelectTrigger>
          <SelectContent>
            {keys.map((k) => (
              <SelectItem key={k} value={k}>{k}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex-[2]">
        <label className="text-xs text-muted-foreground mb-1 block">类型</label>
        <Select value={selectedSuffix} onValueChange={onSuffixChange}>
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            {suffixes.length > 0 ? (
              suffixes.map((s) => (
                <SelectItem key={s} value={s}>
                  {selectedKey}{formatSuffix(s)} <span className="text-muted-foreground ml-1">{getSuffixLabel(s)}</span>
                </SelectItem>
              ))
            ) : (
              <SelectItem value="none" disabled>无可用和弦</SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

