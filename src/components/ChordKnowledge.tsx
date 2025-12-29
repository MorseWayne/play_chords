'use client';

import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { BookOpen, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface ChordKnowledgeProps {
  trigger?: React.ReactNode;
}

const chordTypes = [
  {
    name: '大三和弦 (Major)',
    symbol: '',
    hasThird: true,
    description: '根音 + 大三度 + 五度',
    characteristics: ['明亮、欢快', '最基础的和弦类型', '广泛应用'],
    example: 'C = C + E + G',
    supported: true,
  },
  {
    name: '小三和弦 (Minor)',
    symbol: 'm',
    hasThird: true,
    description: '根音 + 小三度 + 五度',
    characteristics: ['忧郁、柔和', '与大三和弦形成对比', '广泛应用'],
    example: 'Cm = C + Eb + G',
    supported: true,
  },
  {
    name: '强力和弦 (Power Chord / 5)',
    symbol: '5',
    hasThird: false,
    description: '只包含根音和五度音，没有三度音，因此没有大小调色彩',
    characteristics: ['中性、有力', '常用于摇滚、金属、朋克', '指法简单，可移动'],
    example: 'C5 = C + G',
    supported: true,
  },
  {
    name: '挂二和弦 (Sus2)',
    symbol: 'sus2',
    hasThird: false,
    description: '用二度音替代三度音，没有大小调色彩',
    characteristics: ['中性、悬停感', '音色柔和', '常用在流行音乐中'],
    example: 'Csus2 = C + D + G',
    supported: true,
  },
  {
    name: '挂四和弦 (Sus4)',
    symbol: 'sus4',
    hasThird: false,
    description: '用四度音替代三度音，没有大小调色彩',
    characteristics: ['中性、悬停感', '有紧张感，需要解决', '常用在流行和摇滚中'],
    example: 'Csus4 = C + F + G',
    supported: true,
  },
  {
    name: '六和弦 (6)',
    symbol: '6',
    hasThird: true,
    description: '根音 + 三度 + 五度 + 六度',
    characteristics: ['明亮、简单', '结构相对简单', '色彩明亮'],
    example: 'C6 = C + E + G + A',
    supported: true,
  },
  {
    name: '增和弦 (Augmented)',
    symbol: 'aug',
    hasThird: true,
    description: '根音 + 大三度 + 增五度',
    characteristics: ['紧张、对称', '结构对称', '有紧张感'],
    example: 'Caug = C + E + G#',
    supported: true,
  },
  {
    name: '减和弦 (Diminished)',
    symbol: 'dim',
    hasThird: true,
    description: '根音 + 小三度 + 减五度',
    characteristics: ['紧张、对称', '结构对称', '有紧张感，需要解决'],
    example: 'Cdim = C + Eb + Gb',
    supported: true,
  },
];

export function ChordKnowledge({ trigger }: ChordKnowledgeProps) {
  const defaultTrigger = (
    <Button variant="outline" size="sm" className="gap-2">
      <BookOpen className="h-4 w-4" />
      <span className="hidden sm:inline">和弦知识</span>
    </Button>
  );

  return (
    <Sheet>
      <SheetTrigger asChild>
        {trigger || defaultTrigger}
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-2xl lg:max-w-3xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-2xl">和弦知识库</SheetTitle>
          <p className="text-sm text-muted-foreground mt-2">
            了解各种和弦类型的特点和应用场景
          </p>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* 通用介绍 */}
          <Card className="p-4 bg-muted/50">
            <h3 className="text-lg font-semibold mb-2">关于和弦</h3>
            <p className="text-sm text-muted-foreground">
              和弦是由三个或更多音同时发声组成的。不同的和弦类型通过改变音程关系来产生不同的色彩和情感。
              有些和弦包含三度音（决定大小调色彩），有些则用其他音替代三度音，产生中性的音色。
            </p>
          </Card>

          {/* 和弦类型列表 */}
          <div>
            <h3 className="text-lg font-semibold mb-4">和弦类型</h3>
            <div className="space-y-4">
              {chordTypes.map((chord, index) => (
                <Card key={index} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold">{chord.name}</h4>
                        {chord.symbol && (
                          <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">
                            {chord.symbol}
                          </span>
                        )}
                        {chord.supported ? (
                          <span className="text-xs px-2 py-0.5 rounded bg-green-500/10 text-green-600 dark:text-green-400 flex items-center gap-1">
                            <Check className="h-3 w-3" />
                            已支持
                          </span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 rounded bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center gap-1">
                            <X className="h-3 w-3" />
                            待支持
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{chord.description}</p>
                    </div>
                    <div className="ml-4 text-right">
                      <div className="text-xs text-muted-foreground mb-1">是否包含三度音</div>
                      {chord.hasThird ? (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400">
                          <Check className="h-3 w-3" />
                          是
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-gray-500/10 text-gray-600 dark:text-gray-400">
                          <X className="h-3 w-3" />
                          否
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium">示例：</span>
                      <code className="ml-2 px-2 py-0.5 rounded bg-muted text-foreground">
                        {chord.example}
                      </code>
                    </div>
                    <div>
                      <span className="font-medium">特点：</span>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {chord.characteristics.map((char, i) => (
                          <span
                            key={i}
                            className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground"
                          >
                            {char}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* 说明 */}
          <Card className="p-4 bg-muted/50">
            <h3 className="text-lg font-semibold mb-3">说明</h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                每种和弦类型都有其独特的音色特点和适用场景。没有三度音的和弦（如强力和弦、sus2、sus4）
                音色中性，适合需要避免大小调色彩的音乐风格。包含三度音的和弦则能明确表达大小调的情感色彩。
              </p>
              <p>
                在实际演奏中，可以根据音乐风格、情感表达和指法难度来选择合适的和弦类型。
              </p>
            </div>
          </Card>
        </div>
      </SheetContent>
    </Sheet>
  );
}

