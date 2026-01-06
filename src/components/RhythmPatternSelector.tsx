'use client';

import React, { useState, useMemo } from 'react';
import { Volume2, Plus, Trash2, Music2, Guitar, ChevronDown } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
// 注：Collapsible 使用简单的 state 实现

import type { 
  RhythmPattern, 
  StrummingPattern, 
  ArpeggioPattern,
  RhythmPatternPreference,
  CustomRhythmPattern,
} from '@/lib/rhythms';
import {
  STRUMMING_PATTERNS,
  ARPEGGIO_PATTERNS,
  parseStrummingPattern,
  parseArpeggioPattern,
  validateStrummingInput,
  validateArpeggioInput,
} from '@/lib/rhythms';
import { useAudio, type ChordVoicing } from '@/contexts/AudioContext';

// =============================================================================
// 组件 Props
// =============================================================================

interface RhythmPatternSelectorProps {
  // 当前选中的节奏型偏好
  preference: RhythmPatternPreference | null;
  // 当前节奏型
  currentPattern: RhythmPattern | null;
  // 设置节奏型
  onSelectPattern: (type: 'strum' | 'arpeggio', patternId: string) => void;
  // 清除节奏型
  onClearPattern: () => void;
  // 自定义节奏型列表
  customPatterns: CustomRhythmPattern[];
  // 添加自定义节奏型
  onAddCustomPattern: (pattern: RhythmPattern) => CustomRhythmPattern;
  // 删除自定义节奏型
  onDeleteCustomPattern: (patternId: string) => void;
  // 预览试听时的和弦把位
  previewVoicing?: ChordVoicing;
  // BPM
  bpm: number;
  // 紧凑模式
  compact?: boolean;
}

// =============================================================================
// 辅助组件
// =============================================================================

/**
 * 节奏型可视化显示
 */
function PatternVisualization({ pattern }: { pattern: RhythmPattern }) {
  if (pattern.type === 'strumming') {
    const strum = pattern as StrummingPattern;
    return (
      <div className="flex items-center gap-0.5 font-mono text-sm">
        {strum.sequence.map((action, idx) => (
          <span
            key={idx}
            className={`inline-flex items-center justify-center w-5 h-6 rounded ${
              action.accent 
                ? 'bg-primary/20 text-primary font-bold' 
                : action.mute 
                  ? 'bg-muted text-muted-foreground'
                  : 'text-foreground'
            }`}
          >
            {action.mute ? 'x' : action.direction === 'down' ? '↓' : '↑'}
          </span>
        ))}
      </div>
    );
  } else {
    const arp = pattern as ArpeggioPattern;
    return (
      <div className="flex items-center gap-0.5 font-mono text-sm">
        {arp.sequence.map((note, idx) => (
          <span
            key={idx}
            className={`inline-flex items-center justify-center w-5 h-6 rounded ${
              note.accent 
                ? 'bg-primary/20 text-primary font-bold' 
                : 'text-foreground'
            }`}
          >
            {note.string}
          </span>
        ))}
      </div>
    );
  }
}

/**
 * 节奏型卡片
 */
function PatternCard({
  pattern,
  isSelected,
  onSelect,
  onPreview,
  onDelete,
  showDelete,
}: {
  pattern: RhythmPattern | CustomRhythmPattern;
  isSelected: boolean;
  onSelect: () => void;
  onPreview?: () => void;
  onDelete?: () => void;
  showDelete?: boolean;
}) {
  const isCustom = 'isCustom' in pattern && (pattern as CustomRhythmPattern).isCustom;
  
  return (
    <div
      className={`group relative p-3 rounded-lg border cursor-pointer transition-all ${
        isSelected
          ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
          : 'border-border hover:border-primary/50 hover:bg-muted/50'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm truncate">{pattern.name}</span>
            {isCustom && (
              <Badge variant="secondary" className="text-xs px-1.5 py-0">
                自定义
              </Badge>
            )}
          </div>
          <PatternVisualization pattern={pattern} />
          {pattern.notes && (
            <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2">
              {pattern.notes}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onPreview && (
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={(e) => {
                e.stopPropagation();
                onPreview();
              }}
            >
              <Volume2 className="h-3.5 w-3.5" />
            </Button>
          )}
          {showDelete && onDelete && (
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
      {pattern.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {pattern.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs px-1.5 py-0">
              {tag}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// 主组件
// =============================================================================

export function RhythmPatternSelector({
  preference,
  currentPattern,
  onSelectPattern,
  onClearPattern,
  customPatterns,
  onAddCustomPattern,
  onDeleteCustomPattern,
  previewVoicing,
  bpm,
  compact = false,
}: RhythmPatternSelectorProps) {
  const { playWithStrummingPattern, playWithArpeggioPattern, initAudio } = useAudio();
  
  const [patternType, setPatternType] = useState<'strum' | 'arpeggio'>(
    preference?.type ?? 'strum'
  );
  const [customDialogOpen, setCustomDialogOpen] = useState(false);
  const [customDialogType, setCustomDialogType] = useState<'strum' | 'arpeggio'>('strum');
  const [customName, setCustomName] = useState('');
  const [customInput, setCustomInput] = useState('');
  const [customError, setCustomError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(!compact);

  // 按标签分组的扫弦节奏型
  const groupedStrumPatterns = useMemo(() => {
    const customStrum = customPatterns.filter((p): p is CustomRhythmPattern & { type: 'strumming' } => p.type === 'strumming');
    const groups: Record<string, (StrummingPattern | CustomRhythmPattern)[]> = {
      '基础': STRUMMING_PATTERNS.filter((p) => p.tags.includes('basic')),
      '流行/民谣': STRUMMING_PATTERNS.filter((p) => p.tags.includes('pop') || p.tags.includes('folk')),
      '摇滚/放克': STRUMMING_PATTERNS.filter((p) => p.tags.includes('rock') || p.tags.includes('funk')),
      '布鲁斯/爵士': STRUMMING_PATTERNS.filter((p) => p.tags.includes('blues') || p.tags.includes('jazz')),
      '拉丁/其他': STRUMMING_PATTERNS.filter((p) => p.tags.includes('bossa') || p.tags.includes('latin') || p.tags.includes('reggae')),
    };
    if (customStrum.length > 0) {
      groups['自定义'] = customStrum;
    }
    return groups;
  }, [customPatterns]);

  // 按标签分组的分解节奏型
  const groupedArpPatterns = useMemo(() => {
    const customArp = customPatterns.filter((p): p is CustomRhythmPattern & { type: 'arpeggio' } => p.type === 'arpeggio');
    const groups: Record<string, (ArpeggioPattern | CustomRhythmPattern)[]> = {
      '经典分解': ARPEGGIO_PATTERNS.filter((p) => p.tags.includes('classic')),
      '滚动琶音': ARPEGGIO_PATTERNS.filter((p) => p.tags.includes('roll') || p.tags.includes('wave')),
      '指弹风格': ARPEGGIO_PATTERNS.filter((p) => p.tags.includes('fingerstyle') || p.tags.includes('travis') || p.tags.includes('bossa')),
    };
    if (customArp.length > 0) {
      groups['自定义'] = customArp;
    }
    return groups;
  }, [customPatterns]);

  // 预览节奏型
  const handlePreview = async (pattern: RhythmPattern) => {
    await initAudio();
    
    if (!previewVoicing) {
      // 使用默认 C 和弦作为预览
      const defaultVoicing: ChordVoicing = { frets: [-1, 3, 2, 0, 1, 0] };
      if (pattern.type === 'strumming') {
        playWithStrummingPattern(defaultVoicing, pattern as StrummingPattern, bpm);
      } else {
        playWithArpeggioPattern(defaultVoicing, pattern as ArpeggioPattern, bpm);
      }
    } else {
      if (pattern.type === 'strumming') {
        playWithStrummingPattern(previewVoicing, pattern as StrummingPattern, bpm);
      } else {
        playWithArpeggioPattern(previewVoicing, pattern as ArpeggioPattern, bpm);
      }
    }
  };

  // 打开自定义对话框
  const handleOpenCustomDialog = (type: 'strum' | 'arpeggio') => {
    setCustomDialogType(type);
    setCustomName('');
    setCustomInput('');
    setCustomError(null);
    setCustomDialogOpen(true);
  };

  // 保存自定义节奏型
  const handleSaveCustomPattern = () => {
    const validation = customDialogType === 'strum'
      ? validateStrummingInput(customInput)
      : validateArpeggioInput(customInput);

    if (!validation.valid) {
      setCustomError(validation.errors.join('；'));
      return;
    }

    if (!validation.pattern) {
      setCustomError('无法解析节奏型');
      return;
    }

    const pattern = validation.pattern;
    pattern.name = customName || (customDialogType === 'strum' ? '自定义扫弦' : '自定义分解');
    pattern.id = `custom-${customDialogType}-${Date.now()}`;

    onAddCustomPattern(pattern);
    onSelectPattern(customDialogType, pattern.id);
    setCustomDialogOpen(false);
  };

  // 验证输入
  const handleInputChange = (value: string) => {
    setCustomInput(value);
    if (!value.trim()) {
      setCustomError(null);
      return;
    }
    const validation = customDialogType === 'strum'
      ? validateStrummingInput(value)
      : validateArpeggioInput(value);
    setCustomError(validation.valid ? null : validation.errors.join('；'));
  };

  // 紧凑模式：可折叠选择器
  if (compact) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Music2 className="h-4 w-4 text-muted-foreground" />
            <Label className="text-sm">节奏型</Label>
          </div>
          <div className="flex items-center gap-2">
            {currentPattern ? (
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {currentPattern.name}
                </Badge>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-xs"
                  onClick={onClearPattern}
                >
                  清除
                </Button>
              </div>
            ) : (
              <span className="text-xs text-muted-foreground">未选择</span>
            )}
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 w-6 p-0"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </Button>
          </div>
        </div>
        
        {isExpanded && (
          <div className="mt-3">
            <RhythmPatternSelectorContent
              patternType={patternType}
              setPatternType={setPatternType}
              groupedStrumPatterns={groupedStrumPatterns}
              groupedArpPatterns={groupedArpPatterns}
              preference={preference}
              onSelectPattern={onSelectPattern}
              onPreview={handlePreview}
              onOpenCustomDialog={handleOpenCustomDialog}
              onDeleteCustomPattern={onDeleteCustomPattern}
            />
          </div>
        )}

        {/* 自定义节奏型对话框 */}
        <CustomPatternDialog
          open={customDialogOpen}
          onOpenChange={setCustomDialogOpen}
          type={customDialogType}
          name={customName}
          onNameChange={setCustomName}
          input={customInput}
          onInputChange={handleInputChange}
          error={customError}
          onSave={handleSaveCustomPattern}
        />
      </div>
    );
  }

  // 完整模式
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <Music2 className="h-5 w-5 text-muted-foreground" />
        <h3 className="font-medium">节奏型</h3>
        {currentPattern && (
          <Badge variant="secondary" className="ml-auto">
            {currentPattern.name}
          </Badge>
        )}
      </div>

      <RhythmPatternSelectorContent
        patternType={patternType}
        setPatternType={setPatternType}
        groupedStrumPatterns={groupedStrumPatterns}
        groupedArpPatterns={groupedArpPatterns}
        preference={preference}
        onSelectPattern={onSelectPattern}
        onPreview={handlePreview}
        onOpenCustomDialog={handleOpenCustomDialog}
        onDeleteCustomPattern={onDeleteCustomPattern}
      />

      {currentPattern && (
        <div className="mt-4 pt-4 border-t">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{currentPattern.name}</p>
              <PatternVisualization pattern={currentPattern} />
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handlePreview(currentPattern)}
              >
                <Volume2 className="h-3.5 w-3.5 mr-1" />
                试听
              </Button>
              <Button size="sm" variant="ghost" onClick={onClearPattern}>
                清除
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 自定义节奏型对话框 */}
      <CustomPatternDialog
        open={customDialogOpen}
        onOpenChange={setCustomDialogOpen}
        type={customDialogType}
        name={customName}
        onNameChange={setCustomName}
        input={customInput}
        onInputChange={handleInputChange}
        error={customError}
        onSave={handleSaveCustomPattern}
      />
    </Card>
  );
}

// =============================================================================
// 内部组件
// =============================================================================

function RhythmPatternSelectorContent({
  patternType,
  setPatternType,
  groupedStrumPatterns,
  groupedArpPatterns,
  preference,
  onSelectPattern,
  onPreview,
  onOpenCustomDialog,
  onDeleteCustomPattern,
}: {
  patternType: 'strum' | 'arpeggio';
  setPatternType: (type: 'strum' | 'arpeggio') => void;
  groupedStrumPatterns: Record<string, (StrummingPattern | CustomRhythmPattern)[]>;
  groupedArpPatterns: Record<string, (ArpeggioPattern | CustomRhythmPattern)[]>;
  preference: RhythmPatternPreference | null;
  onSelectPattern: (type: 'strum' | 'arpeggio', patternId: string) => void;
  onPreview: (pattern: RhythmPattern | CustomRhythmPattern) => void;
  onOpenCustomDialog: (type: 'strum' | 'arpeggio') => void;
  onDeleteCustomPattern: (patternId: string) => void;
}) {
  return (
    <Tabs value={patternType} onValueChange={(v) => setPatternType(v as 'strum' | 'arpeggio')}>
      <TabsList className="grid w-full grid-cols-2 h-9">
        <TabsTrigger value="strum" className="text-xs">
          <Guitar className="h-3.5 w-3.5 mr-1.5" />
          扫弦
        </TabsTrigger>
        <TabsTrigger value="arpeggio" className="text-xs">
          <Music2 className="h-3.5 w-3.5 mr-1.5" />
          分解
        </TabsTrigger>
      </TabsList>

      <TabsContent value="strum" className="mt-3 space-y-3">
        {Object.entries(groupedStrumPatterns).map(([groupName, patterns]) => (
          patterns.length > 0 && (
            <div key={groupName}>
              <Label className="text-xs text-muted-foreground mb-2 block">{groupName}</Label>
              <div className="grid gap-2">
                {patterns.map((pattern) => (
                  <PatternCard
                    key={pattern.id}
                    pattern={pattern}
                    isSelected={preference?.patternId === pattern.id}
                    onSelect={() => onSelectPattern('strum', pattern.id)}
                    onPreview={() => onPreview(pattern)}
                    onDelete={() => onDeleteCustomPattern(pattern.id)}
                    showDelete={'isCustom' in pattern}
                  />
                ))}
              </div>
            </div>
          )
        ))}
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => onOpenCustomDialog('strum')}
        >
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          添加自定义扫弦
        </Button>
      </TabsContent>

      <TabsContent value="arpeggio" className="mt-3 space-y-3">
        {Object.entries(groupedArpPatterns).map(([groupName, patterns]) => (
          patterns.length > 0 && (
            <div key={groupName}>
              <Label className="text-xs text-muted-foreground mb-2 block">{groupName}</Label>
              <div className="grid gap-2">
                {patterns.map((pattern) => (
                  <PatternCard
                    key={pattern.id}
                    pattern={pattern}
                    isSelected={preference?.patternId === pattern.id}
                    onSelect={() => onSelectPattern('arpeggio', pattern.id)}
                    onPreview={() => onPreview(pattern)}
                    onDelete={() => onDeleteCustomPattern(pattern.id)}
                    showDelete={'isCustom' in pattern}
                  />
                ))}
              </div>
            </div>
          )
        ))}
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => onOpenCustomDialog('arpeggio')}
        >
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          添加自定义分解
        </Button>
      </TabsContent>
    </Tabs>
  );
}

function CustomPatternDialog({
  open,
  onOpenChange,
  type,
  name,
  onNameChange,
  input,
  onInputChange,
  error,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'strum' | 'arpeggio';
  name: string;
  onNameChange: (name: string) => void;
  input: string;
  onInputChange: (input: string) => void;
  error: string | null;
  onSave: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            添加自定义{type === 'strum' ? '扫弦' : '分解'}节奏型
          </DialogTitle>
          <DialogDescription>
            {type === 'strum'
              ? '使用 D（下扫）和 U（上扫）定义节奏型，用空格分隔。可用 > 标记重音，x 标记闷音。'
              : '使用数字 1-6 定义分解节奏型（1=高音弦，6=低音弦），用空格或短横线分隔。可用 > 标记重音。'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="pattern-name">名称</Label>
            <Input
              id="pattern-name"
              placeholder={type === 'strum' ? '我的扫弦节奏' : '我的分解节奏'}
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="pattern-input">节奏型</Label>
            <Textarea
              id="pattern-input"
              placeholder={type === 'strum' ? 'D DU UDU' : '6-3-2-3-1-3-2-3'}
              value={input}
              onChange={(e) => onInputChange(e.target.value)}
              className="font-mono"
              rows={2}
            />
            <p className="text-xs text-muted-foreground">
              {type === 'strum'
                ? '示例：D DU UDU、D> U D U（> 表示重音）、D x U（x 表示闷音）'
                : '示例：6-3-2-3-1-3-2-3、6>3 2 3 1>3 2 3（> 表示重音）'}
            </p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={onSave} disabled={!input.trim() || !!error}>
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// 导出组件
export default RhythmPatternSelector;
