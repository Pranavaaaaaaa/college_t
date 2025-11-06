import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function PaymentPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const handlePayment = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      navigate('/receipt');
    }, 2000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg overflow-hidden">
        <div className="bg-slate-900 p-6 text-white text-center">
          <h2 className="text-2xl font-bold">Complete Registration</h2>
          <p className="text-slate-300 text-sm mt-1">Secure one-time payment</p>
        </div>

        <div className="p-8">
          <div className="mb-8 bg-indigo-50 p-4 rounded-xl flex justify-between items-center border border-indigo-100">
            <div>
              <h3 className="text-indigo-900 font-bold">Transport Fee</h3>
              <p className="text-indigo-700/70 text-sm">Annual Registration</p>
            </div>
            <span className="text-3xl font-extrabold text-indigo-600">₹10000.00</span>
          </div>

          <div className="space-y-6">
            <div className="relative">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 ml-1">Card Details</label>
              <div className="relative">
                 <input type="text" value="•••• •••• •••• 1234" disabled className="block w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-500 font-mono" />
                 <svg className="w-6 h-6 text-gray-400 absolute left-4 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
              </div>
            </div>
            <div className="flex space-x-4">
              <div className="w-1/2">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 ml-1">Expiry</label>
                <input type="text" value="12 / 28" disabled className="block w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-center text-gray-500 font-mono"/>
              </div>
              <div className="w-1/2">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 ml-1">CVC</label>
                <input type="text" value="•••" disabled className="block w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-center text-gray-500 font-mono"/>
              </div>
            </div>
          </div>

          <button 
            onClick={handlePayment} 
            disabled={isLoading}
            className="mt-8 w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white text-lg font-bold rounded-xl transition-all shadow-lg hover:shadow-emerald-500/30 disabled:opacity-70 flex justify-center items-center"
          >
            {isLoading ? (
               <>
                 <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                 Processing...
               </>
            ) : 'Confirm Payment'}
          </button>
          
          <div className="mt-6 flex items-center justify-center space-x-2 text-sm text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
            <span>Payments are secure and encrypted.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PaymentPage;