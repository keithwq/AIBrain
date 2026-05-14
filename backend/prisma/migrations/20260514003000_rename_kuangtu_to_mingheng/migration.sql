UPDATE conversations
SET expert_id = 'mingheng-fawu'
WHERE expert_id IN ('kuangtu-zhangsan', 'kuangtuzhangsan', 'luoxiang');

UPDATE usage_logs
SET expert_id = 'mingheng-fawu'
WHERE expert_id IN ('kuangtu-zhangsan', 'kuangtuzhangsan', 'luoxiang');
