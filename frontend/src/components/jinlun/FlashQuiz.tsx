import { useCallback, useState } from 'react';
import { getQuizByDifficulty, type QuizQuestion } from '../../data/tcmQuizBank';

interface Props {
  onComplete?: (score: number, total: number) => void;
}

type Difficulty = 'beginner' | 'intermediate' | 'challenge';
type Phase = 'setup' | 'playing' | 'result';

const DIFFICULTIES: Array<{
  id: Difficulty;
  label: string;
  title: string;
  scene: string;
  accent: string;
  bg: string;
}> = [
  { id: 'beginner', label: '入门', title: '药铺小学徒', scene: '先认清五脏、五味、四季养生这些地基。', accent: 'bg-emerald-600', bg: 'bg-emerald-50' },
  { id: 'intermediate', label: '进阶', title: '坐堂小先生', scene: '开始辨方、辨证、辨配伍，像在柜台前接一张小考单。', accent: 'bg-amber-600', bg: 'bg-amber-50' },
  { id: 'challenge', label: '挑战', title: '夜读医案局', scene: '经典条文和方药细节会一起上桌，适合硬核复盘。', accent: 'bg-red-600', bg: 'bg-red-50' },
];

const COUNTS = [5, 10, 15] as const;

const OPTION_TONES = [
  'from-emerald-50 to-white',
  'from-amber-50 to-white',
  'from-sky-50 to-white',
  'from-rose-50 to-white',
];

function getQuestionScene(question: QuizQuestion, index: number) {
  const prefix = question.category === '方剂' ? '方柜抽屉' : question.category === '诊断' ? '望闻问切' : question.category === '中药' ? '药材案台' : question.category === '养生' ? '四时茶席' : '基础罗盘';
  return `${prefix} · 第 ${index + 1} 题`;
}

function getResultCopy(pct: number) {
  if (pct === 100) return { mark: '甲', title: '满分出馆', note: '这轮像把药柜标签重新贴了一遍，清楚。' };
  if (pct >= 80) return { mark: '乙', title: '火候很稳', note: '大方向抓得住，剩下是把细节磨亮。' };
  if (pct >= 60) return { mark: '丙', title: '已经入门', note: '框架有了，再刷一轮会明显顺手。' };
  return { mark: '丁', title: '先把地基夯实', note: '别急，先认脏腑、性味、方名这几根主梁。' };
}

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

  const difficultyMeta = DIFFICULTIES.find(item => item.id === difficulty) || DIFFICULTIES[0];

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
      const finalScore = score + (selected === questions[index].answer ? 1 : 0);
      setPhase('result');
      onComplete?.(finalScore, questions.length);
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

  if (phase === 'setup') {
    return (
      <div className="h-full overflow-y-auto bg-[#fbfaf7] p-5">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-md border border-black/10 bg-white p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold text-[#8a5a35]">中医闪考</p>
                <h2 className="mt-1 text-xl font-semibold text-stone-950">开一局小药铺闯关</h2>
                <p className="mt-2 max-w-xl text-sm leading-6 text-stone-500">每题像一张柜台小纸条：先判断，再看解释。答对会连击，答错马上补一刀知识点。</p>
              </div>
              <div className="grid h-16 w-16 place-items-center rounded-md bg-[#2f251d] text-2xl font-semibold text-white">考</div>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {DIFFICULTIES.map(item => {
              const active = item.id === difficulty;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setDifficulty(item.id)}
                  className={`rounded-md border p-4 text-left transition ${active ? 'border-[#2f251d] bg-white shadow-sm' : 'border-black/10 bg-white/70 hover:bg-white'}`}
                >
                  <span className={`inline-flex rounded px-2 py-1 text-[11px] font-semibold text-white ${item.accent}`}>{item.label}</span>
                  <p className="mt-3 text-sm font-semibold text-stone-950">{item.title}</p>
                  <p className="mt-1 text-xs leading-5 text-stone-500">{item.scene}</p>
                </button>
              );
            })}
          </div>

          <div className="mt-4 rounded-md border border-black/10 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-semibold text-stone-700">本局题量</p>
              <p className="text-[11px] text-stone-400">短局热身，长局练熟</p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {COUNTS.map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setCount(n)}
                  className={`rounded-md border py-3 text-center text-sm font-semibold transition ${count === n ? 'border-[#2f251d] bg-[#2f251d] text-white' : 'border-black/10 text-stone-700 hover:bg-[#faf8f4]'}`}
                >
                  {n} 题
                </button>
              ))}
            </div>
          </div>

          <button onClick={startQuiz} className="mt-4 w-full rounded-md bg-[#2f251d] py-3 text-sm font-semibold text-white transition hover:bg-[#4a3728] active:scale-[0.99]">
            开始闯关
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'result') {
    const pct = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;
    const copy = getResultCopy(pct);

    return (
      <div className="flex h-full items-center justify-center bg-[#fbfaf7] p-6">
        <div className="w-full max-w-lg rounded-md border border-black/10 bg-white p-6 text-center">
          <div className="mx-auto grid h-20 w-20 place-items-center rounded-md bg-[#2f251d] text-4xl font-semibold text-white">{copy.mark}</div>
          <h2 className="mt-4 text-xl font-semibold text-stone-950">{copy.title}</h2>
          <p className="mt-2 text-sm leading-6 text-stone-500">{copy.note}</p>

          <div className="mt-6 grid grid-cols-3 gap-3">
            <div className="rounded-md border border-black/10 bg-[#faf8f4] py-3">
              <p className="text-xl font-semibold text-[#2f251d]">{score}/{questions.length}</p>
              <p className="mt-1 text-[11px] text-stone-500">答对</p>
            </div>
            <div className="rounded-md border border-black/10 bg-[#faf8f4] py-3">
              <p className="text-xl font-semibold text-[#8a5a35]">{pct}%</p>
              <p className="mt-1 text-[11px] text-stone-500">掌握度</p>
            </div>
            <div className="rounded-md border border-black/10 bg-[#faf8f4] py-3">
              <p className="text-xl font-semibold text-amber-700">{maxStreak}</p>
              <p className="mt-1 text-[11px] text-stone-500">最长连击</p>
            </div>
          </div>

          <div className="mt-6 flex gap-2">
            <button onClick={restart} className="flex-1 rounded-md border border-black/10 py-2.5 text-xs font-semibold text-stone-700 transition hover:bg-[#faf8f4]">换个局</button>
            <button onClick={startQuiz} className="flex-1 rounded-md bg-[#2f251d] py-2.5 text-xs font-semibold text-white transition hover:bg-[#4a3728]">再刷一轮</button>
          </div>
        </div>
      </div>
    );
  }

  const q = questions[index];
  if (!q) return null;

  const progress = ((index + 1) / questions.length) * 100;
  const isCorrect = selected !== null && selected === q.answer;
  const scene = getQuestionScene(q, index);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#fbfaf7]">
      <div className="shrink-0 border-b border-black/8 bg-white p-4">
        <div className="mb-3 flex items-center gap-3">
          <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-stone-100">
            <div className="absolute inset-y-0 left-0 rounded-full bg-[#2f251d] transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
          <span className="text-[11px] font-semibold tabular-nums text-stone-500">{index + 1}/{questions.length}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded bg-stone-100 px-2 py-1 text-[11px] font-semibold text-stone-600">{scene}</span>
          <span className={`rounded px-2 py-1 text-[11px] font-semibold text-white ${difficultyMeta.accent}`}>{difficultyMeta.title}</span>
          {streak >= 2 && <span className="rounded bg-amber-100 px-2 py-1 text-[11px] font-semibold text-amber-800">连击 {streak}</span>}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        <div className="rounded-md border border-black/10 bg-white p-5 shadow-sm">
          <p className="text-[11px] font-semibold text-[#8a5a35]">{q.category}</p>
          <h2 className="mt-2 text-xl font-semibold leading-8 text-stone-950">{q.stem}</h2>
          <p className="mt-2 text-xs leading-5 text-stone-500">先别急着蒙，把它当成柜台上一张小便签：它真正问的是哪条主线？</p>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {q.options.map((opt, i) => {
            let stateClass = 'border-black/10 bg-white hover:border-[#8a5a35]/40 hover:shadow-sm';
            if (selected !== null) {
              if (i === q.answer) stateClass = 'border-emerald-500 bg-emerald-50';
              else if (i === selected) stateClass = 'border-red-400 bg-red-50';
              else stateClass = 'border-black/5 bg-white opacity-45';
            }
            const letter = String.fromCharCode(65 + i);
            return (
              <button
                key={i}
                type="button"
                onClick={() => handleSelect(i)}
                disabled={selected !== null}
                className={`group min-h-[96px] rounded-md border bg-gradient-to-br ${OPTION_TONES[i % OPTION_TONES.length]} p-4 text-left transition active:scale-[0.99] ${stateClass}`}
              >
                <div className="flex items-start gap-3">
                  <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-md text-sm font-semibold ${selected !== null && i === q.answer ? 'bg-emerald-600 text-white' : selected !== null && i === selected ? 'bg-red-500 text-white' : 'bg-white text-stone-500 ring-1 ring-black/8'}`}>
                    {selected !== null && i === q.answer ? '✓' : selected !== null && i === selected ? '×' : letter}
                  </span>
                  <div>
                    <p className="text-base font-semibold leading-6 text-stone-900">{opt}</p>
                    <p className="mt-1 text-[11px] leading-4 text-stone-400">{selected === null ? '点一下，马上揭晓' : i === q.answer ? '这味是正解' : i === selected ? '这里走岔了' : '本题旁观席'}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {showExplanation && (
          <div className={`mt-4 rounded-md border p-4 ${isCorrect ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}`}>
            <p className={`text-sm font-semibold ${isCorrect ? 'text-emerald-900' : 'text-red-900'}`}>{isCorrect ? '答对了，脉路很清楚' : '这题没中，但知识点捞到了'}</p>
            <p className={`mt-2 text-sm leading-6 ${isCorrect ? 'text-emerald-800' : 'text-red-800'}`}>{q.explanation}</p>
            <button onClick={handleNext} className="mt-4 w-full rounded-md bg-[#2f251d] py-2.5 text-sm font-semibold text-white transition hover:bg-[#4a3728]">
              {index + 1 < questions.length ? '下一张小纸条' : '看本局战绩'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
