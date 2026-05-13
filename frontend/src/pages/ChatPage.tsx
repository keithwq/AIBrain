import { useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import { getConversation, getMessages, sendMessageStream, uploadAttachments, type Attachment } from '../services/api';
import { showToast } from '../components/toastStore';
import { getExpertDisplay } from '../data/experts';
import { DEFAULT_KUANGTUZHANGSAN_TASK, KUANGTUZHANGSAN_TASKS, getKuangtuzhangSanTask, type KuangtuzhangSanTaskId } from '../data/kuangtuzhangSanTasks';

interface Message {
  id: string;
  role: string;
  content: string;
  createdAt: string;
  attachments?: Attachment[];
}

interface Props {
  token: string;
  conversationId: string;
  expertId: string;
  expertName: string;
  onBack: () => void;
  onOpenCredits: () => void;
  onOpenHome: () => void;
}

const TEMP_ID_PREFIX = 'temp-';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sanitizeFileName(value: string): string {
  return value
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 40) || 'aibrain';
}

function downloadWordDocument(title: string, content: string) {
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title></head><body style="font-family:Arial,Helvetica,sans-serif;font-size:12pt;line-height:1.7;"><h1 style="font-size:18pt;margin:0 0 16px;">${escapeHtml(title)}</h1><div style="white-space:pre-wrap;">${escapeHtml(content)}</div></body></html>`;
  const blob = new Blob([`\ufeff${html}`], { type: 'application/msword;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${sanitizeFileName(title)}.doc`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

const QUICK_QUESTIONS = [
  '先帮我判断这个问题的关键变量。',
  '根据我上传的材料，给我一份行动清单。',
  '请把结论用表格整理出来。',
];

const MINDFULNESS_QUESTIONS = [
  '我现在很焦虑，先带我做一个 3 分钟呼吸练习。',
  '我脑子停不下来，帮我做睡前安顿。',
  '我很烦躁，帮我把身体和情绪慢慢放下来。',
];

const WANGDINGJUN_QUESTIONS = [
  '请按“题干限制、种籽句、主钉子、下一刀”帮我快批这篇作文。',
  '请把这些共性问题变成一节可上课的讲评课。',
  '请按鼎公法生成素材包、讲义和说课稿。',
  '请诊断我上传的资料，并给一版可用改稿。',
];

const WANGRONGSHENG_QUESTIONS = [
  '请把这节课整理成一份能上课的教案。',
  '请帮我生成说课稿，重点说明教学内容选择的理据。',
  '请把这份备课材料改成课堂逐字稿。',
  '请检查我的教案目标、内容、活动、评价是否一致。',
];

const YEJIAYING_QUESTIONS = [
  '请带我讲读这首诗，先从诵读和声情入手。',
  '请把这首词整理成一节可上课的主问题链。',
  '请说明这组诗词的意象脉络和兴发感动。',
  '请给这首诗词的典故查检方向，不要泛泛堆知识。',
];

const PRECONSULT_OUTPUT_STRUCTURE = [
  '初步判断',
  '事实与程序进展',
  '证据清单',
  '风险边界',
  '下一步处理路径',
  '可提交材料或沟通文本',
  '专业确认清单',
];

type TeacherBoardId = 'correction' | 'preparation';
type TeacherWorkflowId =
  | 'essay-correction'
  | 'lesson-review'
  | 'after-class-note'
  | 'lesson-organize'
  | 'ai-generate'
  | 'polish-material';

const TEACHER_BOARDS: Array<{ id: TeacherBoardId; label: string; hint: string }> = [
  { id: 'correction', label: '批改评讲', hint: '批改、讲评、课后沟通都先过鼎公法' },
  { id: 'preparation', label: '写作教学', hint: '素材、讲义、说课稿、教案与资料诊改' },
];

const WORKFLOWS_BY_BOARD: Record<TeacherBoardId, TeacherWorkflowId[]> = {
  correction: ['essay-correction', 'lesson-review', 'after-class-note'],
  preparation: ['lesson-organize', 'ai-generate', 'polish-material'],
};

const TEACHER_WORKFLOWS: Record<TeacherWorkflowId, {
  board: TeacherBoardId;
  label: string;
  title: string;
  intro: string;
  button: string;
  materialLabel: string;
  materialPlaceholder: string;
  directionLabel: string;
  directionPlaceholder: string;
  outputLabel: string;
  outputPlaceholder: string;
  prompt: string;
  outputStructure: string[];
}> = {
  'essay-correction': {
    board: 'correction',
    label: '鼎公快批',
    title: '一篇作文，先找种籽句，再落下一刀',
    intro: '批改不是通用纠错。先用鼎公法判断题干、种籽句和主钉子，再生成学生能改、老师能讲、家长能懂的批改稿。',
    button: '用鼎公法快批',
    materialLabel: '学生作文 / 题目 / 上一轮任务（可选）',
    materialPlaceholder: '粘贴学生作文、作文题、上一稿修改任务。也可以只上传 Word、PDF、TXT、Markdown。',
    directionLabel: '本次想盯住什么（可选）',
    directionPlaceholder: '例如：只看审题；重点看细节；二稿只核查上一刀；也可留空让系统判断。',
    outputLabel: '希望产出（可选）',
    outputPlaceholder: '例如：学生包 + 老师包 + 家长短话；或只要老师讲评要点。',
    prompt: '请按鼎公作文分身完成快批：先判题干限制词、任务词和材料关键词；再从原文找 25 字以内的种籽句；只钉一枚主钉子；旁批必须是动作，不是情绪评价；给学生下一刀，3 条以内，至少 1 条 10 分钟能完成；最后分开写【文学改进】与【应试得分】。不要默认只有一二三稿，老师要求几轮就支持几轮。',
    outputStructure: ['题干限制', '种籽句', '一枚主钉子', '动作型旁批', '下一刀修改任务', '文学/应试双轨'],
  },
  'lesson-review': {
    board: 'correction',
    label: '讲评课',
    title: '把共性问题讲成一节能落地的课',
    intro: '从作文样本里提炼 Top3 共性错因，给投影短句、微练和作业闭环。',
    button: '生成讲评课',
    materialLabel: '作文样本 / 共性问题 / 批改记录（可选）',
    materialPlaceholder: '粘贴几段学生原文、共性问题、批改记录，或直接上传资料。',
    directionLabel: '讲评目标（可选）',
    directionPlaceholder: '例如：40 分钟讲评课；只讲开头；围绕细节描写做课堂训练。',
    outputLabel: '希望产出（可选）',
    outputPlaceholder: '例如：讲评流程 + 板书 + 小练 + 作业。',
    prompt: '请按鼎公作文讲评课协议处理：先从材料提取共性错因 Top3；每个错因必须指向学生原文或材料信号；给一条可投影短句；设计一段原文细读或模拟片段；给当堂微练；最后形成课后下一刀。不要把讲评课写成泛泛教案。',
    outputStructure: ['共性错因 Top3', '可投影短句', '原文细读或模拟片段', '当堂微练', '课后下一刀'],
  },
  'after-class-note': {
    board: 'correction',
    label: '课后沟通',
    title: '把批改结果整理成家长和学生看得懂的话',
    intro: '课后沟通也是作文教学的一部分。用事实、进步、一件配合和下一刀，把机械文案变成有分寸的教学交付。',
    button: '生成沟通文案',
    materialLabel: '批改结果 / 课堂事实 / 学生表现（可选）',
    materialPlaceholder: '粘贴本次作文批改要点、课堂情况、孩子进步或问题。也可以只上传资料。',
    directionLabel: '沟通对象与语气（可选）',
    directionPlaceholder: '例如：发家长私聊；发班级群；给学生本人；语气温和、具体、不焦虑营销。',
    outputLabel: '希望产出（可选）',
    outputPlaceholder: '例如：家长三段话 + 学生下一刀 + 老师内部提醒。',
    prompt: '请按鼎公家长反馈协议处理：先把批改结果转成家长或学生能读懂的事实；只讲一个可观察进步、一件家庭配合和一个学生下一刀；语气克制，不羞辱、不制造焦虑、不夸大提分承诺。输出要能直接复制发送，也要保留鼎公判断依据。',
    outputStructure: ['鼎公判断依据', '事实', '进步', '一件配合', '学生下一刀', '老师内部提醒'],
  },
  'lesson-organize': {
    board: 'preparation',
    label: '整理教案',
    title: '把零散备课材料整理成可上课版本',
    intro: '老师已有想法时，不必从零生成。工具先用鼎公法做取舍，再把零散材料整理成教案、板书、课堂任务和作业闭环。',
    button: '整理成教案',
    materialLabel: '已有教案 / 课堂想法 / 讲义草稿（可选）',
    materialPlaceholder: '粘贴零散备课笔记、讲义草稿、PPT 文案、训练目标，或上传文件。',
    directionLabel: '整理要求（可选）',
    directionPlaceholder: '例如：40 分钟；要有板书；要有学生动笔任务；要适合小班。',
    outputLabel: '希望产出（可选）',
    outputPlaceholder: '例如：教案 + 板书 + 讲义留白 + 作业闭环。',
    prompt: '请把老师已有材料整理成可上课教案：保留原意，补齐教学目标、课堂流程、板书提示、学生动笔任务和作业闭环；同时标出其中的鼎公判断支点，如题干限制、种籽句、主钉子或下一刀。',
    outputStructure: ['整理后的教案', '板书提示', '学生任务', '作业闭环', '鼎公判断支点'],
  },
  'ai-generate': {
    board: 'preparation',
    label: '素材讲义说课',
    title: '素材、讲义、说课稿，一次生成可交付版本',
    intro: '素材包、讲义、说课稿不是漂亮文案。先定本课一刀、材料抓手和学生动作，再生成老师能上课、能提交、能发出的版本。',
    button: '生成教学成品',
    materialLabel: '题目 / 方向 / 现有素材 / 课程要求（可选）',
    materialPlaceholder: '例如：训练“细节描写”；要一份讲义；准备说课稿；需要成长主题素材包；也可以上传已有资料。',
    directionLabel: '使用场景（可选）',
    directionPlaceholder: '例如：40 分钟课；赛课说课；机构小班；校内公开课；课后练习包。',
    outputLabel: '想要的成品（可选）',
    outputPlaceholder: '例如：素材包 + 讲义 + 说课稿；PPT 骨架；作业单；课堂逐字稿。',
    prompt: '请按鼎公写作教学成品协议生成：先判断用户要交付的成品类型，如素材包、讲义、说课稿、PPT 骨架、课堂逐字稿、作业单或组合包；再把训练目标压成一刀，说明启用的写作模型（种籽句、七巧、六要、化读转写或文学/应试双轨）；所有素材必须说明课堂用法；讲义必须有学生动笔位置；说课稿必须有教学目标、重难点、过程、评价与作业闭环；不要替学生生成整篇可提交作文，只给片段级示范。',
    outputStructure: ['成品清单', '本课一刀', '启用模型', '素材与用法', '讲义或说课稿正文', '学生任务', '作业闭环'],
  },
  'polish-material': {
    board: 'preparation',
    label: '资料诊改',
    title: '上传老师自己的资料，让鼎公指出不足并改稿',
    intro: '反向工作流：老师先给自己的教案、讲义、说课稿或素材包，鼎公先诊断哪里空、哪里散、哪里不能落到学生动作，再给修改稿。',
    button: '诊改这份资料',
    materialLabel: '老师已有资料（可选）',
    materialPlaceholder: '粘贴教案、讲义、逐字稿、PPT 文案、题目说明。也可以只上传 Word、PDF、TXT、Markdown。',
    directionLabel: '希望提升哪里（可选）',
    directionPlaceholder: '例如：减少空话；补学生任务；增加投影短句；改成更像一线课堂。',
    outputLabel: '希望产出（可选）',
    outputPlaceholder: '例如：不足清单 + 修改意见 + 可直接使用版本；或只要老师内部诊断。',
    prompt: '请按鼎公资料诊改协议处理：先肯定这份资料可用处；再指出最影响课堂使用的 1-3 个不足；说明它缺少题干限制、种籽句、主钉子、动作型任务、素材用法或下一刀中的哪几项；最后输出一版可直接使用的改稿。不要只润色语言，要提升教学判断和课堂效果。',
    outputStructure: ['可用处', '不足诊断', '补上的鼎公判断', '修改意见', '可直接使用版本', '还需补充的事实'],
  },
};

type RongshengBoardId = 'reading' | 'lesson-type' | 'diagnosis';
type RongshengWorkflowId =
  | 'content-decision'
  | 'lesson-skeleton'
  | 'unit-alignment'
  | 'lesson-plan'
  | 'speaking-script'
  | 'teaching-transcript'
  | 'writing-content'
  | 'lesson-diagnosis'
  | 'activity-alignment';

const RONGSHENG_BOARDS: Array<{ id: RongshengBoardId; label: string; hint: string }> = [
  { id: 'reading', label: '备课成品', hint: '教案、说课稿、逐字稿先定教学内容' },
  { id: 'lesson-type', label: '内容理据', hint: '判断这一课该教什么、不该教什么' },
  { id: 'diagnosis', label: '诊断改稿', hint: '检查目标、内容、活动、评价是否一致' },
];

const RONGSHENG_WORKFLOWS_BY_BOARD: Record<RongshengBoardId, RongshengWorkflowId[]> = {
  reading: ['lesson-plan', 'speaking-script', 'teaching-transcript'],
  'lesson-type': ['content-decision', 'lesson-skeleton', 'unit-alignment', 'writing-content'],
  diagnosis: ['lesson-diagnosis', 'activity-alignment'],
};

const RONGSHENG_WORKFLOWS: Record<RongshengWorkflowId, {
  board: RongshengBoardId;
  label: string;
  title: string;
  intro: string;
  button: string;
  materialLabel: string;
  materialPlaceholder: string;
  directionLabel: string;
  directionPlaceholder: string;
  outputLabel: string;
  outputPlaceholder: string;
  prompt: string;
  outputStructure: string[];
}> = {
  'lesson-plan': {
    board: 'reading',
    label: '教案',
    title: '生成一份能上课的语文教案',
    intro: '先确定本课教学内容，再组织目标、重难点、流程、活动、评价和作业，避免空泛模板。',
    button: '生成教案',
    materialLabel: '篇名 / 单元导语 / 课后题 / 备课材料',
    materialPlaceholder: '粘贴篇名、教材版本、单元导语、课后题、已有备课笔记、课堂活动设想。',
    directionLabel: '课堂要求',
    directionPlaceholder: '例如：40 分钟常态课；公开课；两课时；要有板书和学生任务。',
    outputLabel: '交付要求',
    outputPlaceholder: '例如：完整教案 + 板书 + 作业；或只要课堂流程。',
    prompt: '请生成一份语文教案，但必须先用王荣生式教学内容判断定住这节课教什么：区分语文课程内容、教材内容、教学内容；再给教学目标、重难点、课堂流程、学生任务、评价方式、板书和作业。不要写成泛泛教案，不要编造官方课标口径。',
    outputStructure: ['教学内容判定', '教学目标', '重难点', '课堂流程', '学生任务', '评价与作业', '板书设计'],
  },
  'speaking-script': {
    board: 'reading',
    label: '说课稿',
    title: '生成有理据的语文说课稿',
    intro: '说清为什么这样选内容、这样安排活动，而不是堆“教材分析、学情分析”的套话。',
    button: '生成说课稿',
    materialLabel: '课题 / 教材线索 / 教案草稿 / 说课要求',
    materialPlaceholder: '粘贴课题、单元导语、课后题、已有教案、比赛或教研说课要求。',
    directionLabel: '说课场景',
    directionPlaceholder: '例如：教研组说课；赛课说课；5 分钟版；10 分钟版。',
    outputLabel: '希望产出',
    outputPlaceholder: '例如：完整说课稿 + 设计理据 + 可删减版本。',
    prompt: '请生成语文说课稿：核心是说明本课教学内容选择的理据，以及目标、内容、活动、评价如何一致。语言要像老师能说出口的说课稿，不要堆空话；涉及课标只做谨慎表述，不冒充官方解释。',
    outputStructure: ['说教材与内容定位', '说学情', '说目标与重难点', '说教学过程', '说评价与作业', '设计理据'],
  },
  'teaching-transcript': {
    board: 'reading',
    label: '逐字稿',
    title: '把备课材料改成课堂逐字稿',
    intro: '逐字稿服务课堂推进：教师话术、学生动作、追问和板书都要围绕教学内容。',
    button: '生成逐字稿',
    materialLabel: '教案 / 活动流程 / 课堂问题 / 文本材料',
    materialPlaceholder: '粘贴教案、活动流程、问题链、板书草稿、课文片段或课堂要求。',
    directionLabel: '课堂风格',
    directionPlaceholder: '例如：启发式；常态课自然语言；公开课更完整；学生基础薄弱。',
    outputLabel: '希望产出',
    outputPlaceholder: '例如：教师逐字稿 + 学生可能回答 + 追问 + 板书提示。',
    prompt: '请把备课材料改成课堂逐字稿：先确认本课教学内容，再把每个环节写成教师可说出口的话、学生要做的动作、可能回答、追问和板书提示。不要只写表演化台词，必须服务教学内容。',
    outputStructure: ['教学内容确认', '课堂逐字稿', '学生可能回答', '教师追问', '板书提示', '时间分配'],
  },
  'content-decision': {
    board: 'lesson-type',
    label: '内容判定',
    title: '先判这一课到底教什么、不教什么',
    intro: '把课文、单元、课后题、学情和课时放到一起，判断合宜的语文教学内容，避免把课堂做成泛泛感悟。',
    button: '判定教学内容',
    materialLabel: '课文 / 单元导语 / 课后题 / 教材线索',
    materialPlaceholder: '粘贴篇名、教材版本、单元导语、课后题、现有备课想法。资料不全也可以先写已知信息。',
    directionLabel: '本课困惑',
    directionPlaceholder: '例如：不知道教语言还是主题；活动很多但主线散；公开课只剩 40 分钟。',
    outputLabel: '希望产出',
    outputPlaceholder: '例如：教学内容判定 + 不教清单 + 关键环节理据。',
    prompt: '请按王荣生式语文教学内容判断处理：先区分语文课程内容、教材内容、教学内容；再根据篇名、单元、课后题、学情和课时判断本课合宜教学内容；明确不教清单；说明每个关键环节服务哪一种语文经验。不要写成泛泛教案，不要抢鼎公作文升格或绍振文学细读主链。',
    outputStructure: ['材料证据', '三层内容区分', '合宜教学内容', '不教清单', '关键环节与理据', '还需补充的教材证据'],
  },
  'lesson-skeleton': {
    board: 'reading',
    label: '备课骨架',
    title: '把阅读课整理成有理据的课堂骨架',
    intro: '不追求漂亮流程，先保证目标、内容、活动一致，再给可上课的环节骨架。',
    button: '整理备课骨架',
    materialLabel: '现有教案 / 课堂想法 / 课文材料',
    materialPlaceholder: '粘贴已有教案、课堂活动、问题链、板书草稿，或上传 Word、PDF、TXT、Markdown。',
    directionLabel: '使用场景',
    directionPlaceholder: '例如：常态课；公开课；集体备课；一课时；两课时。',
    outputLabel: '希望产出',
    outputPlaceholder: '例如：目标 + 内容 + 活动 + 评价闭环。',
    prompt: '请把现有备课材料整理成王荣生式备课骨架：先指出本课教学内容，再重写目标；每个课堂活动必须说明服务哪个教学内容；评价任务要能检验目标。不要代写侵权整篇教案，不做纯审美独白。',
    outputStructure: ['本课教学内容', '目标重写', '活动取舍', '课堂骨架', '评价任务', '备课理据'],
  },
  'unit-alignment': {
    board: 'reading',
    label: '单元对齐',
    title: '检查单篇与单元目标是否对齐',
    intro: '把单篇课放回单元，判断它承担的是例文、样本、用件还是定篇任务。',
    button: '检查单元对齐',
    materialLabel: '单元导语 / 篇目 / 课后题 / 单元任务',
    materialPlaceholder: '粘贴单元导语、篇目、课后题、语文要素或单元任务要求。',
    directionLabel: '当前疑问',
    directionPlaceholder: '例如：这篇课文是不是该重讲主题；单元任务和单篇活动接不上。',
    outputLabel: '希望产出',
    outputPlaceholder: '例如：单元定位 + 单篇职责 + 活动调整建议。',
    prompt: '请按单元教学内容对齐来判断：说明单篇在单元中的职责，判断它更接近定篇、例文、样本还是用件；检查目标、活动、评价是否服务单元语文经验。输出要克制，不冒充官方课标解释权。',
    outputStructure: ['单元证据', '单篇职责', '选文类型判断', '目标活动评价一致性', '调整建议'],
  },
  'writing-content': {
    board: 'lesson-type',
    label: '课型判断',
    title: '按课型判断这一课合宜教什么',
    intro: '教读、自读、写作、复习、综合性学习都先回到教学内容判断；学生成篇润色、旁批、讲评话术交给鼎公。',
    button: '判断课型内容',
    materialLabel: '课型 / 题目 / 训练目标 / 活动草案',
    materialPlaceholder: '粘贴课型、课题、训练点、学生共性问题、活动设计。若是学生作文全文升格，请转鼎公。',
    directionLabel: '本次要判断',
    directionPlaceholder: '例如：这类课到底教什么；活动是否太散；目标是否能评价。',
    outputLabel: '希望产出',
    outputPlaceholder: '例如：课型定位 + 教学内容判定 + 活动取舍。',
    prompt: '请按课型做语文教学内容判断：先判断这是教读、自读、写作、复习还是综合性学习；再说明这一课合宜教什么、训练什么语文经验、活动如何组织、评价如何检验。若涉及学生作文成篇升格、逐段润色和家长反馈话术，明确转给鼎公工作台。',
    outputStructure: ['课型定位', '教学内容判定', '训练结构', '活动取舍', '评价方式', '与鼎公分工'],
  },
  'lesson-diagnosis': {
    board: 'diagnosis',
    label: '教案诊断',
    title: '诊断教案是否目标、内容、活动一致',
    intro: '先看这份教案真正教了什么，再判断目标和活动是不是互相支持。',
    button: '诊断教案',
    materialLabel: '教案 / 说课稿 / 课堂实录 / 听评课记录',
    materialPlaceholder: '粘贴教案、说课稿、课堂流程、活动设计或评课记录。',
    directionLabel: '诊断重点',
    directionPlaceholder: '例如：目标太虚；活动热闹但不知道教什么；评价任务缺失。',
    outputLabel: '希望产出',
    outputPlaceholder: '例如：问题清单 + 修改方向 + 重排骨架。',
    prompt: '请按王荣生式教案诊断：先还原这份教案实际在教什么；检查目标、内容、活动、评价是否一致；指出最影响课堂成立的 1-3 个问题；给出修改后的骨架。不要只润色语言。',
    outputStructure: ['实际教学内容', '一致性诊断', '关键问题', '修改骨架', '备课理据'],
  },
  'activity-alignment': {
    board: 'diagnosis',
    label: '活动取舍',
    title: '判断课堂活动是不是服务教学内容',
    intro: '活动不按热闹程度判断，而按它服务的语文经验和目标证据判断。',
    button: '检查活动取舍',
    materialLabel: '课堂活动 / 问题链 / 学习任务',
    materialPlaceholder: '粘贴活动流程、课堂问题、小组任务、练习设计或板书。',
    directionLabel: '想保留或犹豫的活动',
    directionPlaceholder: '例如：朗读、讨论、表演、仿写、拓展资料是否该留。',
    outputLabel: '希望产出',
    outputPlaceholder: '例如：保留 / 修改 / 删除清单。',
    prompt: '请检查课堂活动取舍：每个活动都要回答它服务哪个教学内容、学生会形成什么语文经验、如何评价。把活动分成保留、修改、删除三类，并说明理由。',
    outputStructure: ['活动逐项判断', '保留清单', '修改清单', '删除清单', '评价证据'],
  },
};

export type PoetryBoardId = 'lesson' | 'reading' | 'diagnosis';
export type PoetryWorkflowId =
  | 'lesson-plan'
  | 'main-questions'
  | 'recitation'
  | 'image-structure'
  | 'allusion-check'
  | 'material-polish';

export const POETRY_BOARDS: Array<{ id: PoetryBoardId; label: string; hint: string }> = [
  { id: 'lesson', label: '课堂成品', hint: '教案、主问题、板书与课堂推进' },
  { id: 'reading', label: '诗词讲读', hint: '诵读声情、意象章法、兴发感动' },
  { id: 'diagnosis', label: '材料诊改', hint: '检查讲稿、教案和活动是否贴住文本' },
];

export const POETRY_WORKFLOWS_BY_BOARD: Record<PoetryBoardId, PoetryWorkflowId[]> = {
  lesson: ['lesson-plan', 'main-questions'],
  reading: ['recitation', 'image-structure', 'allusion-check'],
  diagnosis: ['material-polish'],
};

const POETRY_FLAT_WORKFLOW_IDS: PoetryWorkflowId[] = [
  'lesson-plan',
  'main-questions',
  'recitation',
  'image-structure',
  'allusion-check',
  'material-polish',
];

export const POETRY_WORKFLOWS: Record<PoetryWorkflowId, {
  board: PoetryBoardId;
  label: string;
  title: string;
  intro: string;
  button: string;
  materialLabel: string;
  materialPlaceholder: string;
  directionLabel: string;
  directionPlaceholder: string;
  outputLabel: string;
  outputPlaceholder: string;
  prompt: string;
  outputStructure: string[];
}> = {
  'lesson-plan': {
    board: 'lesson',
    label: '讲读课',
    title: '生成一节古典诗词讲读课',
    intro: '从诵读入手，贴住文本证据，形成可上课的讲读层次、主问题和板书。',
    button: '生成讲读课',
    materialLabel: '篇目 / 原文 / 注释 / 教材线索',
    materialPlaceholder: '粘贴诗词原文、篇目、注释、单元要求、已有教案或课堂限制。',
    directionLabel: '课堂要求',
    directionPlaceholder: '例如：40 分钟公开课；社团课；初中基础较弱；要有板书和朗读设计。',
    outputLabel: '交付要求',
    outputPlaceholder: '例如：教案 + 主问题链 + 板书 + 诵读提示。',
    prompt: '请生成古典诗词讲读课：先确认文本和学段，再从诵读声情、意象章法、兴发感动、典故查检方向组织课堂。输出要能帮助老师上课，不要写成泛古文翻译工具，不要做作文批改或现代文赋分模板。',
    outputStructure: ['文本依据', '教学目标', '诵读与声情', '讲读层次', '主问题链', '板书设计', '课堂任务'],
  },
  'main-questions': {
    board: 'lesson',
    label: '主问题',
    title: '把诗词讲读整理成课堂主问题链',
    intro: '主问题从文本里长出来，服务朗读、理解、鉴赏和课堂推进。',
    button: '生成主问题链',
    materialLabel: '篇目 / 原文 / 现有问题 / 课堂目标',
    materialPlaceholder: '粘贴原文、已有问题链、学生卡点或你希望讲清的重点。',
    directionLabel: '问题链要求',
    directionPlaceholder: '例如：3 个主问题；适合初二；要能带出意象和情感层次。',
    outputLabel: '希望产出',
    outputPlaceholder: '例如：主问题链 + 追问 + 学生活动 + 板书。',
    prompt: '请为古典诗词课生成主问题链：问题必须贴住文本证据，能带动诵读、意象、章法和兴发感动。不要把问题写成泛泛主题讨论，不要堆典故。',
    outputStructure: ['核心讲读目标', '主问题链', '追问设计', '学生任务', '板书层次'],
  },
  recitation: {
    board: 'reading',
    label: '诵读',
    title: '设计诵读、停顿与声情理解',
    intro: '用读法进入诗词，不把朗读当装饰，而是帮助学生听见情感和章法。',
    button: '生成诵读提示',
    materialLabel: '诗词原文 / 注释 / 朗读困惑',
    materialPlaceholder: '粘贴原文、注释、学生读不出来的句子或你想处理的声情重点。',
    directionLabel: '诵读目标',
    directionPlaceholder: '例如：读出转折；读出沉郁；读出由景入情。',
    outputLabel: '希望产出',
    outputPlaceholder: '例如：停顿建议 + 重音提示 + 朗读任务。',
    prompt: '请设计古典诗词诵读提示：说明停顿、重音、语势和声情如何依据文本而来，并给老师可操作的课堂朗读任务。不要编造固定唯一读法。',
    outputStructure: ['文本依据', '停顿与重音', '声情说明', '课堂朗读任务', '注意边界'],
  },
  'image-structure': {
    board: 'reading',
    label: '意象章法',
    title: '梳理意象脉络、章法结构与兴发感动',
    intro: '把意象、章法和情感发生过程讲清楚，让鉴赏不是空泛抒情。',
    button: '梳理讲读层次',
    materialLabel: '诗词原文 / 注释 / 已有理解',
    materialPlaceholder: '粘贴原文、注释、学生理解或现有赏析草稿。',
    directionLabel: '讲读重点',
    directionPlaceholder: '例如：意象变化；上下片结构；由景到情；兴发感动。',
    outputLabel: '希望产出',
    outputPlaceholder: '例如：层次讲读 + 板书 + 学生问题。',
    prompt: '请梳理古典诗词的意象脉络、章法结构和兴发感动：所有判断必须回到字句证据，避免泛泛主题概括。',
    outputStructure: ['文本层次', '意象脉络', '章法结构', '兴发感动', '板书建议'],
  },
  'allusion-check': {
    board: 'reading',
    label: '典故',
    title: '给出典故、互文与背景的查检方向',
    intro: '典故只做必要提示，服务理解诗词，不把课堂变成知识堆叠。',
    button: '生成查检方向',
    materialLabel: '诗词原文 / 疑似典故 / 注释材料',
    materialPlaceholder: '粘贴原文、注释、疑似典故、背景材料或学生卡住的词句。',
    directionLabel: '查检边界',
    directionPlaceholder: '例如：只要课堂可讲部分；不要展开太多文献；适合初中。',
    outputLabel: '希望产出',
    outputPlaceholder: '例如：典故方向 + 课堂讲法 + 不宜展开内容。',
    prompt: '请给古典诗词典故、互文和背景的查检方向：只提示可靠查检路径和课堂必要讲法，不编造未确认来源，不用典故压过文本讲读。',
    outputStructure: ['疑点词句', '查检方向', '课堂讲法', '不宜展开内容', '仍需确认材料'],
  },
  'material-polish': {
    board: 'diagnosis',
    label: '诊改',
    title: '诊断诗词教案或讲稿是否贴住文本',
    intro: '检查材料是否从诗词本身出发，是否有诵读、意象、章法和主问题支撑。',
    button: '诊断并改稿',
    materialLabel: '教案 / 讲稿 / PPT 文案 / 活动设计',
    materialPlaceholder: '粘贴已有诗词教案、讲稿、问题链、板书或课堂活动。',
    directionLabel: '诊改重点',
    directionPlaceholder: '例如：太像翻译课；问题太散；缺少朗读；典故太多。',
    outputLabel: '希望产出',
    outputPlaceholder: '例如：问题清单 + 修改建议 + 可用版本。',
    prompt: '请诊断诗词教学材料：看它是否贴住文本证据，是否有诵读声情、意象章法、兴发感动和可上课主问题。指出 1-3 个关键问题并给出可用改稿。',
    outputStructure: ['可用处', '关键问题', '修改方向', '可用改稿', '补充材料'],
  },
};

type WorkbenchFieldKey =
  | 'clientName'
  | 'clientBackground'
  | 'background'
  | 'goal'
  | 'material'
  | 'output'
  | 'grade'
  | 'region'
  | 'textbook'
  | 'materialType'
  | 'studentLevel';

interface WorkbenchField {
  key: WorkbenchFieldKey;
  label: string;
  placeholder: string;
  rows?: number;
  options?: string[];
}

type WorkbenchValues = Record<WorkbenchFieldKey, string>;

interface WorkbenchCopy {
  title: string;
  intro: string;
  button: string;
  prompt: string;
  outputFallback: string;
  fields: WorkbenchField[];
}

const DEFAULT_WORKBENCH: WorkbenchValues = {
  clientName: '',
  clientBackground: '',
  background: '',
  goal: '',
  material: '',
  output: '判断结论 + 行动清单',
  grade: '',
  region: '',
  textbook: '',
  materialType: '',
  studentLevel: '',
};

const MINDFULNESS_WORKBENCH: WorkbenchValues = {
  clientName: '',
  clientBackground: '',
  background: '',
  goal: '先稳定下来',
  material: '',
  output: '安抚语言 + 正念练习步骤',
  grade: '',
  region: '',
  textbook: '',
  materialType: '',
  studentLevel: '',
};

const WANGDINGJUN_WORKBENCH: WorkbenchValues = {
  clientName: '',
  clientBackground: '',
  background: '',
  goal: '',
  material: '',
  output: '',
  grade: '',
  region: '',
  textbook: '',
  materialType: '',
  studentLevel: '',
};

const WANGRONGSHENG_WORKBENCH: WorkbenchValues = {
  clientName: '',
  clientBackground: '',
  background: '',
  goal: '',
  material: '',
  output: '',
  grade: '',
  region: '',
  textbook: '',
  materialType: '',
  studentLevel: '',
};

const YEJIAYING_WORKBENCH: WorkbenchValues = {
  clientName: '',
  clientBackground: '',
  background: '',
  goal: '',
  material: '',
  output: '讲读骨架 + 主问题链 + 诵读提示',
  grade: '',
  region: '',
  textbook: '',
  materialType: '',
  studentLevel: '',
};

function getInitialWorkbench(expertId: string) {
  if (expertId === 'wangdingjun') return { ...WANGDINGJUN_WORKBENCH };
  if (expertId === 'wangrongsheng') return { ...WANGRONGSHENG_WORKBENCH };
  if (expertId === 'yejiaying') return { ...YEJIAYING_WORKBENCH };
  return expertId === 'thich-nhat-hanh' ? { ...MINDFULNESS_WORKBENCH } : { ...DEFAULT_WORKBENCH };
}

function getWorkbenchCopy(expertId: string): WorkbenchCopy {
  if (expertId === 'wangdingjun') {
    return {
      title: '作文批改与写作教学工作台',
      intro: '请先粘贴作文、题目、教案、讲义、说课稿或老师已有资料，也可以直接上传 Word、PDF、文本等可读取资料。鼎公只处理作文批改、写作教学、讲评课、教学成品生成和资料诊改。',
      button: '开始处理',
      prompt: '请根据作文批改与写作教学工作台信息，先按鼎公法判断，再完成本次老师需要交付的成品或资料诊改。',
      outputFallback: '可直接使用成品 + 鼎公判断依据',
      fields: [
        { key: 'grade', label: '年级', placeholder: '请选择年级', rows: 1, options: ['三年级', '四年级', '五年级', '六年级', '初一', '初二', '初三', '高一', '高二', '高三'] },
        { key: 'region', label: '地区', placeholder: '省份或城市，例如：江苏南京', rows: 1 },
        { key: 'textbook', label: '教材版本', placeholder: '请选择教材版本', rows: 1, options: ['统编版', '人教版', '苏教版', '沪教版', '其他', '不确定'] },
        { key: 'materialType', label: '材料类型', placeholder: '请选择材料类型', rows: 1, options: ['作文', '试卷', '日常作业', '小练笔', '阅读理解', '其他'] },
        { key: 'goal', label: '批改目标', placeholder: '请选择批改目标', rows: 1, options: ['提升表达', '应试提分', '课堂讲评', '家长反馈', '学生修改任务'] },
        { key: 'studentLevel', label: '学生水平', placeholder: '请选择学生水平', rows: 1, options: ['基础薄弱', '中等', '较好', '尖子生', '不确定'] },
        { key: 'material', label: '作文或材料内容', placeholder: '请粘贴作文正文、题目要求、试卷题干或日常作业内容。暂不支持图片识别。', rows: 8 },
        { key: 'output', label: '期望产出', placeholder: '请选择期望产出', rows: 1, options: ['作文批改 + 修改建议', '试卷讲评提纲', '日常作业反馈', '家长可读反馈', '学生修改任务'] },
      ] satisfies WorkbenchField[],
    };
  }

  if (expertId === 'wangrongsheng') {
    return {
      title: '绒绒老师 · 语文教学内容工作台',
      intro: '请先放入篇名、单元线索、课后题、现有教案或课堂活动。绒绒老师负责判断这一课教什么、不教什么，以及目标、内容、活动、评价是否一致。',
      button: '开始备课判断',
      prompt: '请根据语文教学内容与备课决策工作台信息，先判断合宜教学内容，再检查目标、活动、评价的一致性。',
      outputFallback: '教学内容判定 + 备课理据 + 活动调整',
      fields: [
        { key: 'grade', label: '年级', placeholder: '请选择年级', rows: 1, options: ['三年级', '四年级', '五年级', '六年级', '初一', '初二', '初三', '高一', '高二', '高三'] },
        { key: 'region', label: '地区', placeholder: '省份或城市，例如：江苏南京', rows: 1 },
        { key: 'textbook', label: '教材版本', placeholder: '请选择教材版本', rows: 1, options: ['统编版', '人教版', '苏教版', '沪教版', '其他', '不确定'] },
        { key: 'materialType', label: '课型', placeholder: '请选择课型', rows: 1, options: ['教读课', '自读课', '写作课', '单元导读', '复习课', '评课磨课', '不确定'] },
        { key: 'studentLevel', label: '学情', placeholder: '请选择学情', rows: 1, options: ['基础薄弱', '中等', '较好', '差异很大', '不确定'] },
        { key: 'material', label: '教材与备课材料', placeholder: '请粘贴篇名、单元导语、课后题、教案、活动设计或听评课记录。', rows: 8 },
        { key: 'goal', label: '备课困惑', placeholder: '例如：不知道这一课该教语言还是主题；活动很多但主线散。', rows: 2 },
        { key: 'output', label: '期望产出', placeholder: '例如：教学内容判定 + 不教清单 + 课堂骨架。', rows: 1 },
      ] satisfies WorkbenchField[],
    };
  }

  if (expertId === 'yejiaying') {
    return {
      title: '古典诗词讲读工作台',
      intro: '把篇目、原文、学段、课型和已有理解先放进来。迦陵先生只处理古典诗词讲读、诗词鉴赏、兴发感动与诵读式理解，不做泛古文整理，也不接作文批改和现代文赋分模板。',
      button: '开始诗词讲读',
      prompt: '请根据古典诗词讲读工作台信息，围绕文本证据完成讲读、鉴赏、诵读与课堂主问题设计。',
      outputFallback: '讲读骨架 + 主问题链 + 诵读提示',
      fields: [
        { key: 'grade', label: '学段', placeholder: '请选择学段', rows: 1, options: ['小学高年级', '初中', '高中', '大学通识', '成人自学', '不确定'] },
        { key: 'textbook', label: '教材或版本', placeholder: '例如：统编版九上 / 校本拓展 / 社团课', rows: 1 },
        { key: 'materialType', label: '材料类型', placeholder: '请选择材料类型', rows: 1, options: ['单首诗', '单首词', '组诗', '词牌专题', '诗人专题', '课堂活动设计'] },
        { key: 'studentLevel', label: '学习基础', placeholder: '请选择学习基础', rows: 1, options: ['初学', '有基础', '备考复习', '社团拓展', '不确定'] },
        { key: 'background', label: '使用场景', placeholder: '例如：公开课、社团课、自学带读、课前导入、专题拓展。', rows: 2 },
        { key: 'material', label: '诗词原文或材料', placeholder: '粘贴篇目、原文、注释、已有教案或你想讲清的问题。没有完整材料时，请至少写明篇目。', rows: 5 },
        { key: 'goal', label: '本次讲读重点', placeholder: '例如：声情诵读、意象脉络、章法结构、典故查检、主问题链。', rows: 2 },
        { key: 'output', label: '希望产出', placeholder: '讲读骨架 + 主问题链 + 诵读提示', rows: 1 },
      ] satisfies WorkbenchField[],
    };
  }

  const isMindfulness = expertId === 'thich-nhat-hanh';
  if (isMindfulness) {
    return {
      title: '正念舒缓工作台',
      intro: '把咨询者、背景、压力来源和身体感受先放进来，附件可以在底部上传。',
      button: '用工作台开始安顿',
      prompt: '请根据正念舒缓工作台信息，先安抚咨询者，再给出可跟做的正念练习。',
      outputFallback: '安抚语言 + 正念练习步骤',
      fields: [
        { key: 'clientName', label: '咨询者姓名', placeholder: '姓名 / 称呼，例如：小林、王老师、孩子妈妈', rows: 1 },
        { key: 'clientBackground', label: '咨询者背景', placeholder: '身份、年龄段、职业/学习状态、最近处境。例如：初三学生，最近考试压力大；创业者，连续失眠。', rows: 3 },
        { key: 'background', label: '当前困扰', placeholder: '现在发生了什么？主要压力、情绪或睡眠问题是什么？', rows: 3 },
        { key: 'material', label: '身体感受与触发点', placeholder: '例如：胸口紧、头很胀、肩颈硬、刚和人吵完、睡前脑子停不下来。', rows: 3 },
        { key: 'goal', label: '希望状态', placeholder: '希望结束时达到什么状态？例如：能睡、缓下来、先不崩、能继续做事。', rows: 2 },
        { key: 'output', label: '希望产出', placeholder: '例如：安抚语言 + 3分钟呼吸练习 / 睡前安顿步骤 / 步行禅引导词', rows: 1 },
      ] satisfies WorkbenchField[],
    };
  }

  return {
    title: '智脑工作台',
    intro: '把背景、目标和材料先放进来，附件可以在底部上传。',
    button: '用工作台开始判断',
    prompt: '请根据智脑工作台信息先判断关键问题，再给建议。',
    outputFallback: '判断结论 + 行动清单',
    fields: [
      { key: 'background', label: '背景', placeholder: '发生了什么？现在卡在哪里？', rows: 3 },
      { key: 'goal', label: '目标', placeholder: '你想得到什么判断或结果？', rows: 3 },
      { key: 'material', label: '材料要点', placeholder: '把附件里的重点、限制条件或已知事实写几句。', rows: 3 },
      { key: 'output', label: '希望产出', placeholder: '判断结论 + 行动清单', rows: 1 },
    ] satisfies WorkbenchField[],
  };
}

function resolveAssetUrl(url: string) {
  if (/^https?:\/\//i.test(url) || url.startsWith('blob:')) return url;
  return `${import.meta.env.VITE_API_BASE_URL?.replace(/\/api\/v1\/?$/, '') || ''}${url}`;
}

function MessageText({ content, dark = false }: { content: string; dark?: boolean }) {
  return (
    <div className={`message-rich ${dark ? 'message-rich-dark' : ''}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          a: ({ href, children }) => <a href={href || '#'} target="_blank" rel="noreferrer">{children}</a>,
          img: ({ src, alt }) => <img src={resolveAssetUrl(String(src || ''))} alt={alt || ''} loading="lazy" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

function AttachmentList({ attachments, dark = false }: { attachments?: Attachment[]; dark?: boolean }) {
  if (!attachments?.length) return null;
  return (
    <div className="mt-3 grid gap-2">
      {attachments.map(item => {
        const href = resolveAssetUrl(item.url);
        const isImage = item.mimeType.startsWith('image/');
        return (
          <a
            key={item.id}
            href={href}
            target="_blank"
            rel="noreferrer"
            className={`block overflow-hidden rounded-2xl border text-left ${dark ? 'border-white/20 bg-white/10' : 'border-stone-200 bg-stone-50'}`}
          >
            {isImage ? (
              <img src={href} alt={item.name} className="max-h-60 w-full object-cover" />
            ) : (
              <div className="px-3 py-2 text-xs font-semibold">{item.name}</div>
            )}
          </a>
        );
      })}
    </div>
  );
}

export default function ChatPage({ token, conversationId, expertId, expertName, onBack, onOpenCredits, onOpenHome }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [messagesError, setMessagesError] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [conversationTitle, setConversationTitle] = useState('');
  const [conversationExpert, setConversationExpert] = useState({ conversationId, expertId });
  const [creditBlocked, setCreditBlocked] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [activeTeacherBoard, setActiveTeacherBoard] = useState<TeacherBoardId>('correction');
  const [activeTeacherWorkflow, setActiveTeacherWorkflow] = useState<TeacherWorkflowId>('essay-correction');
  const [activeRongshengBoard, setActiveRongshengBoard] = useState<RongshengBoardId>('reading');
  const [activeRongshengWorkflow, setActiveRongshengWorkflow] = useState<RongshengWorkflowId>('content-decision');
  const [activePoetryBoard, setActivePoetryBoard] = useState<PoetryBoardId>('lesson');
  const [activePoetryWorkflow, setActivePoetryWorkflow] = useState<PoetryWorkflowId>('lesson-plan');
  const [activePreconsultTask, setActivePreconsultTask] = useState<KuangtuzhangSanTaskId>(DEFAULT_KUANGTUZHANGSAN_TASK);
  const [teacherLibraryOpen, setTeacherLibraryOpen] = useState(true);
  const [preconsultLibraryOpen, setPreconsultLibraryOpen] = useState(true);

  const activeExpertId = conversationExpert.conversationId === conversationId ? conversationExpert.expertId : expertId;
  const [workbenchState, setWorkbenchState] = useState(() => ({
    expertId: activeExpertId,
    values: getInitialWorkbench(activeExpertId),
  }));

  const meta = useMemo(() => getExpertDisplay(activeExpertId), [activeExpertId]);
  const displayExpertName = activeExpertId === expertId ? expertName : meta.alias;
  const isMindfulness = activeExpertId === 'thich-nhat-hanh';
  const isWangdingjun = activeExpertId === 'wangdingjun';
  const isWangrongsheng = activeExpertId === 'wangrongsheng';
  const isYejiaying = activeExpertId === 'yejiaying';
  const isPreconsult = activeExpertId === 'kuangtuzhangsan';
  const isStructuredTeacher = isWangdingjun || isWangrongsheng || isYejiaying;
  const workbenchCopy = useMemo(() => getWorkbenchCopy(activeExpertId), [activeExpertId]);
  const workbench = workbenchState.expertId === activeExpertId ? workbenchState.values : getInitialWorkbench(activeExpertId);
  const teacherWorkflow = TEACHER_WORKFLOWS[activeTeacherWorkflow];
  const rongshengWorkflow = RONGSHENG_WORKFLOWS[activeRongshengWorkflow];
  const poetryWorkflow = POETRY_WORKFLOWS[activePoetryWorkflow];
  const preconsultTask = getKuangtuzhangSanTask(activePreconsultTask);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const streamingRef = useRef('');
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      setMessagesLoading(true);
      setMessagesError(false);
      try {
        const [msgs, conv] = await Promise.all([
          getMessages(token, conversationId),
          getConversation(token, conversationId),
        ]);
        if (!active) return;
        setMessages(msgs);
        setConversationTitle(conv.title);
        if (typeof conv.expertId === 'string' && conv.expertId) {
          setConversationExpert({ conversationId, expertId: conv.expertId });
        }
      } catch {
        if (!active) return;
        setMessagesError(true);
        showToast('消息加载失败');
      } finally {
        if (active) setMessagesLoading(false);
      }
    })();
    return () => {
      active = false;
      abortRef.current?.abort();
    };
  }, [conversationId, token]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  const updateWorkbenchValue = (key: WorkbenchFieldKey, value: string) => {
    setWorkbenchState(prev => ({
      expertId: activeExpertId,
      values: {
        ...(prev.expertId === activeExpertId ? prev.values : getInitialWorkbench(activeExpertId)),
        [key]: value,
      },
    }));
  };

  const switchTeacherBoard = (board: TeacherBoardId) => {
    setActiveTeacherBoard(board);
    setActiveTeacherWorkflow(WORKFLOWS_BY_BOARD[board][0]);
  };

  const switchRongshengBoard = (board: RongshengBoardId) => {
    setActiveRongshengBoard(board);
    setActiveRongshengWorkflow(RONGSHENG_WORKFLOWS_BY_BOARD[board][0]);
  };

  const switchPoetryBoard = (board: PoetryBoardId) => {
    setActivePoetryBoard(board);
    setActivePoetryWorkflow(POETRY_WORKFLOWS_BY_BOARD[board][0]);
  };

  const structuredBoards = isYejiaying ? POETRY_BOARDS : isWangrongsheng ? RONGSHENG_BOARDS : TEACHER_BOARDS;
  const structuredWorkflow = isYejiaying ? poetryWorkflow : isWangrongsheng ? rongshengWorkflow : teacherWorkflow;
  const structuredHeaderTitle = isYejiaying ? '迦陵先生诗词教学工作台' : isWangrongsheng ? '绒绒老师教学内容工作台' : '鼎公写作教学工作台';
  const structuredHeaderHint = isYejiaying
    ? '任务树定方向，材料库放诗词原文、注释和教案，中间生成讲读课、主问题与诵读设计。'
    : isWangrongsheng
    ? '围绕教案、说课稿、逐字稿和诊断改稿，先定教学内容，再生成可交付材料。'
    : '任务树定方向，材料库供依据，中间生成成品与鼎公意见。';
  const structuredEmptyHint = isYejiaying
    ? '先选课堂成品、诗词讲读或材料诊改，再放入篇目、原文、注释、教案或课堂要求。'
    : isWangrongsheng
    ? '先选教案、说课稿、逐字稿或诊断改稿，再放入课文、单元导语、课后题、教案或活动设计。'
    : '在左侧选择任务，在右侧放入作文、教案、讲义、说课稿或素材。开始后，这里会显示鼎公生成的成品和修改意见。';
  const structuredQuestions = isYejiaying ? YEJIAYING_QUESTIONS : isWangrongsheng ? WANGRONGSHENG_QUESTIONS : WANGDINGJUN_QUESTIONS;
  const getStructuredWorkflows = (boardId: string) => (
    isYejiaying
      ? POETRY_WORKFLOWS_BY_BOARD[boardId as PoetryBoardId]
      : isWangrongsheng
      ? RONGSHENG_WORKFLOWS_BY_BOARD[boardId as RongshengBoardId]
      : WORKFLOWS_BY_BOARD[boardId as TeacherBoardId]
  );
  const getStructuredWorkflow = (workflowId: string) => (
    isYejiaying
      ? POETRY_WORKFLOWS[workflowId as PoetryWorkflowId]
      : isWangrongsheng
      ? RONGSHENG_WORKFLOWS[workflowId as RongshengWorkflowId]
      : TEACHER_WORKFLOWS[workflowId as TeacherWorkflowId]
  );
  const isStructuredBoardActive = (boardId: string) => (
    isYejiaying ? activePoetryBoard === boardId : isWangrongsheng ? activeRongshengBoard === boardId : activeTeacherBoard === boardId
  );
  const isStructuredWorkflowActive = (workflowId: string) => (
    isYejiaying ? activePoetryWorkflow === workflowId : isWangrongsheng ? activeRongshengWorkflow === workflowId : activeTeacherWorkflow === workflowId
  );
  const selectStructuredBoard = (boardId: string) => {
    if (isYejiaying) switchPoetryBoard(boardId as PoetryBoardId);
    else if (isWangrongsheng) switchRongshengBoard(boardId as RongshengBoardId);
    else switchTeacherBoard(boardId as TeacherBoardId);
  };
  const selectStructuredWorkflow = (boardId: string, workflowId: string) => {
    if (isYejiaying) {
      setActivePoetryBoard(boardId as PoetryBoardId);
      setActivePoetryWorkflow(workflowId as PoetryWorkflowId);
    } else if (isWangrongsheng) {
      setActiveRongshengBoard(boardId as RongshengBoardId);
      setActiveRongshengWorkflow(workflowId as RongshengWorkflowId);
    } else {
      setActiveTeacherBoard(boardId as TeacherBoardId);
      setActiveTeacherWorkflow(workflowId as TeacherWorkflowId);
    }
  };

  const buildUserMessage = (text: string) => {
    if (isWangdingjun) {
      return [
        text.trim(),
        '',
        `【鼎公工作台 · ${TEACHER_BOARDS.find(item => item.id === teacherWorkflow.board)?.label} · ${teacherWorkflow.label}】`,
        `年级：${workbench.grade || '未填写'}`,
        `地区：${workbench.region || '未填写'}`,
        `教材版本：${workbench.textbook || '未填写'}`,
        `学生水平：${workbench.studentLevel || '未填写'}`,
        `工作流：${teacherWorkflow.title}`,
        `公共背景：${workbench.background || '未填写'}`,
        `本次要求：${workbench.goal || '未填写'}`,
        `希望产出：${workbench.output || '未填写'}`,
        '',
        `【${teacherWorkflow.materialLabel}】`,
        workbench.material || '未填写',
        '',
        '【工作流指令】',
        teacherWorkflow.prompt,
        '',
        '【输出结构】',
        ...teacherWorkflow.outputStructure.map((item, index) => `${index + 1}. ${item}`),
        '',
        '【产品定位】',
        '这个工具服务一线老师、教培老师和需要独立完成写作教学交付的人。核心不是通用代写，而是让批改、素材、讲义、说课稿、教案整理、课后沟通、资料诊改这些看似机械的工作，先经过鼎公作文分身的判断，再变成老师能直接使用的成品。优秀老师可把重复成稿劳动交出去，一般老师可借专家框架提升取舍、结构和课堂落地能力。',
        '',
        '【边界要求】',
        '所有字段都可留空；如果用户上传了附件，请优先阅读附件，把附件当成本次工作流核心材料。只做作文批改、作文讲评、写作教学、素材包、讲义、说课稿、教案整理、课后沟通、教师资料诊改相关工作；不要定位为语文全科专家，不要冒充各省官方阅卷标准；材料不足时先基于已给材料产出可用版本，再标注需要老师补充的事实。',
      ].join('\n');
    }

    if (isWangrongsheng) {
      return [
        text.trim(),
        '',
        `【绒绒老师工作台 · ${RONGSHENG_BOARDS.find(item => item.id === rongshengWorkflow.board)?.label} · ${rongshengWorkflow.label}】`,
        `年级：${workbench.grade || '未填写'}`,
        `地区：${workbench.region || '未填写'}`,
        `教材版本：${workbench.textbook || '未填写'}`,
        `课型：${workbench.materialType || '未填写'}`,
        `学情：${workbench.studentLevel || '未填写'}`,
        `工作流：${rongshengWorkflow.title}`,
        `公共背景：${workbench.background || '未填写'}`,
        `本次困惑：${workbench.goal || '未填写'}`,
        `希望产出：${workbench.output || '未填写'}`,
        '',
        `【${rongshengWorkflow.materialLabel}】`,
        workbench.material || '未填写',
        '',
        '【工作流指令】',
        rongshengWorkflow.prompt,
        '',
        '【输出结构】',
        ...rongshengWorkflow.outputStructure.map((item, index) => `${index + 1}. ${item}`),
        '',
        '【产品定位】',
        '这个工具服务一线语文老师、教研组和教培备课负责人。核心不是代写漂亮教案，而是用王荣生语文课程与教学论的框架，帮助老师判断一节课合宜的语文教学内容是什么、哪些内容不该教、目标和活动是否一致。',
        '',
        '【边界要求】',
        '所有字段都可留空；如果用户上传了附件，请优先阅读附件，把附件当成本次工作流核心材料。只做语文教学内容判断、备课理据、课型内容诊断、课堂活动取舍、评课磨课与单元对齐；学生作文成篇润色、旁批、讲评话术转给鼎公；文学文本细读主链和主问题细读演示转给绍振细读。不要冒充官方课标解释权、命题组口径或王荣生本人即时意见。',
      ].join('\n');
    }

    if (activeExpertId === 'yejiaying') {
      return [
        text.trim(),
        '',
        `【迦陵先生工作台 · ${POETRY_BOARDS.find(item => item.id === poetryWorkflow.board)?.label} · ${poetryWorkflow.label}】`,
        `学段：${workbench.grade || '未填写'}`,
        `教材或版本：${workbench.textbook || '未填写'}`,
        `材料类型：${workbench.materialType || '未填写'}`,
        `学习基础：${workbench.studentLevel || '未填写'}`,
        `工作流：${poetryWorkflow.title}`,
        `使用场景：${workbench.background || '未填写'}`,
        `本次讲读重点：${workbench.goal || '未填写'}`,
        `希望产出：${workbench.output || '未填写'}`,
        '',
        `【${poetryWorkflow.materialLabel}】`,
        workbench.material || '未填写',
        '',
        '【工作流指令】',
        poetryWorkflow.prompt,
        '',
        '【输出结构】',
        ...poetryWorkflow.outputStructure.map((item, index) => `${index + 1}. ${item}`),
        '',
        '【产品定位】',
        '这个智脑服务一线语文老师的古典诗词教学：帮助老师把单首或组诗词从诵读声情、意象章法、兴发感动、典故查检和课堂主问题上讲清楚，形成可上课的讲读方案。',
        '',
        '【边界要求】',
        '所有字段都可留空；如果用户上传了附件，请优先阅读附件，把附件当成本次工作流核心材料。只处理古典诗词讲读、诗词鉴赏、自学带读、社团课、教案讲稿诊改与课堂主问题设计；不要接作文批改、现代文阅读赋分模板、泛文言文翻译工具、整篇代写赏析发表。材料不足时先基于已给篇目谨慎讲读，并列出需要补充的原文、注释或教材信息。',
      ].join('\n');
    }

    if (isPreconsult) {
      return [
        text.trim(),
        '',
        `【法律预咨询工作台 · ${preconsultTask.label}】`,
        `任务定位：${preconsultTask.headline}`,
        `场景说明：${preconsultTask.description}`,
        `咨询者身份：${workbench.clientName || '未填写'}`,
        `对方身份/关系：${workbench.clientBackground || '未填写'}`,
        `地区/管辖线索：${workbench.region || '未填写'}`,
        `事件进展：${workbench.materialType || '未填写'}`,
        `事实经过/时间线：${workbench.background || '未填写'}`,
        `已有证据/材料：${workbench.material || '未填写'}`,
        `当前诉求/拟采取行动：${workbench.goal || '未填写'}`,
        `希望产出：${workbench.output || preconsultTask.resultHint}`,
        '模型路由建议：先由 deepseek-chat 负责信息收集、初步分类和一般预咨询；如果事实复杂、争议金额高、涉及刑事/保全/继承/婚姻家事/多方主体/多轮追问仍无法判断，应升级 deepseek-reasoner 做结构化推理。',
        '',
        '【本次必须交付】',
        ...PRECONSULT_OUTPUT_STRUCTURE.map((item, index) => `${index + 1}. ${item}`),
        '',
        '【当前事项的整理重点】',
        ...preconsultTask.outputStructure.map((item, index) => `${index + 1}. ${item}`),
        '',
        '【产品定位】',
        '这是法律预咨询工作台。目标不是替代律师出具正式法律意见，而是在正式咨询、仲裁、投诉、平台申诉、协商沟通之前，把事实、证据、风险边界、处理顺序和可复制材料整理成可交付材料。',
        '',
        '【工作要求】',
        '语言必须专业、克制、客观，不使用行业黑话、段子化表达或情绪化措辞。不要只做免责声明。必须先把用户的叙事整理成可执行材料；信息不足时优先追问关键事实，最多追问 3 个问题；如果已有信息足够，直接给假设版判断，并标明哪些结论会随事实变化。遇到高风险事项，不只说“找律师”，还要列出带什么材料去、问什么问题、当前先暂停什么事项。',
        '',
        '【边界要求】',
        '只做一般风险梳理、证据整理、材料准备、沟通文本和渠道建议；不冒充律师、法院、监管部门或任何官方机构；不承诺结果；不教规避法律、伪造证据、威胁、网暴、泄露隐私或恶意投诉。涉及刑事、行政处罚、重大合同、婚姻家事、未成年人、医疗、隐私泄露、跨境事项时，必须列出专业确认清单。',
      ].join('\n');
    }

    if (isMindfulness) {
      return [
        text.trim(),
        '',
        `【${workbenchCopy.title}】`,
        `咨询者姓名：${workbench.clientName || '未填写'}`,
        `咨询者背景：${workbench.clientBackground || '未填写'}`,
        `当前困扰：${workbench.background || '未填写'}`,
        `希望状态：${workbench.goal || '先稳定下来'}`,
        `身体感受与触发点：${workbench.material || '未填写'}`,
        `希望产出：${workbench.output || workbenchCopy.outputFallback}`,
        '',
        '【输出要求】',
        '请先安抚，再给一个可跟做的正念练习。不要诊断，不要说教，不要给太多道理。',
      ].join('\n');
    }

    const parts = [
      text.trim(),
      '',
      '【智脑工作台】',
      `背景：${workbench.background || '未填写'}`,
      `目标：${workbench.goal || '未填写'}`,
      `材料要点：${workbench.material || '未填写'}`,
      `希望产出：${workbench.output || workbenchCopy.outputFallback}`,
      '',
      '【输出要求】',
      '可以使用 Markdown 表格、图片、公式。公式请用 LaTeX：行内 $...$，独立公式 $$...$$。',
    ];
    return parts.join('\n');
  };

  const chooseFiles = (files: FileList | null) => {
    if (!files) return;
    const incoming = Array.from(files);
    if (isWangdingjun && incoming.some(file => file.type.startsWith('image/'))) {
      showToast('图片扫描批改将在 2.0 向 SVIP 用户开放。当前可先粘贴文字或上传可读取文档。');
    }
    const readableFiles = isWangdingjun ? incoming.filter(file => !file.type.startsWith('image/')) : incoming;
    const next = [...pendingFiles, ...readableFiles].slice(0, 6);
    setPendingFiles(next);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const sendText = async (text: string) => {
    if ((!text.trim() && pendingFiles.length === 0) || sending) return;

    abortRef.current?.abort();
    setCreditBlocked(false);
    setSending(true);
    setInput('');
    setStreamingContent('');
    streamingRef.current = '';

    const filesToSend = [...pendingFiles];
    const tempId = `${TEMP_ID_PREFIX}${Date.now()}`;
    const tempAttachments = filesToSend.map((file, index) => ({
      id: `${tempId}-${index}`,
      name: file.name,
      mimeType: file.type || 'application/octet-stream',
      size: file.size,
      url: URL.createObjectURL(file),
    }));

    setPendingFiles([]);
    setMessages(prev => [
      ...prev,
      {
        id: tempId,
        role: 'user',
        content: text.trim() || '请查看附件并给出判断。',
        attachments: tempAttachments,
        createdAt: new Date().toISOString(),
      },
    ]);

    let uploaded: Attachment[] = [];
    try {
      uploaded = filesToSend.length > 0 ? await uploadAttachments(token, conversationId, filesToSend) : [];
    } catch (err) {
      showToast(err instanceof Error ? err.message : '附件上传失败');
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setPendingFiles(filesToSend);
      setSending(false);
      return;
    }

    abortRef.current = sendMessageStream(
      token,
      conversationId,
      buildUserMessage(text),
      uploaded.map(item => item.id),
      chunk => {
        streamingRef.current += chunk;
        setStreamingContent(streamingRef.current);
      },
      messageId => {
        const finalContent = streamingRef.current;
        setMessages(prev => [
          ...prev.map(m => (m.id === tempId ? { ...m, id: `${Date.now()}-sent`, attachments: uploaded } : m)),
          { id: messageId, role: 'assistant', content: finalContent, attachments: [], createdAt: new Date().toISOString() },
        ]);
        setStreamingContent('');
        setSending(false);
        inputRef.current?.focus();
      },
      err => {
        if (err.includes('积分不足') || err.includes('credits')) setCreditBlocked(true);
        showToast(err);
        setStreamingContent('');
        setSending(false);
        inputRef.current?.focus();
      },
    );
  };

  if (isPreconsult) {
    return (
      <div className="flex h-screen flex-col overflow-hidden bg-[#f5f1e8] text-[#211f1b]">
        <header className="shrink-0 border-b border-[#ded4c4] bg-[#fffaf0]/88 px-4 py-2.5 shadow-[0_1px_18px_rgba(64,48,28,0.06)] backdrop-blur-xl">
          <div className="mx-auto flex max-w-[1440px] items-center gap-3">
            <button onClick={onBack} className="grid h-10 w-10 place-items-center rounded-lg border border-[#d8cdbb] bg-white/85 text-lg text-stone-600 shadow-sm transition hover:bg-white" title="返回">←</button>
            <button onClick={onOpenHome} className="rounded-lg border border-[#d8cdbb] bg-white/85 px-3.5 py-2 text-xs font-semibold text-stone-700 shadow-sm transition hover:bg-white">首页</button>
            <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-[#d8cdbb] bg-[#efe6d6]"><img src={meta.avatar} alt={meta.alias} className="h-full w-full object-cover" onError={event => { event.currentTarget.style.display = 'none'; }} /></div>
            <div className="min-w-0 flex-1"><h1 className="truncate text-base font-semibold text-[#211f1b]">狂徒张三法律预咨询工作台</h1><p className="truncate text-xs text-stone-500">整理事实、证据、程序进展和可提交材料。</p></div>
            <button onClick={() => setPreconsultLibraryOpen(prev => !prev)} className="rounded-lg border border-[#d8cdbb] bg-white/85 px-3.5 py-2 text-xs font-semibold text-stone-600 shadow-sm transition hover:bg-white">{preconsultLibraryOpen ? '收起材料库' : '展开材料库'}</button>
            <button onClick={onOpenCredits} className="rounded-lg border border-[#d8cdbb] bg-white/85 px-3.5 py-2 text-xs font-semibold text-stone-600 shadow-sm">积分</button>
          </div>
        </header>
        <main className={`mx-auto grid min-h-0 w-full max-w-[1440px] flex-1 gap-3 p-3 transition-[grid-template-columns] duration-300 ${preconsultLibraryOpen ? 'grid-cols-[304px_minmax(0,1fr)_316px]' : 'grid-cols-[304px_minmax(0,1fr)_52px]'}`}>
          <aside className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-[#d8cdbb] bg-[#fffaf0]/88 shadow-[0_14px_34px_rgba(64,48,28,0.06)]">
            <div className="border-b border-[#e4dacb] p-3"><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8a6b38]">热门咨询</p><h2 className="mt-1 text-[15px] font-semibold text-[#211f1b]">咨询事项</h2><p className="mt-1 text-xs leading-5 text-stone-500">{preconsultTask.headline}</p></div>
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
              {KUANGTUZHANGSAN_TASKS.map(task => {
                const active = task.id === activePreconsultTask;
                return (
                  <button key={task.id} type="button" onClick={() => { setActivePreconsultTask(task.id); updateWorkbenchValue('output', task.resultHint); }} className={`w-full rounded-lg border px-3 py-2.5 text-left transition ${active ? 'border-[#2b2721] bg-[#2b2721] text-white shadow-sm' : 'border-[#e3d8c7] bg-white text-stone-800 hover:border-[#cdbda6] hover:bg-[#fffdf8]'}`}>
                    <span className="block text-[13px] font-semibold leading-5">{task.label}</span>
                    <span className={`mt-0.5 block whitespace-normal break-words text-[11px] leading-4 ${active ? 'text-white/68' : 'text-stone-500'}`}>{task.headline}</span>
                    {active && <span className="mt-2 block text-[11px] leading-5 text-white/72">{task.description}</span>}
                  </button>
                );
              })}
              <div className="rounded-lg border border-[#e3d8c7] bg-white p-3"><p className="text-xs font-semibold text-[#7d5b25]">常见提问</p><div className="mt-2 grid gap-1.5">{preconsultTask.quickQuestions.map(question => (<button key={question} type="button" onClick={() => sendText(question)} className="rounded-md bg-[#f6f0e6] px-2.5 py-2 text-left text-[11px] leading-4 text-stone-600 transition hover:bg-[#efe3d0] hover:text-stone-900">{question}</button>))}</div></div>
              <div className="rounded-lg border border-[#ead8b7] bg-[#fff7e6] p-3 text-xs leading-5 text-[#7d5b25]"><p className="font-semibold text-[#5f4218]">预计整理内容</p><p className="mt-1">{preconsultTask.resultHint}</p></div>
            </div>
          </aside>
          <section className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-lg border border-[#d8cdbb] bg-white shadow-[0_14px_34px_rgba(64,48,28,0.06)]">
            <div className="border-b border-[#e4dacb] bg-white p-4"><div className="flex items-start justify-between gap-4"><div className="min-w-0"><p className="text-[11px] font-semibold text-[#8a6b38]">法律预咨询 / {preconsultTask.label}</p><h2 className="mt-1 text-lg font-semibold text-[#211f1b]">{preconsultTask.headline}</h2><p className="mt-1 max-w-3xl text-xs leading-5 text-stone-500">{preconsultTask.description}</p></div><div className="flex shrink-0 gap-1.5 text-[11px] font-semibold"><span className="rounded-md bg-[#f5e2df] px-2.5 py-1 text-[#8d2f24]">高风险</span><span className="rounded-md bg-[#fff1ce] px-2.5 py-1 text-[#8a5f12]">需核实</span><span className="rounded-md bg-[#ece7de] px-2.5 py-1 text-stone-600">需留痕</span></div></div></div>
            <div className="min-h-0 overflow-y-auto bg-[#faf7ef] p-3">
              {creditBlocked && (<div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"><p className="font-semibold">积分不足，暂时不能继续提问</p><button type="button" onClick={onOpenCredits} className="mt-2 rounded-md bg-red-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-600">去积分中心</button></div>)}
              {messagesLoading && <div className="py-16 text-center text-sm text-stone-400">加载中...</div>}
              {messagesError && <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">消息加载失败，请返回重试。</div>}
              {!messagesLoading && !messagesError && messages.length === 0 && !sending && (<div className="flex h-full min-h-[420px] items-center justify-center rounded-lg border border-dashed border-[#d8cdbb] bg-white/58 px-6 py-10"><div className="max-w-md text-center"><p className="text-[13px] font-semibold text-stone-500">等待咨询信息</p><p className="mt-2 text-xs leading-6 text-stone-400">先填写右侧基础信息；信息不足时会继续追问，信息足够时会直接整理事实、证据、风险边界和处理路径。</p><button onClick={() => sendText(`请围绕${preconsultTask.label}事项整理一次法律预咨询。`)} disabled={sending} className="mt-5 rounded-md bg-[#2b2721] px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#44392d] disabled:opacity-40">整理咨询材料</button></div></div>)}
              {messages.map(msg => { const isUser = msg.role === 'user'; return (<div key={msg.id} className={`mb-4 flex ${isUser ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[88%] rounded-lg px-3.5 py-2.5 text-[13px] leading-6 shadow-sm ${isUser ? 'rounded-br-sm bg-[#2b2721] text-white' : 'rounded-bl-sm border border-[#e1d6c5] bg-white text-stone-800'}`}><MessageText content={msg.content} dark={isUser} /><AttachmentList attachments={msg.attachments} dark={isUser} />{!isUser && (<div className="mt-3 flex flex-wrap gap-2 border-t border-stone-100 pt-3"><button onClick={() => { navigator.clipboard.writeText(msg.content); showToast('已复制', 'info'); }} className="rounded-md border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-semibold text-stone-600 transition hover:bg-white">复制</button><button onClick={() => downloadWordDocument(conversationTitle || `${preconsultTask.label}预咨询材料`, msg.content)} className="rounded-md border border-[#ead8b7] bg-[#fff7e6] px-3 py-1.5 text-xs font-semibold text-[#7d5b25] transition hover:bg-white">下载 Word</button></div>)}</div></div>); })}
              {streamingContent && (<div className="mb-4 flex justify-start"><div className="max-w-[88%] rounded-lg rounded-bl-sm border border-[#e1d6c5] bg-white px-3.5 py-2.5 text-[13px] leading-6 text-stone-800 shadow-sm"><MessageText content={streamingContent} /><span className="ml-1 inline-block h-4 w-1.5 animate-pulse rounded-sm bg-[#8a6b38] align-middle" /></div></div>)}
              <div ref={bottomRef} />
            </div>
            <div className="border-t border-[#e4dacb] bg-white p-2.5"><input ref={fileInputRef} type="file" multiple accept="image/*,.pdf,.txt,.md,.doc,.docx" onChange={event => chooseFiles(event.target.files)} className="hidden" />{pendingFiles.length > 0 && (<div className="mb-2 flex flex-wrap gap-2">{pendingFiles.map((file, index) => (<div key={`${file.name}-${index}`} className="flex max-w-full items-center gap-2 rounded-md border border-[#e1d6c5] bg-[#faf7ef] px-2.5 py-1.5 text-xs text-stone-700"><span className="max-w-48 truncate font-semibold">{file.name}</span><button type="button" onClick={() => setPendingFiles(prev => prev.filter((_, i) => i !== index))} className="text-stone-400 hover:text-red-600" title="移除">x</button></div>))}</div>)}<div className="flex gap-2"><button type="button" onClick={() => fileInputRef.current?.click()} disabled={sending} className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-[#d8cdbb] bg-white text-lg text-stone-700 shadow-sm transition hover:border-[#8a6b38] hover:text-[#7d5b25] disabled:opacity-40" title="上传附件">+</button><input ref={inputRef} type="text" value={input} onChange={event => setInput(event.target.value)} onKeyDown={event => event.key === 'Enter' && sendText(input)} placeholder={sending ? '正在整理...' : '补充事实、证据或当前诉求'} className="min-w-0 flex-1 rounded-md border border-[#d8cdbb] bg-white px-3 py-2 text-[13px] text-stone-900 outline-none placeholder:text-stone-400 focus:border-[#8a6b38] focus:ring-1 focus:ring-[#8a6b38]/20" /><button onClick={() => sendText(`请围绕${preconsultTask.label}事项整理一次法律预咨询。`)} disabled={sending} className="shrink-0 rounded-md bg-[#2b2721] px-4 py-2 text-[13px] font-semibold text-white shadow transition hover:bg-[#44392d] disabled:opacity-40">整理材料</button><button onClick={() => sendText(input)} disabled={sending || (!input.trim() && pendingFiles.length === 0)} className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-stone-900 text-white shadow transition hover:bg-stone-800 disabled:opacity-40" title="发送补充">→</button></div></div>
          </section>
          <aside className="min-h-0 overflow-hidden rounded-lg border border-[#d8cdbb] bg-[#fffaf0]/88 shadow-[0_14px_34px_rgba(64,48,28,0.06)]">
            {preconsultLibraryOpen ? (<div className="flex h-full min-h-0 flex-col"><div className="flex items-center justify-between border-b border-[#e4dacb] p-3"><div><p className="text-[13px] font-semibold text-[#211f1b]">咨询信息</p><p className="text-xs text-stone-500">身份、进展、事实、证据</p></div><button type="button" onClick={() => setPreconsultLibraryOpen(false)} className="rounded-md border border-[#d8cdbb] bg-white px-2.5 py-1 text-[11px] font-semibold text-stone-600">收起</button></div><div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto p-3"><button type="button" onClick={() => fileInputRef.current?.click()} className="w-full rounded-lg border border-dashed border-[#cdbda6] bg-white px-3 py-3 text-left transition hover:bg-[#fffdf8]"><span className="block text-[13px] font-semibold text-[#211f1b]">添加材料附件</span><span className="mt-1 block text-xs leading-5 text-stone-500">截图、合同、聊天、工单、录屏、PDF、Word 都可以先放进来。</span></button><label className="block rounded-lg border border-[#e3d8c7] bg-white p-3"><span className="mb-2 block text-xs font-semibold text-stone-700">咨询者身份</span><input value={workbench.clientName} onChange={event => updateWorkbenchValue('clientName', event.target.value)} placeholder="例如：员工、消费者、房屋买方、被告、家属、继承人。" className="h-9 w-full rounded-md border border-[#e3d8c7] bg-[#fffdf8] px-3 text-xs text-stone-800 outline-none placeholder:text-stone-400 focus:border-[#8a6b38]" /></label><label className="block rounded-lg border border-[#e3d8c7] bg-white p-3"><span className="mb-2 block text-xs font-semibold text-stone-700">对方身份/关系</span><input value={workbench.clientBackground} onChange={event => updateWorkbenchValue('clientBackground', event.target.value)} placeholder="例如：公司、商家、房东、亲属、平台、交警、公安机关。" className="h-9 w-full rounded-md border border-[#e3d8c7] bg-[#fffdf8] px-3 text-xs text-stone-800 outline-none placeholder:text-stone-400 focus:border-[#8a6b38]" /></label><div className="grid grid-cols-2 gap-2"><label className="block rounded-lg border border-[#e3d8c7] bg-white p-3"><span className="mb-2 block text-xs font-semibold text-stone-700">地区/管辖</span><input value={workbench.region} onChange={event => updateWorkbenchValue('region', event.target.value)} placeholder="城市或地区" className="h-9 w-full rounded-md border border-[#e3d8c7] bg-[#fffdf8] px-3 text-xs text-stone-800 outline-none placeholder:text-stone-400 focus:border-[#8a6b38]" /></label><label className="block rounded-lg border border-[#e3d8c7] bg-white p-3"><span className="mb-2 block text-xs font-semibold text-stone-700">事件进展</span><select value={workbench.materialType} onChange={event => updateWorkbenchValue('materialType', event.target.value)} className="h-9 w-full rounded-md border border-[#e3d8c7] bg-[#fffdf8] px-2 text-xs text-stone-800 outline-none focus:border-[#8a6b38]"><option value="">请选择</option>{['刚发生', '协商中', '收到威胁/催告', '准备起诉', '已起诉', '已收到起诉材料', '准备报案', '已报案/被传唤', '准备保全', '已调解/仲裁中'].map(item => <option key={item} value={item}>{item}</option>)}</select></label></div><label className="block rounded-lg border border-[#e3d8c7] bg-white p-3"><span className="mb-2 block text-xs font-semibold text-stone-700">事实经过/时间线</span><textarea value={workbench.background} onChange={event => updateWorkbenchValue('background', event.target.value)} placeholder={preconsultTask.materialPlaceholder} rows={4} className="w-full resize-none rounded-md border border-[#e3d8c7] bg-[#fffdf8] px-3 py-2 text-xs leading-5 text-stone-800 outline-none placeholder:text-stone-400 focus:border-[#8a6b38]" /></label><label className="block rounded-lg border border-[#e3d8c7] bg-white p-3"><span className="mb-2 block text-xs font-semibold text-stone-700">{preconsultTask.materialLabel}</span><textarea value={workbench.material} onChange={event => updateWorkbenchValue('material', event.target.value)} placeholder="把已有证据逐条写下来：证据名称、在谁手里、能证明什么、是否已截图或导出。" rows={5} className="w-full resize-none rounded-md border border-[#e3d8c7] bg-[#fffdf8] px-3 py-2 text-xs leading-5 text-stone-800 outline-none placeholder:text-stone-400 focus:border-[#8a6b38]" /></label><label className="block rounded-lg border border-[#e3d8c7] bg-white p-3"><span className="mb-2 block text-xs font-semibold text-stone-700">{preconsultTask.actionLabel}</span><textarea value={workbench.goal} onChange={event => updateWorkbenchValue('goal', event.target.value)} placeholder={preconsultTask.actionPlaceholder} rows={3} className="w-full resize-none rounded-md border border-[#e3d8c7] bg-[#fffdf8] px-3 py-2 text-xs leading-5 text-stone-800 outline-none placeholder:text-stone-400 focus:border-[#8a6b38]" /></label><label className="block rounded-lg border border-[#e3d8c7] bg-white p-3"><span className="mb-2 block text-xs font-semibold text-stone-700">希望拿到的材料</span><input value={workbench.output} onChange={event => updateWorkbenchValue('output', event.target.value)} placeholder={preconsultTask.resultHint} className="h-9 w-full rounded-md border border-[#e3d8c7] bg-[#fffdf8] px-3 text-xs text-stone-800 outline-none placeholder:text-stone-400 focus:border-[#8a6b38]" /></label></div></div>) : (<button type="button" onClick={() => setPreconsultLibraryOpen(true)} className="flex h-full w-full items-center justify-center bg-[#fffaf0] text-xs font-semibold text-stone-600 [writing-mode:vertical-rl]">展开咨询信息</button>)}
          </aside>
        </main>
      </div>
    );
  }

  if (isWangrongsheng) {
    const deliveryWorkflows = RONGSHENG_WORKFLOWS_BY_BOARD.reading.map(id => RONGSHENG_WORKFLOWS[id]);
    const evidenceWorkflows = [...RONGSHENG_WORKFLOWS_BY_BOARD['lesson-type'], ...RONGSHENG_WORKFLOWS_BY_BOARD.diagnosis].map(id => RONGSHENG_WORKFLOWS[id]);

    return (
      <div className="flex h-screen flex-col overflow-hidden bg-[#f7f4ee] text-stone-950">
        <header className="shrink-0 border-b border-stone-200/70 bg-[#fffaf2]/86 px-4 py-2.5 shadow-[0_1px_20px_rgba(80,64,42,0.05)] backdrop-blur-xl">
          <div className="mx-auto flex max-w-[1400px] items-center gap-3">
            <button onClick={onBack} className="grid h-10 w-10 place-items-center rounded-full border border-stone-200 bg-white/85 text-lg text-stone-600 shadow-sm transition hover:bg-white" title="返回">
              ←
            </button>
            <button onClick={onOpenHome} className="rounded-full border border-stone-200 bg-white/85 px-4 py-2 text-sm font-black text-stone-700 shadow-sm transition hover:bg-white">
              首页
            </button>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#ede3d4]">
              <img src={meta.avatar} alt={meta.alias} className="h-full w-full object-cover" onError={event => { event.currentTarget.style.display = 'none'; }} />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-base font-semibold text-stone-950">绒绒老师语文备课工作台</h1>
              <p className="truncate text-xs text-stone-500">围绕教案、说课稿、逐字稿和评课诊断，先定教学内容，再生成可交付材料。</p>
            </div>
            <button onClick={onOpenCredits} className="rounded-full border border-stone-200 bg-white/85 px-4 py-2 text-xs font-black text-stone-600 shadow-sm">
              积分
            </button>
          </div>
        </header>

        <main className="mx-auto grid min-h-0 w-full max-w-[1400px] flex-1 grid-cols-[340px_minmax(0,1fr)] gap-3 p-3">
          <aside className="flex min-h-0 flex-col overflow-hidden rounded-[22px] border border-stone-200/80 bg-[#fffaf2]/86 shadow-[0_14px_36px_rgba(80,64,42,0.06)]">
            <div className="border-b border-stone-200/80 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8a5a35]">备课材料</p>
              <h2 className="mt-1 text-lg font-semibold text-stone-950">先把课放进来</h2>
              <p className="mt-1 text-xs leading-5 text-stone-500">篇名、单元导语、课后题、已有教案、说课要求、课堂活动都可以先放这里。</p>
            </div>

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-black text-stone-700">年级</span>
                  <select value={workbench.grade} onChange={event => updateWorkbenchValue('grade', event.target.value)} className="h-9 w-full rounded-xl border border-[#eadfce] bg-white px-2 text-xs text-stone-800 outline-none focus:border-[#8a5a35]">
                    <option value="">可不选</option>
                    {['三年级', '四年级', '五年级', '六年级', '初一', '初二', '初三', '高一', '高二', '高三'].map(item => <option key={item} value={item}>{item}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-black text-stone-700">课型</span>
                  <select value={workbench.materialType} onChange={event => updateWorkbenchValue('materialType', event.target.value)} className="h-9 w-full rounded-xl border border-[#eadfce] bg-white px-2 text-xs text-stone-800 outline-none focus:border-[#8a5a35]">
                    <option value="">可不选</option>
                    {['教读课', '自读课', '写作课', '单元导读', '复习课', '评课磨课', '不确定'].map(item => <option key={item} value={item}>{item}</option>)}
                  </select>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <input value={workbench.textbook} onChange={event => updateWorkbenchValue('textbook', event.target.value)} placeholder="教材版本" className="h-9 rounded-xl border border-[#eadfce] bg-white px-3 text-xs outline-none placeholder:text-stone-400 focus:border-[#8a5a35]" />
                <input value={workbench.studentLevel} onChange={event => updateWorkbenchValue('studentLevel', event.target.value)} placeholder="学情简述" className="h-9 rounded-xl border border-[#eadfce] bg-white px-3 text-xs outline-none placeholder:text-stone-400 focus:border-[#8a5a35]" />
              </div>

              <label className="block">
                <span className="mb-1.5 block text-xs font-black text-stone-700">教材与备课材料</span>
                <textarea
                  value={workbench.material}
                  onChange={event => updateWorkbenchValue('material', event.target.value)}
                  placeholder="粘贴篇名、单元导语、课后题、已有教案、说课稿要求、活动流程或课堂逐字稿草稿。"
                  rows={10}
                  className="w-full resize-none rounded-2xl border border-[#eadfce] bg-white px-3 py-2 text-xs leading-5 text-stone-800 outline-none placeholder:text-stone-400 focus:border-[#8a5a35]"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-black text-stone-700">本次要求</span>
                <textarea
                  value={workbench.goal}
                  onChange={event => updateWorkbenchValue('goal', event.target.value)}
                  placeholder="例如：要一份 40 分钟教案；要 8 分钟说课稿；要把流程改成逐字稿；要诊断目标和活动是否一致。"
                  rows={3}
                  className="w-full resize-none rounded-2xl border border-[#eadfce] bg-white px-3 py-2 text-xs leading-5 text-stone-800 outline-none placeholder:text-stone-400 focus:border-[#8a5a35]"
                />
              </label>

              <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full rounded-2xl border border-dashed border-[#d8c5aa] bg-white px-3 py-3 text-left transition hover:bg-[#fffdf8]">
                <span className="block text-[13px] font-semibold text-stone-950">上传资料</span>
                <span className="mt-1 block text-xs leading-5 text-stone-500">支持 Word、PDF、TXT、Markdown。</span>
              </button>

              {pendingFiles.length > 0 && (
                <div className="grid gap-2">
                  {pendingFiles.map((file, index) => (
                    <div key={`${file.name}-${index}`} className="flex items-center gap-2 rounded-xl bg-[#fbf6ee] px-3 py-2 text-xs text-stone-700">
                      <span className="min-w-0 flex-1 truncate font-semibold">{file.name}</span>
                      <button type="button" onClick={() => setPendingFiles(prev => prev.filter((_, i) => i !== index))} className="text-stone-400 hover:text-red-600" title="移除">x</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </aside>

          <section className="grid min-h-0 grid-rows-[auto_auto_minmax(0,1fr)_auto] overflow-hidden rounded-[22px] border border-stone-200/80 bg-white shadow-[0_14px_36px_rgba(80,64,42,0.06)]">
            <div className="border-b border-stone-200 bg-white p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8a5a35]">交付类型</p>
                  <h2 className="mt-1 text-xl font-semibold text-stone-950">{rongshengWorkflow.title}</h2>
                  <p className="mt-1 max-w-3xl text-xs leading-5 text-stone-500">{rongshengWorkflow.intro}</p>
                </div>
                <span className="shrink-0 rounded-full bg-[#f3eadc] px-2.5 py-1 text-[11px] font-semibold text-[#7a4c2c]">先定内容</span>
              </div>
            </div>

            <div className="border-b border-stone-200 bg-[#fffaf2] p-3">
              <div className="grid gap-2 md:grid-cols-3">
                {deliveryWorkflows.map(workflow => {
                  const active = activeRongshengWorkflow === Object.keys(RONGSHENG_WORKFLOWS).find(key => RONGSHENG_WORKFLOWS[key as RongshengWorkflowId] === workflow);
                  const workflowId = Object.entries(RONGSHENG_WORKFLOWS).find(([, value]) => value === workflow)?.[0] as RongshengWorkflowId;
                  return (
                    <button
                      key={workflow.label}
                      type="button"
                      onClick={() => {
                        setActiveRongshengBoard('reading');
                        setActiveRongshengWorkflow(workflowId);
                      }}
                      className={`rounded-2xl border px-3 py-3 text-left transition ${active ? 'border-[#2f251d] bg-[#2f251d] text-white' : 'border-[#eadfce] bg-white text-stone-800 hover:border-[#d8c5aa]'}`}
                    >
                      <span className="block text-sm font-semibold">{workflow.label}</span>
                      <span className={`mt-1 block text-xs leading-5 ${active ? 'text-white/68' : 'text-stone-500'}`}>{workflow.title}</span>
                    </button>
                  );
                })}
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {evidenceWorkflows.map(workflow => {
                  const workflowId = Object.entries(RONGSHENG_WORKFLOWS).find(([, value]) => value === workflow)?.[0] as RongshengWorkflowId;
                  const active = activeRongshengWorkflow === workflowId;
                  return (
                    <button
                      key={workflow.label}
                      type="button"
                      onClick={() => {
                        setActiveRongshengBoard(workflow.board);
                        setActiveRongshengWorkflow(workflowId);
                      }}
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${active ? 'border-[#8a5a35] bg-[#f0e4d3] text-[#5c3d24]' : 'border-[#eadfce] bg-white text-stone-500 hover:text-stone-800'}`}
                    >
                      {workflow.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="min-h-0 overflow-y-auto bg-[#fbf8f2] p-3">
              {creditBlocked && (
                <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                  <p className="font-black">积分不足，暂时不能继续提问</p>
                  <button type="button" onClick={onOpenCredits} className="mt-2 rounded-lg bg-red-700 px-3 py-1.5 text-xs font-black text-white hover:bg-red-600">去积分中心</button>
                </div>
              )}
              {messagesLoading && <div className="py-16 text-center text-sm text-stone-400">加载中...</div>}
              {messagesError && <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">消息加载失败，请返回重试。</div>}
              {!messagesLoading && !messagesError && messages.length === 0 && !sending && (
                <div className="rounded-2xl border border-dashed border-[#eadfce] bg-white/65 px-6 py-8 text-center">
                  <p className="text-base font-semibold text-stone-900">选择成品类型，放入备课材料，就可以开始。</p>
                  <p className="mx-auto mt-2 max-w-lg text-xs leading-6 text-stone-500">绒绒老师会先判断本课合宜的教学内容，再生成教案、说课稿、逐字稿或诊断改稿，不把课堂写成空模板。</p>
                  <div className="mt-5 flex flex-wrap justify-center gap-2">
                    {WANGRONGSHENG_QUESTIONS.map(question => (
                      <button key={question} type="button" onClick={() => sendText(question)} className="rounded-full border border-[#eadfce] bg-white/80 px-3 py-1.5 text-[11px] font-semibold text-stone-500 transition hover:border-[#d8c5aa] hover:text-stone-700">
                        {question}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map(msg => {
                const isUser = msg.role === 'user';
                return (
                  <div key={msg.id} className={`mb-4 flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-6 shadow-sm ${isUser ? 'rounded-br-sm bg-[#2f251d] text-white' : 'rounded-bl-sm border border-[#eadfce] bg-white text-stone-800'}`}>
                      <MessageText content={msg.content} dark={isUser} />
                      <AttachmentList attachments={msg.attachments} dark={isUser} />
                      {!isUser && (
                        <div className="mt-3 flex flex-wrap gap-2 border-t border-stone-100 pt-3">
                          <button onClick={() => { navigator.clipboard.writeText(msg.content); showToast('已复制', 'info'); }} className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-black text-stone-600 transition hover:bg-white">
                            复制
                          </button>
                          <button onClick={() => downloadWordDocument(conversationTitle || rongshengWorkflow.title || 'AI 回答', msg.content)} className="rounded-lg border border-[#eadfce] bg-[#fbf6ee] px-3 py-1.5 text-xs font-black text-[#7a4c2c] transition hover:bg-white">
                            下载 Word
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {streamingContent && (
                <div className="mb-4 flex justify-start">
                  <div className="max-w-[88%] rounded-2xl rounded-bl-sm border border-[#eadfce] bg-white px-3.5 py-2.5 text-[13px] leading-6 text-stone-800 shadow-sm">
                    <MessageText content={streamingContent} />
                    <span className="ml-1 inline-block h-4 w-1.5 animate-pulse rounded-sm bg-[#8a5a35] align-middle" />
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            <div className="border-t border-stone-200 bg-white p-2.5">
              <input ref={fileInputRef} type="file" multiple accept=".pdf,.txt,.md,.doc,.docx" onChange={event => chooseFiles(event.target.files)} className="hidden" />
              <div className="flex gap-2">
                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={sending} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-stone-300 bg-white text-lg text-stone-700 shadow-sm transition hover:border-[#8a5a35] hover:text-[#8a5a35] disabled:opacity-40" title="上传附件">
                  +
                </button>
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={event => setInput(event.target.value)}
                  onKeyDown={event => event.key === 'Enter' && sendText(input)}
                  placeholder={sending ? '等待 AI 回复中...' : '补充要求，也可以只发附件'}
                  className="min-w-0 flex-1 rounded-xl border border-stone-300 bg-white px-3 py-2 text-[13px] text-stone-900 outline-none placeholder:text-stone-400 focus:border-[#8a5a35] focus:ring-1 focus:ring-[#8a5a35]/20"
                />
                <button onClick={() => sendText(rongshengWorkflow.prompt)} disabled={sending} className="shrink-0 rounded-xl bg-[#2f251d] px-4 py-2 text-[13px] font-semibold text-white shadow transition hover:bg-[#4a3728] disabled:opacity-40">
                  {rongshengWorkflow.button}
                </button>
                <button onClick={() => sendText(input)} disabled={sending || (!input.trim() && pendingFiles.length === 0)} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-stone-900 text-white shadow transition hover:bg-stone-800 disabled:opacity-40" title="发送补充">
                  →
                </button>
              </div>
            </div>
          </section>
        </main>
      </div>
    );
  }

  if (isStructuredTeacher) {
    return (
      <div className="flex h-screen flex-col overflow-hidden bg-[#f7f4ee] text-stone-950">
        <header className="shrink-0 border-b border-stone-200/70 bg-[#fffaf2]/82 px-4 py-2.5 shadow-[0_1px_20px_rgba(80,64,42,0.05)] backdrop-blur-xl">
          <div className="mx-auto flex max-w-[1440px] items-center gap-3">
            <button onClick={onBack} className="grid h-10 w-10 place-items-center rounded-full border border-stone-200 bg-white/85 text-lg text-stone-600 shadow-sm transition hover:bg-white" title="返回">
              ←
            </button>
            <button onClick={onOpenHome} className="rounded-full border border-stone-200 bg-white/85 px-4 py-2 text-sm font-black text-stone-700 shadow-sm transition hover:bg-white">
              首页
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-base font-semibold text-stone-950">{structuredHeaderTitle}</h1>
              <p className="truncate text-xs text-stone-500">{structuredHeaderHint}</p>
            </div>
            <button onClick={() => setTeacherLibraryOpen(prev => !prev)} className="rounded-full border border-stone-200 bg-white/85 px-4 py-2 text-xs font-black text-stone-600 shadow-sm transition hover:bg-white">
              {teacherLibraryOpen ? '收起材料库' : '展开材料库'}
            </button>
            <button onClick={onOpenCredits} className="rounded-full border border-stone-200 bg-white/85 px-4 py-2 text-xs font-black text-stone-600 shadow-sm">
              积分
            </button>
          </div>
        </header>

        <main className={`mx-auto grid min-h-0 w-full max-w-[1440px] flex-1 gap-3 p-3 transition-[grid-template-columns] duration-300 ${teacherLibraryOpen ? 'grid-cols-[292px_minmax(0,1fr)_292px]' : 'grid-cols-[292px_minmax(0,1fr)_52px]'}`}>
          <aside className="flex min-h-0 flex-col overflow-hidden rounded-[22px] border border-stone-200/80 bg-[#fffaf2]/86 shadow-[0_14px_36px_rgba(80,64,42,0.06)]">
            <div className="border-b border-stone-200/80 p-3">
              <div className="flex items-center gap-2.5">
                <div className="h-10 w-10 shrink-0 overflow-hidden rounded-2xl bg-[#f0e9dd]">
                  <img src={meta.avatar} alt={meta.alias} className="h-full w-full object-cover" onError={event => { event.currentTarget.style.display = 'none'; }} />
                </div>
                <div className="min-w-0">
                  <p className="text-[15px] font-semibold text-stone-950">{isYejiaying ? '诗词教学入口' : '任务树'}</p>
                  <p className="mt-0.5 truncate text-xs leading-5 text-stone-500">{structuredWorkflow.title}</p>
                </div>
              </div>
            </div>

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
              <div className="space-y-2">
                {isYejiaying ? (
                  <div className="grid gap-2">
                    {POETRY_FLAT_WORKFLOW_IDS.map(workflowId => {
                      const workflow = POETRY_WORKFLOWS[workflowId];
                      const active = activePoetryWorkflow === workflowId;
                      return (
                        <button
                          key={workflowId}
                          type="button"
                          onClick={() => {
                            setActivePoetryBoard(workflow.board);
                            setActivePoetryWorkflow(workflowId);
                          }}
                          className={`min-w-0 rounded-2xl border px-3 py-2.5 text-left transition ${active ? 'border-[#2f251d] bg-[#2f251d] text-white shadow-sm' : 'border-[#eadfce] bg-white text-stone-800 hover:border-[#d8c5aa] hover:bg-[#fffdf8]'}`}
                        >
                          <span className="block text-[13px] font-semibold">{workflow.label}</span>
                          <span className={`mt-1 block whitespace-normal break-words text-[11px] leading-4 ${active ? 'text-white/70' : 'text-stone-500'}`}>{workflow.title}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : structuredBoards.map(board => (
                  <div key={board.id} className="overflow-hidden rounded-2xl border border-[#eadfce] bg-white p-2">
                    <button
                      type="button"
                      onClick={() => selectStructuredBoard(board.id)}
                      className={`w-full rounded-xl px-2.5 py-2 text-left transition ${isStructuredBoardActive(board.id) ? 'bg-[#2f251d] text-white' : 'bg-[#f8f4ed] text-stone-800 hover:bg-[#f2eadf]'}`}
                    >
                      <span className="block text-[13px] font-semibold">{board.label}</span>
                      <span className={`mt-1 block whitespace-normal break-words text-[11px] leading-4 ${isStructuredBoardActive(board.id) ? 'text-white/70' : 'text-stone-500'}`}>{board.hint}</span>
                    </button>
                    <div className="mt-2 grid gap-1.5">
                      {getStructuredWorkflows(board.id).map(workflowId => {
                        const workflow = getStructuredWorkflow(workflowId);
                        const active = isStructuredWorkflowActive(workflowId);
                        return (
                          <button
                            key={workflowId}
                            type="button"
                            onClick={() => selectStructuredWorkflow(board.id, workflowId)}
                            className={`min-w-0 rounded-xl px-2.5 py-1.5 text-left text-xs transition ${active ? 'bg-[#f0e4d3] text-[#5c3d24]' : 'text-stone-600 hover:bg-[#faf7f2]'}`}
                          >
                            <span className="font-semibold">{workflow.label}</span>
                            <span className="mt-0.5 block whitespace-normal break-words text-[11px] leading-4 opacity-75">{workflow.title}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full rounded-2xl border border-[#eadfce] bg-white px-3 py-3 text-left shadow-sm transition hover:border-[#d8c5aa] hover:bg-[#fffdf8]"
              >
                <span className="block text-[13px] font-semibold text-stone-950">上传资料</span>
                <span className="mt-1 block text-xs leading-5 text-stone-500">{isYejiaying ? '诗词原文、注释、讲稿、板书和课堂要求都可以。' : isWangrongsheng ? '课文、课后题、教案、活动设计、听评课记录都可以。' : '作文、教案、讲义、说课稿、素材包都可以。'}</span>
              </button>

              {pendingFiles.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-black text-stone-500">待发送资料</p>
                  {pendingFiles.map((file, index) => (
                    <div key={`${file.name}-${index}`} className="flex items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-700">
                      <span className="min-w-0 flex-1 truncate font-semibold">{file.name}</span>
                      <button type="button" onClick={() => setPendingFiles(prev => prev.filter((_, i) => i !== index))} className="text-stone-400 hover:text-red-600" title="移除">x</button>
                    </div>
                  ))}
                </div>
              )}

                  <label className="block">
                    <span className="mb-1.5 block text-xs font-black text-stone-700">公共背景（可选）</span>
                    <textarea
                      value={workbench.background}
                      onChange={event => updateWorkbenchValue('background', event.target.value)}
                      placeholder={isYejiaying ? '例如：初二统编版、社团课、学生能背但不会讲出意象和情感层次。也可以留空。' : isWangrongsheng ? '例如：初二统编版、单元在训练人物描写、学生读文本容易只谈主题。也可以留空。' : '例如：初二小班、最近在训练细节描写、学生普遍结构松散。也可以留空。'}
                      rows={4}
                      className="w-full rounded-xl border border-[#eadfce] bg-white px-3 py-2 text-xs leading-5 text-stone-800 outline-none placeholder:text-stone-400 focus:border-[#8a5a35]"
                    />
                  </label>

              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-black text-stone-700">{isYejiaying ? '学段' : '年级'}</span>
                  <select value={workbench.grade} onChange={event => updateWorkbenchValue('grade', event.target.value)} className="h-9 w-full rounded-xl border border-[#eadfce] bg-white px-2 text-xs text-stone-800 outline-none focus:border-[#8a5a35]">
                    <option value="">可不选</option>
                    {(isYejiaying ? ['小学高年级', '初中', '高中', '大学通识', '成人自学', '不确定'] : ['三年级', '四年级', '五年级', '六年级', '初一', '初二', '初三', '高一', '高二', '高三']).map(item => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-black text-stone-700">{isYejiaying ? '基础' : '水平'}</span>
                  <select value={workbench.studentLevel} onChange={event => updateWorkbenchValue('studentLevel', event.target.value)} className="h-9 w-full rounded-xl border border-[#eadfce] bg-white px-2 text-xs text-stone-800 outline-none focus:border-[#8a5a35]">
                    <option value="">可不选</option>
                    {(isYejiaying ? ['初学', '有基础', '备考复习', '社团拓展', '不确定'] : ['基础薄弱', '中等', '较好', '不确定']).map(item => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="rounded-2xl border border-[#eadfce] bg-[#fbf6ee] px-3 py-2.5 text-xs leading-5 text-stone-600">
                <p className="font-semibold text-stone-800">使用方式</p>
                  <p className="mt-1">{isYejiaying ? '左侧选诗词教学任务，中间出讲读方案，右侧补原文、注释、讲稿和课堂要求。' : isWangrongsheng ? '左侧选任务，中间出教学内容判断，右侧补教材证据和活动材料。' : '左侧选任务，中间出成品和意见，右侧按需展开材料库。'}</p>
              </div>
            </div>
          </aside>

          <section className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-[22px] border border-stone-200/80 bg-white shadow-[0_14px_36px_rgba(80,64,42,0.06)]">
            <div className="border-b border-stone-200 bg-white p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-[#8a5a35]">{isYejiaying ? '诗词教学' : structuredBoards.find(item => item.id === structuredWorkflow.board)?.label} / {structuredWorkflow.label}</p>
                  <h2 className="mt-1 text-lg font-semibold text-stone-950">{structuredWorkflow.title}</h2>
                  <p className="mt-1 max-w-3xl text-xs leading-5 text-stone-500">{structuredWorkflow.intro}</p>
                </div>
                <span className="shrink-0 rounded-full bg-[#f3eadc] px-2.5 py-1 text-[11px] font-semibold text-[#7a4c2c]">字段可空</span>
              </div>
            </div>

            <div className="min-h-0 overflow-y-auto bg-[#fbf8f2] p-3">
              {creditBlocked && (
                <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                  <p className="font-black">积分不足，暂时不能继续提问</p>
                  <button type="button" onClick={onOpenCredits} className="mt-2 rounded-lg bg-red-700 px-3 py-1.5 text-xs font-black text-white hover:bg-red-600">去积分中心</button>
                </div>
              )}
              {messagesLoading && <div className="py-16 text-center text-sm text-stone-400">加载中...</div>}
              {messagesError && <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">消息加载失败，请返回重试。</div>}
              {!messagesLoading && !messagesError && messages.length === 0 && !sending && (
                <div className="flex h-full min-h-[420px] flex-col">
                  <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-[#eadfce] bg-white/55 px-6 py-10">
                    <div className="max-w-md text-center">
                      <p className="text-[13px] font-semibold text-stone-500">工作区空白</p>
                      <p className="mt-2 text-xs leading-6 text-stone-400">{structuredEmptyHint}</p>
                      <div className="mt-5 flex flex-wrap justify-center gap-2">
                        {structuredQuestions.map(question => (
                          <button key={question} type="button" onClick={() => sendText(question)} className="rounded-full border border-[#eadfce] bg-white/80 px-3 py-1.5 text-[11px] font-semibold text-stone-500 transition hover:border-[#d8c5aa] hover:text-stone-700">
                            {question}
                          </button>
                        ))}
                      </div>
                      <button onClick={() => sendText(structuredWorkflow.prompt)} disabled={sending} className="mt-4 rounded-full bg-[#2f251d] px-4 py-2 text-xs font-semibold text-white shadow-sm disabled:opacity-40">
                        {structuredWorkflow.button}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {messages.map(msg => {
                const isUser = msg.role === 'user';
                return (
                  <div key={msg.id} className={`mb-4 flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-6 shadow-sm ${isUser ? 'rounded-br-sm bg-[#2f251d] text-white' : 'rounded-bl-sm border border-[#eadfce] bg-white text-stone-800'}`}>
                      <MessageText content={msg.content} dark={isUser} />
                      <AttachmentList attachments={msg.attachments} dark={isUser} />
                      {!isUser && (
                        <div className="mt-3 flex flex-wrap gap-2 border-t border-stone-100 pt-3">
                          <button onClick={() => { navigator.clipboard.writeText(msg.content); showToast('已复制', 'info'); }} className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-black text-stone-600 transition hover:bg-white">
                            复制
                          </button>
                          <button onClick={() => downloadWordDocument(conversationTitle || structuredWorkflow.title || 'AI 回答', msg.content)} className="rounded-lg border border-[#eadfce] bg-[#fbf6ee] px-3 py-1.5 text-xs font-black text-[#7a4c2c] transition hover:bg-white">
                            下载 Word
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {streamingContent && (
                <div className="mb-4 flex justify-start">
                  <div className="max-w-[88%] rounded-2xl rounded-bl-sm border border-[#eadfce] bg-white px-3.5 py-2.5 text-[13px] leading-6 text-stone-800 shadow-sm">
                    <MessageText content={streamingContent} />
                    <span className="ml-1 inline-block h-4 w-1.5 animate-pulse rounded-sm bg-[#8a5a35] align-middle" />
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            <div className="border-t border-stone-200 bg-white p-2.5">
              <input ref={fileInputRef} type="file" multiple accept=".pdf,.txt,.md,.doc,.docx" onChange={event => chooseFiles(event.target.files)} className="hidden" />
              <div className="flex gap-2">
                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={sending} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-stone-300 bg-white text-lg text-stone-700 shadow-sm transition hover:border-[#8a5a35] hover:text-[#8a5a35] disabled:opacity-40" title="上传附件">
                  +
                </button>
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={event => setInput(event.target.value)}
                  onKeyDown={event => event.key === 'Enter' && sendText(input)}
                  placeholder={sending ? '等待 AI 回复中...' : '补充要求，也可以只发附件'}
                  className="min-w-0 flex-1 rounded-xl border border-stone-300 bg-white px-3 py-2 text-[13px] text-stone-900 outline-none placeholder:text-stone-400 focus:border-[#8a5a35] focus:ring-1 focus:ring-[#8a5a35]/20"
                />
                <button onClick={() => sendText(structuredWorkflow.prompt)} disabled={sending} className="shrink-0 rounded-xl bg-[#2f251d] px-4 py-2 text-[13px] font-semibold text-white shadow transition hover:bg-[#4a3728] disabled:opacity-40">
                  {structuredWorkflow.button}
                </button>
                <button onClick={() => sendText(input)} disabled={sending || (!input.trim() && pendingFiles.length === 0)} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-stone-900 text-white shadow transition hover:bg-stone-800 disabled:opacity-40" title="发送补充">
                  →
                </button>
              </div>
            </div>
          </section>

          <aside className={`min-h-0 overflow-hidden rounded-[22px] border border-stone-200/80 bg-[#fffaf2]/86 shadow-[0_14px_36px_rgba(80,64,42,0.06)] transition-all ${teacherLibraryOpen ? 'opacity-100' : 'opacity-100'}`}>
            {teacherLibraryOpen ? (
              <div className="flex h-full min-h-0 flex-col">
                <div className="flex items-center justify-between border-b border-stone-200/80 p-3">
                  <div>
                    <p className="text-[13px] font-semibold text-stone-950">材料库</p>
                    <p className="text-xs text-stone-500">按业务场景随时收起</p>
                  </div>
                  <button type="button" onClick={() => setTeacherLibraryOpen(false)} className="rounded-full border border-[#eadfce] bg-white px-2.5 py-1 text-[11px] font-semibold text-stone-600">收起</button>
                </div>
                <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto p-3">
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full rounded-2xl border border-dashed border-[#d8c5aa] bg-white px-3 py-3 text-left transition hover:bg-[#fffdf8]">
                    <span className="block text-[13px] font-semibold text-stone-950">添加材料</span>
                    <span className="mt-1 block text-xs leading-5 text-stone-500">{isYejiaying ? '诗词原文、注释、讲稿、板书、课堂要求' : isWangrongsheng ? '课文、单元导语、课后题、教案、活动设计' : '作文、教案、讲义、说课稿、素材包'}</span>
                  </button>
                  <div className="rounded-2xl border border-[#eadfce] bg-white p-3">
                    <p className="text-xs font-semibold text-[#8a5a35]">本次材料</p>
                    <p className="mt-2 text-xs leading-5 text-stone-600">{workbench.material ? '已填写材料内容，发送后将作为核心依据。' : '还没有粘贴材料，可直接上传文件或在下方输入。'}</p>
                  </div>
                  <label className="block rounded-2xl border border-[#eadfce] bg-white p-3">
                    <span className="mb-2 block text-xs font-semibold text-stone-700">{structuredWorkflow.materialLabel}</span>
                    <textarea
                      value={workbench.material}
                      onChange={event => updateWorkbenchValue('material', event.target.value)}
                      placeholder={structuredWorkflow.materialPlaceholder}
                      rows={5}
                      className="w-full resize-none rounded-xl border border-[#eadfce] bg-[#fffdf8] px-3 py-2 text-xs leading-5 text-stone-800 outline-none placeholder:text-stone-400 focus:border-[#8a5a35]"
                    />
                  </label>
                  <label className="block rounded-2xl border border-[#eadfce] bg-white p-3">
                    <span className="mb-2 block text-xs font-semibold text-stone-700">{structuredWorkflow.directionLabel}</span>
                    <input value={workbench.goal} onChange={event => updateWorkbenchValue('goal', event.target.value)} placeholder={structuredWorkflow.directionPlaceholder} className="h-9 w-full rounded-xl border border-[#eadfce] bg-[#fffdf8] px-3 text-xs text-stone-800 outline-none placeholder:text-stone-400 focus:border-[#8a5a35]" />
                  </label>
                  <label className="block rounded-2xl border border-[#eadfce] bg-white p-3">
                    <span className="mb-2 block text-xs font-semibold text-stone-700">{structuredWorkflow.outputLabel}</span>
                    <input value={workbench.output} onChange={event => updateWorkbenchValue('output', event.target.value)} placeholder={structuredWorkflow.outputPlaceholder} className="h-9 w-full rounded-xl border border-[#eadfce] bg-[#fffdf8] px-3 text-xs text-stone-800 outline-none placeholder:text-stone-400 focus:border-[#8a5a35]" />
                  </label>
                  {pendingFiles.length > 0 && (
                    <div className="rounded-2xl border border-[#eadfce] bg-white p-4">
                      <p className="mb-2 text-xs font-black text-stone-700">待发送附件</p>
                      <div className="grid gap-2">
                        {pendingFiles.map((file, index) => (
                          <div key={`${file.name}-${index}`} className="flex items-center gap-2 rounded-xl bg-[#fbf6ee] px-3 py-2 text-xs text-stone-700">
                            <span className="min-w-0 flex-1 truncate font-semibold">{file.name}</span>
                            <button type="button" onClick={() => setPendingFiles(prev => prev.filter((_, i) => i !== index))} className="text-stone-400 hover:text-red-600" title="移除">x</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => setTeacherLibraryOpen(true)} className="flex h-full w-full items-center justify-center bg-[#fffaf2] text-xs font-black text-stone-600 [writing-mode:vertical-rl]">
                展开材料库
              </button>
            )}
          </aside>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-[#f7f2e8]">
      <header className="sticky top-0 z-10 border-b border-emerald-900/10 bg-[#f7f2e8]/90 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          <button onClick={onBack} className="flex h-9 w-9 items-center justify-center rounded-full border border-stone-300 bg-white/70 text-stone-600 transition hover:border-stone-500" title="返回">
            ←
          </button>
          <button onClick={onOpenHome} className="rounded-full border border-stone-200 bg-white/70 px-3 py-1.5 text-xs font-semibold text-stone-600 transition hover:border-emerald-300 hover:text-emerald-800">
            首页
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-black text-emerald-950">{displayExpertName || meta.alias}</h1>
            <p className="truncate text-xs text-stone-500">{conversationTitle || meta.title}</p>
          </div>
        </div>
      </header>

      <div className={isWangdingjun ? 'flex-1 overflow-hidden px-4 py-5' : 'flex-1 overflow-y-auto px-4 py-5'}>
        <div className="mx-auto grid max-w-5xl gap-4 lg:grid-cols-[320px_1fr]">
          <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
            <div className={`rounded-3xl border border-stone-200 ${meta.soft} p-4 shadow-sm`}>
              <div className="flex items-center gap-3">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-3xl bg-white shadow-sm">
                  <img src={meta.avatar} alt={meta.alias} className="h-full w-full object-cover" onError={event => { event.currentTarget.style.display = 'none'; }} />
                </div>
                <div>
                  <p className="text-lg font-black text-stone-950">{meta.alias}</p>
                  <p className="text-xs text-stone-500">{meta.title}</p>
                </div>
              </div>
              <p className="mt-3 text-sm leading-6 text-stone-700">{meta.promise}</p>
            </div>

            <div className={`rounded-3xl border bg-white/85 p-4 shadow-sm ${isMindfulness ? 'border-indigo-100' : 'border-stone-200'}`}>
              <h2 className="text-base font-black text-stone-900">{isWangdingjun ? '公共资料区' : workbenchCopy.title}</h2>
              <p className="mt-1 text-xs leading-5 text-stone-500">{isWangdingjun ? '这里放每次都会影响鼎公判断的背景。具体成品靠右侧工作流和下方问答补充。' : workbenchCopy.intro}</p>
              {isWangdingjun && (
                <div className="mt-3 grid gap-2 text-xs leading-5">
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-emerald-900">
                    <p className="font-black">资料和成品优先</p>
                    <p>上传作文、素材、教案、讲义、说课稿或老师自己的资料即可开始。</p>
                    <p>答案生成后可直接下载 Word。</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-2xl border border-stone-200 bg-white px-3 py-2 text-left text-stone-800 transition hover:border-emerald-300 hover:bg-emerald-50"
                  >
                    <span className="block font-black">上传资料</span>
                    <span>支持 Word、PDF、TXT、Markdown。可让鼎公诊断不足并改稿。</span>
                  </button>
                </div>
              )}
              <div className="mt-4 space-y-3">
                {(isWangdingjun ? workbenchCopy.fields.filter(field => ['grade', 'region', 'textbook', 'studentLevel'].includes(field.key)) : workbenchCopy.fields).map(field => (
                  <label key={field.key} className="block">
                    <span className="mb-1.5 block text-xs font-black text-stone-700">{field.label}（可选）</span>
                    {field.options ? (
                      <select
                        value={workbench[field.key]}
                        onChange={event => updateWorkbenchValue(field.key, event.target.value)}
                        className={`h-9 w-full rounded-xl border bg-white px-3 text-xs text-stone-800 outline-none ${isMindfulness ? 'border-indigo-100 focus:border-indigo-500' : 'border-stone-200 focus:border-emerald-700'}`}
                      >
                        <option value="">{field.placeholder}</option>
                        {field.options.map(option => <option key={option} value={option}>{option}</option>)}
                      </select>
                    ) : field.rows === 1 ? (
                      <input
                        value={workbench[field.key]}
                        onChange={event => updateWorkbenchValue(field.key, event.target.value)}
                        placeholder={field.placeholder}
                        className={`h-9 w-full rounded-xl border bg-white px-3 text-xs text-stone-800 outline-none placeholder:text-stone-400 ${isMindfulness ? 'border-indigo-100 focus:border-indigo-500' : 'border-stone-200 focus:border-emerald-700'}`}
                      />
                    ) : (
                      <textarea
                        value={workbench[field.key]}
                        onChange={event => updateWorkbenchValue(field.key, event.target.value)}
                        placeholder={field.placeholder}
                        rows={field.rows || 3}
                        className={`w-full rounded-xl border bg-white px-3 py-2 text-xs text-stone-800 outline-none placeholder:text-stone-400 ${isMindfulness ? 'border-indigo-100 focus:border-indigo-500' : 'border-stone-200 focus:border-emerald-700'}`}
                      />
                    )}
                  </label>
                ))}
                {!isWangdingjun && (
                  <button onClick={() => sendText(workbenchCopy.prompt)} disabled={sending} className={`w-full rounded-2xl px-4 py-3 text-sm font-black text-white shadow-sm transition disabled:opacity-50 ${isMindfulness ? 'bg-indigo-700 hover:bg-indigo-600' : 'bg-emerald-900 hover:bg-emerald-800'}`}>
                    {workbenchCopy.button}
                  </button>
                )}
              </div>
            </div>
          </aside>

          <section className={isWangdingjun ? 'flex h-[calc(100vh-104px)] min-h-0 flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white/85 shadow-sm' : 'space-y-4'}>
            {isWangdingjun && (
              <div className="shrink-0 border-b border-stone-200 p-4">
                <div className="flex flex-wrap gap-2">
                  {TEACHER_BOARDS.map(board => (
                    <button
                      key={board.id}
                      type="button"
                      onClick={() => switchTeacherBoard(board.id)}
                      className={`rounded-xl border px-3 py-2 text-left transition ${activeTeacherBoard === board.id ? 'border-emerald-900 bg-emerald-900 text-white' : 'border-stone-200 bg-stone-50 text-stone-700 hover:border-emerald-300'}`}
                    >
                      <span className="block text-sm font-black">{board.label}</span>
                      <span className={`block text-[11px] ${activeTeacherBoard === board.id ? 'text-white/70' : 'text-stone-500'}`}>{board.hint}</span>
                    </button>
                  ))}
                </div>

                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {WORKFLOWS_BY_BOARD[activeTeacherBoard].map(workflowId => {
                    const workflow = TEACHER_WORKFLOWS[workflowId];
                    return (
                      <button
                        key={workflowId}
                        type="button"
                        onClick={() => setActiveTeacherWorkflow(workflowId)}
                        className={`rounded-xl border px-3 py-2 text-left text-sm transition ${activeTeacherWorkflow === workflowId ? 'border-stone-800 bg-stone-900 text-white' : 'border-stone-200 bg-white text-stone-700 hover:border-stone-400'}`}
                      >
                        <span className="font-black">{workflow.label}</span>
                        <span className={`mt-1 block text-xs leading-5 ${activeTeacherWorkflow === workflowId ? 'text-white/70' : 'text-stone-500'}`}>{workflow.title}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-4 grid gap-3">
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-black text-stone-700">{teacherWorkflow.materialLabel}</span>
                    <textarea
                      value={workbench.material}
                      onChange={event => updateWorkbenchValue('material', event.target.value)}
                      placeholder={teacherWorkflow.materialPlaceholder}
                      rows={4}
                      className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 outline-none placeholder:text-stone-400 focus:border-emerald-700"
                    />
                  </label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-1.5 block text-xs font-black text-stone-700">{teacherWorkflow.directionLabel}</span>
                      <input
                        value={workbench.goal}
                        onChange={event => updateWorkbenchValue('goal', event.target.value)}
                        placeholder={teacherWorkflow.directionPlaceholder}
                        className="h-10 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm text-stone-800 outline-none placeholder:text-stone-400 focus:border-emerald-700"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1.5 block text-xs font-black text-stone-700">{teacherWorkflow.outputLabel}</span>
                      <input
                        value={workbench.output}
                        onChange={event => updateWorkbenchValue('output', event.target.value)}
                        placeholder={teacherWorkflow.outputPlaceholder}
                        className="h-10 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm text-stone-800 outline-none placeholder:text-stone-400 focus:border-emerald-700"
                      />
                    </label>
                  </div>
                </div>
              </div>
            )}
            <div className={isWangdingjun ? 'min-h-0 flex-1 space-y-4 overflow-y-auto p-4' : 'space-y-4'}>
            {messagesLoading && <div className="py-12 text-center text-sm text-stone-400">加载中...</div>}
            {messagesError && <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">消息加载失败，请返回重试。</div>}
            {!messagesLoading && !messagesError && messages.length === 0 && !sending && (
              <div className="rounded-3xl border border-stone-200 bg-white/85 p-5 shadow-sm">
                <h3 className="text-lg font-black text-stone-900">{isWangdingjun ? '先说要交付什么，或上传资料让鼎公诊改' : isMindfulness ? '可以先做一个很小的安顿' : '可以直接问，也可以先上传材料'}</h3>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  {(isWangdingjun ? WANGDINGJUN_QUESTIONS : isYejiaying ? YEJIAYING_QUESTIONS : isMindfulness ? MINDFULNESS_QUESTIONS : QUICK_QUESTIONS).map(question => (
                    <button key={question} type="button" onClick={() => sendText(question)} className="rounded-2xl border border-stone-200 bg-stone-50 px-3 py-3 text-left text-sm font-semibold leading-5 text-stone-700 transition hover:border-emerald-700 hover:bg-white hover:text-emerald-800">
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map(msg => {
              const isUser = msg.role === 'user';
              return (
                <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                  <div className={`group relative max-w-[86%] rounded-3xl px-4 py-3 text-sm leading-6 shadow-sm ${isUser ? 'rounded-tr-sm bg-emerald-900 text-white' : 'rounded-tl-sm border border-stone-200 bg-white text-stone-800'}`}>
                    <MessageText content={msg.content} dark={isUser} />
                    <AttachmentList attachments={msg.attachments} dark={isUser} />
                    {!isUser && (
                      <div className="mt-3 flex flex-wrap gap-2 border-t border-stone-100 pt-3">
                        <button onClick={() => { navigator.clipboard.writeText(msg.content); showToast('已复制', 'info'); }} className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-black text-stone-600 transition hover:bg-white" title="复制">
                          复制
                        </button>
                        <button onClick={() => downloadWordDocument(conversationTitle || teacherWorkflow.title || 'AI 回答', msg.content)} className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-800 transition hover:bg-white" title="下载 Word">
                          下载 Word
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {streamingContent && (
              <div className="flex justify-start">
                <div className="max-w-[86%] rounded-3xl rounded-tl-sm border border-stone-200 bg-white px-4 py-3 text-sm leading-6 text-stone-800 shadow-sm">
                  <MessageText content={streamingContent} />
                  <span className="ml-1 inline-block h-4 w-1.5 animate-pulse rounded-sm bg-emerald-700 align-middle" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
            </div>
            {isWangdingjun && (
              <div className="shrink-0 border-t border-stone-200 bg-[#fbfaf7] p-3">
                {pendingFiles.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-2">
                    {pendingFiles.map((file, index) => (
                      <div key={`${file.name}-${index}`} className="flex max-w-full items-center gap-2 rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs text-stone-700">
                        <span className="max-w-48 truncate font-semibold">{file.name}</span>
                        <button type="button" onClick={() => setPendingFiles(prev => prev.filter((_, i) => i !== index))} className="text-stone-400 hover:text-red-600" title="移除">x</button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <input ref={fileInputRef} type="file" multiple accept=".pdf,.txt,.md,.doc,.docx" onChange={event => chooseFiles(event.target.files)} className="hidden" />
                  <button type="button" onClick={() => fileInputRef.current?.click()} disabled={sending} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-stone-300 bg-white text-xl text-stone-700 shadow-sm transition hover:border-emerald-700 hover:text-emerald-800 disabled:opacity-40" title="上传附件">
                    +
                  </button>
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={event => setInput(event.target.value)}
                    onKeyDown={event => event.key === 'Enter' && sendText(input)}
                    placeholder={sending ? '等待 AI 回复中...' : '补充要求，也可以只发附件'}
                    className="min-w-0 flex-1 rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-900 outline-none placeholder:text-stone-400 focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700/20"
                  />
                  <button onClick={() => sendText(teacherWorkflow.prompt)} disabled={sending} className="shrink-0 rounded-xl bg-emerald-900 px-4 py-2.5 text-sm font-black text-white shadow transition hover:bg-emerald-800 disabled:opacity-40">
                    {teacherWorkflow.button}
                  </button>
                  <button onClick={() => sendText(input)} disabled={sending || (!input.trim() && pendingFiles.length === 0)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-stone-900 text-white shadow transition hover:bg-stone-800 disabled:opacity-40" title="发送补充">
                    →
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>

      {!isWangdingjun && (
      <div className="border-t border-emerald-900/10 bg-[#f7f2e8]/90 px-4 py-3 backdrop-blur">
        <div className="mx-auto max-w-5xl">
          {creditBlocked && (
            <div className="mb-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              <p className="font-black">积分不足，暂时不能继续提问</p>
              <button type="button" onClick={onOpenCredits} className="mt-3 rounded-full bg-red-700 px-3 py-1.5 text-xs font-black text-white hover:bg-red-600">
                去积分中心
              </button>
            </div>
          )}
          {pendingFiles.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {pendingFiles.map((file, index) => (
                <div key={`${file.name}-${index}`} className="flex max-w-full items-center gap-2 rounded-2xl border border-stone-200 bg-white/85 px-3 py-2 text-xs text-stone-700 shadow-sm">
                  <span className="max-w-48 truncate font-semibold">{file.name}</span>
                  <button type="button" onClick={() => setPendingFiles(prev => prev.filter((_, i) => i !== index))} className="text-stone-400 hover:text-red-600" title="移除">x</button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input ref={fileInputRef} type="file" multiple accept={isWangdingjun ? '.pdf,.txt,.md,.doc,.docx' : 'image/*,.pdf,.txt,.md,.doc,.docx'} onChange={event => chooseFiles(event.target.files)} className="hidden" />
            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={sending} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-stone-300 bg-white/80 text-stone-700 shadow-sm transition hover:border-emerald-700 hover:text-emerald-800 disabled:opacity-40" title="上传附件">
              +
            </button>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={event => setInput(event.target.value)}
              onKeyDown={event => event.key === 'Enter' && sendText(input)}
              placeholder={sending ? '等待 AI 回复中...' : '输入问题，也可以只发附件'}
              className="flex-1 rounded-2xl border border-stone-300 bg-white/80 px-4 py-2.5 text-sm text-stone-900 outline-none placeholder:text-stone-400 focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700/20"
            />
            <button onClick={() => sendText(input)} disabled={sending || (!input.trim() && pendingFiles.length === 0)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-900 text-white shadow transition hover:bg-emerald-800 disabled:opacity-40" title="发送">
              →
            </button>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
