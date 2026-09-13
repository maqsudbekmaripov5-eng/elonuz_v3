E'LONUZ AUTO
============
Bu paket avtomatik ishlash uchun tayyorlangan.

Termuxda:
1) ZIPni oching.
2) ElonUz-AUTO papkasiga kiring.
3) bash AUTO.sh

AUTO.sh quyidagilarni avtomatik qiladi:
- npm paketlarini o'rnatadi
- server.js ni tekshiradi
- GitHub autentifikatsiyasini tekshiradi
- loyihani GitHubga push qiladi
- GitHub Actions orqali Android APK build qiladi
- build tugashini kutadi
- APKni Download papkasiga ElonUz.apk nomi bilan saqlaydi

Muhim:
- GitHub CLI (gh) avval login qilingan bo'lishi kerak.
- Internet kerak.
- Backend uchun Render DATABASE_URL va JWT_SECRET sozlamalari alohida Render servisida qoladi.
