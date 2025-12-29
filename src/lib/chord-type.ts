import type { ChordPosition } from '@/lib/chords';

// ============================================================
// 和弦类型检测
// ============================================================

export interface ChordTypeInfo {
  shape: string;        // CAGED 形状: E型, A型, C型, D型, G型, 或其他
  isOpen: boolean;      // 是否为开放和弦
  isBarre: boolean;     // 是否为封闭和弦（横按）
  hasOpenStrings: boolean; // 是否包含开放弦
}

export function detectChordType(pos: ChordPosition): ChordTypeInfo {
  const frets = pos.frets;
  const barres = pos.barres || [];
  
  // 检测是否有开放弦
  const hasOpenStrings = frets.some(f => f === 0);
  
  // 检测是否有横按
  const isBarre = barres.length > 0;
  
  // 获取最低非零品位
  const positiveFrets = frets.filter(f => f > 0);
  const minFret = positiveFrets.length > 0 ? Math.min(...positiveFrets) : 0;
  
  // 开放和弦判断：有开放弦且最低品位在前3品内
  const isOpen = hasOpenStrings && minFret <= 3 && !isBarre;
  
  // 检测 CAGED 形状
  const shape = detectCAGEDShape(frets, barres, minFret);
  
  return {
    shape,
    isOpen,
    isBarre,
    hasOpenStrings,
  };
}

function detectCAGEDShape(frets: number[], barres: number[], minFret: number): string {
  // frets 顺序: [E低, A, D, G, B, E高]
  const [e6, a5, d4, g3, b2, e1] = frets;
  
  // 判断哪些弦被使用
  const e6Used = e6 >= 0;
  const a5Used = a5 >= 0;
  const e6Muted = e6 === -1;
  const a5Muted = a5 === -1;
  
  // E型特征：根音在低音E弦，6弦都使用或只静音高音弦
  // 相对形状类似: [0, 2, 2, 1, 0, 0] 或有横按
  if (e6Used && e6 > 0 && barres.length > 0) {
    // 检查是否是 E型 横按
    const barrePos = barres[0];
    if (e6 === barrePos) {
      // 检查形状是否符合 E型 (大三/小三/七和弦等)
      const relA = a5 - e6;
      const relD = d4 - e6;
      if (relA === 2 && relD === 2) {
        return 'E型';
      }
    }
  }
  
  // A型特征：根音在A弦，低音E弦静音，有横按
  // 相对形状类似: [-1, 0, 2, 2, 2, 0]
  if (e6Muted && a5Used && a5 > 0 && barres.length > 0) {
    const barrePos = barres[0];
    if (a5 === barrePos) {
      const relD = d4 - a5;
      const relG = g3 - a5;
      const relB = b2 - a5;
      if (relD === 2 && relG === 2 && (relB === 2 || relB === 1)) {
        return 'A型';
      }
    }
  }
  
  // D型特征：根音在D弦，低音弦静音
  // 形状类似: [-1, -1, 0, 2, 3, 2]
  if (e6Muted && a5Muted && d4 >= 0) {
    const relG = g3 > 0 ? g3 - (d4 > 0 ? d4 : minFret) : -1;
    const relB = b2 > 0 ? b2 - (d4 > 0 ? d4 : minFret) : -1;
    if (relG >= 1 && relG <= 3 && relB >= 2 && relB <= 4) {
      return 'D型';
    }
  }
  
  // C型特征（开放C和弦形状）
  // 形状类似: [-1, 3, 2, 0, 1, 0]
  if (e6Muted && a5Used) {
    const relD = d4 > 0 ? d4 - a5 : -10;
    const relG = g3;  // G弦通常是开放
    const relB = b2 > 0 ? b2 - a5 : -10;
    if (relD === -1 && relG === 0 && relB === -2) {
      return 'C型';
    }
  }
  
  // G型特征（开放G和弦形状）
  // 形状类似: [3, 2, 0, 0, 0, 3] 或 [3, 2, 0, 0, 3, 3]
  if (e6Used && e6 > 0 && a5Used && a5 > 0 && d4 === 0) {
    return 'G型';
  }
  
  // 检测纯开放和弦形状
  if (minFret <= 3) {
    // 开放 E 型
    if (e6 === 0 && a5 === 2 && d4 === 2 && (g3 === 1 || g3 === 0) && b2 === 0 && e1 === 0) {
      return 'E型';
    }
    // 开放 A 型
    if (e6Muted && a5 === 0 && d4 === 2 && g3 === 2 && b2 === 2 && e1 === 0) {
      return 'A型';
    }
    // 开放 D 型
    if (e6Muted && a5Muted && d4 === 0 && g3 === 2 && b2 === 3 && e1 === 2) {
      return 'D型';
    }
    // 开放 C 型
    if (e6Muted && a5 === 3 && d4 === 2 && g3 === 0 && b2 === 1 && e1 === 0) {
      return 'C型';
    }
    // 开放 G 型
    if (e6 === 3 && a5 === 2 && d4 === 0 && g3 === 0 && (b2 === 0 || b2 === 3) && e1 === 3) {
      return 'G型';
    }
  }
  
  // 检测移调后的形状
  if (barres.length > 0) {
    const barrePos = barres[0];
    const relFrets = frets.map(f => f > 0 ? f - barrePos : f);
    
    // E型横按检测
    if (relFrets[0] === 0 && relFrets[1] === 2 && relFrets[2] === 2) {
      return 'E型';
    }
    // A型横按检测
    if (relFrets[0] === -1 && relFrets[1] === 0 && relFrets[2] === 2 && relFrets[3] === 2) {
      return 'A型';
    }
  }
  
  // 无法确定具体形状
  return '';
}

// 获取和弦类型的显示标签
export function getChordTypeLabels(info: ChordTypeInfo): string[] {
  const labels: string[] = [];
  
  // 添加 CAGED 形状
  if (info.shape) {
    labels.push(info.shape);
  }
  
  // 添加开放/封闭标签
  if (info.isOpen) {
    labels.push('开放');
  } else if (info.isBarre) {
    labels.push('封闭');
  } else if (info.hasOpenStrings) {
    labels.push('半开放');
  }
  
  return labels;
}

// 获取类型标签的样式
export function getChordTypeBadgeStyle(label: string): string {
  if (label.includes('型')) {
    return 'bg-primary/90 text-primary-foreground';
  }
  if (label === '开放') {
    return 'bg-emerald-500/90 text-white';
  }
  if (label === '封闭') {
    return 'bg-amber-500/90 text-white';
  }
  if (label === '半开放') {
    return 'bg-sky-500/90 text-white';
  }
  return 'bg-muted text-muted-foreground';
}

