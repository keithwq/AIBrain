# 邮箱验证码登录接入说明

## 当前状态

项目已经支持邮箱验证码登录：

- 默认登录页使用邮箱验证码。
- 新邮箱首次登录会自动创建用户，并发放初始体验积分。
- 同一邮箱再次登录会进入同一个账号。
- 未配置 SMTP 时，验证码会打印到后端服务日志，方便本地开发测试。
- 配置 SMTP 后，验证码会发送到用户邮箱。

## 本地验证

同步数据库结构：

    cd backend
    npx prisma db push
    npx prisma generate

启动后端和前端后，在登录页输入邮箱并点击“获取验证码”。如果还没配置 SMTP，到后端日志里找类似内容：

    [Email dev mode] To: test@example.com; Subject: AI外脑登录验证码; Body: 你的 AI外脑 登录验证码是：123456

把日志里的 6 位验证码填回登录页即可登录。

## SMTP 环境变量

正式发邮件时，在服务器 `.env` 配置：

    EMAIL_CODE_SECRET=一段足够长的随机字符串
    SMTP_HOST=smtp.example.com
    SMTP_PORT=465
    SMTP_SECURE=true
    SMTP_USER=发信邮箱账号
    SMTP_PASS=SMTP授权码或密码
    SMTP_FROM=发信邮箱地址
    SMTP_FROM_NAME=AI外脑

常见个人邮箱不能直接使用登录密码，通常要在邮箱安全设置里开启 SMTP，并生成“授权码”。

## 推荐邮箱

个人开发阶段可以先用：

- QQ 邮箱 SMTP
- 163 邮箱 SMTP
- 腾讯企业邮箱 SMTP

如果后面用户量变大，再换成专业邮件服务商，例如腾讯云 SES、阿里云邮件推送、Resend、SendGrid。

## 风控规则

当前项目已经内置基础限制：

- 同一邮箱 60 秒内只能获取一次验证码。
- 验证码 5 分钟有效。
- 同一个验证码最多尝试 5 次。

后续公开推广时，还应该继续增加 IP 维度限流和图形验证码。
