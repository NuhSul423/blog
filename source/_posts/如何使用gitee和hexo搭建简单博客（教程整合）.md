---
title: 如何使用gitee和hexo搭建简单博客（教程整合）
date: 2024-2-26 11:27:11
tag: 学习
cover: https://upload-bbs.mihoyo.com/upload/2020/12/07/73756022/45fae9fa4184403108eb21a629652505_7673182443294617423.png?x-oss-process=image/resize,s_600/quality,q_80/auto-orient,0/interlace,1/format,png
---


# 1、准备工作

* 安装Node.js
node.js的安装较为简单，安装过程中需要修改的地方就安装路径。

镜像下载地址：[https://npmmirror.com/mirrors/node/](https://npmmirror.com/mirrors/node/)

安装过程可查看：[https://blog.csdn.net/qq_29001539/article/details/106175704](https://blog.csdn.net/qq_29001539/article/details/106175704)

* 安装git
安装过程除去安装目录默认即可。

镜像下载地址：[https://npmmirror.com/mirrors/git-for-windows/](https://npmmirror.com/mirrors/git-for-windows/)

安装过程可查看：[https://zhuanlan.zhihu.com/p/597447255](https://zhuanlan.zhihu.com/p/597447255)

# 2、安装hexo

官方文档：[https://hexo.io/zh-cn/docs/](https://hexo.io/zh-cn/docs/)（在官网右上角可以有更换语言的功能）

使用npm安装hexo（运行node.exe后输入下面指令）

```plain
npm install -g hexo-cli
```
安装 Hexo 完成后，请执行下列命令，Hexo 将会在指定文件夹中新建所需要的文件。（<folder>即为你想要将hexo放在哪个文件夹的路径，如：hexo init D:\hexo即是放在d盘的hexo文件夹中）
```plain
$ hexo init <folder>
$ cd <folder>
$ npm install
```
新建完成后，指定文件夹的目录如下：
```plain
.
├── _config.yml
├── package.json
├── scaffolds
├── source
|   ├── _drafts
|   └── _posts
└── themes
```
进入刚才你指定的文件夹中便能看到文件目录。
您可以在 `_config.yml` 或 [代替配置文件](https://hexo.io/zh-cn/docs/configuration#%E4%BD%BF%E7%94%A8%E4%BB%A3%E6%9B%BF%E9%85%8D%E7%BD%AE%E6%96%87%E4%BB%B6) 中修改大部分的配置。

## 网站

|参数|描述|
|:----|:----|
|title|网站标题|
|subtitle|网站副标题|
|description|网站描述|
|keywords|网站的关键词。支持多个关键词。|
|author|您的名字|
|language|网站使用的语言。对于简体中文用户来说，使用不同的主题可能需要设置成不同的值，请参考你的主题的文档自行设置，常见的有 zh-Hans和 zh-CN。|
|timezone|网站时区。Hexo 默认使用您电脑的时区。请参考 [时区列表](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones) 进行设置，如 America/New_York, Japan, 和 UTC 。一般的，对于中国大陆地区可以使用 Asia/Shanghai。|

其中，`description` 主要用于SEO，告诉搜索引擎一个关于您站点的简单描述，通常建议在其中包含您网站的关键词。`author` 参数用于主题显示文章的作者。

# 3、使用喜欢的主题，搭建自己的博客

## 1、找到自己喜欢的主题并下载/克隆到本地。

在hexo官网顶部可以查看各种主题（在官网右上角可以有更换语言的功能）

[https://hexo.io/zh-cn/docs/configuration](https://hexo.io/zh-cn/docs/configuration)

一般主题会放在github上面，你可以克隆到本地，或者直接下载压缩包解压到本地文件夹中，为了方便后续操作，最好解压到上述hexo所新建的文件夹根目录中文件夹。

## 2、在_config.yml中配置主题

注意：在下载的主题中一般也有一个_config.yml，这里要修改的为hexo所建立文件夹中的_config.yml

```plain
theme: <folder>
```
<folder>即为你解压出的主题的文件夹名。
主题的网站设置一般在主题中的_config.yml中进行配置。

在hexo所在目录中，进入cmd启动hexo

```plain
hexo s
```
启动后查看主题是否配置完成。
# 4、使用gitee pages布置博客到网站中

## 1、gitee pages

你可以在你的仓库-服务中看到gitee pages，要开启该功能需要实名认证。

官方文档：[https://help.gitee.com/services/gitee-pages/intro](https://help.gitee.com/services/gitee-pages/intro)

## 2、将自己的博客网站部署到gitee上

部署教程：[https://blog.csdn.net/qq_51618777/article/details/124420589](https://blog.csdn.net/qq_51618777/article/details/124420589)

## 3、在gitee pages中开启服务或更新服务，你就能在生成的链接中看到自己的博客网站了。

