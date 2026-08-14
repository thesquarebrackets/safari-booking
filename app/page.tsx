'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const isValidPhone = (phone: string) => /^\+?[0-9\s\-]{10,15}$/.test(phone.replace(/[^0-9+]/g, ''));

export default function PeriyarViewBookingPage() {
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' } | null>(null);
  const showToast = (message: string, type: 'error' | 'success' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // --- BOOKING STATE ---
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [availableRooms, setAvailableRooms] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [selectedRoom, setSelectedRoom] = useState<any>(null);
  const [includeSafari, setIncludeSafari] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  // --- GUEST DETAILS (collected at checkout, no account needed) ---
  const [guestName, setGuestName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestCity, setGuestCity] = useState('');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkIn || !checkOut) return showToast('Please select both dates', 'error');
    if (new Date(checkIn) >= new Date(checkOut)) return showToast('Check-out must be after check-in', 'error');

    setIsSearching(true);
    setSelectedRoom(null);
    setIncludeSafari(false);

    const { data, error } = await supabase.rpc('get_available_rooms', {
      start_date: checkIn,
      end_date: checkOut
    });

    if (error) {
      showToast('Error searching availability.', 'error');
    } else {
      setAvailableRooms(data || []);
      if (data?.length === 0) showToast('No rooms available for these dates. Try another date.', 'error');
    }
    setIsSearching(false);
  };

  const calculateNights = () => {
    if (!checkIn || !checkOut) return 1;
    const diffTime = Math.abs(new Date(checkOut).getTime() - new Date(checkIn).getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const nights = calculateNights();
  const roomTotal = selectedRoom ? selectedRoom.price_per_night * nights : 0;
  const safariTotal = includeSafari ? 6500 : 0;
  const grandTotal = roomTotal + safariTotal;

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!guestName.trim()) return showToast('Please enter your full name.', 'error');
    if (!isValidPhone(contactNumber)) return showToast('Please enter a valid WhatsApp number.', 'error');
    if (!isValidEmail(guestEmail)) return showToast('Please enter a valid email address.', 'error');
    if (!guestCity.trim()) return showToast('Please tell us which city you\'re travelling from.', 'error');
    if (!receiptFile) return showToast('Please upload your payment screenshot.', 'error');

    setIsSubmitting(true);

    try {
      const fileExt = receiptFile.name.split('.').pop();
      const guestToken = Math.random().toString(36).slice(2, 10);
      const fileName = `${Date.now()}_${guestToken}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(fileName, receiptFile);

      if (uploadError) throw new Error('Failed to upload receipt.');

      const { data: publicUrlData } = supabase.storage.from('receipts').getPublicUrl(fileName);

      const { error: dbError } = await supabase.from('cottage_bookings').insert([{
        room_id: selectedRoom.room_id,
        guest_name: guestName,
        contact_number: contactNumber,
        guest_email: guestEmail,
        guest_city: guestCity,
        check_in_date: checkIn,
        check_out_date: checkOut,
        includes_gavi_safari: includeSafari,
        total_amount: grandTotal,
        receipt_url: publicUrlData.publicUrl,
        status: 'pending'
      }]);

      if (dbError) throw new Error('Failed to save booking details.');

      setBookingSuccess(true);
      showToast('Booking submitted for verification!', 'success');

    } catch (err: any) {
      showToast(err.message || 'An error occurred.', 'error');
    }

    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-[#f9f9f9] text-gray-900 font-sans flex flex-col relative">

      {toast && (
        <div className={`fixed top-6 left-1/2 transform -translate-x-1/2 z-[100] px-6 py-3 rounded-lg shadow-2xl font-bold flex items-center transition-all animate-fade-in-down ${toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'}`}>
          {toast.message}
        </div>
      )}

      {/* NAV — no admin link here, intentionally */}
      <nav className="bg-white shadow-md sticky top-0 z-50 print:hidden">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-center md:justify-start items-center">
          <div className="flex items-center space-x-4">
            <img src="/logo.png" alt="Square Brackets Logo" className="h-10 w-10 object-contain rounded" />
            <div className="flex flex-col">
              <span className="text-[10px] text-gray-500 tracking-widest uppercase font-bold">Square Brackets</span>
              <span className="text-xl font-black text-gray-900 tracking-wide">Periyar View <span className="text-[#16a316]">Thekkady</span></span>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-grow flex flex-col items-center">
        <div className="w-full">

          {!bookingSuccess && !selectedRoom && (
            <div className="relative bg-black w-full h-[50vh] flex items-center justify-center">
              <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1542718610-a1d656d1884c?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-50"></div>
              <div className="relative z-10 text-center px-4">
                <h1 className="text-4xl md:text-6xl font-black text-white uppercase tracking-widest mb-4 drop-shadow-lg">Periyar View</h1>
                <p className="text-lg md:text-2xl text-gray-200 font-medium drop-shadow-md">Exclusive Cottages • Falls Deck • Gavi Safari</p>
              </div>
            </div>
          )}

          <div className="max-w-7xl mx-auto px-6 py-12">

            {bookingSuccess ? (
              <div className="bg-white p-12 rounded-2xl shadow-xl text-center max-w-3xl mx-auto border-t-8 border-green-600">
                <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                </div>
                <h2 className="text-4xl font-black text-gray-900 mb-4">Verification Pending</h2>
                <p className="text-gray-600 text-lg mb-8">Thank you! Your payment screenshot has been uploaded. We are verifying the transaction and will send your official confirmation via WhatsApp shortly.</p>
                <button onClick={() => {
                  setBookingSuccess(false); setAvailableRooms([]); setSelectedRoom(null);
                  setCheckIn(''); setCheckOut(''); setReceiptFile(null);
                  setGuestName(''); setContactNumber(''); setGuestEmail(''); setGuestCity('');
                }} className="bg-[#16a316] text-white px-8 py-4 rounded-lg font-bold hover:bg-green-700 transition-colors uppercase tracking-wide shadow-lg">Back to Home</button>
              </div>
            ) : (
              <>
                {!selectedRoom && (
                  <div className="max-w-4xl mx-auto mb-12 bg-white p-6 rounded-2xl shadow-xl border border-gray-100 -mt-24 relative z-20">
                    <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Check-in (2:00 PM)</label>
                        <input type="date" required min={new Date().toISOString().split('T')[0]} className="w-full p-4 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[#16a316] font-bold text-gray-800" value={checkIn} onChange={e => setCheckIn(e.target.value)} />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Check-out (11:00 AM)</label>
                        <input type="date" required min={checkIn || new Date().toISOString().split('T')[0]} className="w-full p-4 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[#16a316] font-bold text-gray-800" value={checkOut} onChange={e => setCheckOut(e.target.value)} />
                      </div>
                      <div className="flex items-end">
                        <button type="submit" disabled={isSearching} className="w-full bg-gray-900 text-white font-black py-4 rounded-xl hover:bg-black transition-colors uppercase tracking-widest h-[58px]">
                          {isSearching ? 'Searching...' : 'Check Availability'}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {availableRooms.length > 0 && !selectedRoom && (
                  <div className="max-w-5xl mx-auto">
                    <h3 className="text-2xl font-black text-gray-900 uppercase tracking-widest mb-6">Available Rooms</h3>
                    <div className="grid md:grid-cols-2 gap-6">
                      {availableRooms.map(room => {
                        const isCaveRoom = room.room_name.includes('Cave');
                        return (
                          <div key={room.room_id} className={`bg-white rounded-2xl overflow-hidden shadow-lg border-2 transition-all hover:shadow-xl ${isCaveRoom ? 'border-[#8c5d3a]' : 'border-transparent'}`}>
                            <div className={`h-40 ${isCaveRoom ? 'bg-[#8c5d3a]' : 'bg-gray-200'} relative flex items-center justify-center`}>
                              {isCaveRoom && <span className="absolute top-4 right-4 bg-white text-[#8c5d3a] text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider shadow">Premium Access</span>}
                              <span className={`font-bold ${isCaveRoom ? 'text-white' : 'text-gray-400'}`}>[ Room Photo ]</span>
                            </div>
                            <div className="p-6">
                              <h4 className="text-xl font-black text-gray-900 mb-1">{room.room_name}</h4>
                              <p className="text-gray-500 font-medium text-sm mb-4">{room.room_type} • Max {room.max_guests} Guests</p>
                              <div className="flex justify-between items-center mt-6">
                                <div>
                                  <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Per Night</p>
                                  <p className="text-2xl font-black text-[#16a316]">₹{room.price_per_night}</p>
                                </div>
                                <button onClick={() => setSelectedRoom(room)} className="bg-gray-900 text-white px-6 py-3 rounded-lg font-bold hover:bg-black transition-colors shadow">Select Room</button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {selectedRoom && (
                  <div className="max-w-5xl mx-auto grid lg:grid-cols-[1fr_400px] gap-8">

                    <div className="space-y-6">
                      <button onClick={() => setSelectedRoom(null)} className="text-gray-500 font-bold hover:text-black mb-2 flex items-center">
                        &larr; Back to Rooms
                      </button>

                      <div className="bg-white p-8 rounded-2xl shadow-xl border-2 border-[#16a316] relative overflow-hidden">
                        <div className="absolute top-0 right-0 bg-[#16a316] text-white text-xs font-black px-4 py-2 rounded-bl-xl uppercase tracking-wider">Highly Recommended</div>
                        <h3 className="text-2xl font-black text-gray-900 mb-2">Add a Private Gavi Safari</h3>
                        <p className="text-gray-600 mb-6 font-medium">Explore the deep forest. An exclusive private jeep for up to 7 guests starting directly from our property.</p>

                        <label className="flex items-center justify-between p-4 border rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
                          <div className="flex items-center space-x-4">
                            <input type="checkbox" className="w-6 h-6 text-[#16a316] rounded focus:ring-[#16a316]" checked={includeSafari} onChange={(e) => setIncludeSafari(e.target.checked)} />
                            <div>
                              <p className="font-bold text-gray-900">Include Jeep Safari</p>
                              <p className="text-sm text-gray-500">+₹6500 total (one jeep)</p>
                            </div>
                          </div>
                        </label>
                      </div>

                      <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100">
                        <h3 className="text-xl font-black text-gray-900 mb-6 uppercase tracking-widest border-b pb-4">Guest Details</h3>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Full Name</label>
                            <input type="text" className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-[#16a316] font-bold" value={guestName} onChange={e => setGuestName(e.target.value)} required />
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-bold text-gray-700 mb-1">WhatsApp Number</label>
                              <input type="tel" className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-[#16a316] font-bold" value={contactNumber} onChange={e => setContactNumber(e.target.value)} required />
                            </div>
                            <div>
                              <label className="block text-sm font-bold text-gray-700 mb-1">Email Address</label>
                              <input type="email" className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-[#16a316] font-bold" value={guestEmail} onChange={e => setGuestEmail(e.target.value)} required />
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Travelling From (City)</label>
                            <input type="text" placeholder="e.g. Bangalore, Chennai, Kochi" className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-[#16a316] font-bold" value={guestCity} onChange={e => setGuestCity(e.target.value)} required />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-900 text-white p-8 rounded-2xl shadow-2xl h-fit sticky top-24">
                      <h3 className="text-xl font-black uppercase tracking-widest mb-6 border-b border-gray-700 pb-4">Booking Summary</h3>

                      <div className="space-y-3 mb-6 font-medium text-gray-300">
                        <div className="flex justify-between"><span>Check-in:</span> <span className="text-white font-bold">{checkIn}</span></div>
                        <div className="flex justify-between"><span>Check-out:</span> <span className="text-white font-bold">{checkOut}</span></div>
                        <div className="flex justify-between"><span>Total Nights:</span> <span className="text-white font-bold">{nights}</span></div>
                      </div>

                      <div className="space-y-3 mb-6 border-t border-gray-700 pt-4">
                        <div className="flex justify-between">
                          <span>{selectedRoom.room_name}</span>
                          <span className="font-bold">₹{roomTotal}</span>
                        </div>
                        {includeSafari && (
                          <div className="flex justify-between text-[#a5d6a7]">
                            <span>Gavi Safari Add-on</span>
                            <span className="font-bold">₹{safariTotal}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex justify-between items-end border-t border-gray-700 pt-6 mb-8">
                        <span className="text-gray-400 font-bold uppercase tracking-wider">Grand Total</span>
                        <span className="text-4xl font-black text-[#16a316]">₹{grandTotal}</span>
                      </div>

                      <div className="bg-white text-gray-900 p-6 rounded-xl text-center mb-6">
                        <p className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-4">Pay via UPI</p>
                        <div className="w-40 h-40 bg-gray-200 mx-auto rounded-lg border-4 border-gray-100 flex items-center justify-center mb-4">
                          <span className="text-gray-400 font-black text-xl">[ QR CODE ]</span>
                        </div>
                        <p className="text-xs text-gray-500 font-medium">Scan to pay <strong>₹{grandTotal}</strong> to confirm your booking instantly.</p>
                      </div>

                      <form onSubmit={handleBookingSubmit}>
                        <div className="mb-6">
                          <label className="block text-sm font-bold text-gray-300 mb-2">Upload Payment Screenshot</label>
                          <input type="file" accept="image/*" required onChange={(e) => setReceiptFile(e.target.files ? e.target.files[0] : null)} className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-[#16a316] file:text-white hover:file:bg-green-600 transition-colors" />
                        </div>

                        <button type="submit" disabled={isSubmitting} className="w-full bg-[#16a316] text-white font-black py-4 rounded-xl hover:bg-green-600 transition-colors shadow-lg uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed">
                          {isSubmitting ? 'Uploading...' : 'Submit for Verification'}
                        </button>
                      </form>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}