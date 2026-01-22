
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  LayoutDashboard, LogOut, Sparkles, MapPin, MessageSquare, Eye, Heart, 
  Navigation, Info, Edit3, Send, Lock, CheckCircle2, Plus, Trash2, Search, 
  Home, Award, Building2, Layers, MessageCircle, RefreshCw, Settings, 
  Loader2, User, Wallet, Timer, Target, ArrowLeft, History, DollarSign,
  Bell, Inbox, Calendar, BarChart3, TrendingUp, Phone, UserCheck, Share2,
  CheckCircle, Clock, List, Users, Briefcase, FileText, Upload, PieChart, Activity, Menu, X, ArrowUpRight
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
    location: 'Beşiktaş, Yıldız Mahallesi',
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
  
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(() => localStorage.getItem('west_admin_auth') === 'true');
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
  const [newPriceUpdate, setNewPriceUpdate] = useState({ date: new Date().toLocaleDateString('tr-TR'), amount: '' });
  const [newAgent, setNewAgent] = useState({ name: '', phone: '' });
  const [newTask, setNewTask] = useState<Partial<SocialMediaTask>>({ propertyId: '', startDate: '', endDate: '', taskType: 'Instagram Reels', status: 'Planlandı' });
  const [newCustomer, setNewCustomer] = useState<Partial<Customer>>({ name: '', phone: '', preferredSize: '2+1', preferredNeighborhood: 'Alipaşa', budget: 0, category: 'Satılık', lastContactDate: '', notes: '' });
  
  const [clientNoteInput, setClientNoteInput] = useState("");
  const [clientRequestedPriceInput, setClientRequestedPriceInput] = useState("");
  const [showFeedbackSuccess, setShowFeedbackSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const supabase = useMemo(() => {
    try {
      if (SUPABASE_URL && SUPABASE_KEY) {
        return createClient(SUPABASE_URL, SUPABASE_KEY);
      }
    } catch (e) { console.error("Supabase Init Error", e); }
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
      const saved = localStorage.getItem('west_full_data');
      if (saved) { 
        try { 
          const parsed = JSON.parse(saved);
          setProperties(parsed.properties || INITIAL_PROPERTIES);
          setAgents(parsed.agents || []);
          setSocialMediaTasks(parsed.socialMediaTasks || []);
          setCustomers(parsed.customers || []);
        } catch(e) {} 
      }
      setIsLoadingCloud(false);
    };
    initializeData();
  }, [supabase]);

  useEffect(() => {
    if (isLoadingCloud) return;
    const fullData = { properties, agents, socialMediaTasks, customers };
    localStorage.setItem('west_full_data', JSON.stringify(fullData));
    
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

  const allFeedbacks = useMemo(() => {
    return properties.flatMap(p => (p.clientFeedback || []).map(f => ({ ...f, propertyTitle: p.title, propertyId: p.id })));
  }, [properties]);

  const totalNotifications = allFeedbacks.length;

  const actualEndIdx = useMemo(() => {
    const statsLength = currentProperty?.stats?.length || 0;
    if (statsLength === 0) return 0;
    if (endRangeIdx === -1) return statsLength - 1;
    return Math.min(endRangeIdx, statsLength - 1);
  }, [currentProperty, endRangeIdx]);

  const actualStartIdx = useMemo(() => Math.min(startRangeIdx, actualEndIdx), [startRangeIdx, actualEndIdx]);

  const filteredStats = useMemo(() => {
    if (!currentProperty || !currentProperty.stats) return [];
    return currentProperty.stats.slice(actualStartIdx, actualEndIdx + 1);
  }, [currentProperty, actualStartIdx, actualEndIdx]);

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
    name: s.month,
    Görüntüleme: s.views,
    Favori: s.favorites,
    Etkileşim: s.messages + s.calls + s.visits
  })), [filteredStats]);

  const priceChartData = useMemo(() => {
    if (!currentProperty?.priceHistory || currentProperty.priceHistory.length === 0) return [];
    return currentProperty.priceHistory.map(ph => ({
      date: ph.date,
      Fiyat: ph.amount
    }));
  }, [currentProperty]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === ADMIN_PASSWORD) {
      setIsAdminAuthenticated(true);
      localStorage.setItem('west_admin_auth', 'true');
      setShowLoginModal(false);
      totalNotifications > 0 ? setActiveTab('notifications') : setActiveTab('propertyList');
      setPasswordInput("");
    } else { alert("Hatalı Şifre!"); }
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
    setProperties(prev => prev.map(p => {
      if (p.id === selectedPropertyId) {
        return { ...p, [field]: value };
      }
      return p;
    }));
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
    const newStat: PropertyStats = { month: nextMonth, views: 0, favorites: 0, messages: 0, calls: 0, visits: 0 };
    updatePropertyData('stats', [...currentStats, newStat]);
  };

  const handleAddOffer = () => {
    if (!currentProperty || !newOffer.amount || !newOffer.bidder) return;
    const offer: Offer = { 
      id: Date.now().toString(), 
      date: new Date().toLocaleDateString('tr-TR'), 
      amount: Number(newOffer.amount), 
      bidder: newOffer.bidder, 
      status: 'Beklemede' 
    };
    updatePropertyData('offers', [...(currentProperty.offers || []), offer]);
    setNewOffer({ amount: '', bidder: '' });
  };

  const handleAddPriceUpdate = () => {
    if (!currentProperty || !newPriceUpdate.amount) return;
    const pricePoint: PricePoint = {
      date: newPriceUpdate.date,
      amount: Number(newPriceUpdate.amount)
    };
    const updatedHistory = [...(currentProperty.priceHistory || []), pricePoint];
    setProperties(prev => prev.map(p => {
      if (p.id === selectedPropertyId) {
        return { 
          ...p, 
          priceHistory: updatedHistory,
          currentPrice: Number(newPriceUpdate.amount)
        };
      }
      return p;
    }));
    setNewPriceUpdate({ date: new Date().toLocaleDateString('tr-TR'), amount: '' });
  };

  const handleAddAgent = () => {
    if (!newAgent.name || !newAgent.phone) return;
    const agent: Agent = { id: Date.now().toString(), ...newAgent };
    setAgents(prev => [...prev, agent]);
    setNewAgent({ name: '', phone: '' });
  };

  const handleAddTask = () => {
    if (!newTask.propertyId || !newTask.startDate || !newTask.endDate || !newTask.taskType) return;
    const prop = properties.find(p => p.id === newTask.propertyId);
    const task: SocialMediaTask = {
      id: Date.now().toString(),
      propertyId: newTask.propertyId!,
      propertyName: prop?.title || 'Bilinmeyen Mülk',
      startDate: newTask.startDate!,
      endDate: newTask.endDate!,
      taskType: newTask.taskType!,
      status: (newTask.status as any) || 'Planlandı'
    };
    setSocialMediaTasks(prev => [...prev, task]);
    setNewTask({ propertyId: '', startDate: '', endDate: '', taskType: 'Instagram Reels', status: 'Planlandı' });
  };

  const handleAddCustomer = () => {
    if (!newCustomer.name || !newCustomer.phone) return;
    const customer: Customer = {
      id: Date.now().toString(),
      name: newCustomer.name!,
      phone: newCustomer.phone!,
      preferredSize: newCustomer.preferredSize || '2+1',
      preferredNeighborhood: newCustomer.preferredNeighborhood || 'Alipaşa',
      budget: Number(newCustomer.budget || 0),
      category: newCustomer.category as any || 'Satılık',
      lastContactDate: newCustomer.lastContactDate || new Date().toISOString().split('T')[0],
      notes: newCustomer.notes || ''
    };
    setCustomers(prev => [...prev, customer]);
    setNewCustomer({ name: '', phone: '', preferredSize: '2+1', preferredNeighborhood: 'Alipaşa', budget: 0, category: 'Satılık', lastContactDate: '', notes: '' });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updatePropertyData('image', reader.result as string);
      };
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
    const feedback: ClientFeedback = { 
      id: Date.now().toString(),
      date: new Date().toLocaleDateString('tr-TR'), 
      message: clientNoteInput.trim(),
      requestedPrice: clientRequestedPriceInput ? Number(clientRequestedPriceInput) : undefined
    };
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
    if (isNaN(start.getTime())) return 0;
    const today = new Date();
    const diff = today.getTime() - start.getTime();
    return Math.max(0, Math.floor(diff / (1000 * 3600 * 24)));
  };

  if (isLoadingCloud) return <div className="min-h-screen bg-[#001E3C] flex items-center justify-center text-white"><Loader2 className="animate-spin" size={40}/></div>;

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-[#F8FAFC]">
      {/* Sidebar - Masaüstü */}
      <aside className="hidden lg:flex w-72 bg-[#001E3C] text-white flex-col fixed inset-y-0 z-50 shadow-2xl">
        <div className="p-8 border-b border-white/5">
          <div className="flex items-center gap-3">
            <Award className="text-white" size={32} />
            <h1 className="font-black text-xl tracking-tighter">TÜRKWEST</h1>
          </div>
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
                <>
                  <div className="pt-4 pb-2 px-6 text-[10px] font-black text-white/30 uppercase tracking-widest">Seçili Mülk</div>
                  <NavItem icon={<LayoutDashboard size={20}/>} label="Rapor" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
                  <NavItem icon={<Edit3 size={20}/>} label="Düzenle" active={activeTab === 'edit'} onClick={() => setActiveTab('edit')} />
                </>
              )}
            </>
          ) : (
            <NavItem icon={<LayoutDashboard size={20}/>} label="Varlık Raporu" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
          )}
        </nav>
        <div className="p-6 border-t border-white/5">
           {isAdminAuthenticated ? (
             <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 py-3 bg-red-500/10 text-red-400 rounded-xl text-xs font-bold hover:bg-red-500/20"><LogOut size={16}/> Çıkış</button>
           ) : (
             <button onClick={() => setShowLoginModal(true)} className="w-full py-3 bg-white/10 rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-white/20"><Lock size={14}/> Yönetici</button>
           )}
        </div>
      </aside>

      {/* Mobil Üst Bar */}
      <div className="lg:hidden flex items-center justify-between px-6 py-4 bg-[#001E3C] text-white fixed top-0 left-0 right-0 z-[60] shadow-lg">
        <div className="flex items-center gap-2">
          <Award size={24} className="text-white"/>
          <span className="font-black text-sm tracking-tighter uppercase">TÜRKWEST</span>
        </div>
        <div className="flex items-center gap-2">
          {!isAdminAuthenticated ? (
             <button onClick={() => setShowLoginModal(true)} className="p-2 bg-white/10 rounded-lg text-white"><Lock size={20}/></button>
          ) : (
             <button onClick={handleLogout} className="text-red-400 p-2"><LogOut size={20}/></button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <main className={`flex-1 lg:ml-72 p-4 lg:p-10 pb-32 pt-24 lg:pt-10 transition-all`}>
        {!selectedPropertyId && !isAdminAuthenticated && (
          <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
             <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6 shadow-inner">
               <Award className="text-[#001E3C]" size={48} />
             </div>
             <h1 className="text-3xl lg:text-5xl font-black text-[#001E3C] mb-4">Gayrimenkul Varlık Raporu</h1>
             <p className="text-slate-500 mb-10 max-w-sm font-medium">Lütfen size verilen mülk kodunu girerek detaylı performans analizini ve piyasa verilerini görüntüleyin.</p>
             <form onSubmit={(e) => { 
               e.preventDefault(); 
               const cleanCode = clientCodeInput.trim();
               const p = properties.find(x => x.id.toLowerCase() === cleanCode.toLowerCase()); 
               if(p) { 
                 setProperties(prev => prev.map(item => item.id === p.id ? { ...item, viewCountByClient: (item.viewCountByClient || 0) + 1 } : item));
                 setSelectedPropertyId(p.id); 
                 setIsClientMode(true); 
                 setActiveTab('dashboard'); 
               } 
               else { alert('Mülk bulunamadı. Lütfen kodu kontrol ediniz.'); } 
             }} className="w-full max-w-sm space-y-4">
               <input type="text" placeholder="Örn: west-101" value={clientCodeInput} onChange={e => setClientCodeInput(e.target.value)} className="w-full px-6 py-5 bg-white border-2 border-slate-100 rounded-[2rem] text-center text-2xl font-black uppercase outline-none focus:border-[#001E3C] text-[#001E3C] shadow-sm transition-all" />
               <button className="w-full py-5 bg-[#001E3C] text-white rounded-[2rem] font-bold text-lg shadow-xl hover:bg-slate-800 transition-transform active:scale-95">Analizi Görüntüle</button>
             </form>
             <button onClick={() => setShowLoginModal(true)} className="lg:hidden mt-12 text-[10px] font-black text-slate-300 uppercase tracking-widest flex items-center gap-2 hover:text-[#001E3C] transition-colors">Yönetici Paneli Girişi <Lock size={12}/></button>
          </div>
        )}

        {/* --- YÖNETİCİ PANELLERİ --- */}
        {isAdminAuthenticated && (
          <div className="animate-in fade-in duration-500">
            {/* Portföy Merkezi */}
            {activeTab === 'propertyList' && (
              <div className="max-w-6xl mx-auto space-y-8">
                 <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                    <h2 className="text-3xl font-black text-[#001E3C]">Portföy Yönetimi</h2>
                    <button onClick={() => {
                       const id = `west-${Math.floor(100+Math.random()*900)}`;
                       const currentMonthName = new Date().toLocaleDateString('tr-TR', { month: 'long' });
                       const capitalizedMonth = currentMonthName.charAt(0).toUpperCase() + currentMonthName.slice(1);
                       const newProp: Property = { 
                         id, title: 'Yeni İlan', location: '', image: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1000&q=80',
                         currentPrice: 0, priceHistory: [], agentNotes: '', clientFeedback: [], offers: [], 
                         stats: [{ month: capitalizedMonth, views: 0, favorites: 0, messages: 0, calls: 0, visits: 0 }],
                         market: { comparablePrice: 0, buildingUnitsCount: 0, neighborhoodUnitsCount: 0, avgSaleDurationDays: 0 },
                         agentName: '', agentPhone: '', listingDate: new Date().toISOString().split('T')[0], viewCountByClient: 0
                       };
                       setProperties(prev => [...prev, newProp]);
                       setSelectedPropertyId(id);
                       setActiveTab('edit');
                    }} className="w-full sm:w-auto px-6 py-3 bg-[#001E3C] text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-transform"><Plus size={20}/> Yeni İlan</button>
                 </div>
                 <div className="relative">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20}/>
                    <input type="text" placeholder="İlan ara..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-14 pr-6 py-4 bg-white border border-slate-200 rounded-2xl outline-none text-[#001E3C] shadow-sm" />
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredProperties.map(p => (
                      <div key={p.id} className="bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-xl transition-all group cursor-pointer relative" onClick={() => { setSelectedPropertyId(p.id); setActiveTab('dashboard'); }}>
                         <div className="h-48 relative overflow-hidden">
                           <img src={p.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                           <div className="absolute bottom-4 left-4 px-3 py-1 bg-[#001E3C] text-white rounded text-[10px] font-black">{p.id}</div>
                           <div className="absolute top-4 right-4 px-3 py-1 bg-white/90 text-[#001E3C] rounded-full text-[10px] font-black shadow-sm">{calculateDaysOnMarket(p.listingDate)} GÜN</div>
                         </div>
                         <div className="p-6 space-y-4">
                            <h4 className="font-bold text-lg text-[#001E3C] line-clamp-1">{p.title}</h4>
                            <div className="flex gap-2">
                               <button onClick={(e) => { e.stopPropagation(); setSelectedPropertyId(p.id); setActiveTab('dashboard'); }} className="flex-1 py-3 bg-[#001E3C] text-white rounded-xl text-xs font-bold">Rapor</button>
                               <button onClick={(e) => { e.stopPropagation(); setSelectedPropertyId(p.id); setActiveTab('edit'); }} className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:text-[#001E3C]"><Edit3 size={18}/></button>
                            </div>
                         </div>
                      </div>
                    ))}
                 </div>
              </div>
            )}

            {/* Genel İstatistikler */}
            {activeTab === 'portfolioStats' && (
