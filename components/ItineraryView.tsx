import React, { useState } from 'react';
import { ItineraryItem } from '../types';
import { Plus, MapPin, Trash2, X, Cloud, Sun, CloudRain, Sparkles, Loader2 } from 'lucide-react';
import { db, TRIP_ID } from '../services/firebase';
import { collection, addDoc, deleteDoc, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { generateDailyItinerary } from '../services/geminiService';

interface ItineraryViewProps {
  items: ItineraryItem[];
}

const DAYS = [1, 2, 3, 4, 5];

const getWeather = (time: string) => {
  const hour = parseInt(time.split(':')[0]);
  let temp = 15;
  if (hour >= 11 && hour <= 16) temp = 21;
  else if (hour > 16 && hour <= 19) temp = 18;
  else temp = 14;

  const isRainy = Math.random() > 0.8;
  const isCloudy = Math.random() > 0.5;

  if (isRainy) return { icon: <CloudRain className="w-3.5 h-3.5 text-stone-500" />, temp, text: 'Rain' };
  if (isCloudy) return { icon: <Cloud className="w-3.5 h-3.5 text-stone-400" />, temp, text: 'Cloudy' };
  return { icon: <Sun className="w-3.5 h-3.5 text-orange-400" />, temp, text: 'Sunny' };
};

export default function ItineraryView({ items }: ItineraryViewProps) {
  const [selectedDay, setSelectedDay] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAutoScheduleOpen, setIsAutoScheduleOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ItineraryItem | null>(null);
  
  // Auto Schedule State
  const [autoAreas, setAutoAreas] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Form State
  const [formData, setFormData] = useState<Partial<ItineraryItem>>({
    time: '09:00',
    type: 'activity'
  });

  const dayItems = items
    .filter(i => i.day === selectedDay)
    .sort((a, b) => a.time.localeCompare(b.time));

  // Firebase Operations
  const handleSave = async () => {
    if (!formData.title || !formData.time) return;

    const collectionRef = collection(db, "trips", TRIP_ID, "itinerary");

    try {
      if (editingItem) {
        // Update existing
        await updateDoc(doc(db, "trips", TRIP_ID, "itinerary", editingItem.id), {
           ...formData
        });
      } else {
        // Add new
        await addDoc(collectionRef, {
          day: selectedDay,
          time: formData.time,
          title: formData.title,
          location: formData.location || '',
          type: formData.type || 'activity',
          notes: formData.notes || ''
        });
      }
      closeModal();
    } catch (e) {
      console.error("Error saving to DB:", e);
      alert("Sync failed. Check console.");
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this plan?')) {
      await deleteDoc(doc(db, "trips", TRIP_ID, "itinerary", id));
    }
  };

  const handleAutoSchedule = async () => {
    if (!autoAreas.trim()) return;
    setIsGenerating(true);
    
    try {
      const generatedItems = await generateDailyItinerary(selectedDay, autoAreas);
      
      // Batch write to Firestore
      const batch = writeBatch(db);
      const collectionRef = collection(db, "trips", TRIP_ID, "itinerary");
      
      generatedItems.forEach(item => {
        const docRef = doc(collectionRef); // Generate ID
        batch.set(docRef, {
          ...item,
          day: selectedDay
        });
      });
      
      await batch.commit();
      setIsAutoScheduleOpen(false);
      setAutoAreas('');
    } catch (e) {
      console.error(e);
      alert("AI Schedule generation failed.");
    } finally {
      setIsGenerating(false);
    }
  };

  const openModal = (item?: ItineraryItem) => {
    if (item) {
      setEditingItem(item);
      setFormData(item);
    } else {
      setEditingItem(null);
      setFormData({ day: selectedDay, time: '10:00', type: 'activity' });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
    setFormData({});
  };

  const getTypeStyle = (type: string) => {
    switch (type) {
      case 'food': return 'bg-[#EADBC8] text-[#5D4037]'; 
      case 'shopping': return 'bg-[#E5E0D8] text-[#5D5C55]'; 
      case 'transport': return 'bg-[#D6D3D1] text-[#44403C]'; 
      default: return 'bg-[#F5F5F4] text-[#78716C]'; 
    }
  };

  return (
    <div className="h-full flex flex-col relative bg-[#FAFAF9]">
      {/* Header & Date Selector */}
      <div className="bg-[#FAFAF9] pt-6 pb-2 z-10 sticky top-0">
        <div className="px-6 mb-4 flex justify-between items-end">
          <div>
             <span className="text-stone-400 text-xs font-bold tracking-widest uppercase">Seoul Trip</span>
             <h2 className="text-3xl font-serif font-medium text-stone-800">Itinerary</h2>
          </div>
          <button 
            onClick={() => setIsAutoScheduleOpen(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-stone-800 to-stone-700 text-[#FAFAF9] px-4 py-2 rounded-2xl shadow-lg hover:shadow-xl transition-all"
          >
             <Sparkles className="w-4 h-4 text-yellow-200" />
             <span className="text-xs font-bold tracking-wide">AI Auto Plan</span>
          </button>
        </div>
        
        {/* Horizontal Date Slider */}
        <div className="pl-6 flex space-x-4 overflow-x-auto no-scrollbar pb-4 snap-x">
          {DAYS.map(day => (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`flex-shrink-0 snap-start flex flex-col items-center justify-center w-[72px] h-[84px] rounded-[24px] border transition-all duration-300 ${
                selectedDay === day 
                  ? 'bg-stone-800 border-stone-800 text-[#FAFAF9] shadow-lg shadow-stone-200 translate-y-0' 
                  : 'bg-white border-transparent text-stone-400 hover:bg-white hover:border-stone-200'
              }`}
            >
              <span className="text-[10px] font-bold tracking-wider opacity-60 uppercase mb-1">Day</span>
              <span className="text-2xl font-medium">{day}</span>
            </button>
          ))}
          <div className="w-2 flex-shrink-0" /> {/* Spacer */}
        </div>
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto px-6 pb-28 space-y-6">
        {dayItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-stone-300">
            <div className="w-20 h-20 border-2 border-dashed border-stone-200 rounded-full flex items-center justify-center mb-4">
              <Plus className="w-8 h-8" />
            </div>
            <p className="font-medium">No plans yet</p>
          </div>
        ) : (
          <div className="relative border-l border-stone-200 ml-3 space-y-8 my-2">
            {dayItems.map(item => {
               const weather = getWeather(item.time);
               return (
                <div key={item.id} className="relative pl-8 group">
                  {/* Timeline Dot */}
                  <div className="absolute -left-[5px] top-6 w-[11px] h-[11px] rounded-full bg-stone-300 border-2 border-[#FAFAF9] group-hover:bg-stone-800 transition-colors"></div>
                  
                  {/* Card */}
                  <div 
                    onClick={() => openModal(item)}
                    className="bg-white p-5 rounded-[24px] shadow-[0_4px_20px_-12px_rgba(0,0,0,0.05)] border border-stone-100 active:scale-[0.98] transition-transform cursor-pointer"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-stone-800 font-mono">{item.time}</span>
                        <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wide ${getTypeStyle(item.type)}`}>
                          {item.type}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-stone-50 px-2 py-1 rounded-lg border border-stone-100">
                        {weather.icon}
                        <span className="text-xs font-medium text-stone-600">{weather.temp}°</span>
                      </div>
                    </div>

                    <h3 className="text-lg font-bold text-stone-800 leading-tight mb-1">{item.title}</h3>
                    
                    {item.location && (
                      <div className="flex items-center text-stone-500 text-xs font-medium mt-2">
                        <MapPin className="w-3.5 h-3.5 mr-1.5 opacity-70" />
                        {item.location}
                      </div>
                    )}
                    {item.notes && <p className="text-stone-400 text-xs mt-3 pl-3 border-l-2 border-stone-100 italic">{item.notes}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating Button */}
      <button
        onClick={() => openModal()}
        className="absolute bottom-6 right-6 w-16 h-16 bg-stone-800 rounded-full text-[#FAFAF9] shadow-2xl flex items-center justify-center hover:bg-stone-900 active:scale-90 transition-transform z-20"
      >
        <Plus className="w-6 h-6 stroke-[3]" />
      </button>

      {/* AI Auto Schedule Modal */}
      {isAutoScheduleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
           <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" onClick={() => setIsAutoScheduleOpen(false)} />
           <div className="bg-[#FAFAF9] w-full max-w-sm rounded-[32px] p-6 relative z-10 shadow-2xl animate-fade-in-up">
              <div className="text-center mb-6">
                 <div className="w-12 h-12 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Sparkles className="w-6 h-6 text-indigo-500" />
                 </div>
                 <h3 className="text-xl font-serif font-bold text-stone-800">AI Auto Schedule</h3>
                 <p className="text-xs text-stone-400 mt-1">Plan Day {selectedDay} automatically</p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-stone-100 mb-6">
                 <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-2">Where do you want to go?</label>
                 <input 
                    type="text"
                    placeholder="e.g. Bukchon Hanok Village, Myeongdong"
                    value={autoAreas}
                    onChange={(e) => setAutoAreas(e.target.value)}
                    className="w-full bg-transparent outline-none text-stone-800 font-medium placeholder-stone-300"
                 />
              </div>

              <button 
                onClick={handleAutoSchedule}
                disabled={isGenerating}
                className="w-full py-4 bg-stone-800 text-[#FAFAF9] rounded-2xl font-bold shadow-xl hover:bg-stone-900 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                {isGenerating ? 'Generating...' : 'Create Itinerary'}
              </button>
           </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center pointer-events-none">
          <div className="absolute inset-0 bg-stone-900/20 backdrop-blur-[2px] pointer-events-auto transition-opacity" onClick={closeModal} />
          <div className="bg-[#FAFAF9] w-full max-w-md rounded-t-[32px] p-8 pointer-events-auto shadow-2xl animate-fade-in-up border-t border-white/50">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-serif font-medium text-stone-800">{editingItem ? 'Edit' : 'New Plan'}</h3>
              <button onClick={closeModal} className="p-2 bg-stone-100 rounded-full hover:bg-stone-200"><X className="w-5 h-5 text-stone-500" /></button>
            </div>
            
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-5">
                <div className="bg-white p-3 rounded-2xl border border-stone-100">
                  <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1">Time</label>
                  <input 
                    type="time" 
                    value={formData.time}
                    onChange={e => setFormData({...formData, time: e.target.value})}
                    className="w-full bg-transparent outline-none text-stone-800 font-medium"
                  />
                </div>
                <div className="bg-white p-3 rounded-2xl border border-stone-100">
                  <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1">Type</label>
                  <select 
                    value={formData.type}
                    onChange={e => setFormData({...formData, type: e.target.value as any})}
                    className="w-full bg-transparent outline-none text-stone-800 font-medium appearance-none"
                  >
                    <option value="activity">Activity</option>
                    <option value="food">Food</option>
                    <option value="shopping">Shopping</option>
                    <option value="transport">Transport</option>
                  </select>
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-stone-100">
                <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1">Place / Activity</label>
                <input 
                  type="text" 
                  value={formData.title || ''}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  className="w-full bg-transparent outline-none text-lg font-serif text-stone-800 placeholder-stone-300"
                />
              </div>

              <div className="bg-white p-4 rounded-2xl border border-stone-100">
                <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1">Location</label>
                <div className="flex items-center">
                    <MapPin className="w-4 h-4 text-stone-300 mr-2" />
                    <input 
                    type="text" 
                    value={formData.location || ''}
                    onChange={e => setFormData({...formData, location: e.target.value})}
                    className="w-full bg-transparent outline-none text-stone-600 placeholder-stone-300"
                    />
                </div>
              </div>

               <div className="bg-white p-4 rounded-2xl border border-stone-100">
                <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1">Notes</label>
                <textarea 
                  value={formData.notes || ''}
                  onChange={e => setFormData({...formData, notes: e.target.value})}
                  className="w-full bg-transparent outline-none text-stone-600 h-20 resize-none placeholder-stone-300"
                />
              </div>

              <div className="flex gap-4 pt-4">
                {editingItem && (
                   <button 
                     onClick={() => { handleDelete(editingItem.id); closeModal(); }}
                     className="w-14 flex items-center justify-center bg-stone-100 text-stone-400 rounded-2xl hover:bg-red-50 hover:text-red-400 transition-colors"
                   >
                     <Trash2 className="w-5 h-5" />
                   </button>
                )}
                <button 
                  onClick={handleSave}
                  className="flex-1 py-4 bg-stone-800 text-[#FAFAF9] rounded-2xl font-medium shadow-xl hover:bg-stone-900 transition-colors"
                >
                  Save Plan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}