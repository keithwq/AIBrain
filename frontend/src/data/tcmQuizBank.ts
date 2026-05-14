export interface QuizQuestion {
  id: string;
  stem: string;
  options: string[];
  answer: number;
  explanation: string;
  difficulty: 'beginner' | 'intermediate' | 'challenge';
  category: string;
}

export const TCM_QUIZ_BANK: QuizQuestion[] = [
  // === 入门 ===
  { id: 'b1', stem: '中医"五脏"不包括以下哪个？', options: ['心', '肝', '胃', '肾'], answer: 2, explanation: '五脏是心、肝、脾、肺、肾。胃属于六腑。', difficulty: 'beginner', category: '基础理论' },
  { id: 'b2', stem: '"气为血之帅"的含义是？', options: ['气能生血', '气能行血', '气能摄血', '以上都是'], answer: 3, explanation: '气为血之帅包含气能生血、气能行血、气能摄血三层含义。', difficulty: 'beginner', category: '基础理论' },
  { id: 'b3', stem: '五行中"木"对应的脏腑是？', options: ['心与小肠', '肝与胆', '脾与胃', '肺与大肠'], answer: 1, explanation: '五行配五脏：木-肝、火-心、土-脾、金-肺、水-肾。', difficulty: 'beginner', category: '基础理论' },
  { id: 'b4', stem: '以下哪种体质的人最怕冷？', options: ['阴虚质', '阳虚质', '痰湿质', '气郁质'], answer: 1, explanation: '阳虚质的核心特征是畏寒怕冷，阳气不足以温煦身体。', difficulty: 'beginner', category: '体质' },
  { id: 'b5', stem: '"药食同源"的山药主要归哪些经？', options: ['心、肝经', '脾、肺、肾经', '肝、肾经', '心、脾经'], answer: 1, explanation: '山药性平味甘，归脾、肺、肾经，有补脾养胃、生津益肺、补肾涩精的功效。', difficulty: 'beginner', category: '中药' },
  { id: 'b6', stem: '正常舌象的描述是？', options: ['舌红苔黄', '舌淡红苔薄白', '舌紫苔厚腻', '舌淡苔白厚'], answer: 1, explanation: '正常舌象为淡红舌、薄白苔，说明气血调和、胃气充足。', difficulty: 'beginner', category: '诊断' },
  { id: 'b7', stem: '春季养生重点养护哪个脏？', options: ['心', '肝', '脾', '肺'], answer: 1, explanation: '春应肝，春天阳气升发，肝主疏泄，春季养生重在疏肝养阳。', difficulty: 'beginner', category: '养生' },
  { id: 'b8', stem: '"辛味"药物的主要作用是？', options: ['收敛固涩', '发散行气', '补益和中', '泄降燥湿'], answer: 1, explanation: '辛味能散能行，有发散、行气、活血的作用。', difficulty: 'beginner', category: '中药' },
  { id: 'b9', stem: '以下哪个不是六腑？', options: ['胃', '胆', '脾', '膀胱'], answer: 2, explanation: '六腑是胆、胃、小肠、大肠、膀胱、三焦。脾属于五脏。', difficulty: 'beginner', category: '基础理论' },
  { id: 'b10', stem: '枸杞子的主要功效是？', options: ['清热解毒', '滋补肝肾、明目', '活血化瘀', '理气止痛'], answer: 1, explanation: '枸杞子味甘性平，归肝肾经，主要功效是滋补肝肾、益精明目。', difficulty: 'beginner', category: '中药' },
  { id: 'b11', stem: '中医"治未病"的含义是？', options: ['不治疗疾病', '预防为主', '只治小病', '自然痊愈'], answer: 1, explanation: '"治未病"是中医预防医学思想的核心，包括未病先防和既病防变。', difficulty: 'beginner', category: '基础理论' },
  { id: 'b12', stem: '以下哪种食物性质偏寒凉？', options: ['生姜', '羊肉', '绿豆', '桂圆'], answer: 2, explanation: '绿豆性凉味甘，有清热解毒的功效。生姜、羊肉、桂圆都偏温热。', difficulty: 'beginner', category: '养生' },

  // === 进阶 ===
  { id: 'i1', stem: '桂枝汤的组成是？', options: ['桂枝、芍药、生姜、大枣、甘草', '桂枝、麻黄、杏仁、甘草', '桂枝、白术、茯苓、甘草', '桂枝、附子、生姜、大枣'], answer: 0, explanation: '桂枝汤由桂枝、芍药、生姜、大枣、炙甘草五味药组成，是调和营卫的代表方。', difficulty: 'intermediate', category: '方剂' },
  { id: 'i2', stem: '"肝主疏泄"的功能不包括？', options: ['调畅气机', '促进消化', '调节情志', '主持呼吸'], answer: 3, explanation: '主持呼吸是肺的功能。肝主疏泄包括调畅气机、促进消化吸收、调节情志、调节生殖。', difficulty: 'intermediate', category: '基础理论' },
  { id: 'i3', stem: '六味地黄丸的君药是？', options: ['山药', '熟地黄', '山茱萸', '泽泻'], answer: 1, explanation: '六味地黄丸以熟地黄为君，滋阴补肾填精。三补（熟地、山萸、山药）三泻（泽泻、丹皮、茯苓）。', difficulty: 'intermediate', category: '方剂' },
  { id: 'i4', stem: '脉象"弦"主要见于？', options: ['表证', '里寒证', '肝胆病、痛证', '血虚证'], answer: 2, explanation: '弦脉如按琴弦，端直以长，主肝胆病、痛证、痰饮。肝主筋，气机不利则脉弦。', difficulty: 'intermediate', category: '诊断' },
  { id: 'i5', stem: '"阴在内，阳之守也；阳在外，阴之使也"体现的是？', options: ['阴阳对立', '阴阳互根', '阴阳消长', '阴阳转化'], answer: 1, explanation: '这句话出自《素问》，说明阴阳相互依存、互为根本的关系。阴守于内为阳的基础，阳护于外为阴的作用体现。', difficulty: 'intermediate', category: '基础理论' },
  { id: 'i6', stem: '黄芪与人参的主要区别是？', options: ['黄芪补气兼升阳固表，人参大补元气兼生津', '黄芪补血，人参补气', '黄芪性寒，人参性温', '没有区别'], answer: 0, explanation: '黄芪长于补气升阳、固表止汗、利水消肿；人参长于大补元气、复脉固脱、生津安神。', difficulty: 'intermediate', category: '中药' },
  { id: 'i7', stem: '小柴胡汤的主治证型是？', options: ['太阳表证', '少阳证（寒热往来）', '阳明里实证', '太阴虚寒证'], answer: 1, explanation: '小柴胡汤是和解少阳的代表方，主治少阳证：寒热往来、胸胁苦满、默默不欲饮食、心烦喜呕。', difficulty: 'intermediate', category: '方剂' },
  { id: 'i8', stem: '以下哪组是"相畏"关系？', options: ['人参畏五灵脂', '甘草反甘遂', '半夏畏生姜', '乌头反半夏'], answer: 2, explanation: '相畏是一种药物的毒副作用能被另一种药物抑制。半夏有毒，生姜能制其毒，故半夏畏生姜。', difficulty: 'intermediate', category: '中药' },
  { id: 'i9', stem: '气虚证和阳虚证的鉴别要点是？', options: ['有无乏力', '有无畏寒肢冷', '有无气短', '有无自汗'], answer: 1, explanation: '气虚和阳虚都有乏力、气短、自汗，但阳虚在气虚基础上还有畏寒肢冷等虚寒表现。阳虚是气虚的进一步发展。', difficulty: 'intermediate', category: '诊断' },
  { id: 'i10', stem: '"血府逐瘀汤"出自哪部著作？', options: ['《伤寒论》', '《金匮要略》', '《医林改错》', '《温病条辨》'], answer: 2, explanation: '血府逐瘀汤出自清代王清任《医林改错》，是活血化瘀的代表方。', difficulty: 'intermediate', category: '方剂' },
  { id: 'i11', stem: '当归的功效是？', options: ['补血活血、调经止痛、润肠通便', '补血止血、滋阴润燥', '养血敛阴、柔肝止痛', '补血益精、明目'], answer: 0, explanation: '当归味甘辛温，归肝心脾经，功效为补血活血、调经止痛、润肠通便，为"血中之圣药"。', difficulty: 'intermediate', category: '中药' },
  { id: 'i12', stem: '五行相克中，"木克土"在病理上表现为？', options: ['肝火犯肺', '肝气犯胃/肝脾不和', '心火亢盛', '肾水凌心'], answer: 1, explanation: '木克土即肝克脾胃。肝气太旺会横逆犯胃（肝胃不和）或克脾（肝脾不和），出现胁痛、腹胀、泄泻等。', difficulty: 'intermediate', category: '基础理论' },

  // === 挑战 ===
  { id: 'c1', stem: '真武汤的组成药物是？', options: ['附子、白术、茯苓、芍药、生姜', '附子、干姜、甘草、人参', '附子、桂枝、白术、茯苓、甘草', '附子、肉桂、熟地、山药'], answer: 0, explanation: '真武汤由附子、白术、茯苓、芍药、生姜组成，温阳利水，主治脾肾阳虚水泛证。', difficulty: 'challenge', category: '方剂' },
  { id: 'c2', stem: '温病学"卫气营血"辨证中，"营分证"的主要表现是？', options: ['发热恶寒、头痛', '壮热不恶寒、汗出口渴', '身热夜甚、心烦不寐、舌红绛', '斑疹显露、出血、神昏'], answer: 2, explanation: '营分证热邪深入营阴，表现为身热夜甚、心烦不寐、时有谵语、斑疹隐隐、舌红绛。', difficulty: 'challenge', category: '诊断' },
  { id: 'c3', stem: '以下哪个方剂体现了"培土生金"法？', options: ['六味地黄丸', '参苓白术散', '龙胆泻肝汤', '血府逐瘀汤'], answer: 1, explanation: '参苓白术散健脾益气（培土），使脾气健运则肺气自充（生金），体现了培土生金的治法。', difficulty: 'challenge', category: '方剂' },
  { id: 'c4', stem: '"大气下陷"的代表方是？', options: ['补中益气汤', '升陷汤', '举元煎', '独参汤'], answer: 1, explanation: '升陷汤出自张锡纯《医学衷中参西录》，主治大气下陷证，以黄芪为君大补肺气。', difficulty: 'challenge', category: '方剂' },
  { id: 'c5', stem: '乌梅丸主治的病证是？', options: ['蛔厥证和久泻久痢', '胃寒呕吐', '寒热错杂之痞证', '阳虚外感'], answer: 0, explanation: '乌梅丸是治疗蛔厥证的代表方，也用于寒热错杂之久泻久痢。方中寒热并用、酸苦辛甘并投。', difficulty: 'challenge', category: '方剂' },
  { id: 'c6', stem: '"十八反"中与甘草相反的药物不包括？', options: ['甘遂', '大戟', '海藻', '附子'], answer: 3, explanation: '甘草反甘遂、大戟、海藻、芫花。附子是与半夏、瓜蒌、贝母、白蔹、白及相反（乌头反）。', difficulty: 'challenge', category: '中药' },
  { id: 'c7', stem: '叶天士"络病学说"的核心观点是？', options: ['久病入络，络脉瘀阻', '六经传变', '三焦辨证', '卫气营血'], answer: 0, explanation: '叶天士提出"久病入络"理论，认为慢性病日久必然累及络脉，导致络脉瘀阻，需用辛润通络之法。', difficulty: 'challenge', category: '基础理论' },
  { id: 'c8', stem: '以下哪种情况属于"反治法"？', options: ['寒者热之', '热者寒之', '热因热用', '虚则补之'], answer: 2, explanation: '反治法包括热因热用、寒因寒用、塞因塞用、通因通用。"热因热用"是用热性药治疗假热证（真寒假热）。', difficulty: 'challenge', category: '基础理论' },
  { id: 'c9', stem: '张仲景"但见一证便是"指的是哪个方？', options: ['桂枝汤', '小柴胡汤', '白虎汤', '麻黄汤'], answer: 1, explanation: '《伤寒论》说小柴胡汤"但见一证便是，不必悉具"，意思是少阳证只要见到一个主症就可以用小柴胡汤。', difficulty: 'challenge', category: '方剂' },
  { id: 'c10', stem: '附子的炮制目的主要是？', options: ['增强疗效', '改变归经', '降低毒性', '便于储存'], answer: 2, explanation: '生附子有大毒，炮制（制附子、炮附子）的主要目的是降低乌头碱的毒性，使其可以安全入药。', difficulty: 'challenge', category: '中药' },
  { id: 'c11', stem: '"阳明腑实证"的典型脉象是？', options: ['浮紧', '沉迟', '沉实有力', '弦细'], answer: 2, explanation: '阳明腑实证为里热实证，热结肠腑，故脉沉实有力（沉主里，实主实证）。', difficulty: 'challenge', category: '诊断' },
  { id: 'c12', stem: '以下哪位医家被称为"补土派"代表？', options: ['刘完素', '张从正', '李东垣', '朱丹溪'], answer: 2, explanation: '金元四大家中，李东垣（李杲）重视脾胃，创立"脾胃论"，被称为补土派。刘完素为寒凉派，张从正为攻邪派，朱丹溪为滋阴派。', difficulty: 'challenge', category: '基础理论' },
];

export function getQuizByDifficulty(difficulty: 'beginner' | 'intermediate' | 'challenge', count: number): QuizQuestion[] {
  const pool = TCM_QUIZ_BANK.filter(q => q.difficulty === difficulty);
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}
