import React, { useState, useEffect } from 'react';
import { 
  Calculator, AlertTriangle, CheckCircle, Info, 
  Eye, MousePointerClick, MessageCircle,
  Image as ImageIcon, MapPin, Users, UploadCloud,
  Save, Plus, Trash2, History,
  Trophy, LayoutDashboard, BarChart2, Calendar, Clock, Building,
  ChevronRight, HelpCircle, Target, Sparkles, RefreshCw, Edit2, Map
} from 'lucide-react';

const today = new Date().toISOString().split('T')[0];

// กำหนดค่าเริ่มต้นของโครงการตามที่ระบุ
const initialProjects = [
  { id: 'p1', name: 'ศักดิ์สิริ วาเลย์', location: 'ตำบลนิคมพัฒนา อำเภอนิคมพัฒนา จังหวัดระยอง' },
  { id: 'p2', name: 'โครงการ 2', location: 'ตำบลมะขามคู่ อำเภอนิคมพัฒนา จังหวัดระยอง' }
];

const defaultInputs = {
  campaignName: '',
  projectName: 'ศักดิ์สิริ วาเลย์', 
  projectId: 'p1', 
  startDate: today,
  endDate: today,
  dataAsOfDate: today,
  objective: 'chat',
  adsLocation: 'รัศมี 10 กม. รอบโครงการ', // พื้นที่ที่ใช้ยิง Ads จริง
  targetAge: '25-45',
  targetDemographics: 'พนักงานบริษัท, สมรส',
  targetInterests: 'สินเชื่อบ้าน, อสังหาริมทรัพย์',
  targetBehaviors: 'ผู้ที่เพิ่งย้ายที่อยู่',
  adImage: null,
  spend: 0,
  impressions: 0,
  reach: 0,
  clicks: 0,
  metaLeads: 0, 
  formLeads: 0, 
};

const App = () => {
  const [viewMode, setViewMode] = useState<'analyze' | 'compare'>('analyze');
  const [projects, setProjects] = useState<any[]>(initialProjects);
  const [selectedProjectId, setSelectedProjectId] = useState('p1');
  const [inputs, setInputs] = useState<any>({ ...defaultInputs });
  const [metrics, setMetrics] = useState<any>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [savedCampaigns, setSavedCampaigns] = useState<any[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null); 
  const [isLoaded, setIsLoaded] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'saving' | 'idle'>('idle');

  // Load Initial Data
  useEffect(() => {
    const savedData = localStorage.getItem('realEstateCampaigns');
    const savedProjects = localStorage.getItem('realEstateProjects');
    const draftData = localStorage.getItem('realEstateDraft');
    
    if (savedProjects) {
      try {
        const parsed = JSON.parse(savedProjects);
        if (parsed.length > 0) setProjects(parsed);
      } catch (e) {}
    }

    if (savedData) {
      try { 
        setSavedCampaigns(JSON.parse(savedData)); 
      } catch (e) {}
    }

    if (draftData && !activeId) {
      try {
        setInputs(JSON.parse(draftData));
      } catch (e) {}
    }

    setIsLoaded(true);
  }, []);

  // Auto-Save Logic
  useEffect(() => {
    if (!isLoaded) return;

    const timer = setTimeout(() => {
      setAutoSaveStatus('saving');
      
      localStorage.setItem('realEstateCampaigns', JSON.stringify(savedCampaigns));
      localStorage.setItem('realEstateProjects', JSON.stringify(projects));
      
      if (!activeId) {
        localStorage.setItem('realEstateDraft', JSON.stringify(inputs));
      } else {
        const res = calculateResults(inputs);
        if (res) {
          const updatedCampaign = {
            id: activeId,
            date: new Date().toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' }),
            inputs: { ...inputs, projectId: selectedProjectId },
            metrics: res.metrics,
            analysis: res.analysis
          };
          setSavedCampaigns(prev => prev.map(c => c.id === activeId ? updatedCampaign : c));
          setMetrics(res.metrics);
          setAnalysis(res.analysis);
        }
      }

      setTimeout(() => setAutoSaveStatus('saved'), 500);
    }, 1000);

    return () => clearTimeout(timer);
  }, [inputs, projects, isLoaded]);

  // Current Project Context
  const currentProject = projects.find(p => p.id === selectedProjectId) || projects[0];
  const activeCampaigns = savedCampaigns.filter(c => c.inputs.projectId === selectedProjectId);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setInputs((prev: any) => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value
    }));
    setAutoSaveStatus('idle');
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, fieldName: string) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setInputs((prev: any) => ({ 
          ...prev, 
          [fieldName]: reader.result
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const calculateResults = (data: any) => {
    const totalResults = (Number(data.metaLeads) || 0) + (Number(data.formLeads) || 0);
    if (!data.spend || !data.impressions || totalResults === 0) return null;

    const cpm = (data.spend / data.impressions) * 1000;
    const frequency = data.impressions / (data.reach || 1);
    const ctr = (data.clicks / data.impressions) * 100;
    const cpa = data.spend / totalResults;

    const isChat = data.objective === 'chat';
    const lowCpa = isChat ? 150 : 400;   
    const highCpa = isChat ? 400 : 1200; 

    let cpaStatus = 'good';
    if (cpa > highCpa) cpaStatus = 'bad';
    else if (cpa > lowCpa) cpaStatus = 'warning';

    let ctrStatus = ctr < 1.0 ? 'bad' : (ctr < 1.5 ? 'warning' : 'good');
    let freqStatus = frequency > 2.5 ? 'bad' : (frequency > 1.5 ? 'warning' : 'good');
    let cpmStatus = cpm > 300 ? 'bad' : (cpm > 150 ? 'warning' : 'good');

    const calculatedMetrics = { cpm, frequency, ctr, cpa, totalResults, cpaStatus, ctrStatus, cpmStatus, freqStatus };
    
    let topAdvice = [];
    let midAdvice = [];
    let botAdvice = [];
    let targetAdvice = [];

    const objText = isChat ? "ทักแชท (Inbox)" : "กรอกฟอร์ม (Lead Form)";

    // 1. Delivery & Location Logic
    if (cpmStatus === 'bad') {
      topAdvice.push(`CPM แพง (฿${formatMoney(cpm)}): การแข่งขันในพื้นที่ยิงแอด "${data.adsLocation}" สูงมาก หรือทำเลนี้มีคู่แข่งแย่งประมูลพื้นที่หนาแน่นในช่วงนี้`);
    } else {
      topAdvice.push(`CPM เหมาะสม (฿${formatMoney(cpm)}): สามารถเข้าถึงกลุ่มเป้าหมายในโซน "${data.adsLocation}" ได้ในราคาประหยัด`);
    }

    // 2. Creative Logic
    if (ctrStatus === 'bad') {
      midAdvice.push(`CTR ต่ำ (${formatDecimal(ctr)}%): งานภาพยังไม่สามารถดึงดูดความสนใจของคนในพื้นที่ "${data.adsLocation}" ได้ดีพอ ควรทดลองเปลี่ยนรูปที่เน้นจุดเด่นทำเลหรือโปรโมชั่นที่ชัดเจนขึ้น`);
    } else {
      midAdvice.push(`CTR ดี (${formatDecimal(ctr)}%): งานภาพชิ้นนี้สื่อสารได้ตรงใจกลุ่มคนในพื้นที่ยิงแอดเป็นอย่างดี`);
    }

    // 3. Location Synergy Analysis
    const isLocalTarget = data.adsLocation.includes(currentProject.location.split(' ')[0]);
    if (isLocalTarget) {
      targetAdvice.push(`กลยุทธ์ทำเล: ยิงแอดตรงพิกัดโครงการ (${data.adsLocation}) รายชื่อที่ได้มักมีความประสงค์จะซื้อบ้านในทำเลนี้จริง (High Intent)`);
    } else {
      targetAdvice.push(`กลยุทธ์ข้ามเขต: การยิงแอดที่ "${data.adsLocation}" ซึ่งห่างจากที่ตั้งโครงการที่ "${currentProject.location}" อาจได้คนทักเยอะแต่ต้องเช็ค "การเดินทางมาโครงการ" ของลูกค้าให้ดี`);
    }

    // 4. Efficiency Logic
    if (cpaStatus === 'bad') {
      botAdvice.push(`CPA สูงเกินเกณฑ์ (฿${formatMoney(cpa)}): ต้นทุนรายชื่อแพงกว่ามาตรฐาน ${objText} (${highCpa} บาท) อาจต้องทบทวนว่าราคาบ้านในทำเล ${currentProject.name} สอดคล้องกับกำลังซื้อในโซน ${data.adsLocation} หรือไม่`);
    } else {
      botAdvice.push(`CPA ยอดเยี่ยม (฿${formatMoney(cpa)}): ประสิทธิภาพสูงมาก ได้รายชื่อผู้สนใจในราคาที่ต่ำกว่าค่าเฉลี่ยตลาด`);
    }

    let overallVerdict = cpaStatus === 'bad' ? `แคมเปญในโซน "${data.adsLocation}" ยังไม่ตอบโจทย์ความคุ้มค่า ต้องเร่งปรับจูนกลุ่มเป้าหมายหรือความน่าสนใจของภาพ` : `แคมเปญทำงานได้ดีเยี่ยม เชื่อมโยงทำเลโครงการกับพื้นที่ยิงแอดได้อย่างมีประสิทธิภาพ`;

    return { 
      metrics: calculatedMetrics, 
      analysis: { 
        topFunnel: topAdvice, 
        midFunnel: midAdvice, 
        botFunnel: botAdvice, 
        targetFeedback: targetAdvice,
        overall: overallVerdict, 
        hasIssue: cpaStatus === 'bad' || ctrStatus === 'bad' 
      } 
    };
  };

  const handleManualSave = () => {
    if (!inputs.campaignName.trim()) { alert("กรุณาตั้งชื่อแคมเปญ"); return; }
    if (!inputs.spend || !inputs.impressions) { alert("กรุณากรอกข้อมูลตัวเลขสถิติ"); return; }

    const res = calculateResults(inputs);
    if (res) {
      const newId = activeId || Date.now().toString();
      const newCampaign = { 
        id: newId, 
        date: new Date().toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' }),
        inputs: { ...inputs, projectId: selectedProjectId, projectName: currentProject.name }, 
        metrics: res.metrics, 
        analysis: res.analysis 
      };
      
      setSavedCampaigns(prev => {
        const exists = prev.find(c => c.id === newId);
        if (exists) return prev.map(c => c.id === newId ? newCampaign : c);
        return [newCampaign, ...prev];
      });

      setActiveId(newId);
      setMetrics(res.metrics); 
      setAnalysis(res.analysis);
      alert("บันทึกข้อมูลและอัปเดตประวัติแคมเปญเรียบร้อยแล้ว");
    }
  };

  const handleNewCampaign = (pId = selectedProjectId) => {
    const proj = projects.find(p => p.id === pId);
    setActiveId(null); 
    setInputs({ 
      ...defaultInputs, 
      campaignName: '', 
      projectId: pId, 
      projectName: proj?.name || 'แคมเปญใหม่',
      adsLocation: 'รัศมี 10 กม. รอบโครงการ' // ตั้งค่าตั้งต้นสำหรับการยิง Ads
    });
    setMetrics(null); 
    setAnalysis(null); 
    setViewMode('analyze');
  };

  const handleProjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === 'NEW') {
      const n = prompt("ชื่อโครงการใหม่:");
      const loc = prompt("พื้นที่/ทำเลโครงการ (เช่น ต.นิคมพัฒนา จ.ระยอง):");
      if (n && n.trim()) { 
        const newProj = { id: Date.now().toString(), name: n.trim(), location: loc || '' };
        setProjects(p => [...p, newProj]); 
        setSelectedProjectId(newProj.id); 
        handleNewCampaign(newProj.id); 
      }
    } else { 
      setSelectedProjectId(val); 
      handleNewCampaign(val); 
    }
  };

  const handleEditProject = () => {
    const newName = prompt("แก้ไขชื่อโครงการ:", currentProject.name);
    const newLoc = prompt("แก้ไขพื้นที่/ที่ตั้งโครงการจริง:", currentProject.location);
    if (newName && newName.trim()) {
      setProjects(prev => prev.map(p => p.id === selectedProjectId ? { ...p, name: newName.trim(), location: newLoc || '' } : p));
      setInputs((prev: any) => ({ ...prev, projectName: newName.trim() }));
    }
  };

  const handleLoadCampaign = (c: any) => {
    setActiveId(c.id); 
    setInputs(c.inputs); 
    setMetrics(c.metrics); 
    setAnalysis(c.analysis); 
    setViewMode('analyze');
  };

  const handleDeleteCampaign = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("ลบแคมเปญนี้ออกจากประวัติ?")) {
      setSavedCampaigns(p => p.filter(c => c.id !== id));
      if (activeId === id) handleNewCampaign();
    }
  };

  const formatMoney = (num: number) => Math.round(num || 0).toLocaleString('th-TH');
  const formatDecimal = (num: number) => (num || 0).toFixed(2);
  const formatDate = (s: string) => s ? s.split('-').reverse().join('/') : '-';
  
  const getStatusColor = (status: string) => {
    if (status === 'good') return 'bg-emerald-50 border-emerald-200 text-emerald-800';
    if (status === 'warning') return 'bg-amber-50 border-amber-200 text-amber-800';
    return 'bg-rose-50 border-rose-200 text-rose-800';
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 text-slate-800 font-sans selection:bg-blue-100">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200/60 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-blue-600 p-3 rounded-2xl shadow-lg shadow-blue-200">
              <Calculator className="text-white w-6 h-6"/>
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-800 tracking-tight italic uppercase">Ads Analyzer <span className="text-blue-600">Pro</span></h1>
              <div className="flex items-center gap-2">
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Real Estate Marketing Hub</p>
                 {autoSaveStatus === 'saving' && <span className="flex items-center gap-1 text-[9px] font-bold text-blue-500 animate-pulse uppercase"><RefreshCw className="w-2 h-2 animate-spin"/> Saving...</span>}
                 {autoSaveStatus === 'saved' && <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-500 uppercase"><CheckCircle className="w-2.5 h-2.5"/> Auto-saved</span>}
              </div>
            </div>
          </div>
          
          <div className="flex gap-3">
            <div className="flex items-center gap-1 bg-slate-100 border border-slate-200 rounded-2xl pl-4 pr-2 py-2 hover:bg-white transition-colors">
              <Building className="w-4 h-4 text-blue-600 mr-1"/>
              <select value={selectedProjectId} onChange={handleProjectChange} className="bg-transparent text-slate-700 font-bold text-sm focus:outline-none cursor-pointer">
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                <option value="NEW" className="text-blue-600">+ เพิ่มโครงการใหม่...</option>
              </select>
              <button onClick={handleEditProject} className="p-1 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-blue-600 transition-all" title="แก้ไขพิกัด/ชื่อโครงการ">
                 <Edit2 className="w-3 h-3"/>
              </button>
            </div>
            <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
              <button onClick={() => setViewMode('analyze')} className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${viewMode === 'analyze' ? 'bg-white shadow-md text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>กรอกข้อมูล</button>
              <button onClick={() => setViewMode('compare')} className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${viewMode === 'compare' ? 'bg-white shadow-md text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>เปรียบเทียบ</button>
            </div>
          </div>
        </div>

        {viewMode === 'analyze' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Input Column */}
            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 space-y-6 overflow-hidden relative">
              <div className="space-y-2 pt-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Campaign History</label>
                <select 
                  value={activeId || 'NEW'} 
                  onChange={(e) => e.target.value === 'NEW' ? handleNewCampaign() : handleLoadCampaign(activeCampaigns.find(c => c.id === e.target.value))}
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 cursor-pointer transition-all"
                >
                  <option value="NEW">✨ + สร้างแคมเปญใหม่</option>
                  {activeCampaigns.map(c => <option key={c.id} value={c.id}>{c.inputs.campaignName} ({formatDate(c.inputs.dataAsOfDate)})</option>)}
                </select>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Campaign Details</label>
                  <input type="text" name="campaignName" value={inputs.campaignName} onChange={handleChange} placeholder="ชื่อแคมเปญ" className="w-full p-3.5 border border-slate-200 rounded-2xl text-sm font-bold bg-blue-50/30 focus:bg-white transition-all outline-none"/>
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <div className="space-y-1">
                       <p className="text-[9px] font-bold text-slate-400 uppercase ml-1">Report Date</p>
                       <input type="date" name="dataAsOfDate" value={inputs.dataAsOfDate} onChange={handleChange} className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-bold bg-slate-50"/>
                    </div>
                    <div className="space-y-1">
                       <p className="text-[9px] font-bold text-slate-400 uppercase ml-1">Ads Goal</p>
                       <select name="objective" value={inputs.objective} onChange={handleChange} className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-bold bg-white">
                          <option value="chat">Messenger</option>
                          <option value="form">Lead Form</option>
                       </select>
                    </div>
                  </div>
                </div>

                {/* Location Comparison Section */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-4">
                  <div className="flex items-center justify-between">
                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><MapPin className="w-3 h-3"/> Location Mapping</p>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="space-y-1 p-2.5 bg-white border border-slate-200 rounded-xl">
                       <p className="text-[9px] font-black text-blue-600 uppercase tracking-tighter">1. Project Location (พิกัดโครงการจริง)</p>
                       <p className="text-xs font-bold text-slate-700 truncate">{currentProject.location}</p>
                    </div>
                    
                    <div className="space-y-1">
                       <p className="text-[9px] font-black text-rose-500 uppercase tracking-tighter">2. Ads Targeting Area (พื้นที่ปักหมุดยิง Ads)</p>
                       <input 
                         type="text" 
                         name="adsLocation" 
                         value={inputs.adsLocation} 
                         onChange={handleChange} 
                         placeholder="เช่น ระยอง รัศมี 10 กม..." 
                         className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-bold bg-rose-50/30 focus:bg-white outline-none focus:ring-2 focus:ring-rose-200"
                       />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1">
                       <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Age Range</span>
                       <input type="text" name="targetAge" value={inputs.targetAge} onChange={handleChange} placeholder="25-45" className="p-2.5 border border-slate-200 rounded-xl text-xs bg-white font-bold"/>
                    </div>
                    <div className="flex flex-col gap-1">
                       <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Interests</span>
                       <input type="text" name="targetInterests" value={inputs.targetInterests} onChange={handleChange} placeholder="สินเชื่อบ้าน..." className="p-2.5 border border-slate-200 rounded-xl text-xs bg-white font-bold"/>
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Ads Results</label>
                  <div className="grid grid-cols-2 gap-3 bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
                    <div className="space-y-1">
                      <p className="text-[9px] font-bold text-slate-500 uppercase">Meta Leads</p>
                      <input type="number" name="metaLeads" value={inputs.metaLeads} onChange={handleChange} className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-black text-slate-700"/>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] font-bold text-blue-600 uppercase">Form Leads</p>
                      <input type="number" name="formLeads" value={inputs.formLeads} onChange={handleChange} className="w-full p-2.5 border border-blue-200 rounded-xl text-sm font-black text-blue-700"/>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <p className="text-[9px] font-bold text-slate-400 uppercase ml-1">Spend (THB)</p>
                    <input type="number" name="spend" value={inputs.spend} onChange={handleChange} className="w-full p-3 border border-slate-200 rounded-2xl text-sm font-bold"/>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] font-bold text-slate-400 uppercase ml-1">Impressions</p>
                    <input type="number" name="impressions" value={inputs.impressions} onChange={handleChange} className="w-full p-3 border border-slate-200 rounded-2xl text-sm font-bold"/>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] font-bold text-slate-400 uppercase ml-1">Reach</p>
                    <input type="number" name="reach" value={inputs.reach} onChange={handleChange} className="w-full p-3 border border-slate-200 rounded-2xl text-sm font-bold"/>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] font-bold text-slate-400 uppercase ml-1">Clicks</p>
                    <input type="number" name="clicks" value={inputs.clicks} onChange={handleChange} className="w-full p-3 border border-slate-200 rounded-2xl text-sm font-bold"/>
                  </div>
                </div>
              </div>

              <div className="border-2 border-dashed border-slate-200 p-6 rounded-3xl text-center relative cursor-pointer hover:bg-slate-50 transition-all bg-slate-50/50 group">
                <input type="file" onChange={(e) => handleImageUpload(e, 'adImage')} className="absolute inset-0 opacity-0 cursor-pointer z-10"/>
                {inputs.adImage ? (
                  <img src={inputs.adImage as string} className="max-h-40 mx-auto object-cover rounded-2xl shadow-xl border-4 border-white" />
                ) : (
                  <div className="py-4 space-y-2">
                    <ImageIcon className="text-slate-300 w-8 h-8 mx-auto"/>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-tight">Upload Creative</p>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  onClick={handleManualSave} 
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-black shadow-xl shadow-blue-100 flex justify-center items-center gap-2 transition-all text-[11px] uppercase tracking-widest active:scale-95"
                >
                  <Save className="w-4 h-4"/> บันทึกข้อมูล
                </button>
              </div>

              {activeId && (
                <button onClick={(e) => handleDeleteCampaign(activeId, e)} className="w-full text-[9px] text-rose-400 hover:text-rose-600 flex justify-center items-center gap-1 py-1 font-black uppercase tracking-widest transition-colors">
                  <Trash2 className="w-3 h-3"/> Delete from History
                </button>
              )}
            </div>

            {/* Results Column */}
            <div className="lg:col-span-2 space-y-6">
              {metrics && analysis ? (
                <>
                  {/* Verdict Banner */}
                  <div className={`p-6 rounded-[2rem] border-2 flex items-start gap-5 shadow-lg animate-in zoom-in duration-500 ${analysis.hasIssue ? 'bg-rose-50 border-rose-100 text-rose-900 shadow-rose-100/50' : 'bg-emerald-50 border-emerald-100 text-emerald-900 shadow-emerald-100/50'}`}>
                    <div className={`p-3 rounded-2xl ${analysis.hasIssue ? 'bg-rose-100' : 'bg-emerald-100'}`}>
                      {analysis.hasIssue ? <AlertTriangle className="w-6 h-6 text-rose-600"/> : <CheckCircle className="w-6 h-6 text-emerald-600"/>}
                    </div>
                    <div>
                      <h3 className="font-black text-xl leading-none mb-2 uppercase italic tracking-tight">Campaign Verdict</h3>
                      <p className="text-sm font-bold opacity-75 leading-relaxed">{analysis.overall}</p>
                    </div>
                  </div>

                  {/* Metrics Dashboard */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { label: 'CPA (ต้นทุน)', value: `฿${formatMoney(metrics.cpa)}`, status: metrics.cpaStatus, sub: inputs.objective === 'chat' ? 'Per Chat' : 'Per Lead Form' },
                      { label: 'CTR (ความสนใจ)', value: `${formatDecimal(metrics.ctr)}%`, status: metrics.ctrStatus, sub: 'Click-through' },
                      { label: 'Freq (ความถี่)', value: formatDecimal(metrics.frequency), status: metrics.freqStatus, sub: 'Ad Repeat' },
                      { label: 'CPM (การแข่งขัน)', value: `฿${formatMoney(metrics.cpm)}`, status: metrics.cpmStatus, sub: 'Per 1K Views' }
                    ].map((item, idx) => (
                      <div key={idx} className={`p-6 rounded-3xl border-2 shadow-sm flex flex-col items-center transition-all hover:scale-105 ${getStatusColor(item.status)}`}>
                        <p className="text-[9px] font-black uppercase tracking-widest opacity-50 mb-2">{item.label}</p>
                        <p className="text-3xl font-black italic tracking-tighter mb-0.5">{item.value}</p>
                        <p className="text-[9px] font-bold opacity-40 uppercase tracking-tighter">{item.sub}</p>
                      </div>
                    ))}
                  </div>

                  <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl space-y-8 relative overflow-hidden">
                    <h3 className="font-black text-2xl flex items-center gap-3 text-slate-800 italic uppercase tracking-tighter border-b border-slate-50 pb-6">
                      <Info className="text-blue-500 w-7 h-7"/> Portfolio Analysis & Insights
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                      <div className="space-y-6">
                        <div className="flex items-center gap-2 font-black text-indigo-600 text-[11px] uppercase tracking-widest italic bg-indigo-50 px-3 py-1.5 rounded-full w-fit">
                          <BarChart2 className="w-3.5 h-3.5"/> Data Performance
                        </div>
                        <div className="space-y-6 text-sm text-slate-600 pl-4 border-l-4 border-indigo-100">
                          {analysis.botFunnel.map((t:any, i:any) => (
                            <div key={i} className="space-y-1">
                              <p className="font-black text-slate-800 flex items-start gap-2 italic uppercase text-xs">
                                <ChevronRight className="w-4 h-4 shrink-0 text-indigo-400 mt-0.5"/> Logic / Efficiency
                              </p>
                              <p className="font-medium leading-relaxed pl-6 text-slate-600">{t}</p>
                            </div>
                          ))}
                          {analysis.topFunnel.map((t:any, i:any) => (
                            <div key={i} className="space-y-1">
                              <p className="font-black text-slate-800 flex items-start gap-2 italic uppercase text-xs">
                                <ChevronRight className="w-4 h-4 shrink-0 text-indigo-400 mt-0.5"/> Funnel Rationale
                              </p>
                              <p className="font-medium leading-relaxed pl-6 text-slate-600">{t}</p>
                            </div>
                          ))}
                        </div>

                        <div className="flex items-center gap-2 font-black text-emerald-600 text-[11px] uppercase tracking-widest italic bg-emerald-50 px-3 py-1.5 rounded-full w-fit mt-8">
                          <Target className="w-3.5 h-3.5"/> Location Synergy
                        </div>
                        <div className="space-y-4 text-sm text-slate-600 pl-4 border-l-4 border-emerald-100">
                          <div className="bg-white p-4 rounded-2xl border border-slate-100 mb-2">
                             <p className="text-[10px] font-black text-slate-400 uppercase mb-2">📍 Comparison Result</p>
                             <div className="grid grid-cols-1 gap-3">
                                <div className="flex flex-col gap-0.5">
                                   <span className="text-[9px] font-bold text-blue-500 uppercase">Project @</span>
                                   <span className="text-xs font-black text-slate-700">{currentProject.location}</span>
                                </div>
                                <div className="flex flex-col gap-0.5 border-t pt-2">
                                   <span className="text-[9px] font-bold text-rose-500 uppercase">Ads Targeting @</span>
                                   <span className="text-xs font-black text-slate-700">{inputs.adsLocation}</span>
                                </div>
                             </div>
                             <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
                                {analysis.targetFeedback.map((t:any, i:any) => (
                                  <p key={i} className="text-xs font-bold text-slate-600 flex items-start gap-2"><Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5"/> {t}</p>
                                ))}
                             </div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-6">
                        <div className="flex items-center gap-2 font-black text-blue-600 text-[11px] uppercase tracking-widest italic bg-blue-50 px-3 py-1.5 rounded-full w-fit">
                          <ImageIcon className="w-3.5 h-3.5"/> Creative Feedback
                        </div>
                        <div className="space-y-6 text-sm text-slate-600 pl-4 border-l-4 border-blue-100">
                           <div className="mt-2 space-y-4">
                              {analysis.midFunnel.map((t:any, i:any) => (
                                <p key={i} className="font-medium leading-relaxed text-slate-600 italic pl-2 border-l border-slate-300">• {t}</p>
                              ))}
                           </div>
                        </div>
                        
                        <div className="mt-8 bg-slate-50 p-6 rounded-[2rem] border border-slate-100 space-y-4">
                           <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><HelpCircle className="w-3 h-3"/> Real Estate Benchmarks</h4>
                           <ul className="text-[10px] font-bold text-slate-500 space-y-2">
                              <li className="flex justify-between items-center bg-white p-2 rounded-lg"><span>Standard CPA ({inputs.objective}):</span> <span className="text-blue-600 font-black">{inputs.objective === 'chat' ? '< 400 THB' : '< 1,200 THB'}</span></li>
                              <li className="flex justify-between items-center bg-white p-2 rounded-lg"><span>Good Click Rate:</span> <span className="text-slate-800 font-black">&gt; 1.00%</span></li>
                           </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="bg-white p-32 rounded-[3rem] border-4 border-dashed border-slate-100 flex flex-col items-center justify-center text-center opacity-30">
                  <Map className="w-24 h-24 text-slate-300 mb-8"/>
                  <h3 className="text-2xl font-black text-slate-400 uppercase tracking-widest italic">Mapping Data...</h3>
                  <p className="text-sm font-bold text-slate-300 mt-4 max-w-xs mx-auto">กรอกข้อมูลพื้นที่ยิงแอดและตัวเลขเพื่อเปรียบเทียบกับพิกัดโครงการจริง</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Compare Board (Leaderboard View) */
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden group">
                  <div className="absolute -right-8 -bottom-8 opacity-10 group-hover:scale-110 group-hover:-rotate-12 transition-all duration-700"><BarChart2 className="w-48 h-48"/></div>
                  <h3 className="text-blue-400 font-black text-xs mb-1 uppercase tracking-widest italic">Total Ad Spend</h3>
                  <div className="text-5xl font-black italic tracking-tighter group-hover:text-blue-400 transition-colors">฿{formatMoney(activeCampaigns.reduce((sum, c) => sum + (c.inputs.spend || 0), 0))}</div>
                  <p className="text-slate-500 text-[10px] mt-4 font-black uppercase tracking-widest flex items-center gap-2"><Building className="w-3 h-3"/> {currentProject.name} | {activeCampaigns.length} Campaigns</p>
                </div>
                
                {activeCampaigns.length > 0 && (
                  <>
                    <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-sm flex flex-col justify-center items-center text-center hover:shadow-xl transition-all group">
                       <h3 className="text-slate-400 font-black text-[10px] mb-4 uppercase tracking-widest italic">Best CPA🏆</h3>
                       <p className="text-base font-black text-slate-800 truncate px-4 group-hover:text-blue-600 transition-colors">{activeCampaigns.reduce((p, c) => p.metrics.cpa < c.metrics.cpa ? p : c).inputs.campaignName}</p>
                       <p className="text-4xl font-black italic tracking-tighter text-emerald-600">฿{formatMoney(activeCampaigns.reduce((p, c) => p.metrics.cpa < c.metrics.cpa ? p : c).metrics.cpa)}</p>
                    </div>
                    <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-sm flex flex-col justify-center items-center text-center hover:shadow-xl transition-all group">
                       <h3 className="text-slate-400 font-black text-[10px] mb-4 uppercase tracking-widest italic">Top Click Rate👁️</h3>
                       <p className="text-base font-black text-slate-800 truncate px-4 group-hover:text-blue-600 transition-colors">{activeCampaigns.reduce((p, c) => p.metrics.ctr > c.metrics.ctr ? p : c).inputs.campaignName}</p>
                       <p className="text-4xl font-black italic tracking-tighter text-purple-600">{formatDecimal(activeCampaigns.reduce((p, c) => p.metrics.ctr > c.metrics.ctr ? p : c).metrics.ctr)}%</p>
                    </div>
                  </>
                )}
             </div>

             <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl overflow-hidden">
               <div className="bg-slate-50/80 border-b border-slate-100 p-8 flex justify-between items-center">
                 <h2 className="font-black text-xl text-slate-800 italic uppercase tracking-tighter flex items-center gap-3">
                   <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-200"><Trophy className="w-5 h-5 text-white"/></div>
                   {currentProject.name} Leaderboard
                 </h2>
               </div>
               <div className="overflow-x-auto custom-scrollbar">
                 <table className="w-full text-left text-sm border-collapse">
                   <thead className="bg-slate-50 text-slate-400 uppercase text-[10px] font-black tracking-widest">
                     <tr>
                       <th className="p-8">Visual</th>
                       <th className="p-8">Campaign Details</th>
                       <th className="p-8 text-right">Ad Spend</th>
                       <th className="p-8 text-right text-blue-600">CPA (Cost)</th>
                       <th className="p-8 text-right">CTR (%)</th>
                       <th className="p-8 text-center">Manage</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-50">
                     {activeCampaigns.map(c => (
                       <tr key={c.id} className="hover:bg-blue-50/40 transition-all group">
                         <td className="p-8">
                           <div className="w-20 h-20 rounded-[1.5rem] bg-slate-100 overflow-hidden border-4 border-white shadow-lg group-hover:scale-110 transition-transform">
                             {c.inputs.adImage ? <img src={c.inputs.adImage as string} className="w-full h-full object-cover"/> : <div className="flex items-center justify-center h-full text-slate-300"><ImageIcon className="w-6 h-6"/></div>}
                           </div>
                         </td>
                         <td className="p-8">
                           <p className="font-black text-slate-800 text-lg uppercase italic tracking-tight">{c.inputs.campaignName}</p>
                           <p className="text-[10px] text-slate-400 font-black uppercase flex items-center gap-2 mt-1"><Clock className="w-3 h-3 text-blue-500"/> Update {formatDate(c.inputs.dataAsOfDate)}</p>
                           <div className="flex items-center gap-1.5 mt-2">
                              <MapPin className="w-3 h-3 text-rose-500"/>
                              <p className="text-[9px] font-bold text-slate-500 uppercase truncate max-w-[150px]">{c.inputs.adsLocation}</p>
                           </div>
                         </td>
                         <td className="p-8 text-right font-black text-slate-600 tracking-tighter text-base">฿{formatMoney(c.inputs.spend)}</td>
                         <td className={`p-8 text-right bg-blue-50/20 group-hover:bg-blue-100/50 transition-colors`}>
                            <p className={`font-black italic tracking-tighter text-xl ${getStatusColor(c.metrics.cpaStatus).split(' ')[2]}`}>฿{formatMoney(c.metrics.cpa)}</p>
                         </td>
                         <td className="p-8 text-right font-black text-slate-800 tracking-tighter text-lg italic">{formatDecimal(c.metrics.ctr)}%</td>
                         <td className="p-8">
                           <div className="flex justify-center gap-4 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                             <button onClick={() => handleLoadCampaign(c)} className="p-3 text-blue-600 bg-white border border-slate-100 rounded-2xl shadow-sm hover:bg-blue-600 hover:text-white transition-all active:scale-90" title="Edit Data"><Eye className="w-5 h-5"/></button>
                             <button onClick={(e) => handleDeleteCampaign(c.id, e)} className="p-3 text-rose-400 bg-white border border-slate-100 rounded-2xl shadow-sm hover:bg-rose-500 hover:text-white transition-all active:scale-90" title="Delete"><Trash2 className="w-5 h-5"/></button>
                           </div>
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
