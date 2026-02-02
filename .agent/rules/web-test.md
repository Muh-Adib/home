---
trigger: model_decision
description: url untuk test browser
---

saat akan melakukan test untuk web lokal gunakan url : home.test
untuk url delpoy : homsjogja.com

jika url tidak muncul jalankan npm run dev jika error 500 dll jalanakan perintah berikut:
php artisan config:clear
php artisan cache:clear
php artisan route:clear
php artisan view:clear
php artisan optimize:clear
rm -f bootstrap/cache/config.php
rm -f bootstrap/cache/routes.php
rm -f bootstrap/cache/services.php