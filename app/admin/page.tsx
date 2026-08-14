'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export default function AdminPage() {
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' } | null>(null);
  const showToast = (message: string, type: 'error' | 'success' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const [session, setSession] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>('guest');
  const [authLoading, setAuthLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [adminBookings, setAdminBookings] = useState<any[]>([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) fetchAdminProfile(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) fetchAdminProfile(session.user.id);
      else setUserRole('guest');
    });

    return () => { subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (userRole === 'admin') fetchAdminBookings();
  }, [userRole]);

  const fetchAdminProfile = async (userId: string) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (data) setUserRole(data.role);
  };

  const fetchAdminBookings = async () => {
    const { data } = await supabase
      .from('cottage_bookings')
      .select('*, rooms(room_name)')
      .order('created_at', { ascending: false });
    if (data) setAdminBookings(data);
  };

  const updateBookingStatus = async (id: string, newStatus: string) => {
    const { error } = await supabase.from('cottage_bookings').update({ status: newStatus }).eq('id', id);
    if (error) showToast('Failed to update status', 'error');
    else {
      showToast(`Booking ${newStatus}!`, 'success');
      fetchAdminBookings();
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidEmail(email)) return showToast('Invalid email address.', 'error');
    setAuthLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) showToast(error.message, 'error');
    setAuthLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUserRole('guest');
  };

  return (
    <div className="min-h-screen bg-[#f9f9f9] text-gray-900 font-sans flex flex-col relative">

      {toast && (
        <div className={`fixed top-6 left-1/2 transform -translate-x-1/2 z-[100] px-6 py-3 rounded-lg shadow-2xl font-bold flex items-center transition-all animate-fade-in-down ${toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'}`}>
          {toast.message}
        </div>
      )}

      <main className="flex-grow flex flex-col items-center">
        <div className="max-w-7xl w-full mx-auto px-6 py-12 flex justify-center">

          {!session && (
            <div className="bg-white p-10 rounded-2xl shadow-2xl max-w-md w-full border-t-8 border-gray-900 mt-12">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tight">Admin Login</h2>
                <p className="text-gray-500 mt-2 font-medium">Periyar View — staff access only</p>
              </div>
              <form onSubmit={handleAdminLogin} className="space-y-4">
                <input type="email" placeholder="Email Address" className="w-full p-4 border rounded-xl bg-gray-50 text-gray-900 focus:ring-2 focus:ring-black outline-none font-medium" value={email} onChange={e => setEmail(e.target.value)} />
                <input type="password" placeholder="Password" className="w-full p-4 border rounded-xl bg-gray-50 text-gray-900 focus:ring-2 focus:ring-black outline-none font-medium" value={password} onChange={e => setPassword(e.target.value)} />
                <button type="submit" disabled={authLoading} className="w-full bg-gray-900 text-white py-4 rounded-xl font-black text-lg uppercase tracking-widest mt-4 shadow-lg hover:bg-black transition-colors">
                  {authLoading ? 'Processing...' : 'Sign In'}
                </button>
              </form>
              <p className="mt-6 text-center text-xs text-gray-400 font-medium">Admin accounts are created directly in Supabase — there is no public sign-up.</p>
            </div>
          )}

          {session && userRole !== 'admin' && (
            <div className="bg-white p-10 rounded-2xl shadow-xl max-w-md w-full text-center border-t-8 border-gray-900 mt-12">
              <p className="text-gray-600 font-medium mb-6">This account doesn't have admin access.</p>
              <button onClick={handleLogout} className="w-full bg-red-600 text-white py-4 rounded-xl font-black uppercase tracking-widest hover:bg-red-700 shadow-md transition-colors">Sign Out</button>
            </div>
          )}

          {session && userRole === 'admin' && (
            <div className="w-full bg-white p-8 rounded-3xl shadow-2xl border border-gray-100">
              <div className="flex justify-between items-center mb-8 border-b pb-6">
                <div>
                  <h1 className="text-3xl font-black text-gray-900 uppercase tracking-widest">Admin Dashboard</h1>
                  <p className="text-gray-500 font-medium mt-1">Manage Periyar View Cottage Bookings & Approvals</p>
                </div>
                <button onClick={handleLogout} className="bg-red-600 text-white px-8 py-3 rounded-xl font-black uppercase tracking-widest hover:bg-red-700 shadow transition-colors">Logout</button>
              </div>

              <div>
                <h2 className="text-xl font-black text-gray-900 mb-6 uppercase tracking-wider">Pending & Recent Bookings</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 text-gray-500 uppercase text-xs font-black tracking-widest">
                        <th className="p-4 rounded-tl-lg">Guest</th>
                        <th className="p-4">From</th>
                        <th className="p-4">Dates</th>
                        <th className="p-4">Room & Add-ons</th>
                        <th className="p-4">Amount</th>
                        <th className="p-4">Receipt</th>
                        <th className="p-4 rounded-tr-lg">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {adminBookings.length === 0 ? (
                        <tr><td colSpan={7} className="p-8 text-center text-gray-400 font-medium">No bookings found.</td></tr>
                      ) : (
                        adminBookings.map(b => (
                          <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                            <td className="p-4">
                              <p className="font-bold text-gray-900">{b.guest_name}</p>
                              <p className="text-sm text-gray-500">{b.contact_number}</p>
                              <p className="text-sm text-gray-400">{b.guest_email}</p>
                            </td>
                            <td className="p-4 font-medium text-gray-600">{b.guest_city}</td>
                            <td className="p-4 font-medium text-gray-600">
                              {b.check_in_date} to <br/>{b.check_out_date}
                            </td>
                            <td className="p-4">
                              <p className="font-bold text-gray-900">{b.rooms?.room_name}</p>
                              {b.includes_gavi_safari && <span className="inline-block bg-[#e8f5e9] text-[#16a316] text-xs font-black px-2 py-1 rounded mt-1 uppercase">Gavi Safari</span>}
                            </td>
                            <td className="p-4 font-black text-gray-900">₹{b.total_amount}</td>
                            <td className="p-4">
                              {b.receipt_url ? (
                                <a href={b.receipt_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 font-bold hover:underline text-sm flex items-center">
                                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                                  View
                                </a>
                              ) : (
                                <span className="text-gray-400 text-sm font-medium">No receipt</span>
                              )}
                            </td>
                            <td className="p-4">
                              {b.status === 'pending' ? (
                                <div className="flex space-x-2">
                                  <button onClick={() => updateBookingStatus(b.id, 'approved')} className="bg-[#16a316] text-white px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wider hover:bg-green-700 shadow">Approve</button>
                                  <button onClick={() => updateBookingStatus(b.id, 'rejected')} className="bg-red-100 text-red-700 px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wider hover:bg-red-200">Reject</button>
                                </div>
                              ) : (
                                <span className={`font-black text-xs uppercase tracking-widest px-3 py-1 rounded-full ${b.status === 'approved' ? 'bg-[#e8f5e9] text-[#16a316]' : 'bg-red-50 text-red-600'}`}>
                                  {b.status}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}