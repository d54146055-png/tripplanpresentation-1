import React, { useState, useEffect } from 'react';
import ItineraryView from './components/ItineraryView';
import ExpenseSplitter from './components/ExpenseSplitter';
import SeoulExplorer from './components/SeoulExplorer';
import { Calendar, DollarSign, Map } from 'lucide-react';
import { ItineraryItem, Expense, Traveler } from './types';
import { db, TRIP_ID } from './services/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';

const INITIAL_TRAVELERS: Traveler[] = [
  { id: 'me', name: 'Me' },
  { id: 'friend1', name: 'Friend' }
];

export default function App() {
  const [activeTab, setActiveTab] = useState<'itinerary' | 'expenses' | 'map'>('itinerary');
  const [items, setItems] = useState<ItineraryItem[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [travelers] = useState<Traveler[]>(INITIAL_TRAVELERS);

  // Sync Itinerary
  useEffect(() => {
    const q = query(collection(db, "trips", TRIP_ID, "itinerary"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedItems = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ItineraryItem[];
      setItems(loadedItems);
    });
    return () => unsubscribe();
  }, []);

  // Sync Expenses
  useEffect(() => {
    const q = query(collection(db, "trips", TRIP_ID, "expenses"), orderBy("date", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedExpenses = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Expense[];
      setExpenses(loadedExpenses);
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="max-w-md mx-auto h-[100dvh] bg-[#FAFAF9] flex flex-col relative shadow-2xl overflow-hidden sm:border-x sm:border-stone-200">
      {/* Dynamic Content */}
      <main className="flex-1 h-full overflow-hidden">
        {activeTab === 'itinerary' && <ItineraryView items={items} />}
        {activeTab === 'expenses' && <ExpenseSplitter expenses={expenses} travelers={travelers} />}
        {activeTab === 'map' && <SeoulExplorer itineraryItems={items} />}
      </main>

      {/* Bottom Navigation */}
      <nav className="absolute bottom-6 left-6 right-6 bg-white/80 backdrop-blur-xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.05)] rounded-[2rem] flex justify-between items-center px-8 py-4 z-30">
        <NavButton 
          active={activeTab === 'itinerary'} 
          onClick={() => setActiveTab('itinerary')}
          icon={<Calendar className="w-5 h-5" />}
          label="Plan"
        />
        <div className="w-px h-6 bg-stone-200"></div>
        <NavButton 
          active={activeTab === 'expenses'} 
          onClick={() => setActiveTab('expenses')}
          icon={<DollarSign className="w-5 h-5" />}
          label="Budget"
        />
        <div className="w-px h-6 bg-stone-200"></div>
        <NavButton 
          active={activeTab === 'map'} 
          onClick={() => setActiveTab('map')}
          icon={<Map className="w-5 h-5" />}
          label="Explore"
        />
      </nav>
    </div>
  );
}

const NavButton = ({ active, onClick, icon, label }: any) => (
  <button 
    onClick={onClick} 
    className={`flex gap-2 items-center justify-center transition-all duration-300 ${active ? 'text-stone-800' : 'text-stone-400 hover:text-stone-500'}`}
  >
    <div className={`${active ? 'transform scale-110' : ''}`}>
      {icon}
    </div>
    {active && <span className="text-xs font-bold tracking-wide animate-fade-in">{label}</span>}
  </button>
);