import React, { useState, useMemo } from 'react';
import { Expense, Traveler } from '../types';
import { DollarSign, ArrowRight, Plus, Trash, Receipt, Settings } from 'lucide-react';
import { db, TRIP_ID } from '../services/firebase';
import { collection, addDoc, deleteDoc, doc } from 'firebase/firestore';

interface ExpenseSplitterProps {
  expenses: Expense[];
  travelers: Traveler[];
}

export default function ExpenseSplitter({ expenses, travelers }: ExpenseSplitterProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [exchangeRate, setExchangeRate] = useState(0.024); // Default KRW to TWD
  const [showRateSettings, setShowRateSettings] = useState(false);
  const [newExpense, setNewExpense] = useState<Partial<Expense>>({
    payer: travelers[0]?.id || '',
    sharedWith: travelers.map(t => t.id)
  });

  const balances = useMemo(() => {
    const balanceMap: Record<string, number> = {};
    travelers.forEach(t => balanceMap[t.id] = 0);

    expenses.forEach(exp => {
      const amount = parseFloat(exp.amount.toString());
      const payerId = exp.payer;
      const shareCount = exp.sharedWith.length;
      if (shareCount === 0) return;
      
      const splitAmount = amount / shareCount;
      balanceMap[payerId] += amount;
      exp.sharedWith.forEach(personId => {
        balanceMap[personId] -= splitAmount;
      });
    });
    return balanceMap;
  }, [expenses, travelers]);

  const settlements = useMemo(() => {
    let debtors = travelers.map(t => ({ id: t.id, amount: balances[t.id] })).filter(b => b.amount < -0.01);
    let creditors = travelers.map(t => ({ id: t.id, amount: balances[t.id] })).filter(b => b.amount > 0.01);
    
    debtors.sort((a, b) => a.amount - b.amount);
    creditors.sort((a, b) => b.amount - a.amount);

    const results = [];
    let i = 0; 
    let j = 0; 

    while (i < debtors.length && j < creditors.length) {
      const debtor = debtors[i];
      const creditor = creditors[j];
      
      const amount = Math.min(Math.abs(debtor.amount), creditor.amount);
      
      if (amount > 0.01) {
          results.push({
            from: travelers.find(t => t.id === debtor.id)?.name,
            to: travelers.find(t => t.id === creditor.id)?.name,
            amount: amount.toFixed(0)
          });
      }

      debtor.amount += amount;
      creditor.amount -= amount;

      if (Math.abs(debtor.amount) < 0.01) i++;
      if (creditor.amount < 0.01) j++;
    }
    return results;
  }, [balances, travelers]);

  const handleAddExpense = async () => {
    if (!newExpense.amount || !newExpense.description) return;
    
    try {
        await addDoc(collection(db, "trips", TRIP_ID, "expenses"), {
          payer: newExpense.payer || travelers[0].id,
          amount: Number(newExpense.amount),
          description: newExpense.description!,
          date: Date.now(),
          sharedWith: newExpense.sharedWith || travelers.map(t => t.id)
        });
        
        setIsAdding(false);
        setNewExpense({ payer: travelers[0].id, sharedWith: travelers.map(t => t.id), description: '', amount: '' as any });
    } catch (e) {
        console.error("Add expense failed", e);
        alert("Failed to sync expense.");
    }
  };

  const handleDeleteExpense = async (id: string) => {
      try {
          await deleteDoc(doc(db, "trips", TRIP_ID, "expenses", id));
      } catch (e) {
          console.error("Delete failed", e);
      }
  };

  const toggleShare = (id: string) => {
    const current = newExpense.sharedWith || [];
    if (current.includes(id)) {
      setNewExpense({ ...newExpense, sharedWith: current.filter(cid => cid !== id) });
    } else {
      setNewExpense({ ...newExpense, sharedWith: [...current, id] });
    }
  };

  const toTWD = (krw: number) => {
    return Math.round(krw * exchangeRate).toLocaleString();
  };

  return (
    <div className="h-full flex flex-col bg-[#FAFAF9]">
      <div className="px-6 pt-6 pb-2 z-10">
        <div className="flex justify-between items-start mb-4">
            <div>
                <span className="text-stone-400 text-xs font-bold tracking-widest uppercase">Budget</span>
                <h2 className="text-3xl font-serif font-medium text-stone-800">Expenses</h2>
            </div>
            <button 
                onClick={() => setShowRateSettings(!showRateSettings)}
                className="p-2 bg-stone-100 rounded-full text-stone-500 hover:bg-stone-200 transition-colors"
            >
                <Settings className="w-5 h-5" />
            </button>
        </div>

        {showRateSettings && (
             <div className="bg-white p-4 rounded-2xl mb-4 border border-stone-100 animate-fade-in">
                <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-2">Exchange Rate (KRW to TWD)</label>
                <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-stone-400">₩1000 =</span>
                    <div className="flex items-center bg-stone-50 rounded-xl px-3 py-2 flex-1">
                         <span className="text-stone-800 font-bold mr-1">NT$</span>
                         <input 
                            type="number" 
                            step="0.001"
                            value={(exchangeRate * 1000).toFixed(1)}
                            onChange={(e) => setExchangeRate(Number(e.target.value) / 1000)}
                            className="bg-transparent w-full outline-none font-bold text-stone-800"
                         />
                    </div>
                </div>
            </div>
        )}

        <div className="inline-block bg-[#E5E0D8] text-stone-800 px-4 py-1.5 rounded-full text-sm font-semibold">
           Total: ₩{expenses.reduce((sum, e) => sum + Number(e.amount), 0).toLocaleString()} 
           <span className="opacity-60 ml-1 font-normal">(NT$ {toTWD(expenses.reduce((sum, e) => sum + Number(e.amount), 0))})</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6 pb-28">
        {settlements.length > 0 && (
          <div className="bg-white p-5 rounded-[24px] shadow-sm border border-stone-100">
            <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-4">Settlements (Approx. TWD)</h3>
            <div className="space-y-4">
              {settlements.map((s, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-stone-600 bg-stone-100 px-2 py-1 rounded-md">{s.from}</span>
                    <ArrowRight className="w-3 h-3 text-stone-300" />
                    <span className="font-medium text-stone-600 bg-stone-100 px-2 py-1 rounded-md">{s.to}</span>
                  </div>
                  <div className="text-right">
                     <div className="font-bold text-stone-800">₩{Number(s.amount).toLocaleString()}</div>
                     <div className="text-[10px] text-stone-400 font-bold">NT$ {toTWD(Number(s.amount))}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
           <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-4 px-1">Recent</h3>
           <div className="space-y-3">
              {expenses.length === 0 ? (
                  <div className="text-center py-10 text-stone-300">
                      <Receipt className="w-10 h-10 mx-auto mb-2 opacity-20"/>
                      <p className="font-light">No records yet</p>
                  </div>
              ) : expenses.map(exp => (
                <div key={exp.id} className="bg-white p-4 rounded-[20px] shadow-[0_2px_10px_-5px_rgba(0,0,0,0.05)] border border-stone-50 flex justify-between items-center group">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-[#FAFAF9] rounded-full flex items-center justify-center text-stone-400 border border-stone-100">
                            <DollarSign className="w-4 h-4" />
                        </div>
                        <div>
                            <p className="font-bold text-stone-800 text-sm">{exp.description}</p>
                            <p className="text-[10px] text-stone-400 uppercase font-medium tracking-wide mt-0.5">
                                {travelers.find(t => t.id === exp.payer)?.name} paid for {exp.sharedWith.length}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="text-right">
                            <div className="font-bold text-stone-800 font-mono">₩{exp.amount.toLocaleString()}</div>
                            <div className="text-[10px] text-stone-400 font-medium">≈ NT$ {toTWD(Number(exp.amount))}</div>
                        </div>
                        <button 
                            onClick={() => handleDeleteExpense(exp.id)}
                            className="text-stone-300 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                        >
                            <Trash className="w-4 h-4" />
                        </button>
                    </div>
                </div>
              ))}
           </div>
        </div>
      </div>

      <button
        onClick={() => setIsAdding(true)}
        className="absolute bottom-6 right-6 w-16 h-16 bg-stone-800 rounded-full text-[#FAFAF9] shadow-2xl flex items-center justify-center hover:bg-stone-900 active:scale-90 transition-transform z-20"
      >
        <Plus className="w-6 h-6 stroke-[3]" />
      </button>

      {/* Add Expense Modal */}
      {isAdding && (
         <div className="fixed inset-0 z-50 flex items-end justify-center">
            <div className="absolute inset-0 bg-stone-900/20 backdrop-blur-[2px]" onClick={() => setIsAdding(false)} />
            <div className="bg-[#FAFAF9] w-full max-w-md rounded-t-[32px] p-8 relative z-10 animate-fade-in-up">
                <h3 className="text-2xl font-serif font-medium text-stone-800 mb-8">Add Expense</h3>
                
                <div className="space-y-6">
                    <div className="bg-white p-4 rounded-2xl border border-stone-100 focus-within:border-stone-400 transition-colors">
                        <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1">Description</label>
                        <input 
                            type="text" 
                            placeholder="e.g. Dinner"
                            value={newExpense.description}
                            onChange={e => setNewExpense({...newExpense, description: e.target.value})}
                            className="w-full bg-transparent outline-none text-stone-800 font-medium"
                        />
                    </div>
                    
                    <div className="bg-white p-4 rounded-2xl border border-stone-100 focus-within:border-stone-400 transition-colors">
                        <div className="flex justify-between items-baseline mb-1">
                             <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider">Amount (KRW)</label>
                             {newExpense.amount && (
                                <span className="text-xs font-bold text-stone-500 bg-stone-100 px-2 py-0.5 rounded-md">
                                    ≈ NT$ {toTWD(Number(newExpense.amount))}
                                </span>
                             )}
                        </div>
                        <input 
                            type="number" 
                            placeholder="0"
                            value={newExpense.amount}
                            onChange={e => setNewExpense({...newExpense, amount: e.target.value as any})}
                            className="w-full bg-transparent outline-none text-2xl font-serif text-stone-800"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white p-3 rounded-2xl border border-stone-100">
                            <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-2">Paid By</label>
                            <select 
                                value={newExpense.payer}
                                onChange={e => setNewExpense({...newExpense, payer: e.target.value})}
                                className="w-full bg-transparent outline-none text-stone-800 font-medium appearance-none"
                            >
                                {travelers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                        </div>
                        <div>
                             <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-2 pl-1">For Whom</label>
                             <div className="flex gap-2 overflow-x-auto py-1">
                                {travelers.map(t => (
                                    <button 
                                        key={t.id}
                                        onClick={() => toggleShare(t.id)}
                                        className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                                            (newExpense.sharedWith || []).includes(t.id)
                                            ? 'bg-stone-800 text-white border-stone-800'
                                            : 'bg-white text-stone-400 border-stone-100'
                                        }`}
                                    >
                                        {t.name}
                                    </button>
                                ))}
                             </div>
                        </div>
                    </div>

                    <button 
                        onClick={handleAddExpense}
                        className="w-full py-4 bg-stone-800 text-[#FAFAF9] rounded-2xl font-medium mt-4 shadow-xl hover:bg-stone-900 transition-colors"
                    >
                        Confirm
                    </button>
                </div>
            </div>
         </div>
      )}
    </div>
  );
}