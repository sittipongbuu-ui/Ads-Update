import React, { useState, useEffect } from 'react';
import { 
  Calculator, AlertTriangle, CheckCircle, Info, 
  Eye, MousePointerClick, MessageCircle,
  Image as ImageIcon, MapPin, Users, UploadCloud,
  Save, Plus, Trash2, History, Sparkles, Loader2,
  Trophy, LayoutDashboard, BarChart2, Calendar, Clock, Building, Settings, Key
} from 'lucide-react';

const today = new Date().toISOString().split('T')[0];

const defaultInputs = {
  campaignName: '',
  projectName: 'โครงการ 1',
  startDate: today,
  endDate: today,
  dataAsOfDate: today,
  objective: 'chat',
  targetLocation: 'รัศมี 10 กม. รอบโครงการ',
  targetAge: '25-45',
  targetDemographics: 'พนักงานบริษัท, สมรส',
  targetInterests: 'สินเชื่อบ้าน, อสังหาริมทรัพย์',
  targetBehaviors: 'ผู้ที่เพิ่งย้ายที่อยู่',
  adImage: null,
  adImageAnalysis: '',
  spend: 5000,
  impressions: 25000,
  reach: 12000,
  clicks: 300,
  results: 15
};

// ฟังก์ชัน Retry พร้อม Exponential Backoff ตามข้อกำหนด
const fetchWithBackoff = async (url: string, options: any, retries = 5) => {
  let delay = 1000;
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, options);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `HTTP error! status: ${res.status}`);
      }
      return await res.json();
    } catch (err: any) {
      if (i === retries - 1) throw err;
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2;
    }
  }
};

const App = () => {
  const [viewMode, setViewMode] = useState<'analyze' | 'compare'>('analyze');
  const [projects, setProjects] = useState(['โครงการ 1', 'โครงการ 2']);
  const [selectedProject, setSelectedProject] = useState('โครงการ 1');
  const [inputs, setInputs] = useState<any>({ ...defaultInputs, campaignName: 'แคมเปญทดสอบ (Demo)', projectName: 'โครงการ 1' });
  const [metrics, setMetrics] = useState<any>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [savedCampaigns, setSavedCampaigns] = useState<any[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null); 
  const [isLoaded, setIsLoaded] = useState(false);
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const [imageAnalysisError, setImageAnalysisError] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string>('AIzaSyCaTmci5JIUwfEBdTNKIa7ZUqSsDIK_YZ4'); // ใส่ Key ที่คุณให้มาเป็นค่าเริ่มต้น
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    const savedData = localStorage.getItem('realEstateCampaigns');
    const savedProjects = localStorage.getItem('realEstateProjects');
    const savedKey = localStorage.getItem('gemini_api_key');
    
    if (savedKey) setApiKey(savedKey);
    if (savedProjects) {
      try {
        const parsed = JSON.parse(savedProjects);
        if (parsed.length > 0) {
          setProjects(parsed);
          setSelectedProject(parsed[0]);
        }
      } catch (e) {}
    }
    if (savedData) {
      try { setSavedCampaigns(JSON.parse(savedData)); } catch (e) {}
    }
    setIsLoaded(true);
    handleAnalyze({ ...defaultInputs, campaignName: 'แคมเปญทดสอบ (Demo)', projectName: 'โครงการ 1' });
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('realEstateCampaigns', JSON.stringify(savedCampaigns));
      localStorage.setItem('realEstateProjects', JSON.stringify(projects));
      localStorage.setItem('gemini_api_key', apiKey);
    }
  }, [savedCampaigns, projects, isLoaded, apiKey]);

  const activeCampaigns = savedCampaigns.filter(c => c.inputs.projectName === selectedProject);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setInputs((prev: any) => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value
    }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, fieldName: string) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setInputs((prev: any) => ({ 
          ...prev, 
          [fieldName]: reader.result,
          ...(fieldName === 'adImage' ? { adImageAnalysis: '' } : {}) 
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const getAIImageAnalysis = async (imageBase64: string) => {
    if (!apiKey) throw new Error("กรุณาระบุ API Key ในส่วนการตั้งค่าก่อน");
    
    // ใช้โมเดลที่รองรับการวิเคราะห์รูปภาพ
    const modelName = "gemini-2.5-flash-preview-09-2025";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
    
    // จัดการข้อมูล Base64
    const mimeType = imageBase64.split(';')[0].split(':')[1];
    const base64Data = imageBase64.split(',')[1];

    const prompt = `ในฐานะผู้เชี่ยวชาญด้านการตลาดอสังหาริมทรัพย์ ช่วยวิเคราะห์ภาพโฆษณานี้แบบสั้นๆ (Shortcut) กระชับ ตรงประเด็น ทรงพลัง ไม่ต้องเกริ่นนำ ให้ตอบตามรูปแบบฟอร์แมตนี้เท่านั้น:
✅ สิ่งที่ดีแล้ว: [บอกจุดเด่นสั้นๆ]
❌ สิ่งที่ยังขาด: [บอกจุดอ่อนสั้นๆ]
💡 จุดที่ต้องแก้ด่วน: [บอกวิธีปรับกราฟิกหรือพาดหัวสั้นๆ เพื่อเพิ่มยอดคลิก]`;

    const payload = {
      contents: [{
        role: "user",
        parts: [
          { text: prompt },
          { inlineData: { mimeType: mimeType, data: base64Data } }
        ]
      }]
    };

    const result = await fetchWithBackoff(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const textResult = result.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textResult) throw new Error("AI ไม่สามารถสร้างคำตอบได้ โปรดตรวจสอบรูปภาพของคุณ");
    
    return textResult;
  };

  const calculateResults = (data: any) => {
    if (!data.spend || !data.results || !data.impressions) return null;
    const cpm = (data.spend / data.impressions) * 1000;
    const frequency = data.impressions / data.reach;
    const ctr = (data.clicks / data.impressions) * 100;
    const cpc = data.spend / data.clicks;
    const cpa = data.spend / data.results;

    let cpaStatus = cpa > (data.objective === 'chat' ? 400 : 1200) ? 'bad' : (cpa > (data.objective === 'chat' ? 150 : 400) ? 'warning' : 'good');
    let ctrStatus = ctr < 1.0 ? 'bad' : (ctr < 1.5 ? 'warning' : 'good');
    let freqStatus = frequency > 2.5 ? 'bad' : (frequency > 1.5 ? 'warning' : 'good');
    let cpmStatus = cpm > 300 ? 'bad' : (cpm > 150 ? 'warning' : 'good');

    const calculatedMetrics = { cpm, frequency, ctr, cpc, cpa, cpaStatus, ctrStatus, cpmStatus, freqStatus };
    const locText = data.targetLocation || 'ที่ตั้งไว้';
    const audienceText = ` "${locText} (${data.targetAge})" `;

    let topAdvice = [cpmStatus === 'bad' ? `CPM แพง: กลุ่มเป้าหมาย${audienceText}อาจแคบไป` : "การตั้งกลุ่มเป้าหมายเหมาะสมดี"];
    let midAdvice = [ctrStatus === 'bad' ? "CTR ต่ำ: รูปไม่ดึงดูด ต้องเปลี่ยนรูปด่วน" : "ชิ้นงานโฆษณาดึงดูดสายตาดี"];
    
    if (data.adImageAnalysis) {
      const weaknessMatch = data.adImageAnalysis.match(/❌\s*สิ่งที่ยังขาด:\s*([^\n]+)/);
      const suggestionMatch = data.adImageAnalysis.match(/💡\s*จุดที่ต้องแก้ด่วน:\s*([^\n]+)/);
      if (weaknessMatch) midAdvice.push(`AI วิเคราะห์ภาพ: ${weaknessMatch[1].trim()}`);
      if (suggestionMatch) midAdvice.push(`คำแนะนำ AI: ${suggestionMatch[1].trim()}`);
    }

    let botAdvice = [cpaStatus === 'bad' ? "ต้นทุนรายชื่อแพงมาก: ต้องปรับทั้งคอนเทนต์และรัศมี" : "ต้นทุนหาลูกค้าอยู่ในเกณฑ์ดี"];
    let overallVerdict = cpaStatus === 'bad' ? "แคมเปญนี้มีปัญหาที่ต้องแก้ไขด่วน!" : "แคมเปญทำงานได้ดี ควรรักษาระดับไว้";

    return { 
      metrics: calculatedMetrics, 
      analysis: { topFunnel: topAdvice, midFunnel: midAdvice, botFunnel: botAdvice, overall: overallVerdict, hasIssue: cpaStatus === 'bad' || ctrStatus === 'bad' } 
    };
  };

  const handleAnalyze = (data = inputs) => {
    const res = calculateResults(data);
    if (res) { setMetrics(res.metrics); setAnalysis(res.analysis); }
  };

  const handleSave = async () => {
    if (!inputs.campaignName.trim()) { alert("กรุณาตั้งชื่อแคมเปญก่อนบันทึก"); return; }
    
    if (!inputs.spend || !inputs.results || !inputs.impressions) { 
      alert("กรุณากรอกข้อมูลตัวเลขให้ครบก่อนบันทึก"); return; 
    }

    let aiText = inputs.adImageAnalysis;
    setImageAnalysisError(null);

    // วิเคราะห์ภาพอัตโนมัติถ้ายังไม่มีบทวิเคราะห์และมีรูปภาพ
    if (inputs.adImage && !aiText) {
      if (!apiKey) {
        alert("กรุณาใส่ API Key ที่ปุ่มฟันเฟืองก่อนเพื่อให้ AI วิเคราะห์รูปภาพ");
      } else {
        setIsAnalyzingImage(true);
        try { 
          aiText = await getAIImageAnalysis(inputs.adImage as string); 
        } catch (e: any) {
          console.error("AI Analysis Error:", e);
          setImageAnalysisError(`AI ล้มเหลว: ${e.message}`);
          // ไม่หยุดการเซฟ แต่แจ้งเตือนว่า AI พลาด
        }
        setIsAnalyzingImage(false);
      }
    }

    const updated = { ...inputs, adImageAnalysis: aiText, projectName: selectedProject };
    const res = calculateResults(updated);
    
    if (res) {
      const newId = activeId || Date.now().toString();
      const newCampaign = { 
        id: newId, 
        date: new Date().toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' }),
        inputs: updated, 
        metrics: res.metrics, 
        analysis: res.analysis 
      };
      setSavedCampaigns(prev => activeId ? prev.map(c => c.id === activeId ? newCampaign : c) : [newCampaign, ...prev]);
      setActiveId(newId);
      setInputs(updated); 
      setMetrics(res.metrics); 
      setAnalysis(res.analysis);
    }
  };

  const handleNewCampaign = (proj = selectedProject) => {
    setActiveId(null); 
    setInputs({ ...defaultInputs, campaignName: '', projectName: proj });
    setMetrics(null); 
    setAnalysis(null); 
    setViewMode('analyze');
  };

  const handleProjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === 'NEW') {
      const n = prompt("กรุณาใส่ชื่อโครงการใหม่:");
      if (n && n.trim()) { 
        setProjects(p => [...p, n.trim()]); 
        setSelectedProject(n.trim()); 
        handleNewCampaign(n.trim()); 
      }
    } else { 
      setSelectedProject(val); 
      handleNewCampaign(val); 
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
    if (confirm("คุณต้องการลบแคมเปญนี้ใช่หรือไม่?")) {
      setSavedCampaigns(p => p.filter(c => c.id !== id));
      if (activeId === id) handleNewCampaign();
    }
  };

  const formatDate = (s: string) => {
    if (!s) return '-';
    return s.split('-').reverse().join('/');
  };

  const formatMoney = (num: number) => num.toLocaleString('th-TH');
  const formatDecimal = (num: number) => num.toFixed(2);
  
  const getStatusColor = (status: string) => {
    if (status === 'good') return 'bg-green-50 border-green-200 text-green-800';
    if (status === 'warning') return 'bg-yellow-50 border-yellow-200 text-yellow-800';
    return 'bg-red-50 border-red-200 text-red-800';
  };

  const StatusIcon = ({ status }: { status: string }) => {
    if (status === 'good') return <CheckCircle className="w-4 h-4 text-green-500" />;
    if (status === 'warning') return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
    return <AlertTriangle className="w-4 h-4 text-red-500" />;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 text-slate-800 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-800"><Calculator className="text-blue-600"/> Ads Manager Pro</h1>
            <button onClick={() => setShowSettings(!showSettings)} className="p-2 bg-slate-100 rounded-full hover:bg-blue-100 transition-colors" title="ตั้งค่า API Key">
              <Settings className={`w-5 h-5 ${apiKey ? 'text-green-600' : 'text-slate-400'}`}/>
            </button>
          </div>
          <div className="flex gap-3">
            <div className="flex items-center bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5">
              <Building className="w-4 h-4 text-blue-600 mr-2"/>
              <select value={selectedProject} onChange={handleProjectChange} className="bg-transparent text-blue-800 font-bold text-sm focus:outline-none cursor-pointer">
                {projects.map(p => <option key={p} value={p}>{p}</option>)}
                <option value="NEW">+ เพิ่มโครงการใหม่...</option>
              </select>
            </div>
            <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
              <button onClick={() => setViewMode('analyze')} className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${viewMode === 'analyze' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}>วิเคราะห์</button>
              <button onClick={() => setViewMode('compare')} className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${viewMode === 'compare' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}>เปรียบเทียบ</button>
            </div>
          </div>
        </div>

        {/* AI Key Settings */}
        {showSettings && (
          <div className="bg-blue-50 border border-blue-100 p-5 rounded-xl animate-in fade-in slide-in-from-top-4 duration-300">
            <h3 className="font-bold text-blue-800 flex items-center gap-2 mb-2"><Key className="w-4 h-4"/> ตั้งค่า AI (Gemini API)</h3>
            <p className="text-xs text-blue-600 mb-3">รหัสนี้ใช้สำหรับวิเคราะห์ภาพโฆษณาของคุณ (บันทึกไว้ในเครื่องคุณเท่านั้น)</p>
            <div className="flex gap-2">
              <input 
                type="password" 
                value={apiKey} 
                onChange={(e) => setApiKey(e.target.value)} 
                placeholder="วาง API Key ที่นี่..." 
                className="flex-1 p-2.5 border border-blue-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <button onClick={() => setShowSettings(false)} className="bg-blue-600 text-white px-6 rounded-lg text-sm font-bold shadow-md hover:bg-blue-700 transition-colors">บันทึก</button>
            </div>
          </div>
        )}

        {viewMode === 'analyze' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Input Form */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 space-y-4">
              <div className="flex flex-col gap-2 border-b pb-4">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1"><History className="w-3 h-3"/> ประวัติแคมเปญ</label>
                <select 
                  value={activeId || 'NEW'} 
                  onChange={(e) => e.target.value === 'NEW' ? handleNewCampaign() : handleLoadCampaign(activeCampaigns.find(c => c.id === e.target.value))}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="NEW">✨ + สร้างแคมเปญใหม่</option>
                  {activeCampaigns.map(c => <option key={c.id} value={c.id}>{c.inputs.campaignName} ({formatDate(c.inputs.dataAsOfDate)})</option>)}
                </select>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">ชื่อแคมเปญ</label>
                  <input type="text" name="campaignName" value={inputs.campaignName} onChange={handleChange} placeholder="เช่น โปรบ้านเดี่ยว สัปดาห์ 1" className="w-full p-2.5 border border-slate-200 rounded-lg text-sm font-bold bg-blue-50/20 focus:bg-white transition-all"/>
                </div>
                
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase mb-1 block">เริ่ม</label>
                    <input type="date" name="startDate" value={inputs.startDate} onChange={handleChange} className="w-full p-2 border border-slate-200 rounded-lg text-[10px]"/>
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase mb-1 block">สิ้นสุด</label>
                    <input type="date" name="endDate" value={inputs.endDate} onChange={handleChange} className="w-full p-2 border border-slate-200 rounded-lg text-[10px]"/>
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-blue-600 uppercase mb-1 block">อัปเดต ณ</label>
                    <input type="date" name="dataAsOfDate" value={inputs.dataAsOfDate} onChange={handleChange} className="w-full p-2 border border-blue-200 rounded-lg text-[10px] bg-blue-50"/>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1"><Users className="w-3 h-3"/> กลุ่มเป้าหมาย (Targeting)</h3>
                  <input type="text" name="targetLocation" value={inputs.targetLocation} onChange={handleChange} placeholder="พื้นที่ปักหมุด" className="w-full p-2 border border-slate-200 rounded-lg text-xs"/>
                  <div className="grid grid-cols-2 gap-2">
                    <input type="text" name="targetAge" value={inputs.targetAge} onChange={handleChange} placeholder="อายุ" className="p-2 border border-slate-200 rounded-lg text-xs"/>
                    <input type="text" name="targetDemographics" value={inputs.targetDemographics} onChange={handleChange} placeholder="ประชากร" className="p-2 border border-slate-200 rounded-lg text-xs"/>
                  </div>
                  <input type="text" name="targetInterests" value={inputs.targetInterests} onChange={handleChange} placeholder="ความสนใจ" className="w-full p-2 border border-slate-200 rounded-lg text-xs"/>
                  <input type="text" name="targetBehaviors" value={inputs.targetBehaviors} onChange={handleChange} placeholder="พฤติกรรม" className="w-full p-2 border border-slate-200 rounded-lg text-xs"/>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="col-span-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">เป้าหมายแคมเปญ</label>
                    <select name="objective" value={inputs.objective} onChange={handleChange} className="w-full p-2.5 border border-slate-200 rounded-lg text-sm bg-white font-medium">
                      <option value="chat">ข้อความ (Messenger)</option>
                      <option value="form">ฟอร์ม (Lead Gen)</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase block">งบที่ใช้จริง</label>
                    <input type="number" name="spend" value={inputs.spend} onChange={handleChange} className="w-full p-2.5 border border-slate-200 rounded-lg text-sm"/>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-blue-600 uppercase block">จำนวนทัก/Lead</label>
                    <input type="number" name="results" value={inputs.results} onChange={handleChange} className="w-full p-2.5 border border-blue-200 rounded-lg text-sm font-bold text-blue-700"/>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase block">Impressions</label>
                    <input type="number" name="impressions" value={inputs.impressions} onChange={handleChange} className="w-full p-2.5 border border-slate-200 rounded-lg text-sm"/>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase block">Reach</label>
                    <input type="number" name="reach" value={inputs.reach} onChange={handleChange} className="w-full p-2.5 border border-slate-200 rounded-lg text-sm"/>
                  </div>
                  <div className="col-span-2 space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase block">จำนวนคลิกลิงก์</label>
                    <input type="number" name="clicks" value={inputs.clicks} onChange={handleChange} className="w-full p-2.5 border border-slate-200 rounded-lg text-sm"/>
                  </div>
                </div>
              </div>

              <div className="border-2 border-dashed border-slate-200 p-6 rounded-2xl text-center relative cursor-pointer hover:bg-slate-50 transition-colors bg-white group">
                <input type="file" onChange={(e) => handleImageUpload(e, 'adImage')} className="absolute inset-0 opacity-0 cursor-pointer"/>
                {inputs.adImage ? (
                  <img src={inputs.adImage as string} className="max-h-40 mx-auto object-cover rounded-xl shadow-md border border-white" />
                ) : (
                  <div className="py-4">
                    <UploadCloud className="mx-auto text-slate-300 w-12 h-12 mb-2 group-hover:text-blue-400 transition-colors"/>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter">คลิกอัปโหลดภาพโฆษณา</p>
                    <p className="text-[10px] text-slate-300 mt-1">AI จะวิเคราะห์ให้อัตโนมัติเมื่อกดบันทึก</p>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => handleAnalyze()} className="flex-1 bg-slate-100 py-3.5 rounded-xl font-bold text-slate-600 hover:bg-slate-200 transition-all text-sm shadow-sm border border-slate-200">ดูผล</button>
                <button 
                  onClick={handleSave} 
                  disabled={isAnalyzingImage} 
                  className="flex-[2] bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-blue-100 flex justify-center items-center gap-2 transition-all disabled:opacity-70 text-sm active:scale-95"
                >
                  {isAnalyzingImage ? <Loader2 className="animate-spin w-5 h-5"/> : <Save className="w-5 h-5"/>} 
                  {isAnalyzingImage ? 'AI กำลังวิเคราะห์รูป...' : (activeId ? 'อัปเดตและบันทึก' : 'บันทึกแคมเปญใหม่')}
                </button>
              </div>

              {activeId && (
                <button onClick={(e) => handleDeleteCampaign(activeId, e)} className="w-full text-[10px] text-red-400 hover:text-red-600 flex justify-center items-center gap-1 py-1 font-bold uppercase tracking-widest transition-colors">
                  <Trash2 className="w-3 h-3"/> ลบแคมเปญนี้ทิ้ง
                </button>
              )}
            </div>

            {/* Results Area */}
            <div className="lg:col-span-2 space-y-6">
              {metrics && analysis ? (
                <>
                  {/* Targeting Summary Card */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-5">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                        <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5"><Users className="w-4 h-4"/> ข้อมูลการยิงแอด</div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-400 flex items-center gap-1 font-medium"><Calendar className="w-3 h-3"/> {formatDate(inputs.startDate)} - {formatDate(inputs.endDate)}</span>
                          <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-full border border-blue-100">อัปเดต: {formatDate(inputs.dataAsOfDate)}</span>
                        </div>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-sm h-[130px] overflow-y-auto custom-scrollbar">
                        <span className="font-bold text-slate-800 text-base mb-2 block">{inputs.campaignName || 'แคมเปญไม่มีชื่อ'}</span>
                        <div className="grid grid-cols-1 gap-2 text-xs text-slate-600">
                          <div className="flex"><span className="font-bold w-[90px] text-slate-500 shrink-0">📍 พื้นที่:</span> <span className="font-medium">{inputs.targetLocation || 'ไม่ได้ระบุ'}</span></div>
                          <div className="flex"><span className="font-bold w-[90px] text-slate-500 shrink-0">👥 อายุ/ประชากร:</span> <span className="font-medium">{inputs.targetAge || '-'} | {inputs.targetDemographics || '-'}</span></div>
                          <div className="flex"><span className="font-bold w-[90px] text-slate-500 shrink-0">⭐ ความสนใจ:</span> <span className="font-medium">{inputs.targetInterests || '-'}</span></div>
                          <div className="flex"><span className="font-bold w-[90px] text-slate-500 shrink-0">⚡ พฤติกรรม:</span> <span className="font-medium">{inputs.targetBehaviors || '-'}</span></div>
                        </div>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center justify-center">
                      <div className="w-[140px] h-[140px] bg-slate-100 rounded-2xl border-2 border-slate-200 overflow-hidden flex flex-col items-center justify-center relative shadow-inner group">
                        {inputs.adImage ? (
                          <img src={inputs.adImage as string} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                        ) : (
                          <div className="text-center p-3 opacity-40"><ImageIcon className="w-8 h-8 text-slate-400 mx-auto mb-1"/><span className="text-[10px] font-bold uppercase">ไม่มีรูปภาพ</span></div>
                        )}
                        <div className="absolute bottom-0 left-0 right-0 bg-slate-900/80 backdrop-blur-sm text-white text-[9px] font-bold text-center py-1.5 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Creative Ads</div>
                      </div>
                    </div>
                  </div>

                  {/* Summary Status Banner */}
                  <div className={`p-5 rounded-2xl border-2 flex gap-4 shadow-md animate-in zoom-in duration-300 ${analysis.hasIssue ? 'bg-red-50 border-red-200 text-red-900' : 'bg-emerald-50 border-emerald-200 text-emerald-900'}`}>
                    <div className="mt-1">{analysis.hasIssue ? <AlertTriangle className="w-7 h-7 text-red-600"/> : <CheckCircle className="w-7 h-7 text-emerald-600"/>}</div>
                    <div>
                      <h3 className="font-black text-lg leading-none mb-1 uppercase italic tracking-tight">Campaign Verdict</h3>
                      <p className="text-sm font-medium opacity-80 leading-relaxed">{analysis.overall}</p>
                    </div>
                  </div>

                  {/* Metrics Dashboard */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className={`p-5 rounded-2xl border-2 shadow-sm text-center transition-all hover:scale-105 ${getStatusColor(metrics.cpaStatus)}`}>
                      <div className="text-[10px] uppercase font-black opacity-40 mb-1 flex justify-between items-center tracking-widest">CPA <StatusIcon status={metrics.cpaStatus}/></div>
                      <p className="text-2xl font-black italic">฿{formatMoney(metrics.cpa)}</p>
                      <p className="text-[9px] mt-1 font-bold opacity-40 uppercase tracking-tighter">{inputs.objective === 'chat' ? 'Cost Per Chat' : 'Cost Per Lead'}</p>
                    </div>
                    <div className={`p-5 rounded-2xl border-2 shadow-sm text-center transition-all hover:scale-105 ${getStatusColor(metrics.ctrStatus)}`}>
                      <div className="text-[10px] uppercase font-black opacity-40 mb-1 flex justify-between items-center tracking-widest">CTR <StatusIcon status={metrics.ctrStatus}/></div>
                      <p className="text-2xl font-black italic">{formatDecimal(metrics.ctr)}%</p>
                      <p className="text-[9px] mt-1 font-bold opacity-40 uppercase tracking-tighter">Click-through Rate</p>
                    </div>
                    <div className={`p-5 rounded-2xl border-2 shadow-sm text-center transition-all hover:scale-105 ${getStatusColor(metrics.freqStatus)}`}>
                      <div className="text-[10px] uppercase font-black opacity-40 mb-1 flex justify-between items-center tracking-widest">Freq <StatusIcon status={metrics.freqStatus}/></div>
                      <p className="text-2xl font-black italic">{formatDecimal(metrics.frequency)}</p>
                      <p className="text-[9px] mt-1 font-bold opacity-40 uppercase tracking-tighter">Ad Frequency</p>
                    </div>
                    <div className={`p-5 rounded-2xl border-2 shadow-sm text-center transition-all hover:scale-105 ${getStatusColor(metrics.cpmStatus)}`}>
                      <div className="text-[10px] uppercase font-black opacity-40 mb-1 flex justify-between items-center tracking-widest">CPM <StatusIcon status={metrics.cpmStatus}/></div>
                      <p className="text-2xl font-black italic">฿{formatMoney(metrics.cpm)}</p>
                      <p className="text-[9px] mt-1 font-bold opacity-40 uppercase tracking-tighter">Cost Per 1K Views</p>
                    </div>
                  </div>

                  {/* Recommendations */}
                  <div className="bg-white p-7 rounded-2xl border border-slate-100 shadow-sm space-y-8 overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-bl-full -z-10 opacity-50"></div>
                    <h3 className="font-black text-xl flex items-center gap-3 border-b border-slate-50 pb-4 text-slate-800 italic uppercase">
                      <Info className="text-blue-500 w-6 h-6"/> Deep Analysis
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 font-black text-indigo-600 text-sm uppercase tracking-widest italic">
                          <BarChart2 className="w-5 h-5"/> Number Analysis
                        </div>
                        <div className="space-y-3 text-sm text-slate-600 pl-4 border-l-4 border-indigo-100">
                          {analysis.botFunnel.map((t:any, i:any) => <p key={i} className="font-medium leading-relaxed">• {t}</p>)}
                          {analysis.topFunnel.map((t:any, i:any) => <p key={i} className="font-medium leading-relaxed">• {t}</p>)}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center gap-2 font-black text-blue-600 text-sm uppercase tracking-widest italic">
                          <ImageIcon className="w-5 h-5"/> Creative Analysis
                        </div>
                        <div className="space-y-3 text-sm text-slate-600 pl-4 border-l-4 border-blue-100">
                          {analysis.midFunnel.map((t:any, i:any) => <p key={i} className="font-medium leading-relaxed">• {t}</p>)}
                        </div>
                      </div>
                    </div>

                    {/* AI Analysis Result Section */}
                    {inputs.adImageAnalysis ? (
                      <div className="bg-purple-50 p-6 rounded-2xl border-2 border-purple-100 shadow-inner mt-6 animate-in slide-in-from-bottom-4 duration-500 overflow-hidden relative">
                        <div className="absolute top-0 right-0 p-4 opacity-10"><Sparkles className="w-20 h-20 text-purple-600"/></div>
                        <h4 className="font-black text-purple-800 flex items-center gap-2 mb-4 text-sm uppercase tracking-wider italic">
                          <Sparkles className="w-5 h-5"/> AI Visual Review (Shortcut)
                        </h4>
                        <div className="text-sm text-purple-900 leading-loose whitespace-pre-wrap font-bold bg-white/50 p-4 rounded-xl border border-purple-100 relative z-10 shadow-sm">
                          {inputs.adImageAnalysis}
                        </div>
                      </div>
                    ) : (
                      imageAnalysisError ? (
                        <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 mt-4 flex items-center gap-3 text-amber-800 text-xs font-bold">
                          <AlertTriangle className="w-4 h-4 shrink-0"/> {imageAnalysisError}
                        </div>
                      ) : (
                        inputs.adImage && !isAnalyzingImage && (
                          <div className="bg-slate-50 p-4 rounded-xl border border-dashed border-slate-200 mt-4 flex items-center justify-center gap-3 text-slate-400 text-xs font-bold italic">
                            <Sparkles className="w-4 h-4"/> AI จะเริ่มสแกนรูปภาพทันทีเมื่อคุณกดปุ่ม "บันทึก"
                          </div>
                        )
                      )
                    )}
                  </div>
                </>
              ) : (
                <div className="bg-white p-24 rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center opacity-40">
                  <Calculator className="w-20 h-20 text-slate-200 mb-6"/>
                  <h3 className="text-xl font-black text-slate-400 uppercase tracking-widest italic">กรอกข้อมูลเพื่อเริ่มต้นวิเคราะห์</h3>
                  <p className="text-sm font-medium text-slate-300 mt-2">ใส่ตัวเลขจาก Facebook Ads Manager และกดบันทึกเพื่อดูผลลัพธ์เชิงลึก</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Compare Dashboard (Leaderboard View) */
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-blue-700 to-indigo-900 rounded-3xl p-6 text-white shadow-xl shadow-blue-100 relative overflow-hidden group">
                  <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-125 transition-transform"><BarChart2 className="w-32 h-32"/></div>
                  <h3 className="text-blue-200 font-bold text-xs mb-1 uppercase tracking-widest italic">Total Ad Spend</h3>
                  <div className="text-4xl font-black italic tracking-tighter">฿{formatMoney(activeCampaigns.reduce((sum, c) => sum + (c.inputs.spend || 0), 0))}</div>
                  <div className="text-blue-300 text-[10px] mt-2 font-bold uppercase tracking-tight">โครงการ: {selectedProject} | {activeCampaigns.length} แคมเปญ</div>
                </div>
                
                <div className="bg-white border-2 border-slate-100 rounded-3xl p-6 shadow-md text-center flex flex-col justify-center transition-all hover:border-emerald-200 group">
                   <h3 className="text-slate-400 font-black text-xs mb-2 uppercase tracking-widest italic">Best CPA Champion 🏆</h3>
                   {activeCampaigns.length > 0 ? (
                      <div>
                         <p className="text-sm font-black text-slate-800 truncate mb-1">{activeCampaigns.reduce((prev, curr) => prev.metrics.cpa < curr.metrics.cpa ? prev : curr).inputs.campaignName}</p>
                         <p className="text-3xl font-black text-emerald-600 italic tracking-tighter">฿{formatMoney(activeCampaigns.reduce((prev, curr) => prev.metrics.cpa < curr.metrics.cpa ? prev : curr).metrics.cpa)}</p>
                      </div>
                   ) : <p className="text-slate-300 italic py-4 text-sm font-medium">ยังไม่มีข้อมูล</p>}
                </div>

                <div className="bg-white border-2 border-slate-100 rounded-3xl p-6 shadow-md text-center flex flex-col justify-center transition-all hover:border-purple-200 group">
                   <h3 className="text-slate-400 font-black text-xs mb-2 uppercase tracking-widest italic">Best CTR Champion 👁️</h3>
                   {activeCampaigns.length > 0 ? (
                      <div>
                         <p className="text-sm font-black text-slate-800 truncate mb-1">{activeCampaigns.reduce((prev, curr) => prev.metrics.ctr > curr.metrics.ctr ? prev : curr).inputs.campaignName}</p>
                         <p className="text-3xl font-black text-purple-600 italic tracking-tighter">{formatDecimal(activeCampaigns.reduce((prev, curr) => prev.metrics.ctr > curr.metrics.ctr ? prev : curr).metrics.ctr)}%</p>
                      </div>
                   ) : <p className="text-slate-300 italic py-4 text-sm font-medium">ยังไม่มีข้อมูล</p>}
                </div>
             </div>

             <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden">
               <div className="bg-slate-50/50 border-b border-slate-100 p-6 flex justify-between items-center">
                 <h2 className="font-black text-base text-slate-700 italic uppercase tracking-tighter flex items-center gap-2"><Trophy className="w-5 h-5 text-amber-500"/> Campaign Leaderboard</h2>
               </div>
               <div className="overflow-x-auto">
                 <table className="w-full text-left text-sm border-collapse">
                   <thead className="bg-slate-50 text-slate-400 uppercase text-[9px] font-black tracking-widest">
                     <tr>
                       <th className="p-6">Ad Creative</th>
                       <th className="p-6">Campaign Info</th>
                       <th className="p-6 text-right">Spend</th>
                       <th className="p-6 text-right">Result</th>
                       <th className="p-6 text-right text-blue-600">CPA (Cost)</th>
                       <th className="p-6 text-right">CTR (%)</th>
                       <th className="p-6 text-center">Manage</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-50">
                     {activeCampaigns.map(c => (
                       <tr key={c.id} className="hover:bg-blue-50/30 transition-all group">
                         <td className="p-6">
                           <div className="w-16 h-16 rounded-xl bg-slate-100 overflow-hidden border-2 border-white shadow-sm ring-1 ring-slate-100">
                             {c.inputs.adImage ? <img src={c.inputs.adImage as string} className="w-full h-full object-cover transition-transform group-hover:scale-125"/> : <ImageIcon className="w-4 h-4 text-slate-300 m-6"/>}
                           </div>
                         </td>
                         <td className="p-6">
                           <p className="font-black text-slate-800 text-base leading-none mb-1.5">{c.inputs.campaignName}</p>
                           <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight flex items-center gap-1.5"><Clock className="w-3 h-3"/> As of {formatDate(c.inputs.dataAsOfDate)}</p>
                         </td>
                         <td className="p-6 text-right font-bold text-slate-600">฿{formatMoney(c.inputs.spend)}</td>
                         <td className="p-6 text-right font-black text-slate-800 tracking-tighter">{formatMoney(c.inputs.results)}</td>
                         <td className={`p-6 text-right font-black italic bg-blue-50/20 tracking-tighter text-base ${getStatusColor(c.metrics.cpaStatus).split(' ')[2]}`}>฿{formatMoney(c.metrics.cpa)}</td>
                         <td className="p-6 text-right font-black text-slate-800 tracking-tighter">{formatDecimal(c.metrics.ctr)}%</td>
                         <td className="p-6">
                           <div className="flex justify-center gap-3">
                             <button onClick={() => handleLoadCampaign(c)} className="p-2.5 text-blue-600 bg-blue-50 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm active:scale-90" title="Edit Data"><Eye className="w-4 h-4"/></button>
                             <button onClick={(e) => handleDeleteCampaign(c.id, e)} className="p-2.5 text-red-400 bg-red-50 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-sm active:scale-90" title="Delete"><Trash2 className="w-4 h-4"/></button>
                           </div>
                         </td>
                       </tr>
                     ))}
                     {activeCampaigns.length === 0 && (
                       <tr>
                         <td colSpan={7} className="p-20 text-center">
                            <Calculator className="w-12 h-12 text-slate-200 mx-auto mb-4"/>
                            <p className="text-slate-400 font-black uppercase tracking-widest italic">ยังไม่มีข้อมูลในโครงการนี้</p>
                         </td>
                       </tr>
                     )}
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
