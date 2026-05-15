/* eslint-disable react-refresh/only-export-components */
import { useMemo, type ReactNode } from 'react';

interface Props {
  content: string;
  renderMarkdown: (body: string) => ReactNode;
  onCopy: (body: string, label: string) => void;
}

interface Section {
  key: 'student' | 'teacher' | 'parent' | 'coda';
  label: string;
  shortLabel: string;
  body: string;
}

const SECTION_ORDER: Array<{ key: Section['key']; label: string; shortLabel: string; heading: RegExp }> = [
  { key: 'student', label: '学生包', shortLabel: '学生版', heading: /^##\s*学生包\s*$/m },
  { key: 'teacher', label: '老师包', shortLabel: '老师版', heading: /^##\s*老师包\s*$/m },
  { key: 'parent',  label: '家长包', shortLabel: '家长版', heading: /^##\s*家长包\s*$/m },
  { key: 'coda',    label: '双轨汇总', shortLabel: '小结',  heading: /^##\s*双轨汇总\s*$/m },
];

function parseTriPackage(content: string): Section[] | null {
  const hits = SECTION_ORDER.map(def => {
    const match = def.heading.exec(content);
    return match ? { ...def, index: match.index, headingLen: match[0].length } : null;
  }).filter((x): x is NonNullable<typeof x> => x !== null);

  if (hits.length < 2) return null;
  const hasStudent = hits.some(h => h.key === 'student');
  const hasTeacher = hits.some(h => h.key === 'teacher');
  if (!hasStudent && !hasTeacher) return null;

  hits.sort((a, b) => a.index - b.index);
  return hits.map((hit, idx) => {
    const start = hit.index + hit.headingLen;
    const end = idx + 1 < hits.length ? hits[idx + 1].index : content.length;
    return { key: hit.key, label: hit.label, shortLabel: hit.shortLabel, body: content.slice(start, end).trim() };
  }).filter(s => s.body.length > 0);
}

export function TriPackageMessage({ content, renderMarkdown, onCopy }: Props) {
  const sections = useMemo(() => parseTriPackage(content), [content]);

  if (!sections || sections.length === 0) {
    return <>{renderMarkdown(content)}</>;
  }

  // 可复制的包（排除小结）
  const copyable = sections.filter(s => s.key !== 'coda');

  return (
    <div>
      {/* 全文渲染 */}
      {renderMarkdown(content)}

      {/* 浮动操作栏 */}
      {copyable.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-stone-100 pt-3">
          <span className="text-[11px] text-stone-400">复制</span>
          {copyable.map(section => (
            <button
              key={section.key}
              type="button"
              onClick={() => onCopy(section.body, section.label)}
              className="rounded-md border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-semibold text-stone-600 transition hover:border-[#37352f]/30 hover:bg-white hover:text-[#37352f]"
            >
              {section.shortLabel}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function containsTriPackageMarkers(content: string): boolean {
  return /^##\s*(学生包|老师包|家长包)\s*$/m.test(content);
}
