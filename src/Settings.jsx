import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, Globe, Power, Zap, RotateCw, Activity, 
  Shield, Youtube, Coffee, AlertTriangle, Check, Wrench, Languages
} from 'lucide-react';
import { enable, disable, isEnabled } from '@tauri-apps/plugin-autostart';
import { open, Command } from '@tauri-apps/plugin-shell';
import { invoke } from '@tauri-apps/api/core';
import { getTranslations, SUPPORTED_LANGUAGES } from './i18n';
import './App.css';

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
  const [sortedProviders, setSortedProviders] = useState([]);
  const [fixStatus, setFixStatus] = useState('idle');

  const lang = config.language || 'tr';
  const t = getTranslations(lang);

  // DNS Providers with translations
  const DNS_PROVIDERS = [
    { id: 'system', name: t.dnsSystemDefault, desc: t.dnsSystemDefaultDesc, ip: null },
    { id: 'cloudflare', name: 'Cloudflare', desc: t.dnsCfDesc, ip: '1.1.1.1' },
    { id: 'adguard', name: 'AdGuard', desc: t.dnsAdguardDesc, ip: '94.140.14.14' },
    { id: 'google', name: 'Google', desc: t.dnsGoogleDesc, ip: '8.8.8.8' },
    { id: 'quad9', name: 'Quad9', desc: t.dnsQuad9Desc, ip: '9.9.9.9' },
    { id: 'opendns', name: 'OpenDNS', desc: t.dnsOpenDnsDesc, ip: '208.67.222.222' }
  ];

  useEffect(() => {
    setSortedProviders(DNS_PROVIDERS);
  }, [lang]);

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
    
    const pingableProviders = DNS_PROVIDERS.filter(p => p.ip !== null);
    
    const isSlowConnection = navigator.connection?.effectiveType === '3g' || navigator.connection?.effectiveType === '2g';
    const TIMEOUT_MS = isSlowConnection ? 3000 : 1500;

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

    results.forEach(result => {
      if (result.status === 'fulfilled') {
        newLatencies[result.value.id] = result.value.latency;
      }
    });
    
    setLatencies(newLatencies);
    
    const systemDns = DNS_PROVIDERS.find(p => p.id === 'system');
    const otherDns = DNS_PROVIDERS.filter(p => p.id !== 'system').sort((a, b) => 
      (newLatencies[a.id] || 999) - (newLatencies[b.id] || 999)
    );
    
    const sorted = systemDns ? [systemDns, ...otherDns] : otherDns;
    setSortedProviders(sorted);
    
    if (config.dnsMode === 'auto') {
      const bestDns = otherDns[0];
      if (bestDns) {
        updateConfig('selectedDns', bestDns.id);
      }
    }

    setIsChecking(false);
  };

  const handleFixInternet = async () => {
    setFixStatus('fixing');
    
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
    }, 1200);
  };

  const currentLang = SUPPORTED_LANGUAGES.find(l => l.code === lang) || SUPPORTED_LANGUAGES[0];

  return (
    <div className="v2-settings-overlay">
      {/* Header */}
      <div className="v2-settings-header">
        <button className="v2-back-btn" onClick={onBack}>
          <ChevronLeft size={28} />
        </button>
        <h1>{t.settingsTitle}</h1>
      </div>

      {/* Scrollable Content */}
      <div className="v2-settings-content">

        {/* ========== 1. DİL (En üstte) ========== */}
        <div className="v2-section">
          <div className="v2-section-title">{t.language}</div>
          <div className="v2-card">
            <div className="v2-item hover-effect" 
              onClick={() => {
                const nextLang = lang === 'tr' ? 'en' : 'tr';
                updateConfig('language', nextLang);
              }}
              style={{ cursor: 'pointer' }}
            >
              <div className="v2-icon blue"><Languages size={20} /></div>
              <div className="v2-item-text">
                <h3>{t.language}</h3>
                <p>{t.languageDesc}</p>
              </div>
              <div className="v2-badge" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span>{currentLang.flag}</span>
                <span>{currentLang.code.toUpperCase()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ========== 2. BAĞLANTI YÖNTEMİ ========== */}
        <div className="v2-section">
          <div className="v2-section-title">{t.sectionMethod}</div>
          <div className="v2-card">
              {/* Hızlı Mod (Önerilen) - Üstte */}
              <div 
                className={`v2-item hover-effect ${config.dpiMethod === '0' ? 'v2-selected' : ''}`}
                style={{ 
                  background: config.dpiMethod === '0' ? 'rgba(234, 179, 8, 0.1)' : 'transparent',
                  opacity: config.dpiMethod === '0' ? 1 : 0.5,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onClick={() => updateConfig('dpiMethod', '0')}
              >
                <div className="v2-icon yellow" style={{ background: config.dpiMethod === '0' ? 'rgba(234, 179, 8, 0.2)' : '' }}>
                  <Activity size={20} className={config.dpiMethod === '0' ? 'active-icon' : ''} />
                </div>
                <div className="v2-item-text">
                  <h3 style={{ color: config.dpiMethod === '0' ? '#facc15' : '' }}>{t.methodFast}</h3>
                  <p>{t.methodFastDesc}</p>
                </div>
                <div className={`v2-radio ${config.dpiMethod === '0' ? 'on' : ''}`}>
                   {config.dpiMethod === '0' && <div className="v2-radio-dot" />}
                </div>
              </div>

              <div className="v2-divider" />

              {/* Güçlü Mod - Altta */}
              <div 
                className={`v2-item hover-effect ${config.dpiMethod === '1' ? 'v2-selected' : ''}`}
                style={{ 
                  background: config.dpiMethod === '1' ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                  opacity: config.dpiMethod === '1' ? 1 : 0.5,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onClick={() => updateConfig('dpiMethod', '1')}
              >
                <div className="v2-icon blue" style={{ background: config.dpiMethod === '1' ? 'rgba(59, 130, 246, 0.2)' : '' }}>
                  <Zap size={20} className={config.dpiMethod === '1' ? 'active-icon' : ''} />
                </div>
                <div className="v2-item-text">
                  <h3 style={{ color: config.dpiMethod === '1' ? '#60a5fa' : '' }}>{t.methodStrong}</h3>
                  <p>{t.methodStrongDesc}</p>
                </div>
                <div className={`v2-radio ${config.dpiMethod === '1' ? 'on' : ''}`}>
                   {config.dpiMethod === '1' && <div className="v2-radio-dot" />}
                </div>
              </div>
          </div>
        </div>

        {/* ========== 2. AĞ AYARLARI ========== */}
        <div className="v2-section">
          <div className="v2-section-title">{t.sectionNetwork}</div>
          <div className="v2-card">
            <div className="v2-item">
              <div className="v2-icon purple" style={{ background: 'rgba(168, 85, 247, 0.2)', color: '#a855f7' }}>
                <Globe size={20} />
              </div>
              <div className="v2-item-text">
                <h3 style={{ color: '#d8b4fe' }}>{t.lanSharing}</h3>
                <p>{t.lanSharingDesc}</p>
              </div>
              <Toggle checked={config.lanSharing || false} onChange={(v) => updateConfig('lanSharing', v)} />
            </div>
          </div>
        </div>

        {/* ========== 3. OTOMASYON ========== */}
        <div className="v2-section">
          <div className="v2-section-title">{t.sectionAutomation}</div>
          <div className="v2-card">
            <div className="v2-item">
              <div className="v2-icon yellow"><Zap size={20} /></div>
              <div className="v2-item-text">
                <h3>{t.autoConnect}</h3>
                <p>{t.autoConnectDesc}</p>
              </div>
              <Toggle checked={config.autoConnect} onChange={(v) => updateConfig('autoConnect', v)} />
            </div>

            <div className="v2-divider" />

            <div className="v2-item">
              <div className="v2-icon green"><RotateCw size={20} /></div>
              <div className="v2-item-text">
                <h3>{t.autoReconnect}</h3>
                <p>{t.autoReconnectDesc}</p>
              </div>
              <Toggle checked={config.autoReconnect} onChange={(v) => updateConfig('autoReconnect', v)} />
            </div>
          </div>
        </div>

        {/* ========== 4. DNS LİSTESİ ========== */}
        <div className="v2-section">
          <div className="v2-section-header-row">
            <div className="v2-section-title">{t.sectionDns}</div>
            <button className="v2-refresh-btn" onClick={checkAllLatencies} disabled={isChecking}>
              <RotateCw size={16} className={isChecking ? 'spin' : ''} />
            </button>
          </div>
          
          <div className="v2-card">
            <div className="v2-item">
              <div className="v2-item-text">
                <h3>{t.dnsAutoSelect}</h3>
                <p>{t.dnsAutoSelectDesc}</p>
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

        {/* ========== 5. GENEL ========== */}
        <div className="v2-section">
          <div className="v2-section-title">{t.sectionGeneral}</div>
          <div className="v2-card">
            
            <div className="v2-item">
              <div className="v2-icon green"><Power size={20} /></div>
              <div className="v2-item-text">
                <h3>{t.autoStart}</h3>
                <p>{t.autoStartDesc}</p>
              </div>
              <Toggle checked={autostartEnabled} onChange={toggleAutostart} />
            </div>

            <div className="v2-divider" />

            <div className="v2-item">
              <div className="v2-icon gray"><ChevronLeft size={20} style={{transform:'rotate(-90deg)'}} /></div>
              <div className="v2-item-text">
                <h3>{t.minimizeToTray}</h3>
                <p>{t.minimizeToTrayDesc}</p>
              </div>
              <Toggle checked={config.minimizeToTray} onChange={(v) => updateConfig('minimizeToTray', v)} />
            </div>

          </div>
        </div>

        {/* ========== 6. GİZLİLİK ========== */}
        <div className="v2-section">
          <div className="v2-section-title">{t.sectionPrivacy}</div>
          <div className="v2-card">
            <div className="v2-item">
              <div className="v2-icon blue"><Shield size={20} /></div>
              <div className="v2-item-text">
                <h3>{t.analytics}</h3>
                <p>{t.analyticsDesc}</p>
              </div>
              <Toggle checked={config.analytics} onChange={(v) => updateConfig('analytics', v)} />
            </div>
          </div>
        </div>

        {/* ========== 7. SORUN GİDERME ========== */}
        <div className="v2-section">
          <div className="v2-section-title">{t.sectionTroubleshoot}</div>
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
                    {fixStatus === 'fixing' ? t.fixRepairing : fixStatus === 'fixed' ? t.fixDone : fixStatus === 'error' ? t.fixError : t.fixInternet}
                  </h3>
                  <p style={{ color: 'rgba(255, 255, 255, 0.82)', transition: 'all 0.4s ease' }}>
                    {fixStatus === 'fixing' ? t.fixRepairingDesc : fixStatus === 'fixed' ? t.fixDoneDesc : fixStatus === 'error' ? t.fixErrorDesc : t.fixInternetDesc}
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

        {/* ========== 8. GELİŞTİRİCİ ========== */}
        <div className="v2-section">
          <div className="v2-section-title">{t.sectionDev}</div>
          <div className="v2-card">
            <div className="v2-dev-profile">
              <img 
                src="https://yt3.ggpht.com/M-YH7dPjl40d2cXHK30at3hYyn1seO_RO4MJ-ee8FMN6wHrRQ6ZVaX48JIwHt0BqZSA3do8N2g=s88-c-k-c0x00ffffff-no-rj" 
                alt="ConsolAktif"
                className="v2-avatar-img"
              />
              <div className="v2-dev-details">
                <span className="v2-dev-name">ConsolAktif</span>
                <span className="v2-dev-role">{t.devRole}</span>
              </div>
            </div>
            <div className="v2-dev-actions">
               <button className="v2-btn youtube" onClick={() => open('https://youtube.com/@ConsolAktif')}>
                 <Youtube size={18} /> {t.devSubscribe}
               </button>
               <button className="v2-btn coffee" onClick={() => open('https://www.patreon.com/c/ConsolAktif')}>
                 <Coffee size={18} /> {t.devSupport}
               </button>
            </div>
          </div>
        </div>

        {/* ========== 9. ÖNEMLİ BİLGİ ========== */}
        <div className="v2-section">
          <div className="v2-section-title">{t.sectionNotice}</div>
          <div className="v2-card" style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
            <div className="v2-item">
               <div className="v2-icon" style={{ color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)' }}>
                 <AlertTriangle size={20} />
               </div>
               <div className="v2-item-text">
                 <h3 style={{ color: '#fca5a5' }}>{t.noticeTitle}</h3>
                 <p style={{ color: '#f87171', fontSize: '0.75rem', lineHeight: '1.4' }}>
                   {t.noticeDesc}
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
