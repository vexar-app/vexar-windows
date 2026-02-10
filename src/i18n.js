const translations = {
  tr: {
    // ===== APP.JSX - Header =====
    appName: 'VEXAR',
    statusActive: 'AKTİF',
    statusInactive: 'KESİK',
    statusReady: 'HAZIR',

    // ===== APP.JSX - Main Status =====
    statusConnected: 'GÜVENLİ',
    statusConnecting: 'BAĞLANIYOR...',
    statusDisconnecting: 'KESİLİYOR...',
    statusReady2: 'HAZIR',
    descConnected: 'Bağlantınız şifrelendi ve korunuyor.',
    descConnecting: 'İşlem yapılıyor, lütfen bekleyin.',
    descReady: 'DPI Bypass için bağlanın.',

    // ===== APP.JSX - Buttons =====
    btnConnect: 'BAĞLAN',
    btnDisconnect: 'BAĞLANTIYI KES',
    btnConnecting: 'BAĞLANIYOR...',
    btnDisconnecting: 'KESİLİYOR...',
    btnConnectDevices: 'Diğer Cihazları Bağla',

    // ===== APP.JSX - Bottom Nav =====
    navSettings: 'AYARLAR',
    navLogs: 'LOGLAR',
    navExit: 'ÇIKIŞ',

    // ===== APP.JSX - Logs Panel =====
    logsTitle: 'SİSTEM LOGLARI',
    logsClear: 'TEMİZLE',
    logsCopy: 'KOPYALA',
    logsCopied: 'KOPYALANDI!',
    logsCopyError: 'HATA!',

    // ===== APP.JSX - Connection Modal =====
    modalTitle: 'Cihaz Bağlama',
    modalSubtitle: 'LAN Paylaşımı',
    modalDesc: 'Cihazınızın Wi-Fi ayarlarında <strong>Proxy</strong> kısmını <strong>Manuel</strong> yapın ve bilgileri girin.',
    modalHost: 'Sunucu (Host)',
    modalPort: 'Port',
    modalTutorial: 'Nasıl Yapılır? (Rehber)',

    // ===== APP.JSX - Admin Modal =====
    adminTitle: 'Yönetici İzni Gerekli',
    adminDesc: 'Vexar\'ın düzgün çalışması için yönetici olarak çalıştırılması gereklidir.',
    adminStep: 'Uygulamaya sağ tıklayın → "Yönetici olarak çalıştır" seçin',
    adminClose: 'KAPAT',

    // ===== APP.JSX - No Internet =====
    noInternetTitle: 'İnternet Bağlantısı Yok',
    noInternetDesc: 'Lütfen internet bağlantınızı kontrol edin.',
    noInternetRetry: 'Tekrar Dene',

    // ===== APP.JSX - Log Messages =====
    logEngineStarting: (port) => `Vexar Motoru başlatılıyor (Port: ${port})...`,
    logDnsUsed: (name, ip) => `Kullanılan DNS: ${name} (${ip})`,
    logDnsDefault: 'DNS: Sistem Varsayılanı',
    logConnected: 'Bağlantı başarılı! Trafik şifreleniyor.',
    logDisconnected: 'Bağlantı kesildi.',
    logProxySet: (port) => `Sistem Proxy ayarlandı: 127.0.0.1:${port}`,
    logProxyCleared: 'Sistem Proxy Temizlendi',
    logEngineStopped: (code) => `Vexar motoru beklenmedik şekilde durduruldu (Kod: ${code})`,
    logEngineStartError: (err) => `Motor başlatılamadı: ${err}`,
    logAutoReconnect: 'Otomatik yeniden bağlanma aktif...',
    logReconnecting: (n) => `Yeniden bağlanılıyor... (Deneme ${n}/5)`,
    logReconnectWait: (sec, n) => `${sec} saniye sonra yeniden denenecek... (Deneme ${n}/5)`,
    logReconnectNow: 'Yeniden bağlanılıyor...',
    logMaxRetries: 'Bağlantı kurulamadı. Maksimum deneme sayısına ulaşıldı.',
    logPossibleReasons: 'Olası sebepler:',
    logReasonInternet: 'İnternet bağlantınız kesilmiş olabilir',
    logReasonFirewall: 'Firewall/Antivirüs Vexar\'ı engelliyor olabilir',
    logReasonPorts: '8080-8084 portları sistem tarafından kullanılıyor',
    logSolutions: 'Çözüm önerileri:',
    logSolInternet: 'İnternet bağlantınızı kontrol edin',
    logSolFirewall: 'Firewall ayarlarınızı kontrol edin',
    logSolAdmin: 'Uygulamayı yönetici olarak çalıştırın',
    logSolLogs: 'Logları kopyalayıp destek için paylaşabilirsiniz',
    logLanRestart: 'Ağ ayarları değişti, servis yeniden başlatılıyor...',
    logConfigError: (err) => `Yapılandırma hatası: ${err}`,
    logAdminMissing: 'Yönetici izni eksik! Uygulama düzgün çalışmayabilir.',
    logInternetBack: 'İnternet bağlantısı tekrar sağlandı.',
    logInternetLost: 'İnternet bağlantısı kesildi!',
    logPortRetry: (count) => `Port çakışması, yeni port deneniyor... (${count}/20)`,
    logNoPort: 'Uygun port bulunamadı.',

    // ===== SETTINGS.JSX =====
    settingsTitle: 'AYARLAR',

    // Section: Connection Method
    sectionMethod: 'BAĞLANTI YÖNTEMİ',
    methodStrong: 'Güçlü Mod',
    methodStrongDesc: 'Yüksek engelleme aşma kapasitesi',
    methodFast: 'Hızlı Mod (Önerilen)',
    methodFastDesc: 'Daha düşük işlemci kullanımı, günlük kullanım için ideal',

    // Section: Network
    sectionNetwork: 'AĞ AYARLARI',
    lanSharing: 'Yerel Ağ Paylaşımı',
    lanSharingDesc: 'Diğer cihazlardan (Tel, Konsol) bağlanmaya izin ver',

    // Section: Automation
    sectionAutomation: 'OTOMASYON',
    autoConnect: 'Otomatik Bağlan',
    autoConnectDesc: 'Uygulama açılır açılmaz bağlan',
    autoReconnect: 'Otomatik Yeniden Bağlan',
    autoReconnectDesc: 'Bağlantı koparsa otomatik yeniden dene',

    // Section: General
    sectionGeneral: 'GENEL',
    autoStart: 'Başlangıçta Çalıştır',
    autoStartDesc: 'Windows açılınca Vexar\'ı başlat',
    minimizeToTray: 'Tepsiye Küçült',
    minimizeToTrayDesc: 'Kapatıldığında arka planda çalışsın',
    language: 'Uygulama Dili',
    languageDesc: 'Arayüz dilini değiştirin',

    // Section: Privacy
    sectionPrivacy: 'GİZLİLİK',
    analytics: 'Anonim Veri Toplama',
    analyticsDesc: 'Uygulama kullanımını geliştirmek için veri paylaş',

    // Section: DNS
    sectionDns: 'DNS LİSTESİ',
    dnsAutoSelect: 'Otomatik Seçim (Önerilen)',
    dnsAutoSelectDesc: 'En hızlı sunucuyu otomatik bulur',
    dnsSystemDefault: 'Sistem Varsayılanı',
    dnsSystemDefaultDesc: 'SpoofDPI Varsayılan DNS',
    dnsCfDesc: 'Hızlı ve Gizli',
    dnsAdguardDesc: 'Reklam Engelleyici',
    dnsGoogleDesc: 'Güvenilir',
    dnsQuad9Desc: 'Güvenlik Odaklı',
    dnsOpenDnsDesc: 'Cisco Güvencesi',

    // Section: Troubleshooting
    sectionTroubleshoot: 'SORUN GİDERME',
    fixInternet: 'İnternet Bağlantısını Onar',
    fixInternetDesc: 'Proxy takılı kalırsa interneti otomatik düzeltir.',
    fixRepairing: 'Onarılıyor...',
    fixRepairingDesc: 'Sistem ayarları sıfırlanıyor, lütfen bekleyin.',
    fixDone: 'Onarıldı!',
    fixDoneDesc: 'Proxy ayarları temizlendi ve internet onarıldı.',
    fixError: 'Hata Oluştu!',
    fixErrorDesc: 'İşlem sırasında bir sorun meydana geldi.',

    // Section: Developer
    sectionDev: 'GELİŞTİRİCİ',
    devRole: 'Vexar Geliştiricisi',
    devSubscribe: 'Abone Ol',
    devSupport: 'Destekle',

    // Section: Important Notice
    sectionNotice: 'ÖNEMLİ BİLGİ',
    noticeTitle: 'Güvenlik ve Yanlış Pozitif',
    noticeDesc: 'Vexar motoru, Windows Defender AI gibi yapay zeka tabanlı sistemler tarafından bazen "yanlış pozitif" olarak algılanabilir. Bu durum tamamen zararsızdır. Ayrıca Kaspersky, ESET gibi yazılımlar HTTPS tarama özelliğiyle bağlantıyı engelleyebilir. Erişim sorunu yaşarsanız bu ayarları kontrol edin.',
  },

  en: {
    // ===== APP.JSX - Header =====
    appName: 'VEXAR',
    statusActive: 'ACTIVE',
    statusInactive: 'OFF',
    statusReady: 'READY',

    // ===== APP.JSX - Main Status =====
    statusConnected: 'SECURE',
    statusConnecting: 'CONNECTING...',
    statusDisconnecting: 'DISCONNECTING...',
    statusReady2: 'READY',
    descConnected: 'Your connection is encrypted and protected.',
    descConnecting: 'Processing, please wait.',
    descReady: 'Connect for DPI Bypass.',

    // ===== APP.JSX - Buttons =====
    btnConnect: 'CONNECT',
    btnDisconnect: 'DISCONNECT',
    btnConnecting: 'CONNECTING...',
    btnDisconnecting: 'DISCONNECTING...',
    btnConnectDevices: 'Connect Other Devices',

    // ===== APP.JSX - Bottom Nav =====
    navSettings: 'SETTINGS',
    navLogs: 'LOGS',
    navExit: 'EXIT',

    // ===== APP.JSX - Logs Panel =====
    logsTitle: 'SYSTEM LOGS',
    logsClear: 'CLEAR',
    logsCopy: 'COPY',
    logsCopied: 'COPIED!',
    logsCopyError: 'ERROR!',

    // ===== APP.JSX - Connection Modal =====
    modalTitle: 'Connect Device',
    modalSubtitle: 'LAN Sharing',
    modalDesc: 'Go to your device\'s Wi-Fi settings, set <strong>Proxy</strong> to <strong>Manual</strong> and enter the details below.',
    modalHost: 'Server (Host)',
    modalPort: 'Port',
    modalTutorial: 'How To? (Guide)',

    // ===== APP.JSX - Admin Modal =====
    adminTitle: 'Administrator Required',
    adminDesc: 'Vexar needs to run as administrator to work correctly.',
    adminStep: 'Right-click the app → Select "Run as administrator"',
    adminClose: 'CLOSE',

    // ===== APP.JSX - No Internet =====
    noInternetTitle: 'No Internet Connection',
    noInternetDesc: 'Please check your internet connection.',
    noInternetRetry: 'Retry',

    // ===== APP.JSX - Log Messages =====
    logEngineStarting: (port) => `Vexar Engine starting (Port: ${port})...`,
    logDnsUsed: (name, ip) => `DNS: ${name} (${ip})`,
    logDnsDefault: 'DNS: System Default',
    logConnected: 'Connection successful! Traffic is encrypted.',
    logDisconnected: 'Disconnected.',
    logProxySet: (port) => `System Proxy set: 127.0.0.1:${port}`,
    logProxyCleared: 'System Proxy Cleared',
    logEngineStopped: (code) => `Vexar engine stopped unexpectedly (Code: ${code})`,
    logEngineStartError: (err) => `Engine failed to start: ${err}`,
    logAutoReconnect: 'Auto-reconnect enabled...',
    logReconnecting: (n) => `Reconnecting... (Attempt ${n}/5)`,
    logReconnectWait: (sec, n) => `Retrying in ${sec} seconds... (Attempt ${n}/5)`,
    logReconnectNow: 'Reconnecting...',
    logMaxRetries: 'Connection failed. Maximum attempts reached.',
    logPossibleReasons: 'Possible reasons:',
    logReasonInternet: 'Your internet may be disconnected',
    logReasonFirewall: 'Firewall/Antivirus may be blocking Vexar',
    logReasonPorts: 'Ports 8080-8084 may be in use',
    logSolutions: 'Suggested solutions:',
    logSolInternet: 'Check your internet connection',
    logSolFirewall: 'Check your firewall settings',
    logSolAdmin: 'Run the application as administrator',
    logSolLogs: 'Copy and share logs for support',
    logLanRestart: 'Network settings changed, restarting service...',
    logConfigError: (err) => `Configuration error: ${err}`,
    logAdminMissing: 'Admin permission missing! App may not work correctly.',
    logInternetBack: 'Internet connection restored.',
    logInternetLost: 'Internet connection lost!',
    logPortRetry: (count) => `Port conflict, trying new port... (${count}/20)`,
    logNoPort: 'No available port found.',

    // ===== SETTINGS.JSX =====
    settingsTitle: 'SETTINGS',

    // Section: Connection Method
    sectionMethod: 'CONNECTION METHOD',
    methodStrong: 'Strong Mode',
    methodStrongDesc: 'High bypass capability',
    methodFast: 'Fast Mode (Recommended)',
    methodFastDesc: 'Lower CPU usage, ideal for daily use',

    // Section: Network
    sectionNetwork: 'NETWORK',
    lanSharing: 'LAN Sharing',
    lanSharingDesc: 'Allow connections from other devices (Phone, Console)',

    // Section: Automation
    sectionAutomation: 'AUTOMATION',
    autoConnect: 'Auto Connect',
    autoConnectDesc: 'Connect as soon as the app opens',
    autoReconnect: 'Auto Reconnect',
    autoReconnectDesc: 'Automatically retry if connection drops',

    // Section: General
    sectionGeneral: 'GENERAL',
    autoStart: 'Start at Boot',
    autoStartDesc: 'Launch Vexar when Windows starts',
    minimizeToTray: 'Minimize to Tray',
    minimizeToTrayDesc: 'Run in background when closed',
    language: 'Language',
    languageDesc: 'Change interface language',

    // Section: Privacy
    sectionPrivacy: 'PRIVACY',
    analytics: 'Anonymous Data Collection',
    analyticsDesc: 'Share usage data to improve the app',

    // Section: DNS
    sectionDns: 'DNS LIST',
    dnsAutoSelect: 'Auto Select (Recommended)',
    dnsAutoSelectDesc: 'Automatically finds the fastest server',
    dnsSystemDefault: 'System Default',
    dnsSystemDefaultDesc: 'SpoofDPI Default DNS',
    dnsCfDesc: 'Fast & Private',
    dnsAdguardDesc: 'Ad Blocker',
    dnsGoogleDesc: 'Reliable',
    dnsQuad9Desc: 'Security Focused',
    dnsOpenDnsDesc: 'Powered by Cisco',

    // Section: Troubleshooting
    sectionTroubleshoot: 'TROUBLESHOOTING',
    fixInternet: 'Fix Internet Connection',
    fixInternetDesc: 'Fixes internet if proxy gets stuck.',
    fixRepairing: 'Repairing...',
    fixRepairingDesc: 'Resetting system settings, please wait.',
    fixDone: 'Repaired!',
    fixDoneDesc: 'Proxy settings cleared, internet restored.',
    fixError: 'Error Occurred!',
    fixErrorDesc: 'Something went wrong during the process.',

    // Section: Developer
    sectionDev: 'DEVELOPER',
    devRole: 'Vexar Developer',
    devSubscribe: 'Subscribe',
    devSupport: 'Support',

    // Section: Important Notice
    sectionNotice: 'IMPORTANT',
    noticeTitle: 'Security & False Positives',
    noticeDesc: 'The Vexar engine may sometimes be flagged as a "false positive" by AI-based systems like Windows Defender. This is completely harmless. Also, antivirus software like Kaspersky or ESET may block connections with their HTTPS scanning. If you experience issues, check those settings.',
  }
};

// Aktif dili getiren hook/fonksiyon
export const getTranslations = (lang = 'tr') => {
  return translations[lang] || translations.tr;
};

export const SUPPORTED_LANGUAGES = [
  { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
];

export default translations;
