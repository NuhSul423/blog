# Nuhsul.blog

#### 介绍
主仓库，基于hexo搭建的博客网站，主题用的hexo-theme-cola，可在themes中更改主题相关设置,如友情链接等可在_config.xml中进行修改。博客放在source/_post中.

#### 软件架构
软件架构说明


#### 安装教程

1.  xxxx
2.  xxxx
3.  xxxx

#### 使用说明
由于原本本地部署的时候能正确跳转，而线上部署发现链接可能出现无法跳转至指定地址，故而列出下面这些可能会修改的地方，以供参考：
1.  在修改相关设置更新后pc网页端并不会立刻生效。可在手机端查看效果。
2.  修改顶部的首页，友情链接的跳转地址在blog/ themes / hexo-theme-cola-master / layout / /_partial /header.ejs中。
而修改左侧的跳转地址在blog/ themes /_config.ymml中。
3.  修改背景图片等在blog/ themes / hexo-theme-cola-master / source / css/layout.styl中。
4.  修改归档，标签，分类等跳转地址在 blog/ themes / hexo-theme-cola-master / layout / /_partial / main-left.ejs 中。
5.  评论区修改注意事项，需要在leancloud.去注册自己的账号，将theme/_config.yml中的api修改为自己的api才能管理自己的评论区。
6.	注意上传博客时在文章中将要将时间date带上，或者修改_config.xml中修改上传博客命名方式，因为不带时间就会出现每次一更新，不带时间的博客会以最新时间为准，博客评论区是绑定文章的，会造成评论区的丢失。

#### 参与贡献

1.  Fork 本仓库
2.  新建 Feat_xxx 分支
3.  提交代码
4.  新建 Pull Request


#### 特技

1.  使用 Readme\_XXX.md 来支持不同的语言，例如 Readme\_en.md, Readme\_zh.md
2.  Gitee 官方博客 [blog.gitee.com](https://blog.gitee.com)
3.  你可以 [https://gitee.com/explore](https://gitee.com/explore) 这个地址来了解 Gitee 上的优秀开源项目
4.  [GVP](https://gitee.com/gvp) 全称是 Gitee 最有价值开源项目，是综合评定出的优秀开源项目
5.  Gitee 官方提供的使用手册 [https://gitee.com/help](https://gitee.com/help)
6.  Gitee 封面人物是一档用来展示 Gitee 会员风采的栏目 [https://gitee.com/gitee-stars/](https://gitee.com/gitee-stars/)
