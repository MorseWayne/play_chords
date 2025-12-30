import React from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Metronome } from '@/components/Metronome';

interface MetronomeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MetronomeDialog({ open, onOpenChange }: MetronomeDialogProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl overflow-y-auto flex flex-col"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>节拍器</SheetTitle>
          <SheetDescription>
            调节速度、拍号和音量，开始节奏练习
          </SheetDescription>
        </SheetHeader>
        
        <div className="flex-1 flex items-center justify-center py-4">
          <Metronome />
        </div>
      </SheetContent>
    </Sheet>
  );
}

