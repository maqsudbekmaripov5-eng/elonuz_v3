#!/data/data/com.termux/files/usr/bin/bash
set -e

APP_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$APP_DIR"
REPO="https://github.com/maqsudbekmaripov5-eng/elonuz_v3.git"
DOWNLOAD_DIR="$HOME/storage/downloads"

echo "========================================"
echo "      E'LONUZ AUTO BUILD START"
echo "========================================"

command -v node >/dev/null || { echo "Node.js topilmadi. Termuxda: pkg install nodejs"; exit 1; }
command -v npm >/dev/null || { echo "npm topilmadi"; exit 1; }
command -v gh >/dev/null || { echo "GitHub CLI topilmadi. Termuxda: pkg install gh git"; exit 1; }
command -v git >/dev/null || { echo "Git topilmadi. Termuxda: pkg install git"; exit 1; }

echo "[1/6] Paketlar o'rnatilmoqda..."
npm install

echo "[2/6] JavaScript tekshirilmoqda..."
node --check server.js

if [ ! -d .git ]; then
  echo "[3/6] Git repository tayyorlanmoqda..."
  git init
  git branch -M main
  git remote add origin "$REPO"
else
  echo "[3/6] Git repository mavjud..."
  git remote set-url origin "$REPO" 2>/dev/null || true
fi

echo "[4/6] GitHub autentifikatsiyasi tekshirilmoqda..."
gh auth status >/dev/null

echo "[5/6] GitHubga yuborilmoqda..."
git add .
if ! git diff --cached --quiet; then
  git -c user.name="maqsudbekmaripov5-eng" -c user.email="auto@elonuz.local" commit -m "ElonUz AUTO build"
fi
git push -u origin main

echo "[6/6] GitHub Actions APK yig'ishini kutmoqda..."
RUN_ID="$(gh run list --repo maqsudbekmaripov5-eng/elonuz_v3 --workflow build-apk.yml --limit 1 --json databaseId --jq '.[0].databaseId')"
if [ -z "$RUN_ID" ]; then
  echo "APK build topilmadi. GitHub Actions sahifasini tekshiring."
  exit 1
fi
gh run watch "$RUN_ID" --repo maqsudbekmaripov5-eng/elonuz_v3 --exit-status

rm -rf output
mkdir -p output
gh run download "$RUN_ID" --repo maqsudbekmaripov5-eng/elonuz_v3 --name ElonUz-APK --dir output
APK="$(find output -type f -name '*.apk' | head -n 1)"
if [ -z "$APK" ]; then
  echo "APK fayli topilmadi."
  exit 1
fi
mkdir -p "$DOWNLOAD_DIR"
cp "$APK" "$DOWNLOAD_DIR/ElonUz.apk"
echo "========================================"
echo "TAYYOR! APK: $DOWNLOAD_DIR/ElonUz.apk"
echo "========================================"
