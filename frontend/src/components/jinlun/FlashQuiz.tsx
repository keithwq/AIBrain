import { useState, useCallback } from 'react';
import { getQuizByDifficulty, type QuizQuestion } from '../../data/tcmQuizBank';

interface Props {
  onComplete?: (score: number, total: number) => void;
}

type Difficulty = 'beginner' | 'intermediate' | 'challenge';
const DIFFICULTIES: { id: Difficulty; label: string; color: string }[] = [
  { id: 'beginner', label: '入门', color: 'bg-emerald-500' },
  { id: 'intermediate', label: '进阶', color: 'bg-amber-500' },
  { id: 'challenge', label: '挑战', color: 'bg-red-500' },
];
const COUNTS = [5, 10, 15] as const;

type Phase = 'setup' | 'playing' | 'result';

export function FlashQuiz({ onComplete }: Props) {
  const [phase, setPhase] = useState<Phase>('setup');
  const [difficulty, setDifficulty] = useState<Difficulty>('beginner');
  const [count, setCount] = useState<number>(5);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [showExplanation, setShowExplanation] = useState(false);

  const startQuiz = useCallback(() => {
    const qs = getQuizByDifficulty(difficulty, count);
    setQuestions(qs);
    setIndex(0);
    setSelected(null);
    setScore(0);
    setStreak(0);
    setMaxStreak(0);
    setShowExplanation(false);
    setPhase('playing');
  }, [difficulty, count]);

  const handleSelect = (optIndex: number) => {
    if (selected !== null) return;
    setSelected(optIndex);
    setShowExplanation(true);
    const correct = optIndex === questions[index].answer;
    if (correct) {
      setScore(s => s + 1);
      setStreak(s => {
        const next = s + 1;
        setMaxStreak(m => Math.max(m, next));
        return next;
      });
    } else {
      setStreak(0);
    }
  };

  const handleNext = () => {
    if (index + 1 >= questions.length) {
      setPhase('result');
      onComplete?.(score, questions.length);
    } else {
      setIndex(i => i + 1);
      setSelected(null);
      setShowExplanation(false);
    }
  };

  const restart = () => {
    setPhase('setup');
    setQuestions([]);
  };

  // === Setup ===
  if (phase === 'setup') {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-md bg-[#2f251d] text-2xl text-white">考</div>
            <p className="text-sm font-semibold text-stone-900">中医闪考</p>
            <p className="mt-1 text-xs text-stone-500">本地题库，即时反馈</p>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold text-stone-600">难度</p>
            <div className="grid grid-cols-3 gap-2">
              {DIFFICULTIES.map(d => (
                <button
                  key={d.id}
                  onClick={() => setDifficulty(d.id)}
                  className={`relative rounded-md border py-3 text-center text-xs font-semibold transition ${difficulty === d.id ? 'border-[#2f251d] bg-[#2f251d] text-white' : 'border-black/10 text-stone-700 hover:bg-[#faf8f4]'}`}
                >
                  {d.label}
                  {difficulty === d.id && <span className={`absolute bottom-1 left-1/2 h-1 w-4 -translate-x-1/2 rounded-full ${d.color} opacity-80`} />}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold text-stone-600">题数</p>
            <div className="grid grid-cols-3 gap-2">
              {COUNTS.map(n => (
                <button
                  key={n}
                  onClick={() => setCount(n)}
                  className={`rounded-md border py-3 text-center text-xs font-semibold transition ${count === n ? 'border-[#2f251d] bg-[#2f251d] text-white' : 'border-black/10 text-stone-700 hover:bg-[#faf8f4]'}`}
                >
                  {n} 题
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={startQuiz}
            className="w-full rounded-md bg-[#2f251d] py-3 text-sm font-semibold text-white transition hover:bg-[#4a3728] active:scale-[0.98]"
          >
            开始挑战
          </button>
        </div>
      </div>
    );
  }

  // === Result ===
  if (phase === 'result') {
    const pct = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;
    const emoji = pct === 100 ? '🏆' : pct >= 80 ? '🎯' : pct >= 60 ? '💪' : '📚';
    const msg = pct === 100 ? '满分通关！' : pct >= 80 ? '表现优秀！' : pct >= 60 ? '继续加油！' : '多多练习！';

    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="w-full max-w-xs text-center">
          <div className="text-4xl">{emoji}</div>
          <p className="mt-3 text-lg font-semibold text-stone-950">{msg}</p>

          <div className="mt-6 grid grid-cols-3 gap-3">
            <div className="rounded-md border border-black/10 bg-[var(--bg)] py-3">
              <p className="text-xl font-bold text-[#2f251d]">{score}/{questions.length}</p>
              <p className="mt-1 text-[11px] text-stone-500">正确率</p>
            </div>
            <div className="rounded-md border border-black/10 bg-[var(--bg)] py-3">
              <p className="text-xl font-bold text-[#8a5a35]">{pct}%</p>
              <p className="mt-1 text-[11px] text-stone-500">得分</p>
            </div>
            <div className="rounded-md border border-black/10 bg-[var(--bg)] py-3">
              <p className="text-xl font-bold text-amber-600">{maxStreak}</p>
              <p className="mt-1 text-[11px] text-stone-500">最长连对</p>
            </div>
          </div>

          <div className="mt-6 flex gap-2">
            <button onClick={restart} className="flex-1 rounded-md border border-black/10 py-2.5 text-xs font-semibold text-stone-700 transition hover:bg-[#faf8f4]">
              换个难度
            </button>
            <button onClick={startQuiz} className="flex-1 rounded-md bg-[#2f251d] py-2.5 text-xs font-semibold text-white transition hover:bg-[#4a3728]">
              再来一轮
            </button>
          </div>
        </div>
      </div>
    );
  }

  // === Playing ===
  const q = questions[index];
  if (!q) return null;

  const progress = ((index + 1) / questions.length) * 100;
  const isCorrect = selected !== null && selected === q.answer;
  const diffLabel = DIFFICULTIES.find(d => d.id === difficulty);

  return (
    <div className="flex h-full flex-col p-4">
      {/* Top bar */}
      <div className="mb-4 flex items-center gap-3">
        <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-stone-100">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-[#2f251d] transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-[11px] font-bold tabular-nums text-stone-500">{index + 1}/{questions.length}</span>
      </div>

      {/* Streak indicator */}
      {streak >= 2 && (
        <div className="mb-3 flex items-center gap-1.5 self-start rounded-md bg-amber-50 border border-amber-200 px-2.5 py-1">
          <span className="text-xs">🔥</span>
          <span className="text-[11px] font-bold text-amber-700">连对 {streak}</span>
        </div>
      )}

      {/* Question card */}
      <div className="mb-4 rounded-md border border-black/10 bg-[var(--bg)] px-4 py-4">
        <div className="mb-2 flex items-center gap-2">
          <span className="rounded bg-stone-200 px-1.5 py-0.5 text-[10px] font-semibold text-stone-600">{q.category}</span>
          <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold text-white ${diffLabel?.color || 'bg-stone-400'}`}>{diffLabel?.label}</span>
        </div>
        <p className="text-sm font-semibold leading-6 text-stone-950">{q.stem}</p>
      </div>

      {/* Options */}
      <div className="flex-1 space-y-2">
        {q.options.map((opt, i) => {
          let cls = 'border-black/10 bg-white text-stone-800 hover:border-[#8a5a35]/40 hover:bg-[#faf8f4] active:scale-[0.98]';
          if (selected !== null) {
            if (i === q.answer) cls = 'border-emerald-400 bg-emerald-50 text-emerald-900';
            else if (i === selected) cls = 'border-red-300 bg-red-50 text-red-800';
            else cls = 'border-black/5 bg-white text-stone-300';
          }
          const letter = String.fromCharCode(65 + i);
          return (
            <button
              key={i}
              type="button"
              onClick={() => handleSelect(i)}
              disabled={selected !== null}
              className={`flex w-full items-start gap-3 rounded-md border px-4 py-3 text-left transition-all duration-150 ${cls}`}
            >
              <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded text-[11px] font-bold ${selected !== null && i === q.answer ? 'bg-emerald-500 text-white' : selected !== null && i === selected ? 'bg-red-400 text-white' : 'bg-stone-100 text-stone-500'}`}>
                {selected !== null && i === q.answer ? '✓' : selected !== null && i === selected ? '✗' : letter}
              </span>
              <span className="text-[13px] leading-5">{opt}</span>
            </button>
          );
        })}
      </div>

      {/* Explanation + Next */}
      {showExplanation && (
        <div className="mt-4 space-y-3">
          <div className={`rounded-md border px-3 py-2.5 text-xs leading-5 ${isCorrect ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-800'}`}>
            <span className="font-semibold">{isCorrect ? '回答正确' : '回答错误'}</span>
            <span className="mx-1.5 text-black/20">|</span>
            {q.explanation}
          </div>
          <button
            onClick={handleNext}
            className="w-full rounded-md bg-[#2f251d] py-2.5 text-sm font-semibold text-white transition hover:bg-[#4a3728] active:scale-[0.98]"
          >
            {index + 1 < questions.length ? '下一题' : '查看结果'}
          </button>
        </div>
      )}
    </div>
  );
}
