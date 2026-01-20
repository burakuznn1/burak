
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

  // --- SUPABASE CLIENT ---
  const supabase = useMemo(() => {
    if (SUPABASE_URL && SUPABASE_KEY) {
      try { return createClient(SUPABASE_URL, SUPABASE_KEY); } catch (e) { return null; }
    }
    return null;
  }, []);

  // --- INITIALIZATION ---
  useEffect(() => {
    const initializeData = async () => {
      setIsLoadingCloud(true);
      if (supabase) {
        try {
          const { data, error } = await supabase.from('portfolios').select('data').eq('id', 'main_database').single();
          if (!error && data?.data) {
            setProperties(data.data);
            setCloudStatus('connected');
          } else if (error?.code === 'PGRST116') {
            setCloudStatus('connected');
          } else {
            setCloudStatus('error');
            setCloudErrorMessage(error?.message || "Bağlantı hatası");
          }
        } catch (e: any) {
          setCloudStatus('error');
          setCloudErrorMessage(e.message);
        }
      } else {
        setCloudStatus('local');
      }
      const saved = localStorage.getItem('west_properties');
      if (saved) { try { setProperties(JSON.parse(saved)); } catch(e) {} }
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
          await supabase.from('portfolios').upsert({ id: 'main_database', data: properties });
        } catch (e) {}
        setIsSaving(false);
      };
      const timer = setTimeout(sync, 2000);
      return () => clearTimeout(timer);
    }
  }, [properties, supabase, isAdminAuthenticated, isClientMode, isLoadingCloud]);

  const currentProperty = useMemo(() => properties.find(p => p.id === selectedPropertyId), [properties, selectedPropertyId]);
  const filteredProperties = useMemo(() => properties.filter(p => p.title.toLowerCase().includes(searchTerm.toLowerCase()) || p.id.toLowerCase().includes(searchTerm.toLowerCase())), [properties, searchTerm]);

  // --- HANDLERS ---
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === ADMIN_PASSWORD) {
      setIsAdminAuthenticated(true);
      localStorage.setItem('west_admin_auth', 'true');
      setShowLoginModal(false);
      setActiveTab('propertyList');
      setLoginError(false);
    } else { setLoginError(true); }
  };

  const handleLogout = () => {
    setIsAdminAuthenticated(false);
    setIsClientMode(false);
    localStorage.removeItem('west_admin_auth');
    setSelectedPropertyId(null);
    setActiveTab('propertyList');
  };

  const updatePropertyData = (field: keyof Property, value: any) => {
    if (!selectedPropertyId) return;
    setProperties(prev => prev.map(p => p.id === selectedPropertyId ? { ...p, [field]: value } : p));
  };

  const handleAddOffer = () => {
    if (!currentProperty || !newOffer.amount || !newOffer.bidder) return;
    const offer: Offer = { 
      id: Date.now().toString(), 
      date: new Date().toLocaleDateString('tr-TR'), 
      amount: Number(newOffer.amount), 
      bidder: newOffer.bidder, 
      status: newOffer.status 
    };
    updatePropertyData('offers', [...(currentProperty.offers || []), offer]);
    setNewOffer({ amount: '', bidder: '', status: 'Beklemede' });
  };

  const handleDeleteProperty = (id: string) => {
    if (confirm('Bu mülkü ve tüm verilerini tamamen silmek istediğinize emin misiniz? Bu işlem geri alınamaz.')) {
      setProperties(prev => prev.filter(p => p.id !== id));
      if (selectedPropertyId === id) {
        setSelectedPropertyId(null);
        setActiveTab('propertyList');
      }
    }
  };

  const handleAddMonth = () => {
    if (!currentProperty) return;
    const currentMonthName = new Date().toLocaleDateString('tr-TR', { month: 'long' });
    const capitalizedMonth = currentMonthName.charAt(0).toUpperCase() + currentMonthName.slice(1);
    
    const newStat: PropertyStats = { month: capitalizedMonth, views: 0, favorites: 0, messages: 0, calls: 0, visits: 0 };
    updatePropertyData('stats', [...currentProperty.stats, newStat]);
  };

  const handleAddFeedback = () => {
    if (!currentProperty || !clientNoteInput.trim()) return;
    const feedback: ClientFeedback = { date: new Date().toLocaleDateString('tr-TR'), message: clientNoteInput.trim() };
    updatePropertyData('clientFeedback', [...(currentProperty.clientFeedback || []), feedback]);
    setClientNoteInput("");
    setShowFeedbackSuccess(true);
    setTimeout(() => setShowFeedbackSuccess(false), 3000);
  };

  const latestStats = currentProperty?.stats[currentProperty.stats.length - 1];

  if (isLoadingCloud) return <div className="min-h-screen bg-[#001E3C] flex items-center justify-center text-white"><Loader2 className="animate-spin" size={40}/></div>;

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-[#F8FAFC]">
      {/* SIDEBAR */}
      <aside className="hidden lg:flex w-72 bg-[#001E3C] text-white flex-col fixed inset-y-0 z-50">
        <div className="p-8 border-b border-white/5">
          <div className="flex items-center gap-3">
            <Award className="text-white" size={32} />
            <h1 className="font-black text-xl tracking-tighter">TÜRKWEST</h1>
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
        <div className="p-6 border-t border-white/5">
           {isAdminAuthenticated ? (
             <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 py-3 bg-red-500/10 text-red-400 rounded-xl text-xs font-bold"><LogOut size={16}/> Çıkış Yap</button>
           ) : (
             <button onClick={() => setShowLoginModal(true)} className="w-full py-3 bg-white/10 rounded-xl text-xs font-bold flex items-center justify-center gap-2"><Lock size={14}/> Yönetici Girişi</button>
           )}
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 lg:ml-72 p-4 lg:p-10 pb-20">
        
        {/* LANDING / CLIENT LOGIN */}
        {!selectedPropertyId && !isAdminAuthenticated && (
          <div className="min-h-[70vh] flex flex-col items-center justify-center text-center animate-in zoom-in duration-500">
             <Award className="text-[#001E3C] mb-8" size={64} />
             <h1 className="text-5xl font-black text-[#001E3C] mb-4">Varlık Raporu</h1>
             <p className="text-slate-500 mb-10 max-w-sm">Size iletilen mülk kodunu girerek performans analizini görüntüleyin.</p>
             <form onSubmit={(e) => { e.preventDefault(); const p = properties.find(x => x.id.toLowerCase() === clientCodeInput.toLowerCase()); if(p) { setSelectedPropertyId(p.id); setIsClientMode(true); setActiveTab('dashboard'); } else { alert('Hatalı kod!'); } }} className="w-full max-w-sm space-y-4">
               <input type="text" placeholder="Örn: west-101" value={clientCodeInput} onChange={e => setClientCodeInput(e.target.value)} className="w-full px-6 py-5 bg-white border-2 border-slate-100 rounded-[2rem] text-center text-2xl font-black uppercase outline-none focus:border-[#001E3C] text-[#001E3C]" />
               <button className="w-full py-5 bg-[#001E3C] text-white rounded-[2rem] font-bold text-lg shadow-xl">Raporu Aç</button>
             </form>
          </div>
        )}

        {/* PROPERTY LIST (Admin) */}
        {activeTab === 'propertyList' && isAdminAuthenticated && (
          <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in">
             <div className="flex justify-between items-center">
                <h2 className="text-3xl font-black text-[#001E3C]">Portföy Yönetimi</h2>
                <button onClick={() => {
                   const id = `west-${Math.floor(100+Math.random()*900)}`;
                   const currentMonth = new Date().toLocaleDateString('tr-TR', { month: 'long' });
                   const capitalizedMonth = currentMonth.charAt(0).toUpperCase() + currentMonth.slice(1);
                   
                   // SIFIRDAN TEMİZ İLAN OLUŞTURMA
                   const newProp: Property = { 
                     id, 
                     title: 'Yeni İlan Başlığı', 
                     location: 'Şehir, Mahalle',
                     image: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1000&q=80',
                     currentPrice: 0,
                     agentNotes: '',
                     clientFeedback: [],
                     offers: [], 
                     stats: [{ month: capitalizedMonth, views: 0, favorites: 0, messages: 0, calls: 0, visits: 0 }],
                     market: { comparablePrice: 0, buildingUnitsCount: 0, neighborhoodUnitsCount: 0, avgSaleDurationDays: 0 }
                   };
                   setProperties([...properties, newProp]);
                   setSelectedPropertyId(id);
                   setActiveTab('edit');
                }} className="px-6 py-3 bg-[#001E3C] text-white rounded-xl font-bold flex items-center gap-2 shadow-lg"><Plus size={20}/> Yeni İlan</button>
             </div>
             <div className="relative"><Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20}/><input type="text" placeholder="İsim veya kod ile ara..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-14 pr-6 py-4 bg-white border border-slate-200 rounded-2xl outline-none text-[#001E3C]" /></div>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProperties.map(p => (
                  <div key={p.id} className="bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-xl transition-all group">
                     <div className="h-48 relative overflow-hidden">
                       <img src={p.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                       <button onClick={(e) => { e.stopPropagation(); handleDeleteProperty(p.id); }} className="absolute top-4 right-4 p-2 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-10"><Trash2 size={16}/></button>
                       {/* OKUNABİLİR KOD ETİKETİ */}
                       <div className="absolute bottom-4 left-4 px-3 py-1 bg-[#001E3C] text-white rounded text-[10px] font-black shadow-lg border border-white/20">
                         {p.id}
                       </div>
                     </div>
                     <div className="p-6 space-y-4">
                        <h4 className="font-bold text-lg text-[#001E3C] line-clamp-1">{p.title}</h4>
                        <div className="flex gap-2">
                           <button onClick={() => { setSelectedPropertyId(p.id); setActiveTab('dashboard'); }} className="flex-1 py-3 bg-[#001E3C] text-white rounded-xl text-xs font-bold">Rapor</button>
                           <button onClick={() => { setSelectedPropertyId(p.id); setActiveTab('edit'); }} className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:text-[#001E3C]"><Edit3 size={18}/></button>
                        </div>
                     </div>
                  </div>
                ))}
             </div>
          </div>
        )}

        {/* EDIT TAB */}
        {activeTab === 'edit' && currentProperty && (
          <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-right-10">
             <div className="flex justify-between items-center">
                <button onClick={() => setActiveTab('propertyList')} className="flex items-center gap-2 text-slate-500 font-bold hover:text-[#001E3C]"><ArrowLeft size={20}/> Vazgeç</button>
                <h2 className="text-2xl font-black text-[#001E3C]">İlanı Düzenle <span className="text-slate-400 text-sm ml-2 font-mono">({currentProperty.id})</span></h2>
             </div>
             
             <div className="bg-white rounded-[2.5rem] p-8 lg:p-10 shadow-xl border border-slate-100 space-y-12">
                <section className="space-y-6">
                   <h3 className="text-lg font-black text-[#001E3C] border-b pb-2 flex items-center gap-2"><Info size={20}/> Temel Bilgiler</h3>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <AdminInput label="Başlık" value={currentProperty.title} onChange={(v:any) => updatePropertyData('title', v)} />
                      <AdminInput label="Konum" value={currentProperty.location} onChange={(v:any) => updatePropertyData('location', v)} />
                      <AdminInput label="Fiyat (₺)" type="number" value={currentProperty.currentPrice} onChange={(v:any) => updatePropertyData('currentPrice', v)} />
                      <AdminInput label="Görsel URL" value={currentProperty.image} onChange={(v:any) => updatePropertyData('image', v)} />
                   </div>
                </section>

                <section className="space-y-6">
                   <div className="flex justify-between items-center border-b pb-2"><h3 className="text-lg font-black text-[#001E3C] flex items-center gap-2"><TrendingUp size={20}/> Performans ({latestStats?.month})</h3><button onClick={handleAddMonth} className="text-xs font-black bg-[#001E3C] text-white px-3 py-1.5 rounded-lg">Yeni Ay Ekle</button></div>
                   <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      <AdminInput label="Görüntü" type="number" value={latestStats?.views} onChange={(v:any) => {
                        const s = [...currentProperty.stats];
                        s[s.length-1].views = v;
                        updatePropertyData('stats', s);
                      }} />
                      <AdminInput label="Favori" type="number" value={latestStats?.favorites} onChange={(v:any) => {
                        const s = [...currentProperty.stats];
                        s[s.length-1].favorites = v;
                        updatePropertyData('stats', s);
                      }} />
                      <AdminInput label="Mesaj" type="number" value={latestStats?.messages} onChange={(v:any) => {
                        const s = [...currentProperty.stats];
                        s[s.length-1].messages = v;
                        updatePropertyData('stats', s);
                      }} />
                      <AdminInput label="Arama" type="number" value={latestStats?.calls} onChange={(v:any) => {
                        const s = [...currentProperty.stats];
                        s[s.length-1].calls = v;
                        updatePropertyData('stats', s);
                      }} />
                      <AdminInput label="Ziyaret" type="number" value={latestStats?.visits} onChange={(v:any) => {
                        const s = [...currentProperty.stats];
                        s[s.length-1].visits = v;
                        updatePropertyData('stats', s);
                      }} />
                   </div>
                </section>

                <section className="space-y-6">
                   <h3 className="text-lg font-black text-[#001E3C] border-b pb-2 flex items-center gap-2"><Target size={20}/> Piyasa Analizi</h3>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <AdminInput label="Emsal Satış Fiyatı (₺)" type="number" value={currentProperty.market.comparablePrice} onChange={(v:any) => updatePropertyData('market', {...currentProperty.market, comparablePrice: v})} />
                      <AdminInput label="Ort. Satış Süresi (Gün)" type="number" value={currentProperty.market.avgSaleDurationDays} onChange={(v:any) => updatePropertyData('market', {...currentProperty.market, avgSaleDurationDays: v})} />
                      <AdminInput label="Binadaki Diğer Satılıklar" type="number" value={currentProperty.market.buildingUnitsCount} onChange={(v:any) => updatePropertyData('market', {...currentProperty.market, buildingUnitsCount: v})} />
                      <AdminInput label="Mahalledeki Diğer Satılıklar" type="number" value={currentProperty.market.neighborhoodUnitsCount} onChange={(v:any) => updatePropertyData('market', {...currentProperty.market, neighborhoodUnitsCount: v})} />
                   </div>
                </section>

                <section className="space-y-6">
                   <h3 className="text-lg font-black text-[#001E3C] border-b pb-2 flex items-center gap-2"><Wallet size={20}/> Teklifler</h3>
                   <div className="bg-slate-50 p-6 rounded-2xl space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <AdminInput label="Teklif Sahibi" value={newOffer.bidder} onChange={(v:any) => setNewOffer({...newOffer, bidder: v})} />
                        <AdminInput label="Tutar (₺)" type="number" value={newOffer.amount} onChange={(v:any) => setNewOffer({...newOffer, amount: v})} />
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase">Durum</label>
                          <select value={newOffer.status} onChange={e => setNewOffer({...newOffer, status: e.target.value as any})} className="w-full p-3.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-[#001E3C]">
                            <option value="Beklemede">Beklemede</option>
                            <option value="Kabul Edildi">Kabul Edildi</option>
                            <option value="Reddedildi">Reddedildi</option>
                          </select>
                        </div>
                      </div>
                      <button onClick={handleAddOffer} className="w-full py-4 bg-[#001E3C] text-white rounded-xl font-bold text-sm shadow-lg"><Plus size={18} className="inline mr-2"/> Teklif Ekle</button>
                   </div>
                   <div className="space-y-3">
                      {currentProperty.offers?.map(offer => (
                        <div key={offer.id} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-xl shadow-sm">
                           <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg ${offer.status === 'Kabul Edildi' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'}`}><Wallet size={16}/></div>
                              <div><p className="font-bold text-sm text-[#001E3C]">{offer.bidder}</p><p className="text-[10px] text-slate-400">₺{offer.amount.toLocaleString()} • {offer.status}</p></div>
                           </div>
                           <button onClick={() => updatePropertyData('offers', currentProperty.offers.filter(o => o.id !== offer.id))} className="text-red-300 hover:text-red-500"><Trash2 size={16}/></button>
                        </div>
                      ))}
                   </div>
                </section>

                <section className="space-y-6">
                   <h3 className="text-lg font-black text-[#001E3C] border-b pb-2 flex items-center gap-2"><MessageCircle size={20}/> Danışman Notu</h3>
                   <textarea value={currentProperty.agentNotes} onChange={e => updatePropertyData('agentNotes', e.target.value)} placeholder="Müşterinize iletmek istediğiniz mesaj..." className="w-full h-32 p-5 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-[#001E3C] font-bold" />
                </section>

                <div className="pt-10 flex flex-col gap-4">
                  <button onClick={() => setActiveTab('dashboard')} className="w-full py-5 bg-[#001E3C] text-white rounded-[2rem] font-black text-lg shadow-2xl">Kaydet ve Raporu Görüntüle</button>
                  <button onClick={() => handleDeleteProperty(currentProperty.id)} className="w-full py-4 text-red-500 font-bold hover:bg-red-50 rounded-2xl transition-all">İlanı Tamamen Sil</button>
                </div>
             </div>
          </div>
        )}

        {/* DASHBOARD TAB (Client View) */}
        {activeTab === 'dashboard' && currentProperty && latestStats && (
          <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in duration-1000">
             <div className="flex flex-col lg:flex-row justify-between items-start gap-6">
                <div className="space-y-2">
                   <div className="flex items-center gap-2 mb-2">
                     <span className="px-3 py-1 bg-[#001E3C] text-white text-[10px] font-black rounded-full uppercase tracking-widest">{latestStats.month} Performansı</span>
                     {isAdminAuthenticated && <span className="px-3 py-1 bg-amber-500 text-white text-[10px] font-black rounded-full uppercase">Önizleme Modu</span>}
                   </div>
                   <h2 className="text-4xl font-black text-[#001E3C] tracking-tight">{currentProperty.title}</h2>
                   <p className="flex items-center gap-2 text-slate-500 font-medium"><MapPin size={16}/> {currentProperty.location}</p>
                </div>
                <div className="flex gap-4 w-full lg:w-auto">
                   {isAdminAuthenticated && (
                     <button onClick={() => setActiveTab('edit')} className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm"><Edit3 size={24}/></button>
                   )}
                   <button onClick={async () => { setIsGenerating(true); setAiSummary(await generateReportSummary({ property: currentProperty, period: latestStats.month, clientName: 'Değerli Ortağımız' })); setIsGenerating(false); }} className="flex-1 lg:flex-none px-8 py-4 bg-gradient-to-r from-[#001E3C] to-[#004080] text-white rounded-2xl font-black shadow-xl hover:scale-105 transition-all flex items-center justify-center gap-3">
                     {isGenerating ? <Loader2 size={20} className="animate-spin"/> : <Sparkles size={20} className="text-amber-300"/>} AI Analizi Oluştur
                   </button>
                </div>
             </div>

             {aiSummary && (
               <div className="bg-white p-8 lg:p-12 rounded-[3rem] shadow-xl border border-blue-50 animate-in slide-in-from-top-6 duration-700">
                 <h4 className="text-xl font-black text-[#001E3C] mb-6 flex items-center gap-3"><Sparkles size={24} className="text-amber-500"/> Türkwest Strateji Özeti</h4>
                 <p className="text-slate-600 leading-relaxed font-medium whitespace-pre-line">{aiSummary}</p>
               </div>
             )}

             <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <DashboardStat label="Görüntüleme" value={latestStats.views} icon={<Eye size={20}/>} color="blue" />
                <DashboardStat label="Favoriye Ekleme" value={latestStats.favorites} icon={<Heart size={20}/>} color="red" />
                <DashboardStat label="İletişim Talebi" value={latestStats.messages + latestStats.calls} icon={<MessageSquare size={20}/>} color="indigo" />
                <DashboardStat label="Mülk Gösterimi" value={latestStats.visits} icon={<Navigation size={20}/>} color="emerald" />
             </div>

             <div className="space-y-6">
                <h4 className="text-2xl font-black text-[#001E3C] flex items-center gap-3"><Layers size={24} className="text-blue-500"/> Piyasa Konumu</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                   <MarketMetric label="Emsal Fiyat" value={`₺${currentProperty.market.comparablePrice.toLocaleString()}`} icon={<Target size={20}/>} />
                   <MarketMetric label="Ort. Satış Süresi" value={`${currentProperty.market.avgSaleDurationDays} Gün`} icon={<Timer size={20}/>} />
                   <MarketMetric label="Binadaki Rekabet" value={`${currentProperty.market.buildingUnitsCount} İlan`} icon={<Building2 size={20}/>} />
                   <MarketMetric label="Bölge Rekabeti" value={`${currentProperty.market.neighborhoodUnitsCount} İlan`} icon={<Layers size={20}/>} />
                </div>
             </div>

             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm space-y-8">
                   <h4 className="text-xl font-black text-[#001E3C] flex items-center justify-between">
                      Teklif Geçmişi 
                      <span className="text-xs font-black bg-orange-50 text-orange-600 px-3 py-1 rounded-full">{currentProperty.offers?.length || 0} Teklif</span>
                   </h4>
                   <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                      {(!currentProperty.offers || currentProperty.offers.length === 0) ? (
                        <div className="text-center py-12 text-slate-300 italic font-bold">Henüz bir teklif ulaşmadı.</div>
                      ) : (
                        currentProperty.offers.map(offer => (
                          <div key={offer.id} className="flex items-center justify-between p-5 bg-slate-50/50 rounded-2xl border border-slate-100">
                             <div className="flex items-center gap-4">
                               <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-400 shadow-sm"><User size={20}/></div>
                               <div>
                                 <p className="font-bold text-sm text-[#001E3C]">{offer.bidder.substring(0,2)}***</p>
                                 <p className="text-[10px] text-slate-400 font-bold">{offer.date}</p>
                               </div>
                             </div>
                             <div className="text-right">
                               <p className="font-black text-sm text-[#001E3C]">₺{offer.amount.toLocaleString()}</p>
                               <span className={`text-[9px] font-black uppercase tracking-widest ${offer.status === 'Kabul Edildi' ? 'text-emerald-500' : 'text-slate-400'}`}>{offer.status}</span>
                             </div>
                          </div>
                        ))
                      )}
                   </div>
                </div>

                <div className="bg-[#001E3C] p-10 rounded-[3rem] text-white space-y-6 flex flex-col justify-center">
                   <div className="flex items-center gap-3"><MessageCircle size={32} className="text-blue-400"/><h4 className="text-2xl font-black">Danışman Mesajı</h4></div>
                   <p className="text-xl font-medium leading-relaxed italic text-white/90">"{currentProperty.agentNotes || 'Gayrimenkulünüzün satışı için dijital pazarlama ve yerel ağımızdaki çalışmalarımız tüm hızıyla sürmektedir. Her türlü sorunuz için buradayım.'}"</p>
                   <div className="pt-4 flex items-center gap-3">
                      <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center font-black text-white">TW</div>
                      <div><p className="font-black text-sm">Türkwest Gayrimenkul</p><p className="text-xs text-white/40 font-bold uppercase tracking-widest">Profesyonel Danışmanlık</p></div>
                   </div>
                </div>
             </div>

             <div className="bg-white p-10 lg:p-12 rounded-[3.5rem] border border-slate-200 shadow-sm space-y-8 max-w-2xl mx-auto">
                <div className="text-center space-y-2">
                  <h4 className="text-2xl font-black text-[#001E3C]">Mülkünüz Hakkında Bir Notunuz Var mı?</h4>
                  <p className="text-slate-500 text-sm">Bu raporla ilgili sorularınızı veya güncel taleplerinizi doğrudan danışmanınıza iletin.</p>
                </div>
                {showFeedbackSuccess ? (
                  <div className="bg-emerald-50 text-emerald-600 p-8 rounded-[2.5rem] text-center font-bold animate-in zoom-in">
                    <CheckCircle2 size={40} className="mx-auto mb-3"/> Mesajınız Başarıyla İletildi!
                  </div>
                ) : (
                  <div className="space-y-4">
                    <textarea value={clientNoteInput} onChange={e => setClientNoteInput(e.target.value)} placeholder="Buraya yazın..." className="w-full h-32 p-6 bg-slate-50 border border-slate-200 rounded-[2.5rem] outline-none focus:border-[#001E3C] font-bold text-[#001E3C] resize-none transition-all" />
                    <button onClick={handleAddFeedback} className="w-full py-5 bg-[#001E3C] text-white rounded-[2.5rem] font-black shadow-xl flex items-center justify-center gap-3 hover:scale-105 active:scale-95 transition-all"><Send size={20}/> Danışmana Gönder</button>
                  </div>
                )}
             </div>
          </div>
        )}

        {/* CLOUD SETTINGS */}
        {activeTab === 'cloudSettings' && isAdminAuthenticated && (
          <div className="max-w-2xl mx-auto space-y-8 animate-in slide-in-from-bottom-10">
             <div className="bg-[#001E3C] p-10 rounded-[3rem] text-white space-y-8 shadow-2xl">
                <h3 className="text-3xl font-black">Sistem Ayarları</h3>
                <div className="p-6 bg-white/5 border border-white/10 rounded-2xl space-y-4">
                   <div className="flex justify-between items-center"><span className="text-white/40 text-xs font-bold">Veri Kaynağı:</span><span className="text-emerald-400 font-mono text-xs uppercase font-black">{cloudStatus}</span></div>
                   <div className="space-y-1"><p className="text-[10px] text-white/40 font-bold uppercase">Endpoint</p><p className="text-xs font-mono break-all text-white/70">{SUPABASE_URL}</p></div>
                </div>
                {cloudErrorMessage && (
                  <div className="p-5 bg-red-500/10 border border-red-500/20 rounded-2xl">
                    <p className="text-red-400 text-[11px] font-mono leading-relaxed">{cloudErrorMessage}</p>
                    <p className="mt-4 text-[10px] text-white/50">Eğer tablo hatası alıyorsanız Supabase SQL editor'den tabloyu oluşturmanız gerekir.</p>
                  </div>
                )}
                <button onClick={() => window.location.reload()} className="w-full py-5 bg-white text-[#001E3C] rounded-2xl font-black flex items-center justify-center gap-2"><RefreshCw size={20}/> Bağlantıyı Yenile</button>
             </div>
          </div>
        )}

        {/* LOGIN MODAL */}
        {showLoginModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#001E3C]/95 backdrop-blur-xl p-4">
            <div className="bg-white w-full max-w-sm rounded-[3rem] p-12 text-center animate-in zoom-in">
              <Lock className="text-[#001E3C] mx-auto mb-6" size={40}/>
              <h3 className="text-2xl font-black text-[#001E3C] mb-8">Yönetici Girişi</h3>
              <form onSubmit={handleLogin} className="space-y-4">
                <input type="password" autoFocus placeholder="Şifre" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} className={`w-full p-4 bg-slate-50 border-2 rounded-2xl outline-none text-center text-xl font-black tracking-widest text-[#001E3C] ${loginError ? 'border-red-500' : 'border-slate-100 focus:border-[#001E3C]'}`} />
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

// --- HELPER COMPONENTS ---

const NavItem = ({ icon, label, active, onClick }: any) => (
  <button onClick={onClick} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all ${active ? 'bg-white/10 text-white font-black shadow-lg' : 'text-white/30 hover:bg-white/5 hover:text-white'}`}>
    {icon} <span className="text-[13px]">{label}</span>
  </button>
);

const DashboardStat = ({ label, value, icon, color }: any) => {
  const styles: any = { 
    blue: 'bg-blue-50 text-blue-600', 
    red: 'bg-red-50 text-red-600', 
    indigo: 'bg-indigo-50 text-indigo-600', 
    emerald: 'bg-emerald-50 text-emerald-600' 
  };
  return (
    <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
       <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${styles[color]}`}>{icon}</div>
       <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p><h4 className="text-2xl font-black text-[#001E3C]">{Number(value).toLocaleString()}</h4></div>
    </div>
  );
};

const MarketMetric = ({ label, value, icon }: any) => (
  <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4">
     <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center">{icon}</div>
     <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{label}</p><h4 className="text-lg font-black text-[#001E3C]">{value}</h4></div>
  </div>
);

const AdminInput = ({ label, value, onChange, type = "text" }: any) => (
  <div className="space-y-1">
    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</label>
    <input type={type === 'number' ? 'text' : type} value={value} onChange={(e) => {
      const v = e.target.value;
      if(type === 'number') {
        const n = v === '' ? 0 : Number(v.replace(/[^0-9]/g, ''));
        if(!isNaN(n)) onChange(n);
      } else {
        onChange(v);
      }
    }} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-[#001E3C] transition-colors text-[#001E3C]" />
  </div>
);

export default App;
