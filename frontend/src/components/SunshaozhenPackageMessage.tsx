import { useMemo, useState, type ReactNode } from 'react';

interface Props {
  content: string;
  renderMarkdown: (body: string) => ReactNode;
  onCopy: (body: string, label: string) => void;
}

type SectionKey = 'podium' | 'board' | 'worksheet' | 'notes' | 'test-paper' | 'answer-key' | 'lesson-plan' | 'slides' | 'script' | 'coda';

interface SectionDef {
  key: SectionKey;
  label: string;
  hint: string;
  heading: RegExp;
}

interface Section {
  key: SectionKey;
  label: string;
  hint: string;
  body: string;
}

// 所有可能出现的成品块。不同任务会用不同组合。
const SECTION_DEFS: SectionDef[] = [
  { key: 'podium', label: '讲台包', hint: '老师课上直接念的话术', heading: /^##\s*讲台包\s*$/m },
  { key: 'board', label: '板书包', hint: '可直接投影/写板书', heading: /^##\s*板书包\s*$/m },
  { key: 'worksheet', label: '学生单', hint: '发给学生的任务单', heading: /^##\s*学生单\s*$/m },
  { key: 'notes', label: '备课札记', hint: '老师自己理解用', heading: /^##\s*备课札记\s*$/m },
  { key: 'lesson-plan', label: '教案', hint: '完整教案成品', heading: /^##\s*教案\s*$/m },
  { key: 'slides', label: 'PPT 骨架', hint: '逐页可投影', heading: /^##\s*PPT\s*骨架\s*$/m },
  { key: 'script', label: '逐字稿', hint: '分钟级课堂话术', heading: /^##\s*逐字稿\s*$/m },
  { key: 'test-paper', label: '试卷', hint: '学生作答用', heading: /^##\s*试卷\s*$/m },
  { key: 'answer-key', label: '参考方向', hint: '老师阅卷用', heading: /^##\s*参考方向\s*$/m },
  { key: 'coda', label: '双轨汇总', hint: '文学理解 / 阅读题应对', heading: /^##\s*双轨汇总\s*$/m },
];

function parsePackage(content: string): Section[] | null {
  const hits = SECTION_DEFS.map(def => {
    const match = def.heading.exec(content);
    return match ? { ...def, index: match.index, headingLen: match[0].length } : null;
  }).filter((x): x is NonNullable<typeof x> => x !== null);

  if (hits.length < 2) return null;

  hits.sort((a, b) => a.index - b.index);
  const sections: Section[] = hits.map((hit, idx) => {
    const start = hit.index + hit.headingLen;
    const end = idx + 1 < hits.length ? hits[idx + 1].index : content.length;
    return { key: hit.key, label: hit.label, hint: hit.hint, body: content.slice(start, end).trim() };
  });
  return sections.filter(section => section.body.length > 0);
}

export function SunshaozhenPackageMessage({ content, renderMarkdown, onCopy }: Props) {
  const sections = useMemo(() => parsePackage(content), [content]);
  const [active, setActive] = useState<SectionKey | null>(null);

  if (!sections || sections.length === 0) {
    return <>{renderMarkdown(content)}</>;
  }

  const activeKey = active ?? sections[0].key;
  const activeSection = sections.find(s => s.key === activeKey) ?? sections[0];

  const preamble = (() => {
    const firstIdx = content.search(/^##\s*(讲台包|板书包|学生单|备课札记|教案|PPT\s*骨架|逐字稿|试卷|参考方向|双轨汇总)\s*$/m);
    if (firstIdx <= 0) return '';
    return content.slice(0, firstIdx).trim();
  })();

  return (
    <div className="space-y-3">
      {preamble && (
        <div className="rounded-2xl bg-violet-50/60 px-3 py-2.5 text-[13px] leading-6 text-stone-700">
          {renderMarkdown(preamble)}
        </div>
      )}
      <div className="flex flex-wrap gap-1 border-b border-violet-200">
        {sections.map(section => {
          const isActive = section.key === activeSection.key;
          return (
            <button
              key={section.key}
              type="button"
              onClick={() => setActive(section.key)}
              className={`relative -mb-px rounded-t-xl border border-b-0 px-3 py-1.5 text-xs font-black transition ${
                isActive
                  ? 'border-violet-800 bg-white text-violet-900'
                  : 'border-transparent text-stone-500 hover:text-stone-800'
              }`}
              title={section.hint}
            >
              {section.label}
            </button>
          );
        })}
        <div className="ml-auto flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onCopy(activeSection.body, activeSection.label)}
            className="rounded-full border border-violet-200 bg-white px-2.5 py-1 text-[11px] text-stone-600 transition hover:border-violet-500 hover:text-violet-800"
            title={`复制${activeSection.label}`}
          >
            复制{activeSection.label}
          </button>
          <button
            type="button"
            onClick={() => {
              const all = sections.map(s => `## ${s.label}\n\n${s.body}`).join('\n\n');
              onCopy(all, '全部成品');
            }}
            className="rounded-full border border-violet-200 bg-white px-2.5 py-1 text-[11px] text-stone-600 transition hover:border-violet-500 hover:text-violet-800"
            title="复制全部成品"
          >
            全部
          </button>
        </div>
      </div>
      <div className="flex items-center gap-2 text-[11px] text-stone-400">
        <span>{activeSection.hint}</span>
      </div>
      <div className="pt-1">{renderMarkdown(activeSection.body)}</div>
    </div>
  );
}

export function containsSunshaozhenPackageMarkers(content: string): boolean {
  return /^##\s*(讲台包|板书包|学生单|备课札记|教案|PPT\s*骨架|逐字稿|试卷|参考方向|双轨汇总)\s*$/m.test(content);
}
