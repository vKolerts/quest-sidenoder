@echo off

mkdir sideloader_deps 2> NUL

IF EXIST "%~dp0sidenoder.exe" (
  echo .
) else (
    IF EXIST "%programfiles(x86)%\nodejs\node.exe" (
      echo NodeJS is present
    ) ELSE (
      echo Downloading and installing NODEJS'
      curl  --ssl-no-revoke https://nodejs.org/dist/v14.15.1/node-v14.15.1-x86.msi -o sideloader_deps/node-v14.15.1-x86.msi
      START /WAIT sideloader_deps/node-v14.15.1-x86.msi
    )

    IF EXIST "C:\Program Files\Git\cmd\git.exe" (
        echo Git is present
    ) ELSE (
        echo Downloading and installing Git
        curl  --ssl-no-revoke -L https://github.com/git-for-windows/git/releases/download/v2.29.2.windows.2/Git-2.29.2.2-64-bit.exe  -o sideloader_deps/Git-2.29.2.2-64-bit.exe
        START /WAIT sideloader_deps/Git-2.29.2.2-64-bit.exe
    )
)

IF EXIST "%programfiles(x86)%\WinFsp\Bin\diag.bat" (
    echo WinFsp is present
    echo .
    echo .
    echo Dependencies installed.
    echo You can run \"npm install\"(once) and \"npm start\" to start the SideNoder
    pause
    exit
) ELSE (
    curl  --ssl-no-revoke -L https://github.com/billziss-gh/winfsp/releases/download/v1.8/winfsp-1.8.20304.msi  -o sideloader_deps/winfsp-1.8.20304.msi
    START /WAIT sideloader_deps/winfsp-1.8.20304.msi
    echo .
    echo .
    echo Dependencies installed, Please reboot to complete the installation.

    echo "After rebooting you can run \"npm install\"(once) and \"npm start\" to start the SideNoder"

    pause
    exit
)