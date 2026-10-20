# 渔塘记 V1.0 Trial

第一人称剧情经营游戏。选择角色并填写名字，通过对话选项推进一造土塘经营。
游戏设定，不作为现实养殖建议。

## 启动与存档
Windows版：完整解压后运行“渔塘记.exe”，分享时保留整个程序文件夹。目标为Windows 10/11 x64，程序未数字签名。
网页需要通过HTTP/HTTPS静态托管访问，首次点击后才能播放声音。资源加载失败时可保留字幕继续操作。
进度保存在本机。请在游戏“存档”页面导出备份，再通过导入恢复。不同浏览器、设备与桌面版不会自动同步。

## 源码运行与构建
以下适用于包含package.json的源码包，需要Node.js及npm。
安装依赖：npm ci
开发预览：npm run dev
检查：npm test
网页构建：npm run build，产物在dist目录。
Windows打包：npm run package:windows，在Windows环境运行，产物在release目录；已有目录不会被覆盖。
GitHub包内docs为已构建网站；可选择main分支/docs作为Pages发布目录。

## 维护
src包含剧情、规则、界面和存档逻辑；public包含图片和音频；desktop包含桌面入口。
修改内容后重新构建。存档结构和剧情ID的修改需要保持兼容；更新前先导出存档。
修改图片后可使用scripts/optimize-scenes.py生成WebP，需要Python及Pillow。
保留THIRD_PARTY_LICENSES.txt以及桌面运行时自带的许可证。声音与素材说明见AUDIO_CREDITS.txt和素材说明.txt。
