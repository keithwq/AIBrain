import { useMemo } from 'react';

interface Props {
  content: string;
  streaming: boolean;
}

interface DayMenu {
  day: string;
  breakfast: string;
  lunch: string;
  dinner: string;
}

function parseWeeklyMenu(content: string): { days: DayMenu[]; shoppingList: string; tips: string } {
  const days: DayMenu[] = [];
  let shoppingList = '';
  let tips = '';

  const dayNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日'];
  const lines = content.split('\n');
  let currentDay: DayMenu | null = null;
  let section: 'menu' | 'shopping' | 'tips' = 'menu';

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (/采购|购物|食材清单/.test(trimmed)) { section = 'shopping'; continue; }
    if (/备餐|建议|提示|注意/.test(trimmed) && section === 'shopping') { section = 'tips'; continue; }

    if (section === 'shopping') { shoppingList += (shoppingList ? '\n' : '') + trimmed; continue; }
    if (section === 'tips') { tips += (tips ? '\n' : '') + trimmed; continue; }

    const dayMatch = dayNames.find(d => trimmed.includes(d));
    if (dayMatch) {
      if (currentDay) days.push(currentDay);
      const normalized = dayMatch.replace('星期', '周').replace('星期一', '周一').replace('星期二', '周二').replace('星期三', '周三').replace('星期四', '周四').replace('星期五', '周五').replace('星期六', '周六').replace('星期日', '周日');
      currentDay = { day: normalized.startsWith('周') ? normalized : `周${normalized}`, breakfast: '', lunch: '', dinner: '' };
      continue;
    }

    if (currentDay) {
      if (/早餐|早/.test(trimmed)) currentDay.breakfast = trimmed.replace(/^早餐[：:]\s*/, '').replace(/^早[：:]\s*/, '');
      else if (/午餐|午|中餐/.test(trimmed)) currentDay.lunch = trimmed.replace(/^午餐[：:]\s*/, '').replace(/^午[：:]\s*/, '').replace(/^中餐[：:]\s*/, '');
      else if (/晚餐|晚/.test(trimmed)) currentDay.dinner = trimmed.replace(/^晚餐[：:]\s*/, '').replace(/^晚[：:]\s*/, '');
    }
  }
  if (currentDay) days.push(currentDay);

  return { days, shoppingList, tips };
}

export function WeeklyMenuView({ content, streaming }: Props) {
  const data = useMemo(() => parseWeeklyMenu(content), [content]);

  if (!content && !streaming) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-xs text-stone-400">填写家庭情况后生成周菜谱</p>
      </div>
    );
  }

  if (streaming && data.days.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-[#2f251d] border-t-transparent" />
          <p className="mt-3 text-xs text-stone-500">定制中...</p>
        </div>
      </div>
    );
  }

  if (data.days.length === 0) {
    return (
      <div className="h-full overflow-y-auto p-4 text-xs leading-6 text-stone-700 whitespace-pre-wrap">
        {content}
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-4">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="border-b border-black/10">
            <th className="px-2 py-2 text-left font-semibold text-stone-500"></th>
            <th className="px-2 py-2 text-left font-semibold text-stone-700">早餐</th>
            <th className="px-2 py-2 text-left font-semibold text-stone-700">午餐</th>
            <th className="px-2 py-2 text-left font-semibold text-stone-700">晚餐</th>
          </tr>
        </thead>
        <tbody>
          {data.days.map(day => (
            <tr key={day.day} className="border-b border-black/5">
              <td className="px-2 py-2 font-semibold text-stone-950">{day.day}</td>
              <td className="px-2 py-2 text-stone-700">{day.breakfast || '-'}</td>
              <td className="px-2 py-2 text-stone-700">{day.lunch || '-'}</td>
              <td className="px-2 py-2 text-stone-700">{day.dinner || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {data.shoppingList && (
        <div className="mt-4 rounded-md border border-black/8 bg-[var(--bg)] p-3">
          <p className="text-[11px] font-semibold text-[#8a5a35]">采购清单</p>
          <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-stone-700">{data.shoppingList}</p>
        </div>
      )}

      {data.tips && (
        <div className="mt-3 rounded-md border border-black/8 bg-[var(--bg)] p-3">
          <p className="text-[11px] font-semibold text-stone-600">备餐建议</p>
          <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-stone-700">{data.tips}</p>
        </div>
      )}

      {streaming && <div className="mt-3 h-1 w-12 animate-pulse rounded-full bg-[#2f251d]/20" />}
    </div>
  );
}
