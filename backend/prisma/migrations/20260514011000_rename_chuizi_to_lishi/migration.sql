UPDATE "conversations"
SET "expert_id" = 'lishi-sir'
WHERE "expert_id" IN ('chuizi-sir', 'luoyonghao', 'luo-yonghao');

UPDATE "usage_logs"
SET "expert_id" = 'lishi-sir'
WHERE "expert_id" IN ('chuizi-sir', 'luoyonghao', 'luo-yonghao');
