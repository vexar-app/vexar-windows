import Settings from './Settings';
import { disable, enable, isEnabled } from '@tauri-apps/plugin-autostart';
import { useState, useRef, useEffect } from 'react';
import { Command } from '@tauri-apps/plugin-shell';
import { invoke } from '@tauri-apps/api/core';

// Re-add missing imports
import { Power, Shield, Settings as SettingsIcon, FileText, X, Copy, Trash2 } from 'lucide-react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import { exit } from '@tauri-apps/plugin-process';
import { db } from './firebase';
import { doc, setDoc, collection, serverTimestamp, increment } from "firebase/firestore";
import './App.css';

function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [logs, setLogs] = useState([]);
  const [currentPort, setCurrentPort] = useState(8080);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  // Settings State
  const [config, setConfig] = useState(() => {
    const saved = localStorage.getItem('vexar_config');
    return saved ? JSON.parse(saved) : {
      language: 'tr',
      autoStart: false,
      autoConnect: false,
      minimizeToTray: false,
      dnsMode: 'auto',
      selectedDns: 'cloudflare',
      autoReconnect: true,
      analytics: true
    };
  });

  const childProcess = useRef(null);
  const logsEndRef = useRef(null);
  const isRetrying = useRef(false);
  
  // ✅ Auto-reconnect mekanizması
  const retryCount = useRef(0);
  const retryTimer = useRef(null);
  const userIntentDisconnect = useRef(false);
  const lastTrackTime = useRef(0); // Telemetri zamanlayıcısı

  // Constants
  const DNS_MAP = {
    system: null, 
    cloudflare: '1.1.1.1',
    adguard: '94.140.14.14',
    google: '8.8.8.8',
    quad9: '9.9.9.9',
    opendns: '208.67.222.222'
  };


  const updateConfig = async (key, value) => {
    setConfig(prev => {
      const newConfig = { ...prev, [key]: value };
      localStorage.setItem('vexar_config', JSON.stringify(newConfig));
      return newConfig;
    });

    // Analytics Ayarı Senkronizasyonu
    if (key === 'analytics') {
       try {
           const deviceId = localStorage.getItem('vexar_device_id');
           if (deviceId) {
                await setDoc(doc(db, "devices", deviceId), {
                    telemetry_enabled: value,
                    last_config_update: serverTimestamp()
                }, { merge: true });
                console.log(`Telemetry preference updated: ${value}`);
           }
       } catch (e) {
           console.error("Failed to sync analytics setting:", e);
       }
    }
  };

  const trackConnectionSuccess = async () => {
      // Sadece analytics açıksa gönder
      if (!config.analytics) return;

      // Spam Koruması: Son 60 saniye içinde gönderildiyse atla
      const now = Date.now();
      if (now - lastTrackTime.current < 60000) return;
      lastTrackTime.current = now;

      const deviceId = localStorage.getItem('vexar_device_id');
      if (!deviceId) return;

      try {
          // KOTA DOSTU GÜNCELLEME: Event atmak yerine sadece profil güncelliyoruz.
          // Bu sayede veritabanı şişmiyor.
          await setDoc(doc(db, "devices", deviceId), {
              last_connected_at: serverTimestamp(),
              last_dns: config.selectedDns,
              last_dns_ip: DNS_MAP[config.selectedDns] || 'System',
              connection_count: increment(1), // +1 artırır
              platform: 'windows' // Garanti olsun
          }, { merge: true });

          // console.log("Veri tasarruflu bağlantı kaydı yapıldı.");
      } catch (e) {
          console.error("Connection telemetry failed:", e);
      }
  };

  const addLog = (msg, type = 'info') => {
    // Prevent empty messages
    if (!msg || msg.trim().length === 0) return;

    const cleanMsg = msg.replace(/\x1b\[[0-9;]*m/g, '');
    setLogs(prev => [...prev.slice(-99), { 
      id: Date.now() + Math.random(),
      time: new Date().toLocaleTimeString(), 
      msg: cleanMsg, 
      type 
    }]);
  };

  const [copyStatus, setCopyStatus] = useState('idle'); // idle, success, error

  const copyLogs = async () => {
    if (logs.length === 0) return;
    
    const logText = logs.map(l => `[${l.time}] ${l.msg}`).join('\n');
    
    try {
      await writeText(logText);
      setCopyStatus('success');
      setTimeout(() => setCopyStatus('idle'), 1500);
    } catch (e) {
      console.error('Tauri clipboard failed, trying navigator:', e);
      try {
        await navigator.clipboard.writeText(logText);
        setCopyStatus('success');
        setTimeout(() => setCopyStatus('idle'), 1500);
      } catch (navError) {
        console.error('Navigator clipboard also failed:', navError);
        setCopyStatus('error');
        setTimeout(() => setCopyStatus('idle'), 1500);
      }
    }
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const clearProxy = async (silent = false) => {
    try {
      await invoke('clear_system_proxy');
      if (!silent) {
        addLog('Sistem Proxy Temizlendi', 'success');
      }
    } catch (e) {
      addLog(`Proxy temizleme hatası: ${e}`, 'warn');
      console.error(e);
    }
  };

  // ✅ Exponential backoff hesaplama
  const getRetryDelay = (attempt) => {
    const delays = [0, 3000, 6000, 12000, 20000]; // 0s, 3s, 6s, 12s, 20s
    return delays[Math.min(attempt, delays.length - 1)];
  };

  // ✅ Tray tooltip güncelle
  const updateTrayTooltip = async (status) => {
    try {
      let tooltip = '';
      switch (status) {
        case 'connected':
          const dnsName = DNS_MAP[config.selectedDns] 
            ? Object.keys(DNS_MAP).find(key => DNS_MAP[key] === DNS_MAP[config.selectedDns])?.toUpperCase()
            : 'SYSTEM';
          tooltip = `🟢 Vexar - Bağlı\n127.0.0.1:${currentPort}\nDNS: ${dnsName}`;
          break;
        case 'disconnected':
          tooltip = '⚪ Vexar - Kapalı';
          break;
        case 'retrying':
          tooltip = `🟡 Vexar - Yeniden Bağlanıyor\nDeneme ${retryCount.current}/5...`;
          break;
        case 'connecting':
          tooltip = '🔵 Vexar - Bağlanıyor...';
          break;
        default:
          tooltip = 'Vexar';
      }
      await invoke('update_tray_tooltip', { tooltip });
    } catch (e) {
      console.error('Tray tooltip güncelleme hatası:', e);
    }
  };

  // ✅ Otomatik yeniden bağlanma
  const attemptReconnect = () => {
    // Timer varsa temizle
    if (retryTimer.current) {
      clearTimeout(retryTimer.current);
      retryTimer.current = null;
    }

    const currentAttempt = retryCount.current;
    const maxAttempts = 5;

    if (currentAttempt >= maxAttempts) {
      // Maksimum deneme aşıldı
      addLog('❌ Bağlantı kurulamadı. Maksimum deneme sayısına ulaşıldı.', 'error');
      addLog('', 'info');
      addLog('📋 Olası sebepler:', 'warn');
      addLog('  • İnternet bağlantınız kesilmiş olabilir', 'info');
      addLog('  • Firewall/Antivirüs Vexar\'ı engelliyor olabilir', 'info');
      addLog('  • 8080-8084 portları sistem tarafından kullanılıyor', 'info');
      addLog('', 'info');
      addLog('💡 Çözüm önerileri:', 'warn');
      addLog('  • İnternet bağlantınızı kontrol edin', 'info');
      addLog('  • Firewall ayarlarınızı kontrol edin', 'info');
      addLog('  • Uygulamayı yönetici olarak çalıştırın', 'info');
      addLog('  • Logları kopyalayıp destek için paylaşabilirsiniz', 'info');
      
      retryCount.current = 0;
      setIsProcessing(false);
      return;
    }

    const delay = getRetryDelay(currentAttempt);
    retryCount.current++;

    if (delay === 0) {
      addLog(`🔄 Yeniden bağlanılıyor... (Deneme ${currentAttempt + 1}/${maxAttempts})`, 'warn');
      startEngine(8080);
    } else {
      addLog(`⏳ ${delay / 1000} saniye sonra yeniden denenecek... (Deneme ${currentAttempt + 1}/${maxAttempts})`, 'warn');
      updateTrayTooltip('retrying'); // ✅ Retry durumu
      retryTimer.current = setTimeout(() => {
        addLog(`🔄 Yeniden bağlanılıyor...`, 'info');
        startEngine(8080);
      }, delay);
    }
  };

  // Wait for port to be ready
  const waitForPort = async (port, maxAttempts = 10) => {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        await fetch(`http://127.0.0.1:${port}`, {
          method: 'HEAD',
          signal: AbortSignal.timeout(500)
        });
        return true;
      } catch {
        await new Promise(r => setTimeout(r, 150)); // ✅ 300ms -> 150ms (Daha sık kontrol)
      }
    }
    return false;
  };

  const startEngine = async (port, portRetryCount = 0) => {
    updateTrayTooltip('connecting'); // ✅ Bağlanıyor durumu
    
    // Max 20 retries (genişletilmiş port aralığı için)
    if (portRetryCount >= 20) {
      addLog('Uygun port bulunamadı (8080-9000 meşgul)', 'error');
      setIsProcessing(false);
      return;
    }
    
    // Port range limit
    if (port > 9000) {
      addLog('Port aralığı aşıldı (Max: 9000).', 'error');
      setIsProcessing(false);
      return;
    }

    if (childProcess.current) return;
    await clearProxy(true);

    const dnsIP = DNS_MAP[config.selectedDns];
    
    addLog(`Vexar Motoru başlatılıyor (Port: ${port})...`, 'info');
    
    // DNS bilgisi
    if (dnsIP) {
      addLog(`Kullanılan DNS: ${config.selectedDns.toUpperCase()} (${dnsIP})`, 'info');
    } else {
      addLog(`DNS: Sistem Varsayılanı (SpoofDPI Default)`, 'info');
    }
    
    isRetrying.current = false;

    try {
      // Base arguments
      const args = ['-listen-port', port.toString()];
      
      // ✅ Sadece DNS seçiliyse ekle
      if (dnsIP) {
        args.push('-dns-addr', dnsIP);
      }
      
      // Diğer parametreler
      args.push(
        '-window-size', '1',
        '-enable-doh',              
        '-timeout', '60'
      );
      
      const command = Command.sidecar('binaries/spoofdpi', args);

      
      let connectionConfirmed = false;
      let isReady = false;

      // Optimized regex pattern - compiled once
      const SKIP_PATTERN = /\[(?:PROXY|DNS|HTTPS|CACHE)\]|method:\s*CONNECT|cache (?:miss|hit)|resolving|routing|resolution took|new conn|client sent hello|shouldExploit|useSystemDns|fragmentation|conn established|writing chunked|caching \d+ records|[a-f0-9]{8}-[a-f0-9]{8}|d88|Y88|88P|level=|ctrl \+ c|listen_addr|dns_addr|github\.com|spoofdpi/i;

      const handleOutput = async (line, type) => {
        const trimmedLine = line.trim();
        const lowerLine = line.toLowerCase();
        
        if (trimmedLine.length === 0) return;
        if (/^(DBG|INF|WRN|ERR)\s+\d{4}-/.test(trimmedLine)) return;
        if (line.includes('888')) return;

        if (SKIP_PATTERN.test(line)) return;

        // Optimized alpha check
        const alphaCount = line.replace(/[^a-zA-ZğüşıöçĞÜŞİÖÇ]/g, '').length;
        if (alphaCount < 5 && trimmedLine.length > 3) return;
        
        let friendlyMsg = null;
        
        if (lowerLine.includes('listening on') || lowerLine.includes('created a listener')) {
          isReady = true;
          friendlyMsg = `✓ SpoofDPI Motoru başlatıldı (Port: ${port})`;
        } else if (lowerLine.includes('server started')) {
          isReady = true;
          friendlyMsg = "✓ Vexar motoru aktif";
        } else if (lowerLine.includes('bind') || lowerLine.includes('usage') || lowerLine.includes('yuva adresi')) {
          friendlyMsg = `⚠ Port ${port} dolu, başka port deneniyor...`;
        } else if (lowerLine.includes('initializing')) {
          friendlyMsg = `⏳ Motor başlatılıyor...`;
        }
        
        if (friendlyMsg) {
          addLog(friendlyMsg, type === 'warn' ? 'warn' : 'success');
        }
        
        // Wait for port to be actually ready
        if (!connectionConfirmed && isReady) {
          connectionConfirmed = true;
          
          const portReady = await waitForPort(port);
          if (!portReady) {
            addLog(`Port ${port} açılamadı, yeniden deneniyor...`, 'warn');
            return;
          }
          
          setCurrentPort(port);
          try {
            await invoke('set_system_proxy', { port });
            addLog(`Sistem Proxy Ayarlandı: 127.0.0.1:${port}`, 'success');
          } catch (err) {
            addLog(`Proxy ayarlanamadı: ${err}`, 'error');
            return;
          }
          
          // ✅ Başarılı bağlantı - retry mekanizmasını sıfırla
          retryCount.current = 0;
          userIntentDisconnect.current = false;
          
          setIsConnected(true);
          setIsProcessing(false);
          addLog(`Güvenli Tünel Oluşturuldu`, 'success');
          updateTrayTooltip('connected'); 
          trackConnectionSuccess(); // Telemetri gönder
        }

        const isPortError = lowerLine.includes('bind') || 
                            lowerLine.includes('usage') || 
                            lowerLine.includes('listener') || 
                            lowerLine.includes('kullanıma izin veriliyor'); 

        if (isPortError && (lowerLine.includes('error') || lowerLine.includes('fail') || lowerLine.includes('ftl')) && !isRetrying.current) {
          isRetrying.current = true;
          
          if (childProcess.current) {
             childProcess.current.kill().catch(() => {});
             childProcess.current = null;
          }
          
          setTimeout(() => {
            startEngine(port + 1, portRetryCount + 1);
          }, 1000); 
        }
      };

      command.on('close', data => {
        if (!isRetrying.current) {
          const wasConnected = isConnected;
          const isUnexpectedClose = data.code !== 0 && data.code !== null;
          
          // ✅ ÖNCE user intent kontrol et
          if (userIntentDisconnect.current) {
            // Kullanıcı kasıtlı kapattı - normal mesaj göster
            addLog('Vexar motoru kapatıldı.', 'info');
            setIsConnected(false);
            setIsProcessing(false);
            childProcess.current = null;
            clearProxy(true).catch(console.error);
            
            // Reset flags
            retryCount.current = 0;
            userIntentDisconnect.current = false;
            return; // Erken çık, retry yapma
          }
          
          // Kullanıcı kasıtlı kapatmadı - beklenmedik kapanma
          if (isUnexpectedClose) {
              addLog(`⚠️ Vexar motoru beklenmedik şekilde durduruldu (Kod: ${data.code})`, 'warn');
          } else {
              addLog('Vexar motoru kapatıldı.', 'info');
          }
          
          // ✅ childProcess null yapılmadan önce backup al
          const hadActiveProcess = childProcess.current !== null;
          
          setIsConnected(false);
          setIsProcessing(false);
          childProcess.current = null;
          clearProxy(true).catch(console.error);
          updateTrayTooltip('disconnected'); // ✅ Bağlantı koptu (geçici)
          
          // ✅ Otomatik yeniden bağlanma kontrol
          const autoReconnectEnabled = configRef.current.autoReconnect !== false; // undefined veya true ise açık
          
          const shouldReconnect = 
            autoReconnectEnabled &&               // Ayarda açık mı?
            !userIntentDisconnect.current &&      // Kullanıcı kasıtlı kapatmadı mı?
            hadActiveProcess;                     // Process çalışıyor muydu?
          
          if (shouldReconnect) {
            addLog('🔄 Otomatik yeniden bağlanma aktif...', 'info');
            setIsProcessing(true);
            attemptReconnect();
          }
        }
      });

      command.stderr.on('data', line => handleOutput(line, 'warn'));
      command.stdout.on('data', line => handleOutput(line, 'info'));
      
      const child = await command.spawn();
      childProcess.current = child;

      // Failsafe timeout
      setTimeout(async () => {
        if (childProcess.current && !connectionConfirmed && !isRetrying.current) {
             connectionConfirmed = true;
             setCurrentPort(port);

             try {
                await invoke('set_system_proxy', { port: port });
                addLog(`Sistem Proxy Ayarlandı (Otomatik): 127.0.0.1:${port}`, 'success');
             } catch (err) {
                addLog(`Proxy ayarlanamadı: ${err}`, 'error');
             }

             // ✅ Başarılı bağlantı - retry mekanizmasını sıfırla
             retryCount.current = 0;
             userIntentDisconnect.current = false;

             setIsConnected(true);
             setIsProcessing(false);
             addLog(`Bağlantı doğrulandı (Otomatik)`, 'info');
             trackConnectionSuccess(); // Telemetri gönder
             updateTrayTooltip('connected'); // ✅ Auto-connect başarılı
        }
      }, 2000); // ✅ 3000ms -> 2000ms (Fail-safe timeout azaltıldı)

    } catch (e) {
      addLog(`Motor başlatılamadı: ${e}`, 'error');
      setIsConnected(false);
      setIsProcessing(false);
      clearProxy();
    }
  };

  const toggleConnection = async () => {
    if (isProcessing) return;

    if (isConnected) {
      // ✅ Kullanıcı kasıtlı olarak bağlantıyı kesiyor
      userIntentDisconnect.current = true;
      
      // Retry timer varsa iptal et
      if (retryTimer.current) {
        clearTimeout(retryTimer.current);
        retryTimer.current = null;
      }
      
      setIsProcessing(true);
      if (childProcess.current) {
        try {
          addLog('Vexar Motoru durduruluyor...', 'warn');
          await childProcess.current.kill();
        } catch (e) {
          addLog(`Servis durdurma hatası: ${e}`, 'error');
        }
        childProcess.current = null;
      }
      setIsConnected(false);
      await clearProxy(); 
      addLog('Servis Durduruldu', 'success');
      setIsProcessing(false);
      updateTrayTooltip('disconnected'); // ✅ Manuel durdurma
    } else {
      // ✅ Kullanıcı manuel bağlanıyor - retry counter sıfırla
      retryCount.current = 0;
      userIntentDisconnect.current = false;
      
      setIsProcessing(true);
      startEngine(8080);
    }
  };

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const configRef = useRef(config);

  useEffect(() => {
    configRef.current = config;
  }, [config]);

  useEffect(() => {
    // Initial cleanup on mount
    (async () => {
      try {
        await clearProxy(true);
        updateTrayTooltip('disconnected');
      } catch (e) {
        console.error('Initial proxy cleanup failed:', e);
      }
    })();
    
    // Listen for window close event
    const initListener = async () => {
      const win = getCurrentWindow();
      const unlisten = await win.onCloseRequested(async (event) => {
        event.preventDefault();
        
        if (configRef.current.minimizeToTray) {
          try {
            await win.hide();
          } catch (e) {
            console.error("Failed to hide window:", e);
          }
          return;
        }

        // ✅ Timer'ı temizle
        if (retryTimer.current) {
          clearTimeout(retryTimer.current);
          retryTimer.current = null;
        }

        try {
          if (childProcess.current) {
            await childProcess.current.kill().catch(() => {}); 
          }
          await clearProxy(true);
        } catch (e) {
          console.error('Cleanup failed:', e);
        }
        await exit(0);
      });
      return unlisten;
    };

    let unlistenFn;
    initListener().then(fn => unlistenFn = fn);

    return () => {
      if (unlistenFn) unlistenFn();
      
      // ✅ Retry timer'ı temizle
      if (retryTimer.current) {
        clearTimeout(retryTimer.current);
        retryTimer.current = null;
      }
      
      // Cleanup on unmount
      const cleanup = async () => {
        if (childProcess.current) {
          try {
            await childProcess.current.kill();
            childProcess.current = null;
          } catch (e) {
            console.error('Process kill failed:', e);
          }
        }
        try {
          await invoke('clear_system_proxy');
        } catch (e) {
          console.error('Proxy cleanup failed:', e);
        }
      };
      
      cleanup();
    };
  }, []);

 const handleExit = async () => {
    addLog('Kapatma başlatılıyor...', 'warn');
    
    // ✅ Timer'ı temizle
    if (retryTimer.current) {
      clearTimeout(retryTimer.current);
      retryTimer.current = null;
    }
    
    try {
      if (childProcess.current) {
        await childProcess.current.kill().catch(() => {}); 
        addLog('İşlem sonlandırıldı', 'success');
      }
      await clearProxy(true);
      
      await getCurrentWindow().close().catch(() => {});
      await exit(0);
    } catch (e) {
      await exit(1);
    }
  };

  // Telemetry: Collect anonymous hardware stats on first run
  useEffect(() => {
    const initTelemetry = async () => {
      // 1. Config kontrolü
      if (!configRef.current.analytics) return;

      const storedId = localStorage.getItem('vexar_device_id');
      const isSent = localStorage.getItem('vexar_telemetry_sent');
      const telemetryVersion = '1.0.0';

      // 2. ID varsa ve zaten gönderilmişse (ve versiyon aynıysa) çık (Log ekle)
      const sentVersion = localStorage.getItem('vexar_telemetry_version');
      if (storedId && isSent && sentVersion === telemetryVersion) {
         return;
      }

      try {
        // 3. ID Üret (yoksa)
        const deviceId = storedId || crypto.randomUUID();
        if (!storedId) localStorage.setItem('vexar_device_id', deviceId);

        // 4. Sistem özelliklerini çek (Rust)
        const specs = await invoke('get_system_specs');
             
        // 5. Firebase'e gönder - SADECE DEVICES (macOS gibi, kota dostu)
        await setDoc(doc(db, "devices", deviceId), {
           // Sistem bilgileri (Windows-specific naming)
           device_info_collected: true,
           device_collected_at: serverTimestamp(),
           device_cpu: specs.cpu_model,
           device_ram_gb: specs.total_memory_gb,
           device_gpu: specs.gpu_model,
           device_disk_type: specs.disk_type,
           device_os_version: specs.os_version,
           device_monitor: specs.monitor_info,
           device_network_type: specs.network_type,
           device_type: specs.device_type,
           
           // Uygulama bilgileri
           platform: 'windows',
           app_version: '0.1.0', 
           installed_at: serverTimestamp(),
           last_seen: serverTimestamp(),
           telemetry_enabled: true,
           telemetry_version: telemetryVersion
        }, { merge: true });
             
        localStorage.setItem('vexar_telemetry_sent', 'true');
        localStorage.setItem('vexar_telemetry_version', telemetryVersion);
        
        console.log('✅ Device info collected (Windows):', deviceId);

      } catch (e) {
         console.error('Telemetry error:', e);
      }
    };
    
    // Ufak bir gecikme ile çalışsın
    const timer = setTimeout(initTelemetry, 5000);
    return () => clearTimeout(timer);
  }, []); 

  // Auto-connect on mount
  useEffect(() => {
    const shouldAutoConnect = configRef.current.autoConnect;
    let isMounted = true;
    
    if (shouldAutoConnect && !childProcess.current) {
      const timeoutId = setTimeout(() => {
        if (!childProcess.current && isMounted) {
          setIsProcessing(true);
          startEngine(8080);
        }
      }, 300); // ✅ 1000ms -> 300ms (Uygulama açılışında daha hızlı bağlan)
      
      return () => {
        isMounted = false;
        clearTimeout(timeoutId);
      };
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Native App Experience: Disable browser-like behaviors
  useEffect(() => {
    // Disable right-click
    const handleContextMenu = (e) => e.preventDefault();
    
    // Disable refresh and dev shortcuts
    const handleKeyDown = (e) => {
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;
      
      // Block F5, F11 (Fullscreen), F12
      if (['F5', 'F11', 'F12'].includes(e.key)) {
        e.preventDefault();
      }

      // Block Ctrl+R, Ctrl+Shift+R, Ctrl+Shift+I, Ctrl+P, Ctrl+S, Ctrl+U (View Source)
      if (isCmdOrCtrl && ['r', 'R', 'i', 'I', 'p', 'P', 's', 'S', 'u', 'U'].includes(e.key)) {
        e.preventDefault();
      }
    };

    // Prevent accidental text selection (optional but recommended for buttons/UI)
    // and prevent dragging of images/links
    const handleDragStart = (e) => e.preventDefault();

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('dragstart', handleDragStart);

    // CSS level text selection prevention (best for all browsers)
    document.body.style.userSelect = 'none';
    document.body.style.webkitUserSelect = 'none';

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('dragstart', handleDragStart);
    };
  }, []);

  // Render
  return (
    <div className="app-container fade-in">
      {/* Header */}
      <header className="app-header">
        <div className="brand">
          <img src="/vexar-logo.png" alt="Vexar" className="brand-logo" />
          <span className="brand-name">VEXAR</span>
        </div>
        <div className={`status-badge ${isConnected ? 'active' : (isProcessing ? 'processing' : 'passive')}`}>
          <div className="status-dot" />
          <span>
            {isProcessing 
              ? (isConnected ? 'KESİLİYOR...' : 'BAĞLANIYOR...') 
              : (isConnected ? 'AKTİF' : 'PASİF')}
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="main-content">
        <div className="shield-wrapper">
          <div className={`shield-circle ${isConnected ? 'connected' : (isProcessing ? 'processing' : '')}`}>
            <Shield 
              size={56} 
              strokeWidth={1.5}
              className="shield-icon"
            />
          </div>
        </div>

        <div className="status-text">
          <h1 className={`status-title ${isConnected ? 'connected' : (isProcessing ? 'processing' : '')}`}>
            {isProcessing 
              ? (isConnected ? 'KESİLİYOR...' : 'BAĞLANIYOR...')
              : (isConnected ? 'GÜVENLİ' : 'HAZIR')}
          </h1>
          <p className="status-desc">
            {isProcessing
              ? "İşlem yapılıyor, lütfen bekleyin."
              : (isConnected 
                  ? "Bağlantınız şifrelendi ve korunuyor."
                  : "DPI Bypass için bağlanın.")}
          </p>
        </div>
      </main>

      {/* Action Button */}
      <div className="action-area">
        <button 
          className={`main-btn ${isConnected ? 'disconnect' : 'connect'} ${isProcessing ? 'processing' : ''}`}
          onClick={toggleConnection}
          disabled={isProcessing}
        >
          <Power size={22} strokeWidth={2.5} />
          <span>
            {isProcessing 
              ? (isConnected ? 'KESİLİYOR...' : 'BAĞLANIYOR...')
              : (isConnected ? 'BAĞLANTIYI KES' : 'BAĞLAN')
            }
          </span>
        </button>
      </div>

      {/* Bottom Navigation */}
      <nav className="bottom-nav">
        <button className="nav-btn" onClick={() => setShowSettings(true)}>
          <SettingsIcon size={22} strokeWidth={2} />
          <span>AYARLAR</span>
        </button>
        <div className="nav-divider" />
        <button className="nav-btn" onClick={() => setShowLogs(true)}>
          <FileText size={22} strokeWidth={2} />
          <span>LOGLAR</span>
        </button>
        <div className="nav-divider" />
        <button className="nav-btn exit" onClick={handleExit}>
          <Power size={22} strokeWidth={2} />
          <span>ÇIKIŞ</span>
        </button>
      </nav>

      {showLogs && (
        <div className="logs-overlay">
          <div className="logs-header">
            <button className="logs-back-btn" onClick={() => setShowLogs(false)}>
              <X size={24} />
            </button>
            <div className="logs-title">
              <FileText size={20} className="logs-title-icon" />
              <h3>SİSTEM LOGLARI</h3>
            </div>
          </div>

          <div className="console-content">
            {logs.map((log, index) => (
              <div key={log.id} className={`log-line log-${log.type}`}>
                <span className="log-number">{String(index + 1).padStart(3, '0')}</span>
                <span className="log-time">[{log.time}]</span>
                <span className="log-msg">{log.msg}</span>
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>

          <div className="logs-footer">
            <button className="logs-action-btn clear-btn" onClick={clearLogs}>
              <Trash2 size={18} />
              <span>TEMİZLE</span>
            </button>
            <button 
              className={`logs-action-btn copy-btn ${copyStatus}`} 
              onClick={copyLogs}
              disabled={logs.length === 0}
            >
              <Copy size={18} />
              <span>{copyStatus === 'success' ? 'KOPYALANDI!' : copyStatus === 'error' ? 'HATA!' : 'KOPYALA'}</span>
            </button>
          </div>
        </div>
      )}

      {showSettings && (
        <Settings 
          onBack={() => setShowSettings(false)} 
          config={config} 
          updateConfig={updateConfig} 
        />
      )}
    </div>
  );
}

export default App;
