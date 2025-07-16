# 🌐 Multi-Language Support Fix Guide

## 🔍 Problem Identified
Fitur multi bahasa tidak berfungsi dengan benar ketika mencoba kembali ke bahasa Inggris karena:

1. **Language Switcher tidak optimal** - menggunakan server-side routing saja
2. **Missing persistence** - bahasa tidak tersimpan di client-side
3. **Configuration issues** - i18n setup kurang robust

## ✅ Solutions Implemented

### 1. **Enhanced i18n Configuration** 
File: `resources/js/lib/i18n.ts`

**Improvements:**
- ✅ **localStorage persistence** - bahasa tersimpan di browser
- ✅ **Fallback mechanism** - default ke 'en' jika ada error
- ✅ **Better language detection** - dari HTML attribute dan localStorage
- ✅ **Performance optimization** - preload dan language-only loading

```typescript
// Custom functions exported:
changeLanguage(language: string)     // Change and persist language
getCurrentLanguage()                 // Get current language code
supportedLanguages                   // Array of supported languages ['en', 'id']
```

### 2. **Professional Language Switcher**
File: `resources/js/components/language-switcher.tsx`

**Features:**
- 🎨 **Dropdown UI** dengan flags dan nama lengkap bahasa
- ⚡ **Client-side switching** untuk performa cepat
- 💾 **Dual persistence** - localStorage + server session
- 🔄 **Error handling** yang robust
- 📱 **Responsive design** - adaptif mobile/desktop

### 3. **Translation Files Enhanced**
Files: `resources/js/locales/en.json` & `resources/js/locales/id.json`

**Added comprehensive translations for:**
- ✅ Booking form elements
- ✅ Pricing components  
- ✅ Validation messages
- ✅ Navigation items
- ✅ Common UI elements

## 🚀 How It Works

### **Language Detection Priority:**
1. **localStorage** - pilihan user sebelumnya
2. **HTML lang attribute** - dari Laravel server
3. **Default fallback** - 'id' (Indonesia)

### **Language Switching Process:**
1. User clicks language in dropdown
2. **Immediate client-side change** via `i18n.changeLanguage()`
3. **Persist to localStorage** untuk session berikutnya
4. **Update HTML lang attribute** untuk accessibility
5. **Optional server sync** untuk Laravel session

## 🧪 Testing Guide

### **1. Test Language Switching**
```bash
# Open browser console and test:
import { changeLanguage } from './resources/js/lib/i18n.ts'

// Test switching
changeLanguage('en')  // Switch to English
changeLanguage('id')  // Switch to Indonesian
```

### **2. Test Persistence**
1. Switch to English
2. Refresh page
3. Language should remain English
4. Check localStorage: `localStorage.getItem('i18nextLng')`

### **3. Test Fallback**
1. Clear localStorage: `localStorage.clear()`
2. Refresh page
3. Should default to Indonesian

### **4. Test Translation Keys**
```typescript
// In any component:
import { useTranslation } from 'react-i18next';

const { t } = useTranslation();
console.log(t('booking.book_your_stay'));  // Test key
```

## 🔧 Usage in Components

### **Basic Usage**
```tsx
import { useTranslation } from 'react-i18next';

const MyComponent = () => {
  const { t } = useTranslation();
  
  return (
    <div>
      <h1>{t('booking.title')}</h1>
      <p>{t('booking.description')}</p>
    </div>
  );
};
```

### **Advanced Usage with Interpolation**
```tsx
// For dynamic content:
<p>{t('booking.guest_num', { number: 2 })}</p>
// Result: "Tamu 2" (ID) or "Guest 2" (EN)
```

### **Check Current Language**
```tsx
import { getCurrentLanguage } from '@/lib/i18n';

const currentLang = getCurrentLanguage(); // 'en' or 'id'
```

## 📋 Available Translation Namespaces

### **1. Navigation (`nav.*`)**
```typescript
t('nav.home')           // "Beranda" | "Home"
t('nav.properties')     // "Properti" | "Properties"
t('nav.bookings')       // "Pemesanan" | "Bookings"
```

### **2. Authentication (`auth.*`)**
```typescript
t('auth.login')         // "Masuk" | "Login"
t('auth.email')         // "Email" | "Email"
t('auth.password')      // "Kata Sandi" | "Password"
```

### **3. Booking (`booking.*`)**
```typescript
t('booking.book_your_stay')    // "Pesan Penginapan Anda" | "Book Your Stay"
t('booking.check_in')          // "Check-in" | "Check-in"
t('booking.processing')        // "Memproses..." | "Processing..."
```

### **4. Pricing (`pricing.*`)**
```typescript
t('pricing.total_price')       // "Total Harga" | "Total Price"
t('pricing.discount')          // "Diskon" | "Discount"
t('pricing.down_payment')      // "Uang Muka" | "Down Payment"
```

### **5. Common (`common.*`)**
```typescript
t('common.save')              // "Simpan" | "Save"
t('common.cancel')            // "Batal" | "Cancel"
t('common.loading')           // "Memuat..." | "Loading..."
```

### **6. Validation (`validation.*`)**
```typescript
t('validation.name_required')  // "Nama diperlukan" | "Name is required"
t('validation.email_required') // "Email diperlukan" | "Email is required"
```

## 🛠️ Troubleshooting

### **Issue: Language not changing**
**Solution:**
1. Check browser console for errors
2. Verify translation keys exist in both files
3. Check if localStorage is enabled
4. Clear browser cache

### **Issue: Missing translations**
**Solution:**
1. Add missing keys to both `en.json` and `id.json`
2. Use consistent key naming: `namespace.specific_key`
3. Restart dev server after adding translations

### **Issue: Server session not syncing**
**Solution:**
- Client-side switching works independently
- Server sync is optional and won't block functionality
- Check Laravel route: `/locale/{locale}`

## 📊 Performance Optimizations

1. **Language Only Loading** - loads 'en' instead of 'en-US'
2. **No Suspense** - prevents loading spinners
3. **Namespace Separation** - efficient key organization
4. **localStorage Caching** - fast subsequent loads

## 🔒 Best Practices

### **1. Key Naming Convention**
```typescript
// ✅ Good
t('booking.guest_details')
t('pricing.total_amount')
t('validation.email_required')

// ❌ Avoid
t('guestDetails')
t('total-amount')
t('emailRequired')
```

### **2. Always Provide Fallbacks**
```typescript
// ✅ Good - with fallback
{t('booking.title', 'Default Title')}

// ❌ Risk - no fallback
{t('booking.title')}
```

### **3. Use Interpolation for Dynamic Content**
```typescript
// ✅ Good
t('booking.nights_count', { count: nights })

// ❌ Avoid string concatenation
`${nights} ${t('booking.nights')}`
```

## 🎯 Next Steps

1. **Test thoroughly** - both languages in all components
2. **Add more languages** - extend `supportedLanguages` array
3. **Monitor performance** - check bundle size impact
4. **User feedback** - collect language switching experience

---

## 📞 Support

Jika masih ada masalah:
1. Check browser console untuk error messages
2. Verify semua translation keys ada di kedua file
3. Test dengan incognito mode (fresh localStorage)
4. Check Laravel logs untuk server-side issues

**Happy Multilingual Development! 🌍✨** 