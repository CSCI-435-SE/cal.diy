# Git clone symlink permission error on Windows

**Created:** 9/13/2026 18:38:43  
**Updated:** 9/14/2026 20:27:02  
**Exported:** 9/17/2026 13:02:04  
**Link:** [https://claude.ai/chat/6f8c4488-93a6-4f0c-bb4e-25424dada52b](https://claude.ai/chat/6f8c4488-93a6-4f0c-bb4e-25424dada52b)  

## User:

> 9/13/2026 18:38:44

Hey Claude, can you help me get a local version of cal.diy running on my computer? The first step in the process is to clone the git repository. I used the following command and got the following error. I am on a windows machine. Please indicate if you require additional information. Thanks!

GIT COMMAND:

git clone -c core.symlinks=true URL_TO_GITHUB_REPO

ERROR TRACE:
Cloning into 'cal.diy'...
remote: Enumerating objects: 279509, done.
remote: Counting objects: 100% (19/19), done.
remote: Compressing objects: 100% (15/15), done.
remote: Total 279509 (delta 7), reused 16 (delta 4), pack-reused 279490 (from 1)
Receiving objects: 100% (279509/279509), 1.01 GiB | 3.94 MiB/s, done.
Resolving deltas: 100% (182660/182660), done.
error: unable to create symlink .claude/rules: Permission denied
error: unable to create symlink .claude/skills: Permission denied
error: unable to create symlink .cursor/rules: Permission denied
error: unable to create symlink .cursor/skills: Permission denied
error: unable to create symlink CLAUDE.md: Permission denied
error: unable to create symlink packages/prisma/.env: Permission denied
error: unable to create symlink specs/_templates/CLAUDE.md: Permission denied
Updating files: 100% (7705/7705), done.
fatal: unable to checkout working tree
warning: Clone succeeded, but checkout failed.
You can inspect what was checked out with 'git status'
and retry with 'git restore --source=HEAD :/'

## Assistant:

> 9/13/2026 18:38:52

The issue is that Windows requires **Developer Mode** to be enabled (or running as Administrator) to create symlinks via Git. The clone succeeded, but the checkout failed because Git couldn't create the symlinks.

Here are your options, in order of recommendation:

> Used tool
>
> - How to fix the symlink permission error on Windows when cloning cal.diy
> - **Done**

**Why this happens:** The `-c core.symlinks=true` flag in your clone command explicitly tells Git to create real Windows symlinks, which requires elevated privileges by default on Windows. Developer Mode is the cleanest fix.

**Alternative if you'd rather not enable Developer Mode:** You can drop the `-c core.symlinks=true` flag entirely, which lets Git fall back to creating stub files instead of real symlinks. The project *may* still work depending on how those symlinks are used at runtime, but it's worth trying Developer Mode first since the project's own docs presumably recommend that flag for a reason.

Let me know what you see after retrying the checkout!

## User:

> 9/14/2026 13:51:55

I am following these instructions right now to get the project running:

```
# 1. Clone (Windows: symlinks flag matters) and install
git clone -c core.symlinks=true https://github.com/CSCI-435-SE/cal.diy.git
cd cal.diy
yarn
```

I cloned the project using Developer mode (so the symlinks work), entered the directory and ran yarn, but I ran into these errors. Can you help me debug this problem?

For additional context, these are the versions of the software I am using:
nodeJS: v25.2.1
yarn: 4.12.0

## Assistant:

> 9/14/2026 13:51:56

Could you paste the error output from `yarn`? That'll let me see exactly what's failing and give you accurate guidance rather than guessing.

## User:

> 9/14/2026 13:52:35

> File: 

## Assistant:

> 9/14/2026 13:52:46

The real error here is at the bottom — all the peer dependency warnings are normal noise for a large monorepo like this. The actual failure is:

```
deasync@npm:0.1.31 couldn't be built successfully (exit code 1)
```

`deasync` is a native Node.js addon that has to compile C++ code on your machine, and **it doesn't support Node.js v25**. It officially supports up to Node 22 (LTS). Your Node v25.2.1 is a cutting-edge release that's too new for it.

**The fix: switch to Node.js 22 (LTS)**

The easiest way to do this is with a Node version manager, which lets you switch between versions without uninstalling anything.

> Used tool
>
> - Switch to Node 22 LTS to fix deasync build failure
> - **Done**

**Side note:** The project likely has a `.node-version` or `.nvmrc` file in the repo root that specifies which Node version it expects. If so, `fnm` will automatically pick that up when you `cd` into the directory (after a one-time setup). You can check by running `cat .node-version` or `cat .nvmrc` in the project folder.

Let me know what you see after switching Node versions!

## User:

> 9/14/2026 19:50:33

I also have NVM downloaded, can I use that instead?

## Assistant:

> 9/14/2026 19:50:35

Yes, absolutely! NVM works just as well. Run these commands instead:

```
nvm install 22
nvm use 22
```

Verify with `node --version`, then re-run `yarn` in the project directory. Same result, no need to install anything new.

## User:

> 9/14/2026 19:59:27

If I downloaded yarn on node 25, will I still have node when I switch to node 22? I tried running yarn but it could not find the command.

## Assistant:

> 9/14/2026 19:59:29

This is expected — yarn is installed per Node version with NVM, so switching to Node 22 means you need to reinstall it there. Run:

```
npm install -g yarn
```

Then verify with `yarn --version` and you should be good to re-run `yarn` in the project.

## User:

> 9/14/2026 20:26:51

I ran into this error while running this command (yarn workspace @calcom/prisma db-up); it runs something with Docker. I am using Docker Desktop and have it running (most recent version). I can either Skep the WSL distro integration, or restart the WSL integration. The WSL, from what I understand, is unrelated to the project (I have used WSL before for other projects requiring linux). Do you need additional information to make a judgement?

ERROR:

WSL integration with distro 'Ubuntu' unexpectedly stopped. Do you want to restart it?

```
running wsl distro proxy in Ubuntu distro: running proxy: running wslexec: An error occurred while running the command. DockerDesktop/Wsl/ExecError: c:\windows\system32\wsl.exe -d ubuntu -u root -e /run/docker-desktop/docker-desktop-user-distro proxy --distro-name ubuntu --docker-desktop-root /mnt/wsl/docker-desktop c:\program files\docker\docker\resources: exit status 1 (stderr: , stdout: , wslErrorCode: DockerDesktop/Wsl/ExecError) (output: [2026-09-15T00:21:44.332101305Z][docker-desktop-user-distro.version][W] failed to read component versions: open /opt/docker-desktop/componentsVersion.json: no such file or directory
[2026-09-15T00:21:44.334679151Z][docker-desktop-user-distro.ipc] 15075c7c-LinuxProxyCMD -> /mnt/wsl/docker-desktop/shared-sockets/host-services/backend.sock BackendAPI
[2026-09-15T00:21:52.335928174Z][docker-desktop-user-distro][F] getting settings from backend: Get "http://ipc/app/settings/flat": dial unix /mnt/wsl/docker-desktop/shared-sockets/host-services/backend.sock: connect: no such file or directory
[main.run({0x7ffe3c790889, 0x28})
[	linuxkit/pkg/desktop/docker-desktop-user-distro/main.go:175 +0xe10
[main.init.func6(0x30b844999a00?, {0x30b844c1dc20?, 0x4?, 0x7571cf6b39a7?})
[	linuxkit/pkg/desktop/docker-desktop-user-distro/main.go:86 +0x25
[github.com/spf13/cobra.(*Command).execute(0x7571d014f0a0, {0x30b844c1dbd0, 0x5, 0x5})
[	github.com/spf13/cobra@v1.10.2/command.go:1019 +0xafb
[github.com/spf13/cobra.(*Command).ExecuteC(0x7571d014eae0)
[	github.com/spf13/cobra@v1.10.2/command.go:1148 +0x465
[github.com/spf13/cobra.(*Command).Execute(...)
[	github.com/spf13/cobra@v1.10.2/command.go:1071
[main.main()
[	linuxkit/pkg/desktop/docker-desktop-user-distro/main.go:639 +0x1a) (wslConf: [boot]
systemd=true

[user]
default=dylan
)
```

## Assistant:

> 9/14/2026 20:27:02

The key error buried in there is:

```
no such file or directory: /mnt/wsl/docker-desktop/shared-sockets/host-services/backend.sock
```

This means Docker Desktop's backend isn't fully communicating with your Ubuntu WSL distro. This is a known issue that happens when the Docker Desktop WSL integration gets into a bad state. Before doing anything drastic, try these fixes in order:

> Used tool
>
> - Steps to fix Docker Desktop WSL integration stopping unexpectedly
> - **Done**

To answer your question about whether WSL is related to the project — Docker Desktop on Windows uses WSL 2 as its backend to run Linux containers, so even though the cal.diy project itself doesn't require WSL directly, Docker needs it running properly under the hood. So yes, this WSL issue is blocking Docker, which is blocking the `db-up` command.

Let me know what happens after trying those steps!

Powered by Claude Exporter (https://www.ai-chat-exporter.net)
