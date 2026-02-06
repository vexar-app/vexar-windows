import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, Globe, Wand2, Power, Zap, RotateCw, 
  Shield, Trash2, Youtube, Coffee, AlertTriangle, Check, Wrench
} from 'lucide-react';
import { enable, disable, isEnabled } from '@tauri-apps/plugin-autostart';
import { open, Command } from '@tauri-apps/plugin-shell';
import { invoke } from '@tauri-apps/api/core';
import './App.css';

const DNS_PROVIDERS = [
  { id: 'system', name: 'Sistem Varsayılanı', desc: 'SpoofDPI Varsayılan DNS', ip: null },
  { id: 'cloudflare', name: 'Cloudflare', desc: 'Hızlı ve Gizli', ip: '1.1.1.1' },
  { id: 'adguard', name: 'AdGuard', desc: 'Reklam Engelleyici', ip: '94.140.14.14' },
  { id: 'google', name: 'Google', desc: 'Güvenilir', ip: '8.8.8.8' },
  { id: 'quad9', name: 'Quad9', desc: 'Güvenlik Odaklı', ip: '9.9.9.9' },
  { id: 'opendns', name: 'OpenDNS', desc: 'Cisco Güvencesi', ip: '208.67.222.222' }
];


const Toggle = ({ checked, onChange }) => (
  <div 
    className={`v2-toggle ${checked ? 'active' : ''}`}
    onClick={(e) => {
      e.stopPropagation();
      onChange(!checked);
    }}
  >
    <div className="v2-toggle-thumb" />
  </div>
);

const Settings = ({ onBack, config, updateConfig }) => {
  const [latencies, setLatencies] = useState({});
  const [isChecking, setIsChecking] = useState(false);
  const [autostartEnabled, setAutostartEnabled] = useState(false);
  const [sortedProviders, setSortedProviders] = useState(DNS_PROVIDERS);
  const [fixStatus, setFixStatus] = useState('idle'); // idle, fixing, fixed, error

  useEffect(() => {
    checkAutostart();
  }, []);

  useEffect(() => {
    if (config.dnsMode === 'auto') {
      checkAllLatencies();
    }
  }, [config.dnsMode]);

  const checkAutostart = async () => {
    try {
      const active = await isEnabled();
      setAutostartEnabled(active);
    } catch (e) {
      console.error('Autostart check failed:', e);
    }
  };

  const toggleAutostart = async (val) => {
    try {
      if (val) {
        await enable();
      } else {
        await disable();
      }
      setAutostartEnabled(val);
      updateConfig('autoStart', val);
    } catch (e) {
      console.error('Autostart toggle failed:', e);
    }
  };

  const checkAllLatencies = async () => {
    setIsChecking(true);
    const newLatencies = {};
    
    // ✅ System DNS'i ping'den hariç tut (IP'si yok)
    const pingableProviders = DNS_PROVIDERS.filter(p => p.ip !== null);
    
    // ✅ Adaptive Timeout: Network tipine göre süre ayarla
    const isSlowConnection = navigator.connection?.effectiveType === '3g' || navigator.connection?.effectiveType === '2g';
    const TIMEOUT_MS = isSlowConnection ? 3000 : 1500;

    // ✅ Promise.allSettled kullan (bir hata tümünü durdurmaz)
    const results = await Promise.allSettled(
      pingableProviders.map(async (provider) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS + 500); 
        
        try {
          const command = Command.create('ping', [
            provider.ip, 
            '-n', '1', 
            '-w', String(TIMEOUT_MS) 
          ]);
          
          const output = await command.execute();
          clearTimeout(timeoutId);
          
          const match = output.stdout.match(/(?:time|süre|zaman)[=<\s]+([\d]+)\s*ms/i);
          return { id: provider.id, latency: match ? parseInt(match[1], 10) : 999 };
        } catch (e) {
          clearTimeout(timeoutId);
          console.error(`Ping failed for ${provider.name}:`, e);
          return { id: provider.id, latency: 999 };
        }
      })
    );

    
    // ✅ Sonuçları işle
    results.forEach(result => {
      if (result.status === 'fulfilled') {
        newLatencies[result.value.id] = result.value.latency;
      }
    });
    
    setLatencies(newLatencies);
    
    // ✅ Sıralama: System DNS her zaman en üstte, diğerleri latency'e göre
    const systemDns = DNS_PROVIDERS.find(p => p.id === 'system');
    const otherDns = DNS_PROVIDERS.filter(p => p.id !== 'system').sort((a, b) => 
      (newLatencies[a.id] || 999) - (newLatencies[b.id] || 999)
    );
    
    const sorted = systemDns ? [systemDns, ...otherDns] : otherDns;
    
    setSortedProviders(sorted);
    
    // ✅ Auto modda en iyi DNS'i seç (system hariç)
    if (config.dnsMode === 'auto') {
      const bestDns = otherDns[0]; // En iyi ping sonucu
      if (bestDns) {
        updateConfig('selectedDns', bestDns.id);
      }
    }

    
    setIsChecking(false);
  };

  const handleFixInternet = async () => {
    setFixStatus('fixing');
    
    // Artificial delay for better UX feel
    setTimeout(async () => {
      try {
        await invoke('clear_system_proxy');
        setFixStatus('fixed');
        setTimeout(() => setFixStatus('idle'), 2000);
      } catch (e) {
        console.error('Fix failed:', e);
        setFixStatus('error');
        setTimeout(() => setFixStatus('idle'), 2000);
      }
    }, 1200); // 1.2s delay to show "Repairing" status
  };

  return (
    <div className="v2-settings-overlay">
      {/* Header */}
      <div className="v2-settings-header">
        <button className="v2-back-btn" onClick={onBack}>
          <ChevronLeft size={28} />
        </button>
        <h1>AYARLAR</h1>
      </div>

      {/* Scrollable Content */}
      <div className="v2-settings-content">
        
        {/* Section: Language */}
        <div className="v2-section">
          <div className="v2-section-title">DİL</div>
          <div className="v2-card">
            <div className="v2-item">
              <div className="v2-icon blue"><Globe size={20} /></div>
              <div className="v2-item-text">
                <h3>Uygulama Dili</h3>
                <p>Türkçe varsayılan dildir.</p>
              </div>
              <div className="v2-badge">TR</div>
            </div>
          </div>
        </div>

        {/* Section: General */}
        <div className="v2-section">
          <div className="v2-section-title">GENEL</div>
          <div className="v2-card">
            
            <div className="v2-item">
              <div className="v2-icon green"><Power size={20} /></div>
              <div className="v2-item-text">
                <h3>Başlangıçta Çalıştır</h3>
                <p>Windows açılınca Vexar'ı başlat</p>
              </div>
              <Toggle checked={autostartEnabled} onChange={toggleAutostart} />
            </div>

            <div className="v2-divider" />

            <div className="v2-item">
              <div className="v2-icon gray"><ChevronLeft size={20} style={{transform:'rotate(-90deg)'}} /></div>
              <div className="v2-item-text">
                <h3>Tepsiye Küçült</h3>
                <p>Kapatıldığında arka planda çalışsın</p>
              </div>
              <Toggle checked={config.minimizeToTray} onChange={(v) => updateConfig('minimizeToTray', v)} />
            </div>

            <div className="v2-divider" />

            <div className="v2-item">
              <div className="v2-icon blue"><Shield size={20} /></div>
              <div className="v2-item-text">
                <h3>Anonim Veri Toplama</h3>
                <p>Uygulama kullanımını geliştirmek için veri paylaş</p>
              </div>
              <Toggle checked={config.analytics} onChange={(v) => updateConfig('analytics', v)} />
            </div>
          </div>
        </div>

        {/* Section: Automation */}
        <div className="v2-section">
          <div className="v2-section-title">OTOMASYON</div>
          <div className="v2-card">
            <div className="v2-item">
              <div className="v2-icon yellow"><Zap size={20} /></div>
              <div className="v2-item-text">
                <h3>Otomatik Bağlan</h3>
                <p>Uygulama açılır açılmaz bağlan</p>
              </div>
              <Toggle checked={config.autoConnect} onChange={(v) => updateConfig('autoConnect', v)} />
            </div>

            <div className="v2-divider" />

            <div className="v2-item">
              <div className="v2-icon green"><RotateCw size={20} /></div>
              <div className="v2-item-text">
                <h3>Otomatik Yeniden Bağlan</h3>
                <p>Bağlantı koparsa otomatik yeniden dene</p>
              </div>
              <Toggle checked={config.autoReconnect} onChange={(v) => updateConfig('autoReconnect', v)} />
            </div>
          </div>
        </div>

        {/* Section: DNS */}
        <div className="v2-section">
          <div className="v2-section-header-row">
            <div className="v2-section-title">DNS LİSTESİ</div>
            <button className="v2-refresh-btn" onClick={checkAllLatencies} disabled={isChecking}>
              <RotateCw size={16} className={isChecking ? 'spin' : ''} />
            </button>
          </div>
          
          <div className="v2-card">
            <div className="v2-item">
              <div className="v2-item-text">
                <h3>Otomatik Seçim (Önerilen)</h3>
                <p>En hızlı sunucuyu otomatik bulur</p>
              </div>
              <Toggle 
                checked={config.dnsMode === 'auto'} 
                onChange={(v) => {
                  updateConfig('dnsMode', v ? 'auto' : 'manual');
                  if (v) checkAllLatencies();
                }} 
              />
            </div>

            <div className="v2-dns-list">
              <AnimatePresence>
                {sortedProviders.map((p) => {
                  const isSelected = config.selectedDns === p.id;
                  // ✅ Sistem DNS'i auto modda da seçilebilir
                  const isDisabled = config.dnsMode === 'auto' && p.id !== 'system';
                  return (
                    <motion.div 
                      layout
                      key={p.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ 
                        opacity: isDisabled ? (isSelected ? 1 : 0.5) : 1, 
                        y: 0 
                      }}
                      whileHover={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      className={`v2-dns-item ${isSelected ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}`}
                      onClick={() => !isDisabled && updateConfig('selectedDns', p.id)}
                    >
                      <div className={`v2-radio ${isSelected ? 'on' : ''}`}>
                        {isSelected && <div className="v2-radio-dot" />}
                      </div>
                      <div className="v2-dns-info">
                        <span className="v2-dns-name">{p.name}</span>
                        <span className="v2-dns-desc">{p.desc}</span>
                      </div>
                      {latencies[p.id] && (
                        <div className="v2-latency">{latencies[p.id]}ms</div>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Section: Developer */}
        <div className="v2-section">
          <div className="v2-section-title">GELİŞTİRİCİ</div>
          <div className="v2-card">
            <div className="v2-dev-profile">
              <img 
                src="https://yt3.ggpht.com/M-YH7dPjl40d2cXHK30at3hYyn1seO_RO4MJ-ee8FMN6wHrRQ6ZVaX48JIwHt0BqZSA3do8N2g=s88-c-k-c0x00ffffff-no-rj" 
                alt="ConsolAktif"
                className="v2-avatar-img"
              />
              <div className="v2-dev-details">
                <span className="v2-dev-name">ConsolAktif</span>
                <span className="v2-dev-role">Vexar Geliştiricisi</span>
              </div>
            </div>
            <div className="v2-dev-actions">
               <button className="v2-btn youtube" onClick={() => open('https://youtube.com/@ConsolAktif')}>
                  <Youtube size={18} /> Abone Ol
               </button>
               <button className="v2-btn coffee" onClick={() => open('https://www.patreon.com/c/ConsolAktif')}>
                  <Coffee size={18} /> Destekle
               </button>
            </div>
          </div>
        </div>

        {/* Section: Troubleshooting */}
        <div className="v2-section">
          <div className="v2-section-title">SORUN GİDERME</div>
          <div className="v2-card" style={{ 
            background: fixStatus === 'fixing' ? '#b45309' : fixStatus === 'fixed' ? '#10b981' : fixStatus === 'error' ? '#ef4444' : '#002c1dff', 
            border: 'none',
            transition: 'all 0.4s ease'
          }}>
            <div className="v2-item hover-effect" onClick={handleFixInternet} style={{cursor: fixStatus === 'idle' ? 'pointer' : 'default'}}>
               <div className="v2-icon" style={{ 
                 color: fixStatus === 'fixing' ? '#b45309' : fixStatus === 'fixed' ? '#10b981' : fixStatus === 'error' ? '#ef4444' : '#10b981', 
                 background: '#ffffff',
                 transition: 'all 0.4s ease'
               }}>
                 <Wrench size={20} className={fixStatus === 'fixing' ? 'spinning-slow' : ''} />
               </div>
                <div className="v2-item-text">
                  <h3 style={{ color: '#ffffff', transition: 'all 0.4s ease' }}>
                    {fixStatus === 'fixing' ? 'Onarılıyor...' : fixStatus === 'fixed' ? 'Onarıldı!' : fixStatus === 'error' ? 'Hata Oluştu!' : 'İnternet Bağlantısını Onar'}
                  </h3>
                  <p style={{ color: 'rgba(255, 255, 255, 0.82)', transition: 'all 0.4s ease' }}>
                    {fixStatus === 'fixing' ? 'Sistem ayarları sıfırlanıyor, lütfen bekleyin.' : fixStatus === 'fixed' ? 'Proxy ayarları temizlendi ve internet onarıldı.' : fixStatus === 'error' ? 'İşlem sırasında bir sorun meydana geldi.' : 'Proxy takılı kalırsa interneti otomatik düzeltir.'}
                  </p>
                </div>
               <div style={{ padding: '0 0.5rem' }}>
                 {fixStatus === 'fixing' && <RotateCw size={20} className="spinning" color="#ffffff" />}
                 {fixStatus === 'fixed' && <Check size={24} color="#ffffff" />}
                 {fixStatus === 'error' && <AlertTriangle size={24} color="#ffffff" />}
               </div>
            </div>
          </div>
        </div>

        {/* Section: Important Notice */}
        <div className="v2-section">
          <div className="v2-section-title">ÖNEMLİ BİLGİ</div>
          <div className="v2-card" style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
            <div className="v2-item">
               <div className="v2-icon" style={{ color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)' }}>
                 <AlertTriangle size={20} />
               </div>
               <div className="v2-item-text">
                 <h3 style={{ color: '#fca5a5' }}>Güvenlik ve Yanlış Pozitif</h3>
                 <p style={{ color: '#f87171', fontSize: '0.75rem', lineHeight: '1.4' }}>
                   Vexar motoru, Windows Defender AI gibi yapay zeka tabanlı sistemler tarafından bazen "yanlış pozitif" olarak algılanabilir. 
                   Bu durum tamamen zararsızdır. Ayrıca Kaspersky, ESET gibi yazılımlar HTTPS tarama özelliğiyle bağlantıyı engelleyebilir. 
                   Erişim sorunu yaşarsanız bu ayarları kontrol edin.
                 </p>
               </div>
            </div>
          </div>
        </div>

        {/* Footer padding */}
        <div style={{height: '30px'}} />

      </div>
    </div>
  );
};

export default Settings;
