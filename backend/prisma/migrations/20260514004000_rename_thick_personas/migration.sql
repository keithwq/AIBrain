UPDATE conversations
SET expert_id = 'muhe-laoshi'
WHERE expert_id IN ('meigui-nvshi', 'li-meijin');

UPDATE usage_logs
SET expert_id = 'muhe-laoshi'
WHERE expert_id IN ('meigui-nvshi', 'li-meijin');

UPDATE conversations
SET expert_id = 'anran-laoshi'
WHERE expert_id IN ('yixiu-xiaoheshang', 'thich-nhat-hanh', 'yixingchanshi');

UPDATE usage_logs
SET expert_id = 'anran-laoshi'
WHERE expert_id IN ('yixiu-xiaoheshang', 'thich-nhat-hanh', 'yixingchanshi');

UPDATE conversations
SET expert_id = 'songbai-xiansheng'
WHERE expert_id IN ('jinlun-fawang', 'jinlunfawang');

UPDATE usage_logs
SET expert_id = 'songbai-xiansheng'
WHERE expert_id IN ('jinlun-fawang', 'jinlunfawang');
