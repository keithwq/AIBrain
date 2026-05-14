import { useState } from 'react';
import { TCM_CURRICULUM, type TopicNode, type CurriculumTrack } from '../../data/tcmCurriculum';

export function CourseView() {
  const [track, setTrack] = useState<CurriculumTrack | null>(null);
  const [activeChapter, setActiveChapter] = useState<TopicNode | null>(null);
  const [activeLesson, setActiveLesson] = useState<TopicNode | null>(null);

  // === Track selection ===
  if (!track) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-4">
          <div className="text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-md bg-[#2f251d] text-2xl text-white">学</div>
            <p className="text-sm font-semibold text-stone-900">跟我学中医</p>
            <p className="mt-1 text-xs text-stone-500">本地课程，随时翻阅</p>
          </div>
          {TCM_CURRICULUM.map(t => (
            <button
              key={t.id}
              onClick={() => setTrack(t)}
              className="w-full rounded-md border border-black/10 bg-[var(--bg)] px-4 py-4 text-left transition hover:border-[#2f251d]/40 hover:bg-[#faf8f4] active:scale-[0.99]"
            >
              <span className="block text-sm font-semibold text-stone-950">{t.label}</span>
              <span className="mt-1 block text-xs text-stone-500">{t.desc}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // === Lesson content ===
  if (activeLesson) {
    return (
      <div className="flex h-full flex-col">
        <div className="shrink-0 border-b border-black/8 px-4 py-3">
          <button
            onClick={() => setActiveLesson(null)}
            className="mb-1 text-[11px] font-semibold text-[#8a5a35] hover:underline"
          >
            ← {activeChapter?.title || '返回'}
          </button>
          <h2 className="text-sm font-semibold text-stone-950">{activeLesson.title}</h2>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <div className="prose-like text-[13px] leading-7 text-stone-800 whitespace-pre-wrap">
            {activeLesson.content}
          </div>
        </div>
      </div>
    );
  }

  // === Chapter lessons list ===
  if (activeChapter) {
    return (
      <div className="flex h-full flex-col">
        <div className="shrink-0 border-b border-black/8 px-4 py-3">
          <button
            onClick={() => setActiveChapter(null)}
            className="mb-1 text-[11px] font-semibold text-[#8a5a35] hover:underline"
          >
            ← {track.label}
          </button>
          <h2 className="text-sm font-semibold text-stone-950">{activeChapter.title}</h2>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {activeChapter.children?.map((lesson, i) => (
            <button
              key={lesson.id}
              onClick={() => setActiveLesson(lesson)}
              className="flex w-full items-center gap-3 rounded-md px-3 py-3 text-left transition hover:bg-[#faf8f4]"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[var(--bg)] text-[11px] font-bold text-stone-500 border border-black/8">
                {i + 1}
              </span>
              <span className="text-[13px] font-medium text-stone-800">{lesson.title}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // === Chapter list (topic tree) ===
  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 border-b border-black/8 px-4 py-3">
        <button
          onClick={() => setTrack(null)}
          className="mb-1 text-[11px] font-semibold text-[#8a5a35] hover:underline"
        >
          ← 选择体系
        </button>
        <h2 className="text-sm font-semibold text-stone-950">{track.label}</h2>
        <p className="text-xs text-stone-500">{track.desc}</p>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {track.tree.map((chapter, i) => (
          <button
            key={chapter.id}
            onClick={() => setActiveChapter(chapter)}
            className="flex w-full items-center gap-3 rounded-md px-3 py-3.5 text-left transition hover:bg-[#faf8f4]"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#2f251d] text-xs font-bold text-white">
              {i + 1}
            </span>
            <div>
              <span className="block text-[13px] font-semibold text-stone-900">{chapter.title}</span>
              <span className="block text-[11px] text-stone-500">{chapter.children?.length || 0} 节课</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
