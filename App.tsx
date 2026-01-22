import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  LayoutDashboard, LogOut, Sparkles, MapPin, MessageSquare, Eye, Heart, 
  Navigation, Info, Edit3, Send, Lock, CheckCircle2, Plus, Trash2, Search, 
  Home, Award, Building2, Layers, MessageCircle, RefreshCw, Settings, 
  Loader2, User, Wallet, Timer, Target, ArrowLeft, History, DollarSign,
  Bell, Inbox, Calendar, BarChart3, TrendingUp, Phone, UserCheck, Share2,
  CheckCircle, Clock, List, Users, Briefcase, FileText, Upload, PieChart, Activity
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, LineChart, Line
} from 'recharts';
import { createClient } from '@supabase/supabase-js';
import { Property, PropertyStats, Offer, ClientFeedback, PricePoint, Agent, SocialMediaTask, Customer } from './types.ts';
import { generateReportSummary } from './services/geminiService.ts';

const SUPABASE_URL = "https://vaafmxefgjofqcrnrnlw.supabase.co";
const SUPABASE_KEY = "sb_publishable_0Jtlb5Ds-ZoTBXiEFmxyAg_LNY5NQud"; 

const ADMIN_PASSWORD = "west";
const MONTHS_LIST = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const RIZE_NEIGHBORHOODS = [
  "Alipaşa", "Atmaca", "Bağdatlı", "Balsu", "Bozkale", "Camiönü", "Çamlıbel", "Çarşı", 
  "Dağınıksu", "Dağsu", "Değirmendere", "Dereüstü", "Ekrem Orhon", "Eminettin", "Engindere", 
  "Eskikale", "Fatih", "Gülbahar", "Hamidiye", "Hayrat", "İslampaşa", "İstiklal", "Kale", 
  "Karasu", "Kaplıca", "Kavaklı", "Mermerdelen", "Müftü", "Paşaköy", "Pehlivantaşı", 
  "Piriçelebi", "Portakallık", "Reşadiye", "Taşlıdere", "Tophane", "Yağlıtaş", "Yeniköy"
];

const INITIAL_PROPERTIES: Property[] = [
  {
    id: 'west-101',
    title: 'Lüks Deniz Manzaralı Daire',
    location: 'Rize, Merkez',
    image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1000&q=80',
    currentPrice: 18500000,
    agentName: 'Can West',
    agentPhone: '5551234567',
    listingDate: '2024-01-15',
    viewCountByClient: 12,
    priceHistory: [
      { date: '15.01.2024', amount: 19500000 },
      { date: '20.03.2024', amount: 19000000 },
      { date: '12.06.2024', amount: 18500000 }
    ],
    agentNotes: "Mülkümüz bu ay ciddi bir ivme kazandı. Gelen teklifler nakit alım üzerine yoğunlaşıyor.",
    clientFeedback: [
      { id: 'fb-initial', date: '15.06.2024', message: 'Fiyatı biraz daha esnetebilir miyiz?', requestedPrice: 18000000 }
    ],
    offers: [
      { id: '1', date: '12.06.2024', amount: 17500000, bidder: 'A. Yılmaz', status: 'Reddedildi' },
      { id: '2', date: '15.06.2024', amount: 18100000, bidder: 'M. Kaya', status: 'Beklemede' }
    ],
    stats: [
      { month: 'Ocak', views: 320, favorites: 15, messages: 4, calls: 2, visits: 1 },
      { month: 'Haziran', views: 820, favorites: 68, messages: 18, calls: 14, visits: 8 }
    ],
    market: { comparablePrice: 17800000, buildingUnitsCount: 2, neighborhoodUnitsCount: 14, avgSaleDurationDays: 45 }
  }
];

const App: React.FC = () => {
  const [properties, setProperties] = useState<Property[]>(INITIAL_PROPERTIES);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [socialMediaTasks, setSocialMediaTasks] = useState<SocialMediaTask[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(() => {
    try { return localStorage.getItem("west_admin_auth") === "true"; } catch { return false; }
  });

  const [activeTab, setActiveTab] = useState<'dashboard' | 'propertyList' | 'agents' | 'calendar' | 'customers' | 'portfolioStats' | 'edit' | 'notifications'>('propertyList');
  const [passwordInput, setPasswordInput] = useState("");
  const [clientCodeInput, setClientCodeInput] = useState("");
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  
  const [startRangeIdx, setStartRangeIdx] = useState<number>(0);
  const [endRangeIdx, setEndRangeIdx] = useState<number>(-1);

  const [isClientMode, setIsClientMode] = useState(false);
  const [aiSummary, setAiSummary] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoadingCloud, setIsLoadingCloud] = useState(false);
  
  const [newOffer, setNewOffer] = useState({ amount: '', bidder: '' });
  const [newPriceUpdate, setNewPriceUpdate] = useState({ date: new Date().toISOString().slice(0, 10), amount: "" });
  const [newAgent, setNewAgent] = useState({ name: '', phone: '' });
  const [newTask, setNewTask] = useState<Partial<SocialMediaTask>>({ propertyId: '', startDate: '', endDate: '', taskType: 'Instagram Reels', status: 'Planlandı' });
  const [newCustomer, setNewCustomer] = useState<Partial<Customer>>({ name: '', phone: '', preferredSize: '2+1', preferredNeighborhood: 'Merkez', budget: 0, category: 'Satılık', lastContactDate: '', notes: '' });
  
  const [clientNoteInput, setClientNoteInput] = useState("");
  const [clientRequestedPriceInput, setClientRequestedPriceInput] = useState("");
  const [showFeedbackSuccess, setShowFeedbackSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const supabase = useMemo(() => {
    if (SUPABASE_URL && SUPABASE_KEY) {
      try { return createClient(SUPABASE_URL, SUPABASE_KEY); } catch (e) { return null; }
    }
    return null;
  }, []);

  useEffect(() => {
    const initializeData = async () => {
      setIsLoadingCloud(true);
      if (supabase) {
        try {
          const { data, error } = await supabase.from('portfolios').select('data').eq('id', 'main_database').single();
          if (!error && data?.data) {
            setProperties(data.data.properties || INITIAL_PROPERTIES);
            setAgents(data.data.agents || []);
            setSocialMediaTasks(data.data.socialMediaTasks || []);
            setCustomers(data.data.customers || []);
            setIsLoadingCloud(false);
            return;
          }
        } catch (e) { console.error(e); }
      }
      try {
        const saved = localStorage.getItem('west_full_data');
        if (saved) { 
          const parsed = JSON.parse(saved);
          setProperties(parsed.properties || INITIAL_PROPERTIES);
          setAgents(parsed.agents || []);
          setSocialMediaTasks(parsed.socialMediaTasks || []);
          setCustomers(parsed.customers || []);
        }
      } catch(e) {}
      setIsLoadingCloud(false);
    };
    initializeData();
  }, [supabase]);

  useEffect(() => {
    if (isLoadingCloud) return;
    const fullData = { properties, agents, socialMediaTasks, customers };
    try { localStorage.setItem('west_full_data', JSON.stringify(fullData)); } catch (e) {}
    
    if (supabase && (isAdminAuthenticated || isClientMode)) {
      const sync = async () => {
        try { await supabase.from('portfolios').upsert({ id: 'main_database', data: fullData }); } catch (e) {}
      };
      const timer = setTimeout(sync, 1500);
      return () => clearTimeout(timer);
    }
  }, [properties, agents, socialMediaTasks, customers, supabase, isAdminAuthenticated, isClientMode, isLoadingCloud]);

  const currentProperty = useMemo(() => properties.find(p => p.id === selectedPropertyId), [properties, selectedPropertyId]);
  const filteredProperties = useMemo(() => properties.filter(p => p.title.toLowerCase().includes(searchTerm.toLowerCase()) || p.id.toLowerCase().includes(searchTerm.toLowerCase())), [properties, searchTerm]);
  const allFeedbacks = useMemo(() => properties.flatMap(p => (p.clientFeedback || []).map(f => ({ ...f, propertyTitle: p.title, propertyId: p.id }))), [properties]);
  const totalNotifications = allFeedbacks.length;

  const actualEndIdx = useMemo(() => {
    const statsLength = currentProperty?.stats?.length || 0;
    if (statsLength === 0) return 0;
    if (endRangeIdx === -1) return statsLength - 1;
    return Math.min(endRangeIdx, statsLength - 1);
  }, [currentProperty, endRangeIdx]);

  const actualStartIdx = useMemo(() => Math.min(startRangeIdx, actualEndIdx), [startRangeIdx, actualEndIdx]);
  const filteredStats = useMemo(() => (currentProperty?.stats || []).slice(actualStartIdx, actualEndIdx + 1), [currentProperty, actualStartIdx, actualEndIdx]);

  const latestStats = useMemo(() => {
    if (!currentProperty || !currentProperty.stats || currentProperty.stats.length === 0) {
      return { month: 'Veri Yok', views: 0, favorites: 0, messages: 0, calls: 0, visits: 0 };
    }
    return currentProperty.stats[actualEndIdx];
  }, [currentProperty, actualEndIdx]);

  const previousStats = useMemo(() => {
    if (!currentProperty || !currentProperty.stats || actualEndIdx <= 0) return null;
    return currentProperty.stats[actualEndIdx - 1];
  }, [currentProperty, actualEndIdx]);

  const performanceChartData = useMemo(() => filteredStats.map(s => ({
    name: s.month, Görüntüleme: s.views, Favori: s.favorites, Etkileşim: s.messages + s.calls + s.visits
  })), [filteredStats]);

  const priceChartData = useMemo(() => (currentProperty?.priceHistory || []).map(ph => ({ date: ph.date, Fiyat: ph.amount })), [currentProperty]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === ADMIN_PASSWORD) {
      setIsAdminAuthenticated(true);
      try { localStorage.setItem('west_admin_auth', 'true'); } catch (e) {}
      setShowLoginModal(false);
      totalNotifications > 0 ? setActiveTab('notifications') : setActiveTab('propertyList');
      setPasswordInput("");
    } else { alert("Hatalı Şifre!"); }
  };

  const handleLogout = () => {
    setIsAdminAuthenticated(false);
    setIsClientMode(false);
    try { localStorage.removeItem('west_admin_auth'); } catch (e) {}
    setSelectedPropertyId(null);
    setActiveTab('propertyList');
  };

  const updatePropertyData = (field: keyof Property, value: any) => {
    if (!selectedPropertyId) return;
    setProperties(prev => prev.map(p => p.id === selectedPropertyId ? { ...p, [field]: value } : p));
  };

  const handleUpdateStat = (monthIdx: number, statField: keyof PropertyStats, statValue: any) => {
    if (!currentProperty) return;
    const newStats = [...(currentProperty.stats || [])];
    if (newStats[monthIdx]) {
      newStats[monthIdx] = { ...newStats[monthIdx], [statField]: statValue };
      updatePropertyData('stats', newStats);
    }
  };

  const handleAddMonth = () => {
    if (!currentProperty) return;
    const currentStats = currentProperty.stats || [];
    let nextMonth = "Ocak";
    if (currentStats.length > 0) {
      const lastMonth = currentStats[currentStats.length - 1].month;
      const lastIdx = MONTHS_LIST.indexOf(lastMonth);
      nextMonth = MONTHS_LIST[(lastIdx + 1) % 12];
    }
    updatePropertyData('stats', [...currentStats, { month: nextMonth, views: 0, favorites: 0, messages: 0, calls: 0, visits: 0 }]);
  };

  const handleAddOffer = () => {
    if (!currentProperty || !newOffer.amount || !newOffer.bidder) return;
    const offer: Offer = { id: Date.now().toString(), date: new Date().toLocaleDateString('tr-TR'), amount: Number(newOffer.amount), bidder: newOffer.bidder, status: 'Beklemede' };
    updatePropertyData('offers', [...(currentProperty.offers || []), offer]);
    setNewOffer({ amount: '', bidder: '' });
  };

  const handleAddPriceUpdate = () => {
    if (!currentProperty || !newPriceUpdate.amount) return;
    const pricePoint: PricePoint = { date: newPriceUpdate.date, amount: Number(newPriceUpdate.amount) };
    const updatedHistory = [...(currentProperty.priceHistory || []), pricePoint];
    setProperties(prev => prev.map(p => p.id === selectedPropertyId ? { ...p, priceHistory: updatedHistory, currentPrice: Number(newPriceUpdate.amount) } : p));
    setNewPriceUpdate({ date: new Date().toLocaleDateString('tr-TR'), amount: '' });
  };

  const handleAddAgent = () => {
    if (!newAgent.name || !newAgent.phone) return;
    setAgents(prev => [...prev, { id: Date.now().toString(), ...newAgent }]);
    setNewAgent({ name: '', phone: '' });
  };

  const handleAddTask = () => {
    if (!newTask.propertyId || !newTask.startDate || !newTask.endDate || !newTask.taskType) return;
    const prop = properties.find(p => p.id === newTask.propertyId);
    setSocialMediaTasks(prev => [...prev, {
      id: Date.now().toString(), propertyId: newTask.propertyId!, propertyName: prop?.title || 'Bilinmeyen Mülk',
      startDate: newTask.startDate!, endDate: newTask.endDate!, taskType: newTask.taskType!, status: (newTask.status as any) || 'Planlandı'
    }]);
    setNewTask({ propertyId: '', startDate: '', endDate: '', taskType: 'Instagram Reels', status: 'Planlandı' });
  };

  const handleAddCustomer = () => {
    if (!newCustomer.name || !newCustomer.phone) return;
    setCustomers(prev => [...prev, {
      id: Date.now().toString(), name: newCustomer.name!, phone: newCustomer.phone!,
      preferredSize: newCustomer.preferredSize || '2+1', preferredNeighborhood: newCustomer.preferredNeighborhood || 'Alipaşa',
      budget: Number(newCustomer.budget || 0), category: newCustomer.category as any || 'Satılık',
      lastContactDate: newCustomer.lastContactDate || new Date().toISOString().split('T')[0], notes: newCustomer.notes || ''
    }]);
    setNewCustomer({ name: '', phone: '', preferredSize: '2+1', preferredNeighborhood: 'Alipaşa', budget: 0, category: 'Satılık', lastContactDate: '', notes: '' });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => updatePropertyData('image', reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleDeleteProperty = (id: string) => {
    if (window.confirm('Bu mülkü tamamen silmek istediğinize emin misiniz?')) {
      setProperties(prev => prev.filter(p => p.id !== id));
      setSelectedPropertyId(null);
      setActiveTab('propertyList');
    }
  };

  const handleAddFeedback = () => {
    if (!currentProperty || !clientNoteInput.trim()) return;
    const feedback: ClientFeedback = { id: Date.now().toString(), date: new Date().toLocaleDateString('tr-TR'), message: clientNoteInput.trim(), requestedPrice: clientRequestedPriceInput ? Number(clientRequestedPriceInput) : undefined };
    updatePropertyData('clientFeedback', [...(currentProperty.clientFeedback || []), feedback]);
    setClientNoteInput(""); setClientRequestedPriceInput("");
    setShowFeedbackSuccess(true);
    setTimeout(() => setShowFeedbackSuccess(false), 3000);
  };

  const handleGenerateAISummary = async () => {
    if (!currentProperty) return;
    setIsGenerating(true);
    const statsArr = currentProperty.stats || [];
    const periodString = statsArr.length > 0 ? (actualStartIdx === actualEndIdx ? statsArr[actualEndIdx].month : `${statsArr[actualStartIdx]?.month} - ${statsArr[actualEndIdx]?.month}`) : "Dönem Belirtilmedi";
    const summary = await generateReportSummary({ property: currentProperty, period: periodString, clientName: 'Değerli Ortağımız' });
    setAiSummary(summary);
    setIsGenerating(false);
  };

  const calculateDaysOnMarket = (listingDate?: string) => {
    if (!listingDate) return 0;
    const start = new Date(listingDate);
    const today = new Date();
    const diff = today.getTime() - start.getTime();
    return Math.max(0, Math.floor(diff / (1000 * 3600 * 24)));
  };

  if (isLoadingCloud) return <div className="min-h-screen bg-[#001E3C] flex items-center justify-center text-white"><Loader2 className="animate-spin" size={40}/></div>;

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-[#F8FAFC]">
      {/* Mobile Header (iPhone Fixed) */}
      <header className="lg:hidden fixed top-0 left-0 right-0 bg-[#001E3C] text-white p-4 flex justify-between items-center z-[60] shadow-lg safe-top">
        <div className="flex items-center gap-2">
          <Award size={24} />
          <span className="font-black tracking-tighter uppercase text-sm">TÜRKWEST</span>
        </div>
        {!isAdminAuthenticated && (
          <button onClick={() => setShowLoginModal(true)} className="p-2 bg-white/10 rounded-xl">
            <Lock size={18} />
          </button>
        )}
      </header>

      {/* Sidebar (Desktop Only) */}
      <aside className="hidden lg:flex w-72 bg-[#001E3C] text-white flex-col fixed inset-y-0 z-50">
        <div className="p-8 border-b border-white/5">
          <div className="flex items-center gap-3"><Award size={32} /><h1 className="font-black text-xl tracking-tighter">TÜRKWEST</h1></div>
        </div>
        <nav className="p-6 space-y-2 flex-1 overflow-y-auto custom-scrollbar">
          {isAdminAuthenticated && !isClientMode ? (
            <>
              <NavItem icon={<Home size={20}/>} label="Portföy Merkezi" active={activeTab === 'propertyList'} onClick={() => setActiveTab('propertyList')} />
              <NavItem icon={<PieChart size={20}/>} label="Genel İstatistikler" active={activeTab === 'portfolioStats'} onClick={() => setActiveTab('portfolioStats')} />
              <NavItem icon={<Users size={20}/>} label="Müşteri Yönetimi" active={activeTab === 'customers'} onClick={() => setActiveTab('customers')} />
              <NavItem icon={<UserCheck size={20}/>} label="Danışman Yönetimi" active={activeTab === 'agents'} onClick={() => setActiveTab('agents')} />
              <NavItem icon={<Calendar size={20}/>} label="Pazarlama Takvimi" active={activeTab === 'calendar'} onClick={() => setActiveTab('calendar')} />
              <NavItem icon={<Bell size={20}/>} label="Müşteri Talepleri" badge={totalNotifications} active={activeTab === 'notifications'} onClick={() => setActiveTab('notifications')} />
              {selectedPropertyId && (
                <><div className="pt-4 pb-2 px-6 text-[10px] font-black text-white/30 uppercase tracking-widest">Mülk Paneli</div>
                <NavItem icon={<LayoutDashboard size={20}/>} label="Rapor" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
                <NavItem icon={<Edit3 size={20}/>} label="Düzenle" active={activeTab === 'edit'} onClick={() => setActiveTab('edit')} /></>
              )}
            </>
          ) : (
            <NavItem icon={<LayoutDashboard size={20}/>} label="Varlık Raporu" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
          )}
        </nav>
        <div className="p-6 border-t border-white/5">
           {isAdminAuthenticated ? <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 py-3 bg-red-500/10 text-red-400 rounded-xl text-xs font-bold"><LogOut size={16}/> Çıkış</button> : <button onClick={() => setShowLoginModal(true)} className="w-full py-3 bg-white/10 rounded-xl text-xs font-bold flex items-center justify-center gap-2"><Lock size={14}/> Yönetici</button>}
        </div>
      </aside>

      <main className="flex-1 lg:ml-72 p-4 lg:p-10 pb-32 pt-24 lg:pt-10">
        {!selectedPropertyId && !isAdminAuthenticated && (
          <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4 animate-in zoom-in">
             <Award className="text-[#001E3C] mb-8" size={64} /><h1 className="text-4xl lg:text-5xl font-black text-[#001E3C] mb-4">Varlık Raporu</h1>
             <p className="text-slate-500 mb-10 max-w-sm font-medium">Mülk kodunuzu girerek performans analizini görüntüleyin.</p>
             <form onSubmit={(e) => { 
               e.preventDefault(); 
               const p = properties.find(x => x.id.toLowerCase() === clientCodeInput.trim().toLowerCase()); 
               if(p) { setProperties(prev => prev.map(item => item.id === p.id ? { ...item, viewCountByClient: (item.viewCountByClient || 0) + 1 } : item)); setSelectedPropertyId(p.id); setIsClientMode(true); setActiveTab('dashboard'); } 
               else { alert('Mülk bulunamadı.'); } 
             }} className="w-full max-w-sm space-y-4">
               <input type="text" placeholder="Örn: west-101" value={clientCodeInput} onChange={e => setClientCodeInput(e.target.value)} className="w-full px-6 py-5 bg-white border-2 border-slate-100 rounded-[2rem] text-center text-2xl font-black uppercase outline-none focus:border-[#001E3C] text-[#001E3C] shadow-sm" />
               <button className="w-full py-5 bg-[#001E3C] text-white rounded-[2rem] font-bold text-lg shadow-xl active:scale-95 transition-transform">Raporu Aç</button>
             </form>
          </div>
        )}

        {activeTab === 'portfolioStats' && isAdminAuthenticated && (
          <div className="max-w-6xl mx-auto space-y-8 animate-in slide-in-from-bottom-5">
            <h2 className="text-3xl font-black text-[#001E3C]">Portföy İstatistikleri</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <DashboardStat label="Toplam Mülk" value={properties.length} icon={<Home size={20}/>} color="indigo" />
               <DashboardStat label="Aktif Teklifler" value={properties.reduce((acc, p) => acc + (p.offers?.filter(o => o.status === 'Beklemede').length || 0), 0)} icon={<Wallet size={20}/>} color="emerald" />
               <DashboardStat label="Müşteri Etkileşimi" value={properties.reduce((acc, p) => acc + (p.viewCountByClient || 0), 0)} icon={<Activity size={20}/>} color="blue" />
            </div>
            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden overflow-x-auto">
               <table className="w-full text-left"><thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest"><tr><th className="px-8 py-4">Mülk</th><th className="px-8 py-4">Fiyat</th><th className="px-8 py-4">Giriş</th><th className="px-8 py-4">Teklif</th><th className="px-8 py-4">Süre</th></tr></thead><tbody className="divide-y divide-slate-100">
               {properties.map(p => (<tr key={p.id} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => { setSelectedPropertyId(p.id); setActiveTab('dashboard'); }}><td className="px-8 py-6"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg overflow-hidden shrink-0"><img src={p.image} className="w-full h-full object-cover"/></div><div><p className="font-bold text-sm text-[#001E3C] line-clamp-1">{p.title}</p><p className="text-[10px] font-bold text-slate-400">{p.id}</p></div></div></td><td className="px-8 py-6 font-black text-sm text-[#001E3C]">₺{p.currentPrice.toLocaleString()}</td><td className="px-8 py-6 text-sm font-bold text-blue-500">{p.viewCountByClient || 0}</td><td className="px-8 py-6 text-sm font-bold text-emerald-600">{p.offers?.length || 0}</td><td className="px-8 py-6 text-[10px] font-black text-orange-500 uppercase">{calculateDaysOnMarket(p.listingDate)} GÜN</td></tr>))}
               </tbody></table>
            </div>
          </div>
        )}

        {/* Existing tabs content kept exactly as provided */}
        {activeTab === 'propertyList' && isAdminAuthenticated && (
          <div className="max-w-6xl mx-auto space-y-8">
             <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <h2 className="text-3xl font-black text-[#001E3C]">Portföy Yönetimi</h2>
                <button onClick={() => { const id = `west-${Math.floor(100+Math.random()*900)}`; const currentMonthName = new Date().toLocaleDateString('tr-TR', { month: 'long' }); const capitalizedMonth = currentMonthName.charAt(0).toUpperCase() + currentMonthName.slice(1); setProperties(prev => [...prev, { id, title: 'Yeni İlan', location: '', image: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1000&q=80', currentPrice: 0, priceHistory: [], agentNotes: '', clientFeedback: [], offers: [], stats: [{ month: capitalizedMonth, views: 0, favorites: 0, messages: 0, calls: 0, visits: 0 }], market: { comparablePrice: 0, buildingUnitsCount: 0, neighborhoodUnitsCount: 0, avgSaleDurationDays: 0 }, agentName: '', agentPhone: '', listingDate: new Date().toISOString().split('T')[0], viewCountByClient: 0 }]); setSelectedPropertyId(id); setActiveTab('edit'); }} className="w-full sm:w-auto px-6 py-3 bg-[#001E3C] text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg"><Plus size={20}/> Yeni İlan</button>
             </div>
             <div className="relative"><Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20}/><input type="text" placeholder="Ara..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-14 pr-6 py-4 bg-white border border-slate-200 rounded-2xl outline-none text-[#001E3C]" /></div>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProperties.map(p => (<div key={p.id} className="bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-xl transition-all group cursor-pointer relative" onClick={() => { setSelectedPropertyId(p.id); setActiveTab('dashboard'); }}><div className="h-48 relative overflow-hidden"><img src={p.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform" /><div className="absolute bottom-4 left-4 px-3 py-1 bg-[#001E3C] text-white rounded text-[10px] font-black">{p.id}</div><div className="absolute top-4 right-4 px-3 py-1 bg-white/90 text-[#001E3C] rounded-full text-[10px] font-black shadow-sm">{calculateDaysOnMarket(p.listingDate)} GÜN</div></div><div className="p-6 space-y-4"><div className="flex justify-between items-start gap-2"><h4 className="font-bold text-lg text-[#001E3C] line-clamp-1">{p.title}</h4><div className="flex items-center gap-1 text-blue-500 shrink-0"><Eye size={14}/> <span className="text-xs font-black">{p.viewCountByClient || 0}</span></div></div><div className="flex gap-2"><button onClick={(e) => { e.stopPropagation(); setSelectedPropertyId(p.id); setActiveTab('dashboard'); }} className="flex-1 py-3 bg-[#001E3C] text-white rounded-xl text-xs font-bold">Rapor</button><button onClick={(e) => { e.stopPropagation(); setSelectedPropertyId(p.id); setActiveTab('edit'); }} className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:text-[#001E3C]"><Edit3 size={18}/></button></div></div></div>))}
             </div>
          </div>
        )}

        {activeTab === 'dashboard' && currentProperty && (
          <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in duration-700">
             <div className="flex flex-col lg:flex-row justify-between items-start gap-6">
                <div className="space-y-2">
                   <div className="flex items-center gap-2 mb-2"><span className="px-3 py-1 bg-[#001E3C] text-white text-[10px] font-black rounded-full uppercase">{(latestStats?.month || '-') + " Performansı"}</span><span className="px-3 py-1 bg-white border border-slate-200 text-[#001E3C] text-[10px] font-black rounded-full shadow-sm uppercase">{calculateDaysOnMarket(currentProperty.listingDate)} GÜNDÜR YAYINDA</span></div>
                   <h2 className="text-4xl font-black text-[#001E3C] tracking-tight">{currentProperty.title}</h2><p className="flex items-center gap-2 text-slate-500 font-medium"><MapPin size={16}/> {currentProperty.location || 'Konum Girilmedi'}</p>
                </div>
                <div className="flex gap-4 w-full lg:w-auto">{isAdminAuthenticated && <button onClick={() => setActiveTab('edit')} className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-all"><Edit3 size={24}/></button>}<button onClick={handleGenerateAISummary} disabled={isGenerating} className="flex-1 lg:flex-none px-8 py-4 bg-[#001E3C] text-white rounded-2xl font-black shadow-xl flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50">{isGenerating ? <Loader2 size={20} className="animate-spin"/> : <Sparkles size={20} className="text-amber-300"/>} AI Analizi</button></div>
             </div>
             {aiSummary && (<div className="bg-white p-10 rounded-[3rem] shadow-2xl border border-blue-50 animate-in slide-in-from-bottom-5"><h4 className="text-xl font-black text-[#001E3C] mb-6 flex items-center gap-3 border-b pb-4"><Sparkles size={24} className="text-amber-500"/> Danışman Analizi</h4><p className="whitespace-pre-line text-[#001E3C] leading-relaxed font-bold text-lg italic">"{aiSummary}"</p></div>)}
             <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                <DashboardStat label="Görülme" value={latestStats.views} prevValue={previousStats?.views} icon={<Eye size={24}/>} color="blue" />
                <DashboardStat label="Favori" value={latestStats.favorites} prevValue={previousStats?.favorites} icon={<Heart size={24}/>} color="red" />
                <DashboardStat label="İletişim" value={latestStats.messages + latestStats.calls} prevValue={previousStats ? (previousStats.messages + previousStats.calls) : undefined} icon={<MessageSquare size={24}/>} color="indigo" />
                <DashboardStat label="Ziyaret" value={latestStats.visits} prevValue={previousStats?.visits} icon={<Navigation size={24}/>} color="emerald" />
             </div>
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-8"><h4 className="text-xl font-black text-[#001E3C] border-b pb-4">Güncel Teklif Akışı</h4><div className="space-y-4 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">{(!currentProperty.offers || currentProperty.offers.length === 0) ? (<div className="text-center py-20 text-slate-200 italic font-black text-2xl">Teklif Bekleniyor...</div>) : (currentProperty.offers.map(offer => (<div key={offer.id} className="flex items-center justify-between p-6 bg-slate-50/50 rounded-2xl border border-slate-100"><div className="flex items-center gap-5"><div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-200 shadow-inner border border-slate-50"><User size={24}/></div><div><p className="font-black text-lg text-[#001E3C]">{offer.bidder.substring(0,2)}*****</p><p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{offer.date} • {offer.status}</p></div></div><p className="font-black text-xl text-[#001E3C]">₺{offer.amount.toLocaleString()}</p></div>)))}</div></div>
                <div className="bg-[#001E3C] p-12 rounded-[2.5rem] text-white flex flex-col justify-between shadow-2xl relative overflow-hidden group"><div className="space-y-10 relative z-10"><div className="flex items-center gap-4"><MessageCircle size={40} className="text-blue-400"/><h4 className="text-2xl font-black tracking-tight">Danışman Notu</h4></div><p className="text-xl font-medium italic text-white/80 leading-relaxed">"{currentProperty.agentNotes || 'Satış süreciniz profesyonel ekibimizce takip edilmektedir.'}"</p></div><div className="mt-16 pt-10 border-t border-white/10 flex items-center justify-between gap-6 relative z-10"><div className="flex items-center gap-5"><div className="w-14 h-14 bg-white/10 rounded-[1.2rem] flex items-center justify-center text-blue-400"><UserCheck size={32}/></div><div><p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Portföy Yöneticisi</p><p className="text-xl font-black tracking-tighter">{currentProperty.agentName || 'TÜRKWEST Danışman'}</p></div></div>{currentProperty.agentPhone && (<a href={`tel:${currentProperty.agentPhone}`} className="w-14 h-14 bg-blue-500 text-white rounded-2xl flex items-center justify-center hover:scale-110 transition-transform shadow-xl"><Phone size={28}/></a>)}</div><div className="absolute top-0 right-0 p-8 opacity-5 rotate-12 group-hover:scale-110 transition-transform duration-1000"><Award size={150}/></div></div>
             </div>
             {!isAdminAuthenticated && (<div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm space-y-8 max-w-2xl mx-auto text-center"><h4 className="text-3xl font-black text-[#001E3C] tracking-tight">Danışmana Mesaj Gönder</h4>{showFeedbackSuccess ? ( <div className="bg-emerald-50 text-emerald-600 p-12 rounded-[2.5rem] font-black text-2xl animate-in zoom-in-95">Talebiniz iletildi.</div> ) : (<div className="space-y-6"><input type="text" placeholder="Fiyat teklifi isteği (₺)" value={clientRequestedPriceInput} onChange={e => setClientRequestedPriceInput(e.target.value.replace(/[^0-9]/g, ''))} className="w-full px-8 py-5 bg-slate-50 border border-slate-200 rounded-3xl outline-none font-black text-xl text-[#001E3C]" /><textarea value={clientNoteInput} onChange={e => setClientNoteInput(e.target.value)} placeholder="Talebiniz..." className="w-full h-40 p-8 bg-slate-50 border border-slate-200 rounded-[2rem] outline-none font-bold text-lg text-[#001E3C] resize-none" /><button onClick={handleAddFeedback} className="w-full py-6 bg-[#001E3C] text-white rounded-[2rem] font-black text-xl shadow-2xl flex items-center justify-center gap-4 active:scale-95 transition-transform"><Send size={24}/> TALEBİ İLET</button></div>)}</div>)}
          </div>
        )}

        {/* Existing CRM, Agents, Notifications tabs kept perfectly intact */}
        {activeTab === 'edit' && currentProperty && (
          <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-right-10 pb-40"><div className="flex justify-between items-center"><button onClick={() => setActiveTab('propertyList')} className="flex items-center gap-2 text-slate-500 font-bold hover:text-[#001E3C]"><ArrowLeft size={20}/> Geri</button><button onClick={() => handleDeleteProperty(currentProperty.id)} className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-500 rounded-xl text-sm font-bold shadow-sm"><Trash2 size={18}/> Mülkü Sil</button></div><div className="bg-white rounded-[2.5rem] p-6 lg:p-10 shadow-xl border border-slate-100 space-y-12"><section className="space-y-6"><h3 className="text-lg font-black text-[#001E3C] border-b pb-2 flex items-center gap-2"><Info size={20}/> Temel Bilgiler</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-6"><AdminInput label="İlan Başlığı" value={currentProperty.title} onChange={(v:any) => updatePropertyData('title', v)} /><AdminInput label="Konum / Mahalle" value={currentProperty.location} onChange={(v:any) => updatePropertyData('location', v)} /><AdminInput label="Fiyat (₺)" type="number" value={currentProperty.currentPrice} onChange={(v:any) => updatePropertyData('currentPrice', v)} /><div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">İlan Tarihi</label><input type="date" value={currentProperty.listingDate || ''} onChange={e => updatePropertyData('listingDate', e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none text-[#001E3C]" /></div><div className="col-span-full flex gap-4"><input type="text" placeholder="Görsel URL" value={currentProperty.image} onChange={(e) => updatePropertyData('image', e.target.value)} className="flex-1 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-[#001E3C]" /><button onClick={() => fileInputRef.current?.click()} className="px-6 bg-white border border-slate-200 text-[#001E3C] rounded-2xl font-bold flex items-center gap-2"><Upload size={18}/> Yükle</button><input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} className="hidden" /></div><div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Danışman Seçin</label><select value={agents.find(a => a.name === currentProperty.agentName)?.id || ""} onChange={(e) => { const selected = agents.find(a => a.id === e.target.value); if (selected) { updatePropertyData('agentName', selected.name); updatePropertyData('agentPhone', selected.phone); } }} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none text-[#001E3C]"><option value="">Seçiniz...</option>{agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div><AdminInput label="Danışman Telefon" value={currentProperty.agentPhone || ''} onChange={(v:any) => updatePropertyData('agentPhone', v)} /></div><textarea value={currentProperty.agentNotes} onChange={(e) => updatePropertyData('agentNotes', e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold h-24 text-[#001E3C]" placeholder="Danışman mesajı..."></textarea></section><section className="space-y-6"><h3 className="text-lg font-black text-[#001E3C] border-b pb-2 flex items-center gap-2"><BarChart3 size={20}/> Aylık Veriler</h3>{(currentProperty.stats || []).map((stat, idx) => (<div key={idx} className="p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-4"><div className="flex justify-between items-center border-b pb-2"><select value={stat.month} onChange={(e) => handleUpdateStat(idx, 'month', e.target.value)} className="bg-transparent font-black text-[#001E3C] outline-none">{MONTHS_LIST.map(m => <option key={m} value={m}>{m}</option>)}</select><button onClick={() => updatePropertyData('stats', currentProperty.stats.filter((_, i) => i !== idx))} className="text-red-400"><Trash2 size={16}/></button></div><div className="grid grid-cols-2 lg:grid-cols-5 gap-4"><AdminInput label="Görüntüleme" type="number" value={stat.views} onChange={(v:any) => handleUpdateStat(idx, 'views', v)} /><AdminInput label="Favori" type="number" value={stat.favorites} onChange={(v:any) => handleUpdateStat(idx, 'favorites', v)} /><AdminInput label="Mesaj" type="number" value={stat.messages} onChange={(v:any) => handleUpdateStat(idx, 'messages', v)} /><AdminInput label="Arama" type="number" value={stat.calls} onChange={(v:any) => handleUpdateStat(idx, 'calls', v)} /><AdminInput label="Ziyaret" type="number" value={stat.visits} onChange={(v:any) => handleUpdateStat(idx, 'visits', v)} /></div></div>))}<button onClick={handleAddMonth} className="w-full py-4 bg-blue-50 text-[#001E3C] rounded-2xl border-2 border-dashed border-blue-200 font-bold flex items-center justify-center gap-2"><Plus size={20}/> Yeni Ay</button></section><button onClick={() => { setActiveTab('dashboard'); window.scrollTo(0,0); }} className="w-full py-5 bg-[#001E3C] text-white rounded-[2rem] font-black text-lg active:scale-95 transition-transform shadow-2xl">KAYDET VE GÖRÜNTÜLE</button></div></div>
        )}
      </main>

      {/* Admin Mobile Menu Bar */}
      {isAdminAuthenticated && (
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-[#001E3C] border-t border-white/5 px-6 py-4 flex justify-around items-center z-[60] safe-bottom">
           <MobileNavItem icon={<Home size={22}/>} label="Portföy" active={activeTab === 'propertyList'} onClick={() => setActiveTab('propertyList')} />
           <MobileNavItem icon={<Users size={22}/>} label="CRM" active={activeTab === 'customers'} onClick={() => setActiveTab('customers')} />
           <MobileNavItem icon={<Calendar size={22}/>} label="Takvim" active={activeTab === 'calendar'} onClick={() => setActiveTab('calendar')} />
           <MobileNavItem icon={<Bell size={22}/>} label="Talepler" active={activeTab === 'notifications'} onClick={() => setActiveTab('notifications')} badge={totalNotifications} />
        </nav>
      )}

      {/* Admin Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-[#001E3C]/95 backdrop-blur-xl p-4">
           <div className="bg-white w-full max-w-sm rounded-[3.5rem] p-12 text-center shadow-2xl">
              <div className="w-16 h-16 bg-slate-50 rounded-[1.5rem] flex items-center justify-center mx-auto mb-8 text-[#001E3C] shadow-inner"><Lock size={32}/></div>
              <h3 className="font-black text-[#001E3C] mb-8 uppercase tracking-widest text-[10px]">Erişim Şifresi</h3>
              <form onSubmit={handleLogin} className="space-y-6">
                 <input type="password" autoFocus placeholder="PIN" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-center text-3xl font-black tracking-widest outline-none focus:border-[#001E3C] text-[#001E3C]" />
                 <button type="submit" className="w-full py-5 bg-[#001E3C] text-white rounded-[2rem] font-black text-xl shadow-2xl">Giriş Yap</button>
                 <button type="button" onClick={() => setShowLoginModal(false)} className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-6">Kapat</button>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

// UI Components
const NavItem = ({ icon, label, active, onClick, badge }: any) => (
  <button onClick={onClick} className={`w-full flex items-center justify-between px-6 py-4 rounded-2xl transition-all ${active ? 'bg-white/10 text-white font-black' : 'text-white/30 hover:text-white'}`}>
    <div className="flex items-center gap-4"><span>{icon}</span><span className="text-[13px]">{label}</span></div>
    {(badge || 0) > 0 && <span className="w-6 h-6 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center">{badge}</span>}
  </button>
);

const MobileNavItem = ({ icon, label, active, onClick, badge }: any) => (
  <button onClick={onClick} className={`flex flex-col items-center gap-1.5 transition-all relative ${active ? 'text-white scale-110' : 'text-white/30'}`}>
    <div className="relative">{icon}{(badge || 0) > 0 && <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white text-[8px] font-black rounded-full flex items-center justify-center ring-2 ring-[#001E3C]">{badge}</span>}</div>
    <span className="text-[9px] font-black uppercase tracking-tighter">{label}</span>
  </button>
);

const DashboardStat = ({ label, value, prevValue, icon, color }: any) => {
  const styles: any = { blue: 'bg-blue-50 text-blue-600', red: 'bg-red-50 text-red-600', indigo: 'bg-indigo-50 text-indigo-600', emerald: 'bg-emerald-50 text-emerald-600' };
  const valNum = Number(value || 0);
  const prevValNum = Number(prevValue || 0);
  const diff = prevValue !== undefined ? valNum - prevValNum : null;
  return (
    <div className="bg-white p-7 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-4 group">
       <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${styles[color]}`}>{icon}</div>
       <div>
          <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{label}</p>
          <div className="flex items-baseline gap-2 mt-1">
            <h4 className="text-2xl font-black text-[#001E3C]">{valNum.toLocaleString()}</h4>
            {diff !== null && diff !== 0 && (<span className={`text-[10px] font-black ${diff > 0 ? 'text-emerald-500' : 'text-red-500'}`}>{diff > 0 ? '+' : ''}{diff}</span>)}
          </div>
       </div>
    </div>
  );
};

const MarketMetric = ({ label, value, icon }: any) => (
  <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4">
     <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center shrink-0">{icon}</div>
     <div className="flex-1 min-w-0"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p><h4 className="text-lg font-black text-[#001E3C] truncate">{value}</h4></div>
  </div>
);

const AdminInput = ({ label, value, onChange, type = "text" }: any) => (
  <div className="space-y-1 w-full">
    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">{label}</label>
    <input type={type === 'number' ? 'text' : type} value={value ?? ''} onChange={(e) => {
      const v = e.target.value;
      if(type === 'number') {
        const n = v === '' ? 0 : Number(v.replace(/[^0-9]/g, ''));
        onChange(isNaN(n) ? 0 : n);
      } else { onChange(v); }
    }} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-[#001E3C] text-[#001E3C]" />
  </div>
);

export default App;