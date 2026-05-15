import { useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import { getConversation, getMessages, sendMessageStream, uploadAttachments, type Attachment } from '../services/api';
import { showToast } from '../components/toastStore';
import { getExpertDisplay } from '../data/experts';
import { DEFAULT_MINGHENG_FAWU_TASK, MINGHENG_FAWU_TASKS, getMinghengFawuTask, type MinghengFawuTaskId } from '../data/minghengFawuTasks';
import { AnranLaoshiTaskPicker } from '../components/AnranLaoshiTaskPicker';
import { DEFAULT_ANRAN_LAOSHI_TASK, getDefaultAnranLaoshiSubOption, getAnranLaoshiTask, type AnranLaoshiTaskId } from '../data/anranLaoshiTasks';
import { buildAnranLaoshiMessage, getAnranLaoshiWorkbenchCopy } from '../data/anranLaoshiWorkbench';
import { SongbaiXianshengWorkbench, type SongbaiXianshengValues } from '../components/SongbaiXianshengWorkbench';
import { DEFAULT_SONGBAI_XIANSHENG_TASK, getSongbaiXianshengTask, type SongbaiXianshengTaskId } from '../data/songbaiXianshengTasks';
import { MuheLaoshiWorkbench, type MuheLaoshiValues } from '../components/MuheLaoshiWorkbench';
import { DEFAULT_MUHE_LAOSHI_TASK, getMuheLaoshiTask, type MuheLaoshiTaskId } from '../data/muheLaoshiTasks';

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

function sanitizeFileName(value: string): string {
  return value
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 40) || 'aibrain';
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

const CRC32_TABLE = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  return value >>> 0;
});

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc = CRC32_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function dosDateTime(date: Date) {
  return {
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
    date: ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
  };
}

function writeUint16(target: number[], value: number) {
  target.push(value & 0xff, (value >>> 8) & 0xff);
}

function writeUint32(target: number[], value: number) {
  target.push(value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff);
}

function appendBytes(target: number[], bytes: Uint8Array) {
  for (const byte of bytes) target.push(byte);
}

function createStoredZip(entries: Array<{ name: string; content: string }>): Uint8Array {
  const encoder = new TextEncoder();
  const now = dosDateTime(new Date());
  const fileBytes: number[] = [];
  const centralDirectory: number[] = [];

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name);
    const contentBytes = encoder.encode(entry.content);
    const checksum = crc32(contentBytes);
    const localHeaderOffset = fileBytes.length;

    writeUint32(fileBytes, 0x04034b50);
    writeUint16(fileBytes, 20);
    writeUint16(fileBytes, 0x0800);
    writeUint16(fileBytes, 0);
    writeUint16(fileBytes, now.time);
    writeUint16(fileBytes, now.date);
    writeUint32(fileBytes, checksum);
    writeUint32(fileBytes, contentBytes.length);
    writeUint32(fileBytes, contentBytes.length);
    writeUint16(fileBytes, nameBytes.length);
    writeUint16(fileBytes, 0);
    appendBytes(fileBytes, nameBytes);
    appendBytes(fileBytes, contentBytes);

    writeUint32(centralDirectory, 0x02014b50);
    writeUint16(centralDirectory, 20);
    writeUint16(centralDirectory, 20);
    writeUint16(centralDirectory, 0x0800);
    writeUint16(centralDirectory, 0);
    writeUint16(centralDirectory, now.time);
    writeUint16(centralDirectory, now.date);
    writeUint32(centralDirectory, checksum);
    writeUint32(centralDirectory, contentBytes.length);
    writeUint32(centralDirectory, contentBytes.length);
    writeUint16(centralDirectory, nameBytes.length);
    writeUint16(centralDirectory, 0);
    writeUint16(centralDirectory, 0);
    writeUint16(centralDirectory, 0);
    writeUint16(centralDirectory, 0);
    writeUint32(centralDirectory, 0);
    writeUint32(centralDirectory, localHeaderOffset);
    appendBytes(centralDirectory, nameBytes);
  }

  const centralDirectoryOffset = fileBytes.length;
  fileBytes.push(...centralDirectory);
  writeUint32(fileBytes, 0x06054b50);
  writeUint16(fileBytes, 0);
  writeUint16(fileBytes, 0);
  writeUint16(fileBytes, entries.length);
  writeUint16(fileBytes, entries.length);
  writeUint32(fileBytes, centralDirectory.length);
  writeUint32(fileBytes, centralDirectoryOffset);
  writeUint16(fileBytes, 0);

  return new Uint8Array(fileBytes);
}

function buildWordDocumentXml(title: string, content: string): string {
  const paragraphs = [title, '', ...content.replace(/\r\n/g, '\n').split('\n')].map(line => {
    const text = escapeXml(line || ' ');
    return `<w:p><w:r><w:t xml:space="preserve">${text}</w:t></w:r></w:p>`;
  }).join('');

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${paragraphs}
    <w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr>
  </w:body>
</w:document>`;
}

function downloadWordDocument(title: string, content: string) {
  const documentXml = buildWordDocumentXml(title, content);
  const bytes = createStoredZip([
    {
      name: '[Content_Types].xml',
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`,
    },
    {
      name: '_rels/.rels',
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`,
    },
    { name: 'word/document.xml', content: documentXml },
  ]);
  const docxBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const blob = new Blob([docxBuffer], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${sanitizeFileName(title)}.docx`;
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

const QINGHE_WRITING_QUESTIONS = [
  '请帮我批改这篇作文，给学生、老师、家长三个版本。',
  '请把这些共性问题整理成一节作文讲评课。',
  '请围绕这个主题整理一组写作素材和课堂练习。',
  '请按这个训练目标设计作文题和分层练习。',
];

const YUNQIAO_JIAOXUE_QUESTIONS = [
  '请把这节课整理成一份能上课的教案。',
  '请帮我生成说课稿，重点说明教学内容选择的理据。',
  '请把这份备课材料改成课堂逐字稿。',
  '请检查我的教案目标、内容、活动、评价是否一致。',
];

const SONGYUE_SHICI_QUESTIONS = [
  '请带我讲读这首诗，先从诵读和声情入手。',
  '请把这首词整理成一节可上课的主问题链。',
  '请说明这组诗词的意象脉络和兴发感动。',
  '请给这首诗词的典故查检方向，不要泛泛堆知识。',
];

const ZHIYUAN_QUESTIONS = [
  '请帮我判断这张志愿表的冲稳保是否合理。',
  '这些学校和专业，哪些是稳、哪些风险大？',
  '普通家庭要不要走留学路线，请先算回本线。',
  '从就业出口倒推，这个专业值得选吗？',
  '考研、就业、转专业这几条路哪条更现实？',
  '请直接列出我应该避开的选择。',
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

type QingheWorkId =
  | 'correction-pack'
  | 'review-lesson'
  | 'lesson-plan'
  | 'handout'
  | 'ppt-outline'
  | 'teaching-script'
  | 'speaking-note'
  | 'worksheet'
  | 'prompt-set'
  | 'material-pack'
  | 'material-transform'
  | 'course-plan'
  | 'parent-note'
  | 'teaching-review';

const QINGHE_WORKS: Array<{
  id: QingheWorkId;
  group: string;
  label: string;
  title: string;
  hint: string;
  button: string;
  output: string;
  prompt: string;
  structure: string[];
}> = [
  {
    id: 'correction-pack',
    group: '批改讲评',
    label: '批改稿',
    title: '生成学生能改、老师能讲、家长能懂的批改稿',
    hint: '单篇作文、考场作文、日常习作',
    button: '生成批改稿',
    output: '学生反馈 + 教师说明 + 家长短话 + 下一稿任务',
    prompt: '请完成作文批改交付。先读题干限制，再依据学生原文判断本轮最值得改的一处。输出学生能动笔修改、老师能讲评、家长能理解的批改稿。旁批必须是动作，不要替学生写整篇可提交作文，不承诺官方分数。',
    structure: ['题目与场景判断', '学生版反馈', '教师版说明', '家长版短话', '下一稿任务', '文学表达与应试风险'],
  },
  {
    id: 'review-lesson',
    group: '批改讲评',
    label: '讲评课',
    title: '把一批作文或共性问题转成可上课的讲评方案',
    hint: '讲评目标、例句、微练、作业闭环',
    button: '生成讲评方案',
    output: '讲评流程 + 可投影句 + 当堂微练 + 课后作业',
    prompt: '请完成作文讲评课交付。从样本、批改记录或老师描述中提炼本轮最值得讲的一件事，把问题转成学生可练的写作动作。不要写成泛泛教案。',
    structure: ['讲评目标', '材料取舍', '可投影句', '示范修改', '当堂微练', '作业闭环', '下一轮跟进'],
  },
  {
    id: 'lesson-plan',
    group: '课堂文本',
    label: '教案',
    title: '生成一份作文课或讲评课教案',
    hint: '目标、重难点、流程、板书、作业',
    button: '生成教案',
    output: '教案 + 板书 + 作业 + 反思留白',
    prompt: '请生成作文教学教案。先判断这节课训练哪一个写作动作，再组织教学目标、重难点、课堂流程、学生任务、板书和作业。不要默认老师已经有完整教案。',
    structure: ['教学目标', '重难点', '教学准备', '课堂流程', '学生任务', '板书设计', '作业与反思'],
  },
  {
    id: 'handout',
    group: '课堂文本',
    label: '讲义',
    title: '生成学生可直接使用的作文讲义',
    hint: '审题提示、示范片段、练笔留白',
    button: '生成讲义',
    output: '学生讲义 + 动笔空位 + 自评清单',
    prompt: '请生成学生讲义。内容要服务本次写作训练，包含审题提示、示范片段、动手练习、修改任务和自评清单。示范只给片段，不代写整篇作文。',
    structure: ['本课目标', '题目回顾', '审题提示', '示范片段', '动手练习', '下一稿任务', '自评清单'],
  },
  {
    id: 'ppt-outline',
    group: '课堂文本',
    label: '课件骨架',
    title: '生成 8 到 12 页作文课件骨架',
    hint: '每页标题、要点、过渡语',
    button: '生成课件骨架',
    output: 'PPT 页纲 + 板书提示 + 过渡语',
    prompt: '请生成作文课件骨架。每页给标题、要点、教师过渡语和板书提示。课件要围绕一个清楚的写作训练动作推进。',
    structure: ['首页导入', '共性问题', '例句对比', '示范修改', '课堂小练', '学生展示', '作业任务'],
  },
  {
    id: 'teaching-script',
    group: '课堂文本',
    label: '逐字稿',
    title: '生成作文课堂逐字稿',
    hint: '教师话术、提问、停顿、转场',
    button: '生成逐字稿',
    output: '10 到 15 分钟课堂逐字稿',
    prompt: '请生成作文课堂逐字稿。用老师第一人称，包含过渡语、提问、停顿、板书提示和学生动作。不要编造学生回答。',
    structure: ['开场导入', '材料呈现', '问题指出', '示范修改', '学生练习', '总结与作业'],
  },
  {
    id: 'speaking-note',
    group: '课堂文本',
    label: '说课稿',
    title: '生成作文课说课稿或磨课说明',
    hint: '教学依据、流程说明、设计理由',
    button: '生成说课稿',
    output: '说课稿 + 设计理由 + 磨课提示',
    prompt: '请生成作文课说课稿或磨课说明。说明本课为什么这样教、训练哪一个写作动作、怎样组织学生练习，以及如何判断课堂是否有效。不要写成空泛套话。',
    structure: ['课题与对象', '教学依据', '目标与重难点', '流程说明', '设计理由', '评价方式', '磨课提示'],
  },
  {
    id: 'worksheet',
    group: '课堂文本',
    label: '学案/练习单',
    title: '生成课堂学案或随堂练习单',
    hint: '导学问题、任务、打勾清单',
    button: '生成学案',
    output: '导学问题 + 课堂任务 + 自评清单',
    prompt: '请生成作文课堂学案或练习单。把训练目标拆成学生能完成的任务，保留动笔空间和自评标准。',
    structure: ['导学问题', '课堂任务', '练笔空间', '互评规则', '自评清单', '课后任务'],
  },
  {
    id: 'prompt-set',
    group: '题目素材',
    label: '作文题',
    title: '设计作文题、周测、专项训练和分层任务',
    hint: '月考、周测、补差、提优',
    button: '生成题目',
    output: '题目 + 命题说明 + 评分参考 + 使用建议',
    prompt: '请完成写作出题交付。根据训练目标、年级、学生水平和使用场景生成作文题、微写作、周测或专项训练。说明考查能力、限制条件、常见跑偏和课堂使用建议，不冒充官方命题组。',
    structure: ['训练目标', '题目或任务', '命题说明', '常见跑偏', '评分参考', '课堂使用建议'],
  },
  {
    id: 'material-pack',
    group: '题目素材',
    label: '素材包',
    title: '生成或整理写作素材包',
    hint: '主题素材、人物事例、意象细节、金句',
    button: '生成素材包',
    output: '主题素材包 + 使用角度 + 练习方式',
    prompt: '请完成写作素材交付。素材不是堆名人名言，要转化为学生可用的表达动作、片段练习或课堂任务。不编造具体事实。',
    structure: ['素材分类', '可用角度', '文体适配', '使用风险', '课堂练习', '学生卡片版'],
  },
  {
    id: 'course-plan',
    group: '课程教研',
    label: '课程体系',
    title: '新建、整理或改造写作课程体系',
    hint: '长期班、短期班、单元训练、参考课程整理',
    button: '生成课程体系',
    output: '课程地图 + 课次安排 + 每课训练任务',
    prompt: '请完成写作课程体系交付。先判断是从零新建、整理已有课程，还是参考其他老师课程后重构。每一课都要落到一个可训练的写作动作，兼顾表达兴趣和考试任务。',
    structure: ['课程定位', '能力地图', '课次结构', '每课训练任务', '素材与题目配置', '作业复盘', '可继续生成的单课成品'],
  },
  {
    id: 'material-transform',
    group: '课程教研',
    label: '资料整理',
    title: '把已有资料整理成可用的写作教学文本',
    hint: '教案、课程、素材、课堂记录转化',
    button: '整理资料',
    output: '资料诊断 + 可用成品 + 后续生成清单',
    prompt: '请完成写作教学资料整理与转化。先判断资料来源是老师自有资料、参考课程、学生样本、课堂记录还是素材库；再提取可用部分，标注需要改写或补齐的地方，并整理成老师要用的文本。不得把参考资料误称为原创，不照搬他人表达。',
    structure: ['资料来源判断', '可保留内容', '需重写内容', '整理后的文本', '引用与改写边界', '下一步可生成清单'],
  },
  {
    id: 'parent-note',
    group: '沟通复盘',
    label: '家长/学生反馈',
    title: '生成课后反馈、家长沟通或学生评语',
    hint: '事实、进步、一件配合',
    button: '生成反馈文案',
    output: '可发送文本 + 学生下一步 + 老师提醒',
    prompt: '请完成课后反馈交付。只讲教学事实、可观察进步和一个配合动作。批评文本，不审判学生；不制造焦虑，不承诺短期提分。',
    structure: ['事实', '进步', '学生下一步', '家庭配合', '可发送文本', '老师内部提醒'],
  },
  {
    id: 'teaching-review',
    group: '沟通复盘',
    label: '教研复盘',
    title: '生成教学复盘或课程交付说明',
    hint: '做了什么、问题证据、下一轮改进',
    button: '生成教研复盘',
    output: '复盘报告 + 改进清单 + 对外说明',
    prompt: '请完成作文教学教研复盘。只依据提供的教学事实，整理本次完成内容、主要问题、证据和下一轮改进动作。不要写宣传话术。',
    structure: ['本次完成内容', '学生表现', '主要问题与证据', '下一轮改进', '对外说明'],
  },
];

const QINGHE_GRADE_OPTIONS = ['三年级', '四年级', '五年级', '六年级', '初一', '初二', '初三', '高一', '高二', '高三'];
const QINGHE_WRITING_TYPE_OPTIONS = ['记叙文', '议论文', '材料作文', '读后感', '微写作', '周测', '专项训练', '课程体系', '不确定'];
const QINGHE_CLASS_TYPE_OPTIONS = ['一对一', '小班', '中班', '大班', '线上课', '公开课', '教研备课', '不确定'];
const QINGHE_STUDENT_LEVEL_OPTIONS = ['基础薄弱', '中等', '较好', '尖子生', '差异很大', '不确定'];
const QINGHE_DURATION_OPTIONS = ['40 分钟', '60 分钟', '90 分钟', '2 小时', '一讲', '一周训练', '长期课程', '不确定'];
const QINGHE_SCENE_OPTIONS = ['从零起稿', '整理已有资料', '改造参考课程', '处理学生作文', '设计题目/素材', '课后沟通', '教研复盘'];

type TeacherBoardId = 'correction' | 'system' | 'resources';
type TeacherWorkflowId =
  | 'essay-correction'
  | 'lesson-review'
  | 'after-class-note'
  | 'course-system'
  | 'resource-bank'
  | 'prompt-design'
  | 'material-transform';

const TEACHER_BOARDS: Array<{ id: TeacherBoardId; label: string; hint: string }> = [
  { id: 'correction', label: '批改讲评', hint: '作文批改、讲评、课后反馈' },
  { id: 'system', label: '课程建设', hint: '课程设计、资料转化、训练路径' },
  { id: 'resources', label: '资源题目', hint: '素材整理、素材生成、出题训练' },
];

const WORKFLOWS_BY_BOARD: Record<TeacherBoardId, TeacherWorkflowId[]> = {
  correction: ['essay-correction', 'lesson-review', 'after-class-note'],
  system: ['course-system', 'material-transform'],
  resources: ['resource-bank', 'prompt-design'],
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
    label: '作文批改',
    title: '生成学生能改、老师能讲、家长能懂的批改稿',
    intro: '面向单篇作文、考场作文、议论文、读后感和多稿追踪。用户看到的是批改稿、教师说明和下一步任务；青禾的判断方式藏在生成逻辑里。',
    button: '生成批改稿',
    materialLabel: '学生作文 / 题目 / 上一轮任务（可选）',
    materialPlaceholder: '粘贴学生作文、作文题、上一稿修改任务。也可以只上传 Word、PDF、TXT、Markdown。',
    directionLabel: '本次想盯住什么（可选）',
    directionPlaceholder: '例如：只看审题；重点看细节；二稿只核查上一刀；也可留空让系统判断。',
    outputLabel: '希望产出（可选）',
    outputPlaceholder: '例如：学生包 + 老师包 + 家长短话；或只要老师讲评要点。',
    prompt: '请完成作文批改服务：先识别场景（单篇习作、考场作文、议论文、读后感、多稿追踪等），再用青禾老师的判断方式处理：读题干限制，找原文中可保留的真实表达，确定本轮最值得改的一处；旁批必须是动作，不是情绪评价；输出学生能动笔修改、老师能据此讲评、家长能理解支持的批改稿。不要让用户必须懂“种子句/主钉子”等内部术语；可以在教师版说明判断依据。不要替学生写整篇可提交作文，不承诺官方分数。',
    outputStructure: ['场景判断', '批改依据', '学生版反馈', '教师版说明', '家长版说明', '修改任务', '文学/应试双轨'],
  },
  'lesson-review': {
    board: 'correction',
    label: '作文讲评',
    title: '把一批作文或共性问题转成可上课的讲评方案',
    intro: '面向课堂讲评、一对一复盘、小班训练。可以从学生作文样本出发，也可以从老师观察到的共性问题出发。',
    button: '生成讲评方案',
    materialLabel: '作文样本 / 共性问题 / 参考课例（可选）',
    materialPlaceholder: '粘贴学生样本、共性问题、已有批改、参考课程或课堂记录。也可以直接说“从零设计”。',
    directionLabel: '本次用途（可选）',
    directionPlaceholder: '例如：40 分钟讲评；一对一复盘；小班训练；只处理开头；围绕细节描写。',
    outputLabel: '希望成品（可选）',
    outputPlaceholder: '例如：讲评流程 + 小练 + 作业；或复盘清单 + 下一轮训练。',
    prompt: '请完成作文讲评服务：从学生样本、批改记录或老师描述中提炼本轮最值得讲的一件事；用青禾老师的方式把问题转成学生可练的动作，而不是抽象道理。输出讲评目标、可投影句、学生例句类型、示范修改一步、当堂微练、作业闭环和下一轮跟进。不要默认用户已有教案，也不要写成泛泛教案。',
    outputStructure: ['讲评目标', '材料取舍', '可投影句', '例句与示范', '当堂微练', '作业闭环', '下一轮跟进'],
  },
  'after-class-note': {
    board: 'correction',
    label: '课后反馈',
    title: '把作文学习情况整理成家长和学生看得懂的话',
    intro: '课后沟通也是作文教学的一部分。用事实、进步和一件配合，把机械文案变成有分寸的教学交付。',
    button: '生成沟通文案',
    materialLabel: '批改结果 / 课堂事实 / 学生表现（可选）',
    materialPlaceholder: '粘贴本次作文批改要点、课堂情况、孩子进步或问题。也可以只上传资料。',
    directionLabel: '沟通对象与语气（可选）',
    directionPlaceholder: '例如：发家长私聊；发班级群；给学生本人；语气温和、具体、不焦虑营销。',
    outputLabel: '希望产出（可选）',
    outputPlaceholder: '例如：家长三段话 + 学生下一步 + 老师内部提醒。',
    prompt: '请完成课后反馈服务：把作文学习情况转成学生和家长能读懂、能行动的文字。底层使用青禾老师的原则：批评文本，不审判学生；先说写出了什么，再说一个可观察进步，最后只给一件家庭配合动作和一个学生下一步动作。不要制造焦虑，不承诺短期提分。',
    outputStructure: ['事实', '进步', '学生下一步', '家庭配合', '可发送文本', '老师内部提醒'],
  },
  'course-system': {
    board: 'system',
    label: '课程设计',
    title: '新建、整理或改造写作课程与训练路径',
    intro: '面向长期班、短期班、单元训练、专题课和一对一训练。可以从零设计，也可以整理已有课程或参考材料。',
    button: '生成课程方案',
    materialLabel: '课程目标 / 现有课程 / 参考资料（可选）',
    materialPlaceholder: '例如：初中记叙文 12 次课；已有课程目录；某位老师的课作为参考；也可以直接说从零搭建。',
    directionLabel: '使用场景（可选）',
    directionPlaceholder: '例如：暑期班、长期班、校内作文社团、一对一、机构小班、冲刺课。',
    outputLabel: '希望成品（可选）',
    outputPlaceholder: '例如：课程地图 + 课次安排 + 每课任务 + 作业闭环。',
    prompt: '请完成写作课程设计服务：先判断用户是在从零设计、整理已有课程，还是参考其他课程材料后重构；不要默认用户已有教案，也不要把课程设计缩窄成教案、讲义或说课稿。用青禾老师的写作教学判断做底层取舍：每一课都要落到一个可训练的写作动作，保留学生表达欲，同时兼顾文学表达和应试任务。输出课程定位、能力地图、课次结构、每课训练任务、作业复盘、素材题目配置和可继续生成的单课成品。',
    outputStructure: ['课程定位', '能力地图', '课次结构', '每课训练任务', '作业与复盘', '素材与题目配置', '可继续生成的单课成品'],
  },
  'material-transform': {
    board: 'system',
    label: '资料转化',
    title: '把资料转成课程、讲义、课件、逐字稿或复盘稿',
    intro: '资料可以是自己的，也可以是参考资料、课堂记录、学生样本、零散想法。目标是转化成某种可用成品，而不是只润色教案。',
    button: '转化资料',
    materialLabel: '待转化资料（可选）',
    materialPlaceholder: '粘贴课程目录、讲稿、课堂记录、学生样本、参考课例、PPT 文案或零散想法。',
    directionLabel: '转化方向（可选）',
    directionPlaceholder: '例如：转成讲义；转成 8 页课件；转成逐字稿；转成一节训练课；转成复盘报告。',
    outputLabel: '希望成品（可选）',
    outputPlaceholder: '例如：课件骨架 + 学生任务；讲义留白版；课堂逐字稿；教研复盘。',
    prompt: '请完成资料转化服务：先判断资料来源与用途，是用户自己的材料、参考材料、课堂记录还是学生样本；再提取可用判断，不照搬、不误称原创；按用户指定方向转成课程、讲义、课件、逐字稿、作业单、复盘稿或组合成品。底层使用青禾老师的写作教学原则：所有成品都要落到学生可执行动作和后续闭环。',
    outputStructure: ['资料判断', '可用内容', '缺口与风险', '转化后的成品', '学生任务', '后续闭环'],
  },
  'resource-bank': {
    board: 'resources',
    label: '素材整理',
    title: '生成、整理、搜集写作素材',
    intro: '素材工作包括新生成、按主题整理、从资料中提取、给学生可用化，也包括把素材变成课堂练习。',
    button: '生成素材库',
    materialLabel: '主题 / 文体 / 已有素材（可选）',
    materialPlaceholder: '例如：坚持、故乡、科技与人；已有一批素材；需要从文章里提取素材。',
    directionLabel: '素材用途（可选）',
    directionPlaceholder: '例如：初中记叙文；高中议论文；课堂展示；学生背诵卡；练笔题。',
    outputLabel: '希望成品（可选）',
    outputPlaceholder: '例如：人物事例库；主题素材包；细节意象库；金句与过渡句；练习卡。',
    prompt: '请完成写作素材服务：先判断用户要新生成、整理已有素材、搜集方向，还是从资料中提取；按主题、文体和使用场景组织素材。底层使用青禾老师的写作教学原则：素材不是堆名人名言，而要能转化成学生可用的表达动作、片段练习或课堂任务。素材必须说明可用角度、适合文体、使用风险和练习方式；不编造具体事实，不替学生写整篇作文。',
    outputStructure: ['素材分类', '可用角度', '文体适配', '使用风险', '课堂练习', '学生卡片版'],
  },
  'prompt-design': {
    board: 'resources',
    label: '出题设计',
    title: '设计作文题、周测、专项练习和训练任务',
    intro: '出题不只是月考作文，也包括日常练笔、周测、专项训练、补差保底、提分挑战和课程配套题。',
    button: '生成题目',
    materialLabel: '训练目标 / 学情 / 参考题（可选）',
    materialPlaceholder: '例如：练细节描写；初三材料作文；已有参考题；某班学生容易跑题。',
    directionLabel: '题目类型（可选）',
    directionPlaceholder: '例如：大作文、微写作、周测、随堂练、专项训练、补差、提优。',
    outputLabel: '希望成品（可选）',
    outputPlaceholder: '例如：题目 + 命题说明 + 评分参考；或 5 个分层训练任务。',
    prompt: '请完成写作出题服务：先判断训练目标、学生水平和使用场景，再生成作文题、微写作、周测、专项训练、补差保底或提分挑战。底层使用青禾老师的写作教学原则：题目要引导学生做具体写作动作，而不是套模板。每个题目要说明考查能力、限制条件、常见跑偏、评分参考或检查点，并给课堂使用建议。不冒充官方命题组。',
    outputStructure: ['训练目标', '题目或任务', '命题说明', '常见跑偏', '评分参考或检查点', '课堂使用建议'],
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
    prompt: '请生成一份语文教案，但必须先用语文教学内容判断定住这节课教什么：区分语文课程内容、教材内容、教学内容；再给教学目标、重难点、课堂流程、学生任务、评价方式、板书和作业。不要写成泛泛教案，不要编造官方课标口径。',
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
    prompt: '请按语文教学内容判断处理：先区分语文课程内容、教材内容、教学内容；再根据篇名、单元、课后题、学情和课时判断本课合宜教学内容；明确不教清单；说明每个关键环节服务哪一种语文经验。不要写成泛泛教案，不要抢青禾老师作文升格或文本细读工作台主链。',
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
    prompt: '请把现有备课材料整理成语文教学内容判断备课骨架：先指出本课教学内容，再重写目标；每个课堂活动必须说明服务哪个教学内容；评价任务要能检验目标。不要代写侵权整篇教案，不做纯审美独白。',
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
    intro: '教读、自读、写作、复习、综合性学习都先回到教学内容判断；学生成篇润色、旁批、讲评话术交给青禾老师。',
    button: '判断课型内容',
    materialLabel: '课型 / 题目 / 训练目标 / 活动草案',
    materialPlaceholder: '粘贴课型、课题、训练点、学生共性问题、活动设计。若是学生作文全文升格，请转青禾老师。',
    directionLabel: '本次要判断',
    directionPlaceholder: '例如：这类课到底教什么；活动是否太散；目标是否能评价。',
    outputLabel: '希望产出',
    outputPlaceholder: '例如：课型定位 + 教学内容判定 + 活动取舍。',
    prompt: '请按课型做语文教学内容判断：先判断这是教读、自读、写作、复习还是综合性学习；再说明这一课合宜教什么、训练什么语文经验、活动如何组织、评价如何检验。若涉及学生作文成篇升格、逐段润色和家长反馈话术，明确转给青禾老师工作台。',
    outputStructure: ['课型定位', '教学内容判定', '训练结构', '活动取舍', '评价方式', '与青禾老师分工'],
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
    prompt: '请按语文教学内容判断教案诊断：先还原这份教案实际在教什么；检查目标、内容、活动、评价是否一致；指出最影响课堂成立的 1-3 个问题；给出修改后的骨架。不要只润色语言。',
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

const POETRY_BOARDS: Array<{ id: PoetryBoardId; label: string; hint: string }> = [
  { id: 'lesson', label: '课堂成品', hint: '教案、主问题、板书与课堂推进' },
  { id: 'reading', label: '诗词讲读', hint: '诵读声情、意象章法、兴发感动' },
  { id: 'diagnosis', label: '材料诊改', hint: '检查讲稿、教案和活动是否贴住文本' },
];

const POETRY_WORKFLOWS_BY_BOARD: Record<PoetryBoardId, PoetryWorkflowId[]> = {
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

const POETRY_WORKFLOWS: Record<PoetryWorkflowId, {
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
  | 'studentLevel'
  | 'classType'
  | 'lessonDuration'
  | 'specificGoal'
  | 'prompt'
  | 'text';

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
  classType: '',
  lessonDuration: '',
  specificGoal: '',
  prompt: '',
  text: '',
};

const MINDFULNESS_WORKBENCH: WorkbenchValues = {
  ...DEFAULT_WORKBENCH,
  background: '',
  goal: '先稳定下来',
  material: '',
  output: '安抚语言 + 正念练习步骤',
};

const QINGHE_WRITING_WORKBENCH: WorkbenchValues = {
  ...DEFAULT_WORKBENCH,
  output: '',
};

const YUNQIAO_JIAOXUE_WORKBENCH: WorkbenchValues = {
  ...DEFAULT_WORKBENCH,
  output: '',
};

const SONGYUE_SHICI_WORKBENCH: WorkbenchValues = {
  ...DEFAULT_WORKBENCH,
  output: '讲读骨架 + 主问题链 + 诵读提示',
};

const ZHIYUAN_WORKBENCH: WorkbenchValues = {
  ...DEFAULT_WORKBENCH,
  output: '路径判断 + 风险清单 + 下一步',
};

const ANRAN_LAOSHI_WORKBENCH: WorkbenchValues = {
  ...DEFAULT_WORKBENCH,
  background: '当前状态：',
  output: '短时处理步骤',
};

function getInitialWorkbench(expertId: string) {
  if (expertId === 'qinghe-xiezuo') return { ...QINGHE_WRITING_WORKBENCH };
  if (expertId === 'yunqiao-jiaoxue') return { ...YUNQIAO_JIAOXUE_WORKBENCH };
  if (expertId === 'songyue-shici') return { ...SONGYUE_SHICI_WORKBENCH };
  if (expertId === 'zhiyuan-laoshi') return { ...ZHIYUAN_WORKBENCH };
  if (expertId === 'anran-laoshi') return { ...ANRAN_LAOSHI_WORKBENCH };
  return expertId === 'thich-nhat-hanh' ? { ...MINDFULNESS_WORKBENCH } : { ...DEFAULT_WORKBENCH };
}

function getWorkbenchCopy(expertId: string): WorkbenchCopy {
  if (expertId === 'qinghe-xiezuo') {
    return {
      title: '作文批改与写作教学工作台',
      intro: '请先说明要完成的作文教学工作，也可以粘贴作文、题目、课程资料、素材、题库或课堂记录。青禾老师只处理作文批改、讲评、课程训练、素材整理、出题设计和写作教学交付。',
      button: '开始处理',
      prompt: '请根据作文批改与写作教学工作台信息，先判断老师要完成的实际工作，再用青禾老师的写作教学判断完成可交付成品。',
      outputFallback: '可直接使用成品 + 青禾老师判断依据',
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

  if (expertId === 'yunqiao-jiaoxue') {
    return {
      title: '云桥老师 · 语文教学内容工作台',
      intro: '请先放入篇名、单元线索、课后题、现有教案或课堂活动。云桥老师负责判断这一课教什么、不教什么，以及目标、内容、活动、评价是否一致。',
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

  if (expertId === 'songyue-shici') {
    return {
      title: '古典诗词讲读工作台',
      intro: '把篇目、原文、学段、课型和已有理解先放进来。松月先生只处理古典诗词讲读、诗词鉴赏、兴发感动与诵读式理解，不做泛古文整理，也不接作文批改和现代文赋分模板。',
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

  if (expertId === 'zhiyuan-laoshi') {
    return {
      title: '升学就业留学规划工作台',
      intro: '把省份、位次、选科、预算、目标城市、备选学校专业和家庭承压能力放进来，先做风险分层，再判断路径。',
      button: '开始路径判断',
      prompt: '请根据升学就业留学规划工作台信息，先把用户条件整理成约束表，再判断学校、专业、城市、考研、就业或留学路径的风险与收益。',
      outputFallback: '路径判断 + 风险清单 + 下一步',
      fields: [
        { key: 'materialType', label: '任务类型', placeholder: '请选择任务类型', rows: 1, options: ['高考志愿', '考研择校', '专业选择', '城市选择', '就业倒推', '留学回本', '转专业/转行'] },
        { key: 'region', label: '省份/城市', placeholder: '例如：河南考生、江苏南京、目标去上海', rows: 1 },
        { key: 'grade', label: '当前阶段', placeholder: '例如：高三、准大一、大三、毕业一年、准备考研', rows: 1 },
        { key: 'studentLevel', label: '分数/位次/背景', placeholder: '例如：物化生，省排 28000；双非一本，会计专业；雅思 6.5。', rows: 3 },
        { key: 'clientBackground', label: '家庭约束', placeholder: '预算、是否能复读/二战、能否接受外地、家庭现金流、最坏情况承受力。', rows: 3 },
        { key: 'material', label: '备选方案/材料', placeholder: '粘贴志愿表、学校专业清单、留学项目、就业目标、已有资料或你正在纠结的几个选择。', rows: 6 },
        { key: 'goal', label: '本次决策目标', placeholder: '例如：保就业、冲学校层级、避开天坑、判断留学值不值、考研和就业二选一。', rows: 2 },
        { key: 'output', label: '希望产出', placeholder: '路径判断 + 风险清单 + 下一步', rows: 1, options: ['冲稳保分层', '专业红黑判断', '学校/城市/专业对照表', '考研胜率与替代路径', '留学回本线', '就业倒推行动清单'] },
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
  const [activeQingheWork, setActiveQingheWork] = useState<QingheWorkId>('lesson-plan');
  const [activeTeacherBoard, setActiveTeacherBoard] = useState<TeacherBoardId>('correction');
  const [activeTeacherWorkflow, setActiveTeacherWorkflow] = useState<TeacherWorkflowId>('essay-correction');
  const [activeRongshengBoard, setActiveRongshengBoard] = useState<RongshengBoardId>('reading');
  const [activeRongshengWorkflow, setActiveRongshengWorkflow] = useState<RongshengWorkflowId>('content-decision');
  const [activePoetryBoard, setActivePoetryBoard] = useState<PoetryBoardId>('lesson');
  const [activePoetryWorkflow, setActivePoetryWorkflow] = useState<PoetryWorkflowId>('lesson-plan');
  const [activePreconsultTask, setActivePreconsultTask] = useState<MinghengFawuTaskId>(DEFAULT_MINGHENG_FAWU_TASK);
  const [activeAnranTask, setActiveAnranTask] = useState<AnranLaoshiTaskId>(DEFAULT_ANRAN_LAOSHI_TASK);
  const [activeAnranSubOption, setActiveAnranSubOption] = useState(() => getDefaultAnranLaoshiSubOption(getAnranLaoshiTask(DEFAULT_ANRAN_LAOSHI_TASK)));
  const [activeSongbaiTask, setActiveSongbaiTask] = useState<SongbaiXianshengTaskId>(DEFAULT_SONGBAI_XIANSHENG_TASK);
  const [songbaiValues, setSongbaiValues] = useState<SongbaiXianshengValues>({ ageStage: '', constitutionFocus: '', dietaryPreference: '', familyLimit: '', material: '', goal: '', output: '' });
  const [activeMuheTask, setActiveMuheTask] = useState<MuheLaoshiTaskId>(DEFAULT_MUHE_LAOSHI_TASK);
  const [muheValues, setMuheValues] = useState<MuheLaoshiValues>({
    ageStage: '',
    childGender: '',
    childGrade: '',
    childTemperament: '',
    parentRole: '',
    primaryCaregiver: '',
    behavior: '',
    duration: '',
    familyPattern: '',
    goal: '',
  });
  const [teacherLibraryOpen, setTeacherLibraryOpen] = useState(true);
  const [preconsultLibraryOpen, setPreconsultLibraryOpen] = useState(true);
  const [qingheWorkspacePrompts, setQingheWorkspacePrompts] = useState<Set<string>>(() => new Set());
  const [qinghePreviewMessageIds, setQinghePreviewMessageIds] = useState<Set<string>>(() => new Set());
  const [qingheWorkspaceSending, setQingheWorkspaceSending] = useState(false);
  const qingheWorkspacePromptsRef = useRef<Set<string>>(new Set());

  const activeExpertId = conversationExpert.conversationId === conversationId ? conversationExpert.expertId : expertId;
  const [workbenchState, setWorkbenchState] = useState(() => ({
    expertId: activeExpertId,
    values: getInitialWorkbench(activeExpertId),
  }));

  const meta = useMemo(() => getExpertDisplay(activeExpertId), [activeExpertId]);
  const displayExpertName = activeExpertId === expertId ? expertName : meta.alias;
  const isMindfulness = activeExpertId === 'thich-nhat-hanh';
  const isQingheXiezuo = activeExpertId === 'qinghe-xiezuo';
  const isYunqiaoJiaoxue = activeExpertId === 'yunqiao-jiaoxue';
  const isSongyueShici = activeExpertId === 'songyue-shici';
  const isZhiyuanLaoshi = activeExpertId === 'zhiyuan-laoshi';
  const isPreconsult = activeExpertId === 'mingheng-fawu';
  const isAnranLaoshi = activeExpertId === 'anran-laoshi';
  const isSongbaiXiansheng = activeExpertId === 'songbai-xiansheng';
  const isMuheLaoshi = activeExpertId === 'muhe-laoshi';
  const isStructuredTeacher = isQingheXiezuo || isYunqiaoJiaoxue || isSongyueShici;
  const workbenchCopy = useMemo(() => getWorkbenchCopy(activeExpertId), [activeExpertId]);
  const workbench = workbenchState.expertId === activeExpertId ? workbenchState.values : getInitialWorkbench(activeExpertId);
  const teacherWorkflow = TEACHER_WORKFLOWS[activeTeacherWorkflow];
  const rongshengWorkflow = RONGSHENG_WORKFLOWS[activeRongshengWorkflow];
  const poetryWorkflow = POETRY_WORKFLOWS[activePoetryWorkflow];
  const preconsultTask = getMinghengFawuTask(activePreconsultTask);
  const anranTask = getAnranLaoshiTask(activeAnranTask);
  const anranCopy = getAnranLaoshiWorkbenchCopy(activeAnranTask);
  const songbaiTask = getSongbaiXianshengTask(activeSongbaiTask);
  const muheTask = getMuheLaoshiTask(activeMuheTask);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const streamingRef = useRef('');
  const tempMessageCounterRef = useRef(0);
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

  const structuredBoards = isSongyueShici ? POETRY_BOARDS : isYunqiaoJiaoxue ? RONGSHENG_BOARDS : TEACHER_BOARDS;
  const structuredWorkflow = isSongyueShici ? poetryWorkflow : isYunqiaoJiaoxue ? rongshengWorkflow : teacherWorkflow;
  const structuredHeaderTitle = isSongyueShici ? '松月先生诗词教学工作台' : isYunqiaoJiaoxue ? '云桥老师教学内容工作台' : '青禾老师写作批改工作台';
  const structuredHeaderHint = isSongyueShici
    ? '任务树定方向，材料库放诗词原文、注释和教案，中间生成讲读课、主问题与诵读设计。'
    : isYunqiaoJiaoxue
    ? '围绕教案、说课稿、逐字稿和诊断改稿，先定教学内容，再生成可交付材料。'
    : '左侧选批改、备课或教研任务，中间生成结构化成品，右侧继续沟通。';
  const structuredEmptyHint = isSongyueShici
    ? '先选课堂成品、诗词讲读或材料诊改，再放入篇目、原文、注释、教案或课堂要求。'
    : isYunqiaoJiaoxue
    ? '先选教案、说课稿、逐字稿或诊断改稿，再放入课文、单元导语、课后题、教案或活动设计。'
    : '先在左侧选任务，再把作文、教案、讲义、说课稿或素材放到右侧。开始后，这里显示可复制、可下载的批改稿、讲义或教研成品。';
  const structuredAccent = isQingheXiezuo
    ? {
        page: 'bg-[#f4f7f5]',
        header: 'border-[#dce7e1] bg-[#fbfdfb]/88',
        panel: 'border-[#dce7e1] bg-white',
        soft: 'bg-[#f7faf8]',
        taskActive: 'bg-[#245f55] text-white',
        taskSubActive: 'bg-[#e5f1ec] text-[#1f5a50]',
        taskBorder: 'border-[#dce7e1]',
        hover: 'hover:border-[#87b8a8] hover:bg-[#f8fbf9]',
        focus: 'focus:border-[#245f55]',
        primary: 'bg-[#245f55] hover:bg-[#1f4f48]',
        ink: 'text-[#245f55]',
        chip: 'bg-[#f9e8e6] text-[#a43f39]',
        body: 'bg-[#f7faf8]',
        panelRadius: 'rounded-lg',
        controlRadius: 'rounded-md',
        chipRadius: 'rounded-md',
        avatarRadius: 'rounded-md',
        shadow: 'shadow-sm',
      }
    : {
        page: 'bg-[#f7f4ee]',
        header: 'border-stone-200/70 bg-[#fffaf2]/82',
        panel: 'border-stone-200/80 bg-[#fffaf2]/86',
        soft: 'bg-[#fbf6ee]',
        taskActive: 'bg-[#2f251d] text-white',
        taskSubActive: 'bg-[#f0e4d3] text-[#5c3d24]',
        taskBorder: 'border-[#eadfce]',
        hover: 'hover:border-[#d8c5aa] hover:bg-[#fffdf8]',
        focus: 'focus:border-[#8a5a35]',
        primary: 'bg-[#2f251d] hover:bg-[#4a3728]',
        ink: 'text-[#8a5a35]',
        chip: 'bg-[#f3eadc] text-[#7a4c2c]',
        body: 'bg-[#fbf8f2]',
        panelRadius: 'rounded-[22px]',
        controlRadius: 'rounded-xl',
        chipRadius: 'rounded-full',
        avatarRadius: 'rounded-2xl',
        shadow: 'shadow-[0_14px_36px_rgba(80,64,42,0.06)]',
      };
  const structuredQuestions = isSongyueShici ? SONGYUE_SHICI_QUESTIONS : isYunqiaoJiaoxue ? YUNQIAO_JIAOXUE_QUESTIONS : QINGHE_WRITING_QUESTIONS;
  const getStructuredWorkflows = (boardId: string) => (
    isSongyueShici
      ? POETRY_WORKFLOWS_BY_BOARD[boardId as PoetryBoardId]
      : isYunqiaoJiaoxue
      ? RONGSHENG_WORKFLOWS_BY_BOARD[boardId as RongshengBoardId]
      : WORKFLOWS_BY_BOARD[boardId as TeacherBoardId]
  );
  const getStructuredWorkflow = (workflowId: string) => (
    isSongyueShici
      ? POETRY_WORKFLOWS[workflowId as PoetryWorkflowId]
      : isYunqiaoJiaoxue
      ? RONGSHENG_WORKFLOWS[workflowId as RongshengWorkflowId]
      : TEACHER_WORKFLOWS[workflowId as TeacherWorkflowId]
  );
  const isStructuredBoardActive = (boardId: string) => (
    isSongyueShici ? activePoetryBoard === boardId : isYunqiaoJiaoxue ? activeRongshengBoard === boardId : activeTeacherBoard === boardId
  );
  const isStructuredWorkflowActive = (workflowId: string) => (
    isSongyueShici ? activePoetryWorkflow === workflowId : isYunqiaoJiaoxue ? activeRongshengWorkflow === workflowId : activeTeacherWorkflow === workflowId
  );
  const selectStructuredBoard = (boardId: string) => {
    if (isSongyueShici) switchPoetryBoard(boardId as PoetryBoardId);
    else if (isYunqiaoJiaoxue) switchRongshengBoard(boardId as RongshengBoardId);
    else switchTeacherBoard(boardId as TeacherBoardId);
  };
  const selectStructuredWorkflow = (boardId: string, workflowId: string) => {
    if (isSongyueShici) {
      setActivePoetryBoard(boardId as PoetryBoardId);
      setActivePoetryWorkflow(workflowId as PoetryWorkflowId);
    } else if (isYunqiaoJiaoxue) {
      setActiveRongshengBoard(boardId as RongshengBoardId);
      setActiveRongshengWorkflow(workflowId as RongshengWorkflowId);
    } else {
      setActiveTeacherBoard(boardId as TeacherBoardId);
      setActiveTeacherWorkflow(workflowId as TeacherWorkflowId);
    }
  };

  const buildUserMessage = (text: string) => {
    if (isZhiyuanLaoshi) {
      return [
        text.trim(),
        '',
        '【知远老师工作台 · 升学就业留学规划】',
        `任务类型：${workbench.materialType || '未填写'}`,
        `省份/城市：${workbench.region || '未填写'}`,
        `当前阶段：${workbench.grade || '未填写'}`,
        `分数/位次/背景：${workbench.studentLevel || '未填写'}`,
        `家庭约束：${workbench.clientBackground || '未填写'}`,
        `本次目标：${workbench.goal || '未填写'}`,
        `希望产出：${workbench.output || workbenchCopy.outputFallback}`,
        '',
        '【备选方案/材料】',
        workbench.material || '未填写',
        '',
        '【工作流指令】',
        '先把条件整理成约束表：分数位次/背景、家庭预算、城市偏好、专业禁忌、就业底线、最坏情况。再判断学校、专业、城市、考研、就业或留学路径的收益与风险。能给分层就分成“能冲、可稳、能保、该淘汰、千万别碰”；不能精确判断时说明缺哪些数据，不编造分数线或就业数据。',
        '',
        '【边界要求】',
        '不承诺录取，不编造院校分数线，不替代官方招生章程、学校招生办、签证律师、职业咨询和财务规划。缺少省份、位次、预算或目标时，只做方向判断，并列出必须补充的信息。',
      ].join('\n');
    }

    if (isAnranLaoshi) {
      return buildAnranLaoshiMessage(
        activeAnranTask,
        activeAnranSubOption,
        {
          situation: workbench.background || '',
          original_words: workbench.material || '',
          output: workbench.output || anranCopy.outputFallback,
        },
        text,
        '',
        anranCopy.outputFallback || anranTask.outputOptions[0],
      );
    }

    if (isSongbaiXiansheng) {
      return text.trim();
    }

    if (isMuheLaoshi) {
      return text.trim();
    }

  if (isQingheXiezuo) {
      const recentWorkspaceAnswer = (() => {
        let nextAssistantBelongsToWorkspace = false;
        let last = '';
        for (const message of messages) {
          if (message.role === 'user') {
            nextAssistantBelongsToWorkspace = qingheWorkspacePromptsRef.current.has(message.content.trim());
            continue;
          }
          if (message.role === 'assistant' && nextAssistantBelongsToWorkspace) {
            last = message.content;
            nextAssistantBelongsToWorkspace = false;
          }
        }
        return last;
      })();
      if (!qingheWorkspacePromptsRef.current.has(text.trim())) {
        return [
          text.trim() || '请查看附件，并像作文教学同事一样给出建议。',
          '',
          '【对话定位】',
          '这是右侧自由聊天区。请像作文教学同事一样回应，可以讨论取舍、指出风险、帮老师继续修改中间生成的成品；不要把它当成新的复杂任务入口。',
          recentWorkspaceAnswer ? '\n【中间主功能区最近生成稿】' : '',
          recentWorkspaceAnswer || '',
        ].join('\n').trim();
      }
      const work = QINGHE_WORKS.find(item => item.id === activeQingheWork) || QINGHE_WORKS[0];
      const requestedText = text.trim() || work.prompt;
      return [
        requestedText,
        '',
        `【青禾老师工作台 · ${work.label}】`,
        `使用场景：${workbench.background || '未填写'}`,
        `年级：${workbench.grade || '未填写'}`,
        `地区：${workbench.region || '未填写'}`,
        `教材版本：${workbench.textbook || '未填写'}`,
        `作文题/训练主题：${workbench.prompt || '未填写'}`,
        `文体/类型：${workbench.materialType || '未填写'}`,
        `班型：${workbench.classType || '未填写'}`,
        `学生水平：${workbench.studentLevel || '未填写'}`,
        `课时：${workbench.lessonDuration || '未填写'}`,
        `本次目标：${workbench.specificGoal || workbench.goal || '未填写'}`,
        `当前任务：${work.title}`,
        `希望产出：${workbench.output || work.output}`,
        `补充说明：${workbench.goal || '未填写'}`,
        '',
        '【老师已有材料 / 学生作文 / 课程资料】',
        workbench.material || workbench.text || '未填写',
        '',
        '【任务指令】',
        '用户可能通过点选教学条件、自然语言补充、上传附件或粘贴材料来表达需求。请综合判断，不要让用户理解内部工作流；信息不足时先给可用假设版，再列出需要确认的事实。',
        work.prompt,
        '',
        '【输出结构】',
        ...work.structure.map((item, index) => `${index + 1}. ${item}`),
        '',
        '【产品定位】',
        '这个工具服务一线语文老师、作文老师、教培老师和需要独立完成写作教学交付的人。产品入口允许新手老师通过点选和填空生成成品，也允许有经验老师用自然语言或上传资料表达需求。青禾老师的写作教学判断用于背后的取舍，不作为用户必须理解的工作流名称。',
        '',
        '【边界要求】',
        '所有字段都可留空；如果用户上传了附件，请优先阅读附件，把附件当成本次任务核心材料。只做作文批改、作文讲评、写作课程训练、素材整理、出题设计、课后反馈和写作教学资料转化相关工作；不要定位为语文全科专家，不要冒充各省官方阅卷标准；材料不足时先基于已给材料产出可用版本，再标注需要老师确认的事实；不要替学生写整篇可提交作文。',
      ].join('\n');
    }

    if (isYunqiaoJiaoxue) {
      return [
        text.trim(),
        '',
        `【云桥老师工作台 · ${RONGSHENG_BOARDS.find(item => item.id === rongshengWorkflow.board)?.label} · ${rongshengWorkflow.label}】`,
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
        '这个工具服务一线语文老师、教研组和教培备课负责人。核心不是代写漂亮教案，而是用语文教学内容判断框架，帮助老师判断一节课合宜的语文教学内容是什么、哪些内容不该教、目标和活动是否一致。',
        '',
        '【边界要求】',
        '所有字段都可留空；如果用户上传了附件，请优先阅读附件，把附件当成本次工作流核心材料。只做语文教学内容判断、备课理据、课型内容诊断、课堂活动取舍、评课磨课与单元对齐；学生作文成篇润色、旁批、讲评话术转给青禾老师；文学文本细读主链和主问题细读演示转给文本细读工作台。不要冒充官方课标解释权、命题组口径或任何现实人物的即时意见。',
      ].join('\n');
    }

    if (activeExpertId === 'songyue-shici') {
      return [
        text.trim(),
        '',
        `【松月先生工作台 · ${POETRY_BOARDS.find(item => item.id === poetryWorkflow.board)?.label} · ${poetryWorkflow.label}】`,
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
        `【明衡顾问法律预咨询工作台 · ${preconsultTask.label}】`,
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
        '这是明衡顾问法律预咨询工作台。目标不是替代律师出具正式法律意见，而是在正式咨询、仲裁、投诉、平台申诉、协商沟通之前，把事实、证据、风险边界、处理顺序和可复制材料整理成可交付材料。',
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
    if (isQingheXiezuo && incoming.some(file => file.type.startsWith('image/'))) {
      showToast('图片扫描批改将在 2.0 向 SVIP 用户开放。当前可先粘贴文字或上传可读取文档。');
    }
    const readableFiles = isQingheXiezuo ? incoming.filter(file => !file.type.startsWith('image/')) : incoming;
    const next = [...pendingFiles, ...readableFiles].slice(0, 6);
    setPendingFiles(next);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const sendText = async (text: string) => {
    if ((!text.trim() && pendingFiles.length === 0) || sending) return;

    const trimmedText = text.trim();
    const isQingheWorkspaceRequest = isQingheXiezuo && qingheWorkspacePromptsRef.current.has(trimmedText);
    abortRef.current?.abort();
    setCreditBlocked(false);
    setSending(true);
    setInput('');
    setStreamingContent('');
    streamingRef.current = '';

    const filesToSend = [...pendingFiles];
    tempMessageCounterRef.current += 1;
    const tempId = `${TEMP_ID_PREFIX}${tempMessageCounterRef.current}`;
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
        content: trimmedText || '请查看附件并给出判断。',
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
      if (isQingheWorkspaceRequest) {
        setQingheWorkspaceSending(false);
      }
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
        const sentMessageId = `${Date.now()}-sent`;
        if (isQingheWorkspaceRequest) {
          setQinghePreviewMessageIds(prev => new Set(prev).add(messageId));
        }
        setMessages(prev => [
          ...prev.map(m => (m.id === tempId ? { ...m, id: sentMessageId, attachments: uploaded } : m)),
          { id: messageId, role: 'assistant', content: finalContent, attachments: [], createdAt: new Date().toISOString() },
        ]);
        setStreamingContent('');
        if (isQingheWorkspaceRequest) {
          setQingheWorkspaceSending(false);
        }
        setSending(false);
        inputRef.current?.focus();
      },
      err => {
        if (err.includes('积分不足') || err.includes('credits')) setCreditBlocked(true);
        showToast(err);
        setStreamingContent('');
        if (isQingheWorkspaceRequest) {
          setQingheWorkspaceSending(false);
        }
        setSending(false);
        inputRef.current?.focus();
      },
    );
  };

  const copyAssistantMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    showToast('已复制', 'info');
  };

  if (isAnranLaoshi) {
    const anranValues = {
      situation: workbench.background || '',
      original_words: workbench.material || '',
      output: workbench.output || anranCopy.outputFallback,
    };

    return (
      <div className="flex h-screen flex-col overflow-hidden bg-[#f7f2e8] text-stone-950">
        <header className="shrink-0 border-b border-stone-200/70 bg-[#fffaf2]/86 px-4 py-2.5 shadow-[0_1px_20px_rgba(80,64,42,0.05)] backdrop-blur-xl">
          <div className="mx-auto flex max-w-[1280px] items-center gap-3">
            <button onClick={onBack} className="grid h-10 w-10 place-items-center rounded-full border border-stone-200 bg-white/85 text-lg text-stone-600 shadow-sm transition hover:bg-white" title="返回">←</button>
            <button onClick={onOpenHome} className="rounded-full border border-stone-200 bg-white/85 px-4 py-2 text-sm font-black text-stone-700 shadow-sm transition hover:bg-white">首页</button>
            <div className="h-10 w-10 shrink-0 overflow-hidden rounded-2xl bg-[#ede3d4]">
              <img src={meta.avatar} alt={meta.alias} className="h-full w-full object-cover" onError={event => { event.currentTarget.style.display = 'none'; }} />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-base font-semibold text-stone-950">安然老师 · 咨询整理工作台</h1>
              <p className="truncate text-xs text-stone-500">状态整理、沟通文本、冲突降温和短时练习。</p>
            </div>
            <button onClick={onOpenCredits} className="rounded-full border border-stone-200 bg-white/85 px-4 py-2 text-xs font-black text-stone-600 shadow-sm">积分</button>
          </div>
        </header>

        <main className="mx-auto grid min-h-0 w-full max-w-[1280px] flex-1 grid-cols-[320px_minmax(0,1fr)] gap-3 p-3">
          <aside className="flex min-h-0 flex-col overflow-hidden rounded-[22px] border border-stone-200/80 bg-[#fffaf2]/86 shadow-[0_14px_36px_rgba(80,64,42,0.06)]">
            <div className="border-b border-stone-200/80 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8a5a35]">咨询事项</p>
              <h2 className="mt-1 text-lg font-semibold text-stone-950">{anranCopy.title}</h2>
              <p className="mt-1 text-xs leading-5 text-stone-500">{anranCopy.intro}</p>
            </div>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
              <AnranLaoshiTaskPicker
                value={activeAnranTask}
                subOption={activeAnranSubOption}
                onChange={taskId => {
                  const task = getAnranLaoshiTask(taskId);
                  setActiveAnranTask(taskId);
                  setActiveAnranSubOption(getDefaultAnranLaoshiSubOption(task));
                  updateWorkbenchValue('output', task.outputOptions[0] || '');
                }}
                onSubOptionChange={setActiveAnranSubOption}
              />
              {anranCopy.fields.map(field => {
                const value = anranValues[field.key] || '';
                const update = (next: string) => {
                  if (field.key === 'situation') updateWorkbenchValue('background', next);
                  else if (field.key === 'original_words') updateWorkbenchValue('material', next);
                  else updateWorkbenchValue('output', next);
                };
                return (
                  <label key={field.key} className="block rounded-2xl border border-[#eadfce] bg-white p-3">
                    <span className="mb-2 block text-xs font-semibold text-stone-700">{field.label}</span>
                    {field.options ? (
                      <select value={value} onChange={event => update(event.target.value)} className="h-9 w-full rounded-xl border border-[#eadfce] bg-[#fffdf8] px-3 text-xs text-stone-800 outline-none focus:border-[#8a5a35]">
                        <option value="">{field.placeholder}</option>
                        {field.options.map(option => <option key={option} value={option}>{option}</option>)}
                      </select>
                    ) : (
                      <textarea value={value} onChange={event => update(event.target.value)} placeholder={field.placeholder} rows={field.rows || 3} className="w-full resize-none rounded-xl border border-[#eadfce] bg-[#fffdf8] px-3 py-2 text-xs leading-5 text-stone-800 outline-none placeholder:text-stone-400 focus:border-[#8a5a35]" />
                    )}
                  </label>
                );
              })}
              <button onClick={() => sendText(anranCopy.prompt)} disabled={sending} className="w-full rounded-2xl bg-[#2f251d] px-4 py-3 text-sm font-black text-white shadow-sm transition hover:bg-[#4a3728] disabled:opacity-50">
                {anranCopy.button}
              </button>
            </div>
          </aside>

          <section className="grid min-h-0 grid-rows-[minmax(0,1fr)_auto] overflow-hidden rounded-[22px] border border-stone-200/80 bg-white shadow-[0_14px_36px_rgba(80,64,42,0.06)]">
            <div className="min-h-0 overflow-y-auto bg-[#fbf8f2] p-4">
              {creditBlocked && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">积分不足，暂时不能继续提问</div>}
              {messagesLoading && <div className="py-16 text-center text-sm text-stone-400">加载中...</div>}
              {messagesError && <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">消息加载失败，请返回重试。</div>}
              {!messagesLoading && !messagesError && messages.length === 0 && !sending && (
                <div className="flex h-full min-h-[420px] items-center justify-center rounded-2xl border border-dashed border-[#eadfce] bg-white/60 px-6 py-10 text-center">
                  <div className="max-w-md">
                    <p className="text-base font-semibold text-stone-900">{anranCopy.title}</p>
                    <p className="mt-2 text-xs leading-6 text-stone-500">{anranCopy.intro}</p>
                    <button onClick={() => sendText(anranCopy.prompt)} disabled={sending} className="mt-5 rounded-full bg-[#2f251d] px-4 py-2 text-xs font-semibold text-white shadow-sm disabled:opacity-40">{anranCopy.button}</button>
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
                          <button onClick={() => copyAssistantMessage(msg.content)} className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-black text-stone-600 transition hover:bg-white">复制</button>
                          <button onClick={() => downloadWordDocument(conversationTitle || anranCopy.title || 'AI 回答', msg.content)} className="rounded-lg border border-[#eadfce] bg-[#fbf6ee] px-3 py-1.5 text-xs font-black text-[#7a4c2c] transition hover:bg-white">下载 Word</button>
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
              <input ref={fileInputRef} type="file" multiple accept="image/*,.pdf,.txt,.md,.doc,.docx" onChange={event => chooseFiles(event.target.files)} className="hidden" />
              <div className="flex gap-2">
                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={sending} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-stone-300 bg-white text-lg text-stone-700 shadow-sm transition hover:border-[#8a5a35] hover:text-[#8a5a35] disabled:opacity-40" title="上传附件">+</button>
                <input ref={inputRef} type="text" value={input} onChange={event => setInput(event.target.value)} onKeyDown={event => event.key === 'Enter' && sendText(input)} placeholder={sending ? '等待 AI 回复中...' : '补充情况、原话或要求'} className="min-w-0 flex-1 rounded-xl border border-stone-300 bg-white px-3 py-2 text-[13px] text-stone-900 outline-none placeholder:text-stone-400 focus:border-[#8a5a35] focus:ring-1 focus:ring-[#8a5a35]/20" />
                <button onClick={() => sendText(input)} disabled={sending || (!input.trim() && pendingFiles.length === 0)} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-stone-900 text-white shadow transition hover:bg-stone-800 disabled:opacity-40" title="发送补充">→</button>
              </div>
            </div>
          </section>
        </main>
      </div>
    );
  }

  if (isSongbaiXiansheng) {
    return (
      <SongbaiXianshengWorkbench
        messages={messages}
        messagesLoading={messagesLoading}
        messagesError={messagesError}
        sending={sending}
        streamingContent={streamingContent}
        creditBlocked={creditBlocked}
        input={input}
        values={songbaiValues}
        activeTaskId={activeSongbaiTask}
        task={songbaiTask}
        pendingFiles={pendingFiles}
        bottomRef={bottomRef}
        inputRef={inputRef}
        fileInputRef={fileInputRef}
        conversationTitle={conversationTitle}
        onBack={onBack}
        onOpenCredits={onOpenCredits}
        onOpenHome={onOpenHome}
        onInputChange={setInput}
        onValueChange={(key, value) => setSongbaiValues(prev => ({ ...prev, [key]: value }))}
        onTaskChange={setActiveSongbaiTask}
        onChooseFiles={chooseFiles}
        onRemovePendingFile={index => setPendingFiles(prev => prev.filter((_, i) => i !== index))}
        onSendText={sendText}
        onCopy={copyAssistantMessage}
        onDownloadWord={downloadWordDocument}
        renderMessageText={(content, dark) => <MessageText content={content} dark={dark} />}
        renderAttachments={(attachments, dark) => <AttachmentList attachments={attachments} dark={dark} />}
      />
    );
  }

  if (isMuheLaoshi) {
    return (
      <MuheLaoshiWorkbench
        messages={messages}
        messagesLoading={messagesLoading}
        messagesError={messagesError}
        sending={sending}
        streamingContent={streamingContent}
        creditBlocked={creditBlocked}
        input={input}
        values={muheValues}
        activeTaskId={activeMuheTask}
        task={muheTask}
        pendingFiles={pendingFiles}
        bottomRef={bottomRef}
        inputRef={inputRef}
        fileInputRef={fileInputRef}
        conversationTitle={conversationTitle}
        onBack={onBack}
        onOpenCredits={onOpenCredits}
        onOpenHome={onOpenHome}
        onInputChange={setInput}
        onValueChange={(key, value) => setMuheValues(prev => ({ ...prev, [key]: value }))}
        onTaskChange={setActiveMuheTask}
        onChooseFiles={chooseFiles}
        onRemovePendingFile={index => setPendingFiles(prev => prev.filter((_, i) => i !== index))}
        onSendText={sendText}
        onCopy={copyAssistantMessage}
        onDownloadWord={downloadWordDocument}
        renderMessageText={(content, dark) => <MessageText content={content} dark={dark} />}
        renderAttachments={(attachments, dark) => <AttachmentList attachments={attachments} dark={dark} />}
      />
    );
  }

  if (isZhiyuanLaoshi) {
    return (
      <div className="flex h-screen flex-col overflow-hidden bg-[#f5f1e8] text-[#211f1b]">
        <header className="shrink-0 border-b border-[#ded4c4] bg-[#fffaf0]/88 px-4 py-2.5 shadow-[0_1px_18px_rgba(64,48,28,0.06)] backdrop-blur-xl">
          <div className="mx-auto flex max-w-[1380px] items-center gap-3">
            <button onClick={onBack} className="grid h-10 w-10 place-items-center rounded-lg border border-[#d8cdbb] bg-white/85 text-lg text-stone-600 shadow-sm transition hover:bg-white" title="返回">←</button>
            <button onClick={onOpenHome} className="rounded-lg border border-[#d8cdbb] bg-white/85 px-3.5 py-2 text-xs font-semibold text-stone-700 shadow-sm transition hover:bg-white">首页</button>
            <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-[#d8cdbb] bg-[#efe6d6]">
              <img src={meta.avatar} alt={meta.alias} className="h-full w-full object-cover" onError={event => { event.currentTarget.style.display = 'none'; }} />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-base font-semibold text-[#211f1b]">知远老师 · 升学就业规划工作台</h1>
              <p className="truncate text-xs text-stone-500">把分数、预算、城市、专业和就业出口放到同一张表里判断。</p>
            </div>
            <button onClick={onOpenCredits} className="rounded-lg border border-[#d8cdbb] bg-white/85 px-3.5 py-2 text-xs font-semibold text-stone-600 shadow-sm">积分</button>
          </div>
        </header>

        <main className="mx-auto grid min-h-0 w-full max-w-[1380px] flex-1 grid-cols-[320px_minmax(0,1fr)_320px] gap-3 p-3">
          <aside className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-[#d8cdbb] bg-[#fffaf0]/88 shadow-[0_14px_34px_rgba(64,48,28,0.06)]">
            <div className="border-b border-[#e4dacb] p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8a6b38]">决策类型</p>
              <h2 className="mt-1 text-[15px] font-semibold text-[#211f1b]">{workbench.materialType || '选择本次判断'}</h2>
            </div>
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
              {['高考志愿', '考研择校', '专业选择', '城市选择', '就业倒推', '留学回本', '转专业/转行'].map(item => (
                <button key={item} type="button" onClick={() => updateWorkbenchValue('materialType', item)} className={`w-full rounded-lg border px-3 py-2.5 text-left text-[13px] font-semibold transition ${workbench.materialType === item ? 'border-[#2b2721] bg-[#2b2721] text-white shadow-sm' : 'border-[#e3d8c7] bg-white text-stone-800 hover:border-[#cdbda6] hover:bg-[#fffdf8]'}`}>
                  {item}
                </button>
              ))}
              <div className="rounded-lg border border-[#ead8b7] bg-[#fff7e6] p-3 text-xs leading-5 text-[#7d5b25]">
                <p className="font-semibold text-[#5f4218]">判断原则</p>
                <p className="mt-1">先看约束，再谈理想；先算最坏情况，再决定冲不冲。</p>
              </div>
            </div>
          </aside>

          <section className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-lg border border-[#d8cdbb] bg-white shadow-[0_14px_34px_rgba(64,48,28,0.06)]">
            <div className="border-b border-[#e4dacb] bg-white p-4">
              <p className="text-[11px] font-semibold text-[#8a6b38]">规划判断 / {workbench.materialType || '未选择'}</p>
              <h2 className="mt-1 text-lg font-semibold text-[#211f1b]">{workbenchCopy.title}</h2>
              <p className="mt-1 max-w-3xl text-xs leading-5 text-stone-500">{workbenchCopy.intro}</p>
            </div>
            <div className="min-h-0 overflow-y-auto bg-[#faf7ef] p-3">
              {creditBlocked && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">积分不足，暂时不能继续提问</div>}
              {messagesLoading && <div className="py-16 text-center text-sm text-stone-400">加载中...</div>}
              {messagesError && <div className="rounded border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">消息加载失败，请返回重试。</div>}
              {!messagesLoading && !messagesError && messages.length === 0 && !sending && (
                <div className="flex h-full min-h-[420px] items-center justify-center rounded-lg border border-dashed border-[#d8cdbb] bg-white/58 px-6 py-10">
                  <div className="max-w-xl text-center">
                    <p className="text-[13px] font-semibold text-stone-600">等待规划信息</p>
                    <p className="mt-2 text-xs leading-6 text-stone-400">填写右侧条件后，知远老师会先做约束表，再给路径判断、风险清单和下一步。</p>
                    <div className="mt-5 grid gap-2 sm:grid-cols-2">
                      {ZHIYUAN_QUESTIONS.map(question => <button key={question} type="button" onClick={() => sendText(question)} className="rounded border border-[#e3d8c7] bg-white px-3 py-2 text-left text-[11px] font-semibold leading-5 text-stone-600 transition hover:border-[#8a6b38] hover:text-[#2b2721]">{question}</button>)}
                    </div>
                    <button onClick={() => sendText(workbenchCopy.prompt)} disabled={sending} className="mt-4 rounded bg-[#2b2721] px-4 py-2 text-xs font-semibold text-white disabled:opacity-40">开始路径判断</button>
                  </div>
                </div>
              )}
              {messages.map(msg => {
                const isUser = msg.role === 'user';
                return (
                  <div key={msg.id} className={`mb-4 flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[88%] rounded-lg px-3.5 py-2.5 text-[13px] leading-6 shadow-sm ${isUser ? 'rounded-br-sm bg-[#2b2721] text-white' : 'rounded-bl-sm border border-[#e1d6c5] bg-white text-stone-800'}`}>
                      <MessageText content={msg.content} dark={isUser} />
                      <AttachmentList attachments={msg.attachments} dark={isUser} />
                      {!isUser && <div className="mt-3 flex flex-wrap gap-2 border-t border-stone-100 pt-3"><button onClick={() => copyAssistantMessage(msg.content)} className="rounded-md border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-semibold text-stone-600 transition hover:bg-white">复制</button><button onClick={() => downloadWordDocument(conversationTitle || '规划判断', msg.content)} className="rounded-md border border-[#ead8b7] bg-[#fff7e6] px-3 py-1.5 text-xs font-semibold text-[#7d5b25] transition hover:bg-white">下载 Word</button></div>}
                    </div>
                  </div>
                );
              })}
              {streamingContent && <div className="mb-4 flex justify-start"><div className="max-w-[88%] rounded-lg rounded-bl-sm border border-[#e1d6c5] bg-white px-3.5 py-2.5 text-[13px] leading-6 text-stone-800 shadow-sm"><MessageText content={streamingContent} /><span className="ml-1 inline-block h-4 w-1.5 animate-pulse rounded-sm bg-[#8a6b38] align-middle" /></div></div>}
              <div ref={bottomRef} />
            </div>
            <div className="border-t border-[#e4dacb] bg-white p-2.5">
              <input ref={fileInputRef} type="file" multiple accept="image/*,.pdf,.txt,.md,.doc,.docx" onChange={event => chooseFiles(event.target.files)} className="hidden" />
              {pendingFiles.length > 0 && <div className="mb-2 flex flex-wrap gap-2">{pendingFiles.map((file, index) => <div key={`${file.name}-${index}`} className="flex max-w-full items-center gap-2 rounded-md border border-[#e1d6c5] bg-[#faf7ef] px-2.5 py-1.5 text-xs text-stone-700"><span className="max-w-48 truncate font-semibold">{file.name}</span><button type="button" onClick={() => setPendingFiles(prev => prev.filter((_, i) => i !== index))} className="text-stone-400 hover:text-red-600" title="移除">x</button></div>)}</div>}
              <div className="flex gap-2">
                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={sending} className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-[#d8cdbb] bg-white text-lg text-stone-700 shadow-sm transition hover:border-[#8a6b38] hover:text-[#7d5b25] disabled:opacity-40" title="上传附件">+</button>
                <input ref={inputRef} type="text" value={input} onChange={event => setInput(event.target.value)} onKeyDown={event => event.key === 'Enter' && sendText(input)} placeholder={sending ? '正在判断...' : '补充分数、预算、城市、专业或目标'} className="min-w-0 flex-1 rounded-md border border-[#d8cdbb] bg-white px-3 py-2 text-[13px] text-stone-900 outline-none placeholder:text-stone-400 focus:border-[#8a6b38] focus:ring-1 focus:ring-[#8a6b38]/20" />
                <button onClick={() => sendText(workbenchCopy.prompt)} disabled={sending} className="shrink-0 rounded-md bg-[#2b2721] px-4 py-2 text-[13px] font-semibold text-white shadow transition hover:bg-[#44392d] disabled:opacity-40">开始判断</button>
                <button onClick={() => sendText(input)} disabled={sending || (!input.trim() && pendingFiles.length === 0)} className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-stone-900 text-white shadow transition hover:bg-stone-800 disabled:opacity-40" title="发送补充">→</button>
              </div>
            </div>
          </section>

          <aside className="min-h-0 overflow-hidden rounded-lg border border-[#d8cdbb] bg-[#fffaf0]/88 shadow-[0_14px_34px_rgba(64,48,28,0.06)]">
            <div className="flex h-full min-h-0 flex-col">
              <div className="border-b border-[#e4dacb] p-3"><p className="text-[13px] font-semibold text-[#211f1b]">约束信息</p><p className="text-xs text-stone-500">分数、预算、城市、专业和底线</p></div>
              <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto p-3">
                {workbenchCopy.fields.filter(field => field.key !== 'materialType').map(field => (
                  <label key={field.key} className="block rounded-lg border border-[#e3d8c7] bg-white p-3">
                    <span className="mb-2 block text-xs font-semibold text-stone-700">{field.label}</span>
                    {field.options ? (
                      <select value={workbench[field.key]} onChange={event => updateWorkbenchValue(field.key, event.target.value)} className="h-9 w-full rounded-md border border-[#e3d8c7] bg-[#fffdf8] px-2 text-xs text-stone-800 outline-none focus:border-[#8a6b38]">
                        <option value="">{field.placeholder}</option>
                        {field.options.map(option => <option key={option} value={option}>{option}</option>)}
                      </select>
                    ) : field.rows === 1 ? (
                      <input value={workbench[field.key]} onChange={event => updateWorkbenchValue(field.key, event.target.value)} placeholder={field.placeholder} className="h-9 w-full rounded-md border border-[#e3d8c7] bg-[#fffdf8] px-3 text-xs text-stone-800 outline-none placeholder:text-stone-400 focus:border-[#8a6b38]" />
                    ) : (
                      <textarea value={workbench[field.key]} onChange={event => updateWorkbenchValue(field.key, event.target.value)} placeholder={field.placeholder} rows={field.rows || 3} className="w-full resize-none rounded-md border border-[#e3d8c7] bg-[#fffdf8] px-3 py-2 text-xs leading-5 text-stone-800 outline-none placeholder:text-stone-400 focus:border-[#8a6b38]" />
                    )}
                  </label>
                ))}
              </div>
            </div>
          </aside>
        </main>
      </div>
    );
  }

  if (isPreconsult) {
    return (
      <div className="flex h-screen flex-col overflow-hidden bg-[#f5f1e8] text-[#211f1b]">
        <header className="shrink-0 border-b border-[#ded4c4] bg-[#fffaf0]/88 px-4 py-2.5 shadow-[0_1px_18px_rgba(64,48,28,0.06)] backdrop-blur-xl">
          <div className="mx-auto flex max-w-[1440px] items-center gap-3">
            <button onClick={onBack} className="grid h-10 w-10 place-items-center rounded-lg border border-[#d8cdbb] bg-white/85 text-lg text-stone-600 shadow-sm transition hover:bg-white" title="返回">←</button>
            <button onClick={onOpenHome} className="rounded-lg border border-[#d8cdbb] bg-white/85 px-3.5 py-2 text-xs font-semibold text-stone-700 shadow-sm transition hover:bg-white">首页</button>
            <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-[#d8cdbb] bg-[#efe6d6]"><img src={meta.avatar} alt={meta.alias} className="h-full w-full object-cover" onError={event => { event.currentTarget.style.display = 'none'; }} /></div>
            <div className="min-w-0 flex-1"><h1 className="truncate text-base font-semibold text-[#211f1b]">明衡顾问明衡顾问法律预咨询工作台</h1><p className="truncate text-xs text-stone-500">整理事实、证据、程序进展和可提交材料。</p></div>
            <button onClick={() => setPreconsultLibraryOpen(prev => !prev)} className="rounded-lg border border-[#d8cdbb] bg-white/85 px-3.5 py-2 text-xs font-semibold text-stone-600 shadow-sm transition hover:bg-white">{preconsultLibraryOpen ? '收起材料库' : '展开材料库'}</button>
            <button onClick={onOpenCredits} className="rounded-lg border border-[#d8cdbb] bg-white/85 px-3.5 py-2 text-xs font-semibold text-stone-600 shadow-sm">积分</button>
          </div>
        </header>
        <main className={`mx-auto grid min-h-0 w-full max-w-[1440px] flex-1 gap-3 p-3 transition-[grid-template-columns] duration-300 ${preconsultLibraryOpen ? 'grid-cols-[304px_minmax(0,1fr)_316px]' : 'grid-cols-[304px_minmax(0,1fr)_52px]'}`}>
          <aside className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-[#d8cdbb] bg-[#fffaf0]/88 shadow-[0_14px_34px_rgba(64,48,28,0.06)]">
            <div className="border-b border-[#e4dacb] p-3"><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8a6b38]">热门咨询</p><h2 className="mt-1 text-[15px] font-semibold text-[#211f1b]">咨询事项</h2><p className="mt-1 text-xs leading-5 text-stone-500">{preconsultTask.headline}</p></div>
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
              {MINGHENG_FAWU_TASKS.map(task => {
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

  if (isYunqiaoJiaoxue) {
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
              <h1 className="truncate text-base font-semibold text-stone-950">云桥老师语文备课工作台</h1>
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
                  <p className="mx-auto mt-2 max-w-lg text-xs leading-6 text-stone-500">云桥老师会先判断本课合宜的教学内容，再生成教案、说课稿、逐字稿或诊断改稿，不把课堂写成空模板。</p>
                  <div className="mt-5 flex flex-wrap justify-center gap-2">
                    {YUNQIAO_JIAOXUE_QUESTIONS.map(question => (
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

  if (isQingheXiezuo) {
    const qingheWorkspaceIds = new Set<string>();
    let nextAssistantBelongsToWorkspace = false;
    for (const message of messages) {
      if (message.role === 'user') {
        nextAssistantBelongsToWorkspace = qingheWorkspacePrompts.has(message.content.trim());
        if (nextAssistantBelongsToWorkspace) qingheWorkspaceIds.add(message.id);
        continue;
      }
      if (message.role === 'assistant' && nextAssistantBelongsToWorkspace) {
        qingheWorkspaceIds.add(message.id);
        nextAssistantBelongsToWorkspace = false;
      }
    }
    qinghePreviewMessageIds.forEach(id => qingheWorkspaceIds.add(id));
    const assistantMessages = messages.filter(message => message.role === 'assistant' && qingheWorkspaceIds.has(message.id));
    const chatMessages = messages.filter(message => !qingheWorkspaceIds.has(message.id));
    const qingheWorkspaceRunning = qingheWorkspaceSending && sending;
    const selectedQingheWork = QINGHE_WORKS.find(item => item.id === activeQingheWork) || QINGHE_WORKS[0];
    const groupedQingheWorks = Array.from(new Set(QINGHE_WORKS.map(item => item.group))).map(group => ({
      group,
      items: QINGHE_WORKS.filter(item => item.group === group),
    }));
    const qingheConditionSummary = [
      workbench.background && `使用场景：${workbench.background}`,
      workbench.grade && `年级：${workbench.grade}`,
      workbench.prompt && `作文题/训练主题：${workbench.prompt}`,
      workbench.materialType && `文体/类型：${workbench.materialType}`,
      workbench.classType && `班型：${workbench.classType}`,
      workbench.studentLevel && `学生水平：${workbench.studentLevel}`,
      workbench.lessonDuration && `课时：${workbench.lessonDuration}`,
      (workbench.specificGoal || workbench.goal) && `目标：${workbench.specificGoal || workbench.goal}`,
      workbench.output && `需要文本：${workbench.output}`,
    ].filter(Boolean).join('\n');
    const runQingheGeneration = () => {
      const requestText = [
        selectedQingheWork.prompt,
        qingheConditionSummary ? `\n【教学条件】\n${qingheConditionSummary}` : '',
        workbench.material ? `\n【资料与补充要求】\n${workbench.material}` : '',
      ].join('\n').trim();
      qingheWorkspacePromptsRef.current.add(requestText);
      setQingheWorkspacePrompts(prev => new Set(prev).add(requestText));
      setQingheWorkspaceSending(true);
      sendText(requestText);
    };

    return (
      <div className="flex h-screen flex-col overflow-hidden bg-[#f5f7f5] text-stone-950">
        <header className="shrink-0 border-b border-black/10 bg-white/95 py-2.5 backdrop-blur-xl">
          <div className="mx-auto flex w-full max-w-[1600px] items-center gap-3 px-3">
            <button onClick={onBack} className="grid h-9 w-9 place-items-center rounded-md border border-black/10 bg-white text-stone-600 transition hover:bg-[#f7faf8]" title="返回">←</button>
            <button onClick={onOpenHome} className="rounded-md border border-black/10 bg-white px-3 py-2 text-xs font-semibold text-stone-700 transition hover:bg-[#f7faf8]">首页</button>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-[15px] font-semibold text-stone-950">青禾老师写作教学工作台</h1>
              <p className="truncate text-xs text-stone-500">点选生成、填空起稿、自然语言沟通都可以。</p>
            </div>
            <button onClick={onOpenCredits} className="rounded-md border border-black/10 bg-white px-3 py-2 text-xs font-semibold text-stone-600">积分</button>
          </div>
        </header>

        <main className="mx-auto grid min-h-0 w-full max-w-[1600px] flex-1 grid-cols-[260px_minmax(0,1fr)_390px] gap-3 p-3">
          <aside className="flex min-h-0 flex-col overflow-hidden rounded-md border border-black/10 bg-white">
            <div className="min-h-0 flex-1 overflow-y-auto p-2">
              <p className="px-2 py-1 text-[12px] font-semibold text-stone-900">任务目录</p>
              {groupedQingheWorks.map(section => (
                <div key={section.group} className="mt-2 border-t border-stone-200/80 pt-2 first:mt-0 first:border-t-0 first:pt-0">
                  <p className="px-2 py-1 text-[11px] font-semibold text-stone-500">{section.group}</p>
                  <div className="grid gap-1">
                    {section.items.map(item => {
                      const active = activeQingheWork === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setActiveQingheWork(item.id);
                            updateWorkbenchValue('output', item.output);
                          }}
                          className={`rounded border px-3 py-2 text-left transition ${active ? 'border-[#245f55] bg-[#e5f1ec] text-[#1f5a50]' : 'border-transparent text-stone-800 hover:border-black/10 hover:bg-[#f7faf8]'}`}
                        >
                          <span className="block text-[13px] font-semibold">{item.label}</span>
                          <span className="mt-0.5 block text-[11px] leading-4 text-stone-500">{item.hint}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </aside>

          <section className="flex min-h-0 flex-col overflow-hidden rounded-md border border-black/10 bg-white">
            <div className="shrink-0 border-b border-black/8 p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-[#245f55]">{selectedQingheWork.group} / {selectedQingheWork.label}</p>
                  <h2 className="mt-1 text-xl font-semibold text-stone-950">{selectedQingheWork.title}</h2>
                  <p className="mt-1 text-sm leading-6 text-stone-500">{selectedQingheWork.hint}</p>
                </div>
                <button onClick={runQingheGeneration} disabled={sending} className="shrink-0 rounded-md bg-[#245f55] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1f4f48] disabled:opacity-40">
                  {selectedQingheWork.button}
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto bg-[#f7faf8] p-4">
              {creditBlocked && (
                <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                  <p className="font-semibold">积分不足</p>
                  <button type="button" onClick={onOpenCredits} className="mt-2 rounded-md bg-red-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-600">去积分中心</button>
                </div>
              )}
              {messagesLoading && <div className="py-10 text-center text-sm text-stone-400">加载中...</div>}
              {messagesError && <div className="rounded-md border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">消息加载失败，请返回重试。</div>}

              <div className="grid gap-3">
                <div className="rounded-md border border-black/10 bg-white p-3">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold text-stone-700">教学条件</p>
                    <span className="text-[11px] text-stone-400">不确定可留空</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
                    <label className="block">
                      <span className="mb-1 block text-[11px] font-semibold text-stone-500">年级</span>
                      <select value={workbench.grade} onChange={event => updateWorkbenchValue('grade', event.target.value)} className="h-9 w-full rounded-md border border-black/10 bg-white px-2 text-xs text-stone-800 outline-none focus:border-[#245f55]">
                        <option value="">可不选</option>
                        {QINGHE_GRADE_OPTIONS.map(item => <option key={item} value={item}>{item}</option>)}
                      </select>
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-[11px] font-semibold text-stone-500">使用场景</span>
                      <select value={workbench.background} onChange={event => updateWorkbenchValue('background', event.target.value)} className="h-9 w-full rounded-md border border-black/10 bg-white px-2 text-xs text-stone-800 outline-none focus:border-[#245f55]">
                        <option value="">可不选</option>
                        {QINGHE_SCENE_OPTIONS.map(item => <option key={item} value={item}>{item}</option>)}
                      </select>
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-[11px] font-semibold text-stone-500">文体/类型</span>
                      <select value={workbench.materialType} onChange={event => updateWorkbenchValue('materialType', event.target.value)} className="h-9 w-full rounded-md border border-black/10 bg-white px-2 text-xs text-stone-800 outline-none focus:border-[#245f55]">
                        <option value="">可不选</option>
                        {QINGHE_WRITING_TYPE_OPTIONS.map(item => <option key={item} value={item}>{item}</option>)}
                      </select>
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-[11px] font-semibold text-stone-500">班型</span>
                      <select value={workbench.classType} onChange={event => updateWorkbenchValue('classType', event.target.value)} className="h-9 w-full rounded-md border border-black/10 bg-white px-2 text-xs text-stone-800 outline-none focus:border-[#245f55]">
                        <option value="">可不选</option>
                        {QINGHE_CLASS_TYPE_OPTIONS.map(item => <option key={item} value={item}>{item}</option>)}
                      </select>
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-[11px] font-semibold text-stone-500">学生水平</span>
                      <select value={workbench.studentLevel} onChange={event => updateWorkbenchValue('studentLevel', event.target.value)} className="h-9 w-full rounded-md border border-black/10 bg-white px-2 text-xs text-stone-800 outline-none focus:border-[#245f55]">
                        <option value="">可不选</option>
                        {QINGHE_STUDENT_LEVEL_OPTIONS.map(item => <option key={item} value={item}>{item}</option>)}
                      </select>
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-[11px] font-semibold text-stone-500">课时</span>
                      <select value={workbench.lessonDuration} onChange={event => updateWorkbenchValue('lessonDuration', event.target.value)} className="h-9 w-full rounded-md border border-black/10 bg-white px-2 text-xs text-stone-800 outline-none focus:border-[#245f55]">
                        <option value="">可不选</option>
                        {QINGHE_DURATION_OPTIONS.map(item => <option key={item} value={item}>{item}</option>)}
                      </select>
                    </label>
                    <label className="block xl:col-span-2">
                      <span className="mb-1 block text-[11px] font-semibold text-stone-500">作文题/训练主题</span>
                      <input value={workbench.prompt} onChange={event => updateWorkbenchValue('prompt', event.target.value)} placeholder="例如：那一刻，我长大了；细节描写训练" className="h-9 w-full rounded-md border border-black/10 bg-white px-3 text-xs text-stone-800 outline-none placeholder:text-stone-400 focus:border-[#245f55]" />
                    </label>
                    <label className="block xl:col-span-2">
                      <span className="mb-1 block text-[11px] font-semibold text-stone-500">本次目标</span>
                      <input value={workbench.specificGoal} onChange={event => { updateWorkbenchValue('specificGoal', event.target.value); updateWorkbenchValue('goal', event.target.value); }} placeholder="例如：把一件事写具体；整理一套初二记叙文课程" className="h-9 w-full rounded-md border border-black/10 bg-white px-3 text-xs text-stone-800 outline-none placeholder:text-stone-400 focus:border-[#245f55]" />
                    </label>
                  </div>
                </div>

                <label className="block rounded-md border border-black/10 bg-white p-3">
                  <span className="mb-2 block text-xs font-semibold text-stone-700">资料与补充要求</span>
                  <textarea
                    value={workbench.material}
                    onChange={event => updateWorkbenchValue('material', event.target.value)}
                    placeholder="可粘贴学生作文、作文题、已有教案、课程目录、素材、课堂记录；也可以直接写一句完整需求。留空也会按教学条件生成假设版。"
                    rows={6}
                    className="w-full resize-none rounded-md border border-black/10 bg-white px-3 py-2 text-sm leading-6 text-stone-900 outline-none placeholder:text-stone-400 focus:border-[#245f55]"
                  />
                </label>

                {pendingFiles.length > 0 && (
                  <div className="rounded-md border border-black/10 bg-white p-3">
                    <p className="mb-2 text-xs font-semibold text-stone-700">待发送附件</p>
                    <div className="flex flex-wrap gap-2">
                      {pendingFiles.map((file, index) => (
                        <div key={`${file.name}-${index}`} className="flex max-w-full items-center gap-2 rounded-md border border-black/10 bg-[#f7faf8] px-2.5 py-1.5 text-xs text-stone-700">
                          <span className="max-w-52 truncate font-semibold">{file.name}</span>
                          <button type="button" onClick={() => setPendingFiles(prev => prev.filter((_, i) => i !== index))} className="text-stone-400 hover:text-red-600">×</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2">
                  <input ref={fileInputRef} type="file" multiple accept=".pdf,.txt,.md,.doc,.docx" onChange={event => chooseFiles(event.target.files)} className="hidden" />
                  <button type="button" onClick={() => fileInputRef.current?.click()} disabled={sending} className="rounded-md border border-black/10 bg-white px-3 py-2 text-xs font-semibold text-stone-700 transition hover:border-[#245f55] disabled:opacity-40">上传资料</button>
                  <button onClick={runQingheGeneration} disabled={sending} className="rounded-md bg-[#245f55] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#1f4f48] disabled:opacity-40">{selectedQingheWork.button}</button>
                </div>

                <div className="rounded-md border border-black/10 bg-white">
                  <div className="flex items-center justify-between border-b border-black/8 px-3 py-2">
                    <p className="text-xs font-semibold text-stone-700">生成预览</p>
                    <span className="text-[11px] text-stone-400">确认后可下载 Word</span>
                  </div>
                  <div className="min-h-[260px] p-4">
                    {!messagesLoading && !messagesError && assistantMessages.length === 0 && !qingheWorkspaceRunning && (
                      <div className="flex h-[240px] items-center justify-center text-center">
                        <div className="max-w-sm">
                          <p className="text-sm font-semibold text-stone-700">{selectedQingheWork.label}</p>
                          <p className="mt-2 text-xs leading-6 text-stone-500">点击生成后，这里会显示可修改、可复制、可下载的成品预览。</p>
                        </div>
                      </div>
                    )}
                    {assistantMessages.map(msg => (
                      <div key={msg.id} className="mb-4 rounded-md border border-black/10 bg-white px-4 py-3 text-[13px] leading-6 text-stone-800">
                        <MessageText content={msg.content} />
                        <AttachmentList attachments={msg.attachments} />
                        <div className="mt-3 flex flex-wrap gap-2 border-t border-stone-100 pt-3">
                          <button onClick={() => { navigator.clipboard.writeText(msg.content); showToast('已复制', 'info'); }} className="rounded-md border border-black/10 bg-stone-50 px-3 py-1.5 text-xs font-semibold text-stone-600 transition hover:bg-white">复制</button>
                          <button onClick={() => downloadWordDocument(conversationTitle || selectedQingheWork.title || '青禾老师生成内容', msg.content)} className="rounded-md border border-black/10 bg-[#e5f1ec] px-3 py-1.5 text-xs font-semibold text-[#1f5a50] transition hover:bg-white">下载 Word</button>
                        </div>
                      </div>
                    ))}
                    {qingheWorkspaceRunning && streamingContent && (
                      <div className="rounded-md border border-black/10 bg-white px-4 py-3 text-[13px] leading-6 text-stone-800">
                        <MessageText content={streamingContent} />
                        <span className="ml-1 inline-block h-4 w-1.5 animate-pulse rounded-sm bg-[#245f55] align-middle" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <aside className="flex min-h-0 flex-col overflow-hidden rounded-md border border-black/10 bg-white">
            <div className="border-b border-black/8 p-3">
              <p className="text-sm font-semibold text-stone-900">和青禾老师聊</p>
              <p className="mt-1 text-xs leading-5 text-stone-500">像和同事沟通一样，补充材料、讨论取舍、让她按你的意见改到定稿。</p>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto bg-[#f7faf8] p-3">
              {chatMessages.length === 0 && !sending && (
                <div className="flex h-full items-center justify-center text-center">
                  <p className="max-w-[220px] text-xs leading-6 text-stone-400">这里保留自由对话；主区生成的任务内容不会重复塞进来。</p>
                </div>
              )}
              {chatMessages.map(msg => {
                const isUser = msg.role === 'user';
                return (
                  <div key={msg.id} className={`mb-4 flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[88%] rounded-md px-3.5 py-2.5 text-[13px] leading-6 ${isUser ? 'rounded-br-sm bg-[#245f55] text-white' : 'rounded-bl-sm border border-black/10 bg-white text-stone-800'}`}>
                      <MessageText content={msg.content} dark={isUser} />
                      <AttachmentList attachments={msg.attachments} dark={isUser} />
                    </div>
                  </div>
                );
              })}
              {streamingContent && !qingheWorkspaceRunning && (
                <div className="mb-4 flex justify-start">
                  <div className="max-w-[88%] rounded-md rounded-bl-sm border border-black/10 bg-white px-3.5 py-2.5 text-[13px] leading-6 text-stone-800">
                    <MessageText content={streamingContent} />
                    <span className="ml-1 inline-block h-4 w-1.5 animate-pulse rounded-sm bg-[#245f55] align-middle" />
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            <div className="shrink-0 border-t border-black/8 bg-white p-2.5">
              <div className="flex gap-2">
                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={sending} className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-black/10 bg-white text-lg text-stone-700 transition hover:border-[#245f55] disabled:opacity-40" title="上传附件">+</button>
                <input
                  ref={inputRef}
                  value={input}
                  onChange={event => setInput(event.target.value)}
                  onKeyDown={event => event.key === 'Enter' && sendText(input)}
                  placeholder={sending ? '等待回复中...' : '和青禾老师说说你的想法'}
                  className="h-10 min-w-0 flex-1 rounded-md border border-black/10 bg-white px-3 text-[13px] text-stone-900 outline-none placeholder:text-stone-400 focus:border-[#245f55]"
                />
                <button onClick={() => sendText(input)} disabled={sending || (!input.trim() && pendingFiles.length === 0)} className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-stone-900 text-white transition hover:bg-stone-800 disabled:opacity-40" title="发送">→</button>
              </div>
            </div>
          </aside>
        </main>
      </div>
    );
  }

  if (isStructuredTeacher) {
    return (
      <div className={`flex h-screen flex-col overflow-hidden ${structuredAccent.page} text-stone-950`}>
        <header className={`shrink-0 border-b ${structuredAccent.header} px-4 py-2.5 shadow-[0_1px_20px_rgba(80,64,42,0.05)] backdrop-blur-xl`}>
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
          <aside className={`flex min-h-0 flex-col overflow-hidden rounded-[22px] border ${structuredAccent.panel} shadow-[0_14px_36px_rgba(80,64,42,0.06)]`}>
            <div className="border-b border-stone-200/80 p-3">
              <div className="flex items-center gap-2.5">
                <div className={`h-10 w-10 shrink-0 overflow-hidden rounded-2xl ${structuredAccent.soft}`}>
                  <img src={meta.avatar} alt={meta.alias} className="h-full w-full object-cover" onError={event => { event.currentTarget.style.display = 'none'; }} />
                </div>
                <div className="min-w-0">
                  <p className="text-[15px] font-semibold text-stone-950">{isSongyueShici ? '诗词教学入口' : isQingheXiezuo ? '任务目录' : '任务树'}</p>
                  <p className="mt-0.5 truncate text-xs leading-5 text-stone-500">{structuredWorkflow.title}</p>
                </div>
              </div>
            </div>

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
              <div className="space-y-2">
                {isSongyueShici ? (
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
                  <div key={board.id} className={`overflow-hidden rounded-2xl border ${structuredAccent.taskBorder} bg-white p-2`}>
                    <button
                      type="button"
                      onClick={() => selectStructuredBoard(board.id)}
                      className={`w-full rounded-xl px-2.5 py-2 text-left transition ${isStructuredBoardActive(board.id) ? structuredAccent.taskActive : `${structuredAccent.soft} text-stone-800 hover:bg-white`}`}
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
                            className={`min-w-0 rounded-xl px-2.5 py-1.5 text-left text-xs transition ${active ? structuredAccent.taskSubActive : 'text-stone-600 hover:bg-stone-50'}`}
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
                className={`w-full rounded-2xl border ${structuredAccent.taskBorder} bg-white px-3 py-3 text-left shadow-sm transition ${structuredAccent.hover}`}
              >
                <span className="block text-[13px] font-semibold text-stone-950">上传资料</span>
                  <span className="mt-1 block text-xs leading-5 text-stone-500">{isSongyueShici ? '诗词原文、注释、讲稿、板书和课堂要求都可以。' : isYunqiaoJiaoxue ? '课文、课后题、教案、活动设计、听评课记录都可以。' : '学生作文、作文题、教案、讲义、说课稿、素材包都可以。'}</span>
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
                      placeholder={isSongyueShici ? '例如：初二统编版、社团课、学生能背但不会讲出意象和情感层次。也可以留空。' : isYunqiaoJiaoxue ? '例如：初二统编版、单元在训练人物描写、学生读文本容易只谈主题。也可以留空。' : '例如：初二小班、最近在训练细节描写、学生普遍结构松散。也可以留空。'}
                      rows={4}
                      className={`w-full rounded-xl border ${structuredAccent.taskBorder} bg-white px-3 py-2 text-xs leading-5 text-stone-800 outline-none placeholder:text-stone-400 ${structuredAccent.focus}`}
                    />
                  </label>

              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-black text-stone-700">{isSongyueShici ? '学段' : '年级'}</span>
                  <select value={workbench.grade} onChange={event => updateWorkbenchValue('grade', event.target.value)} className={`h-9 w-full rounded-xl border ${structuredAccent.taskBorder} bg-white px-2 text-xs text-stone-800 outline-none ${structuredAccent.focus}`}>
                    <option value="">可不选</option>
                    {(isSongyueShici ? ['小学高年级', '初中', '高中', '大学通识', '成人自学', '不确定'] : ['三年级', '四年级', '五年级', '六年级', '初一', '初二', '初三', '高一', '高二', '高三']).map(item => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-black text-stone-700">{isSongyueShici ? '基础' : '水平'}</span>
                  <select value={workbench.studentLevel} onChange={event => updateWorkbenchValue('studentLevel', event.target.value)} className={`h-9 w-full rounded-xl border ${structuredAccent.taskBorder} bg-white px-2 text-xs text-stone-800 outline-none ${structuredAccent.focus}`}>
                    <option value="">可不选</option>
                    {(isSongyueShici ? ['初学', '有基础', '备考复习', '社团拓展', '不确定'] : ['基础薄弱', '中等', '较好', '不确定']).map(item => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className={`rounded-2xl border ${structuredAccent.taskBorder} ${structuredAccent.soft} px-3 py-2.5 text-xs leading-5 text-stone-600`}>
                <p className="font-semibold text-stone-800">使用方式</p>
                  <p className="mt-1">{isSongyueShici ? '左侧选诗词教学任务，中间出讲读方案，右侧补原文、注释、讲稿和课堂要求。' : isYunqiaoJiaoxue ? '左侧选任务，中间出教学内容判断，右侧补教材证据和活动材料。' : '左侧选任务，中间出成品和意见，右侧按需展开材料库。'}</p>
              </div>
            </div>
          </aside>

          <section className={`grid min-h-0 grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-[22px] border ${structuredAccent.panel} shadow-[0_14px_36px_rgba(80,64,42,0.06)]`}>
            <div className="border-b border-stone-200 bg-white p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className={`text-[11px] font-semibold ${structuredAccent.ink}`}>{isSongyueShici ? '诗词教学' : structuredBoards.find(item => item.id === structuredWorkflow.board)?.label} / {structuredWorkflow.label}</p>
                  <h2 className="mt-1 text-lg font-semibold text-stone-950">{structuredWorkflow.title}</h2>
                  <p className="mt-1 max-w-3xl text-xs leading-5 text-stone-500">{structuredWorkflow.intro}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${structuredAccent.chip}`}>字段可空</span>
              </div>
            </div>

            <div className={`min-h-0 overflow-y-auto ${structuredAccent.body} p-3`}>
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
                  <div className={`flex flex-1 items-center justify-center rounded-2xl border border-dashed ${structuredAccent.taskBorder} bg-white/65 px-6 py-10`}>
                    <div className="max-w-md text-center">
                      <p className="text-[13px] font-semibold text-stone-500">工作区空白</p>
                      <p className="mt-2 text-xs leading-6 text-stone-400">{structuredEmptyHint}</p>
                      <div className="mt-5 flex flex-wrap justify-center gap-2">
                        {structuredQuestions.map(question => (
                          <button key={question} type="button" onClick={() => sendText(question)} className={`rounded-full border ${structuredAccent.taskBorder} bg-white/80 px-3 py-1.5 text-[11px] font-semibold text-stone-500 transition ${structuredAccent.hover}`}>
                            {question}
                          </button>
                        ))}
                      </div>
                      <button onClick={() => sendText(structuredWorkflow.prompt)} disabled={sending} className={`mt-4 rounded-full px-4 py-2 text-xs font-semibold text-white shadow-sm disabled:opacity-40 ${structuredAccent.primary}`}>
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
                    <div className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-6 shadow-sm ${isUser ? `rounded-br-sm ${structuredAccent.primary.split(' ')[0]} text-white` : `rounded-bl-sm border ${structuredAccent.taskBorder} bg-white text-stone-800`}`}>
                      <MessageText content={msg.content} dark={isUser} />
                      <AttachmentList attachments={msg.attachments} dark={isUser} />
                      {!isUser && (
                        <div className="mt-3 flex flex-wrap gap-2 border-t border-stone-100 pt-3">
                          <button onClick={() => { navigator.clipboard.writeText(msg.content); showToast('已复制', 'info'); }} className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-black text-stone-600 transition hover:bg-white">
                            复制
                          </button>
                          <button onClick={() => downloadWordDocument(conversationTitle || structuredWorkflow.title || 'AI 回答', msg.content)} className={`rounded-lg border ${structuredAccent.taskBorder} ${structuredAccent.soft} px-3 py-1.5 text-xs font-black ${structuredAccent.ink} transition hover:bg-white`}>
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
                  <div className={`max-w-[88%] rounded-2xl rounded-bl-sm border ${structuredAccent.taskBorder} bg-white px-3.5 py-2.5 text-[13px] leading-6 text-stone-800 shadow-sm`}>
                    <MessageText content={streamingContent} />
                    <span className={`ml-1 inline-block h-4 w-1.5 animate-pulse rounded-sm align-middle ${isQingheXiezuo ? 'bg-[#245f55]' : 'bg-[#8a5a35]'}`} />
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            <div className="border-t border-stone-200 bg-white p-2.5">
              <input ref={fileInputRef} type="file" multiple accept=".pdf,.txt,.md,.doc,.docx" onChange={event => chooseFiles(event.target.files)} className="hidden" />
              <div className="flex gap-2">
                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={sending} className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-stone-300 bg-white text-lg text-stone-700 shadow-sm transition hover:text-current disabled:opacity-40 ${isQingheXiezuo ? 'hover:border-[#245f55] hover:text-[#245f55]' : 'hover:border-[#8a5a35] hover:text-[#8a5a35]'}`} title="上传附件">
                  +
                </button>
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={event => setInput(event.target.value)}
                  onKeyDown={event => event.key === 'Enter' && sendText(input)}
                  placeholder={sending ? '等待 AI 回复中...' : '补充要求，也可以只发附件'}
                  className={`min-w-0 flex-1 rounded-xl border border-stone-300 bg-white px-3 py-2 text-[13px] text-stone-900 outline-none placeholder:text-stone-400 ${isQingheXiezuo ? 'focus:border-[#245f55] focus:ring-1 focus:ring-[#245f55]/20' : 'focus:border-[#8a5a35] focus:ring-1 focus:ring-[#8a5a35]/20'}`}
                />
                <button onClick={() => sendText(structuredWorkflow.prompt)} disabled={sending} className={`shrink-0 rounded-xl px-4 py-2 text-[13px] font-semibold text-white shadow transition disabled:opacity-40 ${structuredAccent.primary}`}>
                  {structuredWorkflow.button}
                </button>
                <button onClick={() => sendText(input)} disabled={sending || (!input.trim() && pendingFiles.length === 0)} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-stone-900 text-white shadow transition hover:bg-stone-800 disabled:opacity-40" title="发送补充">
                  →
                </button>
              </div>
            </div>
          </section>

          <aside className={`min-h-0 overflow-hidden rounded-[22px] border ${structuredAccent.panel} shadow-[0_14px_36px_rgba(80,64,42,0.06)] transition-all ${teacherLibraryOpen ? 'opacity-100' : 'opacity-100'}`}>
            {teacherLibraryOpen ? (
              <div className="flex h-full min-h-0 flex-col">
                <div className="flex items-center justify-between border-b border-stone-200/80 p-3">
                  <div>
                    <p className="text-[13px] font-semibold text-stone-950">{isQingheXiezuo ? '材料与要求' : '材料库'}</p>
                    <p className="text-xs text-stone-500">{isQingheXiezuo ? '作文题、原文、教案和交付要求' : '按业务场景随时收起'}</p>
                  </div>
                  <button type="button" onClick={() => setTeacherLibraryOpen(false)} className={`rounded-full border ${structuredAccent.taskBorder} bg-white px-2.5 py-1 text-[11px] font-semibold text-stone-600`}>收起</button>
                </div>
                <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto p-3">
                  <button type="button" onClick={() => fileInputRef.current?.click()} className={`w-full rounded-2xl border border-dashed ${isQingheXiezuo ? 'border-[#b9d7ce]' : 'border-[#d8c5aa]'} bg-white px-3 py-3 text-left transition ${structuredAccent.hover}`}>
                    <span className="block text-[13px] font-semibold text-stone-950">添加材料</span>
                    <span className="mt-1 block text-xs leading-5 text-stone-500">{isSongyueShici ? '诗词原文、注释、讲稿、板书、课堂要求' : isYunqiaoJiaoxue ? '课文、单元导语、课后题、教案、活动设计' : '作文、教案、讲义、说课稿、素材包'}</span>
                  </button>
                  <div className={`rounded-2xl border ${structuredAccent.taskBorder} bg-white p-3`}>
                    <p className={`text-xs font-semibold ${structuredAccent.ink}`}>本次材料</p>
                    <p className="mt-2 text-xs leading-5 text-stone-600">{workbench.material ? '已填写材料内容，发送后将作为核心依据。' : '还没有粘贴材料，可直接上传文件或在下方输入。'}</p>
                  </div>
                  <label className={`block rounded-2xl border ${structuredAccent.taskBorder} bg-white p-3`}>
                    <span className="mb-2 block text-xs font-semibold text-stone-700">{structuredWorkflow.materialLabel}</span>
                    <textarea
                      value={workbench.material}
                      onChange={event => updateWorkbenchValue('material', event.target.value)}
                      placeholder={structuredWorkflow.materialPlaceholder}
                      rows={5}
                      className={`w-full resize-none rounded-xl border ${structuredAccent.taskBorder} ${structuredAccent.soft} px-3 py-2 text-xs leading-5 text-stone-800 outline-none placeholder:text-stone-400 ${structuredAccent.focus}`}
                    />
                  </label>
                  <label className={`block rounded-2xl border ${structuredAccent.taskBorder} bg-white p-3`}>
                    <span className="mb-2 block text-xs font-semibold text-stone-700">{structuredWorkflow.directionLabel}</span>
                    <input value={workbench.goal} onChange={event => updateWorkbenchValue('goal', event.target.value)} placeholder={structuredWorkflow.directionPlaceholder} className={`h-9 w-full rounded-xl border ${structuredAccent.taskBorder} ${structuredAccent.soft} px-3 text-xs text-stone-800 outline-none placeholder:text-stone-400 ${structuredAccent.focus}`} />
                  </label>
                  <label className={`block rounded-2xl border ${structuredAccent.taskBorder} bg-white p-3`}>
                    <span className="mb-2 block text-xs font-semibold text-stone-700">{structuredWorkflow.outputLabel}</span>
                    <input value={workbench.output} onChange={event => updateWorkbenchValue('output', event.target.value)} placeholder={structuredWorkflow.outputPlaceholder} className={`h-9 w-full rounded-xl border ${structuredAccent.taskBorder} ${structuredAccent.soft} px-3 text-xs text-stone-800 outline-none placeholder:text-stone-400 ${structuredAccent.focus}`} />
                  </label>
                  {pendingFiles.length > 0 && (
                    <div className={`rounded-2xl border ${structuredAccent.taskBorder} bg-white p-4`}>
                      <p className="mb-2 text-xs font-black text-stone-700">待发送附件</p>
                      <div className="grid gap-2">
                        {pendingFiles.map((file, index) => (
                          <div key={`${file.name}-${index}`} className={`flex items-center gap-2 rounded-xl ${structuredAccent.soft} px-3 py-2 text-xs text-stone-700`}>
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
              <button type="button" onClick={() => setTeacherLibraryOpen(true)} className={`flex h-full w-full items-center justify-center ${structuredAccent.soft} text-xs font-black text-stone-600 [writing-mode:vertical-rl]`}>
                {isQingheXiezuo ? '展开材料' : '展开材料库'}
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

      <div className={isQingheXiezuo ? 'flex-1 overflow-hidden px-4 py-5' : 'flex-1 overflow-y-auto px-4 py-5'}>
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
              <h2 className="text-base font-black text-stone-900">{isQingheXiezuo ? '公共资料区' : workbenchCopy.title}</h2>
              <p className="mt-1 text-xs leading-5 text-stone-500">{isQingheXiezuo ? '这里放每次都会影响青禾老师判断的背景。具体成品靠右侧工作流和下方问答补充。' : workbenchCopy.intro}</p>
              {isQingheXiezuo && (
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
                    <span>支持 Word、PDF、TXT、Markdown。可让青禾老师诊断不足并改稿。</span>
                  </button>
                </div>
              )}
              <div className="mt-4 space-y-3">
                {(isQingheXiezuo ? workbenchCopy.fields.filter(field => ['grade', 'region', 'textbook', 'studentLevel'].includes(field.key)) : workbenchCopy.fields).map(field => (
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
                {!isQingheXiezuo && (
                  <button onClick={() => sendText(workbenchCopy.prompt)} disabled={sending} className={`w-full rounded-2xl px-4 py-3 text-sm font-black text-white shadow-sm transition disabled:opacity-50 ${isMindfulness ? 'bg-indigo-700 hover:bg-indigo-600' : 'bg-emerald-900 hover:bg-emerald-800'}`}>
                    {workbenchCopy.button}
                  </button>
                )}
              </div>
            </div>
          </aside>

          <section className={isQingheXiezuo ? 'flex h-[calc(100vh-104px)] min-h-0 flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white/85 shadow-sm' : 'space-y-4'}>
            {isQingheXiezuo && (
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
            <div className={isQingheXiezuo ? 'min-h-0 flex-1 space-y-4 overflow-y-auto p-4' : 'space-y-4'}>
            {messagesLoading && <div className="py-12 text-center text-sm text-stone-400">加载中...</div>}
            {messagesError && <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">消息加载失败，请返回重试。</div>}
            {!messagesLoading && !messagesError && messages.length === 0 && !sending && (
              <div className="rounded-3xl border border-stone-200 bg-white/85 p-5 shadow-sm">
                <h3 className="text-lg font-black text-stone-900">{isQingheXiezuo ? '先说要交付什么，或上传资料让青禾老师诊改' : isMindfulness ? '可以先做一个很小的安顿' : '可以直接问，也可以先上传材料'}</h3>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  {(isQingheXiezuo ? QINGHE_WRITING_QUESTIONS : isSongyueShici ? SONGYUE_SHICI_QUESTIONS : isMindfulness ? MINDFULNESS_QUESTIONS : QUICK_QUESTIONS).map(question => (
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
            {isQingheXiezuo && (
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

      {!isQingheXiezuo && (
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
            <input ref={fileInputRef} type="file" multiple accept={isQingheXiezuo ? '.pdf,.txt,.md,.doc,.docx' : 'image/*,.pdf,.txt,.md,.doc,.docx'} onChange={event => chooseFiles(event.target.files)} className="hidden" />
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
