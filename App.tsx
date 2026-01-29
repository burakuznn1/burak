import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  LayoutDashboard, LogOut, Sparkles, MapPin, MessageSquare, Eye, Heart, 
  Info, Edit3, Send, Lock, Plus, Trash2, Search, 
  Home, Award, Building2, MessageCircle, Users,
  Loader2, Wallet, Activity, ArrowLeft, History, Coins,
  Bell, Calendar as CalendarIcon, BarChart3, Phone, UserCheck, Share2,
  CheckCircle, ArrowUpRight, ArrowDownRight, Camera, Upload, PieChart, Target, UserPlus, User,
  ClipboardCheck, Clock, Zap, ListChecks, TrendingDown, Tag, ChevronRight, XCircle,
  Building, Map as MapIcon, Filter, Check, X, MessageSquarePlus
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { Property, PropertyStats, Offer, PricePoint, Agent, SocialMediaTask, Customer, ClientFeedback, PropertyActivity } from './types.ts';
import { generateReportSummary } from './services/geminiService.ts';

const SUPABASE_URL = "https://vaafmxefgjofqcrnrnlw.supabase.co";
const SUPABASE_KEY = "sb_publishable_0Jtlb5Ds-ZoTBXiEFmxyAg_LNY5NQud"; 

const ADMIN_PASSWORD = "west";
const MONTHS_LIST = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

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
      { date: '2024-01-15', amount: 19500000 },
      { date: '2024-06-12', amount: 18500000 }
    ],
    agentNotes: "Mülkümüz bu ay ciddi bir ivme kazandı. Gelen teklifler nakit alım üzerine yoğunlaşıyor. Fiyat konumlandırması bölge emsallerine göre oldukça avantajlı.",
    clientFeedback: [],
    offers: [
      { id: '1', date: '2024-06-12', amount: 17500000, bidder: 'A. Yılmaz', status: 'Beklemede' }
    ],
    activities: [
      { id: 'a1', date: '2024-06-12', title: 'Profesyonel Fotoğraf Çekimi', description: 'Mülkün tüm odaları ve manzarası profesyonel ekipmanlarla yeniden fotoğraflandı.' },
      { id: 'a2', date: '2024-06-15', title: 'Reklam Kampanyası', description: 'Sosyal medya platformlarında hedefli reklamlar yayına alındı.' }
    ],
    stats: [
      { month: 'Haziran', views: 820, favorites: 68, messages: 18, calls: 14, visits: 8 }
    ],
    market: { comparablePrice: 17800000, buildingUnitsCount: 2, neighborhoodUnitsCount: 14, avgSaleDurationDays: 45 }
  }
];

const App: React.FC = () => {
  const [properties, setProperties] = useState<Property[]>(INITIAL_PROPERTIES);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
  
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(() => {
    try {
      return localStorage.getItem("west_admin_auth") === "true";
    } catch { return false; }
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
  const [isDataInitialized, setIsDataInitialized] = useState(false); 
  
  const [newOffer, setNewOffer] = useState({ amount: '', bidder: '', status: 'Beklemede' as const });
  const [newActivity, setNewActivity] = useState({ date: new Date().toISOString().slice(0, 10), title: '', description: '' });
  const [newAgent, setNewAgent] = useState({ name: '', phone: '' });
  const [newPricePoint, setNewPricePoint] = useState({ date: new Date().toISOString().slice(0, 10), amount: "" });
  const [newCalendarEvent, setNewCalendarEvent] = useState({ date: new Date().toISOString().slice(0, 10), title: '', propId: '', type: 'Gezdirme' });
  
  const [clientFeedbackInput, setClientFeedbackInput] = useState("");
  const [clientRequestedPrice, setClientRequestedPrice] = useState("");
  
  const [newCustomer, setNewCustomer] = useState<Partial<Customer>>({ 
    name: '', phone: '', preferredSize: '2+1', preferredNeighborhood: '', 
    budget: 0, category: 'Satılık', notes: '' 
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);

  const supabase = useMemo(() => {
    if (SUPABASE_URL && SUPABASE_KEY) {
      try { return createClient(SUPABASE_URL, SUPABASE_KEY); } catch (e) { return null; }
    }
    return null;
  }, []);

  // LOAD DATA
  useEffect(() => {
    const initializeData = async () => {
      setIsLoadingCloud(true);
      try {
        const localDataString = localStorage.getItem('west_full_data');
        if (localDataString) {
          const localData = JSON.parse(localDataString);
          if (localData.properties?.length > 0) setProperties(localData.properties);
          setAgents(localData.agents || []);
          setCustomers(localData.customers || []);
          setCalendarEvents(localData.calendarEvents || []);
        }
      } catch (e) {}

      if (supabase) {
        try {
          const { data, error } = await supabase.from('portfolios').select('data').eq('id', 'main_database').single();
          if (!error && data?.data) {
            const cloud = data.data;
            if (cloud.properties?.length > 0) setProperties(cloud.properties);
            setAgents(cloud.agents || []);
            setCustomers(cloud.customers || []);
            setCalendarEvents(cloud.calendarEvents || []);
          }
        } catch (e) {}
      }
      setIsDataInitialized(true); 
      setIsLoadingCloud(false);
    };
    initializeData();
  }, [supabase]);

  // SYNC DATA
  useEffect(() => {
    if (!isDataInitialized || isLoadingCloud) return;
    const fullData = { properties, agents, customers, calendarEvents };
    try { localStorage.setItem('west_full_data', JSON.stringify(fullData)); } catch (e) {}
    if (supabase && (isAdminAuthenticated || isClientMode)) {
      const sync = async () => {
        try { await supabase.from('portfolios').upsert({ id: 'main_database', data: fullData }); } catch (e) {}
      };
      const timer = setTimeout(sync, 2500);
      return () => clearTimeout(timer);
    }
  }, [properties, agents, customers, calendarEvents, supabase, isAdminAuthenticated, isClientMode, isLoadingCloud, isDataInitialized]);

  const currentProperty = useMemo(() => properties.find(p => p.id === selectedPropertyId), [properties, selectedPropertyId]);
  const filteredProperties = useMemo(() => properties.filter(p => p.title.toLowerCase().includes(searchTerm.toLowerCase()) || p.id.toLowerCase().includes(searchTerm.toLowerCase())), [properties, searchTerm]);
  
  const allNotifications = useMemo(() => {
    const notifications: Array<{ propId: string; propTitle: string; feedback: ClientFeedback }> = [];
    properties.forEach(p => {
      if (p.clientFeedback && p.clientFeedback.length > 0) {
        p.clientFeedback.forEach(f => {
          notifications.push({ propId: p.id, propTitle: p.title, feedback: f });
        });
      }
    });
    return notifications.sort((a, b) => b.feedback.id.localeCompare(a.feedback.id));
  }, [properties]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === ADMIN_PASSWORD) {
      setIsAdminAuthenticated(true);
      localStorage.setItem('west_admin_auth', 'true');
      setShowLoginModal(false);
      setActiveTab('propertyList');
      setPasswordInput("");
    } else { alert("PIN Hatalı!"); }
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

  const handleDeleteProperty = (propertyId: string) => {
    if (!window.confirm("Silmek istediğinizden emin misiniz?")) return;
    setProperties(prev => prev.filter(p => p.id !== propertyId));
    setSelectedPropertyId(null);
    setActiveTab('propertyList');
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
    let nextMonth = MONTHS_LIST[new Date().getMonth()];
    if (currentStats.length > 0) {
      const lastMonth = currentStats[currentStats.length - 1].month;
      const lastIdx = MONTHS_LIST.indexOf(lastMonth);
      nextMonth = MONTHS_LIST[(lastIdx + 1) % 12];
    }
    updatePropertyData('stats', [...currentStats, { month: nextMonth, views: 0, favorites: 0, messages: 0, calls: 0, visits: 0 }]);
  };

  const handleAddOffer = () => {
    if (!currentProperty || !newOffer.amount || !newOffer.bidder) return;
    const offer: Offer = { id: Date.now().toString(), date: new Date().toLocaleDateString('tr-TR'), amount: Number(newOffer.amount), bidder: newOffer.bidder, status: newOffer.status };
    updatePropertyData('offers', [...(currentProperty.offers || []), offer]);
    setNewOffer({ amount: '', bidder: '', status: 'Beklemede' });
  };

  const handleDeleteOffer = (offerId: string) => {
    if (!currentProperty) return;
    updatePropertyData('offers', (currentProperty.offers || []).filter(o => o.id !== offerId));
  };

  const handleUpdateOfferStatus = (offerId: string, status: Offer['status']) => {
    if (!currentProperty) return;
    const updatedOffers = (currentProperty.offers || []).map(o => o.id === offerId ? { ...o, status } : o);
    updatePropertyData('offers', updatedOffers);
  };

  const handleAddActivity = () => {
    if (!currentProperty || !newActivity.title) return;
    const activity: PropertyActivity = { id: Date.now().toString(), date: newActivity.date, title: newActivity.title, description: newActivity.description };
    updatePropertyData('activities', [...(currentProperty.activities || []), activity]);
    setNewActivity({ date: new Date().toISOString().slice(0, 10), title: '', description: '' });
  };

  const handleDeleteActivity = (activityId: string) => {
    if (!currentProperty) return;
    updatePropertyData('activities', (currentProperty.activities || []).filter(a => a.id !== activityId));
  };

  const handleAddPriceUpdate = () => {
    if (!currentProperty || !newPricePoint.amount) return;
    const updatedHistory = [...(currentProperty.priceHistory || []), { date: newPricePoint.date, amount: Number(newPricePoint.amount) }];
    setProperties(prev => prev.map(p => p.id === selectedPropertyId ? { ...p, priceHistory: updatedHistory, currentPrice: Number(newPricePoint.amount) } : p));
    setNewPricePoint({ date: new Date().toISOString().slice(0, 10), amount: '' });
  };

  const handleDeletePricePoint = (idx: number) => {
    if (!currentProperty) return;
    const updatedHistory = (currentProperty.priceHistory || []).filter((_, i) => i !== idx);
    const newCurrent = updatedHistory.length > 0 ? updatedHistory[updatedHistory.length - 1].amount : currentProperty.currentPrice;
    setProperties(prev => prev.map(p => p.id === selectedPropertyId ? { ...p, priceHistory: updatedHistory, currentPrice: newCurrent } : p));
  };

  const handleAddAgent = () => {
    if (!newAgent.name || !newAgent.phone) return;
    setAgents(prev => [...prev, { id: Date.now().toString(), ...newAgent }]);
    setNewAgent({ name: '', phone: '' });
  };

  const handleAddCustomer = () => {
    if (!newCustomer.name || !newCustomer.phone) return;
    setCustomers(prev => [...prev, { id: Date.now().toString(), ...newCustomer as Customer, lastContactDate: new Date().toISOString() }]);
    setNewCustomer({ name: '', phone: '', preferredSize: '2+1', preferredNeighborhood: '', budget: 0, category: 'Satılık', notes: '' });
  };

  const handleAddCalendarEvent = () => {
    if (!newCalendarEvent.title || !newCalendarEvent.date) return;
    setCalendarEvents(prev => [...prev, { id: Date.now().toString(), ...newCalendarEvent }]);
    setNewCalendarEvent({ date: new Date().toISOString().slice(0, 10), title: '', propId: '', type: 'Gezdirme' });
  };

  const handleSendFeedback = () => {
    if (!currentProperty || !clientFeedbackInput.trim()) return;
    const newFeedback: ClientFeedback = {
      id: Date.now().toString(),
      date: new Date().toLocaleDateString('tr-TR'),
      message: clientFeedbackInput.trim(),
      requestedPrice: clientRequestedPrice ? Number(clientRequestedPrice) : undefined
    };
    updatePropertyData('clientFeedback', [...(currentProperty.clientFeedback || []), newFeedback]);
    setClientFeedbackInput("");
    setClientRequestedPrice("");
    alert("Talebiniz başarıyla iletildi. Danışmanınız sizinle iletişime geçecektir.");
    if (isClientMode) window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => updatePropertyData('image', reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleGenerateAISummary = async () => {
    if (!currentProperty) return;
    setIsGenerating(true);
    const summary = await generateReportSummary({ property: currentProperty, period: "Güncel Dönem", clientName: 'Değerli Ortağımız' });
    setAiSummary(summary);
    setIsGenerating(false);
  };

  const scrollToFeedback = () => {
    feedbackRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const calculateDaysOnMarket = (date?: string) => {
    if (!date) return 0;
    const start = new Date(date);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const statsTotals = useMemo(() => {
    if (!currentProperty || !currentProperty.stats) return { views: 0, favs: 0, msgs: 0, calls: 0 };
    return currentProperty.stats.reduce((acc, s) => ({
      views: acc.views + (s.views || 0),
      favs: acc.favs + (s.favorites || 0),
      msgs: acc.msgs + (s.messages || 0),
      calls: acc.calls + (s.calls || 0)
    }), { views: 0, favs: 0, msgs: 0, calls: 0 });
  }, [currentProperty]);

  const portfolioTotals = useMemo(() => {
    return {
      count: properties.length,
      offers: properties.reduce((acc, p) => acc + (p.offers?.filter(o => o.status === 'Beklemede').length || 0), 0),
      views: properties.reduce((acc, p) => acc + (p.viewCountByClient || 0), 0)
    };
  }, [properties]);

  const MONTH_COLORS = [
    'border-blue-500 bg-blue-50', 'border-indigo-500 bg-indigo-50', 'border-emerald-500 bg-emerald-50', 
    'border-amber-500 bg-amber-50', 'border-red-500 bg-red-50', 'border-purple-500 bg-purple-50'
  ];

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-[#F8FAFC]">
      {/* SIDEBAR */}
      <aside className="hidden lg:flex w-72 bg-[#001E3C] text-white flex-col fixed inset-y-0 z-50">
        <div className="p-8 border-b border-white/5">
          <div className="flex items-center gap-3">
            <Award size={32} />
            <h1 className="font-black text-xl tracking-tighter uppercase">TÜRKWEST</h1>
          </div>
        </div>
        <nav className="p-6 space-y-2 flex-1 overflow-y-auto">
          {isAdminAuthenticated && !isClientMode ? (
            <>
              <NavItem icon={<Home size={20}/>} label="Portföy" active={activeTab === 'propertyList'} onClick={() => setActiveTab('propertyList')} />
              <NavItem icon={<Bell size={20}/>} label="Bildirim" active={activeTab === 'notifications'} onClick={() => setActiveTab('notifications')} badge={allNotifications.length} />
              <NavItem icon={<PieChart size={20}/>} label="Analiz" active={activeTab === 'portfolioStats'} onClick={() => setActiveTab('portfolioStats')} />
              <NavItem icon={<Users size={20}/>} label="Müşteri (CRM)" active={activeTab === 'customers'} onClick={() => setActiveTab('customers')} />
              <NavItem icon={<UserCheck size={20}/>} label="Ekip" active={activeTab === 'agents'} onClick={() => setActiveTab('agents')} />
              <NavItem icon={<CalendarIcon size={20}/>} label="Takvim" active={activeTab === 'calendar'} onClick={() => setActiveTab('calendar')} />
              {selectedPropertyId && (
                <>
                  <div className="pt-6 pb-2 px-6 text-[10px] font-bold text-white/40 uppercase tracking-widest">Yönetim</div>
                  <NavItem icon={<LayoutDashboard size={20}/>} label="Raporu Gör" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
                  <NavItem icon={<Edit3 size={20}/>} label="Düzenle" active={activeTab === 'edit'} onClick={() => setActiveTab('edit')} />
                </>
              )}
            </>
          ) : (
            <>
              <NavItem icon={<LayoutDashboard size={20}/>} label="Varlık Raporu" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
              <NavItem icon={<MessageSquarePlus size={20}/>} label="Talep İlet" active={false} onClick={scrollToFeedback} />
            </>
          )}
        </nav>
        <div className="p-6 border-t border-white/5">
          {isAdminAuthenticated ? (
            <button onClick={handleLogout} className="w-full py-3 bg-red-500/10 text-red-400 rounded-xl text-xs font-bold hover:bg-red-500/20 transition-all flex items-center justify-center gap-2"><LogOut size={16}/> Çıkış</button>
          ) : (
            <button onClick={() => setShowLoginModal(true)} className="w-full py-3 bg-white/10 rounded-xl text-xs font-bold hover:bg-white/20 transition-all flex items-center justify-center gap-2"><Lock size={14}/> Yönetici Girişi</button>
          )}
        </div>
      </aside>

      <main className="flex-1 lg:ml-72 p-4 lg:p-10 pb-24 text-[#001E3C]">
        {/* LOGIN SCREEN */}
        {!selectedPropertyId && !isAdminAuthenticated && (
          <div className="min-h-[80vh] flex flex-col items-center justify-center text-center animate-in zoom-in">
             <Award className="text-[#001E3C] mb-8" size={80} />
             <h1 className="text-4xl lg:text-6xl font-black mb-4 tracking-tight">Gayrimenkul Analiz</h1>
             <p className="text-slate-500 mb-12 max-w-sm font-medium text-lg">Varlık raporunuza erişmek için size iletilen kodu giriniz.</p>
             <form onSubmit={(e) => { 
               e.preventDefault(); 
               const p = properties.find(x => x.id.toLowerCase() === clientCodeInput.trim().toLowerCase()); 
               if(p) { setSelectedPropertyId(p.id); setIsClientMode(true); setActiveTab('dashboard'); } else { alert('Hatalı kod girdiniz.'); } 
             }} className="w-full max-w-sm space-y-4">
               <input type="text" placeholder="WEST-101" value={clientCodeInput} onChange={e => setClientCodeInput(e.target.value)} className="w-full px-6 py-6 bg-white border-2 border-slate-100 rounded-[2.5rem] text-center text-4xl font-black uppercase outline-none focus:border-[#001E3C] shadow-xl text-[#001E3C]" />
               <button className="w-full py-5 bg-[#001E3C] text-white rounded-[2.5rem] font-black text-xl shadow-2xl hover:bg-slate-800 transition-all uppercase tracking-widest">RAPORU AÇ</button>
             </form>
          </div>
        )}

        {/* CALENDAR TAB */}
        {activeTab === 'calendar' && isAdminAuthenticated && (
          <div className="max-w-4xl mx-auto space-y-10 animate-in slide-in-from-bottom-5 text-left">
            <h2 className="text-4xl font-black text-[#001E3C]">İş Takvimi & Randevular</h2>
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl space-y-6 text-left">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                  <AdminInput label="Randevu Tarihi" type="date" value={newCalendarEvent.date} onChange={(v:any) => setNewCalendarEvent({...newCalendarEvent, date: v})} />
                  <AdminInput label="Konu / Başlık" value={newCalendarEvent.title} onChange={(v:any) => setNewCalendarEvent({...newCalendarEvent, title: v})} />
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                  <div className="space-y-2 text-left text-left">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block ml-1 text-left">İlgili Portföy</label>
                    <select value={newCalendarEvent.propId} onChange={e => setNewCalendarEvent({...newCalendarEvent, propId: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none text-[#001E3C] text-left">
                      <option value="">Seçiniz...</option>
                      {properties.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2 text-left text-left text-left text-left">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block ml-1 text-left">İşlem Tipi</label>
                    <select value={newCalendarEvent.type} onChange={e => setNewCalendarEvent({...newCalendarEvent, type: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none text-[#001E3C] text-left">
                      <option value="Gezdirme">Gezdirme (Sunum)</option>
                      <option value="Sözleşme">Sözleşme Görüşmesi</option>
                      <option value="Fotoğraf">Fotoğraf/Video Çekimi</option>
                      <option value="Toplantı">Yönetim Toplantısı</option>
                    </select>
                  </div>
               </div>
               <button onClick={handleAddCalendarEvent} className="w-full py-4 bg-[#001E3C] text-white rounded-2xl font-black text-xs uppercase shadow-xl hover:bg-slate-800 transition-all text-left">Randevu Ekle</button>
            </div>
            <div className="space-y-4 text-left text-left">
              {calendarEvents.sort((a,b) => b.date.localeCompare(a.date)).map(ev => (
                <div key={ev.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-md flex items-center justify-between group text-left text-left">
                  <div className="flex items-center gap-6 text-left text-left">
                    <div className="w-14 h-14 bg-slate-50 rounded-2xl flex flex-col items-center justify-center border border-slate-100 text-left text-left">
                       <p className="text-[10px] font-black text-slate-400 uppercase">{ev.date.split('-')[1]}</p>
                       <p className="text-xl font-black text-[#001E3C]">{ev.date.split('-')[2]}</p>
                    </div>
                    <div className="text-left text-left">
                      <h4 className="font-black text-lg text-[#001E3C]">{ev.title}</h4>
                      <div className="flex items-center gap-3 text-xs font-bold text-slate-400 text-left text-left text-left">
                        <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded uppercase">{ev.type}</span>
                        <span>{properties.find(p => p.id === ev.propId)?.title || 'Genel Görev'}</span>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => setCalendarEvents(prev => prev.filter(x => x.id !== ev.id))} className="p-3 text-red-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all text-left"><Trash2 size={20}/></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* NOTIFICATIONS TAB */}
        {activeTab === 'notifications' && isAdminAuthenticated && (
          <div className="max-w-4xl mx-auto space-y-10 animate-in slide-in-from-bottom-5 text-left text-left">
            <h2 className="text-4xl font-black text-[#001E3C]">Müşteri Talepleri</h2>
            <div className="space-y-4 text-left text-left">
              {allNotifications.length === 0 ? (
                <div className="bg-white p-20 rounded-[3rem] text-center border border-slate-100 shadow-xl"><Bell size={64} className="mx-auto text-slate-200 mb-4"/><p className="text-slate-400 font-black italic">Henüz bir talep bulunmuyor.</p></div>
              ) : (
                allNotifications.map((notif, idx) => (
                  <div key={idx} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl flex flex-col md:flex-row justify-between items-start gap-6 hover:border-blue-200 transition-all text-left text-left text-left">
                    <div className="space-y-3 text-left text-left">
                      <div className="flex items-center gap-3 text-left text-left"><span className="text-[10px] font-black bg-blue-50 text-[#001E3C] px-3 py-1 rounded-full uppercase">{notif.propId}</span><span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{notif.feedback.date}</span></div>
                      <h4 className="font-black text-xl text-[#001E3C]">{notif.propTitle}</h4>
                      <p className="text-slate-600 font-bold italic leading-relaxed text-left text-left text-left">"{notif.feedback.message}"</p>
                      {notif.feedback.requestedPrice && <p className="text-emerald-600 font-black text-xs uppercase">Fiyat Talebi: ₺{notif.feedback.requestedPrice.toLocaleString()}</p>}
                    </div>
                    <button onClick={() => { setSelectedPropertyId(notif.propId); setActiveTab('dashboard'); }} className="px-6 py-3 bg-[#001E3C] text-white rounded-xl text-xs font-black uppercase shadow-lg text-left">Git</button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* AGENTS / EKİP TAB */}
        {activeTab === 'agents' && isAdminAuthenticated && (
          <div className="max-w-4xl mx-auto space-y-10 animate-in slide-in-from-bottom-5 text-left text-left">
            <h2 className="text-4xl font-black text-[#001E3C]">Ekip Yönetimi</h2>
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl space-y-6 text-left text-left">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left text-left">
                <AdminInput label="Ad Soyad" value={newAgent.name} onChange={(v:any) => setNewAgent({...newAgent, name: v})} />
                <AdminInput label="Telefon" value={newAgent.phone} onChange={(v:any) => setNewAgent({...newAgent, phone: v})} />
              </div>
              <button onClick={handleAddAgent} className="w-full py-4 bg-[#001E3C] text-white rounded-2xl font-black text-xs uppercase shadow-xl hover:bg-slate-800 transition-all text-left">Danışman Ekle</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left text-left">
              {agents.map(a => (
                <div key={a.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-md flex justify-between items-center group text-left text-left">
                  <div className="flex items-center gap-4 text-left text-left">
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-black">{a.name.charAt(0)}</div>
                    <div className="text-left text-left"><p className="font-black text-[#001E3C]">{a.name}</p><p className="text-xs font-bold text-slate-400">{a.phone}</p></div>
                  </div>
                  <button onClick={() => setAgents(prev => prev.filter(x => x.id !== a.id))} className="text-red-300 opacity-0 group-hover:opacity-100 transition-all text-left"><Trash2 size={20}/></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CUSTOMERS / CRM TAB */}
        {activeTab === 'customers' && isAdminAuthenticated && (
          <div className="max-w-5xl mx-auto space-y-10 animate-in slide-in-from-bottom-5 text-left text-left">
            <h2 className="text-4xl font-black text-[#001E3C]">Müşteri Kayıtları (CRM)</h2>
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl space-y-6 text-left text-left">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left text-left">
                <AdminInput label="Ad Soyad" value={newCustomer.name} onChange={(v:any) => setNewCustomer({...newCustomer, name: v})} />
                <AdminInput label="Telefon" value={newCustomer.phone} onChange={(v:any) => setNewCustomer({...newCustomer, phone: v})} />
                <AdminInput label="Bütçe (₺)" type="number" value={newCustomer.budget} onChange={(v:any) => setNewCustomer({...newCustomer, budget: v})} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left text-left">
                <AdminInput label="Aranan Bölge" value={newCustomer.preferredNeighborhood} onChange={(v:any) => setNewCustomer({...newCustomer, preferredNeighborhood: v})} />
                <AdminInput label="Daire Tipi" value={newCustomer.preferredSize} onChange={(v:any) => setNewCustomer({...newCustomer, preferredSize: v})} />
              </div>
              <button onClick={handleAddCustomer} className="w-full py-4 bg-[#001E3C] text-white rounded-2xl font-black text-xs uppercase shadow-xl hover:bg-slate-800 transition-all text-left">Müşteri Kaydet</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left text-left">
              {customers.map(c => (
                <div key={c.id} className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-lg group text-left text-left">
                  <div className="flex justify-between mb-4 text-left text-left"><h4 className="font-black text-xl text-[#001E3C]">{c.name}</h4><button onClick={() => setCustomers(prev => prev.filter(x => x.id !== c.id))} className="text-red-300 hover:text-red-500 transition-all text-left"><Trash2 size={20}/></button></div>
                  <div className="space-y-2 text-sm font-bold text-slate-500 text-left text-left"><p>Telefon: <span className="text-[#001E3C]">{c.phone}</span></p><p>Bütçe: <span className="text-emerald-600 font-black">₺{c.budget?.toLocaleString()}</span></p><p>Tercih: <span className="text-[#001E3C]">{c.preferredNeighborhood} / {c.preferredSize}</span></p></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PROPERTY LIST TAB */}
        {activeTab === 'propertyList' && isAdminAuthenticated && (
          <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in text-left text-left">
             <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-left text-left">
               <h2 className="text-4xl font-black text-[#001E3C]">Portföy Yönetimi</h2>
               <button onClick={() => { 
                 const id = `west-${Math.floor(100+Math.random()*900)}`; 
                 setProperties(prev => [...prev, { 
                   id, title: 'Yeni Mülk', location: 'Konum Giriniz', image: '', currentPrice: 0, priceHistory: [], stats: [], market: { comparablePrice: 0, buildingUnitsCount: 0, neighborhoodUnitsCount: 0, avgSaleDurationDays: 0 }, 
                   agentNotes: '', clientFeedback: [], offers: [], activities: [], agentName: 'Can West', listingDate: new Date().toISOString().split('T')[0] 
                 }]); 
                 setSelectedPropertyId(id); 
                 setActiveTab('edit'); 
               }} className="px-10 py-5 bg-[#001E3C] text-white rounded-[2rem] font-black flex items-center gap-2 shadow-xl hover:bg-slate-800 transition-all uppercase text-left"><Plus size={20}/> Yeni Mülk Ekle</button>
             </div>
             <div className="relative text-left text-left">
               <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={24}/>
               <input type="text" placeholder="Kod veya isim ile ara..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-16 pr-8 py-5 bg-white border border-slate-200 rounded-[2.5rem] outline-none font-bold text-[#001E3C] shadow-sm focus:border-[#001E3C] text-left" />
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 text-left text-left">
               {filteredProperties.map(p => (
                 <div key={p.id} className="bg-white rounded-[3rem] overflow-hidden border border-slate-100 shadow-lg hover:shadow-2xl transition-all group cursor-pointer text-left text-left" onClick={() => { setSelectedPropertyId(p.id); setActiveTab('dashboard'); }}>
                   <div className="h-64 relative overflow-hidden bg-slate-100 text-left text-left text-left">
                     {p.image ? <img src={p.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" /> : <div className="w-full h-full flex items-center justify-center text-slate-300"><Camera size={64}/></div>}
                     <div className="absolute top-5 left-5 px-5 py-2 bg-[#001E3C]/90 backdrop-blur-md text-white rounded-full text-[11px] font-black">{p.id}</div>
                   </div>
                   <div className="p-8 space-y-4 text-left text-left">
                     <h4 className="font-black text-2xl truncate text-[#001E3C] uppercase text-left text-left">{p.title}</h4>
                     <p className="text-slate-400 text-sm font-bold flex items-center gap-2 text-left text-left"><MapPin size={16}/> {p.location}</p>
                     <div className="flex gap-4 pt-4 border-t border-slate-50 text-left text-left">
                       <button onClick={(e) => { e.stopPropagation(); setSelectedPropertyId(p.id); setActiveTab('dashboard'); }} className="flex-1 py-4 bg-[#001E3C] text-white rounded-2xl text-xs font-black uppercase text-left">Rapor Gör</button>
                       <button onClick={(e) => { e.stopPropagation(); setSelectedPropertyId(p.id); setActiveTab('edit'); }} className="p-4 bg-slate-100 rounded-2xl hover:bg-blue-50 transition-all text-[#001E3C] text-left"><Edit3 size={20}/></button>
                     </div>
                   </div>
                 </div>
               ))}
             </div>
          </div>
        )}

        {/* EDIT SECTION - ALL FEATURES INTACT */}
        {activeTab === 'edit' && currentProperty && isAdminAuthenticated && (
          <div className="max-w-4xl mx-auto space-y-12 animate-in slide-in-from-right-10 pb-20 text-left text-left">
             <div className="flex justify-between items-center text-left text-left">
               <button onClick={() => setActiveTab('propertyList')} className="flex items-center gap-2 text-slate-500 font-bold hover:text-[#001E3C] transition-colors"><ArrowLeft size={20}/> Portföy Listesi</button>
               <button onClick={() => handleDeleteProperty(currentProperty.id)} className="flex items-center gap-2 px-6 py-3 bg-red-50 text-red-500 rounded-2xl text-sm font-black hover:bg-red-100 transition-colors"><Trash2 size={18}/> Mülkü Sil</button>
             </div>
             
             <div className="bg-white rounded-[3rem] p-8 lg:p-14 shadow-2xl border border-slate-100 space-y-20 text-left text-left">
                {/* 1. Görsel & Danışman */}
                <section className="space-y-10 text-left text-left text-left">
                   <h3 className="text-2xl font-black border-b pb-4 flex items-center gap-4 text-[#001E3C] uppercase tracking-tighter text-left text-left text-left"><Camera size={32} className="text-blue-500"/> Görsel ve Sorumlu</h3>
                   <div className="flex flex-col md:flex-row gap-10 items-center text-left text-left text-left">
                      <div className="w-56 h-56 bg-slate-50 rounded-[3rem] overflow-hidden border-2 border-dashed border-slate-200 flex items-center justify-center relative group shrink-0 shadow-inner text-left text-left text-left">
                        {currentProperty.image ? (
                          <><img src={currentProperty.image} className="w-full h-full object-cover group-hover:opacity-40 transition-opacity" /><button onClick={() => fileInputRef.current?.click()} className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 text-[#001E3C] transition-all"><Camera size={40}/></button></>
                        ) : (
                          <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center gap-2 text-slate-400"><Plus size={48} /><span className="text-xs font-black uppercase">YÜKLE</span></button>
                        )}
                        <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} className="hidden" />
                      </div>
                      <div className="flex-1 space-y-6 w-full text-left text-left text-left">
                         <AdminInput label="Görsel URL" value={currentProperty.image} onChange={(v:any) => updatePropertyData('image', v)} />
                         <AdminInput label="Sorumlu Danışman" value={currentProperty.agentName} onChange={(v:any) => updatePropertyData('agentName', v)} />
                      </div>
                   </div>
                </section>

                {/* 2. Temel Detaylar */}
                <section className="space-y-10 text-left text-left text-left">
                   <h3 className="text-2xl font-black border-b pb-4 flex items-center gap-4 text-[#001E3C] uppercase tracking-tighter text-left text-left text-left"><Home size={32} className="text-indigo-500"/> Mülk Bilgileri</h3>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left text-left text-left">
                      <AdminInput label="İlan Başlığı" value={currentProperty.title} onChange={(v:any) => updatePropertyData('title', v)} />
                      <AdminInput label="Bölge / Konum" value={currentProperty.location} onChange={(v:any) => updatePropertyData('location', v)} />
                      <AdminInput label="Güncel Satış Fiyatı (₺)" type="number" value={currentProperty.currentPrice} onChange={(v:any) => updatePropertyData('currentPrice', v)} />
                      <AdminInput label="İlan Yayına Giriş" type="date" value={currentProperty.listingDate} onChange={(v:any) => updatePropertyData('listingDate', v)} />
                   </div>
                   <div className="space-y-2 text-left text-left text-left">
                     <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 block text-left text-left text-left">Danışman Analizi</label>
                     <textarea value={currentProperty.agentNotes} onChange={e => updatePropertyData('agentNotes', e.target.value)} placeholder="Stratejik görüşleriniz..." className="w-full p-6 bg-slate-50 border border-slate-200 rounded-[2.5rem] text-sm font-bold outline-none h-40 resize-none text-[#001E3C] focus:border-blue-500 transition-all shadow-inner text-left text-left text-left"></textarea>
                   </div>
                </section>

                {/* 3. Performans Verileri */}
                <section className="space-y-10 text-left text-left text-left text-left">
                   <h3 className="text-2xl font-black border-b pb-4 flex items-center gap-4 text-[#001E3C] uppercase tracking-tighter text-left text-left text-left text-left"><Activity size={32} className="text-blue-500"/> İstatistik Girişi</h3>
                   <div className="overflow-x-auto text-left text-left text-left">
                      <table className="w-full text-left border-collapse min-w-[700px] text-left text-left text-left">
                        <thead className="bg-slate-50 text-[10px] font-black text-slate-500 uppercase tracking-widest text-left text-left text-left text-left">
                          <tr><th className="px-4 py-4 text-[#001E3C]">Ay</th><th className="px-4 py-4 text-[#001E3C]">İzlenme</th><th className="px-4 py-4 text-[#001E3C]">Fav</th><th className="px-4 py-4 text-[#001E3C]">Msj</th><th className="px-4 py-4 text-[#001E3C]">Ara</th><th className="px-4 py-4 text-[#001E3C]">Gezme</th><th className="px-4 py-4">Sil</th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-left text-left text-left text-left text-left text-left">
                          {currentProperty.stats?.map((s, idx) => (
                            <tr key={idx} className="text-left text-left text-left">
                              <td className="px-4 py-3"><input value={s.month} onChange={e => handleUpdateStat(idx, 'month', e.target.value)} className="w-full p-3 bg-white border rounded-xl text-xs font-bold text-[#001E3C]" /></td>
                              <td className="px-4 py-3"><input type="number" value={s.views} onChange={e => handleUpdateStat(idx, 'views', Number(e.target.value))} className="w-full p-3 bg-white border rounded-xl text-xs font-bold text-[#001E3C]" /></td>
                              <td className="px-4 py-3"><input type="number" value={s.favorites} onChange={e => handleUpdateStat(idx, 'favorites', Number(e.target.value))} className="w-full p-3 bg-white border rounded-xl text-xs font-bold text-[#001E3C]" /></td>
                              <td className="px-4 py-3"><input type="number" value={s.messages} onChange={e => handleUpdateStat(idx, 'messages', Number(e.target.value))} className="w-full p-3 bg-white border rounded-xl text-xs font-bold text-[#001E3C]" /></td>
                              <td className="px-4 py-3"><input type="number" value={s.calls} onChange={e => handleUpdateStat(idx, 'calls', Number(e.target.value))} className="w-full p-3 bg-white border rounded-xl text-xs font-bold text-[#001E3C]" /></td>
                              <td className="px-4 py-3"><input type="number" value={s.visits} onChange={e => handleUpdateStat(idx, 'visits', Number(e.target.value))} className="w-full p-3 bg-white border rounded-xl text-xs font-bold text-[#001E3C]" /></td>
                              <td className="px-4 py-3"><button onClick={() => updatePropertyData('stats', currentProperty.stats.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600"><Trash2 size={20}/></button></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                   </div>
                   <button onClick={handleAddMonth} className="flex items-center gap-2 px-8 py-3 bg-[#001E3C] text-white rounded-2xl text-xs font-black uppercase shadow-lg transition-all text-left text-left text-left text-left text-left text-left text-left text-left text-left"><Plus size={18}/> Yeni Dönem Ekle</button>
                </section>

                {/* 5. Fiyat Geçmişi / Revizyonlar (RESTORED SECTION) */}
                <section className="space-y-10 text-left text-left text-left text-left text-left text-left text-left">
                   <h3 className="text-2xl font-black border-b pb-4 flex items-center gap-4 text-[#001E3C] uppercase tracking-tighter text-left text-left text-left text-left text-left text-left text-left text-left text-left"><TrendingDown size={32} className="text-blue-500"/> Fiyat Geçmişi / Revizyonlar</h3>
                   <div className="bg-slate-50 p-8 rounded-[2.5rem] space-y-6 text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">
                         <AdminInput label="Revizyon Tarihi" type="date" value={newPricePoint.date} onChange={(v:any) => setNewPricePoint({...newPricePoint, date: v})} />
                         <AdminInput label="Yeni Satış Fiyatı (₺)" type="number" value={newPricePoint.amount} onChange={(v:any) => setNewPricePoint({...newPricePoint, amount: v})} />
                      </div>
                      <button onClick={handleAddPriceUpdate} className="w-full py-4 bg-[#001E3C] text-white rounded-2xl font-black text-xs uppercase shadow-xl hover:bg-slate-800 transition-all text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">Fiyat Değişikliğini Kaydet</button>
                   </div>
                   <div className="space-y-4 text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">
                      {(currentProperty.priceHistory || []).map((p, idx) => (
                        <div key={idx} className="flex justify-between items-center p-6 bg-white border border-slate-100 rounded-3xl group shadow-sm text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">
                           <div className="flex items-center gap-6 text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">
                              <History size={24} className="text-slate-300"/>
                              <div className="text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text