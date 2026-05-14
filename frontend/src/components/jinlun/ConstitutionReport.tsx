interface Props {
  content: string;
  streaming: boolean;
  renderMessageText: (content: string) => React.ReactNode;
}

export function ConstitutionReport({ content, streaming, renderMessageText }: Props) {
  if (!content && !streaming) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-sm font-semibold text-stone-700">体质辨识与档案管理</p>
          <p className="mt-2 text-xs leading-6 text-stone-500">在右侧对话框描述日常状态<br />系统会整理体质倾向并更新档案</p>
        </div>
      </div>
    );
  }

  if (streaming && !content) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-[#2f251d] border-t-transparent" />
          <p className="mt-3 text-xs text-stone-500">分析中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="prose prose-sm max-w-none text-stone-800 prose-headings:text-stone-950 prose-headings:font-semibold prose-h2:text-base prose-h3:text-sm prose-p:text-xs prose-p:leading-6 prose-li:text-xs prose-li:leading-6 prose-strong:text-stone-950">
        {renderMessageText(content)}
      </div>
      {streaming && <div className="mt-3 h-1 w-12 animate-pulse rounded-full bg-[#2f251d]/20" />}
    </div>
  );
}
