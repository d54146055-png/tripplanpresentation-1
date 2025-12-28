import React, { useState, useRef } from 'react';
import { PlaceResult, ItineraryItem, RouteResult } from '../types';
import { searchPlacesInSeoul, parseItineraryFile, calculateTransportRoute } from '../services/geminiService';
import { Search, Map, Star, Navigation, Loader2, Upload, Crosshair, MapPin, List, ArrowRightLeft, Bus, Clock } from 'lucide-react';

interface SeoulExplorerProps {
  itineraryItems?: ItineraryItem[];
}

export default function SeoulExplorer({ itineraryItems = [] }: SeoulExplorerProps) {
  const [query, setQuery] = useState('');
  const [displayPlaces, setDisplayPlaces] = useState<PlaceResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [myLocation, setMyLocation] = useState<{lat: number, lng: number} | null>(null);
  
  // Route State
  const [routeStart, setRouteStart] = useState<string | null>(null);
  const [routeEnd, setRouteEnd] = useState<string | null>(null);
  const [routeResult, setRouteResult] = useState<RouteResult | null>(null);
  const [routingLoading, setRoutingLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    setLoading(true);
    // When searching, we keep itinerary items if they were merged? 
    // For simplicity, search replaces "manual search results" but we can keep pinned/itinerary ones if we separate state.
    // Here, let's just show search results. To persist itinerary, users should use "Load Itinerary" button.
    const places = await searchPlacesInSeoul(query);
    const stampedPlaces = places.map(p => ({ ...p, source: 'search' as const }));
    setDisplayPlaces(stampedPlaces);
    setLoading(false);
  };

  const handleLoadItinerary = () => {
    if (itineraryItems.length === 0) {
      alert("No itinerary items found.");
      return;
    }
    const mapped = itineraryItems.map(item => ({
      name: item.title,
      address: item.location || 'Seoul',
      rating: 0,
      day: item.day,
      source: 'itinerary' as const
    }));
    setDisplayPlaces(mapped);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setParsing(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const extractedPlaces = await parseItineraryFile(text);
      const stamped = extractedPlaces.map(p => ({ ...p, source: 'search' as const })); // Treat file upload as manual search/external
      setDisplayPlaces(prev => [...stamped, ...prev]);
      setParsing(false);
    };
    reader.readAsText(file);
  };

  const handleLocateMe = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        setMyLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
      }, (error) => {
        alert("Unable to retrieve your location");
      });
    } else {
      alert("Geolocation is not supported by this browser.");
    }
  };

  const handleCalculateRoute = async () => {
    if (!routeStart || !routeEnd) return;
    setRoutingLoading(true);
    const result = await calculateTransportRoute(routeStart, routeEnd);
    setRouteResult(result);
    setRoutingLoading(false);
  };

  const quickSearches = ['Hannam-dong Cafe', 'Seongsu Pop-up', 'Bukchon Hanok', 'Garosu-gil Shopping'];

  return (
    <div className="h-full flex flex-col bg-[#FAFAF9]">
      <div className="px-6 pt-6 pb-4 z-10 sticky top-0 bg-[#FAFAF9]/95 backdrop-blur-sm shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <div>
            <span className="text-stone-400 text-xs font-bold tracking-widest uppercase">Map</span>
            <h2 className="text-3xl font-serif font-medium text-stone-800">Explore</h2>
          </div>
          <div className="flex gap-2">
             <button 
              onClick={handleLoadItinerary}
              className="p-3 bg-stone-100 text-stone-600 rounded-full shadow-md hover:bg-stone-200 transition-colors relative"
              title="Load My Itinerary"
            >
               <List className="w-5 h-5" />
               {itineraryItems.length > 0 && <span className="absolute top-0 right-0 w-3 h-3 bg-red-400 rounded-full border-2 border-[#FAFAF9]"></span>}
            </button>
            <button 
              onClick={handleLocateMe}
              className={`p-3 rounded-full shadow-md transition-all ${myLocation ? 'bg-indigo-500 text-white' : 'bg-white text-stone-600'}`}
            >
              <Crosshair className="w-5 h-5" />
            </button>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="p-3 bg-stone-800 text-white rounded-full shadow-md hover:bg-stone-700 transition-colors relative"
            >
               {parsing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              accept=".txt" 
              className="hidden" 
            />
          </div>
        </div>
        
        <form onSubmit={handleSearch} className="relative group">
          <Search className="absolute left-4 top-4 text-stone-400 w-5 h-5 group-focus-within:text-stone-600 transition-colors" />
          <input 
            type="text" 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search places..." 
            className="w-full bg-white rounded-2xl pl-12 pr-4 py-4 text-stone-800 shadow-sm border border-stone-100 focus:border-stone-300 focus:ring-0 outline-none transition-all placeholder-stone-300"
          />
        </form>
        
        <div className="flex gap-2 mt-4 overflow-x-auto no-scrollbar pb-1">
          {quickSearches.map(q => (
            <button 
              key={q}
              onClick={() => { setQuery(q); handleSearch({ preventDefault: () => {} } as any); }}
              className="whitespace-nowrap px-4 py-2 bg-stone-100 text-stone-500 rounded-xl text-xs font-bold hover:bg-stone-200 hover:text-stone-700 transition-colors"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Route Planning Bar */}
        {(routeStart || routeEnd) && (
            <div className="mt-4 bg-white p-3 rounded-2xl border border-stone-200 shadow-lg animate-fade-in-up">
                <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex-1 space-y-1">
                        <div className="flex items-center text-xs">
                            <span className="w-10 font-bold text-stone-400">START</span>
                            <span className={`flex-1 truncate font-medium ${routeStart ? 'text-stone-800' : 'text-stone-300 italic'}`}>{routeStart || 'Select from list'}</span>
                            {routeStart && <button onClick={() => setRouteStart(null)} className="text-stone-400 hover:text-red-400"><XIcon /></button>}
                        </div>
                        <div className="flex items-center text-xs">
                             <span className="w-10 font-bold text-stone-400">END</span>
                             <span className={`flex-1 truncate font-medium ${routeEnd ? 'text-stone-800' : 'text-stone-300 italic'}`}>{routeEnd || 'Select from list'}</span>
                             {routeEnd && <button onClick={() => setRouteEnd(null)} className="text-stone-400 hover:text-red-400"><XIcon /></button>}
                        </div>
                    </div>
                    <button 
                        onClick={handleCalculateRoute}
                        disabled={!routeStart || !routeEnd || routingLoading}
                        className="bg-stone-800 text-white p-3 rounded-xl disabled:opacity-50"
                    >
                        {routingLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRightLeft className="w-5 h-5" />}
                    </button>
                </div>
                {routeResult && (
                    <div className="bg-stone-50 p-3 rounded-xl border border-stone-100">
                        <div className="flex items-center gap-2 mb-1">
                            <Bus className="w-4 h-4 text-stone-600" />
                            <span className="font-bold text-sm text-stone-800">{routeResult.summary}</span>
                            <div className="flex-1 text-right flex items-center justify-end gap-1 text-xs font-bold text-stone-500">
                                <Clock className="w-3 h-3" />
                                {routeResult.estimatedTime}
                            </div>
                        </div>
                        <p className="text-xs text-stone-500 leading-relaxed">{routeResult.details}</p>
                    </div>
                )}
            </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-2 space-y-5 pb-28">
        
        {myLocation && (
          <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-2xl flex items-center gap-3 animate-fade-in-up">
            <div className="w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center shadow-lg shadow-indigo-200">
               <Crosshair className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs font-bold text-indigo-400 uppercase tracking-wide">Current Location</p>
              <p className="text-sm font-mono text-indigo-900">{myLocation.lat.toFixed(4)}, {myLocation.lng.toFixed(4)}</p>
            </div>
          </div>
        )}

        {displayPlaces.length === 0 && !myLocation && !loading && (
          <div className="text-center py-24 text-stone-300">
            <Map className="w-16 h-16 mx-auto mb-4 opacity-20" />
            <p className="font-light">Load itinerary or search</p>
          </div>
        )}
        
        {loading && (
             <div className="flex flex-col items-center justify-center py-24 text-stone-400">
                <Loader2 className="w-8 h-8 animate-spin mb-3 text-stone-600" />
                <p className="font-light text-sm tracking-wide">Searching...</p>
             </div>
        )}

        {displayPlaces.map((place, idx) => (
          <PlaceCard 
            key={idx} 
            place={place} 
            onSetStart={() => setRouteStart(place.name)}
            onSetEnd={() => setRouteEnd(place.name)}
          />
        ))}
      </div>
    </div>
  );
}

function XIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
    )
}

interface PlaceCardProps {
  place: PlaceResult;
  onSetStart: () => void;
  onSetEnd: () => void;
}

const PlaceCard: React.FC<PlaceCardProps> = ({ place, onSetStart, onSetEnd }) => {
  // Color coding based on Day
  const getBorderColor = (day?: number) => {
    if (!day) return 'border-stone-100'; // Default/Search
    const colors = [
        'border-red-400',    // Day 1
        'border-orange-400', // Day 2
        'border-amber-400',  // Day 3
        'border-green-400',  // Day 4
        'border-blue-400'    // Day 5
    ];
    return colors[(day - 1) % colors.length] || 'border-purple-400';
  };

  const getDayLabelColor = (day?: number) => {
     if (!day) return 'bg-stone-100 text-stone-500';
     const colors = [
        'bg-red-50 text-red-600',
        'bg-orange-50 text-orange-600',
        'bg-amber-50 text-amber-600',
        'bg-green-50 text-green-600',
        'bg-blue-50 text-blue-600'
     ];
     return colors[(day - 1) % colors.length] || 'bg-purple-50 text-purple-600';
  }

  return (
    <div className={`bg-white rounded-[24px] shadow-[0_4px_20px_-12px_rgba(0,0,0,0.08)] border-l-4 overflow-hidden group ${getBorderColor(place.day)}`}>
      <div className="p-5">
        <div className="flex justify-between items-start mb-2">
          <div>
              {place.day && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md mb-1 inline-block uppercase tracking-wide ${getDayLabelColor(place.day)}`}>
                      Day {place.day}
                  </span>
              )}
              <h3 className="font-serif font-bold text-lg text-stone-800 leading-snug">{place.name}</h3>
          </div>
          {place.rating && (
            <div className="flex items-center bg-[#FDF6E3] px-2 py-1 rounded-lg">
              <Star className="w-3 h-3 text-[#B58900] fill-[#B58900] mr-1" />
              <span className="text-xs font-bold text-[#644B05]">{place.rating}</span>
            </div>
          )}
        </div>
        <p className="text-xs text-stone-500 mb-4 font-medium">{place.address}</p>
        
        {/* Actions */}
        <div className="grid grid-cols-2 gap-2 mb-3">
             <button onClick={onSetStart} className="text-xs font-bold text-stone-500 bg-stone-50 hover:bg-stone-100 py-2 rounded-xl transition-colors">
                Set Start
             </button>
             <button onClick={onSetEnd} className="text-xs font-bold text-stone-500 bg-stone-50 hover:bg-stone-100 py-2 rounded-xl transition-colors">
                Set End
             </button>
        </div>

        <a 
            href={`https://map.naver.com/v5/search/${encodeURIComponent(place.name)}`}
            target="_blank" 
            rel="noopener noreferrer"
            className="bg-[#03C75A] text-white py-3 rounded-xl text-xs font-bold flex items-center justify-center hover:bg-[#02b351] transition-colors shadow-sm"
        >
            <span className="mr-2 text-base font-black">N</span>
            Open in Naver Map
        </a>
      </div>
    </div>
  );
}