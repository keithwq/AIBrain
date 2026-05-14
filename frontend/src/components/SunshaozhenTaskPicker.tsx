import { SUNSHAOZHEN_TASKS, type SunshaozhenTaskId, type SunshaozhenSubOption } from '../data/sunshaozhenTasks';

interface Props {
  value: SunshaozhenTaskId;
  subOption: string;
  onChange: (next: SunshaozhenTaskId) => void;
  onSubOptionChange: (nextSub: string) => void;
}

export function SunshaozhenTaskPicker({ value, subOption, onChange, onSubOptionChange }: Props) {
  const activeTask = SUNSHAOZHEN_TASKS.find(t => t.id === value);
  const activeSub: SunshaozhenSubOption | undefined = activeTask?.subOptions?.find(s => s.id === subOption);

  return (
    <section className="mt-4">
      <header className="mb-2.5 flex items-baseline justify-between">
        <h3 className="text-[13px] font-semibold tracking-tight text-stone-900">今天做哪件事</h3>
        <span className="text-[11px] text-stone-400">一次只做一件</span>
      </header>

      <div className="grid grid-cols-2 gap-1.5">
        {SUNSHAOZHEN_TASKS.map(task => {
          const active = task.id === value;
          return (
            <button
              key={task.id}
              type="button"
              onClick={() => onChange(task.id)}
              className={[
                'group relative flex flex-col items-start gap-0.5 rounded-xl px-3 py-2.5 text-left transition-all duration-150',
                active
                  ? 'bg-violet-900 text-white shadow-sm'
                  : 'bg-violet-50/70 text-stone-900 hover:bg-violet-100/80',
              ].join(' ')}
            >
              <span className={`text-[13px] font-semibold leading-tight tracking-tight ${active ? 'text-white' : 'text-stone-900'}`}>
                {task.label}
              </span>
              <span className={`text-[11px] leading-tight ${active ? 'text-white/70' : 'text-stone-500'}`}>
                {task.headline}
              </span>
            </button>
          );
        })}
      </div>

      {activeTask && (
        <div className="mt-3 rounded-xl bg-violet-50/60 p-3">
          <p className="text-[11px] leading-[1.6] text-stone-500">{activeTask.description}</p>

          {activeTask.subOptions && activeTask.subOptions.length > 0 && (
            <div className="mt-2.5">
              <label className="mb-1.5 block text-[11px] font-semibold text-stone-600">
                {activeTask.subOptionLabel ?? '选择类型'}
              </label>
              <div className="relative">
                <select
                  value={subOption}
                  onChange={e => onSubOptionChange(e.target.value)}
                  className="w-full appearance-none rounded-lg border border-violet-200 bg-white px-3 py-2 pr-8 text-[12px] font-medium text-stone-900 outline-none transition focus:border-violet-500"
                >
                  {activeTask.subOptions.map(sub => (
                    <option key={sub.id} value={sub.id}>
                      {sub.label}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400">⌄</span>
              </div>
              {activeSub && (
                <p className="mt-1.5 text-[11px] leading-relaxed text-stone-500">{activeSub.hint}</p>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
