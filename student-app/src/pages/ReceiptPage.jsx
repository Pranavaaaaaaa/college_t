import React from 'react';
import { Link } from 'react-router-dom';

function ReceiptPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white p-10 rounded-3xl shadow-2xl w-full max-w-md text-center relative overflow-hidden">
        {/* Decorative background element */}
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-400 to-teal-500"></div>

        <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce-slow">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-emerald-500" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>
        
        <h2 className="text-3xl font-extrabold text-gray-900 mb-3">You're All Set!</h2>
        <p className="text-gray-600 mb-8 text-lg leading-relaxed">
          Payment successful. Your account is now active and ready for your first ride.
        </p>

        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 mb-8 text-left">
           <div className="flex justify-between mb-2">
             <span className="text-gray-500 text-sm">Amount Paid</span>
             <span className="font-bold text-gray-900">$50.00</span>
           </div>
           <div className="flex justify-between">
             <span className="text-gray-500 text-sm">Status</span>
             <span className="font-bold text-emerald-600">Confirmed</span>
           </div>
        </div>
        
        <Link 
          to="/login"
          className="block w-full py-4 bg-indigo-600 text-white rounded-xl font-bold text-lg hover:bg-indigo-700 transition-all shadow-lg hover:shadow-indigo-500/30"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}

export default ReceiptPage;