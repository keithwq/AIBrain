# 微信扫码登录接入操作单

## 当前结论

项目代码已经接好了微信网页登录 OAuth 流程。现在扫码页提示“未接入 AppID”一类错误，通常不是代码问题，而是以下原因之一：

- 没有在微信开放平台创建并审核通过“网站应用”。
- 使用了公众号、小程序或移动应用的 AppID，而不是网站应用 AppID。
- 服务器没有配置 `WECHAT_APP_ID` 和 `WECHAT_APP_SECRET`。
- 微信开放平台填写的授权回调域名和项目实际回调地址不一致。

微信网页登录必须走微信开放平台的网站应用能力，不能直接拿公众号或小程序 AppID 替代。

官方文档：https://developers.weixin.qq.com/doc/oplatform/Website_App/WeChat_Login/Wechat_Login.html

## 需要在微信开放平台完成的事

1. 打开微信开放平台：https://open.weixin.qq.com/
2. 注册并完成开发者资质认证。
3. 创建“网站应用”。
4. 在网站应用里申请“微信登录”能力。
5. 等待审核通过后，拿到该网站应用的 `AppID` 和 `AppSecret`。

这一步需要主体信息、实名或企业认证材料，必须由账号主体本人完成，AI 不能代替提交。

## 微信开放平台应填写的信息

按线上部署域名填写，不要填本地地址。

如果当前线上访问地址是：

    http://124.222.212.159

则建议填写：

    授权回调域：124.222.212.159
    回调地址：http://124.222.212.159/api/v1/auth/wechat/callback

如果以后绑定正式域名，例如：

    https://aibrain.example.com

则建议填写：

    授权回调域：aibrain.example.com
    回调地址：https://aibrain.example.com/api/v1/auth/wechat/callback

微信平台通常校验域名，不接受 localhost。本地开发可以保留昵称登录入口，微信登录只在公网环境验证。

## 服务器环境变量

拿到微信开放平台的网站应用 AppID 和 AppSecret 后，在服务器 `.env` 写入：

    WECHAT_APP_ID=微信开放平台网站应用AppID
    WECHAT_APP_SECRET=微信开放平台网站应用AppSecret
    WECHAT_REDIRECT_URI=http://124.222.212.159/api/v1/auth/wechat/callback
    WECHAT_STATE_SECRET=一段足够长的随机字符串
    PUBLIC_ORIGIN=http://124.222.212.159
    FRONTEND_ORIGIN=http://124.222.212.159
    CORS_ORIGIN=http://124.222.212.159

如果使用 HTTPS 和正式域名，把上面的 `http://124.222.212.159` 全部替换成正式站点地址。

## 重新启动

修改环境变量后重新启动服务：

    docker-compose up -d --build

## 验证

1. 打开网站登录页。
2. 点击“微信扫码登录”。
3. 正常情况会打开微信授权二维码页。
4. 微信扫码确认后，页面会自动回到 AiBrain 并完成登录。

如果仍然报错，优先检查：

- AppID 是否来自“微信开放平台 - 网站应用”。
- 网站应用是否已经审核通过并开通微信登录。
- `WECHAT_REDIRECT_URI` 是否和开放平台配置的授权回调域一致。
- 当前访问站点是否和 `PUBLIC_ORIGIN`、`FRONTEND_ORIGIN` 一致。
- 服务器是否真的加载了新环境变量并重启成功。
