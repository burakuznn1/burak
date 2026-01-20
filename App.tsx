
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  LayoutDashboard, FileText, TrendingUp, LogOut, 
  Sparkles, MapPin, MessageSquare, Eye, Heart, Navigation, Info, Edit3, Send, Lock,
  Coins, History, CheckCircle2, Plus, Trash2, Copy, Search, Home, ChevronRight, Check, X, Award, 
  Building2, Layers, TrendingDown, ArrowUpRight, CalendarDays, SendHorizontal, MessageCircle, 
  Download, Upload, Cloud, ShieldCheck, Database, RefreshCw, Settings, Link as LinkIcon, Loader2, Save,
  User, Wallet, Clock, AlertCircle, BarChart3, Timer, Target, CloudOff, MessageSquarePlus, ArrowLeft, Terminal
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { createClient } from '@supabase/supabase-js';
import { Property, PropertyStats, Offer, ClientFeedback } from './types.ts';
import { generateReportSummary } from './services/geminiService.ts';

// ========================================================
// TÜRKWEST BULUT BAĞLANTI AYARLARI
// ========================================================
const SUPABASE_URL = "https://vaafmxefgjofqcrnrnlw.supabase.co";
const SUPABASE_KEY = "sb_publishable_0Jtlb5Ds-ZoTBXiEFmxyAg_LNY5NQud"; 
// ========================================================

const ADMIN_PASSWORD = "west";
const MONTHS_LIST = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

const INITIAL_PROPERTIES: Property[] = [
  {
    id: 'west-101',
    title: 'Lüks Deniz Manzaralı Daire',
    location: 'Beşiktaş, Yıldız Mahallesi',
    image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1000&q=80',
    currentPrice: 18500000,
    agentNotes: "Mülkümüz bu ay ciddi bir ivme kazandı. Gelen teklifler nakit alım üzerine yoğunlaşıyor.",
    clientFeedback: [],
    offers: [
      { id: '1', date: '12.06.2024', amount: 17500000, bidder: 'A. Yılmaz', status: 'Reddedildi' },
      { id: '2', date: '15.06.2024', amount: 18100000, bidder: 'M. Kaya', status: 'Beklemede' }
    ],
    stats: [{ month: 'Haziran', views: 820, favorites: 68, messages: 18, calls: 14, visits: 8 }],
    market: { comparablePrice: 17800000, buildingUnitsCount: 2, neighborhoodUnitsCount: 14, avgSaleDurationDays: 45 }
  }
];

const App: React.FC = () => {
  // --- STATE ---
  const [properties, setProperties] = useState<Property[]>(INITIAL_PROPERTIES);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(() => localStorage.getItem('west_admin_auth') === 'true');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'propertyList' | 'cloudSettings' | 'edit'>('propertyList');
  const [passwordInput, setPasswordInput] = useState("");
  const [clientCodeInput, setClientCodeInput] = useState("");
  const [loginError, setLoginError] = useState(false);
  const [clientError, setClientError] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [isClientMode, setIsClientMode] = useState(false);
  const [aiSummary, setAiSummary] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingCloud, setIsLoadingCloud] = useState(false);
  const [cloudStatus, setCloudStatus] = useState<'connected' | 'error' | 'local' | 'none'>('none');
  const [cloudErrorMessage, setCloudErrorMessage] = useState<string | null>(null);
  
  const [newOffer, setNewOffer] = useState({ amount: '', bidder: '', status: 'Beklemede' as Offer['status'] });
  const [clientNoteInput, setClientNoteInput] = useState("");
  const [showFeedbackSuccess, setShowFeedbackSuccess] = useState(false);
  const hasRoutedRef = useRef(false);

  // --- SUPABASE CLIENT ---
  const supabase = useMemo(() => {
    if (SUPABASE_URL && SUPABASE_KEY) {
      try { 
        return createClient(SUPABASE_URL, SUPABASE_KEY); 
      } catch (e) { 
        return null; 
      }
    }
    return null;
  }, []);

  // --- INITIALIZATION ---
  useEffect(() => {
    const initializeData = async () => {
      setIsLoadingCloud(true);
      
      if (supabase) {
        try {
          const { data, error } = await supabase
            .from('portfolios')
            .select('data')
            .eq('id', 'main_database')
            .single();
          
          if (!error) {
            if (data && data.data) setProperties(data.data);
            setCloudStatus('connected');
            setCloudErrorMessage(null);
            setIsLoadingCloud(false);
            return;
          } else {
            if (error.code === 'PGRST116') {
              setCloudStatus('connected'); // Tablo var ama veri yok
              setCloudErrorMessage(null);
            } else {
              setCloudStatus('error');
              setCloudErrorMessage(error.message + " (Hata Kodu: " + error.code + ")");
            }
          }
        } catch (e: any) {
          setCloudStatus('error');
          setCloudErrorMessage(e.message || "Bilinmeyen bir bağlantı hatası.");
        }
      } else {
        setCloudStatus('local');
      }

      const saved = localStorage.getItem('west_properties');
      if (saved) {
        try { setProperties(JSON.parse(saved)); } catch(e) { setProperties(INITIAL_PROPERTIES); }
      }
      setIsLoadingCloud(false);
    };

    initializeData();
  }, [supabase]);

  // --- SYNC ---
  useEffect(() => {
    if (isLoadingCloud) return;
    
    localStorage.setItem('west_properties', JSON.stringify(properties));
    
    if (supabase && (isAdminAuthenticated || isClientMode)) {
      setIsSaving(true);
      const sync = async () => {
        try {
          const { error } = await supabase.from('portfolios').upsert({ id: 'main_database', data: properties });
          if (!error) {
            setCloudStatus('connected');
            setCloudErrorMessage(null);
          } else {
             setCloudStatus('error');
             setCloudErrorMessage("Senkronizasyon Başarısız: " + error.message);
          }
        } catch (e: any) { 
           setCloudStatus('error');
           setCloudErrorMessage("Bağlantı Koptu: " + e.message);
        }
        setIsSaving(false);
      };
      const timer = setTimeout(sync, 2500);
      return () => clearTimeout(timer);
    }
  }, [properties, supabase, isAdminAuthenticated, isClientMode, isLoadingCloud]);

  const currentProperty = useMemo(() => properties.find(p => p.id === selectedPropertyId), [properties, selectedPropertyId]);
  const filteredProperties = useMemo(() => properties.filter(p => p.title.toLowerCase().includes(searchTerm.toLowerCase()) || p.location.toLowerCase().includes(searchTerm.toLowerCase()) || p.id.toLowerCase().includes(searchTerm.toLowerCase())), [properties, searchTerm]);

  // --- HANDLERS ---
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === ADMIN_PASSWORD) {
      setIsAdminAuthenticated(true);
      localStorage.setItem('west_admin_auth', 'true');
      setShowLoginModal(false);
      setActiveTab('propertyList');
      setPasswordInput("");
      setLoginError(false);
    } else { setLoginError(true); }
  };

  const handleLogout = () => {
    setIsAdminAuthenticated(false);
    localStorage.removeItem('west_admin_auth');
    setActiveTab('propertyList');
    setSelectedPropertyId(null);
    setIsClientMode(false);
    window.location.search = '';
  };

  const updatePropertyData = (field: keyof Property, value: any) => {
    if (!selectedPropertyId) return;
    setProperties(prev => prev.map(p => p.id === selectedPropertyId ? { ...p, [field]: value } : p));
  };

  const updateMarketData = (field: keyof Property['market'], value: any) => {
    if (!currentProperty) return;
    updatePropertyData('market', { ...currentProperty.market, [field]: value });
  };

  const updateLatestStats = (field: keyof PropertyStats, value: any) => {
    if (!currentProperty) return;
    const newStats = [...currentProperty.stats];
    const lastIndex = newStats.length - 1;
    newStats[lastIndex] = { ...newStats[lastIndex], [field]: value };
    updatePropertyData('stats', newStats);
  };

  const handleAddMonth = () => {
    if (!currentProperty) return;
    const currentMonth = currentProperty.stats[currentProperty.stats.length - 1].month;
    const nextIdx = (MONTHS_LIST.indexOf(currentMonth) + 1) % 12;
    const newMonth = MONTHS_LIST[nextIdx];
    const newStat: PropertyStats = { month: newMonth, views: 0, favorites: 0, messages: 0, calls: 0, visits: 0 };
    updatePropertyData('stats', [...currentProperty.stats, newStat]);
  };

  const handleAddOffer = () => {
    if (!currentProperty || !newOffer.amount || !newOffer.bidder) return;
    const offer: Offer = { id: Date.now().toString(), date: new Date().toLocaleDateString('tr-TR'), amount: Number(newOffer.amount), bidder: newOffer.bidder, status: newOffer.status };
    updatePropertyData('offers', [...(currentProperty.offers || []), offer]);
    setNewOffer({ amount: '', bidder: '', status: 'Beklemede' });
  };

  const handleAddFeedback = () => {
    if (!currentProperty || !clientNoteInput.trim()) return;
    const feedback: ClientFeedback = { date: new Date().toLocaleDateString('tr-TR'), message: clientNoteInput.trim() };
    updatePropertyData('clientFeedback', [...(currentProperty.clientFeedback || []), feedback]);
    setClientNoteInput("");
    setShowFeedbackSuccess(true);
    setTimeout(() => setShowFeedbackSuccess(false), 4000);
  };

  const handleDeleteOffer = (id: string) => { if (!currentProperty) return; updatePropertyData('offers', currentProperty.offers.filter(o => o.id !== id)); };
  const handleDeleteFeedback = (idx: number) => { if (!currentProperty) return; updatePropertyData('clientFeedback', currentProperty.clientFeedback.filter((_, i) => i !== idx)); };

  const statsHistory = currentProperty?.stats || [];
  const latestStats = statsHistory[statsHistory.length - 1];

  if (isLoadingCloud) {
    return (
      <div className="min-h-screen bg-[#001E3C] flex flex-col items-center justify-center p-6 text-white">
        <Loader2 size={48} className="animate-spin text-emerald-400 mb-6" />
        <h2 className="text-xl font-black tracking-widest uppercase text-center">Türkwest<br/>Senkronizasyon</h2>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-[#F8FAFC] text-[#1E293B]">
      {/* Sidebar */}
      <aside className="hidden lg:flex w-72 bg-[#001E3C] text-white flex-col fixed inset-y-0 z-50 shadow-2xl">
        <div className="p-8 border-b border-white/5 bg-gradient-to-br from-[#002B5B] to-[#001E3C]">
          <div className="flex items-center gap-3" onClick={() => { if(isAdminAuthenticated) setActiveTab('propertyList'); }} style={{cursor:'pointer'}}>
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-lg"><Award className="text-[#001E3C]" size={24} /></div>
            <div>
              <h1 className="font-black text-lg tracking-wider">TÜRKWEST</h1>
              <div className="flex items-center gap-1.5 opacity-50">
                <div className={`w-1.5 h-1.5 rounded-full ${cloudStatus === 'connected' ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]' : cloudStatus === 'local' ? 'bg-amber-400' : 'bg-red-400 animate-pulse'}`}></div>
                <p className="text-[8px] uppercase tracking-widest font-bold">{cloudStatus === 'connected' ? 'Bulut Aktif' : cloudStatus === 'local' ? 'Yerel Mod' : 'Hata'}</p>
              </div>
            </div>
          </div>
        </div>
        <nav className="p-6 space-y-2 flex-1">
          {isAdminAuthenticated && !isClientMode ? (
            <>
              <NavItem icon={<Home size={20}/>} label="Portföy Merkezi" active={activeTab === 'propertyList'} onClick={() => setActiveTab('propertyList')} />
              {selectedPropertyId && (
                <>
                  <NavItem icon={<LayoutDashboard size={20}/>} label="Varlık Raporu" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
                  <NavItem icon={<Edit3 size={20}/>} label="Verileri Düzenle" active={activeTab === 'edit'} onClick={() => setActiveTab('edit')} />
                </>
              )}
              <NavItem icon={<Settings size={18}/>} label="Sistem Ayarları" active={activeTab === 'cloudSettings'} onClick={() => setActiveTab('cloudSettings')} />
            </>
          ) : (
            <NavItem icon={<LayoutDashboard size={20}/>} label="Varlık Raporu" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
          )}
        </nav>
        <div className="p-6 border-t border-white/5 space-y-3">
          {isSaving && <div className="text-[10px] font-bold text-emerald-400 animate-pulse px-2 flex items-center gap-2"><RefreshCw size={12} className="animate-spin"/> Güncelleniyor</div>}
          {!isClientMode && (isAdminAuthenticated ? <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 py-3 bg-red-500/10 text-red-400 rounded-xl text-xs font-bold transition-all hover:bg-red-500/20"><LogOut size={16} /> Güvenli Çıkış</button> : <button onClick={() => setShowLoginModal(true)} className="w-full py-3 bg-white/10 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all hover:bg-white/20"><Lock size={14} /> Yönetici Girişi</button>)}
        </div>
      </aside>

      {/* Main Area */}
      <main className="flex-1 lg:ml-72 p-4 lg:p-10 pb-24 overflow-x-hidden">
        {/* LANDING / CLIENT LOGIN */}
        {!selectedPropertyId && !isAdminAuthenticated && !clientError && (
          <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in">
             <div className="w-24 h-24 bg-[#001E3C] rounded-[2.5rem] flex items-center justify-center mb-10 shadow-2xl animate-bounce"><Award className="text-white" size={40} /></div>
             <h1 className="text-5xl font-black text-[#001E3C] mb-4 tracking-tight">Varlık Raporu</h1>
             <p className="text-xl text-slate-500 max-w-lg font-medium leading-relaxed mb-12">Performans analizine erişmek için size iletilen kodu giriniz.</p>
             <form onSubmit={(e) => { e.preventDefault(); const found = properties.find(p => p.id.toLowerCase() === clientCodeInput.toLowerCase()); if (found) { setSelectedPropertyId(found.id); setIsClientMode(true); setActiveTab('dashboard'); } else { setClientError(true); } }} className="w-full max-w-md space-y-4">
               <input type="text" placeholder="Rapor Kodu" value={clientCodeInput} onChange={e => setClientCodeInput(e.target.value)} className="w-full px-8 py-6 bg-white border-2 border-slate-100 rounded-[2rem] outline-none text-2xl font-black text-[#001E3C] shadow-lg text-center uppercase focus:border-[#001E3C]" />
               <button type="submit" className="w-full py-6 bg-[#001E3C] text-white rounded-[2rem] font-black text-xl shadow-2xl hover:scale-105 transition-all">Analizi Görüntüle</button>
             </form>
          </div>
        )}

        {/* PROPERTY LIST (Admin only) */}
        {activeTab === 'propertyList' && isAdminAuthenticated && (
          <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4">
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <h2 className="text-3xl font-black text-[#001E3C]">Portföy Yönetimi</h2>
                <button onClick={(e) => {
                  e.preventDefault();
                  const newId = `west-${Math.floor(100 + Math.random() * 900)}`;
                  const newProperty: Property = {
                    id: newId,
                    title: 'Yeni Mülk Başlığı',
                    location: 'Konum Giriniz',
                    image: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1000&q=80',
                    currentPrice: 0,
                    stats: [{ month: MONTHS_LIST[new Date().getMonth()], views: 0, favorites: 0, messages: 0, calls: 0, visits: 0 }],
                    market: { comparablePrice: 0, buildingUnitsCount: 0, neighborhoodUnitsCount: 0, avgSaleDurationDays: 30 },
                    agentNotes: "",
                    clientFeedback: [],
                    offers: []
                  };
                  setProperties(prev => [...prev, newProperty]);
                  setSelectedPropertyId(newId);
                  setActiveTab('edit');
                }} className="px-8 py-4 bg-[#001E3C] text-white rounded-2xl font-bold flex items-center gap-3 shadow-xl hover:scale-105 transition-all"><Plus size={20}/> Yeni İlan Ekle</button>
             </div>
             <div className="relative">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20}/>
                <input type="text" placeholder="Ara..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-14 pr-6 py-5 bg-white border border-slate-200 rounded-3xl outline-none shadow-sm focus:border-[#001E3C]" />
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredProperties.map(p => (
                  <div key={p.id} className="bg-white rounded-[2.5rem] overflow-hidden border border-slate-200 shadow-sm hover:shadow-2xl transition-all group flex flex-col">
                     <div className="relative h-56 overflow-hidden">
                        <img src={p.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt="" />
                        <div className="absolute top-4 right-4 px-3 py-1 bg-white/90 backdrop-blur rounded-lg text-[10px] font-black text-[#001E3C] uppercase tracking-widest">{p.id}</div>
                     </div>
                     <div className="p-8 space-y-6 flex-1 flex flex-col justify-between">
                        <div><h4 className="font-black text-xl text-[#001E3C] line-clamp-1 mb-2">{p.title}</h4><p className="text-slate-500 text-sm flex items-center gap-2"><MapPin size={14}/> {p.location}</p></div>
                        <div className="flex gap-2 mt-6">
                           <button onClick={() => { setSelectedPropertyId(p.id); setActiveTab('dashboard'); }} className="flex-1 py-4 bg-[#001E3C] text-white rounded-xl text-xs font-black hover:bg-[#002B5B]">Raporu Gör</button>
                           <button onClick={() => { setSelectedPropertyId(p.id); setActiveTab('edit'); }} className="p-4 bg-slate-50 text-slate-600 rounded-xl hover:bg-slate-100"><Edit3 size={18}/></button>
                        </div>
                     </div>
                  </div>
                ))}
             </div>
          </div>
        )}

        {/* EDIT PROPERTY (Admin only) */}
        {activeTab === 'edit' && currentProperty && isAdminAuthenticated && (
          <div className="max-w-4xl mx-auto space-y-10 animate-in slide-in-from-right-6">
             <div className="flex justify-between items-center">
                <button onClick={() => setActiveTab('propertyList')} className="flex items-center gap-2 text-slate-500 font-bold hover:text-[#001E3C]"><ArrowLeft size={20}/> Portföye Dön</button>
                <h2 className="text-2xl font-black text-[#001E3C]">Düzenle: {currentProperty.id}</h2>
             </div>
             <div className="bg-white rounded-[3rem] p-10 shadow-xl border border-slate-100 space-y-12">
                <section className="space-y-6">
                   <h3 className="text-lg font-black text-[#001E3C] border-b pb-4">Temel Bilgiler</h3>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <AdminInput label="Başlık" value={currentProperty.title} onChange={(v:any) => updatePropertyData('title', v)} />
                      <AdminInput label="Konum" value={currentProperty.location} onChange={(v:any) => updatePropertyData('location', v)} />
                      <AdminInput label="Fiyat (₺)" type="number" value={currentProperty.currentPrice} onChange={(v:any) => updatePropertyData('currentPrice', v)} />
                      <AdminInput label="Görsel URL" value={currentProperty.image} onChange={(v:any) => updatePropertyData('image', v)} />
                   </div>
                </section>
                
                <section className="space-y-6">
                   <div className="flex justify-between items-center border-b pb-4">
                      <h3 className="text-lg font-black text-[#001E3C]">Performans Verileri ({latestStats.month})</h3>
                      <button onClick={handleAddMonth} className="text-[10px] font-black bg-[#001E3C] text-white px-4 py-2 rounded-full">Yeni Ay</button>
                   </div>
                   <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      <AdminInput label="Görüntü" type="number" value={latestStats.views} onChange={(v:any) => updateLatestStats('views', v)} />
                      <AdminInput label="Favori" type="number" value={latestStats.favorites} onChange={(v:any) => updateLatestStats('favorites', v)} />
                      <AdminInput label="Mesaj" type="number" value={latestStats.messages} onChange={(v:any) => updateLatestStats('messages', v)} />
                      <AdminInput label="Arama" type="number" value={latestStats.calls} onChange={(v:any) => updateLatestStats('calls', v)} />
                      <AdminInput label="Ziyaret" type="number" value={latestStats.visits} onChange={(v:any) => updateLatestStats('visits', v)} />
                   </div>
                </section>

                <section className="space-y-6">
                   <h3 className="text-lg font-black text-[#001E3C] border-b pb-4">Müşteri Mesajları</h3>
                   <div className="space-y-3">
                      {(!currentProperty.clientFeedback || currentProperty.clientFeedback.length === 0) ? (
                        <p className="text-slate-400 text-sm text-center py-4 italic">Henüz mesaj yok.</p>
                      ) : (
                        currentProperty.clientFeedback.map((fb, i) => (
                           <div key={i} className="p-5 bg-slate-50 rounded-2xl flex justify-between items-start">
                              <div><p className="text-[10px] font-bold text-slate-400 uppercase mb-1">{fb.date}</p><p className="text-sm font-bold">{fb.message}</p></div>
                              <button onClick={() => handleDeleteFeedback(i)} className="text-red-400"><Trash2 size={16}/></button>
                           </div>
                        ))
                      )}
                   </div>
                </section>

                <section className="space-y-6">
                   <h3 className="text-lg font-black text-[#001E3C] border-b pb-4">Piyasa Verileri</h3>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <AdminInput label="Emsal Fiyat (₺)" type="number" value={currentProperty.market.comparablePrice} onChange={(v:any) => updateMarketData('comparablePrice', v)} />
                      <AdminInput label="Satış Süresi (Gün)" type="number" value={currentProperty.market.avgSaleDurationDays} onChange={(v:any) => updateMarketData('avgSaleDurationDays', v)} />
                   </div>
                </section>

                <button onClick={() => setActiveTab('dashboard')} className="w-full py-5 bg-[#001E3C] text-white rounded-[2rem] font-black shadow-xl">Kaydet ve Raporu Gör</button>
             </div>
          </div>
        )}

        {/* DASHBOARD TAB */}
        {activeTab === 'dashboard' && currentProperty && latestStats && (
          <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in duration-700">
             {isAdminAuthenticated && (
                <button onClick={() => setActiveTab('propertyList')} className="flex items-center gap-2 text-slate-500 font-bold"><ArrowLeft size={20}/> Listeye Dön</button>
             )}
             <div className="flex flex-col lg:flex-row justify-between items-start gap-6">
                <div className="space-y-2"><span className="inline-block px-3 py-1 bg-[#001E3C] text-white text-[10px] font-black rounded-full uppercase tracking-widest">{latestStats.month} Raporu</span><h2 className="text-4xl font-black text-[#001E3C] tracking-tight">{currentProperty.title}</h2><p className="flex items-center gap-2 text-slate-500 font-medium"><MapPin size={16}/> {currentProperty.location}</p></div>
                <div className="flex gap-4 w-full lg:w-auto">
                   {isAdminAuthenticated && (<button onClick={() => setActiveTab('edit')} className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm text-slate-600"><Edit3 size={24}/></button>)}
                   <button onClick={async () => { setIsGenerating(true); setAiSummary(await generateReportSummary({ property: currentProperty, period: latestStats.month, clientName: 'Müşterimiz' })); setIsGenerating(false); }} className="flex-1 lg:flex-none px-8 py-4 bg-[#001E3C] text-white rounded-2xl font-bold shadow-xl flex items-center justify-center gap-3">
                     {isGenerating ? <Loader2 size={20} className="animate-spin"/> : <Sparkles size={20} className="text-amber-400"/>} AI Analiz
                   </button>
                </div>
             </div>

             {aiSummary && (<div className="bg-white p-8 rounded-[3rem] shadow-xl border border-[#001E3C]/10 animate-in slide-in-from-top-6"><h4 className="text-xl font-black text-[#001E3C] mb-6 flex items-center gap-3"><Sparkles size={24} className="text-amber-500" /> Strateji Analizi</h4><p className="text-slate-600 leading-relaxed font-medium whitespace-pre-line">{aiSummary}</p></div>)}

             <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Görüntü" value={latestStats.views} icon={<Eye size={20}/>} color="blue" />
                <StatCard label="Favori" value={latestStats.favorites} icon={<Heart size={20}/>} color="red" />
                <StatCard label="Mesaj" value={latestStats.messages + latestStats.calls} icon={<MessageSquare size={20}/>} color="indigo" />
                <StatCard label="Ziyaret" value={latestStats.visits} icon={<Navigation size={20}/>} color="emerald" />
             </div>

             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
               <div className="bg-[#001E3C] p-10 rounded-[3rem] text-white space-y-6">
                  <h4 className="text-xl font-black flex items-center gap-3"><MessageCircle size={24}/> Danışman Mesajı</h4>
                  <p className="text-white/80 leading-relaxed font-medium italic">"{currentProperty.agentNotes || 'Mülkünüzle ilgili çalışmalarımız devam ediyor.'}"</p>
               </div>

               <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm space-y-6">
                  <h4 className="text-xl font-black text-[#001E3C] flex items-center gap-3"><MessageSquarePlus size={24}/> Görüşünüzü İletin</h4>
                  {showFeedbackSuccess ? (
                    <div className="bg-emerald-50 border border-emerald-100 p-8 rounded-[2.5rem] text-emerald-600 font-bold text-center">
                      <CheckCircle2 size={32} className="mx-auto mb-2"/> Mesajınız iletildi.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <textarea value={clientNoteInput} onChange={e => setClientNoteInput(e.target.value)} placeholder="Bir not bırakın..." className="w-full h-32 p-5 bg-slate-50 border border-slate-200 rounded-[2rem] outline-none focus:border-[#001E3C] font-medium" />
                      <button onClick={handleAddFeedback} className="w-full py-5 bg-[#001E3C] text-white rounded-[2rem] font-black shadow-xl flex items-center justify-center gap-2 transition-all"><Send size={18}/> Gönder</button>
                    </div>
                  )}
               </div>
             </div>
          </div>
        )}

        {/* CLOUD SETTINGS TAB (SETUP GUIDE) */}
        {activeTab === 'cloudSettings' && isAdminAuthenticated && (
          <div className="max-w-3xl mx-auto space-y-10 animate-in slide-in-from-bottom-6">
             <div className="bg-[#001E3C] p-10 lg:p-12 rounded-[3.5rem] text-white space-y-8 shadow-2xl relative overflow-hidden">
                <Cloud size={100} className="absolute -right-10 -bottom-10 opacity-10" />
                <h3 className="text-3xl font-black">Sistem Altyapısı</h3>
                
                <div className="p-6 bg-white/5 border border-white/10 rounded-2xl space-y-6">
                  <div className="flex justify-between items-center">
                    <span className="text-white/40 text-xs font-bold uppercase tracking-wider">Durum:</span>
                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm ${cloudStatus === 'connected' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
                      {cloudStatus === 'connected' ? 'BULUT AKTİF' : 'BAĞLANTI HATASI'}
                    </span>
                  </div>

                  {cloudErrorMessage && (
                    <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-[2rem] space-y-6 animate-in zoom-in">
                       <div className="flex items-center gap-3 text-red-400 font-black text-lg">
                         <Terminal size={24}/> Bağlantı Sorunu Tespit Edildi
                       </div>
                       
                       <div className="space-y-4">
                          <p className="text-sm font-bold text-white leading-relaxed">Veritabanına ulaşılabiliyor ancak **"portfolios"** tablosu bulunamadı. Lütfen Supabase SQL Editor'ü açıp şu kodu çalıştırın:</p>
                          
                          <div className="relative group">
                            <pre className="bg-black/60 p-5 rounded-2xl text-[11px] text-emerald-400 font-mono overflow-x-auto border border-white/5">
{`CREATE TABLE portfolios (
  id TEXT PRIMARY KEY,
  data JSONB
);

-- RLS İzinlerini Herkes İçin Aç:
ALTER TABLE portfolios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access" ON portfolios FOR ALL USING (true) WITH CHECK (true);`}
                            </pre>
                            <button 
                              onClick={() => {
                                navigator.clipboard.writeText(`CREATE TABLE portfolios (\n  id TEXT PRIMARY KEY,\n  data JSONB\n);\n\nALTER TABLE portfolios ENABLE ROW LEVEL SECURITY;\nCREATE POLICY "Public Access" ON portfolios FOR ALL USING (true) WITH CHECK (true);`);
                                alert("SQL kodu kopyalandı!");
                              }}
                              className="absolute top-4 right-4 p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-all"
                            >
                              <Copy size={18}/>
                            </button>
                          </div>

                          <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                             <Check size={18} className="text-emerald-400"/>
                             <p className="text-[10px] text-emerald-300 font-bold">SQL'i çalıştırdıktan sonra sayfayı yenileyin.</p>
                          </div>
                       </div>
                    </div>
                  )}

                  <div className="space-y-1">
                    <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">API Endpoint</p>
                    <p className="text-xs font-mono break-all text-white/80">{SUPABASE_URL}</p>
                  </div>
                </div>

                <button onClick={() => window.location.reload()} className="w-full py-5 bg-white text-[#001E3C] rounded-2xl font-black hover:bg-white/90 active:scale-95 transition-all flex items-center justify-center gap-3">
                  <RefreshCw size={20}/> Bağlantıyı Yenile
                </button>
             </div>
          </div>
        )}

        {/* LOGIN MODAL */}
        {showLoginModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#001E3C]/95 backdrop-blur-xl p-4">
            <div className="bg-white w-full max-w-sm rounded-[3rem] p-12 text-center animate-in zoom-in">
              <div className="w-16 h-16 bg-[#001E3C] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl text-white"><Lock size={28}/></div>
              <h3 className="text-2xl font-black text-[#001E3C] mb-8">Sistem Girişi</h3>
              <form onSubmit={handleLogin} className="space-y-4">
                <input type="password" autoFocus placeholder="Şifre" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} className={`w-full p-4 bg-slate-50 border-2 rounded-2xl outline-none text-center text-xl font-black transition-all ${loginError ? 'border-red-500 bg-red-50' : 'border-slate-100 focus:border-[#001E3C]'}`} />
                <button type="submit" className="w-full py-4 bg-[#001E3C] text-white rounded-2xl font-black shadow-xl">Giriş Yap</button>
                <button type="button" onClick={() => setShowLoginModal(false)} className="text-xs font-bold text-slate-400 mt-4 uppercase">Vazgeç</button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

const NavItem = ({ icon, label, active, onClick }: any) => (
  <button onClick={onClick} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all ${active ? 'bg-white/10 text-white font-black shadow-lg' : 'text-white/30 hover:bg-white/5 hover:text-white'}`}>
    {icon} <span className="text-[13px]">{label}</span>
  </button>
);

const StatCard = ({ label, value, icon, color }: any) => {
  const colors: any = { blue: 'bg-blue-50 text-blue-600', red: 'bg-red-50 text-red-600', indigo: 'bg-indigo-50 text-indigo-600', emerald: 'bg-emerald-50 text-emerald-600' };
  return (
    <div className="bg-white p-6 rounded-[2rem] border border-slate-200/60 shadow-sm space-y-4">
       <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${colors[color]}`}>{icon}</div>
       <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p><h4 className="text-2xl font-black text-[#001E3C]">{Number(value).toLocaleString()}</h4></div>
    </div>
  );
};

const AdminInput = ({ label, value, onChange, type = "text" }: any) => {
  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => { const val = e.currentTarget.value; if (type === 'number') { const num = val === '' ? 0 : Number(val); if (!isNaN(num)) onChange(num); } else { onChange(val); } };
  return (
    <div className="space-y-1"><label className="text-[9px] font-black uppercase tracking-widest text-slate-400">{label}</label><input type={type === 'number' ? 'text' : type} value={value} onChange={handleValueChange} className="w-full p-4 rounded-2xl text-sm font-bold bg-slate-50 border-slate-200 outline-none focus:border-[#001E3C]" /></div>
  );
};

export default App;
