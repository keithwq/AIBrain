import { MINGHENG_FAWU_TASKS, type MinghengFawuTaskId } from '../data/minghengFawuTasks';

interface Props {
  value: MinghengFawuTaskId;
  onChange: (next: MinghengFawuTaskId) => void;
}

export function MinghengFawuTaskPicker({ value, onChange }: Props) {
  return (
    <section className="mt-4">
      <header className="mb-2.5 flex items-baseline justify-between">
        <h3 className="text-[13px] font-semibold tracking-tight text-stone-900">今天遇到哪种风险</h3>
        <span className="text-[11px] text-stone-400">先别急着出口气</span>
      </header>

      <div className="grid grid-cols-2 gap-1.5">
        {MINGHENG_FAWU_TASKS.map(task => {
          const active = task.id === value;

          if (active) {
            return (
              <div
                key={task.id}
                className="col-span-2 flex flex-col rounded-xl border border-blue-700/40 bg-blue-50/70 px-3.5 py-3 text-blue-950 shadow-sm transition-all duration-150"
              >
                <span className="text-[13px] font-semibold leading-tight tracking-tight text-blue-950">
                  {task.label}
                </span>
                <span className="mt-0.5 text-[11px] leading-tight text-blue-900/70">
                  {task.headline}
                </span>
                <p className="mt-2 text-[11px] leading-relaxed text-blue-900/70">{task.description}</p>
              </div>
            );
          }

          return (
            <button
              key={task.id}
              type="button"
              onClick={() => onChange(task.id)}
              className="flex flex-col items-start gap-0.5 rounded-xl bg-stone-100/70 px-3 py-2.5 text-left text-stone-900 transition-all duration-150 hover:bg-stone-200/80"
            >
              <span className="text-[13px] font-semibold leading-tight tracking-tight">
                {task.label}
              </span>
              <span className="text-[11px] leading-tight text-stone-500">
                {task.headline}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
