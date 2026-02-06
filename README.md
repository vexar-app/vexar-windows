# 🚀 Vexar for Windows

> **Discord ve internet erişim engellerini aşmak için tasarlanmış, modern ve kullanımı kolay DPI bypass aracı.**

[![Platform](https://img.shields.io/badge/Platform-Windows-blue.svg)](https://www.microsoft.com/windows)
[![Architecture](https://img.shields.io/badge/Architecture-x64-green.svg)](https://www.microsoft.com/windows)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 📋 İçindekiler

- [Özellikler](#-özellikler)
- [Nasıl Çalışır](#-nasıl-çalışır)
- [Sistem Gereksinimleri](#-sistem-gereksinimleri)
- [Kurulum](#-kurulum)
- [Kullanım](#-kullanım)
- [Geliştirici](#-geliştirici)
- [Destek](#-destek)
- [Sorumluluk Reddi](#-sorumluluk-reddi)

---

## ✨ Özellikler

Vexar, karmaşık terminal komutlarıyla uğraşmadan internet kısıtlamalarını aşmanızı sağlayan native bir Windows uygulamasıdır.

### 🎯 Temel Özellikler

- **Sistem Geneli Proxy**: Windows sistem proxy ayarlarını otomatik yönetir, böylece Discord ve tarayıcılar dahil tüm uygulamalar erişim engelini aşar.
- **Tek Tıkla Bağlantı**: "Bağlan" butonuna tıklayarak DPI bypass motorunu başlatın.
- **Gömülü Motor**: SpoofDPI içinde gömülü gelir, harici kurulum gerektirmez.
- **DNS Yönetimi**: Cloudflare, Google, AdGuard gibi popüler DNS servisleri arasında kolayca geçiş yapın.
- **Sistem Tepsisi (Tray)**: Uygulamayı sistem tepsisine küçülterek arka planda çalıştırabilirsiniz.
- **Otomatik Başlangıç**: Windows açıldığında Vexar'ın otomatik başlamasını sağlayabilirsiniz.

### 🎨 Modern Arayüz

- **Fluent Tasarım**: Windows 11 estetiğine uygun, modern ve şık arayüz.
- **Canlı Durum**: Bağlantı durumunu ve logları anlık olarak takip edin.
- **Karanlık Mod**: Göz yormayan koyu tema.

---

## 🔧 Nasıl Çalışır?

Vexar, arka planda güvenilir DPI bypass teknolojilerini kullanır:

1. **Yerel Proxy**: `spoofdpi` motorunu yerel bir portta (örn. 8080) çalıştırır.
2. **Sistem Entegrasyonu**: Windows'un proxy ayarlarını `127.0.0.1:PORT` adresine yönlendirir.
3. **Paket İşleme**: Giden paketleri modifiye ederek DPI (Derin Paket İnceleme) sistemlerini atlatır.
4. **Temizlik**: Uygulama kapandığında proxy ayarlarını otomatik olarak eski haline getirir.

---

## 💻 Sistem Gereksinimleri

- **İşletim Sistemi**: Windows 10 veya Windows 11
- **Mimari**: x64 işlemci
- **İnternet**: Uygulamanın çalışması için aktif bir internet bağlantısı gereklidir.
- **Yetkiler**: Proxy ayarlarını değiştirebilmek için (bazı durumlarda) yönetici izni gerekebilir.

---

## 🚀 Kurulum

1. **İndirin**: Projenin [Releases](https://github.com/MuratGuelr/vexar-app/releases) sayfasından son sürüm (`.exe` veya `.msi`) dosyasını indirin.
2. **Kurun**: İndirdiğiniz dosyayı çalıştırın ve kurulum sihirbazını takip edin.
3. **Çalıştırın**: Masaüstündeki veya Başlat menüsündeki Vexar kısayoluna tıklayın.

> [!WARNING]
> **"Windows Kişisel Bilgisayarınızı Korudu" (SmartScreen) Uyarısı:**
> Uygulama henüz imzalanmadığı için Windows bu uyarıyı verebilir.
> 1. "Ek Bilgi" (More Info) yazısına tıklayın.
> 2. "Yine de Çalıştır" (Run Anyway) butonuna basın.

---

## 🎮 Kullanım

1. **Vexar** uygulamasını açın.
2. **Ayarlar** (dişli ikonu) menüsünden istediğiniz DNS sunucusunu seçebilirsiniz (Örn: Cloudflare).
3. Ana ekrandaki **"BAĞLAN"** butonuna basın.
4. "GÜVENLİ" yazısını gördüğünüzde işlem tamamdır. Artık Discord ve diğer engelli sitelere erişebilirsiniz.
5. Bağlantıyı kesmek için tekrar butona basmanız yeterlidir.

---

## 🛠 Geliştirme

Projeyi yerel ortamınızda geliştirmek için:

```bash
git clone https://github.com/MuratGuelr/vexar-app.git
cd vexar-windows
npm install
npm run tauri dev
```

Rust ve Node.js ortamlarının kurulu olması gerekir.

---

##  Destek

Bu proje açık kaynaklıdır ve topluluk desteğiyle geliştirilmektedir. Destek olmak isterseniz:

**GitHub Sponsor:**

[![Sponsor](https://img.shields.io/static/v1?label=Sponsor&message=%E2%9D%A4&logo=GitHub&color=%23fe8e86)](https://github.com/sponsors/MuratGuelr)

**Patreon:**

[![Patreon](https://img.shields.io/badge/MuratGuelr-purple?logo=patreon&label=Patreon)](https://www.patreon.com/posts/splitwire-for-v1-140359525)

---

## 📄 Lisans

```
Copyright © 2026 ConsolAktif

MIT License ile lisanslanmıştır.
Detaylar için LICENSE dosyasına bakın.
```

---

## 🔒 Gizlilik ve Veri Toplama

Vexar, geliştirmeyi desteklemek için **tamamen anonim** kullanım verileri toplar.
- **Toplanan Veriler:** Sadece teknik bilgiler (CPU, RAM, İşletim Sistemi Sürümü) ve temel kullanım istatistikleri.
- **Toplanmayanlar:** IP Adresi, Kişisel Kimlik, Konum, Gezilen Siteler, Dosyalar.
- **Kontrol Sizde:** Bu özellik Ayarlar menüsünden tamamen kapatılabilir (Opt-out).

---

## ⚖️ Sorumluluk Reddi

> [!IMPORTANT]
> **Bu yazılım eğitim ve erişilebilirlik amaçlı oluşturulmuştur.**

- ✅ Kodlama eğitimi ve kişisel kullanım için tasarlanmıştır.
- ❌ Ticari kullanım garantisi verilmez.
- ⚠️ Geliştirici, kullanımdan doğabilecek zararlardan sorumlu değildir.
- 📚 Kullanıcılar bu yazılımı kendi sorumlulukları altında kullanırlar.
- ⚖️ Bu araç sadece DPI kısıtlamalarını aşmak için yerel bir proxy oluşturur.
- 🔒 **Gizlilik Odaklı Analitik**: Uygulamayı geliştirebilmek için *tamamen anonim* kullanım verileri toplanır.
    - Hiçbir kişisel veri (IP, kullanıcı adı, dosya) **TOPLANMAZ**.
    - Bu özellik Ayarlar menüsünden tamamen kapatılabilir.

**Yasal Uyarı:** Bu programın kullanımından doğan her türlü yasal sorumluluk kullanıcıya aittir. Uygulama yalnızca eğitim ve araştırma amaçları ile geliştirilmiştir.

---

<div align="center">

**🚀 Vexar ile kesintisiz iletişim.**

Made with ❤️ by [ConsolAktif](https://github.com/MuratGuelr)

</div>
