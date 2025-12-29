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
    <div className="flex flex-col gap-2 w-full">
      <div>
        <label className="text-[10px] text-muted-foreground mb-0.5 block">根音</label>
        <Select value={selectedKey} onValueChange={onKeyChange}>
          <SelectTrigger className="h-8 text-sm">
            <SelectValue placeholder="Key" />
          </SelectTrigger>
          <SelectContent>
            {keys.map((k) => (
              <SelectItem key={k} value={k}>{k}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="text-[10px] text-muted-foreground mb-0.5 block">类型</label>
        <Select value={selectedSuffix} onValueChange={onSuffixChange}>
          <SelectTrigger className="h-8 text-sm">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            {suffixes.length > 0 ? (
              suffixes.map((s) => (
                <SelectItem key={s} value={s}>
                  {selectedKey}{formatSuffix(s)} <span className="text-muted-foreground ml-1 text-xs">{getSuffixLabel(s)}</span>
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

