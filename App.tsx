import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  LayoutDashboard, LogOut, Sparkles, MapPin, MessageSquare, Eye, Heart, 
  Navigation, Info, Edit3, Send, Lock, CheckCircle2, Plus, Trash2, Search, 
  Home, Award, Building2, Layers, MessageCircle, RefreshCw, Settings, 
  Loader2, User, Wallet, Timer, Target, ArrowLeft, History, Coins,
  Bell, Inbox, Calendar, BarChart3, TrendingUp, Phone, UserCheck, Share2,
  CheckCircle, Clock, List, Users, Briefcase, FileText, Upload, PieChart, Activity,
  ArrowUpRight, ArrowDownRight, Scale, ChevronRight, XCircle, Camera
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, BarChart, Bar
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
  
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(() => {
    try {
      return localStorage.getItem("west_admin_auth") === "true";
    } catch {
      return false;
    }
  });

  const [activeTab, setActiveTab] = useState<'dashboard' | 'propertyList' | 'agents' | 'calendar' | 'customers' | 'portfolioStats' | 'edit' | 'notifications'>('propertyList');
  const [passwordInput, setPasswordInput] = useState("");
  const [clientCodeInput, setClientCodeInput] = useState("");
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  
  const [isClientMode, setIsClientMode] = useState(false);
  const [aiSummary, setAiSummary] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoadingCloud, setIsLoadingCloud] = useState(false);
  
  const [newOffer, setNewOffer] = useState({ amount: '', bidder: '', status: 'Beklemede' as const });
  const [newPriceUpdate, setNewPriceUpdate] = useState({
    date: new Date().toISOString().slice(0, 10),
    amount: ""
  });
  
  const [newAgent, setNewAgent] = useState({ name: '', phone: '' });
  const [newTask, setNewTask] = useState<Partial<SocialMediaTask>>({ propertyId: '', startDate: '', endDate: '', taskType: 'Instagram Reels', status: 'Planlandı' });
  const [newCustomer, setNewCustomer] = useState<Partial<Customer>>({ name: '', phone: '', preferredSize: '2+1', preferredNeighborhood: 'Alipaşa', budget: 0, category: 'Satılık', lastContactDate: '', notes: '', preferredBuildingAge: '0-5', preferredFloor: 'Ara Kat' });
  
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
    
    try {
      localStorage.setItem('west_full_data', JSON.stringify(fullData));
    } catch (e) {
      console.warn("QuotaExceededError", e);
    }
    
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
    return properties.flatMap(p => (p.clientFeedback || []).map(f => ({ ...f, propertyTitle: p.title, propertyId: p.id, propertyImage: p.image })));
  }, [properties]);

  const totalNotifications = allFeedbacks.length;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === ADMIN_PASSWORD) {
      setIsAdminAuthenticated(true);
      try {
        localStorage.setItem('west_admin_auth', 'true');
      } catch (e) {}
      setShowLoginModal(false);
      totalNotifications > 0 ? setActiveTab('notifications') : setActiveTab('propertyList');
      setPasswordInput("");
    } else { alert("Hatalı Şifre!"); }
  };

  const handleLogout = () => {
    setIsAdminAuthenticated(false);
    setIsClientMode(false);
    try {
      localStorage.removeItem('west_admin_auth');
    } catch (e) {}
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

  const updateMarketData = (field: string, value: any) => {
    if (!currentProperty) return;
    const updatedMarket = { ...currentProperty.market, [field]: value };
    updatePropertyData('market', updatedMarket);
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
      status: newOffer.status 
    };
    updatePropertyData('offers', [...(currentProperty.offers || []), offer]);
    setNewOffer({ amount: '', bidder: '', status: 'Beklemede' });
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
    setNewPriceUpdate({ date: new Date().toISOString().slice(0, 10), amount: '' });
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
      preferredBuildingAge: newCustomer.preferredBuildingAge || '0-5',
      preferredFloor: newCustomer.preferredFloor || 'Ara Kat',
      budget: Number(newCustomer.budget || 0),
      category: newCustomer.category as any || 'Satılık',
      lastContactDate: newCustomer.lastContactDate || new Date().toISOString().split('T')[0],
      notes: newCustomer.notes || ''
    };
    setCustomers(prev => [...prev, customer]);
    setNewCustomer({ name: '', phone: '', preferredSize: '2+1', preferredNeighborhood: 'Alipaşa', budget: 0, category: 'Satılık', lastContactDate: '', notes: '', preferredBuildingAge: '0-5', preferredFloor: 'Ara Kat' });
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

  const handleGenerateAISummary = async () => {
    if (!currentProperty) return;
    setIsGenerating(true);
    const summary = await generateReportSummary({ property: currentProperty, period: "Güncel Dönem", clientName: 'Değerli Ortağımız' });
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

  const statComparison = useMemo(() => {
    if (!currentProperty || !currentProperty.stats || currentProperty.stats.length < 2) return null;
    const stats = currentProperty.stats;
    const current = stats[stats.length - 1];
    const previous = stats[stats.length - 2];
    
    const calcDiff = (curr: number, prev: number) => {
        if (prev === 0) return 0;
        return Math.round(((curr - prev) / prev) * 100);
    };

    return {
        viewsDiff: calcDiff(current.views, previous.views),
        favsDiff: calcDiff(current.favorites, previous.favorites),
        visitsDiff: calcDiff(current.visits, previous.visits),
        prevMonth: previous.month,
        currMonth: current.month
    };
  }, [currentProperty]);

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
               const p = properties.find(x => x.id.toLowerCase() === clientCodeInput.trim().toLowerCase()); 
               if(p) { 
                 setProperties(prev => prev.map(item => item.id === p.id ? { ...item, viewCountByClient: (item.viewCountByClient || 0) + 1 } : item));
                 setSelectedPropertyId(p.id); 
                 setIsClientMode(true); 
                 setActiveTab('dashboard'); 
               } 
               else { alert('Mülk bulunamadı.'); } 
             }} className="w-full max-sm:max-w-full max-w-sm space-y-4">
               <input type="text" placeholder="Örn: west-101" value={clientCodeInput} onChange={e => setClientCodeInput(e.target.value)} className="w-full px-6 py-5 bg-white border-2 border-slate-100 rounded-[2rem] text-center text-2xl font-black uppercase outline-none focus:border-[#001E3C] text-[#001E3C]" />
               <button className="w-full py-5 bg-[#001E3C] text-white rounded-[2rem] font-bold text-lg shadow-xl hover:bg-slate-800">Raporu Aç</button>
             </form>
          </div>
        )}

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
               </div>
               <div className="overflow-x-auto">
                 <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                       <tr>
                          <th className="px-8 py-4">Görsel</th>
                          <th className="px-8 py-4">Mülk</th>
                          <th className="px-8 py-4">Fiyat</th>
                          <th className="px-8 py-4">Yayında (Gün)</th>
                          <th className="px-8 py-4">Giriş</th>
                          <th className="px-8 py-4">Teklif</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                       {properties.map(p => (
                          <tr key={p.id} className="hover:bg-slate-50/50 cursor-pointer" onClick={() => { setSelectedPropertyId(p.id); setActiveTab('dashboard'); }}>
                             <td className="px-8 py-4">
                               <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 border border-slate-100">
                                 <img src={p.image} className="w-full h-full object-cover" />
                               </div>
                             </td>
                             <td className="px-8 py-6 font-bold text-[#001E3C]">{p.title}</td>
                             <td className="px-8 py-6 font-black text-sm text-[#001E3C]">₺{p.currentPrice.toLocaleString()}</td>
                             <td className="px-8 py-6 text-sm font-black text-orange-500">{calculateDaysOnMarket(p.listingDate)} GÜN</td>
                             <td className="px-8 py-6 text-sm font-bold text-blue-500">{p.viewCountByClient || 0}</td>
                             <td className="px-8 py-6 text-sm font-bold text-slate-500">{p.offers?.length || 0}</td>
                          </tr>
                       ))}
                    </tbody>
                 </table>
               </div>
            </div>
          </div>
        )}

        {activeTab === 'customers' && isAdminAuthenticated && (
          <div className="max-w-5xl mx-auto space-y-8 animate-in slide-in-from-bottom-5">
            <h2 className="text-3xl font-black text-[#001E3C]">Müşteri Kaydı (CRM)</h2>
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
              <h3 className="text-lg font-black text-[#001E3C] flex items-center gap-2"><Plus size={20}/> Yeni Müşteri Ekle</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AdminInput label="Ad Soyad" value={newCustomer.name} onChange={(v:any) => setNewCustomer({...newCustomer, name: v})} />
                <AdminInput label="Telefon" value={newCustomer.phone} onChange={(v:any) => setNewCustomer({...newCustomer, phone: v})} />
                <AdminInput label="Bütçe (₺)" type="number" value={newCustomer.budget} onChange={(v:any) => setNewCustomer({...newCustomer, budget: v})} />
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Mahalle Tercihi</label>
                  <select value={newCustomer.preferredNeighborhood} onChange={e => setNewCustomer({...newCustomer, preferredNeighborhood: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none text-[#001E3C]">
                    {RIZE_NEIGHBORHOODS.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Bina Yaşı Tercihi</label>
                  <select value={newCustomer.preferredBuildingAge} onChange={e => setNewCustomer({...newCustomer, preferredBuildingAge: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none text-[#001E3C]">
                    <option value="0-5">0-5 Yaş (Sıfır)</option>
                    <option value="5-15">5-15 Yaş</option>
                    <option value="15+">15+ Yaş</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Kat Tercihi</label>
                  <select value={newCustomer.preferredFloor} onChange={e => setNewCustomer({...newCustomer, preferredFloor: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none text-[#001E3C]">
                    <option value="Bahçe Katı">Bahçe Katı</option>
                    <option value="Ara Kat">Ara Kat</option>
                    <option value="En Üst Kat">En Üst Kat</option>
                  </select>
                </div>
                <div className="md:col-span-2 lg:col-span-3 space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Özel Notlar</label>
                  <textarea value={newCustomer.notes} onChange={e => setNewCustomer({...newCustomer, notes: e.target.value})} placeholder="Örn: Geniş balkonlu olsun, asansör şart..." className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none h-24 resize-none text-[#001E3C]"></textarea>
                </div>
              </div>
              <button onClick={handleAddCustomer} className="w-full py-4 bg-[#001E3C] text-white rounded-xl font-black text-sm uppercase tracking-widest shadow-lg">KAYDI TAMAMLA</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
              {customers.map(c => (
                <div key={c.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-4 group">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-black text-xl">{c.name.charAt(0)}</div>
                      <div><p className="font-black text-lg text-[#001E3C]">{c.name}</p><p className="text-xs font-bold text-slate-400">{c.phone}</p></div>
                    </div>
                    <button onClick={() => setCustomers(prev => prev.filter(x => x.id !== c.id))} className="p-2 text-red-400 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-50 rounded-lg"><Trash2 size={18}/></button>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-xs font-bold text-[#001E3C]">
                    <div className="bg-slate-50 p-3 rounded-xl"><p className="text-[9px] text-slate-400 uppercase">Tercih</p>{c.preferredNeighborhood}</div>
                    <div className="bg-slate-50 p-3 rounded-xl"><p className="text-[9px] text-slate-400 uppercase">Kat/Yaş</p>{c.preferredFloor} • {c.preferredBuildingAge} Yaş</div>
                  </div>
                  {c.notes && <p className="text-xs text-slate-500 font-medium italic border-l-2 border-indigo-200 pl-3">"{c.notes}"</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'edit' && currentProperty && (
          <div className="max-w-4xl mx-auto space-y-12 animate-in slide-in-from-right-10 pb-20">
             <div className="flex justify-between items-center">
                <button onClick={() => setActiveTab('propertyList')} className="flex items-center gap-2 text-slate-500 font-bold hover:text-[#001E3C]"><ArrowLeft size={20}/> Geri</button>
                <button onClick={() => handleDeleteProperty(currentProperty.id)} className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-500 rounded-xl text-sm font-bold"><Trash2 size={18}/> Portföyden Çıkar</button>
             </div>
             
             <div className="bg-white rounded-[3rem] p-8 lg:p-12 shadow-xl border border-slate-100 space-y-16">
                
                <section className="space-y-8">
                   <h3 className="text-xl font-black text-[#001E3C] border-b pb-4 flex items-center gap-3"><Info size={24} className="text-blue-500"/> Temel Bilgiler</h3>
                   
                   {/* Fotoğraf Yükleme Alanı */}
                   <div className="space-y-4">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Mülk Fotoğrafı</label>
                      <div className="flex flex-col md:flex-row gap-6 items-center">
                         <div className="w-40 h-40 bg-slate-100 rounded-[2rem] overflow-hidden border-2 border-dashed border-slate-300 flex items-center justify-center relative group">
                            {currentProperty.image ? (
                               <>
                                  <img src={currentProperty.image} className="w-full h-full object-cover group-hover:opacity-50 transition-opacity" />
                                  <button onClick={() => fileInputRef.current?.click()} className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-[#001E3C]">
                                     <Camera size={32} />
                                  </button>
                               </>
                            ) : (
                               <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center gap-2 text-slate-400">
                                  <Camera size={32} />
                                  <span className="text-[10px] font-black">Yükle</span>
                               </button>
                            )}
                         </div>
                         <div className="flex-1 space-y-4 w-full">
                            <AdminInput label="Görsel URL (Alternatif)" value={currentProperty.image} onChange={(v:any) => updatePropertyData('image', v)} />
                            <button onClick={() => fileInputRef.current?.click()} className="w-full py-4 bg-slate-50 border border-slate-200 text-[#001E3C] rounded-2xl font-black text-sm flex items-center justify-center gap-2 hover:bg-slate-100 transition-colors">
                               <Upload size={18}/> Dosyadan Fotoğraf Seç
                            </button>
                            <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} className="hidden" />
                         </div>
                      </div>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <AdminInput label="İlan Başlığı" value={currentProperty.title} onChange={(v:any) => updatePropertyData('title', v)} />
                      <AdminInput label="Konum / Adres" value={currentProperty.location} onChange={(v:any) => updatePropertyData('location', v)} />
                      <AdminInput label="Mevcut Fiyat (₺)" type="number" value={currentProperty.currentPrice} onChange={(v:any) => updatePropertyData('currentPrice', v)} />
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">İlan Tarihi</label>
                        <input type="date" value={currentProperty.listingDate || ''} onChange={e => updatePropertyData('listingDate', e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none text-[#001E3C]" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Sorumlu Danışman</label>
                        <select value={agents.find(a => a.name === currentProperty.agentName)?.id || ""} onChange={(e) => { const selected = agents.find(a => a.id === e.target.value); if (selected) { updatePropertyData('agentName', selected.name); updatePropertyData('agentPhone', selected.phone); } }} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none text-[#001E3C]">
                          <option value="">Seçiniz...</option>
                          {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                        </select>
                      </div>
                   </div>
                   <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Danışman Notu</label>
                      <textarea value={currentProperty.agentNotes} onChange={(e) => updatePropertyData('agentNotes', e.target.value)} className="w-full p-5 bg-slate-50 border border-slate-200 rounded-3xl text-sm font-bold outline-none h-32 resize-none text-[#001E3C]"></textarea>
                   </div>
                </section>

                <section className="space-y-8">
                   <h3 className="text-xl font-black text-[#001E3C] border-b pb-4 flex items-center gap-3"><Building2 size={24} className="text-emerald-500"/> Piyasa ve Stok Verileri</h3>
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                      <AdminInput label="Emsal Değer (₺)" type="number" value={currentProperty.market?.comparablePrice} onChange={(v:any) => updateMarketData('comparablePrice', v)} />
                      <AdminInput label="Bina İçi Satılık" type="number" value={currentProperty.market?.buildingUnitsCount} onChange={(v:any) => updateMarketData('buildingUnitsCount', v)} />
                      <AdminInput label="Mahalle İçi Satılık" type="number" value={currentProperty.market?.neighborhoodUnitsCount} onChange={(v:any) => updateMarketData('neighborhoodUnitsCount', v)} />
                   </div>
                </section>

                <section className="space-y-8">
                   <h3 className="text-xl font-black text-[#001E3C] border-b pb-4 flex items-center gap-3"><History size={24} className="text-indigo-500"/> Önceki Fiyat Bilgileri</h3>
                   <div className="flex flex-col md:flex-row gap-4 items-end bg-slate-50 p-6 rounded-3xl">
                      <AdminInput label="Tutar (₺)" type="number" value={newPriceUpdate.amount} onChange={(v:any) => setNewPriceUpdate({...newPriceUpdate, amount: v})} />
                      <div className="space-y-1 flex-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Tarih</label>
                        <input type="date" value={newPriceUpdate.date} onChange={e => setNewPriceUpdate({...newPriceUpdate, date: e.target.value})} className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-sm font-bold outline-none text-[#001E3C]" />
                      </div>
                      <button onClick={handleAddPriceUpdate} className="px-10 py-4 bg-[#001E3C] text-white rounded-2xl font-black text-sm">EKLE</button>
                   </div>
                   <div className="space-y-3">
                      {(currentProperty.priceHistory || []).map((ph, idx) => (
                        <div key={idx} className="flex justify-between items-center p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                           <span className="font-black text-[#001E3C]">₺{ph.amount.toLocaleString()}</span>
                           <div className="flex items-center gap-4">
                              <span className="text-xs font-bold text-slate-400">{ph.date}</span>
                              <button onClick={() => updatePropertyData('priceHistory', (currentProperty.priceHistory || []).filter((_, i) => i !== idx))} className="text-red-300"><Trash2 size={16}/></button>
                           </div>
                        </div>
                      ))}
                   </div>
                </section>

                <section className="space-y-8">
                   <h3 className="text-xl font-black text-[#001E3C] border-b pb-4 flex items-center gap-3"><Wallet size={24} className="text-amber-500"/> Teklif Girişi</h3>
                   <div className="flex flex-col md:flex-row gap-4 items-end bg-slate-50 p-6 rounded-3xl">
                      <AdminInput label="Tutar (₺)" type="number" value={newOffer.amount} onChange={(v:any) => setNewOffer({...newOffer, amount: v})} />
                      <AdminInput label="Kişi" value={newOffer.bidder} onChange={(v:any) => setNewOffer({...newOffer, bidder: v})} />
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Durum</label>
                        <select value={newOffer.status} onChange={e => setNewOffer({...newOffer, status: e.target.value as any})} className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-sm font-bold outline-none text-[#001E3C]">
                           <option value="Beklemede">Beklemede</option>
                           <option value="Reddedildi">Reddedildi</option>
                        </select>
                      </div>
                      <button onClick={handleAddOffer} className="px-10 py-4 bg-[#001E3C] text-white rounded-2xl font-black text-sm">KAYDET</button>
                   </div>
                   <div className="space-y-3">
                      {(currentProperty.offers || []).map((offer) => (
                        <div key={offer.id} className="flex justify-between items-center p-5 bg-white border border-slate-100 rounded-2xl shadow-sm">
                           <div>
                              <p className="font-black">₺{offer.amount.toLocaleString()}</p>
                              <p className="text-[10px] font-bold text-slate-400">{offer.bidder} • {offer.status}</p>
                           </div>
                           <button onClick={() => updatePropertyData('offers', (currentProperty.offers || []).filter(o => o.id !== offer.id))} className="text-red-300"><Trash2 size={18}/></button>
                        </div>
                      ))}
                   </div>
                </section>

                <section className="space-y-8">
                   <div className="flex justify-between items-end border-b pb-4">
                      <h3 className="text-xl font-black text-[#001E3C] flex items-center gap-3"><Activity size={24} className="text-blue-500"/> Aylık Veri Girişi</h3>
                      <button onClick={handleAddMonth} className="text-xs font-black text-blue-600 flex items-center gap-1"><Plus size={16}/> YENİ AY</button>
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {(currentProperty.stats || []).map((stat, idx) => (
                        <div key={idx} className="p-8 bg-slate-50 rounded-[2.5rem] space-y-6 border border-slate-100 shadow-inner">
                           <div className="flex justify-between items-center">
                              <h4 className="font-black text-[#001E3C]">{stat.month}</h4>
                              <button onClick={() => updatePropertyData('stats', (currentProperty.stats || []).filter((_, i) => i !== idx))} className="text-red-300"><Trash2 size={18}/></button>
                           </div>
                           <div className="grid grid-cols-2 gap-4">
                              <AdminInput label="İzlenme" type="number" value={stat.views} onChange={(v:any) => handleUpdateStat(idx, 'views', v)} />
                              <AdminInput label="Favori" type="number" value={stat.favorites} onChange={(v:any) => handleUpdateStat(idx, 'favorites', v)} />
                              <AdminInput label="Mesaj" type="number" value={stat.messages} onChange={(v:any) => handleUpdateStat(idx, 'messages', v)} />
                              <AdminInput label="Arama" type="number" value={stat.calls} onChange={(v:any) => handleUpdateStat(idx, 'calls', v)} />
                           </div>
                        </div>
                      ))}
                   </div>
                </section>

                <div className="pt-10">
                  <button onClick={() => { setActiveTab('dashboard'); window.scrollTo(0,0); }} className="w-full py-8 bg-[#001E3C] text-white rounded-[2.5rem] font-black text-xl shadow-2xl transition-all uppercase tracking-widest">GÜNCEL RAPORU YAYINLA</button>
                </div>
             </div>
          </div>
        )}

        {activeTab === 'dashboard' && currentProperty && (
          <div className="max-w-6xl mx-auto space-y-12 animate-in fade-in duration-700 pb-20 text-[#001E3C]">
             <div className="flex flex-col lg:flex-row justify-between items-start gap-8">
                <div className="space-y-3">
                   <div className="flex items-center gap-3">
                      <span className="px-3 py-1 bg-[#001E3C] text-white text-[10px] font-black rounded-full uppercase tracking-widest">{currentProperty.id}</span>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-full">{calculateDaysOnMarket(currentProperty.listingDate)} GÜN AKTİF</span>
                   </div>
                   <h2 className="text-5xl font-black tracking-tight leading-tight">{currentProperty.title}</h2>
                   <p className="flex items-center gap-3 text-slate-500 font-black text-xl"><MapPin size={24} className="text-red-400"/> {currentProperty.location}</p>
                </div>
                <div className="flex gap-4 w-full lg:w-auto">
                   {isAdminAuthenticated && <button onClick={() => setActiveTab('edit')} className="p-6 bg-white border border-slate-200 rounded-[2rem] shadow-sm hover:shadow-lg transition-all"><Edit3 size={32}/></button>}
                   <button onClick={handleGenerateAISummary} disabled={isGenerating} className="flex-1 lg:flex-none px-12 py-6 bg-[#001E3C] text-white rounded-[2rem] font-black shadow-2xl flex items-center justify-center gap-4 active:scale-95 transition-all">
                     {isGenerating ? <Loader2 size={24} className="animate-spin"/> : <Sparkles size={24} className="text-amber-300"/>} AI ANALİZİ
                   </button>
                </div>
             </div>

             <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                <DashboardStat label="Toplam Görüntüleme" value={currentProperty.stats?.reduce((acc,s)=>acc+s.views, 0) || 0} icon={<Eye size={28}/>} color="blue" />
                <DashboardStat label="Emsal Piyasa Değeri" value={`₺${(currentProperty.market?.comparablePrice || 0).toLocaleString()}`} icon={<Target size={28}/>} color="indigo" />
                <DashboardStat label="Aktif Teklifler" value={currentProperty.offers?.filter(o => o.status === 'Beklemede').length || 0} icon={<Wallet size={28}/>} color="emerald" />
                <DashboardStat label="Güncel Satış Fiyatı" value={`₺${currentProperty.currentPrice.toLocaleString()}`} icon={<span>₺</span>} color="red" />
             </div>

             <div className="space-y-6">
                <div className="flex items-center gap-3 border-l-4 border-[#001E3C] pl-6 mb-4">
                    <h3 className="text-3xl font-black uppercase tracking-tighter">İstatistiksel Karşılaştırma</h3>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                    <div className="lg:col-span-2 bg-white p-10 rounded-[3rem] shadow-xl border border-slate-50">
                        <div className="flex flex-wrap justify-between items-center mb-10 gap-4">
                            <h4 className="text-xl font-black flex items-center gap-3 uppercase"><BarChart3 size={24} className="text-blue-500"/> Aylık Veri Özeti</h4>
                            <div className="flex flex-wrap gap-4 text-[9px] font-black uppercase text-slate-400">
                                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-[#001E3C] rounded-full"></div> İzlenme</div>
                                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-red-500 rounded-full"></div> Favori</div>
                                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-emerald-500 rounded-full"></div> Mesaj</div>
                                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-indigo-500 rounded-full"></div> Arama</div>
                            </div>
                        </div>
                        <div className="h-[400px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={currentProperty.stats}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold', fill: '#94a3b8'}} />
                                    <YAxis hide />
                                    <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)', fontWeight: 'bold'}} />
                                    <Bar dataKey="views" name="İzlenme" fill="#001E3C" radius={[4, 4, 0, 0]} barSize={15} />
                                    <Bar dataKey="favorites" name="Favori" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={15} />
                                    <Bar dataKey="messages" name="Mesaj" fill="#10b981" radius={[4, 4, 0, 0]} barSize={15} />
                                    <Bar dataKey="calls" name="Arama" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={15} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="space-y-6">
                        {statComparison ? (
                            <div className="bg-white p-8 rounded-[2.5rem] shadow-lg border border-slate-50 flex flex-col justify-between h-full">
                                <div className="space-y-6">
                                    <h4 className="text-lg font-black uppercase tracking-tight text-[#001E3C] border-b pb-4">Aylar Arası Fark</h4>
                                    <ComparisonRow label="İzlenme Trendi" value={statComparison.viewsDiff} month={statComparison.currMonth} />
                                    <ComparisonRow label="Favori Kazanımı" value={statComparison.favsDiff} month={statComparison.currMonth} />
                                    <ComparisonRow label="Fiziksel Ziyaret" value={statComparison.visitsDiff} month={statComparison.currMonth} />
                                </div>
                                <div className="mt-8 p-6 bg-slate-50 rounded-2xl border border-slate-100 italic text-xs font-bold text-slate-500">
                                    * {statComparison.prevMonth} - {statComparison.currMonth} karşılaştırmasıdır.
                                </div>
                            </div>
                        ) : (
                            <div className="bg-white p-10 rounded-[2.5rem] shadow-lg border border-slate-50 text-center flex flex-col items-center justify-center gap-4 text-slate-400 font-bold h-full">
                                <Activity size={48} className="opacity-20" />
                                <p>Karşılaştırma için yeterli veri girilmedi.</p>
                            </div>
                        )}
                    </div>
                </div>
             </div>

             <div className="space-y-6">
                <div className="flex items-center gap-3 border-l-4 border-emerald-500 pl-6 mb-4">
                    <h3 className="text-3xl font-black uppercase tracking-tighter">Fiyat Hareketliliği</h3>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {currentProperty.priceHistory && currentProperty.priceHistory.length > 0 ? (
                        [...currentProperty.priceHistory].reverse().map((ph, idx) => {
                            const prevPh = currentProperty.priceHistory[currentProperty.priceHistory.length - idx - 2];
                            const diff = prevPh ? ph.amount - prevPh.amount : 0;
                            const isDown = diff < 0;

                            return (
                                <div key={idx} className="bg-white p-8 rounded-[2.5rem] shadow-lg border border-slate-50 space-y-4 group hover:border-emerald-200 transition-all">
                                    <div className="flex justify-between items-start">
                                        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                                            <span>₺</span>
                                        </div>
                                        <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-3 py-1 rounded-full">{ph.date}</span>
                                    </div>
                                    <div>
                                        <p className="text-2xl font-black text-[#001E3C]">₺{ph.amount.toLocaleString()}</p>
                                        {diff !== 0 && (
                                            <div className={`flex items-center gap-1 text-[11px] font-black mt-2 ${isDown ? 'text-emerald-500' : 'text-red-500'}`}>
                                                {isDown ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />}
                                                ₺{Math.abs(diff).toLocaleString()} {isDown ? 'İndirim' : 'Artış'}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="col-span-full bg-white p-10 rounded-[2.5rem] text-center font-bold text-slate-400 border-2 border-dashed">
                            Fiyat geçmişi kaydı bulunamadı.
                        </div>
                    )}
                </div>
             </div>

             <div className="space-y-6">
                <div className="flex items-center gap-3 border-l-4 border-indigo-500 pl-6 mb-4">
                    <h3 className="text-3xl font-black uppercase tracking-tighter">Piyasa Rekabet Analizi</h3>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                    <div className="bg-[#001E3C] p-10 rounded-[3.5rem] text-white shadow-2xl relative overflow-hidden group">
                        <div className="relative z-10 space-y-8">
                            <div className="flex items-center gap-4">
                                <Scale size={36} className="text-blue-400"/>
                                <h4 className="text-2xl font-black">Fiyat Konumlandırma</h4>
                            </div>
                            <div className="flex items-end gap-6 border-b border-white/10 pb-10">
                                <div>
                                    <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">Güncel Fiyat</p>
                                    <p className="text-3xl font-black text-white">₺{currentProperty.currentPrice.toLocaleString()}</p>
                                </div>
                                <div className="flex-1 h-1 bg-white/10 relative rounded-full mb-4">
                                    <div className="absolute top-1/2 -translate-y-1/2 left-[45%] w-4 h-4 bg-blue-400 rounded-full shadow-[0_0_15px_rgba(96,165,250,0.8)]"></div>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">Piyasa Emsal</p>
                                    <p className="text-3xl font-black text-blue-400">₺{(currentProperty.market?.comparablePrice || 0).toLocaleString()}</p>
                                </div>
                            </div>
                            <p className="text-lg font-medium italic text-white/70">
                                {currentProperty.currentPrice > (currentProperty.market?.comparablePrice || 0) 
                                    ? "Mülkünüz piyasa ortalamasının üzerinde konumlanmıştır."
                                    : "Mülkünüz rekabetçi bir fiyata sahiptir. Hızlı satış potansiyeli yüksektir."}
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <InventoryCard 
                            label="Binadaki Rekabet" 
                            count={currentProperty.market?.buildingUnitsCount || 0} 
                            desc="Binadaki rakip satılık üniteler."
                            status={currentProperty.market?.buildingUnitsCount > 2 ? 'Yüksek' : 'Düşük'}
                            statusColor={currentProperty.market?.buildingUnitsCount > 2 ? 'red' : 'emerald'}
                        />
                        <InventoryCard 
                            label="Bölge Stok Yoğunluğu" 
                            count={currentProperty.market?.neighborhoodUnitsCount || 0} 
                            desc="Mahalledeki benzer ilan sayısı."
                            status={currentProperty.market?.neighborhoodUnitsCount > 10 ? 'Yoğun' : 'Az'}
                            statusColor={currentProperty.market?.neighborhoodUnitsCount > 10 ? 'amber' : 'emerald'}
                        />
                    </div>
                </div>
             </div>

             <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <div className="bg-white p-10 rounded-[3rem] border border-slate-50 shadow-xl space-y-8">
                   <h4 className="text-2xl font-black flex items-center gap-3"><Wallet size={28} className="text-emerald-500"/> Alıcı Teklifleri</h4>
                   <div className="space-y-4 max-h-[350px] overflow-y-auto pr-3 custom-scrollbar">
                      {(!currentProperty.offers || currentProperty.offers.length === 0) ? (
                        <div className="py-24 text-center text-slate-300 font-black text-xl italic">Henüz resmi teklif bulunmuyor...</div>
                      ) : (
                        currentProperty.offers.map(offer => (
                          <div key={offer.id} className="flex items-center justify-between p-7 bg-slate-50 rounded-[2.5rem] border border-slate-100">
                             <div className="flex items-center gap-5">
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-2xl shadow-inner ${offer.status === 'Reddedildi' ? 'bg-red-50 text-red-400' : 'bg-white text-[#001E3C]'}`}>{offer.bidder.charAt(0)}</div>
                                <div><p className="font-black text-xl">{offer.bidder.substring(0,2)}***</p><p className="text-[10px] font-black text-slate-400 uppercase">{offer.status} • {offer.date}</p></div>
                             </div>
                             <p className={`font-black text-2xl ${offer.status === 'Reddedildi' ? 'text-red-300 line-through' : 'text-[#001E3C]'}`}>₺{offer.amount.toLocaleString()}</p>
                          </div>
                        ))
                      )}
                   </div>
                </div>
                
                <div className="bg-[#001E3C] p-12 rounded-[3.5rem] text-white flex flex-col justify-between shadow-2xl relative overflow-hidden group">
                   <div className="space-y-10">
                      <div className="flex items-center gap-4"><MessageCircle size={40} className="text-blue-400"/><h4 className="text-3xl font-black">Danışman Görüşü</h4></div>
                      <p className="text-3xl font-medium italic text-white/80 leading-relaxed group-hover:text-white transition-colors duration-500">"{currentProperty.agentNotes || 'Mülkünüz için en iyi satış stratejisini kurguluyoruz.'}"</p>
                   </div>
                   <div className="mt-16 pt-10 border-t border-white/10 flex items-center justify-between">
                      <div className="flex items-center gap-5">
                         <div className="w-20 h-20 bg-white/10 rounded-2xl flex items-center justify-center text-blue-400"><UserCheck size={40}/></div>
                         <div><p className="text-[11px] font-black text-white/40 uppercase tracking-widest mb-1">Portföy Yöneticisi</p><p className="text-2xl font-black">{currentProperty.agentName || 'TÜRKWEST Danışmanı'}</p></div>
                      </div>
                      {currentProperty.agentPhone && <a href={`tel:${currentProperty.agentPhone}`} className="w-20 h-20 bg-blue-500 text-white rounded-2xl flex items-center justify-center shadow-2xl active:scale-90 transition-transform"><Phone size={36}/></a>}
                   </div>
                </div>
             </div>

             {aiSummary && (
               <div className="bg-white p-12 rounded-[4rem] shadow-2xl border border-blue-50 relative overflow-hidden flex flex-col justify-center animate-in zoom-in duration-500">
                  <div className="relative z-10 space-y-6">
                      <h4 className="text-3xl font-black text-[#001E3C] flex items-center gap-4"><Sparkles size={40} className="text-amber-500"/> AI Stratejik Analiz</h4>
                      <div className="prose max-w-none text-[#001E3C] leading-relaxed font-bold text-2xl italic whitespace-pre-line">"{aiSummary}"</div>
                  </div>
               </div>
             )}
          </div>
        )}

        {/* Portföy Listesi, Danışman ve Diğerleri birebir korundu */}
        {activeTab === 'propertyList' && isAdminAuthenticated && (
          <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in">
             <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <h2 className="text-3xl font-black text-[#001E3C]">Portföy Merkezi</h2>
                <button onClick={() => {
                   const id = `west-${Math.floor(100+Math.random()*900)}`;
                   const currentMonth = MONTHS_LIST[new Date().getMonth()];
                   const newProp: Property = { 
                     id, title: 'Yeni İlan', location: 'Rize', image: '',
                     currentPrice: 0, priceHistory: [], agentNotes: '', clientFeedback: [], offers: [], 
                     stats: [{ month: currentMonth, views: 0, favorites: 0, messages: 0, calls: 0, visits: 0 }],
                     market: { comparablePrice: 0, buildingUnitsCount: 0, neighborhoodUnitsCount: 0, avgSaleDurationDays: 0 },
                     agentName: 'Ekip', agentPhone: '', listingDate: new Date().toISOString().split('T')[0], viewCountByClient: 0
                   };
                   setProperties(prev => [...prev, newProp]);
                   setSelectedPropertyId(id);
                   setActiveTab('edit');
                }} className="w-full sm:w-auto px-10 py-4 bg-[#001E3C] text-white rounded-2xl font-black flex items-center justify-center gap-2 shadow-xl"><Plus size={20}/> Yeni İlan Ekle</button>
             </div>
             <div className="relative">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={24}/>
                <input type="text" placeholder="Portföy kodu veya başlık ara..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-16 pr-8 py-5 bg-white border border-slate-200 rounded-[2.5rem] outline-none text-[#001E3C] font-bold shadow-sm" />
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                {filteredProperties.map(p => (
                  <div key={p.id} className="bg-white rounded-[3rem] overflow-hidden border border-slate-100 shadow-md hover:shadow-2xl transition-all group cursor-pointer" onClick={() => { setSelectedPropertyId(p.id); setActiveTab('dashboard'); }}>
                     <div className="h-60 relative overflow-hidden">
                       <img src={p.image || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1000&q=80'} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                       <div className="absolute top-5 left-5 px-5 py-2 bg-[#001E3C]/90 backdrop-blur-md text-white rounded-full text-[11px] font-black">{p.id}</div>
                       <div className="absolute bottom-5 right-5 px-4 py-2 bg-white/90 backdrop-blur-md text-[#001E3C] rounded-full text-[10px] font-black shadow-sm">{calculateDaysOnMarket(p.listingDate)} GÜN</div>
                     </div>
                     <div className="p-8 space-y-5">
                        <h4 className="font-black text-xl text-[#001E3C] line-clamp-1">{p.title}</h4>
                        <div className="flex gap-4 pt-2">
                           <button onClick={(e) => { e.stopPropagation(); setSelectedPropertyId(p.id); setActiveTab('dashboard'); }} className="flex-1 py-4 bg-[#001E3C] text-white rounded-[1.5rem] text-xs font-black">ANALİZ RAPORU</button>
                           <button onClick={(e) => { e.stopPropagation(); setSelectedPropertyId(p.id); setActiveTab('edit'); }} className="p-4 bg-slate-50 text-slate-400 rounded-[1.5rem] hover:text-[#001E3C] transition-colors"><Edit3 size={24}/></button>
                        </div>
                     </div>
                  </div>
                ))}
             </div>
          </div>
        )}

        {activeTab === 'agents' && isAdminAuthenticated && (
          <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-bottom-5">
            <h2 className="text-3xl font-black text-[#001E3C]">Danışman Yönetimi</h2>
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
              <h3 className="text-lg font-black text-[#001E3C] flex items-center gap-2"><Plus size={20}/> Yeni Danışman Ekle</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <AdminInput label="Ad Soyad" value={newAgent.name} onChange={(v:any) => setNewAgent({...newAgent, name: v})} />
                <AdminInput label="Telefon" value={newAgent.phone} onChange={(v:any) => setNewAgent({...newAgent, phone: v})} />
              </div>
              <button onClick={handleAddAgent} className="w-full py-4 bg-[#001E3C] text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg"><Plus size={20}/> Kaydet</button>
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

        {activeTab === 'calendar' && isAdminAuthenticated && (
          <div className="max-w-5xl mx-auto space-y-8 animate-in slide-in-from-bottom-5">
            <h2 className="text-3xl font-black text-[#001E3C]">Pazarlama Takvimi</h2>
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
              <h3 className="text-lg font-black text-[#001E3C] flex items-center gap-2"><Share2 size={20}/> Görev Planla</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Mülk Seçin</label>
                  <select value={newTask.propertyId} onChange={e => setNewTask({...newTask, propertyId: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none text-[#001E3C]">
                    <option value="">Seçiniz...</option>
                    {properties.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Görev Tipi</label>
                  <select value={newTask.taskType} onChange={e => setNewTask({...newTask, taskType: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none text-[#001E3C]">
                    <option value="Instagram Reels">Instagram Reels</option>
                    <option value="Fotoğraf Yenileme">Fotoğraf Yenileme</option>
                    <option value="İlan Öne Çıkarma">İlan Öne Çıkarma</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Tarih</label>
                  <input type="date" value={newTask.startDate} onChange={e => setNewTask({...newTask, startDate: e.target.value, endDate: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none text-[#001E3C]" />
                </div>
              </div>
              <button onClick={handleAddTask} className="w-full py-4 bg-[#001E3C] text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg"><CheckCircle size={20}/> Takvime Ekle</button>
            </div>
            <div className="space-y-4">
              {socialMediaTasks.map(task => (
                <div key={task.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center"><Calendar size={24}/></div>
                    <div><p className="font-black text-[#001E3C]">{task.propertyName}</p><p className="text-xs font-bold text-slate-400">{task.taskType} • {task.startDate}</p></div>
                  </div>
                  <button onClick={() => setSocialMediaTasks(prev => prev.filter(x => x.id !== task.id))} className="p-3 text-red-400 hover:bg-red-50 rounded-xl"><Trash2 size={18}/></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'notifications' && isAdminAuthenticated && (
          <div className="max-w-4xl mx-auto space-y-8 pb-20 animate-in fade-in">
             <h2 className="text-3xl font-black text-[#001E3C]">Müşteri Talepleri</h2>
             <div className="space-y-4">
                {allFeedbacks.sort((a,b) => b.date.localeCompare(a.date)).map((fb: any) => (
                  <div key={fb.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col sm:flex-row justify-between items-start gap-4">
                     <div className="flex gap-4 flex-1">
                        <div className="w-20 h-20 rounded-2xl overflow-hidden shrink-0 border border-slate-50">
                           <img src={fb.propertyImage || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1000&q=80'} className="w-full h-full object-cover" />
                        </div>
                        <div className="space-y-2 flex-1">
                           <div className="flex items-center gap-2">
                             <span className="px-3 py-1 bg-slate-100 text-slate-500 text-[10px] font-black rounded-full uppercase">{fb.date}</span>
                             <span className="px-3 py-1 bg-blue-50 text-[#001E3C] text-[10px] font-black rounded-full">{fb.propertyTitle}</span>
                           </div>
                           <p className="text-lg font-black text-[#001E3C]">{fb.message}</p>
                        </div>
                     </div>
                     <div className="flex gap-2 w-full sm:w-auto">
                        <button onClick={() => { setSelectedPropertyId(fb.propertyId); setActiveTab('dashboard'); window.scrollTo(0,0); }} className="flex-1 px-6 py-4 bg-[#001E3C] text-white rounded-2xl text-xs font-black shadow-lg">Mülke Git</button>
                        <button onClick={() => setProperties(prev => prev.map(p => p.id === fb.propertyId ? { ...p, clientFeedback: (p.clientFeedback || []).filter(f => f.id !== fb.id) } : p))} className="p-4 bg-red-50 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all"><Trash2 size={24}/></button>
                     </div>
                  </div>
                ))}
             </div>
          </div>
        )}
      </main>

      {/* Admin Mobile Tab Bar */}
      {isAdminAuthenticated && (
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-[#001E3C] border-t border-white/5 px-6 py-4 flex justify-around items-center z-[60] safe-bottom shadow-[0_-20px_50px_-12px_rgba(0,0,0,0.5)]">
           <MobileNavItem icon={<Home size={22}/>} label="Portföy" active={activeTab === 'propertyList'} onClick={() => setActiveTab('propertyList')} />
           <MobileNavItem icon={<Users size={22}/>} label="CRM" active={activeTab === 'customers'} onClick={() => setActiveTab('customers')} />
           <MobileNavItem icon={<Calendar size={22}/>} label="Takvim" active={activeTab === 'calendar'} onClick={() => setActiveTab('calendar')} />
           <MobileNavItem icon={<Bell size={22}/>} label="Talep" active={activeTab === 'notifications'} onClick={() => setActiveTab('notifications')} badge={totalNotifications} />
        </nav>
      )}

      {showLoginModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#001E3C]/98 backdrop-blur-2xl p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-[3.5rem] p-12 text-center shadow-2xl">
            <Lock className="mx-auto mb-8 text-[#001E3C]" size={48}/><h3 className="text-2xl font-black mb-8 text-[#001E3C]">Yönetici Doğrulama</h3>
            <form onSubmit={handleLogin} className="space-y-6">
              <input type="password" autoFocus placeholder="PIN" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} className="w-full p-5 bg-slate-50 border-2 rounded-[2rem] outline-none text-center text-4xl font-black tracking-widest text-[#001E3C] focus:border-[#001E3C] transition-all" />
              <button type="submit" className="w-full py-5 bg-[#001E3C] text-white rounded-[2rem] font-black text-xl shadow-2xl">GİRİŞ YAP</button>
              <button type="button" onClick={() => setShowLoginModal(false)} className="text-xs font-black text-slate-400 mt-6 uppercase tracking-widest">İptal</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// --- YARDIMCI BİLEŞENLER ---

const ComparisonRow = ({ label, value, month }: { label: string, value: number, month: string }) => {
    const isUp = value > 0;
    const isNeutral = value === 0;
    return (
        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl group hover:bg-slate-100 transition-colors">
            <span className="text-sm font-black text-[#001E3C] uppercase tracking-tighter">{label}</span>
            <div className={`flex items-center gap-1 font-black ${isNeutral ? 'text-slate-400' : isUp ? 'text-emerald-500' : 'text-red-500'}`}>
                {isUp ? <ArrowUpRight size={18} /> : isNeutral ? <div className="w-4 h-[2px] bg-slate-400"></div> : <ArrowDownRight size={18} />}
                <span className="text-lg">{isNeutral ? '-%0' : `%${Math.abs(value)}`}</span>
            </div>
        </div>
    );
};

const InventoryCard = ({ label, count, desc, status, statusColor }: any) => {
    const colorClass = statusColor === 'red' ? 'bg-red-50 text-red-600' : statusColor === 'amber' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600';
    return (
        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-50 flex flex-col justify-between hover:shadow-2xl transition-all">
            <div className="space-y-4">
                <div className="flex justify-between items-start">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${colorClass}`}>{status} Stok</span>
                </div>
                <h5 className="text-5xl font-black text-[#001E3C]">{count}</h5>
                <p className="text-xs font-bold text-slate-400 leading-relaxed">{desc}</p>
            </div>
        </div>
    );
};

const NavItem = ({ icon, label, active, onClick, badge }: any) => (
  <button onClick={onClick} className={`w-full flex items-center justify-between px-6 py-4 rounded-2xl transition-all ${active ? 'bg-white/10 text-white font-black' : 'text-white/30 hover:text-white'}`}>
    <div className="flex items-center gap-4"><span>{icon}</span><span className="text-[13px] uppercase tracking-wide font-black">{label}</span></div>
    {(badge || 0) > 0 && <span className="w-6 h-6 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center ring-2 ring-[#001E3C]">{badge}</span>}
  </button>
);

const MobileNavItem = ({ icon, label, active, onClick, badge }: any) => (
  <button onClick={onClick} className={`flex flex-col items-center gap-1.5 transition-all relative ${active ? 'text-white scale-110' : 'text-white/30'}`}>
    <div className="relative">{icon}{(badge || 0) > 0 && <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white text-[8px] font-black rounded-full flex items-center justify-center ring-1 ring-[#001E3C]">{badge}</span>}</div>
    <span className="text-[9px] font-black uppercase tracking-tighter">{label}</span>
  </button>
);

const DashboardStat = ({ label, value, icon, color }: any) => {
  const styles: any = { blue: 'bg-blue-50 text-blue-600', red: 'bg-red-50 text-red-600', indigo: 'bg-indigo-50 text-indigo-600', emerald: 'bg-emerald-50 text-emerald-600' };
  return (
    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-md space-y-4 hover:shadow-xl transition-all group">
       <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${styles[color]} group-hover:scale-110 transition-transform`}>{icon}</div>
       <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
          <h4 className="text-2xl font-black text-[#001E3C] mt-1 whitespace-nowrap overflow-hidden text-ellipsis">{value}</h4>
       </div>
    </div>
  );
};

const AdminInput = ({ label, value, onChange, type = "text" }: any) => (
  <div className="space-y-1 w-full text-left">
    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">{label}</label>
    <input type={type === 'number' ? 'text' : type} value={value ?? ''} onChange={(e) => {
      const v = e.target.value;
      if(type === 'number') {
        const n = v === '' ? 0 : Number(v.replace(/[^0-9]/g, ''));
        onChange(isNaN(n) ? 0 : n);
      } else { onChange(v); }
    }} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-[#001E3C] text-[#001E3C] transition-all" />
  </div>
);

export default App;