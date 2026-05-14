import { useMemo } from 'react';

interface Props {
  content: string;
  streaming: boolean;
}

interface FormulaData {
  name: string;
  source: string;
  composition: string;
  analysis: string;
  effects: string;
  scenarios: string;
  modifications: string;
  cautions: string;
}

function parseFormula(content: string): FormulaData | null {
  if (!content || content.length < 50) return null;
  const sections: FormulaData = { name: '', source: '', composition: '', analysis: '', effects: '', scenarios: '', modifications: '', cautions: '' };
  const lines = content.split('\n');
  let currentKey: keyof FormulaData | null = null;

  for (const line of lines) {
    const lower = line.toLowerCase();
    if (/方剂名|方名|名称/.test(line) && line.includes('：')) { sections.name = line.split('：').slice(1).join('：').trim(); continue; }
    if (/出处|来源|出自/.test(lower)) { currentKey = 'source'; if (line.includes('：')) { sections.source = line.split('：').slice(1).join('：').trim(); continue; } }
    else if (/组成|药物组成|方药/.test(lower)) { currentKey = 'composition'; if (line.includes('：')) { sections.composition = line.split('：').slice(1).join('：').trim(); continue; } }
    else if (/君臣佐使|方解|配伍/.test(lower)) { currentKey = 'analysis'; }
    else if (/功效|主治|功能/.test(lower)) { currentKey = 'effects'; }
    else if (/适用|场景|应用/.test(lower)) { currentKey = 'scenarios'; }
    else if (/加减|化裁|变化/.test(lower)) { currentKey = 'modifications'; }
    else if (/注意|禁忌|慎用/.test(lower)) { currentKey = 'cautions'; }

    if (currentKey && line.trim()) {
      sections[currentKey] += (sections[currentKey] ? '\n' : '') + line.trim();
    }
  }
  return sections.name || sections.composition ? sections : null;
}

const SECTION_CONFIG: Array<{ key: keyof FormulaData; label: string; color: string }> = [
  { key: 'source', label: '出处', color: 'text-[#8a5a35]' },
  { key: 'composition', label: '组成', color: 'text-stone-900' },
  { key: 'analysis', label: '君臣佐使', color: 'text-stone-800' },
  { key: 'effects', label: '功效主治', color: 'text-stone-800' },
  { key: 'scenarios', label: '适用场景', color: 'text-stone-700' },
  { key: 'modifications', label: '加减化裁', color: 'text-stone-700' },
  { key: 'cautions', label: '注意事项', color: 'text-red-700' },
];

export function FormulaCard({ content, streaming }: Props) {
  const data = useMemo(() => parseFormula(content), [content]);

  if (!data) {
    return (
      <div className="flex h-full items-center justify-center">
        {streaming ? (
          <div className="text-center">
            <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-[#2f251d] border-t-transparent" />
            <p className="mt-3 text-xs text-stone-500">正在解读...</p>
          </div>
        ) : (
          <p className="text-xs text-stone-400">选择或输入方剂开始解读</p>
        )}
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-4">
      {data.name && <h2 className="mb-4 text-lg font-semibold text-stone-950">{data.name}</h2>}
      <div className="space-y-3">
        {SECTION_CONFIG.map(({ key, label, color }) => {
          const value = data[key];
          if (!value) return null;
          return (
            <div key={key} className="rounded-md border border-black/8 bg-[var(--bg)] p-3">
              <p className={`text-[11px] font-semibold ${color}`}>{label}</p>
              <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-stone-700">{value}</p>
            </div>
          );
        })}
      </div>
      {streaming && <div className="mt-3 h-1 w-12 animate-pulse rounded-full bg-[#2f251d]/20" />}
    </div>
  );
}
