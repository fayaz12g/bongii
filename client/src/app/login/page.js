"use client";
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { userService } from '../services/userService';
import Background from '../components/background';
import Footer from '../components/footer';

export default function LoginPage() {
  const router = useRouter();
    const [responseGet, setResponseGet] = useState(null);
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [isFormValid, setIsFormValid] = useState(false);
    
      // Check if all required fields are filled
      useEffect(() => {
        setIsFormValid(username && password);
      }, [username, password]);
    
  const handleSubmit = (username, password) => {
    if (username && password) {
      userService.loginUser(username, password).then(response => {
        if (response.ok) {
          setResponseGet("Post Success");
          
          return response.json()
        } else {
          alert("Invalid Credentials")
        }
      })
      .then(data => {
          console.log("token: " + data.token)
          localStorage.setItem("token", data.token);
          router.push('/home');
      });
    }
  };

  return (
    <div>
       <Background />
       <Footer />
       <br />
       <br />
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">Login</h1>
        
        <form onSubmit={handleSubmit} className="bg-gradient-to-br from-indigo-900 to-indigo-950 rounded-lg shadow-md p-6 space-y-6">
          <div className="space-y-4">

            {/* Username */}
            <div>
              <label className="block text-sm font-medium text-white mb-1">
                Username <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-900 focus:border-blue-500 bg-indigo-950 text-white"
                placeholder="Enter username"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-white mb-1">
                Password <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-900 focus:border-blue-500 bg-indigo-950 text-white"
                placeholder="Enter password"
              />
            </div>
          </div>
            
        {/* Buttons */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => router.push('/')}
              className="px-4 py-2 rounded-md bg-gradient-to-b from-red-400 to-red-500 text-white hover:bg-red-90"
            >
              Cancel
            </button>
            {!responseGet &&     <button
              type="button"
              onClick={() => handleSubmit(username, password)}
              disabled={!isFormValid}
              className={`px-4 py-2 rounded-md transition-colors ${
                isFormValid ? 'bg-gradient-to-b from-green-500 to-green-600 hover:bg-green-600 text-white' : 'bg-gray-500 text-gray-300 cursor-not-allowed'
              }`}
            >
              Login
            </button>}
            <label className="block text-sm font-medium text-red-700 mb-1">{responseGet}</label>
          </div>
        </form>
      </div>
    </div>   

  );
}