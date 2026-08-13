'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function SafariBookingApp() {
  const [slots, setSlots] = useState<any[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [guestName, setGuestName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [seatsRequested, setSeatsRequested] = useState(1);
  const [loading, setLoading] = useState(true);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  // Fetch Live Inventory
  const fetchSlots = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('slot_availability')
      .select('*')
      .order('safari_date', { ascending: true })
      .order('slot_time', { ascending: true });

    if (!error && data) {
      setSlots(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSlots();
    
    // Set up real-time listener to update inventory if someone else books
    const channel = supabase
      .channel('realtime_bookings')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bookings' }, () => {
        fetchSlots();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot) return;

    const { error } = await supabase.from('bookings').insert([
      {
        slot_id: selectedSlot.id,
        guest_name: guestName,
        contact_number: contactNumber,
        seats_booked: seatsRequested,
      },
    ]);

    if (error) {
      alert('Error processing booking. Please try again.');
    } else {
      setBookingSuccess(true);
      fetchSlots(); // Refresh UI instantly
    }
  };

  if (bookingSuccess) {
    return (
      <div className="min-h-screen bg-[#f6f5ef] flex items-center justify-center p-6">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center border-t-8 border-[#3b4d32]">
          <h2 className="text-3xl font-bold text-[#3b4d32] mb-4">Booking Confirmed! 🌿</h2>
          <p className="text-gray-600 mb-6">
            Your safari for <strong>{selectedSlot.safari_date}</strong> at <strong>{selectedSlot.slot_time}</strong> has been successfully booked for <strong>{seatsRequested} guest(s)</strong>.
          </p>
          <p className="text-sm text-gray-500 mb-8">A confirmation voucher will be sent to {contactNumber}.</p>
          <button 
            onClick={() => {
              setBookingSuccess(false);
              setSelectedSlot(null);
              setGuestName('');
              setContactNumber('');
              setSeatsRequested(1);
            }}
            className="bg-[#8c5d3a] text-white px-6 py-3 rounded-lg font-semibold w-full hover:bg-[#734b2f] transition-colors"
          >
            Book Another Safari
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6f5ef] text-gray-800 p-6 md:p-12 font-sans">
      <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-10">
        
        {/* Left Column: Booking Calendar & Slots */}
        <div>
          <div className="mb-8">
            <h1 className="text-4xl font-extrabold text-[#3b4d32] uppercase tracking-wide">
              Wild Inn Kabini
            </h1>
            <p className="text-[#6a7c5b] font-medium text-lg mt-2">
              Exclusive Jeep Safari Booking 
            </p>
          </div>

          <h2 className="text-xl font-bold mb-4 text-[#8c5d3a] uppercase tracking-wide border-b border-gray-300 pb-2">
            Select Your Safari
          </h2>

          {loading ? (
            <p className="text-gray-500 animate-pulse">Loading live availability...</p>
          ) : (
            <div className="space-y-4">
              {slots.map((slot) => {
                const isSoldOut = slot.seats_available <= 0;
                const isSelected = selectedSlot?.id === slot.id;

                return (
                  <div 
                    key={slot.id}
                    onClick={() => !isSoldOut && setSelectedSlot(slot)}
                    className={`p-5 rounded-lg border-2 cursor-pointer transition-all ${
                      isSoldOut 
                        ? 'bg-gray-100 border-gray-200 opacity-60 cursor-not-allowed'
                        : isSelected 
                          ? 'bg-white border-[#3b4d32] shadow-md ring-2 ring-[#3b4d32] ring-opacity-50' 
                          : 'bg-white border-transparent shadow hover:shadow-md'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-bold text-lg text-gray-900">{slot.safari_date}</p>
                        <p className="text-gray-600 font-medium">{slot.slot_time} Departure</p>
                      </div>
                      <div className="text-right">
                        {isSoldOut ? (
                          <span className="bg-red-100 text-red-800 text-xs font-bold px-3 py-1 rounded uppercase tracking-wider">
                            Sold Out
                          </span>
                        ) : (
                          <span className="bg-[#ffe8a1] text-[#6b5300] text-sm font-bold px-3 py-1 rounded">
                            {slot.seats_available} Seats Left
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Guest Details Form */}
        <div className="bg-white p-8 rounded-xl shadow-lg border-t-8 border-[#3b4d32] h-fit">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Guest Details</h2>
          
          {!selectedSlot ? (
            <div className="text-center py-10 text-gray-400">
              <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
              <p>Please select a date and time slot from the left to continue.</p>
            </div>
          ) : (
            <form onSubmit={handleBooking} className="space-y-5">
              <div className="bg-gray-50 p-4 rounded-md border border-gray-100 mb-6">
                <p className="text-sm text-gray-500">Selected Safari</p>
                <p className="font-bold text-[#3b4d32] text-lg">{selectedSlot.safari_date} | {selectedSlot.slot_time}</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Full Name</label>
                <input 
                  type="text" 
                  required 
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-[#3b4d32] focus:border-[#3b4d32] outline-none"
                  placeholder="e.g. K Gomathi Ganesan"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Contact Number</label>
                <input 
                  type="tel" 
                  required 
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-[#3b4d32] focus:border-[#3b4d32] outline-none"
                  placeholder="e.g. +91 80151 24934"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Number of Seats (₹4000/person)</label>
                <select 
                  value={seatsRequested}
                  onChange={(e) => setSeatsRequested(Number(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-[#3b4d32] focus:border-[#3b4d32] outline-none bg-white"
                >
                  {[...Array(selectedSlot.seats_available)].map((_, i) => (
                    <option key={i + 1} value={i + 1}>{i + 1} Seat{i > 0 ? 's' : ''}</option>
                  ))}
                </select>
              </div>

              <div className="pt-4 flex justify-between items-center border-t border-gray-200 mt-6">
                <span className="text-gray-500 font-medium">Total Amount</span>
                <span className="text-2xl font-bold text-[#3b4d32]">₹{seatsRequested * 4000}</span>
              </div>

              <button 
                type="submit" 
                className="w-full bg-[#3b4d32] text-white font-bold py-4 rounded-lg mt-4 shadow-md hover:bg-[#2c3a25] transition-all uppercase tracking-widest text-sm"
              >
                Confirm Booking
              </button>
            </form>
          )}
        </div>
      </div>
      
      <div className="max-w-5xl mx-auto mt-12 text-center text-gray-500 text-sm">
        &copy; {new Date().getFullYear()} Square Brackets. Support: +91 80151 24934
      </div>
    </div>
  );
}