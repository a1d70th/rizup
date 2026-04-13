@echo off
REM Rizup Dispatch 起動スクリプト
REM  - Node サーバー（port 3456）を別ウインドウで起動
REM  - ngrok で https:// 公開URLを発行
REM  - 公開URLをクリップボードにコピー

setlocal enabledelayedexpansion
cd /d "%~dp0"

REM ── ngrok バイナリの場所を解決 ─────────────────────────────────────
set "NGROK_EXE=ngrok"
where ngrok >nul 2>&1
if errorlevel 1 (
  set "NGROK_EXE=%LOCALAPPDATA%\Microsoft\WinGet\Packages\Ngrok.Ngrok_Microsoft.Winget.Source_8wekyb3d8bbwe\ngrok.exe"
  if not exist "!NGROK_EXE!" (
    echo [ERROR] ngrok not found. Install: winget install ngrok.ngrok
    pause
    exit /b 1
  )
)

REM ── ngrok 認証トークン確認 ─────────────────────────────────────────
if not exist "%LOCALAPPDATA%\ngrok\ngrok.yml" (
  echo.
  echo ===============================================================
  echo  [SETUP REQUIRED]
  echo  ngrok authtoken が未設定です。以下を実行してください：
  echo.
  echo   1. https://dashboard.ngrok.com でサインアップ（無料）
  echo   2. https://dashboard.ngrok.com/get-started/your-authtoken
  echo      からトークンをコピー
  echo   3. このコマンドを実行：
  echo        "%NGROK_EXE%" config add-authtoken YOUR_TOKEN
  echo   4. 再度 start-dispatch.bat を実行
  echo ===============================================================
  echo.
  pause
  exit /b 1
)

REM ── Node サーバー起動 ─────────────────────────────────────────────
echo [start-dispatch] Starting dispatch server on port 3456...
start "Rizup Dispatch Server" cmd /k "node dispatch-server.mjs"
timeout /t 2 /nobreak >nul

REM ── ngrok 起動 ────────────────────────────────────────────────────
echo [start-dispatch] Starting ngrok tunnel...
start "ngrok (Rizup Dispatch)" cmd /k "\"%NGROK_EXE%\" http 3456"
timeout /t 4 /nobreak >nul

REM ── 公開URLを取得してクリップボードへ ────────────────────────────
echo.
echo [start-dispatch] Fetching public URL from ngrok API...
powershell -NoProfile -Command "try { $r = Invoke-RestMethod 'http://127.0.0.1:4040/api/tunnels'; $url = ($r.tunnels | Where-Object { $_.proto -eq 'https' } | Select-Object -First 1).public_url; if ($url) { Write-Host ''; Write-Host '========================================================' -ForegroundColor DarkGray; Write-Host ('  PUBLIC URL :  ' + $url) -ForegroundColor Green; Write-Host ('  POST        : ' + $url + '/task') -ForegroundColor Cyan; Write-Host ('  Health      : ' + $url + '/') -ForegroundColor Cyan; Write-Host ('  Queue       : ' + $url + '/queue') -ForegroundColor Cyan; Write-Host ('  Log         : ' + $url + '/log') -ForegroundColor Cyan; Write-Host '========================================================' -ForegroundColor DarkGray; Write-Host ''; $url | Set-Clipboard; Write-Host '(URL copied to clipboard)' -ForegroundColor DarkGray; } else { Write-Host 'No HTTPS tunnel found. Check ngrok window for errors.' -ForegroundColor Yellow } } catch { Write-Host 'Failed to reach ngrok API at 127.0.0.1:4040' -ForegroundColor Red; Write-Host 'See the ngrok window for the actual error.' -ForegroundColor Yellow }"

echo.
echo [start-dispatch] サーバーと ngrok は別ウインドウで動いています。
echo 停止するには各ウインドウを閉じてください。
echo.
pause
