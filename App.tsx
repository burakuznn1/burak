import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  LayoutDashboard, LogOut, Sparkles, MapPin, MessageSquare, Eye, Heart, 
  Edit3, Send, Lock, Plus, Trash2, Search, 
  Home, Award, MessageCircle, Users,
  Loader2, Wallet, Activity, ArrowLeft, History,
  Bell, Calendar as CalendarIcon, BarChart3, Phone, UserCheck,
  Camera, TrendingDown, Tag, Building, Map as MapIcon, ClipboardCheck, Clock,
  PieChart, Filter, ChevronRight, X
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { Property, PropertyStats, Offer, Agent, Customer, ClientFeedback, PropertyActivity } from './types.ts';
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
          if (localData.agents) setAgents(localData.agents);
          if (localData.customers) setCustomers(localData.customers);
          if (localData.calendarEvents) setCalendarEvents(localData.calendarEvents);
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
    alert("Talebiniz başarıyla iletildi.");
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
            <NavItem icon={<LayoutDashboard size={20}/>} label="Varlık Raporu" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
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
            <div className="bg-white p-8 rounded-[2.5rem] border shadow-xl space-y-6">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                  <AdminInput label="Tarih" type="date" value={newCalendarEvent.date} onChange={(v:any) => setNewCalendarEvent({...newCalendarEvent, date: v})} />
                  <AdminInput label="Başlık" value={newCalendarEvent.title} onChange={(v:any) => setNewCalendarEvent({...newCalendarEvent, title: v})} />
               </div>
               <button onClick={handleAddCalendarEvent} className="w-full py-4 bg-[#001E3C] text-white rounded-2xl font-black text-xs uppercase shadow-xl hover:bg-slate-800 transition-all">Randevu Ekle</button>
            </div>
            <div className="space-y-4">
              {calendarEvents.length === 0 ? (
                <div className="bg-white p-20 rounded-[3rem] text-center border text-slate-300 font-bold italic">Kayıtlı randevu bulunmuyor.</div>
              ) : (
                calendarEvents.map(ev => (
                  <div key={ev.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-md flex items-center justify-between">
                    <div className="flex items-center gap-6">
                      <div className="w-14 h-14 bg-slate-50 rounded-2xl flex flex-col items-center justify-center font-black text-[#001E3C]">
                        <p className="text-[10px] opacity-50 uppercase">{ev.date.split('-')[1]}</p>
                        <p className="text-xl">{ev.date.split('-')[2]}</p>
                      </div>
                      <div><h4 className="font-black text-lg text-[#001E3C]">{ev.title}</h4></div>
                    </div>
                    <button onClick={() => setCalendarEvents(prev => prev.filter(x => x.id !== ev.id))} className="text-red-300 hover:text-red-500 transition-all"><Trash2/></button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* CUSTOMERS / CRM TAB */}
        {activeTab === 'customers' && isAdminAuthenticated && (
          <div className="max-w-5xl mx-auto space-y-10 animate-in slide-in-from-bottom-5 text-left">
            <h2 className="text-4xl font-black text-[#001E3C]">Müşteri Kayıtları (CRM)</h2>
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl space-y-6 text-left">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
                <AdminInput label="Ad Soyad" value={newCustomer.name} onChange={(v:any) => setNewCustomer({...newCustomer, name: v})} />
                <AdminInput label="Telefon" value={newCustomer.phone} onChange={(v:any) => setNewCustomer({...newCustomer, phone: v})} />
                <AdminInput label="Bütçe (₺)" type="number" value={newCustomer.budget} onChange={(v:any) => setNewCustomer({...newCustomer, budget: v})} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                <AdminInput label="Aranan Bölge" value={newCustomer.preferredNeighborhood} onChange={(v:any) => setNewCustomer({...newCustomer, preferredNeighborhood: v})} />
                <AdminInput label="Daire Tipi" value={newCustomer.preferredSize} onChange={(v:any) => setNewCustomer({...newCustomer, preferredSize: v})} />
              </div>
              <div className="space-y-2 text-left">
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider ml-1">Müşteri Notları</label>
                <textarea value={newCustomer.notes} onChange={e => setNewCustomer({...newCustomer, notes: e.target.value})} className="w-full p-6 bg-slate-50 border border-slate-200 rounded-3xl h-32 outline-none font-bold text-[#001E3C]" placeholder="Müşteri talepleri, görüşme özetleri vb..."></textarea>
              </div>
              <button onClick={handleAddCustomer} className="w-full py-4 bg-[#001E3C] text-white rounded-2xl font-black text-xs uppercase shadow-xl hover:bg-slate-800 transition-all">Müşteri Kaydet</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
              {customers.map(c => (
                <div key={c.id} className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-lg group text-left">
                  <div className="flex justify-between mb-4 text-left"><h4 className="font-black text-xl text-[#001E3C]">{c.name}</h4><button onClick={() => setCustomers(prev => prev.filter(x => x.id !== c.id))} className="text-red-300 hover:text-red-500 transition-all"><Trash2 size={20}/></button></div>
                  <div className="space-y-2 text-sm font-bold text-slate-500 text-left">
                    <p>Telefon: <span className="text-[#001E3C]">{c.phone}</span></p>
                    <p>Bütçe: <span className="text-emerald-600 font-black">₺{c.budget?.toLocaleString()}</span></p>
                    <p>Tercih: <span className="text-[#001E3C]">{c.preferredNeighborhood} / {c.preferredSize}</span></p>
                    {c.notes && <div className="mt-4 pt-4 border-t border-slate-50 text-slate-400 italic"><p className="text-[10px] font-black uppercase text-slate-300 mb-1">Notlar</p>"{c.notes}"</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AGENTS TAB */}
        {activeTab === 'agents' && isAdminAuthenticated && (
          <div className="max-w-4xl mx-auto space-y-10 animate-in slide-in-from-bottom-5 text-left">
            <h2 className="text-4xl font-black text-[#001E3C]">Ekip Yönetimi</h2>
            <div className="bg-white p-8 rounded-[2.5rem] border shadow-xl space-y-6 text-left">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                <AdminInput label="Ad Soyad" value={newAgent.name} onChange={(v:any) => setNewAgent({...newAgent, name: v})} />
                <AdminInput label="Telefon" value={newAgent.phone} onChange={(v:any) => setNewAgent({...newAgent, phone: v})} />
              </div>
              <button onClick={handleAddAgent} className="w-full py-4 bg-[#001E3C] text-white rounded-2xl font-black text-xs uppercase shadow-xl hover:bg-slate-800 transition-all">Sorumlu Ekle</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {agents.map(a => (
                <div key={a.id} className="bg-white p-8 rounded-[2rem] border shadow-lg flex justify-between items-center text-left">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center text-[#001E3C]"><UserCheck size={32}/></div>
                    <div><h4 className="font-black text-xl text-[#001E3C] uppercase">{a.name}</h4><p className="text-slate-400 font-bold">{a.phone}</p></div>
                  </div>
                  <button onClick={() => setAgents(prev => prev.filter(x => x.id !== a.id))} className="text-red-300 hover:text-red-500 transition-all"><Trash2 size={24}/></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PORTFOLIO STATS TAB (Analiz) */}
        {activeTab === 'portfolioStats' && isAdminAuthenticated && (
          <div className="max-w-6xl mx-auto space-y-10 animate-in slide-in-from-bottom-5 text-left">
            <h2 className="text-4xl font-black text-[#001E3C]">Analiz Merkezi</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
               <DashboardStat label="Toplam Portföy" value={portfolioTotals.count} icon={<Home size={32}/>} color="blue" />
               <DashboardStat label="Bekleyen Teklif" value={portfolioTotals.offers} icon={<Wallet size={32}/>} color="emerald" />
               <DashboardStat label="Rapor Görüntüleme" value={portfolioTotals.views} icon={<Eye size={32}/>} color="indigo" />
            </div>
            <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-xl text-left">
              <h3 className="text-2xl font-black text-[#001E3C] mb-8 uppercase tracking-tighter">İşlem Hacmi & Performans</h3>
              <p className="text-slate-400 font-bold italic">Portföyünüzdeki mülklerin toplam performansı ve pazar payı analizleri burada detaylandırılır.</p>
              <div className="mt-10 h-64 bg-slate-50 rounded-[2rem] flex items-center justify-center border-2 border-dashed border-slate-200"><PieChart size={64} className="text-slate-200" /></div>
            </div>
          </div>
        )}

        {/* NOTIFICATIONS TAB */}
        {activeTab === 'notifications' && isAdminAuthenticated && (
          <div className="max-w-4xl mx-auto space-y-10 animate-in slide-in-from-bottom-5 text-left">
            <h2 className="text-4xl font-black text-[#001E3C]">Bildirimler / Müşteri Talepleri</h2>
            <div className="space-y-4">
              {allNotifications.length === 0 ? (
                <div className="bg-white p-20 rounded-[3rem] text-center border text-slate-300 font-bold italic">Henüz bir talep bulunmuyor.</div>
              ) : (
                allNotifications.map((notif, idx) => (
                  <div key={idx} className="bg-white p-8 rounded-[2.5rem] border shadow-xl flex flex-col md:flex-row justify-between items-start gap-6">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3"><span className="text-[10px] font-black bg-blue-50 text-[#001E3C] px-3 py-1 rounded-full uppercase">{notif.propId}</span><span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{notif.feedback.date}</span></div>
                      <h4 className="font-black text-xl text-[#001E3C]">{notif.propTitle}</h4>
                      <p className="text-slate-600 font-bold italic leading-relaxed text-left">"{notif.feedback.message}"</p>
                      {notif.feedback.requestedPrice && <p className="text-emerald-600 font-black text-xs uppercase">Fiyat Talebi: ₺{notif.feedback.requestedPrice.toLocaleString()}</p>}
                    </div>
                    <button onClick={() => { setSelectedPropertyId(notif.propId); setActiveTab('dashboard'); }} className="px-6 py-3 bg-[#001E3C] text-white rounded-xl text-xs font-black uppercase shadow-lg">Git</button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* PROPERTY LIST TAB */}
        {activeTab === 'propertyList' && isAdminAuthenticated && (
          <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in text-left">
             <div className="flex justify-between items-center text-left">
               <h2 className="text-4xl font-black text-[#001E3C]">Portföy Yönetimi</h2>
               <button onClick={() => { 
                 const id = `west-${Math.floor(100+Math.random()*900)}`; 
                 setProperties(prev => [...prev, { 
                   id, title: 'Yeni Mülk', location: 'Konum Giriniz', image: '', currentPrice: 0, priceHistory: [], stats: [], market: { comparablePrice: 0, buildingUnitsCount: 0, neighborhoodUnitsCount: 0, avgSaleDurationDays: 0 }, 
                   agentNotes: '', clientFeedback: [], offers: [], activities: [], agentName: 'Can West', listingDate: new Date().toISOString().split('T')[0] 
                 }]); 
                 setSelectedPropertyId(id); 
                 setActiveTab('edit'); 
               }} className="px-10 py-5 bg-[#001E3C] text-white rounded-[2rem] font-black flex items-center gap-2 shadow-xl hover:bg-slate-800 transition-all uppercase"><Plus size={20}/> Yeni Mülk Ekle</button>
             </div>
             <div className="relative text-left">
               <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={24}/>
               <input type="text" placeholder="Kod veya isim ile ara..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-16 pr-8 py-5 bg-white border border-slate-200 rounded-[2.5rem] outline-none font-bold text-[#001E3C] shadow-sm focus:border-[#001E3C]" />
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 text-left">
               {filteredProperties.map(p => (
                 <div key={p.id} className="bg-white rounded-[3rem] overflow-hidden border border-slate-100 shadow-lg hover:shadow-2xl transition-all group cursor-pointer text-left" onClick={() => { setSelectedPropertyId(p.id); setActiveTab('dashboard'); }}>
                   <div className="h-64 relative overflow-hidden bg-slate-100 text-left">
                     {p.image ? <img src={p.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" /> : <div className="w-full h-full flex items-center justify-center text-slate-300"><Camera size={64}/></div>}
                     <div className="absolute top-5 left-5 px-5 py-2 bg-[#001E3C]/90 backdrop-blur-md text-white rounded-full text-[11px] font-black">{p.id}</div>
                   </div>
                   <div className="p-8 space-y-4 text-left">
                     <h4 className="font-black text-2xl truncate text-[#001E3C] uppercase text-left">{p.title}</h4>
                     <p className="text-slate-400 text-sm font-bold flex items-center gap-2 text-left"><MapPin size={16}/> {p.location}</p>
                     <div className="flex gap-4 pt-4 border-t border-slate-50 text-left">
                       <button onClick={(e) => { e.stopPropagation(); setSelectedPropertyId(p.id); setActiveTab('dashboard'); }} className="flex-1 py-4 bg-[#001E3C] text-white rounded-2xl text-xs font-black uppercase shadow-md">Rapor Gör</button>
                       <button onClick={(e) => { e.stopPropagation(); setSelectedPropertyId(p.id); setActiveTab('edit'); }} className="p-4 bg-slate-100 rounded-2xl hover:bg-blue-50 transition-all text-[#001E3C]"><Edit3 size={20}/></button>
                     </div>
                   </div>
                 </div>
               ))}
             </div>
          </div>
        )}

        {/* EDIT SECTION - ALL FEATURES FIXED */}
        {activeTab === 'edit' && currentProperty && isAdminAuthenticated && (
          <div className="max-w-4xl mx-auto space-y-12 animate-in slide-in-from-right-10 pb-20 text-left">
             <div className="flex justify-between items-center text-left">
               <button onClick={() => setActiveTab('propertyList')} className="flex items-center gap-2 text-slate-500 font-bold hover:text-[#001E3C] transition-colors"><ArrowLeft size={20}/> Portföy Listesi</button>
               <button onClick={() => handleDeleteProperty(currentProperty.id)} className="flex items-center gap-2 px-6 py-3 bg-red-50 text-red-500 rounded-2xl text-sm font-black hover:bg-red-100 transition-colors"><Trash2 size={18}/> Mülkü Sil</button>
             </div>
             
             <div className="bg-white rounded-[3rem] p-8 lg:p-14 shadow-2xl border border-slate-100 space-y-20 text-left">
                {/* 1. Görsel & Temel Bilgiler */}
                <section className="space-y-10 text-left">
                   <h3 className="text-2xl font-black border-b pb-4 flex items-center gap-4 text-[#001E3C] uppercase tracking-tighter text-left"><Camera size={32} className="text-blue-500"/> Görsel ve Detaylar</h3>
                   <div className="flex flex-col md:flex-row gap-10 items-center text-left">
                      <div className="w-56 h-56 bg-slate-50 rounded-[3rem] overflow-hidden border-2 border-dashed border-slate-200 flex items-center justify-center relative group shrink-0 shadow-inner">
                        {currentProperty.image ? (
                          <><img src={currentProperty.image} className="w-full h-full object-cover group-hover:opacity-40 transition-opacity" /><button onClick={() => fileInputRef.current?.click()} className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 text-[#001E3C] transition-all"><Camera size={40}/></button></>
                        ) : (
                          <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center gap-2 text-slate-400"><Plus size={48} /><span className="text-xs font-black uppercase">YÜKLE</span></button>
                        )}
                        <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} className="hidden" />
                      </div>
                      <div className="flex-1 space-y-6 w-full text-left">
                         <AdminInput label="İlan Başlığı" value={currentProperty.title} onChange={(v:any) => updatePropertyData('title', v)} />
                         <AdminInput label="Konum" value={currentProperty.location} onChange={(v:any) => updatePropertyData('location', v)} />
                      </div>
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
                      <AdminInput label="Güncel Satış Fiyatı (₺)" type="number" value={currentProperty.currentPrice} onChange={(v:any) => updatePropertyData('currentPrice', v)} />
                      <AdminInput label="Sorumlu Danışman" value={currentProperty.agentName} onChange={(v:any) => updatePropertyData('agentName', v)} />
                   </div>
                   <div className="space-y-2 text-left">
                     <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 block text-left">Danışman Analizi</label>
                     <textarea value={currentProperty.agentNotes} onChange={e => updatePropertyData('agentNotes', e.target.value)} placeholder="Müşteriye özel mesajınız..." className="w-full p-6 bg-slate-50 border border-slate-200 rounded-[2.5rem] text-sm font-bold outline-none h-40 resize-none text-[#001E3C] focus:border-blue-500 transition-all shadow-inner text-left"></textarea>
                   </div>
                </section>

                {/* 2. İstatistik Yönetimi */}
                <section className="space-y-10 text-left">
                   <h3 className="text-2xl font-black border-b pb-4 flex items-center gap-4 text-[#001E3C] uppercase tracking-tighter text-left"><Activity size={32} className="text-blue-500"/> İstatistik Girişi</h3>
                   <div className="overflow-x-auto text-left">
                      <table className="w-full text-left border-collapse min-w-[700px]">
                        <thead className="bg-slate-50 text-[10px] font-black text-slate-500 uppercase tracking-widest text-left">
                          <tr><th className="px-4 py-4 text-[#001E3C]">Ay</th><th className="px-4 py-4 text-[#001E3C]">İzlenme</th><th className="px-4 py-4 text-[#001E3C]">Fav</th><th className="px-4 py-4 text-[#001E3C]">Msj</th><th className="px-4 py-4 text-[#001E3C]">Ara</th><th className="px-4 py-4 text-[#001E3C]">Gezme</th><th className="px-4 py-4">Sil</th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-left">
                          {currentProperty.stats?.map((s, idx) => (
                            <tr key={idx} className="text-left">
                              <td className="px-4 py-3"><input value={s.month} onChange={e => handleUpdateStat(idx, 'month', e.target.value)} className="w-full p-3 bg-white border rounded-xl text-xs font-bold text-[#001E3C]" /></td>
                              <td className="px-4 py-3"><input type="number" value={s.views} onChange={e => handleUpdateStat(idx, 'views', Number(e.target.value))} className="w-full p-3 bg-white border rounded-xl text-xs font-bold text-[#001E3C]" /></td>
                              <td className="px-4 py-3"><input type="number" value={s.favorites} onChange={e => handleUpdateStat(idx, 'favorites', Number(e.target.value))} className="w-full p-3 bg-white border rounded-xl text-xs font-bold text-[#001E3C]" /></td>
                              <td className="px-4 py-3"><input type="number" value={s.messages} onChange={e => handleUpdateStat(idx, 'messages', Number(e.target.value))} className="w-full p-3 bg-white border rounded-xl text-xs font-bold text-[#001E3C]" /></td>
                              <td className="px-4 py-3"><input type="number" value={s.calls} onChange={e => handleUpdateStat(idx, 'calls', Number(e.target.value))} className="w-full p-3 bg-white border rounded-xl text-xs font-bold text-[#001E3C]" /></td>
                              <td className="px-4 py-3"><input type="number" value={s.visits} onChange={e => handleUpdateStat(idx, 'visits', Number(e.target.value))} className="w-full p-3 bg-white border rounded-xl text-xs font-bold text-[#001E3C]" /></td>
                              <td className="px-4 py-3"><button onClick={() => updatePropertyData('stats', currentProperty.stats.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600 transition-all"><Trash2 size={20}/></button></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                   </div>
                   <button onClick={handleAddMonth} className="flex items-center gap-2 px-8 py-3 bg-[#001E3C] text-white rounded-2xl text-xs font-black uppercase shadow-lg transition-all text-left"><Plus size={18}/> Yeni Dönem Ekle</button>
                </section>

                {/* 3. Piyasa Konumlandırma Analizi */}
                <section className="space-y-10 text-left">
                   <h3 className="text-2xl font-black border-b pb-4 flex items-center gap-4 text-[#001E3C] uppercase tracking-tighter text-left"><BarChart3 size={32} className="text-emerald-500"/> Piyasa Konumlandırma</h3>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
                      <AdminInput label="Binadaki Rakip İlan Sayısı" type="number" value={currentProperty.market?.buildingUnitsCount} onChange={(v:any) => updatePropertyData('market', {...currentProperty.market, buildingUnitsCount: v})} />
                      <AdminInput label="Mahalledeki Rakip İlan Sayısı" type="number" value={currentProperty.market?.neighborhoodUnitsCount} onChange={(v:any) => updatePropertyData('market', {...currentProperty.market, neighborhoodUnitsCount: v})} />
                      <AdminInput label="Emsal Ortalama Fiyat (₺)" type="number" value={currentProperty.market?.comparablePrice} onChange={(v:any) => updatePropertyData('market', {...currentProperty.market, comparablePrice: v})} />
                      <AdminInput label="Tahmini Satış Süresi (Gün)" type="number" value={currentProperty.market?.avgSaleDurationDays} onChange={(v:any) => updatePropertyData('market', {...currentProperty.market, avgSaleDurationDays: v})} />
                   </div>
                </section>

                {/* 4. Fiyat Geçmişi / Revizyonlar */}
                <section className="space-y-10 text-left">
                   <h3 className="text-2xl font-black border-b pb-4 flex items-center gap-4 text-[#001E3C] uppercase tracking-tighter text-left"><TrendingDown size={32} className="text-blue-500"/> Fiyat Geçmişi / Revizyonlar</h3>
                   <div className="bg-slate-50 p-8 rounded-[2.5rem] space-y-6 text-left">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                         <AdminInput label="Revizyon Tarihi" type="date" value={newPricePoint.date} onChange={(v:any) => setNewPricePoint({...newPricePoint, date: v})} />
                         <AdminInput label="Yeni Satış Fiyatı (₺)" type="number" value={newPricePoint.amount} onChange={(v:any) => setNewPricePoint({...newPricePoint, amount: v})} />
                      </div>
                      <button onClick={handleAddPriceUpdate} className="w-full py-4 bg-[#001E3C] text-white rounded-2xl font-black text-xs uppercase shadow-xl hover:bg-slate-800 transition-all text-left">Fiyat Değişikliğini Kaydet</button>
                   </div>
                   <div className="space-y-4 text-left">
                      {(currentProperty.priceHistory || []).map((p, idx) => (
                        <div key={idx} className="flex justify-between items-center p-6 bg-white border border-slate-100 rounded-3xl group shadow-sm text-left">
                           <div className="flex items-center gap-6 text-left">
                              <History size={24} className="text-slate-300"/>
                              <div className="text-left"><p className="font-black text-xl text-[#001E3C]">₺{p.amount.toLocaleString()}</p><p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{p.date}</p></div>
                           </div>
                           <button onClick={() => handleDeletePricePoint(idx)} className="p-3 text-red-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all text-left"><Trash2 size={24}/></button>
                        </div>
                      ))}
                   </div>
                </section>

                {/* 5. Teklif ve İşlem Yönetimi */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 text-left">
                   <section className="space-y-10 text-left">
                      <h3 className="text-xl font-black border-b pb-4 flex items-center gap-4 text-[#001E3C] uppercase tracking-tighter text-left"><ClipboardCheck size={24} className="text-blue-500"/> Yapılan İşlemler</h3>
                      <div className="bg-slate-50 p-6 rounded-3xl space-y-4 text-left">
                         <AdminInput label="Başlık" value={newActivity.title} onChange={(v:any) => setNewActivity({...newActivity, title: v})} />
                         <AdminInput label="Açıklama" value={newActivity.description} onChange={(v:any) => setNewActivity({...newActivity, description: v})} />
                         <button onClick={handleAddActivity} className="w-full py-3 bg-[#001E3C] text-white rounded-xl font-black text-xs uppercase shadow-md transition-all text-left">Günlüğe Ekle</button>
                      </div>
                      <div className="space-y-2 text-left">
                         {currentProperty.activities?.map(act => (
                           <div key={act.id} className="p-4 bg-white border rounded-2xl flex justify-between items-center group shadow-sm text-left">
                              <div className="text-left"><p className="font-bold text-sm text-[#001E3C] uppercase tracking-tight">{act.title}</p><p className="text-[10px] text-slate-400 font-bold">{act.date}</p></div>
                              <button onClick={() => handleDeleteActivity(act.id)} className="text-red-200 group-hover:text-red-500 transition-colors text-left"><Trash2 size={16}/></button>
                           </div>
                         ))}
                      </div>
                   </section>

                   <section className="space-y-10 text-left">
                      <h3 className="text-xl font-black border-b pb-4 flex items-center gap-4 text-[#001E3C] uppercase tracking-tighter text-left"><Wallet size={24} className="text-emerald-500"/> Teklif Yönetimi</h3>
                      <div className="bg-slate-50 p-6 rounded-3xl space-y-4 text-left">
                         <AdminInput label="Teklif Sahibi" value={newOffer.bidder} onChange={(v:any) => setNewOffer({...newOffer, bidder: v})} />
                         <AdminInput label="Tutar (₺)" type="number" value={newOffer.amount} onChange={(v:any) => setNewOffer({...newOffer, amount: v})} />
                         <button onClick={handleAddOffer} className="w-full py-3 bg-[#001E3C] text-white rounded-xl font-black text-xs uppercase shadow-md transition-all text-left">Sisteme İşle</button>
                      </div>
                      <div className="space-y-3 text-left">
                         {currentProperty.offers?.map(offer => (
                           <div key={offer.id} className="p-4 bg-white border rounded-2xl flex flex-col gap-3 shadow-sm text-left">
                              <div className="flex justify-between items-center text-left">
                                 <div className="text-left"><p className="font-black text-lg text-[#001E3C]">₺{offer.amount.toLocaleString()}</p><p className="text-[10px] font-bold text-slate-400 uppercase">{offer.bidder}</p></div>
                                 <button onClick={() => handleDeleteOffer(offer.id)} className="text-red-200 hover:text-red-500 text-left"><Trash2 size={18}/></button>
                              </div>
                              <div className="flex gap-1 text-left">
                                 {['Beklemede', 'Kabul Edildi', 'Reddedildi'].map((st:any) => (
                                   <button key={st} onClick={() => handleUpdateOfferStatus(offer.id, st)} className={`flex-1 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest border transition-all ${offer.status === st ? 'bg-[#001E3C] text-white border-[#001E3C]' : 'bg-white text-slate-400 border-slate-100'}`}>{st}</button>
                                 ))}
                              </div>
                           </div>
                         ))}
                      </div>
                   </section>
                </div>

                <div className="pt-10 text-left"><button onClick={() => { setActiveTab('dashboard'); window.scrollTo(0,0); }} className="w-full py-10 bg-[#001E3C] text-white rounded-[3rem] font-black text-2xl shadow-2xl transition-all uppercase tracking-widest hover:bg-slate-800 text-left">KAYDET VE ÖNİZLE</button></div>
             </div>
          </div>
        )}

        {/* CLIENT DASHBOARD */}
        {activeTab === 'dashboard' && currentProperty && (
          <div className="max-w-6xl mx-auto space-y-16 animate-in fade-in duration-700 pb-20 text-left">
             {/* Header */}
             <div className="flex flex-col lg:flex-row justify-between items-start gap-10 text-left">
                <div className="space-y-4 text-left">
                   <div className="flex items-center gap-3 text-left"><span className="px-4 py-1.5 bg-[#001E3C] text-white text-[11px] font-black rounded-full uppercase tracking-widest">{currentProperty.id}</span><span className="text-[11px] font-black text-slate-500 uppercase tracking-widest bg-slate-100 px-4 py-1.5 rounded-full">{calculateDaysOnMarket(currentProperty.listingDate)} GÜN AKTİF</span></div>
                   <h2 className="text-4xl lg:text-7xl font-black tracking-tight leading-none text-[#001E3C] uppercase text-left">{currentProperty.title}</h2>
                   <p className="flex items-center gap-3 text-slate-500 font-bold text-xl lg:text-3xl text-left uppercase text-left"><MapPin size={32} className="text-red-500"/> {currentProperty.location}</p>
                </div>
                <button onClick={handleGenerateAISummary} disabled={isGenerating} className="px-14 py-8 bg-[#001E3C] text-white rounded-[2.5rem] font-black shadow-2xl flex items-center justify-center gap-5 active:scale-95 transition-all uppercase tracking-widest text-lg text-left">
                  {isGenerating ? <Loader2 size={32} className="animate-spin text-white"/> : <Sparkles size={32} className="text-amber-300"/>} STRATEJİK ANALİZ
                </button>
             </div>

             {/* Stat Cards Top (General Stats) */}
             <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 text-left">
                <DashboardStat label="Toplam Görüntülenme" value={statsTotals.views.toLocaleString()} icon={<Eye size={32}/>} color="blue" />
                <DashboardStat label="Favoriye Ekleme" value={statsTotals.favs.toLocaleString()} icon={<Heart size={32}/>} color="red" />
                <DashboardStat label="Gelen Mesajlar" value={statsTotals.msgs.toLocaleString()} icon={<MessageSquare size={32}/>} color="emerald" />
                <DashboardStat label="Telefonla Arama" value={statsTotals.calls.toLocaleString()} icon={<Phone size={32}/>} color="indigo" />
             </div>

             {/* MONTHLY PERFORMANCE CARDS */}
             <div className="space-y-10 text-left">
                <div className="flex items-center gap-4 border-l-8 border-[#001E3C] pl-6 text-left"><h3 className="text-3xl lg:text-4xl font-black uppercase tracking-tighter text-[#001E3C] text-left">Aylık Performans Özeti</h3></div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 text-left">
                   {(currentProperty.stats || []).map((s, idx) => (
                     <div key={idx} className="bg-white rounded-[2.5rem] overflow-hidden border border-slate-100 shadow-xl hover:shadow-2xl transition-all group text-left">
                        <div className="bg-[#001E3C] p-5 text-white flex justify-between items-center text-left">
                           <h4 className="font-black uppercase tracking-widest text-white">{s.month}</h4>
                           <Activity size={20} className="text-blue-400 opacity-50"/>
                        </div>
                        <div className="p-8 space-y-6 text-left">
                           <div className="flex justify-between items-center border-b border-slate-50 pb-3 text-left">
                              <div className="flex items-center gap-3 text-left text-blue-600"><Eye size={20}/><span className="text-[10px] font-black uppercase text-slate-400">İzlenme</span></div>
                              <span className="font-black text-xl text-[#001E3C]">{s.views?.toLocaleString()}</span>
                           </div>
                           <div className="flex justify-between items-center border-b border-slate-50 pb-3 text-left">
                              <div className="flex items-center gap-3 text-left text-red-600"><Heart size={20}/><span className="text-[10px] font-black uppercase text-slate-400">Favori</span></div>
                              <span className="font-black text-xl text-[#001E3C]">{s.favorites?.toLocaleString()}</span>
                           </div>
                           <div className="flex justify-between items-center border-b border-slate-50 pb-3 text-left">
                              <div className="flex items-center gap-3 text-left text-emerald-600"><MessageSquare size={20}/><span className="text-[10px] font-black uppercase text-slate-400">Mesaj</span></div>
                              <span className="font-black text-xl text-[#001E3C]">{s.messages?.toLocaleString()}</span>
                           </div>
                           <div className="flex justify-between items-center border-b border-slate-50 pb-3 text-left">
                              <div className="flex items-center gap-3 text-left text-indigo-600"><Phone size={20}/><span className="text-[10px] font-black uppercase text-slate-400">Arama</span></div>
                              <span className="font-black text-xl text-[#001E3C]">{s.calls?.toLocaleString()}</span>
                           </div>
                           <div className="flex justify-between items-center text-left">
                              <div className="flex items-center gap-3 text-left text-amber-600"><MapPin size={20}/><span className="text-[10px] font-black uppercase text-slate-400">Ziyaret</span></div>
                              <span className="font-black text-xl text-[#001E3C]">{s.visits?.toLocaleString()}</span>
                           </div>
                        </div>
                     </div>
                   ))}
                </div>
             </div>

             {/* MARKET ANALYSIS CARDS */}
             <div className="space-y-10 text-left">
                <div className="flex items-center gap-4 border-l-8 border-[#001E3C] pl-6 text-left"><h3 className="text-3xl lg:text-4xl font-black uppercase tracking-tighter text-[#001E3C] text-left">Piyasa Analiz Raporu</h3></div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 text-left">
                   <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border border-slate-50 space-y-4 text-left">
                      <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600"><TrendingDown size={32}/></div>
                      <div className="text-left text-left"><p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 text-left">Emsal Değer Ortalama</p><h4 className="text-2xl font-black text-[#001E3C] text-left">₺{currentProperty.market?.comparablePrice?.toLocaleString()}</h4></div>
                   </div>
                   <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border border-slate-50 space-y-4 text-left">
                      <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600"><Clock size={32}/></div>
                      <div className="text-left text-left"><p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 text-left">Ort. Satış Süresi</p><h4 className="text-2xl font-black text-[#001E3C] text-left">{currentProperty.market?.avgSaleDurationDays} GÜN</h4></div>
                   </div>
                   <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border border-slate-50 space-y-4 text-left">
                      <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600"><Building size={32}/></div>
                      <div className="text-left text-left"><p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 text-left">Binadaki Rakip İlanlar</p><h4 className="text-2xl font-black text-[#001E3C] text-left">{currentProperty.market?.buildingUnitsCount} ADET</h4></div>
                   </div>
                   <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border border-slate-50 space-y-4 text-left">
                      <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center text-red-600"><MapIcon size={32}/></div>
                      <div className="text-left text-left"><p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 text-left">Bölgedeki Rakip İlanlar</p><h4 className="text-2xl font-black text-[#001E3C] text-left">{currentProperty.market?.neighborhoodUnitsCount} ADET</h4></div>
                   </div>
                </div>
             </div>

             {/* Fiyat Geçmişi */}
             <div className="bg-white p-10 lg:p-14 rounded-[3rem] shadow-2xl border border-slate-50 space-y-10 text-left">
                <div className="flex items-center gap-4 border-l-8 border-[#001E3C] pl-6 text-left"><h3 className="text-3xl lg:text-4xl font-black uppercase tracking-tighter text-[#001E3C] text-left">Fiyat Değişim Yolculuğu</h3></div>
                <div className="flex flex-col sm:flex-row items-end justify-between gap-6 text-left">
                    <div className="text-left text-left"><p className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-1 block text-left">GÜNCEL LİSTE FİYATI</p><h4 className="text-4xl lg:text-7xl font-black text-[#001E3C] block tracking-tighter text-left">₺{currentProperty.currentPrice.toLocaleString()}</h4></div>
                    <div className="text-emerald-700 bg-emerald-50 px-6 py-3 rounded-full font-black text-sm uppercase tracking-widest flex items-center gap-2 border border-emerald-100 shadow-sm text-left"><Tag size={20}/> AKTİF SATIŞTA</div>
                </div>
                <div className="space-y-4 text-left text-left">
                  {(currentProperty.priceHistory || []).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((p, idx) => (
                    <div key={idx} className="flex justify-between items-center p-6 bg-slate-50 rounded-[2rem] border border-slate-100 transition-all hover:bg-white text-left">
                       <div className="flex items-center gap-6 text-[#001E3C] text-left">
                          <History size={28} className="text-slate-400"/>
                          <div className="text-left text-left text-left"><p className="font-black text-[#001E3C] text-2xl block text-left">₺{p.amount.toLocaleString()}</p><p className="text-xs font-bold text-slate-500 uppercase tracking-widest text-left">{p.date}</p></div>
                       </div>
                    </div>
                  ))}
                </div>
             </div>

             {/* Teklifler & Danışman Görüşü */}
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 text-left">
                <div className="bg-white p-10 lg:p-14 rounded-[3rem] border border-slate-50 shadow-2xl space-y-10 text-left">
                   <div className="flex items-center gap-5 border-b pb-8 text-[#001E3C] text-left"><Wallet size={48} className="text-emerald-500"/><h4 className="text-2xl lg:text-3xl font-black uppercase tracking-tighter text-[#001E3C] text-left">Resmi Teklifler</h4></div>
                   <div className="space-y-5 max-h-[450px] overflow-y-auto pr-4 scrollbar-thin text-left">
                      {(!currentProperty.offers || currentProperty.offers.length === 0) ? (
                        <div className="py-24 text-center text-slate-300 font-black italic text-xl">Henüz bir teklif kaydı bulunmuyor.</div>
                      ) : (
                        currentProperty.offers.map(offer => (
                          <div key={offer.id} className="flex items-center justify-between p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 transition-all hover:bg-white text-left block">
                            <div className="flex items-center gap-5 text-left text-left text-left">
                              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-2xl shadow-inner ${offer.status === 'Reddedildi' ? 'bg-red-50 text-red-400' : offer.status === 'Kabul Edildi' ? 'bg-emerald-50 text-emerald-600' : 'bg-white text-[#001E3C]'}`}>{offer.bidder.charAt(0)}</div>
                              <div className="text-left text-left text-left text-left"><p className="font-black text-xl text-[#001E3C] uppercase text-left">{offer.bidder.substring(0,2)}***</p><p className={`text-[10px] font-black uppercase tracking-widest ${offer.status === 'Kabul Edildi' ? 'text-emerald-500' : offer.status === 'Reddedildi' ? 'text-red-400' : 'text-slate-400'}`}>{offer.status} • {offer.date}</p></div>
                            </div>
                            <p className={`font-black text-2xl tracking-tighter ${offer.status === 'Reddedildi' ? 'text-red-300 line-through' : 'text-[#001E3C]'}`}>₺{offer.amount.toLocaleString()}</p>
                          </div>
                        ))
                      )}
                   </div>
                </div>

                <div className="bg-[#001E3C] p-12 lg:p-16 rounded-[4rem] text-white flex flex-col justify-between shadow-2xl relative overflow-hidden group text-left">
                   <div className="absolute -top-10 -right-10 p-10 opacity-5 group-hover:scale-110 transition-transform"><Award size={350}/></div>
                   <div className="space-y-12 relative z-10 text-white text-left text-left text-left">
                     <div className="flex items-center gap-5 text-white text-left text-left"><MessageCircle size={56} className="text-blue-400"/><h4 className="text-2xl lg:text-4xl font-black uppercase tracking-tighter text-white text-left">Danışman Görüşü</h4></div>
                     <p className="text-2xl lg:text-4xl font-medium italic text-white/90 leading-relaxed text-left text-white text-left">"{currentProperty.agentNotes || 'Mülkünüzün satış süreci uzman ekibimiz tarafından titizlikle yönetilmektedir.'}"</p>
                   </div>
                   <div className="mt-16 pt-12 border-t border-white/20 flex items-center justify-between relative z-10 text-white text-left text-left">
                     <div className="flex items-center gap-8 text-white text-left text-left text-left">
                       <div className="w-20 h-20 lg:w-24 lg:h-24 bg-white/10 rounded-3xl flex items-center justify-center text-blue-300 shadow-inner"><UserCheck size={48}/></div>
                       <div className="text-white text-left text-left text-left text-left text-left"><p className="text-[11px] font-black text-white/50 uppercase tracking-widest mb-1 text-white text-left text-left text-left">SORUMLU DANIŞMAN</p><p className="text-2xl lg:text-3xl font-black text-white uppercase text-left text-left text-left">{currentProperty.agentName || 'Can West'}</p></div>
                     </div>
                     {currentProperty.agentPhone && <a href={`tel:${currentProperty.agentPhone}`} className="w-20 h-20 lg:w-24 lg:h-24 bg-blue-500 text-white rounded-[2rem] flex items-center justify-center shadow-2xl active:scale-90 transition-all hover:bg-blue-600 text-left"><Phone size={40}/></a>}
                   </div>
                </div>
             </div>

             {/* Yapılan İşlemler (Zaman Çizelgesi) */}
             <div className="space-y-10 text-left text-left">
                <div className="flex items-center gap-4 border-l-8 border-[#001E3C] pl-6 text-left"><h3 className="text-3xl lg:text-4xl font-black uppercase tracking-tighter text-[#001E3C] text-left">Süreç ve Aksiyonlar</h3></div>
                <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:h-full before:w-0.5 before:bg-slate-200 lg:before:ml-8 text-left text-left">
                   {(!currentProperty.activities || currentProperty.activities.length === 0) ? (
                     <div className="bg-white p-12 rounded-[2.5rem] border text-center text-slate-300 font-bold italic">İşlem günlüğü yakında güncellenecektir.</div>
                   ) : (
                     currentProperty.activities.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((act) => (
                       <div key={act.id} className="relative flex items-start gap-8 lg:gap-12 animate-in slide-in-from-left-5 text-left text-left">
                          <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#001E3C] text-white shadow-xl lg:h-16 lg:w-16 ring-8 ring-[#F8FAFC] text-left text-left text-left"><ClipboardCheck size={28} /></div>
                          <div className="flex-1 bg-white p-6 lg:p-10 rounded-[2rem] border border-slate-100 shadow-xl text-left text-left text-left">
                             <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 text-left text-left">
                                <h4 className="text-lg lg:text-2xl font-black uppercase text-[#001E3C] text-left text-left">{act.title}</h4>
                                <span className="px-4 py-1.5 bg-blue-50 text-[#001E3C] rounded-full text-[10px] font-black uppercase tracking-widest text-left text-left">{act.date}</span>
                             </div>
                             <p className="text-slate-500 font-bold leading-relaxed italic text-sm lg:text-lg text-left text-left">"{act.description}"</p>
                          </div>
                       </div>
                     ))
                   )}
                </div>
             </div>

             {/* AI ANALYSIS DISPLAY */}
             {aiSummary && (
               <div className="bg-white p-12 lg:p-20 rounded-[4rem] lg:rounded-[6rem] shadow-2xl border border-blue-100 relative overflow-hidden text-left animate-in zoom-in duration-500 text-[#001E3C] text-left">
                  <div className="absolute top-0 right-0 p-12 opacity-5 text-left"><Sparkles size={200} className="text-amber-500"/></div>
                  <div className="relative z-10 space-y-12 text-left text-left">
                    <h4 className="text-3xl lg:text-5xl font-black text-[#001E3C] flex items-center gap-5 uppercase tracking-tighter text-left text-left text-left"><Sparkles size={64} className="text-amber-500"/> Yapay Zeka Stratejik Analiz</h4>
                    <div className="prose max-w-none text-[#001E3C] leading-relaxed font-bold text-xl lg:text-3xl italic whitespace-pre-line border-l-[12px] border-amber-400 pl-12 py-6 text-left text-left">"{aiSummary}"</div>
                  </div>
               </div>
             )}

             {/* FEEDBACK FORM */}
             <div className="bg-white p-10 lg:p-16 rounded-[3.5rem] shadow-2xl border border-slate-50 space-y-12 animate-in slide-in-from-bottom-5 text-left text-left">
                <div className="flex items-center gap-5 border-b pb-8 text-[#001E3C] text-left text-left text-left text-left"><MessageSquare size={48} className="text-blue-500"/><h4 className="text-2xl lg:text-4xl font-black uppercase text-[#001E3C] tracking-tighter text-left text-left text-left">Talep / Not İlet</h4></div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 text-left text-left text-left text-left">
                  <div className="space-y-4 text-left text-left text-left text-left text-left"><label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-2 block text-left text-left text-left">Mesajınız</label><textarea value={clientFeedbackInput} onChange={(e) => setClientFeedbackInput(e.target.value)} className="w-full p-8 bg-slate-50 border rounded-[2.5rem] text-lg font-bold outline-none h-48 resize-none focus:border-[#001E3C] shadow-inner text-[#001E3C] text-left" placeholder="Stratejik görüşlerinizi buraya yazın..."></textarea></div>
                  <div className="space-y-4 text-left text-left text-left text-left text-left"><label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-2 block text-left text-left text-left">Fiyat Revizyon Talebi (₺)</label><input type="text" value={clientRequestedPrice} onChange={(e) => setClientRequestedPrice(e.target.value.replace(/[^0-9]/g, ''))} placeholder="Örn: 18.000.000" className="w-full p-8 bg-slate-50 border rounded-[2.5rem] text-lg font-bold outline-none focus:border-[#001E3C] shadow-inner text-[#001E3C] text-left" /><div className="bg-blue-50 p-6 rounded-3xl text-sm font-bold text-blue-800 leading-relaxed border border-blue-100 mt-4 text-left text-left text-left">Görüşleriniz anında sorumlu danışmanımıza ve yönetici panelimize iletilecektir.</div></div>
                </div>
                <button onClick={handleSendFeedback} className="w-full py-7 bg-[#001E3C] text-white rounded-[2.5rem] font-black text-xl uppercase shadow-2xl hover:bg-slate-800 flex items-center justify-center gap-3 transition-all text-left text-left text-left"><Send size={24}/> TALEBİ GÖNDER</button>
             </div>
          </div>
        )}
      </main>

      {/* MOBILE NAV (ADMIN) */}
      {isAdminAuthenticated && (
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-[#001E3C] border-t border-white/10 px-4 py-5 flex justify-around items-center z-[100] safe-bottom shadow-2xl">
           <MobileNavItem icon={<Home size={24}/>} label="Portföy" active={activeTab === 'propertyList'} onClick={() => setActiveTab('propertyList')} />
           <MobileNavItem icon={<Bell size={24}/>} label="Talepler" active={activeTab === 'notifications'} onClick={() => setActiveTab('notifications')} />
           <MobileNavItem icon={<Users size={24}/>} label="CRM" active={activeTab === 'customers'} onClick={() => setActiveTab('customers')} />
           <MobileNavItem icon={<CalendarIcon size={24}/>} label="Takvim" active={activeTab === 'calendar'} onClick={() => setActiveTab('calendar')} />
        </nav>
      )}

      {/* LOGIN MODAL */}
      {showLoginModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-[#001E3C]/95 backdrop-blur-3xl p-6 animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-[4rem] p-16 text-center shadow-2xl text-[#001E3C]">
            <Lock className="mx-auto mb-10 text-[#001E3C]" size={64}/><h3 className="text-3xl font-black mb-10 text-[#001E3C] uppercase tracking-tighter">Yönetici Girişi</h3>
            <form onSubmit={handleLogin} className="space-y-8">
              <input type="password" autoFocus placeholder="PIN" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} className="w-full p-6 bg-slate-50 border-2 rounded-[2.5rem] outline-none text-center text-5xl font-black tracking-widest text-[#001E3C] focus:border-[#001E3C] transition-all" />
              <button type="submit" className="w-full py-6 bg-[#001E3C] text-white rounded-[2.5rem] font-black text-2xl shadow-2xl hover:bg-slate-800 transition-all uppercase tracking-widest">GİRİŞ YAP</button>
              <button type="button" onClick={() => setShowLoginModal(false)} className="mt-8 text-slate-400 font-bold text-sm uppercase tracking-widest block mx-auto transition-colors">Vazgeç</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// --- SUB-COMPONENTS ---

const DashboardStat = ({ label, value, icon, color }: any) => {
  const styles: any = { blue: 'bg-blue-50 text-blue-600', red: 'bg-red-50 text-red-600', indigo: 'bg-indigo-50 text-indigo-600', emerald: 'bg-emerald-50 text-emerald-600' };
  return (
    <div className="bg-white p-8 lg:p-10 rounded-[2.5rem] lg:rounded-[3rem] border border-slate-100 shadow-xl space-y-5 hover:shadow-2xl transition-all h-full text-left">
       <div className={`w-16 h-16 lg:w-20 lg:h-20 rounded-2xl lg:rounded-3xl flex items-center justify-center ${styles[color]}`}>{icon}</div>
       <div className="text-left"><p className="text-[10px] lg:text-[11px] font-black text-slate-500 uppercase tracking-widest mb-1">{label}</p><h4 className="text-2xl lg:text-4xl font-black tracking-tighter text-[#001E3C] block">{value}</h4></div>
    </div>
  );
};

const NavItem = ({ icon, label, active, onClick, badge }: any) => (
  <button onClick={onClick} className={`w-full flex items-center justify-between px-6 py-4 rounded-2xl transition-all ${active ? 'bg-white/10 text-white font-black shadow-lg' : 'text-white/40 hover:text-white hover:bg-white/5'}`}>
    <div className="flex items-center gap-4 text-white"><span>{icon}</span><span className="text-[14px] uppercase tracking-wide font-black text-white">{label}</span></div>
    {(badge || 0) > 0 && <span className="w-6 h-6 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center ring-4 ring-[#001E3C]">{badge}</span>}
  </button>
);

const MobileNavItem = ({ icon, label, active, onClick }: any) => (
  <button onClick={onClick} className={`flex flex-col items-center gap-1 transition-all text-white ${active ? 'text-white scale-110 font-black' : 'text-white/40 font-medium'}`}>
    <span className="text-white">{icon}</span><span className="text-[8px] uppercase tracking-tighter text-white font-black">{label}</span>
  </button>
);

const AdminInput = ({ label, value, onChange, type = "text", placeholder = "" }: any) => (
  <div className="space-y-2 w-full text-left block text-[#001E3C]">
    <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider ml-1 block">{label}</label>
    <input type={type === 'number' ? 'text' : type} value={value ?? ''} placeholder={placeholder} onChange={(e) => {
      const v = e.target.value;
      if(type === 'number') { const n = v === '' ? 0 : Number(v.replace(/[^0-9]/g, '')); onChange(isNaN(n) ? 0 : n); } else { onChange(v); }
    }} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-base font-bold outline-none focus:border-[#001E3C] text-[#001E3C] transition-all shadow-sm" />
  </div>
);

export default App;