# 《青禾库：祠下村遗存影像考》 (Qinghe Digital Folklore Archive ARG)

一款纯静态前端驱动、可直接一键部署在 **GitHub Pages** 的长流程中式民俗恐怖多站点调查网页游戏（Web ARG）。

## 核心特性

- **六大拟真互联网站 + 跨站检索引擎**：
  1. **南州大学青禾数字民俗馆** (`qinghe-archive.edu.cn`) —— 高校数字人文公开馆藏门户（含老照片随章节推进的渐进式异变）
  2. **紫荆站夜间匿名树洞 & 显影液复古 DV 论坛** (`bbs-snapshot.net`) —— 双皮肤社区快照与现代网络都市传说发酵链
  3. **云溪县水利移民与方志查询网** (`yunxi-chronicles.gov.cn`) —— 水库淹没户籍补偿台账、高程底图、清代方志木刻残卷与临终信访件
  4. **青禾工程内部 OA 与工单系统** (`oa.qinghe-internal.cn`) —— 三级社工权限破密、门禁时间差比对、《地下 B2 胶片修复室安全审片十诫》与第四面墙实时遥测
  5. **夏夜拾遗 · 私人加密云笔记** (`note.zhixia-memo.me`) —— 失联大师姐林知夏的田野暗访手记与逆向封龛推演
  6. **地下 B2 远程逐帧审片台与安防监控终端** (`terminal.qinghe-b2.local`) —— 16mm 滤光镜逐帧检视器、多轨人声换气波形辨伪台、红外机柜监控与终局发布总控台
- **前端防扒包剧透加密（Web Crypto AES-256-GCM）**：第 2～5 幕深层档案、私密手记与五大分支结局均通过 `PBKDF2-SHA256 + AES-256-GCM` 在构建期加密为密文，只有当玩家真正推理出正确密码或民俗仪轨序列时才在浏览器端实时解密。
- **Web Audio API 程序化民俗声景**：实时合成水底暗渊低频、祠堂三声铜锣、傩戏木梆子、无换气伪声共振与双模式惊吓音效（支持随时切换【完整惊悚模式】与【心理压迫无贴脸模式】）。
- **长流程友好护航**：内置随身线索手记、四名受困成员支线追踪、三级不剧透推理引导与 `Base64` 跨设备存档码。

## 本地运行与构建

```bash
# 安装依赖
npm install

# 启动本地开发服务器（自动执行密文打包）
npm run dev

# 执行全链路谜题一致性与五结局解密自动化校验
npm run verify-arg

# 构建 GitHub Pages 纯静态产物 (输出至 ./dist)
npm run build
```

## 部署到 GitHub Pages

本项目已内置 `.github/workflows/deploy.yml` 自动部署工作流，且 `vite.config.ts` 已配置相对路径 `base: './'`：

1. 在 GitHub 新建仓库并将本项目代码推送至 `main` 分支；
2. 进入仓库 **Settings → Pages → Build and deployment**，将 **Source** 设为 **GitHub Actions**；
3. 等待 Actions 自动完成构建即可直接通过 `https://<你的用户名>.github.io/<仓库名>/` 在线游玩。
   - *防剧透进阶提示*：由于 `src/data/encryptedVault.ts` 已包含构建所需的完整 AES-GCM 密文，若你希望公开仓库源码的同时连原始明文母本也一并隐藏，可在推送到公开仓库前在 `.gitignore` 中启用 `vault-raw/` 忽略规则。
