export type KuangtuzhangSanTaskId =
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

export interface KuangtuzhangSanTaskDef {
  id: KuangtuzhangSanTaskId;
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

export const KUANGTUZHANGSAN_TASKS: KuangtuzhangSanTaskDef[] = [
  {
    id: 'general-civil',
    label: '民事纠纷',
    headline: '借款、赔偿、邻里、一般侵权',
    description: '先梳理事实、请求基础、证据材料和解决路径。',
    materialLabel: '事实与证据',
    materialPlaceholder: '写清双方身份、发生时间、地点、金额或损失、已有证据、现在争议点。',
    actionLabel: '当前诉求',
    actionPlaceholder: '例如：要求还款、要求赔偿、准备协商、准备起诉、已经收到对方威胁。',
    resultHint: '事实摘要 + 证据清单 + 风险边界 + 下一步路径',
    quickQuestions: [
      '请判断这件事属于什么类型的民事争议。',
      '请整理我现在可以主张什么、还缺什么证据。',
      '请给一份可以交给律师或法院窗口看的事实摘要。',
    ],
    outputOptions: [
      '标准版：事实摘要 + 证据清单 + 风险边界 + 下一步路径',
      '材料版：可交给律师或调解窗口的摘要',
      '沟通版：标准版 + 协商话术',
    ],
    outputStructure: ['初步判断', '事实摘要', '证据清单', '风险边界', '下一步路径', '专业确认清单'],
  },
  {
    id: 'contract-review',
    label: '合同纠纷',
    headline: '合同、合作、付款、交付',
    description: '处理合同履行、违约、退款、催告、解除合作等问题。',
    materialLabel: '合同、付款、交付和催告记录',
    materialPlaceholder: '粘贴合同关键条款、报价单、聊天确认、付款凭证、交付记录、验收记录、催告记录或对方回复。',
    actionLabel: '当前诉求',
    actionPlaceholder: '例如：催款、终止合作、要求退款、要求继续履行、准备起诉。',
    resultHint: '合同要点 + 履行证据 + 违约风险 + 催告材料',
    quickQuestions: [
      '请判断合同或合作里最关键的风险点。',
      '对方违约了，我现在需要准备哪些材料？',
      '我想终止合作，怎么做风险相对可控？',
    ],
    outputOptions: [
      '标准版：合同要点 + 履行证据 + 风险边界 + 下一步',
      '催告版：标准版 + 催告/协商材料',
      '诉讼准备版：标准版 + 起诉前材料清单',
    ],
    outputStructure: ['初步判断', '合同要点', '履行证据', '风险边界', '催告或协商材料', '专业确认清单'],
  },
  {
    id: 'labor-dispute',
    label: '劳动纠纷',
    headline: '辞退、降薪、调岗、离职、仲裁',
    description: '处理劳动关系、薪酬社保、解除、调岗、竞业限制和仲裁准备。',
    materialLabel: '劳动关系、通知和证据',
    materialPlaceholder: '写清入职时间、岗位、工资、合同、社保、考勤、公司通知、聊天记录、绩效材料、离职或辞退经过。',
    actionLabel: '当前进展',
    actionPlaceholder: '例如：公司要辞退、被降薪调岗、准备离职、想仲裁、想先和 HR 沟通。',
    resultHint: '劳动事实 + 证据清单 + 沟通材料 + 仲裁准备',
    quickQuestions: [
      '公司要辞退我，我现在该准备哪些材料？',
      '我被降薪调岗了，应该先确认哪些事实？',
      '请帮我整理一份劳动仲裁前的材料清单。',
    ],
    outputOptions: [
      '标准版：劳动事实 + 证据清单 + 风险边界 + 下一步',
      '沟通版：标准版 + 对 HR/公司的沟通材料',
      '仲裁版：标准版 + 仲裁准备清单',
    ],
    outputStructure: ['初步判断', '劳动关系事实', '证据清单', '风险边界', '沟通材料', '仲裁或投诉准备清单'],
  },
  {
    id: 'criminal-risk',
    label: '刑事风险',
    headline: '报案、传唤、取保、谅解、涉案财物',
    description: '先判断是否存在刑事风险、当前程序节点和必须尽快确认的事项。',
    materialLabel: '事件经过和程序材料',
    materialPlaceholder: '写清是否已报案、是否收到传唤或通知、涉案金额、是否有人受伤、是否有书面材料。',
    actionLabel: '当前进展',
    actionPlaceholder: '例如：准备报案、已经被传唤、收到威胁、家属被带走、准备退赔或和解。',
    resultHint: '程序节点 + 风险事项 + 紧急材料清单 + 专业确认问题',
    quickQuestions: [
      '请判断这件事是否可能涉及刑事风险。',
      '请整理现在最需要确认的程序信息。',
      '请列出和律师沟通前要准备的材料。',
    ],
    outputOptions: [
      '标准版：程序节点 + 风险事项 + 材料清单 + 专业确认问题',
      '紧急版：现在先做和不要做的事项',
      '家属版：给家属沟通和材料准备清单',
    ],
    outputStructure: ['初步判断', '程序节点', '关键风险', '材料清单', '当前注意事项', '必须专业确认的问题'],
  },
  {
    id: 'property-dispute',
    label: '房产财产',
    headline: '房屋买卖、租赁、共有、保全',
    description: '整理房产、租赁、财产分割、查封保全和权属材料。',
    materialLabel: '财产和权属材料',
    materialPlaceholder: '写清财产类型、登记情况、合同、付款、占有使用、是否被查封或准备保全。',
    actionLabel: '当前诉求',
    actionPlaceholder: '例如：要求过户、解除合同、退租、分割共有财产、申请保全。',
    resultHint: '权属事实 + 证据清单 + 保全/诉讼路径 + 风险边界',
    quickQuestions: [
      '请判断这件财产争议先看哪些关键事实。',
      '请列出起诉或保全前要准备的材料。',
      '请整理一份房产/财产争议摘要。',
    ],
    outputOptions: [
      '标准版：权属事实 + 证据清单 + 行动路径',
      '保全版：保全前材料和风险提示',
      '协商版：标准版 + 协商材料',
    ],
    outputStructure: ['初步判断', '权属事实', '证据清单', '风险边界', '保全或诉讼路径', '专业确认清单'],
  },
  {
    id: 'marriage-family',
    label: '婚姻家事',
    headline: '离婚、抚养、共同财产、债务',
    description: '整理婚姻家事中的身份关系、子女、财产、债务和程序进展。',
    materialLabel: '身份、子女、财产和债务信息',
    materialPlaceholder: '写清结婚时间、子女情况、主要财产、债务、分居或冲突情况、是否已经起诉。',
    actionLabel: '当前诉求',
    actionPlaceholder: '例如：准备离婚、争取抚养权、分割财产、应对对方起诉或威胁。',
    resultHint: '家事事实表 + 证据材料 + 程序路径 + 风险边界',
    quickQuestions: [
      '请整理这件婚姻家事争议的关键事实。',
      '请列出抚养、财产、债务分别需要哪些证据。',
      '请给一份咨询律师前的材料清单。',
    ],
    outputOptions: [
      '标准版：事实表 + 证据材料 + 程序路径',
      '抚养版：子女抚养重点材料',
      '财产版：共同财产和债务清单',
    ],
    outputStructure: ['初步判断', '家事事实表', '证据清单', '争议焦点', '程序路径', '专业确认清单'],
  },
  {
    id: 'inheritance',
    label: '继承纠纷',
    headline: '遗嘱、法定继承、房产、存款',
    description: '整理亲属关系、遗产范围、遗嘱材料和继承程序。',
    materialLabel: '亲属关系、遗产和遗嘱材料',
    materialPlaceholder: '写清被继承人、亲属关系、遗产类型、是否有遗嘱、是否已经办理公证或诉讼。',
    actionLabel: '当前诉求',
    actionPlaceholder: '例如：确认继承份额、办理过户、质疑遗嘱、准备起诉。',
    resultHint: '亲属关系表 + 遗产清单 + 证据材料 + 程序路径',
    quickQuestions: [
      '请先整理继承关系和可能的继承人。',
      '请列出办理继承或起诉需要哪些材料。',
      '请判断遗嘱或继承争议的重点在哪里。',
    ],
    outputOptions: [
      '标准版：关系表 + 遗产清单 + 材料清单',
      '诉讼版：争议焦点和起诉材料',
      '办理版：公证/过户材料准备',
    ],
    outputStructure: ['初步判断', '亲属关系表', '遗产清单', '证据材料', '程序路径', '专业确认清单'],
  },
  {
    id: 'traffic-accident',
    label: '交通事故',
    headline: '责任认定、赔偿、保险、伤残',
    description: '整理事故责任、损失项目、保险材料和赔偿协商。',
    materialLabel: '事故、责任和损失材料',
    materialPlaceholder: '写清事故时间地点、责任认定、伤情、车辆损失、医疗票据、保险沟通记录。',
    actionLabel: '当前进展',
    actionPlaceholder: '例如：等待责任认定、保险拒赔、准备调解、准备起诉、涉及伤残鉴定。',
    resultHint: '责任与损失摘要 + 证据材料 + 赔偿路径',
    quickQuestions: [
      '请整理交通事故赔偿需要哪些材料。',
      '请判断保险沟通中要注意什么。',
      '请给一份调解或起诉前的事实摘要。',
    ],
    outputOptions: [
      '标准版：责任与损失摘要 + 证据材料 + 路径',
      '保险版：理赔材料和沟通重点',
      '伤残版：鉴定前材料和注意事项',
    ],
    outputStructure: ['初步判断', '事故事实', '损失项目', '证据清单', '赔偿路径', '专业确认清单'],
  },
  {
    id: 'consumer-dispute',
    label: '消费纠纷',
    headline: '退款、假货、服务、平台申诉',
    description: '整理消费交易、客服承诺、平台工单和投诉申诉材料。',
    materialLabel: '订单、客服和平台记录',
    materialPlaceholder: '粘贴订单号、商品或服务描述、付款记录、物流、客服承诺、平台工单、商家回复、截图或录屏要点。',
    actionLabel: '想解决什么',
    actionPlaceholder: '例如：退款、退货、赔付、解封、补发、投诉平台或监管渠道。',
    resultHint: '证据清单 + 渠道优先级 + 投诉材料 + 时间提醒',
    quickQuestions: [
      '商家不退款，我需要先整理哪些材料？',
      '我买到假货了，怎么准备投诉材料？',
      '平台封号了，我的申诉材料怎么组织？',
    ],
    outputOptions: [
      '标准版：证据清单 + 渠道优先级 + 材料草稿',
      '快速版：最快解决路径',
      '申诉版：平台投诉或申诉材料',
    ],
    outputStructure: ['初步判断', '订单事实表', '证据清单', '渠道优先级', '投诉或申诉材料', '时间节点提醒'],
  },
  {
    id: 'online-speech',
    label: '名誉与发言',
    headline: '公开表达、名誉、隐私、取证',
    description: '处理发布前审查、名誉侵权、隐私风险和平台取证。',
    materialLabel: '文字内容和事实依据',
    materialPlaceholder: '粘贴准备发布或已经发布的文字、对方内容、事实依据、截图、平台和传播范围。',
    actionLabel: '表达目的或应对事项',
    actionPlaceholder: '例如：准备公开说明、平台投诉、回应对方、要求删除、准备取证。',
    resultHint: '表达风险 + 证据材料 + 修改建议 + 处理路径',
    quickQuestions: [
      '请判断这段内容发布前需要修改哪些地方。',
      '请整理我被网暴或被侵权时该保留哪些证据。',
      '请给一版更克制、可核实的表达稿。',
    ],
    outputOptions: [
      '标准版：表达风险 + 证据材料 + 修改建议 + 处理路径',
      '发布版：逐句修改建议 + 可发布稿',
      '维权版：取证清单 + 平台/诉讼路径',
    ],
    outputStructure: ['初步判断', '事实与评价区分', '隐私和名誉风险', '证据材料', '表达修改建议', '处理路径'],
  },
];

export const DEFAULT_KUANGTUZHANGSAN_TASK: KuangtuzhangSanTaskId = 'general-civil';

export function getKuangtuzhangSanTask(id: KuangtuzhangSanTaskId): KuangtuzhangSanTaskDef {
  return KUANGTUZHANGSAN_TASKS.find(t => t.id === id) ?? KUANGTUZHANGSAN_TASKS[0];
}
