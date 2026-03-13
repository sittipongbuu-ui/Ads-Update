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

const fetchWithBackoff = async (url: string, options: any, retries = 5) => {
  const delays = [1000, 2000, 4000, 8000, 16000];
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, options);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      return await res.json();
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise(resolve => setTimeout(resolve, delays[i]));
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
  const [apiKey, setApiKey] = useState<string>(''); // เก็บ API Key
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
    if (!apiKey) throw new Error("Missing API Key");
    
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
    const mimeType = imageBase64.split(';')[0].split(':')[1];
    const base64String = imageBase64.split(',')[1];
    const prompt = `วิเคราะห์ภาพโฆษณาอสังหาฯ นี้แบบสรุปสั้นๆ (Shortcut) กระชับ ตรงประเด็น ทรงพลัง ให้ตอบตามรูปแบบนี้เท่านั้น:\n✅ สิ่งที่ดีแล้ว: [บอกจุดเด่น]\n❌ สิ่งที่ยังขาด: [บอกจุดอ่อน]\n💡 จุดที่ต้องแก้ด่วน: [บอกวิธีปรับกราฟิก]`;
    const payload = { contents: [{ role: "user", parts: [{ text: prompt }, { inlineData: { mimeType, data: base64String } }] }] };
    const result = await fetchWithBackoff(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    return result.candidates?.[0]?.content?.parts?.[0]?.text;
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
      const weakness = data.adImageAnalysis.match(/❌\s*สิ่งที่ยังขาด:\s*([^\n]+)/);
      if (weakness) midAdvice.push(`AI ตรวจพบปัญหาจากภาพ: ${weakness[1].trim()}`);
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
    if (inputs.adImage && !aiText && apiKey) {
      setIsAnalyzingImage(true);
      try { 
        aiText = await getAIImageAnalysis(inputs.adImage as string); 
      } catch (e) {
        alert("AI วิเคราะห์ภาพล้มเหลว ตรวจสอบ API Key ของคุณ");
      }
      setIsAnalyzingImage(false);
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
            <p className="text-xs text-blue-600 mb-3">กรุณากรอก API Key เพื่อใช้ฟีเจอร์วิเคราะห์รูปภาพ (ข้อมูลเก็บไว้ในเครื่องคุณเท่านั้น)</p>
            <div className="flex gap-2">
              <input 
                type="password" 
                value={apiKey} 
                onChange={(e) => setApiKey(e.target.value)} 
                placeholder="วาง API Key จาก Google AI Studio..." 
                className="flex-1 p-2.5 border border-blue-200 rounded-lg text-sm bg-white"
              />
              <button onClick={() => setShowSettings(false)} className="bg-blue-600 text-white px-6 rounded-lg text-sm font-bold">บันทึก</button>
            </div>
          </div>
        )}

        {viewMode === 'analyze' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Input Form */}
            <div className="bg-white p-6 rounded-xl shadow-sm border space-y-4">
              <div className="flex flex-col gap-2 border-b pb-4">
                <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1"><History className="w-3 h-3"/> เลือกแคมเปญ</label>
                <select 
                  value={activeId || 'NEW'} 
                  onChange={(e) => e.target.value === 'NEW' ? handleNewCampaign() : handleLoadCampaign(activeCampaigns.find(c => c.id === e.target.value))}
                  className="w-full p-2.5 bg-slate-50 border rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500"
                >
                  <option value="NEW">✨ + สร้างแคมเปญใหม่</option>
                  {activeCampaigns.map(c => <option key={c.id} value={c.id}>{c.inputs.campaignName} ({formatDate(c.inputs.dataAsOfDate)})</option>)}
                </select>
              </div>

              <div className="space-y-3">
                <input type="text" name="campaignName" value={inputs.campaignName} onChange={handleChange} placeholder="ชื่อแคมเปญ (เช่น โปรบ้านเดี่ยว สัปดาห์ 1)" className="w-full p-2.5 border rounded-lg text-sm font-bold bg-blue-50/20 focus:bg-white transition-all"/>
                
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-1">
                    <label className="text-[10px] font-bold text-slate-400">เริ่ม</label>
                    <input type="date" name="startDate" value={inputs.startDate} onChange={handleChange} className="w-full p-2 border rounded-lg text-[11px]"/>
                  </div>
                  <div className="col-span-1">
                    <label className="text-[10px] font-bold text-slate-400">สิ้นสุด</label>
                    <input type="date" name="endDate" value={inputs.endDate} onChange={handleChange} className="w-full p-2 border rounded-lg text-[11px]"/>
                  </div>
                  <div className="col-span-1">
                    <label className="text-[10px] font-bold text-blue-600">อัปเดต ณ</label>
                    <input type="date" name="dataAsOfDate" value={inputs.dataAsOfDate} onChange={handleChange} className="w-full p-2 border border-blue-200 rounded-lg text-[11px] bg-blue-50"/>
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-3">
                  <h3 className="text-[11px] font-bold text-slate-500 flex items-center gap-1"><Users className="w-3 h-3"/> เป้าหมาย (Targeting)</h3>
                  <input type="text" name="targetLocation" value={inputs.targetLocation} onChange={handleChange} placeholder="พื้นที่ปักหมุด" className="w-full p-2 border rounded-lg text-[11px]"/>
                  <div className="grid grid-cols-2 gap-2">
                    <input type="text" name="targetAge" value={inputs.targetAge} onChange={handleChange} placeholder="อายุ" className="p-2 border rounded-lg text-[11px]"/>
                    <input type="text" name="targetDemographics" value={inputs.targetDemographics} onChange={handleChange} placeholder="ประชากร" className="p-2 border rounded-lg text-[11px]"/>
                  </div>
                  <input type="text" name="targetInterests" value={inputs.targetInterests} onChange={handleChange} placeholder="ความสนใจ" className="w-full p-2 border rounded-lg text-[11px]"/>
                  <input type="text" name="targetBehaviors" value={inputs.targetBehaviors} onChange={handleChange} placeholder="พฤติกรรม" className="w-full p-2 border rounded-lg text-[11px]"/>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs pt-2">
                  <div className="col-span-2">
                    <label className="text-[10px] font-bold text-slate-400">เป้าหมาย</label>
                    <select name="objective" value={inputs.objective} onChange={handleChange} className="w-full p-2 border rounded-lg bg-white">
                      <option value="chat">ข้อความ (Messenger)</option>
                      <option value="form">ฟอร์ม (Lead Gen)</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-500">งบประมาณ</label>
                    <input type="number" name="spend" value={inputs.spend} onChange={handleChange} className="w-full p-2 border rounded-lg"/>
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-blue-600">ผลลัพธ์ (ทัก/ฟอร์ม)</label>
                    <input type="number" name="results" value={inputs.results} onChange={handleChange} className="w-full p-2 border border-blue-200 rounded-lg font-bold text-blue-600"/>
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-500">Impressions</label>
                    <input type="number" name="impressions" value={inputs.impressions} onChange={handleChange} className="w-full p-2 border rounded-lg"/>
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-500">Reach</label>
                    <input type="number" name="reach" value={inputs.reach} onChange={handleChange} className="w-full p-2 border rounded-lg"/>
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-500">Clicks</label>
                    <input type="number" name="clicks" value={inputs.clicks} onChange={handleChange} className="w-full p-2 border rounded-lg"/>
                  </div>
                </div>
              </div>

              <div className="border-2 border-dashed border-slate-200 p-6 rounded-lg text-center relative cursor-pointer hover:bg-slate-50 transition-colors bg-white">
                <input type="file" onChange={(e) => handleImageUpload(e, 'adImage')} className="absolute inset-0 opacity-0 cursor-pointer"/>
                {inputs.adImage ? (
                  <img src={inputs.adImage as string} className="max-h-32 mx-auto object-cover rounded shadow-md" />
                ) : (
                  <div className="py-2">
                    <UploadCloud className="mx-auto text-slate-300 w-10 h-10 mb-2"/>
                    <p className="text-xs font-medium text-slate-400">อัปโหลดรูป Ads</p>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <button onClick={() => handleAnalyze()} className="flex-1 bg-slate-100 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-200 transition-all text-sm">ดูผล</button>
                <button 
                  onClick={handleSave} 
                  disabled={isAnalyzingImage} 
                  className="flex-[2] bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold shadow-lg shadow-blue-100 flex justify-center items-center gap-2 transition-all disabled:opacity-70 text-sm"
                >
                  {isAnalyzingImage ? <Loader2 className="animate-spin w-4 h-4"/> : <Save className="w-4 h-4"/>} 
                  {isAnalyzingImage ? 'วิเคราะห์รูป...' : (activeId ? 'อัปเดตแคมเปญ' : 'บันทึกแคมเปญ')}
                </button>
              </div>

              {activeId && (
                <button onClick={(e) => handleDeleteCampaign(activeId, e)} className="w-full text-xs text-red-500 hover:text-red-700 flex justify-center items-center gap-1 py-1 font-medium">
                  <Trash2 className="w-3 h-3"/> ลบแคมเปญนี้
                </button>
              )}
            </div>

            {/* Results Area */}
            <div className="lg:col-span-2 space-y-5">
              {metrics && analysis ? (
                <>
                  <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4">
                    <div className="flex-1 space-y-1.5">
                      <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1"><Users className="w-4 h-4"/> ข้อมูลเป้าหมาย</div>
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-sm h-[120px] overflow-y-auto">
                        <div className="border-b border-slate-200 pb-2 mb-2">
                          <span className="font-bold text-slate-800 block">{inputs.campaignName || 'ไม่ได้ตั้งชื่อ'}</span>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-[10px] text-slate-500 flex items-center gap-1"><Calendar className="w-3 h-3"/> {formatDate(inputs.startDate)} - {formatDate(inputs.endDate)}</span>
                            <span className="text-[10px] font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 flex items-center gap-1"><Clock className="w-3 h-3"/> อัปเดต: {formatDate(inputs.dataAsOfDate)}</span>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 gap-1 text-[11px] text-slate-600">
                          <div className="flex"><span className="font-semibold w-[70px] text-slate-700 shrink-0">พื้นที่:</span> <span className="truncate">{inputs.targetLocation || '-'}</span></div>
                          <div className="flex"><span className="font-semibold w-[70px] text-slate-700 shrink-0">อายุ:</span> <span>{inputs.targetAge || '-'}</span></div>
                          <div className="flex"><span className="font-semibold w-[70px] text-slate-700 shrink-0">ความสนใจ:</span> <span className="truncate">{inputs.targetInterests || '-'}</span></div>
                        </div>
                      </div>
                    </div>
                    <div className="flex shrink-0">
                      <div className="w-[120px] h-[120px] bg-slate-100 rounded-lg border border-slate-200 overflow-hidden flex flex-col items-center justify-center relative shadow-inner">
                        {inputs.adImage ? <img src={inputs.adImage as string} className="w-full h-full object-cover" /> : <div className="text-center p-2"><ImageIcon className="w-6 h-6 text-slate-300 mx-auto mb-1"/><span className="text-[10px] text-slate-400">ไม่มีรูป Ads</span></div>}
                        <div className="absolute bottom-0 left-0 right-0 bg-slate-800/80 text-white text-[10px] text-center py-0.5">ชิ้นงาน Ads</div>
                      </div>
                    </div>
                  </div>

                  <div className={`p-4 rounded-xl border flex gap-4 shadow-sm ${analysis.hasIssue ? 'bg-red-50 border-red-100 text-red-800' : 'bg-emerald-50 border-emerald-100 text-emerald-800'}`}>
                    <div className="mt-1">{analysis.hasIssue ? <AlertTriangle className="w-5 h-5"/> : <CheckCircle className="w-5 h-5"/>}</div>
                    <div>
                      <h3 className="font-bold leading-none mb-1">บทสรุปประสิทธิภาพ</h3>
                      <p className="text-sm opacity-90 leading-relaxed">{analysis.overall}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className={`p-4 rounded-xl border shadow-sm text-center ${getStatusColor(metrics.cpaStatus)}`}>
                      <div className="text-[10px] uppercase font-bold opacity-60 mb-1 flex justify-between items-center">CPA <StatusIcon status={metrics.cpaStatus}/></div>
                      <p className="text-xl font-bold">฿{formatMoney(metrics.cpa)}</p>
                    </div>
                    <div className={`p-4 rounded-xl border shadow-sm text-center ${getStatusColor(metrics.ctrStatus)}`}>
                      <div className="text-[10px] uppercase font-bold opacity-60 mb-1 flex justify-between items-center">CTR <StatusIcon status={metrics.ctrStatus}/></div>
                      <p className="text-xl font-bold">{formatDecimal(metrics.ctr)}%</p>
                    </div>
                    <div className={`p-4 rounded-xl border shadow-sm text-center ${getStatusColor(metrics.freqStatus)}`}>
                      <div className="text-[10px] uppercase font-bold opacity-60 mb-1 flex justify-between items-center">FREQ <StatusIcon status={metrics.freqStatus}/></div>
                      <p className="text-xl font-bold">{formatDecimal(metrics.frequency)}</p>
                    </div>
                    <div className={`p-4 rounded-xl border shadow-sm text-center ${getStatusColor(metrics.cpmStatus)}`}>
                      <div className="text-[10px] uppercase font-bold opacity-60 mb-1 flex justify-between items-center">CPM <StatusIcon status={metrics.cpmStatus}/></div>
                      <p className="text-xl font-bold">฿{formatMoney(metrics.cpm)}</p>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm space-y-6">
                    <h3 className="font-bold text-lg flex items-center gap-2 border-b border-slate-50 pb-3 text-slate-800">
                      <Info className="text-blue-500 w-5 h-5"/> คำแนะนำเชิงลึก (AI & Data Analysis)
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 font-bold text-indigo-600 text-sm">
                          <BarChart2 className="w-4 h-4"/> วิเคราะห์ตัวเลข
                        </div>
                        <div className="space-y-2 text-sm text-slate-600 pl-4 border-l-2 border-slate-100">
                          {analysis.botFunnel.map((t:any, i:any) => <p key={i}>• {t}</p>)}
                          {analysis.topFunnel.map((t:any, i:any) => <p key={i}>• {t}</p>)}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center gap-2 font-bold text-blue-600 text-sm">
                          <ImageIcon className="w-4 h-4"/> วิเคราะห์งานภาพ
                        </div>
                        <div className="space-y-2 text-sm text-slate-600 pl-4 border-l-2 border-slate-100">
                          {analysis.midFunnel.map((t:any, i:any) => <p key={i}>• {t}</p>)}
                        </div>
                      </div>
                    </div>

                    {inputs.adImageAnalysis && (
                      <div className="bg-purple-50 p-5 rounded-xl border border-purple-100 shadow-inner mt-4 animate-in fade-in duration-500">
                        <h4 className="font-bold text-purple-800 flex items-center gap-2 mb-3 text-sm">
                          <Sparkles className="w-4 h-4"/> บทวิจารณ์จาก AI (Shortcut Review)
                        </h4>
                        <div className="text-sm text-purple-900 leading-relaxed whitespace-pre-wrap font-medium">
                          {inputs.adImageAnalysis}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="bg-white p-20 rounded-2xl border border-dashed border-slate-200 flex flex-col items-center justify-center text-center opacity-60">
                  <Calculator className="w-16 h-16 text-slate-200 mb-4"/>
                  <h3 className="text-lg font-bold text-slate-400">กรอกข้อมูลและกดบันทึกเพื่อดูผลวิเคราะห์</h3>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in duration-300">
             {/* Comparison Table */}
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl p-5 text-white shadow-md">
                  <h3 className="text-blue-100 font-medium text-xs mb-1 uppercase tracking-wider">งบโฆษณารวม</h3>
                  <div className="text-2xl font-bold">฿{formatMoney(activeCampaigns.reduce((sum, c) => sum + c.inputs.spend, 0))}</div>
                  <div className="text-blue-200 text-[10px] mt-2 italic">จากทั้งหมด {activeCampaigns.length} แคมเปญ ใน {selectedProject}</div>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm text-center">
                   <h3 className="text-slate-400 font-bold text-xs mb-1 uppercase tracking-wider">แชมเปี้ยนต้นทุนถูกที่สุด</h3>
                   {activeCampaigns.length > 0 ? (
                      <div>
                         <p className="text-sm font-bold text-slate-800 truncate">{activeCampaigns.reduce((prev, curr) => prev.metrics.cpa < curr.metrics.cpa ? prev : curr).inputs.campaignName}</p>
                         <p className="text-xl font-bold text-green-600 mt-1">฿{formatMoney(activeCampaigns.reduce((prev, curr) => prev.metrics.cpa < curr.metrics.cpa ? prev : curr).metrics.cpa)}</p>
                      </div>
                   ) : <p className="text-slate-300 italic py-2 text-sm">ไม่มีข้อมูล</p>}
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm text-center">
                   <h3 className="text-slate-400 font-bold text-xs mb-1 uppercase tracking-wider">แชมเปี้ยนภาพดึงดูดที่สุด</h3>
                   {activeCampaigns.length > 0 ? (
                      <div>
                         <p className="text-sm font-bold text-slate-800 truncate">{activeCampaigns.reduce((prev, curr) => prev.metrics.ctr > curr.metrics.ctr ? prev : curr).inputs.campaignName}</p>
                         <p className="text-xl font-bold text-purple-600 mt-1">{formatDecimal(activeCampaigns.reduce((prev, curr) => prev.metrics.ctr > curr.metrics.ctr ? prev : curr).metrics.ctr)}%</p>
                      </div>
                   ) : <p className="text-slate-300 italic py-2 text-sm">ไม่มีข้อมูล</p>}
                </div>
             </div>

             <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
               <div className="bg-slate-50 border-b p-4"><h2 className="font-bold text-sm text-slate-700">เปรียบเทียบแคมเปญในโครงการนี้</h2></div>
               <div className="overflow-x-auto">
                 <table className="w-full text-left text-sm border-collapse">
                   <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold">
                     <tr>
                       <th className="p-4">ภาพ Ads</th>
                       <th className="p-4">ชื่อแคมเปญ</th>
                       <th className="p-4 text-right">งบประมาณ</th>
                       <th className="p-4 text-right">ผลลัพธ์</th>
                       <th className="p-4 text-right text-blue-600">CPA (ต้นทุน)</th>
                       <th className="p-4 text-right">CTR</th>
                       <th className="p-4 text-center">จัดการ</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-50">
                     {activeCampaigns.map(c => (
                       <tr key={c.id} className="hover:bg-slate-50 transition-colors group">
                         <td className="p-4">
                           <div className="w-12 h-12 rounded bg-slate-100 overflow-hidden border border-slate-200">
                             {c.inputs.adImage ? <img src={c.inputs.adImage as string} className="w-full h-full object-cover"/> : <ImageIcon className="w-4 h-4 text-slate-300 m-4"/>}
                           </div>
                         </td>
                         <td className="p-4">
                           <p className="font-bold text-slate-800 leading-none mb-1">{c.inputs.campaignName}</p>
                           <p className="text-[10px] text-slate-400">ข้อมูล ณ {formatDate(c.inputs.dataAsOfDate)}</p>
                         </td>
                         <td className="p-4 text-right font-medium text-slate-600">฿{formatMoney(c.inputs.spend)}</td>
                         <td className="p-4 text-right font-bold text-slate-800">{formatMoney(c.inputs.results)}</td>
                         <td className="p-4 text-right font-bold text-blue-600 bg-blue-50/20">฿{formatMoney(c.metrics.cpa)}</td>
                         <td className="p-4 text-right font-medium text-slate-600">{formatDecimal(c.metrics.ctr)}%</td>
                         <td className="p-4">
                           <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                             <button onClick={() => handleLoadCampaign(c)} className="p-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-600 hover:text-white transition-colors" title="ดูข้อมูลนี้"><Eye className="w-4 h-4"/></button>
                             <button onClick={(e) => handleDeleteCampaign(c.id, e)} className="p-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-600 hover:text-white transition-colors" title="ลบ"><Trash2 className="w-4 h-4"/></button>
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
