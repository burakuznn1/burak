
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
    const today = new Date();
    const diff = today.getTime() - start.getTime();
    return Math.max(0, Math.floor(diff / (1000 * 3600 * 24)));
  };

  if (isLoadingCloud) return <div className="min-h-screen bg-[#001E3C] flex items-center justify-center text-white"><Loader2 className="animate-spin" size={40}/></div>;

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-[#F8FAFC]">
      {/* Sidebar */}
      <aside className="hidden lg:flex w-72 bg-[#001E3C] text-white flex-col fixed inset-y-0 z-50">
        <div className="p-8 border-b border-white/5">
          <div className="flex items-center gap-3">
            <Award className="text-white" size={32} />
            <h1 className="font-black text-xl tracking-tighter">TÜRKWEST</h1>
          </div>
        </div>
        <nav className="p-6 space-y-2 flex-1 overflow-y-auto">
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

      {/* Main Content */}
      <main className="flex-1 lg:ml-72 p-4 lg:p-10 pb-20">
        {!selectedPropertyId && !isAdminAuthenticated && (
          <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4 animate-in zoom-in">
             <Award className="text-[#001E3C] mb-8" size={64} />
             <h1 className="text-5xl font-black text-[#001E3C] mb-4">Varlık Raporu</h1>
             <p className="text-slate-500 mb-10 max-w-sm">Mülk kodunuzu girerek performans analizini görüntüleyin.</p>
             <form onSubmit={(e) => { 
               e.preventDefault(); 
               const cleanCode = clientCodeInput.trim();
               const p = properties.find(x => x.id.toLowerCase() === cleanCode.toLowerCase()); 
               if(p) { 
                 // Müşteri girişi sayısını artır
                 setProperties(prev => prev.map(item => item.id === p.id ? { ...item, viewCountByClient: (item.viewCountByClient || 0) + 1 } : item));
                 setSelectedPropertyId(p.id); 
                 setIsClientMode(true); 
                 setActiveTab('dashboard'); 
               } 
               else { alert('Mülk bulunamadı.'); } 
             }} className="w-full max-w-sm space-y-4">
               <input type="text" placeholder="Örn: west-101" value={clientCodeInput} onChange={e => setClientCodeInput(e.target.value)} className="w-full px-6 py-5 bg-white border-2 border-slate-100 rounded-[2rem] text-center text-2xl font-black uppercase outline-none focus:border-[#001E3C] text-[#001E3C]" />
               <button className="w-full py-5 bg-[#001E3C] text-white rounded-[2rem] font-bold text-lg shadow-xl hover:bg-slate-800">Raporu Aç</button>
             </form>
          </div>
        )}

        {/* Genel İstatistikler Paneli */}
        {activeTab === 'portfolioStats' && isAdminAuthenticated && (
          <div className="max-w-6xl mx-auto space-y-8 animate-in slide-in-from-bottom-5">
            <h2 className="text-3xl font-black text-[#001E3C]">Portföy Genel İstatistikleri</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <DashboardStat label="Toplam Mülk" value={properties.length} icon={<Home size={20}/>} color="indigo" />
               <DashboardStat label="Toplam Aktif Teklif" value={properties.reduce((acc, p) => acc + (p.offers?.filter(o => o.status === 'Beklemede').length || 0), 0)} icon={<Wallet size={20}/>} color="emerald" />
               <DashboardStat label="Toplam Müşteri Etkileşimi" value={properties.reduce((acc, p) => acc + (p.viewCountByClient || 0), 0)} icon={<Activity size={20}/>} color="blue" />
            </div>

            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
               <div className="p-8 border-b border-slate-50 flex justify-between items-center">
                  <h3 className="font-black text-[#001E3C]">Tüm Mülklerin Özeti</h3>
                  <p className="text-xs font-bold text-slate-400">Veriler otomatik olarak güncellenir.</p>
               </div>
               <div className="overflow-x-auto">
                 <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                       <tr>
                          <th className="px-8 py-4">Mülk</th>
                          <th className="px-8 py-4">Fiyat</th>
                          <th className="px-8 py-4">Müşteri Girişi</th>
                          <th className="px-8 py-4">Toplam Teklif</th>
                          <th className="px-8 py-4">Son Teklif</th>
                          <th className="px-8 py-4">Süre</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                       {properties.map(p => {
                          const activeOffers = p.offers?.length || 0;
                          const lastOffer = p.offers?.length ? p.offers[p.offers.length-1].amount : 0;
                          const days = calculateDaysOnMarket(p.listingDate);
                          return (
                            <tr key={p.id} className="hover:bg-slate-50/50 transition-colors cursor-pointer" onClick={() => { setSelectedPropertyId(p.id); setActiveTab('dashboard'); }}>
                               <td className="px-8 py-6">
                                  <div className="flex items-center gap-3">
                                     <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0"><img src={p.image} className="w-full h-full object-cover"/></div>
                                     <div><p className="font-bold text-sm text-[#001E3C] line-clamp-1">{p.title}</p><p className="text-[10px] font-bold text-slate-400">{p.id}</p></div>
                                  </div>
                               </td>
                               <td className="px-8 py-6 font-black text-sm text-[#001E3C]">₺{p.currentPrice.toLocaleString()}</td>
                               <td className="px-8 py-6 text-sm font-bold text-blue-500">{p.viewCountByClient || 0} giriş</td>
                               <td className="px-8 py-6 text-sm font-bold text-slate-500">{activeOffers} teklif</td>
                               <td className="px-8 py-6 text-sm font-black text-emerald-600">₺{lastOffer.toLocaleString()}</td>
                               <td className="px-8 py-6 text-[10px] font-black text-orange-500 uppercase">{days} GÜN</td>
                            </tr>
                          );
                       })}
                    </tbody>
                 </table>
               </div>
            </div>
          </div>
        )}

        {/* Müşteri Yönetimi */}
        {activeTab === 'customers' && isAdminAuthenticated && (
          <div className="max-w-5xl mx-auto space-y-8 animate-in slide-in-from-bottom-5">
            <h2 className="text-3xl font-black text-[#001E3C]">Müşteri Kayıt</h2>
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
              <h3 className="text-lg font-black text-[#001E3C] flex items-center gap-2"><Plus size={20}/> Yeni Müşteri Kaydı</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AdminInput label="Ad Soyad" value={newCustomer.name} onChange={(v:any) => setNewCustomer({...newCustomer, name: v})} />
                <AdminInput label="Telefon" value={newCustomer.phone} onChange={(v:any) => setNewCustomer({...newCustomer, phone: v})} />
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Aradığı Daire Büyüklüğü</label>
                  <select value={newCustomer.preferredSize} onChange={e => setNewCustomer({...newCustomer, preferredSize: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none text-[#001E3C]">
                    <option value="1+1">1+1</option>
                    <option value="2+1">2+1</option>
                    <option value="3+1">3+1</option>
                    <option value="4+1">4+1</option>
                    <option value="Villa">Villa</option>
                    <option value="Dükkan">Dükkan</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Aradığı Mahalle (Rize)</label>
                  <select value={newCustomer.preferredNeighborhood} onChange={e => setNewCustomer({...newCustomer, preferredNeighborhood: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none text-[#001E3C]">
                    {RIZE_NEIGHBORHOODS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <AdminInput label="Bütçe (₺)" type="number" value={newCustomer.budget} onChange={(v:any) => setNewCustomer({...newCustomer, budget: v})} />
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Kategori</label>
                  <select value={newCustomer.category} onChange={e => setNewCustomer({...newCustomer, category: e.target.value as any})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none text-[#001E3C]">
                    <option value="Satılık">Satılık</option>
                    <option value="Kiralık">Kiralık</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Son İletişim Tarihi</label>
                  <input type="date" value={newCustomer.lastContactDate} onChange={e => setNewCustomer({...newCustomer, lastContactDate: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none text-[#001E3C]" />
                </div>
                <div className="md:col-span-2 space-y-1">
                   <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Notlar</label>
                   <textarea value={newCustomer.notes} onChange={e => setNewCustomer({...newCustomer, notes: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none h-20 resize-none text-[#001E3C]" placeholder="Müşteri talepleri, özel notlar..."></textarea>
                </div>
              </div>
              <button onClick={handleAddCustomer} className="w-full py-4 bg-[#001E3C] text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg"><Plus size={20}/> Kaydı Tamamla</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {customers.map(c => (
                <div key={c.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-4 group">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-indigo-50 text-[#001E3C] rounded-2xl flex items-center justify-center"><User size={24}/></div>
                      <div>
                        <h4 className="font-black text-[#001E3C]">{c.name}</h4>
                        <p className="text-xs font-bold text-slate-400">{c.phone}</p>
                      </div>
                    </div>
                    <button onClick={() => setCustomers(prev => prev.filter(x => x.id !== c.id))} className="p-2 text-red-400 hover:bg-red-50 rounded-xl opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={18}/></button>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-50">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase">Tercih</p>
                      <p className="text-xs font-bold text-[#001E3C]">{c.preferredSize} • {c.preferredNeighborhood}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase">Bütçe</p>
                      <p className="text-xs font-bold text-emerald-600">₺{Number(c.budget).toLocaleString()} ({c.category})</p>
                    </div>
                  </div>
                  {c.notes && (
                    <div className="bg-slate-50 p-3 rounded-xl">
                      <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Notlar</p>
                      <p className="text-xs font-medium text-slate-600 line-clamp-2">{c.notes}</p>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                    <Clock size={12}/> Son Temas: {c.lastContactDate}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Danışman Yönetimi */}
        {activeTab === 'agents' && isAdminAuthenticated && (
          <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-bottom-5">
            <h2 className="text-3xl font-black text-[#001E3C]">Danışman Yönetimi</h2>
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
              <h3 className="text-lg font-black text-[#001E3C] flex items-center gap-2"><Plus size={20}/> Yeni Danışman Ekle</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <AdminInput label="Danışman Adı Soyadı" value={newAgent.name} onChange={(v:any) => setNewAgent({...newAgent, name: v})} />
                <AdminInput label="Telefon Numarası" value={newAgent.phone} onChange={(v:any) => setNewAgent({...newAgent, phone: v})} />
              </div>
              <button onClick={handleAddAgent} className="w-full py-4 bg-[#001E3C] text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg"><Plus size={20}/> Listeye Kaydet</button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {agents.map(a => (
                <div key={a.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-50 text-[#001E3C] rounded-2xl flex items-center justify-center font-black">{a.name.charAt(0)}</div>
                    <div><p className="font-black text-[#001E3C]">{a.name}</p><p className="text-xs font-bold text-slate-400">{a.phone}</p></div>
                  </div>
                  <button onClick={() => setAgents(prev => prev.filter(x => x.id !== a.id))} className="p-3 text-red-400 opacity-0 group-hover:opacity-100 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={18}/></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pazarlama Takvimi */}
        {activeTab === 'calendar' && isAdminAuthenticated && (
          <div className="max-w-5xl mx-auto space-y-8 animate-in slide-in-from-bottom-5">
            <h2 className="text-3xl font-black text-[#001E3C]">Pazarlama Takvimi</h2>
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
              <h3 className="text-lg font-black text-[#001E3C] flex items-center gap-2"><Share2 size={20}/> Yeni Sosyal Medya Görevi</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Mülk Seçin</label>
                  <select value={newTask.propertyId} onChange={e => setNewTask({...newTask, propertyId: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none text-[#001E3C]">
                    <option value="">Seçiniz...</option>
                    {properties.map(p => <option key={p.id} value={p.id}>{p.title} ({p.id})</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Görev Tipi</label>
                  <select value={newTask.taskType} onChange={e => setNewTask({...newTask, taskType: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none text-[#001E3C]">
                    <option value="Instagram Reels">Instagram Reels</option>
                    <option value="Instagram Hikaye">Instagram Hikaye</option>
                    <option value="Fotoğraf Yenileme">Fotoğraf Yenileme</option>
                    <option value="Yapay Zeka Fotoğraf Seçimi">Yapay Zeka Fotoğraf Seçimi</option>
                    <option value="Sarı Site Öne Çıkarma">Sarı Site Öne Çıkarma</option>
                    <option value="Özel İçerik">Özel İçerik</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Başlangıç Tarihi</label>
                  <input 
                    type="date" 
                    value={newTask.startDate} 
                    onChange={e => setNewTask({...newTask, startDate: e.target.value})} 
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none text-[#001E3C]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Bitiş Tarihi</label>
                  <input 
                    type="date" 
                    value={newTask.endDate} 
                    onChange={e => setNewTask({...newTask, endDate: e.target.value})} 
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none text-[#001E3C]"
                  />
                </div>
              </div>
              <button onClick={handleAddTask} className="w-full py-4 bg-[#001E3C] text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg"><CheckCircle size={20}/> Takvime Ekle</button>
            </div>

            <div className="space-y-4">
              {socialMediaTasks.sort((a,b) => b.startDate.localeCompare(a.startDate)).map(task => (
                <div key={task.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#001E3C] text-blue-400 rounded-2xl flex items-center justify-center"><Share2 size={24}/></div>
                    <div>
                      <p className="text-xs font-black text-blue-500 uppercase tracking-tighter">{task.taskType}</p>
                      <h4 className="font-black text-[#001E3C]">{task.propertyName}</h4>
                    </div>
                  </div>
                  <div className="flex items-center gap-8">
                    <div className="text-center md:text-right">
                       <p className="text-[10px] font-black text-slate-400 uppercase">Tarih Aralığı</p>
                       <p className="text-xs font-bold text-[#001E3C]">{task.startDate} - {task.endDate}</p>
                    </div>
                    <button onClick={() => setSocialMediaTasks(prev => prev.filter(x => x.id !== task.id))} className="p-3 text-red-400 hover:bg-red-50 rounded-xl"><Trash2 size={18}/></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Portföy Listesi */}
        {activeTab === 'propertyList' && isAdminAuthenticated && (
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
                     agentName: '', agentPhone: '',
                     listingDate: new Date().toISOString().split('T')[0],
                     viewCountByClient: 0
                   };
                   setProperties(prev => [...prev, newProp]);
                   setSelectedPropertyId(id);
                   setActiveTab('edit');
                }} className="w-full sm:w-auto px-6 py-3 bg-[#001E3C] text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg"><Plus size={20}/> Yeni İlan</button>
             </div>
             <div className="relative">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20}/>
                <input type="text" placeholder="Ara..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-14 pr-6 py-4 bg-white border border-slate-200 rounded-2xl outline-none text-[#001E3C]" />
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
                        <div className="flex justify-between items-start gap-2">
                           <h4 className="font-bold text-lg text-[#001E3C] line-clamp-1">{p.title}</h4>
                           <div className="flex items-center gap-1 text-blue-500 shrink-0"><Eye size={14}/> <span className="text-xs font-black">{p.viewCountByClient || 0}</span></div>
                        </div>
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

        {/* Düzenleme Ekranı */}
        {activeTab === 'edit' && currentProperty && (
          <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-right-10">
             <div className="flex justify-between items-center">
                <button onClick={() => setActiveTab('propertyList')} className="flex items-center gap-2 text-slate-500 font-bold hover:text-[#001E3C]"><ArrowLeft size={20}/> Geri</button>
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => handleDeleteProperty(currentProperty.id)} 
                    className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-500 rounded-xl text-sm font-bold hover:bg-red-600 hover:text-white transition-all shadow-sm"
                  >
                    <Trash2 size={18}/> Mülkü Sil
                  </button>
                  <h2 className="text-2xl font-black text-[#001E3C]">Düzenle: {currentProperty.id}</h2>
                </div>
             </div>
             
             <div className="bg-white rounded-[2.5rem] p-6 lg:p-10 shadow-xl border border-slate-100 space-y-12">
                <section className="space-y-6">
                   <h3 className="text-lg font-black text-[#001E3C] border-b pb-2 flex items-center gap-2"><Info size={20}/> Temel Bilgiler</h3>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <AdminInput label="İlan Başlığı" value={currentProperty.title} onChange={(v:any) => updatePropertyData('title', v)} />
                      <AdminInput label="Konum / Mahalle" value={currentProperty.location} onChange={(v:any) => updatePropertyData('location', v)} />
                      <AdminInput label="Mevcut Fiyat (₺)" type="number" value={currentProperty.currentPrice} onChange={(v:any) => updatePropertyData('currentPrice', v)} />
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">İlan Tarihi</label>
                        <input type="date" value={currentProperty.listingDate || ''} onChange={e => updatePropertyData('listingDate', e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none text-[#001E3C]" />
                      </div>
                      <div className="space-y-1 col-span-1 md:col-span-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Mülk Görseli</label>
                        <div className="flex gap-4">
                           <input type="text" placeholder="Görsel URL" value={currentProperty.image} onChange={(e) => updatePropertyData('image', e.target.value)} className="flex-1 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-[#001E3C] text-[#001E3C]" />
                           <button onClick={() => fileInputRef.current?.click()} className="px-6 bg-white border border-slate-200 text-[#001E3C] rounded-2xl font-bold flex items-center gap-2 hover:bg-slate-50 shrink-0"><Upload size={18}/> Yükle</button>
                           <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} className="hidden" />
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Sorumlu Danışman Seçin</label>
                        <select 
                          value={agents.find(a => a.name === currentProperty.agentName)?.id || ""} 
                          onChange={(e) => {
                            const selected = agents.find(a => a.id === e.target.value);
                            if (selected) {
                              updatePropertyData('agentName', selected.name);
                              updatePropertyData('agentPhone', selected.phone);
                            }
                          }}
                          className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none text-[#001E3C]"
                        >
                          <option value="">Seçiniz...</option>
                          {agents.map(a => <option key={a.id} value={a.id} className="text-[#001E3C]">{a.name}</option>)}
                        </select>
                      </div>
                      <AdminInput label="Danışman Telefon" value={currentProperty.agentPhone || ''} onChange={(v:any) => updatePropertyData('agentPhone', v)} />
                   </div>
                   <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Danışman Notu</label>
                      <textarea value={currentProperty.agentNotes} onChange={(e) => updatePropertyData('agentNotes', e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none h-24 resize-none focus:border-[#001E3C] text-[#001E3C]" placeholder="Danışman mesajı..."></textarea>
                   </div>
                </section>

                <section className="space-y-6">
                   <h3 className="text-lg font-black text-[#001E3C] border-b pb-2 flex items-center gap-2"><BarChart3 size={20}/> Aylık Performans Verileri</h3>
                   <div className="space-y-6">
                      {(currentProperty.stats || []).map((stat, idx) => (
                        <div key={idx} className="p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                           <div className="flex justify-between items-center border-b border-slate-200 pb-2 mb-2">
                              <select value={stat.month} onChange={(e) => handleUpdateStat(idx, 'month', e.target.value)} className="bg-transparent font-black text-[#001E3C] outline-none">
                                 {MONTHS_LIST.map(m => <option key={m} value={m} className="text-[#001E3C]">{m}</option>)}
                              </select>
                              <button onClick={() => updatePropertyData('stats', currentProperty.stats.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600 transition-colors"><Trash2 size={16}/></button>
                           </div>
                           <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                              <AdminInput label="Görüntüleme" type="number" value={stat.views} onChange={(v:any) => handleUpdateStat(idx, 'views', v)} />
                              <AdminInput label="Favori" type="number" value={stat.favorites} onChange={(v:any) => handleUpdateStat(idx, 'favorites', v)} />
                              <AdminInput label="Mesaj" type="number" value={stat.messages} onChange={(v:any) => handleUpdateStat(idx, 'messages', v)} />
                              <AdminInput label="Arama" type="number" value={stat.calls} onChange={(v:any) => handleUpdateStat(idx, 'calls', v)} />
                              <AdminInput label="Ziyaret" type="number" value={stat.visits} onChange={(v:any) => handleUpdateStat(idx, 'visits', v)} />
                           </div>
                        </div>
                      ))}
                      <button onClick={handleAddMonth} className="w-full py-4 bg-blue-50 text-[#001E3C] rounded-2xl border-2 border-dashed border-blue-200 font-bold flex items-center justify-center gap-2 hover:bg-blue-100 transition-colors"><Plus size={20}/> Yeni Ay Ekle</button>
                   </div>
                </section>

                <section className="space-y-6">
                   <h3 className="text-lg font-black text-[#001E3C] border-b pb-2 flex items-center gap-2"><History size={20}/> Fiyat Geçmişi</h3>
                   <div className="bg-slate-50 p-6 rounded-2xl space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <AdminInput label="Tarih" value={newPriceUpdate.date} onChange={(v:any) => setNewPriceUpdate({...newPriceUpdate, date: v})} />
                        <AdminInput label="Fiyat (₺)" type="number" value={newPriceUpdate.amount} onChange={(v:any) => setNewPriceUpdate({...newPriceUpdate, amount: v})} />
                      </div>
                      <button onClick={handleAddPriceUpdate} className="w-full py-4 bg-[#001E3C] text-white rounded-xl font-bold flex items-center justify-center gap-2"><Plus size={18}/> Listeye Ekle</button>
                   </div>
                   <div className="space-y-2">
                      {(currentProperty.priceHistory || []).map((p, i) => (
                        <div key={i} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-xl">
                          <span className="text-xs font-bold text-slate-400">{p.date}</span>
                          <span className="text-sm font-black text-[#001E3C]">₺{p.amount.toLocaleString()}</span>
                          <button onClick={() => updatePropertyData('priceHistory', currentProperty.priceHistory.filter((_, idx) => idx !== i))} className="p-2 text-red-400 hover:bg-red-50 rounded-lg"><Trash2 size={18}/></button>
                        </div>
                      ))}
                   </div>
                </section>

                <section className="space-y-6">
                   <h3 className="text-lg font-black text-[#001E3C] border-b pb-2 flex items-center gap-2"><Wallet size={20}/> Teklifler</h3>
                   <div className="bg-slate-50 p-6 rounded-2xl space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <AdminInput label="Teklif Sahibi" value={newOffer.bidder} onChange={(v:any) => setNewOffer({...newOffer, bidder: v})} />
                        <AdminInput label="Tutar (₺)" type="number" value={newOffer.amount} onChange={(v:any) => setNewOffer({...newOffer, amount: v})} />
                      </div>
                      <button onClick={handleAddOffer} className="w-full py-4 bg-[#001E3C] text-white rounded-xl font-bold flex items-center justify-center gap-2"><Plus size={18}/> Teklif Ekle</button>
                   </div>
                   <div className="space-y-2">
                      {(currentProperty.offers || []).map((off) => (
                        <div key={off.id} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-xl shadow-sm">
                          <div><p className="font-bold text-sm text-[#001E3C]">{off.bidder}</p><p className="text-[10px] font-black text-slate-400">₺{off.amount.toLocaleString()} • {off.date}</p></div>
                          <button onClick={() => updatePropertyData('offers', (currentProperty.offers || []).filter(o => o.id !== off.id))} className="p-2 text-red-400 hover:bg-red-50 rounded-lg"><Trash2 size={18}/></button>
                        </div>
                      ))}
                   </div>
                </section>

                <section className="space-y-6">
                   <h3 className="text-lg font-black text-[#001E3C] border-b pb-2 flex items-center gap-2"><Target size={20}/> Piyasa Analizi Verileri</h3>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <AdminInput label="Emsal Satış Fiyatı (₺)" type="number" value={currentProperty.market?.comparablePrice} onChange={(v:any) => updatePropertyData('market', {...(currentProperty.market || {comparablePrice:0, buildingUnitsCount:0, neighborhoodUnitsCount:0, avgSaleDurationDays:0}), comparablePrice: v})} />
                      <AdminInput label="Ort. Satış Süresi (Gün)" type="number" value={currentProperty.market?.avgSaleDurationDays} onChange={(v:any) => updatePropertyData('market', {...(currentProperty.market || {comparablePrice:0, buildingUnitsCount:0, neighborhoodUnitsCount:0, avgSaleDurationDays:0}), avgSaleDurationDays: v})} />
                      <AdminInput label="Binadaki Diğer İlanlar" type="number" value={currentProperty.market?.buildingUnitsCount} onChange={(v:any) => updatePropertyData('market', {...(currentProperty.market || {comparablePrice:0, buildingUnitsCount:0, neighborhoodUnitsCount:0, avgSaleDurationDays:0}), buildingUnitsCount: v})} />
                      <AdminInput label="Bölgedeki Diğer İlanlar" type="number" value={currentProperty.market?.neighborhoodUnitsCount} onChange={(v:any) => updatePropertyData('market', {...(currentProperty.market || {comparablePrice:0, buildingUnitsCount:0, neighborhoodUnitsCount:0, avgSaleDurationDays:0}), neighborhoodUnitsCount: v})} />
                   </div>
                </section>

                <div className="pt-10">
                  <button onClick={() => setActiveTab('dashboard')} className="w-full py-5 bg-[#001E3C] text-white rounded-[2rem] font-black text-lg shadow-2xl transition-transform active:scale-95">Raporu Kaydet ve Görüntüle</button>
                </div>
             </div>
          </div>
        )}

        {/* Dashboard / Rapor */}
        {activeTab === 'dashboard' && currentProperty && (
          <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in duration-700">
             <div className="flex flex-col lg:flex-row justify-between items-start gap-6">
                <div className="space-y-2">
                   <div className="flex items-center gap-2 mb-2">
                     <span className="px-3 py-1 bg-[#001E3C] text-white text-[10px] font-black rounded-full uppercase tracking-widest">{(latestStats?.month || '-') + " Performansı"}</span>
                     <span className="px-3 py-1 bg-white border border-slate-200 text-[#001E3C] text-[10px] font-black rounded-full shadow-sm">{calculateDaysOnMarket(currentProperty.listingDate)} GÜNDÜR YAYINDA</span>
                   </div>
                   <h2 className="text-4xl font-black text-[#001E3C] tracking-tight">{currentProperty.title}</h2>
                   <p className="flex items-center gap-2 text-slate-500 font-medium"><MapPin size={16}/> {currentProperty.location || 'Konum Girilmedi'}</p>
                </div>
                <div className="flex gap-4 w-full lg:w-auto">
                   {isAdminAuthenticated && <button onClick={() => setActiveTab('edit')} className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-all"><Edit3 size={24}/></button>}
                   <button onClick={handleGenerateAISummary} disabled={isGenerating} className="flex-1 lg:flex-none px-8 py-4 bg-[#001E3C] text-white rounded-2xl font-black shadow-xl flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50">
                     {isGenerating ? <Loader2 size={20} className="animate-spin"/> : <Sparkles size={20} className="text-amber-300"/>} AI Analizi
                   </button>
                </div>
             </div>

             {/* Grafik Bölümleri */}
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Performans Grafiği */}
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-6">
                    <div className="flex items-center justify-between">
                       <div className="flex items-center gap-3"><BarChart3 className="text-[#001E3C]" size={20}/><h3 className="font-black text-[#001E3C] uppercase tracking-wider text-xs">Piyasa Performansı</h3></div>
                       <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-200">
                          <select value={actualStartIdx} onChange={(e) => setStartRangeIdx(parseInt(e.target.value))} className="bg-white px-2 py-1 rounded-lg text-[10px] font-bold outline-none text-[#001E3C]">
                            {(currentProperty.stats || []).map((s, idx) => (<option key={idx} value={idx} className="text-[#001E3C]">{s.month}</option>))}
                          </select>
                          <span className="text-slate-300 font-black">-</span>
                          <select value={actualEndIdx} onChange={(e) => setEndRangeIdx(parseInt(e.target.value))} className="bg-white px-2 py-1 rounded-lg text-[10px] font-bold outline-none text-[#001E3C]">
                            {(currentProperty.stats || []).map((s, idx) => (<option key={idx} value={idx} className="text-[#001E3C]">{s.month}</option>))}
                          </select>
                       </div>
                    </div>
                    <div className="h-[250px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={performanceChartData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} />
                          <YAxis tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} />
                          <Tooltip contentStyle={{ backgroundColor: '#001E3C', borderRadius: '16px', border: 'none', color: '#fff' }} />
                          <Area type="monotone" dataKey="Görüntüleme" stroke="#001E3C" strokeWidth={3} fillOpacity={0.1} fill="#001E3C" />
                          <Area type="monotone" dataKey="Favori" stroke="#f43f5e" strokeWidth={2} fill="transparent" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                </div>

                {/* Fiyat Geçmişi Grafiği */}
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-6">
                    <div className="flex items-center gap-3"><TrendingUp className="text-emerald-500" size={20}/><h3 className="font-black text-[#001E3C] uppercase tracking-wider text-xs">Fiyat Trend Analizi</h3></div>
                    <div className="h-[250px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={priceChartData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} />
                          <YAxis 
                            tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} 
                            tickFormatter={(val) => `₺${(val/1000000).toFixed(1)}M`}
                          />
                          <Tooltip 
                            formatter={(val: number) => `₺${val.toLocaleString()}`}
                            contentStyle={{ backgroundColor: '#001E3C', borderRadius: '16px', border: 'none', color: '#fff' }} 
                          />
                          <Line type="stepAfter" dataKey="Fiyat" stroke="#10b981" strokeWidth={4} dot={{ r: 6, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 8 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                </div>
             </div>

             {/* Bina Analizi */}
             <div className="space-y-6">
                <h4 className="text-2xl font-black text-[#001E3C] flex items-center gap-3"><Layers size={24} className="text-blue-500"/> Bina ve Piyasa Analizi</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                   <MarketMetric label="Emsal Fiyat" value={`₺${(currentProperty.market?.comparablePrice || 0).toLocaleString()}`} icon={<Target size={20}/>} />
                   <MarketMetric label="Ort. Satış Süresi" value={`${currentProperty.market?.avgSaleDurationDays || 0} Gün`} icon={<Timer size={20}/>} />
                   <MarketMetric label="Binadaki Diğer İlanlar" value={`${currentProperty.market?.buildingUnitsCount || 0} İlan`} icon={<Building2 size={20}/>} />
                   <MarketMetric label="Mahalledeki Rekabet" value={`${currentProperty.market?.neighborhoodUnitsCount || 0} İlan`} icon={<Layers size={20}/>} />
                </div>
             </div>

             {aiSummary && (
               <div className="bg-white p-8 lg:p-12 rounded-[3rem] shadow-xl border border-blue-50 animate-in slide-in-from-bottom-5">
                 <h4 className="text-xl font-black text-[#001E3C] mb-6 flex items-center gap-3"><Sparkles size={24} className="text-amber-500"/> Türkwest Strateji Özeti</h4>
                 <div className="prose prose-slate max-w-none">
                    <p className="whitespace-pre-line text-slate-600 leading-relaxed font-medium">{aiSummary}</p>
                 </div>
               </div>
             )}

             <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <DashboardStat label="Görüntüleme" value={latestStats.views} prevValue={previousStats?.views} icon={<Eye size={20}/>} color="blue" />
                <DashboardStat label="Favori" value={latestStats.favorites} prevValue={previousStats?.favorites} icon={<Heart size={20}/>} color="red" />
                <DashboardStat label="İletişim" value={latestStats.messages + latestStats.calls} prevValue={previousStats ? (previousStats.messages + previousStats.calls) : undefined} icon={<MessageSquare size={20}/>} color="indigo" />
                <DashboardStat label="Ziyaret" value={latestStats.visits} prevValue={previousStats?.visits} icon={<Navigation size={20}/>} color="emerald" />
             </div>

             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Gelen Teklifler Kartı */}
                <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm space-y-8">
                   <h4 className="text-xl font-black text-[#001E3C] flex items-center justify-between">Gelen Teklifler <span className="text-xs bg-orange-50 text-orange-600 px-3 py-1 rounded-full">{currentProperty.offers?.length || 0} Adet</span></h4>
                   <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                      {(!currentProperty.offers || currentProperty.offers.length === 0) ? (
                        <div className="text-center py-12 text-slate-300 italic font-bold">Aktif teklif bulunmuyor.</div>
                      ) : (
                        currentProperty.offers.map(offer => (
                          <div key={offer.id} className="flex items-center justify-between p-5 bg-slate-50/50 rounded-2xl border border-slate-100 hover:bg-slate-100 transition-colors">
                             <div className="flex items-center gap-4">
                               <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-400 shadow-sm"><User size={20}/></div>
                               <div>
                                 <p className="font-bold text-sm text-[#001E3C]">{offer.bidder.substring(0,2)}***</p>
                                 <p className="text-[10px] text-slate-400 font-bold">{offer.date} • {offer.status}</p>
                               </div>
                             </div>
                             <div className="text-right">
                               <p className="font-black text-sm text-[#001E3C]">₺{offer.amount.toLocaleString()}</p>
                             </div>
                          </div>
                        ))
                      )}
                   </div>
                </div>

                {/* Danışman Kartı */}
                <div className="bg-[#001E3C] p-10 rounded-[3rem] text-white flex flex-col justify-between shadow-xl relative overflow-hidden">
                   <div className="space-y-6">
                      <div className="flex items-center gap-3 mb-4"><MessageCircle size={32} className="text-blue-400"/><h4 className="text-2xl font-black">Danışman Notu</h4></div>
                      <p className="text-xl font-medium italic text-white/90">"{currentProperty.agentNotes || 'Satış süreciniz profesyonel ekibimizce takip edilmektedir.'}"</p>
                   </div>
                   
                   <div className="mt-10 pt-6 border-t border-white/10 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                         <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center text-blue-400">
                            <UserCheck size={32}/>
                         </div>
                         <div>
                            <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Sorumlu Danışman</p>
                            <p className="text-lg font-black">{currentProperty.agentName || 'Türkwest Portföy Ekibi'}</p>
                         </div>
                      </div>
                      {currentProperty.agentPhone && (
                        <a href={`tel:${currentProperty.agentPhone}`} className="w-12 h-12 bg-white text-[#001E3C] rounded-2xl flex items-center justify-center hover:scale-110 transition-transform">
                           <Phone size={24}/>
                        </a>
                      )}
                   </div>
                   
                   <div className="absolute top-0 right-0 p-8 opacity-10"><Award size={120}/></div>
                </div>
             </div>

             {!isAdminAuthenticated && (
                <div className="bg-white p-10 rounded-[3.5rem] border border-slate-200 shadow-sm space-y-8 max-w-2xl mx-auto text-center">
                  <h4 className="text-2xl font-black text-[#001E3C]">Bize Ulaşın</h4>
                  {showFeedbackSuccess ? ( <div className="bg-emerald-50 text-emerald-600 p-8 rounded-[2.5rem] font-bold">Mesajınız iletildi!</div> ) : (
                    <div className="space-y-6">
                      <input type="text" placeholder="Fiyat teklifi isteği (₺)" value={clientRequestedPriceInput} onChange={e => setClientRequestedPriceInput(e.target.value.replace(/[^0-9]/g, ''))} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-[#001E3C]" />
                      <textarea value={clientNoteInput} onChange={e => setClientNoteInput(e.target.value)} placeholder="Talebiniz..." className="w-full h-32 p-6 bg-slate-50 border border-slate-200 rounded-[2.5rem] outline-none font-bold text-[#001E3C] resize-none" />
                      <button onClick={handleAddFeedback} className="w-full py-5 bg-[#001E3C] text-white rounded-[2.5rem] font-black shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-transform"><Send size={20}/> İlet</button>
                    </div>
                  )}
                </div>
             )}
          </div>
        )}

        {/* Müşteri Talepleri */}
        {activeTab === 'notifications' && isAdminAuthenticated && (
          <div className="max-w-4xl mx-auto space-y-8">
             <h2 className="text-3xl font-black text-[#001E3C]">Müşteri Talepleri</h2>
             <div className="space-y-4">
                {allFeedbacks.length === 0 ? (
                  <div className="bg-white p-20 rounded-[3rem] text-center border border-slate-100"><p className="text-slate-400 font-bold italic">Talep bulunmuyor.</p></div>
                ) : (
                  allFeedbacks.sort((a,b) => b.date.localeCompare(a.date)).map((fb) => (
                    <div key={fb.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-md transition-all">
                       <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                          <div className="space-y-2 flex-1">
                             <div className="flex items-center gap-2">
                               <span className="px-3 py-1 bg-slate-100 text-slate-500 text-[10px] font-black rounded-full">{fb.date}</span>
                               <span className="px-3 py-1 bg-blue-50 text-[#001E3C] text-[10px] font-black rounded-full">{fb.propertyTitle}</span>
                             </div>
                             <p className="text-lg font-black text-[#001E3C]">{fb.message}</p>
                             {fb.requestedPrice && <div className="inline-flex px-4 py-2 bg-emerald-50 text-emerald-700 rounded-2xl border border-emerald-100 text-xs font-black uppercase">Fiyat İsteği: ₺{fb.requestedPrice.toLocaleString()}</div>}
                          </div>
                          <div className="flex gap-2 w-full sm:w-auto">
                             <button onClick={() => { setSelectedPropertyId(fb.propertyId as string); setActiveTab('dashboard'); }} className="flex-1 px-6 py-3 bg-[#001E3C] text-white rounded-xl text-xs font-black">Mülke Git</button>
                             <button 
                               onClick={(e) => { 
                                 e.stopPropagation();
                                 if (window.confirm('Silmek istediğinize emin misiniz?')) {
                                   setProperties(prev => prev.map(p => p.id === fb.propertyId ? { ...p, clientFeedback: (p.clientFeedback || []).filter(f => f.id !== fb.id) } : p));
                                 }
                               }} 
                               className="p-4 bg-red-50 text-red-500 rounded-xl hover:bg-red-600 hover:text-white transition-all shadow-sm"
                             ><Trash2 size={20}/></button>
                          </div>
                       </div>
                    </div>
                  ))
                )}
             </div>
          </div>
        )}

        {/* Modal */}
        {showLoginModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#001E3C]/95 backdrop-blur-xl p-4">
            <div className="bg-white w-full max-w-sm rounded-[3rem] p-12 text-center shadow-2xl">
              <Lock className="text-[#001E3C] mx-auto mb-6" size={40}/><h3 className="text-2xl font-black mb-8">Yönetici Girişi</h3>
              <form onSubmit={handleLogin} className="space-y-4">
                <input type="password" autoFocus placeholder="Şifre" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} className="w-full p-4 bg-slate-50 border-2 rounded-2xl outline-none text-center text-xl font-black tracking-widest text-[#001E3C] focus:border-[#001E3C]" />
                <button type="submit" className="w-full py-4 bg-[#001E3C] text-white rounded-2xl font-black shadow-xl hover:bg-slate-800 transition-colors">Giriş</button>
                <button type="button" onClick={() => setShowLoginModal(false)} className="text-xs font-bold text-slate-400 mt-4 uppercase">Kapat</button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

const NavItem = ({ icon, label, active, onClick, badge }: any) => (
  <button onClick={onClick} className={`w-full flex items-center justify-between px-6 py-4 rounded-2xl transition-all ${active ? 'bg-white/10 text-white font-black' : 'text-white/30 hover:text-white'}`}>
    <div className="flex items-center gap-4"><span>{icon}</span><span className="text-[13px]">{label}</span></div>
    {(badge || 0) > 0 && <span className="w-6 h-6 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center animate-pulse">{badge}</span>}
  </button>
);

const DashboardStat = ({ label, value, prevValue, icon, color }: any) => {
  const styles: any = { blue: 'bg-blue-50 text-blue-600', red: 'bg-red-50 text-red-600', indigo: 'bg-indigo-50 text-indigo-600', emerald: 'bg-emerald-50 text-emerald-600' };
  const valNum = Number(value || 0);
  const prevValNum = Number(prevValue || 0);
  const diff = prevValue !== undefined ? valNum - prevValNum : null;
  return (
    <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-4 hover:shadow-md transition-shadow">
       <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${styles[color]}`}>{icon}</div>
       <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
          <div className="flex items-baseline gap-2 mt-1">
            <h4 className="text-2xl font-black text-[#001E3C]">{valNum.toLocaleString()}</h4>
            {diff !== null && diff !== 0 && (<span className={`text-[10px] font-black ${diff > 0 ? 'text-emerald-500' : 'text-red-500'}`}>{diff > 0 ? '+' : ''}{diff}</span>)}
          </div>
       </div>
    </div>
  );
};

const MarketMetric = ({ label, value, icon }: any) => (
  <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
     <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center shrink-0">{icon}</div>
     <div className="flex-1 min-w-0"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p><h4 className="text-lg font-black text-[#001E3C] truncate">{value}</h4></div>
  </div>
);

const AdminInput = ({ label, value, onChange, type = "text" }: any) => (
  <div className="space-y-1">
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
