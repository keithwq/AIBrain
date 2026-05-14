export type MinghengFawuTaskId =
  | 'general-civil'
  | 'contract-review'
  | 'labor-dispute'
  | 'criminal-risk'
  | 'property-dispute'
  | 'marriage-family'
  | 'inheritance'
  | 'traffic-accident'
  | 'consumer-dispute'
  | 'online-speech';

export interface MinghengFawuTaskDef {
  id: MinghengFawuTaskId;
  label: string;
  headline: string;
  description: string;
  materialLabel: string;
  materialPlaceholder: string;
  actionLabel: string;
  actionPlaceholder: string;
  resultHint: string;
  quickQuestions: string[];
  outputOptions: string[];
  outputStructure: string[];
}

const commonOutput = ['初步判断', '事实梳理', '证据清单', '风险边界', '下一步路径', '专业确认清单'];

export const MINGHENG_FAWU_TASKS: MinghengFawuTaskDef[] = [
  {
    id: 'general-civil',
    label: '民事纠纷',
    headline: '借款、赔偿、邻里、一般侵权',
    description: '先梳理事实、请求基础、证据材料和解决路径。',
    materialLabel: '事实与证据',
    materialPlaceholder: '写清双方身份、发生时间地点、金额或损失、已有证据、现在争议点。',
    actionLabel: '当前诉求',
    actionPlaceholder: '例如要求还款、要求赔偿、准备协商、准备起诉、已收到威胁。',
    resultHint: '事实摘要 + 证据清单 + 风险边界 + 下一步路径',
    quickQuestions: ['这件事属于什么民事争议？', '我还能主张什么、缺什么证据？', '帮我整理给律师看的事实摘要。'],
    outputOptions: ['标准版', '材料版', '沟通版'],
    outputStructure: commonOutput,
  },
  {
    id: 'contract-review',
    label: '合同纠纷',
    headline: '合同、合作、付款、交付',
    description: '处理履行、违约、退款、催告和终止合作。',
    materialLabel: '合同与履行材料',
    materialPlaceholder: '粘贴关键条款、付款凭证、交付记录、验收记录、聊天确认和对方回复。',
    actionLabel: '当前诉求',
    actionPlaceholder: '例如催款、终止合作、要求退款、要求继续履行、准备起诉。',
    resultHint: '合同要点 + 履行证据 + 违约风险 + 催告材料',
    quickQuestions: ['合同里最关键的风险点是什么？', '对方违约了我需要准备哪些材料？', '终止合作怎么做更稳？'],
    outputOptions: ['标准版', '催告版', '诉讼准备版'],
    outputStructure: commonOutput,
  },
  {
    id: 'labor-dispute',
    label: '劳动纠纷',
    headline: '辞退、降薪、调岗、离职、仲裁',
    description: '整理劳动关系、薪酬社保、解除、调岗和仲裁准备。',
    materialLabel: '劳动关系与通知证据',
    materialPlaceholder: '写清入职时间、岗位工资、合同社保、考勤、公司通知、聊天记录、绩效材料。',
    actionLabel: '当前进展',
    actionPlaceholder: '例如公司要辞退、被降薪调岗、准备离职、想仲裁、想先和 HR 沟通。',
    resultHint: '劳动事实 + 证据清单 + 沟通材料 + 仲裁准备',
    quickQuestions: ['公司要辞退我，现在准备什么？', '被降薪调岗先确认哪些事实？', '帮我列劳动仲裁材料清单。'],
    outputOptions: ['标准版', '沟通版', '仲裁版'],
    outputStructure: commonOutput,
  },
  {
    id: 'criminal-risk',
    label: '刑事风险',
    headline: '报案、传唤、取保、谅解、涉案财物',
    description: '先判断程序节点、紧急风险和必须尽快确认的事项。',
    materialLabel: '事件经过和程序材料',
    materialPlaceholder: '写清是否已报案、是否收到传唤或通知、涉案金额、是否有人受伤、是否有书面材料。',
    actionLabel: '当前进展',
    actionPlaceholder: '例如准备报案、已被传唤、家属被带走、准备退赔或和解。',
    resultHint: '程序节点 + 风险事项 + 紧急材料清单 + 专业确认问题',
    quickQuestions: ['这件事可能涉及刑事风险吗？', '现在最需要确认哪些程序信息？', '和律师沟通前要准备什么？'],
    outputOptions: ['标准版', '紧急版', '家属版'],
    outputStructure: commonOutput,
  },
  {
    id: 'property-dispute',
    label: '房产财产',
    headline: '买卖、租赁、共有、保全',
    description: '整理房产、租赁、财产分割、查封保全和权属材料。',
    materialLabel: '财产和权属材料',
    materialPlaceholder: '写清财产类型、登记情况、合同付款、占有使用、是否被查封或准备保全。',
    actionLabel: '当前诉求',
    actionPlaceholder: '例如过户、解除合同、退租、分割共有财产、申请保全。',
    resultHint: '权属事实 + 证据清单 + 保全/诉讼路径 + 风险边界',
    quickQuestions: ['财产争议先看哪些关键事实？', '起诉或保全前准备什么？', '帮我整理房产争议摘要。'],
    outputOptions: ['标准版', '保全版', '协商版'],
    outputStructure: commonOutput,
  },
  {
    id: 'marriage-family',
    label: '婚姻家事',
    headline: '离婚、抚养、共同财产、债务',
    description: '整理身份关系、子女、财产、债务和程序进展。',
    materialLabel: '身份、子女、财产和债务信息',
    materialPlaceholder: '写清结婚时间、子女情况、主要财产、债务、分居或冲突情况、是否已起诉。',
    actionLabel: '当前诉求',
    actionPlaceholder: '例如准备离婚、争取抚养权、分割财产、应对对方起诉或威胁。',
    resultHint: '家事事实表 + 证据材料 + 程序路径 + 风险边界',
    quickQuestions: ['帮我整理婚姻家事争议事实。', '抚养和财产分别需要什么证据？', '咨询律师前材料清单是什么？'],
    outputOptions: ['标准版', '抚养版', '财产版'],
    outputStructure: commonOutput,
  },
  {
    id: 'inheritance',
    label: '继承纠纷',
    headline: '遗嘱、法定继承、房产、存款',
    description: '整理亲属关系、遗产范围、遗嘱材料和继承程序。',
    materialLabel: '亲属关系、遗产和遗嘱材料',
    materialPlaceholder: '写清被继承人、亲属关系、遗产类型、是否有遗嘱、是否已公证或诉讼。',
    actionLabel: '当前诉求',
    actionPlaceholder: '例如确认继承份额、办理过户、质疑遗嘱、准备起诉。',
    resultHint: '亲属关系表 + 遗产清单 + 证据材料 + 程序路径',
    quickQuestions: ['先整理继承关系和继承人。', '继承或起诉需要哪些材料？', '遗嘱争议重点在哪里？'],
    outputOptions: ['标准版', '诉讼版', '办理版'],
    outputStructure: commonOutput,
  },
  {
    id: 'traffic-accident',
    label: '交通事故',
    headline: '责任认定、赔偿、保险、伤残',
    description: '整理事故责任、损失项目、保险材料和赔偿协商。',
    materialLabel: '事故、责任和损失材料',
    materialPlaceholder: '写清事故时间地点、责任认定、伤情、车辆损失、医疗票据、保险沟通记录。',
    actionLabel: '当前进展',
    actionPlaceholder: '例如等待责任认定、保险拒赔、准备调解、准备起诉、涉及伤残鉴定。',
    resultHint: '责任与损失摘要 + 证据材料 + 赔偿路径',
    quickQuestions: ['交通事故赔偿要准备什么？', '保险沟通注意什么？', '帮我写调解或起诉前事实摘要。'],
    outputOptions: ['标准版', '保险版', '伤残版'],
    outputStructure: commonOutput,
  },
  {
    id: 'consumer-dispute',
    label: '消费纠纷',
    headline: '退款、假货、服务、平台申诉',
    description: '整理交易记录、客服承诺、平台工单和投诉申诉材料。',
    materialLabel: '订单、客服和平台记录',
    materialPlaceholder: '粘贴订单号、商品或服务描述、付款记录、物流、客服承诺、平台工单和商家回复。',
    actionLabel: '想解决什么',
    actionPlaceholder: '例如退款、退货、赔付、解封、补发、投诉平台或监管渠道。',
    resultHint: '证据清单 + 渠道优先级 + 投诉材料 + 时间提醒',
    quickQuestions: ['商家不退款先整理什么？', '买到假货怎么准备投诉？', '平台封号申诉材料怎么组织？'],
    outputOptions: ['标准版', '快速版', '申诉版'],
    outputStructure: commonOutput,
  },
  {
    id: 'online-speech',
    label: '名誉与发言',
    headline: '公开表达、名誉、隐私、取证',
    description: '处理发布前审查、名誉侵权、隐私风险和平台取证。',
    materialLabel: '文字内容和事实依据',
    materialPlaceholder: '粘贴准备发布或已经发布的文字、对方内容、事实依据、截图、平台和传播范围。',
    actionLabel: '表达目的或应对事项',
    actionPlaceholder: '例如准备公开说明、平台投诉、回应对方、要求删除、准备取证。',
    resultHint: '表达风险 + 证据材料 + 修改建议 + 处理路径',
    quickQuestions: ['这段内容发布前要改哪里？', '被网暴或侵权保留什么证据？', '帮我改成克制、可核实的表达。'],
    outputOptions: ['标准版', '发布版', '维权版'],
    outputStructure: commonOutput,
  },
];

export const DEFAULT_MINGHENG_FAWU_TASK: MinghengFawuTaskId = 'general-civil';

export function getMinghengFawuTask(id: MinghengFawuTaskId): MinghengFawuTaskDef {
  return MINGHENG_FAWU_TASKS.find(t => t.id === id) ?? MINGHENG_FAWU_TASKS[0];
}
