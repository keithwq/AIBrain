import { QINGHE_WRITING_TASKS, type QingheWritingTaskId } from '../data/qingheWritingTasks';

interface Props {
  value: QingheWritingTaskId;
  subOption: string;
  onChange: (next: QingheWritingTaskId) => void;
  onSubOptionChange: (nextSub: string) => void;
}

export function QingheWritingTaskPicker({ value, subOption, onChange, onSubOptionChange }: Props) {
  return (
    <section className="mt-4">
      <header className="mb-2 flex items-baseline justify-between">
        <h3 className="text-xs font-semibold text-[#787774]">今天做哪件事</h3>
        <span className="text-[11px] text-[#b0aca6]">一次只做一件</span>
      </header>

      <div className="grid grid-cols-2 gap-1.5">
        {QINGHE_WRITING_TASKS.map(task => {
          const active = task.id === value;

          if (active) {
            const activeSub = task.subOptions?.find(s => s.id === subOption);
            return (
              <div
                key={task.id}
                className="mm-task-active col-span-2 flex flex-col px-3 py-3"
              >
                <span className="text-[13px] font-semibold leading-tight text-[#37352f]">
                  {task.label}
                </span>
                <span className="mt-0.5 text-[11px] leading-tight text-[#787774]">
                  {task.headline}
                </span>

                {task.subOptions && task.subOptions.length > 0 && (
                  <div className="mt-3">
                    <label className="mb-1.5 block text-[11px] font-semibold text-[#787774]">
                      {task.subOptionLabel || '选择类型'}
                    </label>
                    <div className="relative">
                      <select
                        value={subOption}
                        onChange={e => onSubOptionChange(e.target.value)}
                        className="mm-select w-full px-3 py-2 pr-8 text-[12px] font-medium"
                      >
                        {task.subOptions.map(sub => (
                          <option key={sub.id} value={sub.id}>
                            {sub.label}
                          </option>
                        ))}
                      </select>
                      <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#b0aca6]">⌄</span>
                    </div>
                    {activeSub && (
                      <p className="mt-1.5 text-[11px] leading-relaxed text-[#787774]">{activeSub.hint}</p>
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
              className="mm-task-idle flex flex-col items-start gap-0.5 px-3 py-2.5 text-left"
            >
              <span className="text-[13px] font-semibold leading-tight text-[#37352f]">
                {task.label}
              </span>
              <span className="text-[11px] leading-tight text-[#787774]">
                {task.headline}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
