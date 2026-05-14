import { ANRAN_LAOSHI_TASKS, type AnranLaoshiTaskId } from '../data/anranLaoshiTasks';

interface Props {
  value: AnranLaoshiTaskId;
  subOption: string;
  onChange: (next: AnranLaoshiTaskId) => void;
  onSubOptionChange: (nextSub: string) => void;
}

export function AnranLaoshiTaskPicker({ value, subOption, onChange, onSubOptionChange }: Props) {
  return (
    <section className="space-y-2">
      <div className="grid gap-2">
        {ANRAN_LAOSHI_TASKS.map(task => {
          const active = task.id === value;

          if (active) {
            const activeSub = task.subOptions?.find(s => s.id === subOption);
            return (
              <div
                key={task.id}
                className="overflow-hidden rounded-2xl border border-[#eadfce] bg-white p-2"
              >
                <div className="rounded-xl bg-[#2f251d] px-2.5 py-2 text-left text-white">
                  <span className="block text-[13px] font-semibold">{task.label}</span>
                  <span className="mt-1 block whitespace-normal break-words text-[11px] leading-4 text-white/70">{task.headline}</span>
                </div>

                {task.subOptions && task.subOptions.length > 0 && (
                  <div className="mt-2">
                    <label className="mb-1.5 block px-1 text-[11px] font-semibold text-stone-500">
                      {task.subOptionLabel || '选择类型'}
                    </label>
                    <div className="relative">
                      <select
                        value={subOption}
                        onChange={e => onSubOptionChange(e.target.value)}
                        className="h-9 w-full appearance-none rounded-xl border border-[#eadfce] bg-[#fffdf8] px-3 pr-8 text-[12px] font-medium text-stone-800 outline-none focus:border-[#8a5a35]"
                      >
                        {task.subOptions.map(sub => (
                          <option key={sub.id} value={sub.id}>
                            {sub.label}
                          </option>
                        ))}
                      </select>
                      <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400">⌄</span>
                    </div>
                    {activeSub && (
                      <p className="mt-1.5 px-1 text-[11px] leading-relaxed text-stone-500">{activeSub.hint}</p>
                    )}
                  </div>
                )}
              </div>
            );
          }

          return (
            <button
              key={task.id}
              type="button"
              onClick={() => onChange(task.id)}
              className="rounded-2xl border border-[#eadfce] bg-white px-3 py-2.5 text-left transition hover:border-[#d8c5aa] hover:bg-[#fffdf8]"
            >
              <span className="block text-[13px] font-semibold leading-tight text-stone-800">
                {task.label}
              </span>
              <span className="mt-1 block text-[11px] leading-4 text-stone-500">
                {task.headline}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
