UPDATE "conversations"
SET "expert_id" = 'zhiyuan-laoshi'
WHERE "expert_id" IN ('bingshan-laoshi', 'zhangxuefeng', 'zhang-xuefeng');

UPDATE "usage_logs"
SET "expert_id" = 'zhiyuan-laoshi'
WHERE "expert_id" IN ('bingshan-laoshi', 'zhangxuefeng', 'zhang-xuefeng');

UPDATE "conversations"
SET "expert_id" = 'mingfeng-guwen'
WHERE "expert_id" IN ('ye-jiangjun', 'yemaozhong', 'ye-maozhong');

UPDATE "usage_logs"
SET "expert_id" = 'mingfeng-guwen'
WHERE "expert_id" IN ('ye-jiangjun', 'yemaozhong', 'ye-maozhong');
