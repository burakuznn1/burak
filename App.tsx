
import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, FileText, TrendingUp, LogOut, 
  Sparkles, MapPin, MessageSquare, Phone, 
  Eye, Heart, Navigation, Clock, Info, Save, Edit3, Send, Lock, Unlock,
  Coins, ClipboardCheck, History, CheckCircle2, XCircle, ThumbsUp, Plus, Trash2, Copy, 
  ExternalLink, Search, Home, Tag, ChevronRight, Check, X, Award, Share2, Building2, Layers,
  TrendingDown, ArrowUpRight, Key, Menu, Image as ImageIcon, Quote, CalendarDays, TrendingUp as TrendUpIcon,
  ChevronDown
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Property, PropertyStats, Offer, SurveyResponse, ClientReport } from './types.ts';
import { generateReportSummary } from './services/geminiService.ts';

const ADMIN_PASSWORD = "west";
const MONTHS_LIST = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

const INITIAL_PROPERTIES: Property[] = [
  {
    id: 'west-101',
    title: 'Lüks Deniz Manzaralı Daire',
    location: 'Beşiktaş, Yıldız Mahallesi',
    image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1000&q=80',
    currentPrice: 18500000,
    agentNotes: "Mülkümüz bu ay ciddi bir ivme kazandı. Gelen teklifler nakit alım üzerine yoğunlaşıyor. Fiyatı korumaya devam ediyoruz. Bölgedeki emsal satışlar metrekare bazında %5 artış gösterdi.",
    clientFeedback: [],
    offers: [
      { id: '1', date: '2024-06-05', amount: 17200000, bidder: "Yatırımcı A", status: 'Reddedildi' },
      { id: '2', date: '2024-06-12', amount: 17800000, bidder: "Bireysel Alıcı B", status: 'Beklemede' },
    ],
    stats: [
      { month: 'Nisan', views: 420, favorites: 30, messages: 5, calls: 4, visits: 2 },
      { month: 'Mayıs', views: 750, favorites: 55, messages: 15, calls: 11, visits: 6 },
      { month: 'Haziran', views: 820, favorites: 68, messages: 18, calls: 14, visits: 8 },
    ],
    market: { comparablePrice: 17800000, buildingUnitsCount: 2, neighborhoodUnitsCount: 14, avgSaleDurationDays: 45 }
  }
];

const App: React.FC = () => {
  const [properties, setProperties] = useState<Property[]>(() => {
    const saved = localStorage.getItem('west_properties');
    return saved ? JSON.parse(saved) : INITIAL_PROPERTIES;
  });

  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('west_admin_auth') === 'true';
  });

  const [activeTab, setActiveTab] = useState<'dashboard' | 'admin' | 'notes' | 'propertyList'>('dashboard');
  const [passwordInput, setPasswordInput] = useState("");
  const [clientCodeInput, setClientCodeInput] = useState("");
  const [loginError, setLoginError] = useState(false);
  const [clientError, setClientError] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [isClientMode, setIsClientMode] = useState(false);
  const [editingMonthIndex, setEditingMonthIndex] = useState<number>(0);

  const [aiSummary, setAiSummary] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [newOfferAmount, setNewOfferAmount] = useState("");
  const [newOfferBidder, setNewOfferBidder] = useState("");
  const [newOfferDate, setNewOfferDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pId = params.get('p');
    if (pId) {
      const found = properties.find(p => p.id === pId);
      if (found) {
        setSelectedPropertyId(pId);
        setIsClientMode(true);
        setActiveTab('dashboard');
      }
    } else if (!isAdminAuthenticated && !selectedPropertyId) {
      setActiveTab('propertyList');
    }
  }, [properties, isAdminAuthenticated, selectedPropertyId]);

  useEffect(() => {
    localStorage.setItem('west_properties', JSON.stringify(properties));
  }, [properties]);

  const currentProperty = useMemo(() => 
    properties.find(p => p.id === selectedPropertyId), 
  [properties, selectedPropertyId]);

  // Admin panelinde düzenleme yaparken en son ayı varsayılan seç
  useEffect(() => {
    if (currentProperty && activeTab === 'admin') {
      setEditingMonthIndex(currentProperty.stats.length - 1);
    }
  }, [activeTab, selectedPropertyId]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === ADMIN_PASSWORD) {
      setIsAdminAuthenticated(true);
      localStorage.setItem('west_admin_auth', 'true');
      setShowLoginModal(false);
      setLoginError(false);
      setActiveTab('propertyList');
      setIsClientMode(false);
      setPasswordInput("");
    } else { setLoginError(true); }
  };

  const handleLogout = () => {
    setIsAdminAuthenticated(false);
    localStorage.removeItem('west_admin_auth');
    setActiveTab('propertyList');
    setSelectedPropertyId(null);
    setIsClientMode(false);
  };

  const handleClientAccess = (e: React.FormEvent) => {
    e.preventDefault();
    const found = properties.find(p => p.id.toLowerCase() === clientCodeInput.toLowerCase());
    if (found) {
      setSelectedPropertyId(found.id);
      setIsClientMode(true);
      setActiveTab('dashboard');
      setClientError(false);
      setClientCodeInput("");
    } else {
      setClientError(true);
      setTimeout(() => setClientError(false), 2000);
    }
  };

  const updateProperty = (updated: Property) => {
    if (isClientMode) return; 
    setProperties(prev => prev.map(p => p.id === updated.id ? updated : p));
  };

  const handleAddSpecificMonth = (monthName: string) => {
    if (!currentProperty || isClientMode) return;
    
    // Aynı ay zaten varsa ekleme
    if (currentProperty.stats.some(s => s.month === monthName)) {
      alert(`${monthName} ayı zaten mevcut.`);
      return;
    }

    const newData: PropertyStats = {
      month: monthName,
      views: 0,
      favorites: 0,
      messages: 0,
      calls: 0,
      visits: 0
    };

    const updatedStats = [...currentProperty.stats, newData];
    updateProperty({
      ...currentProperty,
      stats: updatedStats
    });
    setEditingMonthIndex(updatedStats.length - 1);
  };

  const handleDeleteMonth = (index: number) => {
    if (!currentProperty || isClientMode || currentProperty.stats.length <= 1) {
      alert("En az bir ay verisi kalmalıdır.");
      return;
    }
    if (!confirm("Bu ayın tüm verileri silinecek. Emin misiniz?")) return;

    const updatedStats = currentProperty.stats.filter((_, i) => i !== index);
    updateProperty({
      ...currentProperty,
      stats: updatedStats
    });
    setEditingMonthIndex(Math.max(0, index - 1));
  };

  const handleAddProperty = () => {
    if (!isAdminAuthenticated) return;
    const newId = `west-${Math.floor(1000 + Math.random() * 9000)}`;
    const newProperty: Property = {
      id: newId,
      title: 'Yeni İlan İsmi',
      location: 'Konum Bilgisi',
      image: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1000&q=80',
      currentPrice: 0,
      agentNotes: "",
      clientFeedback: [],
      offers: [],
      stats: [
        { month: MONTHS_LIST[new Date().getMonth()], views: 0, favorites: 0, messages: 0, calls: 0, visits: 0 }
      ],
      market: { comparablePrice: 0, buildingUnitsCount: 0, neighborhoodUnitsCount: 0, avgSaleDurationDays: 0 }
    };
    setProperties([newProperty, ...properties]);
    setSelectedPropertyId(newId);
    setActiveTab('admin');
  };

  const handleAddOffer = () => {
    if (!currentProperty || !newOfferAmount || !newOfferBidder || isClientMode) return;
    const newOffer: Offer = {
      id: Math.random().toString(36).substr(2, 9),
      amount: Number(newOfferAmount),
      bidder: newOfferBidder,
      date: newOfferDate,
      status: 'Beklemede'
    };
    updateProperty({
      ...currentProperty,
      offers: [newOffer, ...currentProperty.offers]
    });
    setNewOfferAmount("");
    setNewOfferBidder("");
  };

  const handleDeleteOffer = (offerId: string) => {
    if (!currentProperty || isClientMode) return;
    updateProperty({
      ...currentProperty,
      offers: currentProperty.offers.filter(o => o.id !== offerId)
    });
  };

  const handleUpdateOfferStatus = (offerId: string, status: Offer['status']) => {
    if (!currentProperty || isClientMode) return;
    updateProperty({
      ...currentProperty,
      offers: currentProperty.offers.map(o => o.id === offerId ? { ...o, status } : o)
    });
  };

  const filteredProperties = properties.filter(p => 
    p.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Dashboard için en son ay ve bir önceki ay verileri
  const statsHistory = currentProperty?.stats || [];
  const latestStats = statsHistory[statsHistory.length - 1];
  const prevStats = statsHistory.length > 1 ? statsHistory[statsHistory.length - 2] : null;

  // Admin panelinde o an düzenlenen ayın verisi
  const editingStats = statsHistory[editingMonthIndex] || latestStats;

  const calculateChange = (current: number, previous: number | null | undefined) => {
    if (!previous || previous === 0) return null;
    const change = ((current - previous) / previous) * 100;
    return change.toFixed(1);
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-[#F8FAFC] text-[#1E293B]">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex w-72 bg-[#001E3C] text-white flex-col fixed inset-y-0 z-50 shadow-2xl">
        <div className="p-8 border-b border-white/5 bg-gradient-to-br from-[#002B5B] to-[#001E3C]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-lg">
              <Award className="text-[#001E3C]" size={24} />
            </div>
            <div>
              <h1 className="font-black text-lg tracking-wider">TÜRKWEST</h1>
              <p className="text-[10px] uppercase tracking-[0.3em] opacity-50">Lüks Konut Grubu</p>
            </div>
          </div>
        </div>
        
        <nav className="p-6 space-y-2 flex-1">
          <NavItem icon={<LayoutDashboard size={20} />} label="Varlık Raporu" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
          {!isClientMode && isAdminAuthenticated && (
            <>
              <NavItem icon={<Home size={20} />} label="Portföy Merkezi" active={activeTab === 'propertyList'} onClick={() => setActiveTab('propertyList')} />
              {selectedPropertyId && (
                <>
                  <div className="mt-8 mb-2 px-4 text-[10px] font-bold text-white/30 uppercase tracking-widest">Düzenleme</div>
                  <NavItem icon={<Edit3 size={18} />} label="Veri & Teklifler" active={activeTab === 'admin'} onClick={() => setActiveTab('admin')} />
                  <NavItem icon={<Sparkles size={18} />} label="Strateji Notu" active={activeTab === 'notes'} onClick={() => setActiveTab('notes')} />
                </>
              )}
            </>
          )}
        </nav>

        <div className="p-6 border-t border-white/5">
          {isAdminAuthenticated ? (
             <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 py-3 bg-red-500/10 text-red-400 rounded-xl text-xs font-bold hover:bg-red-500/20 transition-all">
                <LogOut size={16} /> Güvenli Çıkış
             </button>
          ) : !isClientMode && (
            <button onClick={() => setShowLoginModal(true)} className="w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2">
              <Lock size={14} /> Yönetici Girişi
            </button>
          )}
          {isClientMode && (
            <button onClick={() => { setIsClientMode(false); setSelectedPropertyId(null); setActiveTab('propertyList'); }} className="w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2">
              <LogOut size={14} /> Rapordan Ayrıl
            </button>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 lg:ml-72 p-4 lg:p-10 pb-24 lg:pb-10 overflow-x-hidden">
        {activeTab === 'dashboard' && currentProperty && latestStats && (
          <div className="max-w-6xl mx-auto space-y-6 lg:space-y-10 animate-in fade-in duration-700">
            <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                   <span className="inline-block px-3 py-1 bg-[#001E3C] text-white text-[10px] font-black rounded-full uppercase tracking-widest">{latestStats.month} AYI RAPORU</span>
                   {prevStats && <span className="text-[10px] font-bold text-slate-400 uppercase italic">Kıyaslama: {prevStats.month}</span>}
                </div>
                <h2 className="text-2xl lg:text-4xl font-black text-[#001E3C] tracking-tight">{currentProperty.title}</h2>
                <div className="flex flex-wrap items-center gap-3 text-slate-500 text-sm font-medium">
                  <span className="flex items-center gap-1.5"><MapPin size={16}/> {currentProperty.location}</span>
                  <span className="font-black text-[#001E3C] text-lg">₺{currentProperty.currentPrice.toLocaleString()}</span>
                </div>
              </div>
              <button onClick={async () => { setIsGenerating(true); setAiSummary(await generateReportSummary({ property: currentProperty, period: latestStats.month, clientName: 'Değerli Ortağımız' })); setIsGenerating(false); }}
                className="w-full lg:w-auto flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-[#001E3C] to-[#003366] text-white rounded-2xl font-bold shadow-xl hover:scale-105 transition-all"
              >
                {isGenerating ? <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" /> : <Sparkles size={20} className="text-amber-400" />}
                <span>Yapay Zeka Analizi</span>
              </button>
            </div>

            {/* Danışman Notu */}
            {currentProperty.agentNotes && (
              <div className="bg-white border-l-8 border-[#001E3C] p-6 lg:p-10 rounded-3xl shadow-md space-y-4 relative overflow-hidden group">
                 <div className="absolute top-4 right-6 text-slate-100 group-hover:text-slate-200 transition-colors">
                    <Quote size={80} />
                 </div>
                 <div className="relative z-10">
                    <h3 className="text-xs lg:text-sm font-black text-[#001E3C] uppercase tracking-[0.2em] flex items-center gap-2 mb-4">
                       <FileText size={16}/> Danışman Strateji Notu
                    </h3>
                    <p className="text-base lg:text-xl text-slate-700 font-medium leading-relaxed italic">
                      "{currentProperty.agentNotes}"
                    </p>
                 </div>
              </div>
            )}

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6">
              <StatCard label="Görüntü" value={latestStats.views} change={calculateChange(latestStats.views, prevStats?.views)} icon={<Eye size={20}/>} color="blue" />
              <StatCard label="Favori" value={latestStats.favorites} change={calculateChange(latestStats.favorites, prevStats?.favorites)} icon={<Heart size={20}/>} color="red" />
              <StatCard label="İletişim" value={latestStats.messages + latestStats.calls} change={calculateChange(latestStats.messages + latestStats.calls, (prevStats?.messages || 0) + (prevStats?.calls || 0))} icon={<MessageSquare size={20}/>} color="indigo" />
              <StatCard label="Gezme" value={latestStats.visits} change={calculateChange(latestStats.visits, prevStats?.visits)} icon={<Navigation size={20}/>} color="emerald" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
               <div className="lg:col-span-2 space-y-6 lg:space-y-8">
                  <div className="bg-white p-6 lg:p-10 rounded-[2rem] shadow-sm border border-slate-200/60">
                    <div className="mb-6 flex justify-between items-center">
                       <h4 className="text-lg font-black text-[#001E3C]">İlgi Trendi</h4>
                    </div>
                    <div className="h-[250px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={currentProperty.stats}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                          <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94A3B8'}} />
                          <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94A3B8'}} />
                          <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}} />
                          <Area type="monotone" dataKey="views" stroke="#3B82F6" strokeWidth={3} fill="#3B82F6" fillOpacity={0.05} />
                          <Area type="monotone" dataKey="favorites" stroke="#EF4444" strokeWidth={3} fill="#EF4444" fillOpacity={0.05} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="bg-white p-6 lg:p-10 rounded-[2rem] shadow-sm border border-slate-200/60">
                    <div className="flex items-center justify-between mb-6">
                       <h4 className="text-lg font-black text-[#001E3C] flex items-center gap-2"><Coins size={20} className="text-amber-500"/> Teklifler</h4>
                    </div>
                    <div className="space-y-4">
                      {currentProperty.offers.length > 0 ? currentProperty.offers.map(offer => (
                        <div key={offer.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-6 bg-slate-50 rounded-[2rem]">
                          <div className="flex items-center gap-4">
                            <div className="p-4 bg-white rounded-xl shadow-sm"><History size={20} className="text-[#001E3C]"/></div>
                            <div>
                              <p className="text-lg lg:text-2xl font-black text-[#001E3C]">₺{offer.amount.toLocaleString()}</p>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{offer.date} • {offer.bidder}</p>
                            </div>
                          </div>
                          <span className={`self-start sm:self-center px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                            offer.status === 'Reddedildi' ? 'bg-red-100 text-red-600' : 
                            offer.status === 'Kabul Edildi' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
                          }`}>{offer.status}</span>
                        </div>
                      )) : <p className="text-center py-6 text-slate-400 italic text-sm">Henüz teklif bulunmamaktadır.</p>}
                    </div>
                  </div>
               </div>

               <div className="space-y-6">
                  <div className="bg-[#001E3C] p-6 lg:p-8 rounded-[2rem] text-white space-y-6 shadow-xl relative overflow-hidden">
                     <Building2 size={80} className="absolute -right-5 -bottom-5 opacity-10" />
                     <h4 className="text-lg font-black flex items-center gap-2"><TrendingUp size={20} className="text-emerald-400"/> Piyasa Konumu</h4>
                     <div className="space-y-3 relative z-10">
                        <MarketCard icon={<Building2 size={16}/>} label="Binadaki İlanlar" value={currentProperty.market.buildingUnitsCount} />
                        <MarketCard icon={<Layers size={16}/>} label="Mahalledeki İlanlar" value={currentProperty.market.neighborhoodUnitsCount} />
                        <MarketCard icon={<Clock size={16}/>} label="Satış Süresi" value={`${currentProperty.market.avgSaleDurationDays} Gün`} />
                        <div className="pt-4 border-t border-white/10">
                           <p className="text-[10px] text-white/50 uppercase font-black tracking-widest mb-1">Emsal Fiyat</p>
                           <p className="text-xl font-black">₺{currentProperty.market.comparablePrice.toLocaleString()}</p>
                        </div>
                     </div>
                  </div>
               </div>
            </div>

            {aiSummary && (
              <div className="bg-white p-8 lg:p-12 rounded-[2rem] border-2 border-[#001E3C]/5 shadow-xl">
                 <h3 className="text-xl lg:text-2xl font-black text-[#001E3C] flex items-center gap-3 mb-6"><Sparkles size={24} className="text-amber-500"/> Yapay Zeka Strateji Raporu</h3>
                 <div className="text-base lg:text-lg leading-relaxed text-slate-700 font-medium whitespace-pre-wrap border-l-4 border-[#001E3C] pl-6 lg:pl-8">
                   {aiSummary}
                 </div>
              </div>
            )}
          </div>
        )}

        {/* Admin Property List */}
        {activeTab === 'propertyList' && isAdminAuthenticated && !isClientMode && (
          <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
            <header className="flex flex-col gap-6">
              <h2 className="text-3xl font-black text-[#001E3C]">Portföy Merkezi</h2>
              <div className="flex flex-col md:flex-row gap-4">
                 <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                    <input type="text" placeholder="İlan ara..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-12 pr-6 py-4 bg-white border border-slate-200 rounded-2xl outline-none focus:border-[#001E3C]"
                    />
                 </div>
                 <button onClick={handleAddProperty} className="px-8 py-4 bg-[#001E3C] text-white rounded-2xl font-bold shadow-xl flex items-center justify-center gap-2">
                    <Plus size={20}/> Yeni İlan
                 </button>
              </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
              {filteredProperties.map(p => (
                <div key={p.id} className="bg-white rounded-[2rem] overflow-hidden border border-slate-200/60 shadow-sm relative group">
                   <img src={p.image} className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-500" alt="" />
                   <div className="p-6 lg:p-8 space-y-6">
                      <div className="flex justify-between items-start">
                         <div>
                            <h4 className="font-black text-lg text-[#001E3C] truncate">{p.title}</h4>
                            <p className="text-xs text-slate-400 font-bold flex items-center gap-1 mt-1"><MapPin size={12}/> {p.location}</p>
                         </div>
                         <span className="text-[10px] font-black text-slate-400 uppercase">#{p.id}</span>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => { setSelectedPropertyId(p.id); setActiveTab('dashboard'); }} className="flex-1 py-3 bg-slate-50 text-slate-600 rounded-xl text-[10px] font-bold hover:bg-blue-50">Analiz</button>
                        <button onClick={() => { setSelectedPropertyId(p.id); setActiveTab('admin'); }} className="flex-1 py-3 bg-slate-50 text-slate-600 rounded-xl text-[10px] font-bold hover:bg-amber-50">Düzenle</button>
                        <button onClick={() => { 
                          const url = `${window.location.origin}${window.location.pathname}?p=${p.id}`;
                          navigator.clipboard.writeText(url);
                          alert(`Müşteri rapor linki kopyalandı!`);
                        }} className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:text-emerald-500 transition-all"><Copy size={16}/></button>
                      </div>
                   </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Admin Data Entry Panel */}
        {activeTab === 'admin' && currentProperty && isAdminAuthenticated && !isClientMode && (
           <div className="max-w-4xl mx-auto space-y-10 animate-in slide-in-from-bottom-8">
              <div className="flex justify-between items-center">
                 <h3 className="text-3xl font-black text-[#001E3C]">Veri Yönetimi</h3>
                 <button onClick={() => setActiveTab('propertyList')} className="px-4 py-2 text-slate-400 font-bold flex items-center gap-2 hover:text-[#001E3C] transition-all"><ChevronRight className="rotate-180" size={18}/> Listeye Dön</button>
              </div>

              <div className="space-y-8">
                {/* Ay Seçimi ve Düzenleme Kontrolü */}
                <div className="bg-white p-8 rounded-[3rem] shadow-sm border-2 border-[#001E3C]/10 space-y-6">
                    <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                        <div className="space-y-1">
                           <h4 className="font-black text-xs text-slate-400 uppercase tracking-widest flex items-center gap-2"><CalendarDays size={16} className="text-[#001E3C]"/> Rapor Dönemi</h4>
                           <p className="text-[10px] text-slate-400 font-medium italic">Düzenlemek istediğiniz ayı seçin veya yeni ay ekleyin.</p>
                        </div>
                        <div className="flex flex-wrap gap-3">
                           <select 
                             className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-[#001E3C] outline-none"
                             onChange={(e) => handleAddSpecificMonth(e.target.value)}
                             value=""
                           >
                              <option value="" disabled>+ Yeni Ay Ekle</option>
                              {MONTHS_LIST.map(m => <option key={m} value={m}>{m}</option>)}
                           </select>
                        </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 p-4 bg-slate-50 rounded-2xl">
                        {currentProperty.stats.map((s, i) => (
                           <button 
                             key={i} 
                             onClick={() => setEditingMonthIndex(i)}
                             className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${editingMonthIndex === i ? 'bg-[#001E3C] text-white shadow-lg scale-105' : 'bg-white text-slate-400 border border-slate-200 hover:border-[#001E3C]'}`}
                           >
                              {s.month}
                              {editingMonthIndex === i && currentProperty.stats.length > 1 && (
                                <X size={12} className="hover:text-red-300" onClick={(e) => { e.stopPropagation(); handleDeleteMonth(i); }} />
                              )}
                           </button>
                        ))}
                    </div>
                </div>

                {editingStats && (
                  <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-200/60 space-y-6 animate-in fade-in slide-in-from-top-4">
                     <div className="flex justify-between items-center">
                        <h4 className="font-black text-xs text-slate-400 uppercase tracking-widest flex items-center gap-2">
                           <TrendingUp size={16} className="text-[#001E3C]"/> {editingStats.month} Ayı Verilerini Düzenle
                        </h4>
                        <span className="text-[10px] bg-amber-100 text-amber-700 px-3 py-1 rounded-full font-black uppercase">Düzenleme Modu</span>
                     </div>
                     <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        <AdminInput label="Görüntü" value={editingStats.views} type="number" onChange={v => { const s = [...currentProperty.stats]; s[editingMonthIndex].views = Number(v); updateProperty({...currentProperty, stats: s}); }} />
                        <AdminInput label="Favori" value={editingStats.favorites} type="number" onChange={v => { const s = [...currentProperty.stats]; s[editingMonthIndex].favorites = Number(v); updateProperty({...currentProperty, stats: s}); }} />
                        <AdminInput label="Mesaj" value={editingStats.messages} type="number" onChange={v => { const s = [...currentProperty.stats]; s[editingMonthIndex].messages = Number(v); updateProperty({...currentProperty, stats: s}); }} />
                        <AdminInput label="Arama" value={editingStats.calls} type="number" onChange={v => { const s = [...currentProperty.stats]; s[editingMonthIndex].calls = Number(v); updateProperty({...currentProperty, stats: s}); }} />
                        <AdminInput label="Ziyaret" value={editingStats.visits} type="number" onChange={v => { const s = [...currentProperty.stats]; s[editingMonthIndex].visits = Number(v); updateProperty({...currentProperty, stats: s}); }} />
                     </div>
                  </div>
                )}

                <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-200/60 space-y-6">
                   <h4 className="font-black text-xs text-slate-400 uppercase tracking-widest flex items-center gap-2"><Info size={16} className="text-[#001E3C]"/> Genel İlan Bilgileri</h4>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <AdminInput label="İlan Başlığı" value={currentProperty.title} onChange={v => updateProperty({...currentProperty, title: v})} />
                      <AdminInput label="Konum" value={currentProperty.location} onChange={v => updateProperty({...currentProperty, location: v})} />
                      <AdminInput label="Güncel Fiyat (₺)" value={currentProperty.currentPrice} type="number" onChange={v => updateProperty({...currentProperty, currentPrice: Number(v)})} />
                      <AdminInput label="Emsal Fiyat (₺)" value={currentProperty.market.comparablePrice} type="number" onChange={v => updateProperty({...currentProperty, market: {...currentProperty.market, comparablePrice: Number(v)}})} />
                   </div>
                </div>

                <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-200/60 space-y-6">
                   <h4 className="font-black text-xs text-slate-400 uppercase tracking-widest flex items-center gap-2"><Building2 size={16} className="text-[#001E3C]"/> Piyasa Analizi (Global)</h4>
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <AdminInput label="Binadaki İlanlar" value={currentProperty.market.buildingUnitsCount} type="number" onChange={v => updateProperty({...currentProperty, market: {...currentProperty.market, buildingUnitsCount: Number(v)}})} />
                      <AdminInput label="Mahalledeki İlanlar" value={currentProperty.market.neighborhoodUnitsCount} type="number" onChange={v => updateProperty({...currentProperty, market: {...currentProperty.market, neighborhoodUnitsCount: Number(v)}})} />
                      <AdminInput label="Ort. Satış Süresi" value={currentProperty.market.avgSaleDurationDays} type="number" onChange={v => updateProperty({...currentProperty, market: {...currentProperty.market, avgSaleDurationDays: Number(v)}})} />
                   </div>
                </div>

                <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-200/60 space-y-8">
                   <h4 className="font-black text-xs text-slate-400 uppercase tracking-widest flex items-center gap-2"><Coins size={16} className="text-[#001E3C]"/> Teklifler</h4>
                   <div className="p-6 bg-slate-50 rounded-[2rem] space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                         <AdminInput label="Tutar (₺)" value={newOfferAmount} type="number" onChange={setNewOfferAmount} />
                         <AdminInput label="Teklif Sahibi" value={newOfferBidder} onChange={setNewOfferBidder} />
                         <AdminInput label="Tarih" value={newOfferDate} type="date" onChange={setNewOfferDate} />
                      </div>
                      <button onClick={handleAddOffer} className="w-full py-4 bg-[#001E3C] text-white rounded-xl font-bold flex items-center justify-center gap-2"><Plus size={18}/> Teklifi Kaydet</button>
                   </div>
                   <div className="space-y-3">
                      {currentProperty.offers.map(offer => (
                         <div key={offer.id} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl">
                            <div>
                               <p className="font-black text-[#001E3C]">₺{offer.amount.toLocaleString()}</p>
                               <p className="text-[10px] font-bold text-slate-400 uppercase">{offer.bidder} • {offer.date}</p>
                            </div>
                            <div className="flex items-center gap-3">
                               <select value={offer.status} onChange={(e) => handleUpdateOfferStatus(offer.id, e.target.value as any)} className="px-2 py-1 bg-slate-50 border border-slate-200 rounded text-[10px] font-black uppercase outline-none">
                                  <option value="Beklemede">Beklemede</option>
                                  <option value="Reddedildi">Reddedildi</option>
                                  <option value="Kabul Edildi">Kabul Edildi</option>
                               </select>
                               <button onClick={() => handleDeleteOffer(offer.id)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16}/></button>
                            </div>
                         </div>
                      ))}
                   </div>
                </div>
              </div>

              <div className="flex gap-4">
                 <button onClick={() => setActiveTab('dashboard')} className="flex-1 py-5 bg-[#001E3C] text-white rounded-[2rem] font-black shadow-xl hover:bg-[#002B5B] transition-all">Kaydet ve Raporu Önizle</button>
              </div>
           </div>
        )}

        {/* Strategy Notes Panel */}
        {activeTab === 'notes' && currentProperty && isAdminAuthenticated && !isClientMode && (
          <div className="max-w-4xl mx-auto space-y-6 animate-in slide-in-from-bottom-6">
             <div className="bg-white p-6 lg:p-12 rounded-[2rem] lg:rounded-[3.5rem] shadow-sm border border-slate-200/60 space-y-8">
                <h3 className="text-3xl font-black text-[#001E3C]">Strateji & Notlar</h3>
                <textarea value={currentProperty.agentNotes} onChange={e => updateProperty({...currentProperty, agentNotes: e.target.value})} 
                  className="w-full h-80 p-6 lg:p-10 bg-slate-50 rounded-[2.5rem] border-2 border-slate-100 focus:border-[#001E3C] outline-none text-xl font-medium leading-relaxed" 
                  placeholder="Mülk sahibi için stratejik görüşlerinizi buraya yazın..." 
                />
                <button onClick={() => setActiveTab('dashboard')} className="w-full py-5 bg-[#001E3C] text-white rounded-[2rem] font-black shadow-xl hover:bg-[#002B5B] transition-all">Kaydet ve Raporu Gör</button>
             </div>
          </div>
        )}

        {/* Login & Access Screens */}
        {!selectedPropertyId && !isAdminAuthenticated && (
          <div className="min-h-[80vh] flex flex-col items-center justify-center p-6">
             <div className="w-24 h-24 bg-[#001E3C] rounded-[2.5rem] flex items-center justify-center mb-10 shadow-2xl">
               <Award className="text-white" size={40} />
             </div>
             <h1 className="text-5xl font-black text-[#001E3C] mb-4 text-center tracking-tight">Performans Raporu</h1>
             <p className="text-xl text-slate-500 max-w-lg font-medium leading-relaxed text-center mb-12">Gayrimenkulünüzün aylık performans analizini görüntülemek için rapor kodunuzu giriniz.</p>
             <form onSubmit={handleClientAccess} className="w-full max-w-md space-y-4">
               <input type="text" placeholder="Rapor Kodu" value={clientCodeInput} onChange={(e) => setClientCodeInput(e.target.value)}
                 className={`w-full px-8 py-6 bg-white border-2 ${clientError ? 'border-red-500' : 'border-slate-100'} rounded-[2rem] outline-none text-xl font-black text-[#001E3C] shadow-lg focus:border-[#001E3C] text-center`}
               />
               <button type="submit" className="w-full py-6 bg-[#001E3C] text-white rounded-[2rem] font-black text-xl shadow-2xl hover:scale-105 transition-all">Analizi Görüntüle</button>
             </form>
             <button onClick={() => setShowLoginModal(true)} className="mt-12 text-xs font-bold text-slate-400 uppercase tracking-widest hover:text-[#001E3C] transition-colors">Yönetici Girişi</button>
          </div>
        )}

        {showLoginModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#001E3C]/95 backdrop-blur-xl p-4">
            <div className="bg-white w-full max-w-sm rounded-[3rem] shadow-2xl p-12 text-center animate-in zoom-in duration-300">
              <h3 className="text-2xl font-black text-[#001E3C] mb-8">Sistem Girişi</h3>
              <form onSubmit={handleLogin} className="space-y-4">
                <input type="password" autoFocus placeholder="Şifre" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)}
                  className={`w-full p-4 bg-slate-50 border-2 ${loginError ? 'border-red-500 animate-pulse' : 'border-slate-100'} rounded-2xl outline-none text-center text-xl font-black tracking-[0.5em] text-[#001E3C]`}
                />
                <button type="submit" className="w-full py-4 bg-[#001E3C] text-white rounded-2xl font-black shadow-xl hover:bg-[#002B5B] transition-all">Giriş Yap</button>
                <button type="button" onClick={() => setShowLoginModal(false)} className="text-xs font-bold text-slate-400 mt-4 uppercase hover:text-slate-600 transition-colors">Kapat</button>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* Mobile Bottom Navigation */}
      {(isAdminAuthenticated || isClientMode) && (
        <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-white border-t border-slate-100 px-6 py-3 flex justify-around items-center z-50 shadow-lg">
           <MobileNavItem icon={<LayoutDashboard size={20}/>} active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
           {selectedPropertyId && isAdminAuthenticated && !isClientMode && (
             <>
               <MobileNavItem icon={<Home size={20}/>} active={activeTab === 'propertyList'} onClick={() => setActiveTab('propertyList')} />
               <MobileNavItem icon={<Edit3 size={20}/>} active={activeTab === 'admin'} onClick={() => setActiveTab('admin')} />
               <MobileNavItem icon={<Sparkles size={20}/>} active={activeTab === 'notes'} onClick={() => setActiveTab('notes')} />
             </>
           )}
        </nav>
      )}
    </div>
  );
};

// UI Components
const NavItem = ({ icon, label, active, onClick }: any) => (
  <button onClick={onClick} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all ${active ? 'bg-white/10 text-white font-black shadow-lg border border-white/5' : 'text-white/30 hover:bg-white/5 hover:text-white'}`}>
    {icon} <span className="text-[13px]">{label}</span>
  </button>
);

const MobileNavItem = ({ icon, active, onClick }: any) => (
  <button onClick={onClick} className={`p-3 rounded-xl transition-all ${active ? 'bg-[#001E3C] text-white scale-110' : 'text-slate-300 hover:text-slate-400'}`}>
    {icon}
  </button>
);

const StatCard = ({ label, value, change, icon, color }: any) => {
  const colors: any = { blue: 'bg-blue-50 text-blue-600', red: 'bg-red-50 text-red-600', indigo: 'bg-indigo-50 text-indigo-600', emerald: 'bg-emerald-50 text-emerald-600' };
  const isPositive = change && parseFloat(change) > 0;
  
  return (
    <div className="bg-white p-5 lg:p-6 rounded-[2rem] border border-slate-200/60 shadow-sm space-y-3 relative overflow-hidden">
       <div className="flex justify-between items-start">
          <div className={`w-10 h-10 lg:w-12 lg:h-12 rounded-2xl flex items-center justify-center ${colors[color]}`}>{icon}</div>
          {change && (
            <div className={`flex items-center gap-1 text-[9px] font-black px-2 py-1 rounded-lg ${isPositive ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
              {isPositive ? <ArrowUpRight size={10}/> : <TrendingDown size={10}/>}
              %{Math.abs(parseFloat(change))}
            </div>
          )}
       </div>
       <div>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
          <h4 className="text-xl lg:text-2xl font-black text-[#001E3C]">{value.toLocaleString()}</h4>
       </div>
    </div>
  );
};

const MarketCard = ({ icon, label, value }: any) => (
  <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10 group hover:bg-white/10 transition-colors">
     <div className="flex items-center gap-3">
        <div className="p-2 bg-white/10 rounded-lg text-emerald-400 group-hover:scale-110 transition-transform">{icon}</div>
        <span className="text-xs font-medium text-white/70">{label}</span>
     </div>
     <span className="text-sm font-black text-white">{value}</span>
  </div>
);

const AdminInput = ({ label, value, onChange, type = "text" }: any) => (
  <div className="space-y-1">
    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</label>
    <input type={type} value={value} onChange={e => onChange(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-[#001E3C] outline-none focus:border-[#001E3C] transition-all" />
  </div>
);

export default App;
