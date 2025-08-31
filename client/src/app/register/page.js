"use client";
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { userService } from '../services/userService';
import Background from '../components/background';
import LoginPage from '../login/page';
import Footer from '../components/footer';

export default function PostPage() {
  const router = useRouter();
  const [responseGet, setResponseGet] = useState(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [isFormValid, setIsFormValid] = useState(false);
  const [profileIcon, setProfileIcon] = useState("1");

  // Check if all required fields are filled
  useEffect(() => {
    setIsFormValid(lastName && firstName && username && password);
  }, [lastName, firstName, username, password]);

  const handleSubmit = () => {
    if (isFormValid) {

      userService.addUser(firstName, lastName, username, password, email, ).then(response => {
        if (response.ok) {
          setResponseGet("Post Success");
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
        }
      else {
        alert("Error: Username Already Exists.");
      }
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
        <h1 className="text-3xl font-bold text-white mb-8">Register A New Account</h1>

        <form onSubmit={handleSubmit} className="bg-gradient-to-br from-green-900 to-green-950 rounded-lg shadow-md p-6 space-y-6">
          <div className="space-y-4">
            {/* Profile Icons */}
            <div>
              <label className="block text-sm font-medium text-white mb-1">
                Select Profile Icon <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                {['1', '2', '3', '4'].map((id) => (
                  <div
                    key={id}
                    onClick={() => setProfileIcon(id)}
                    className={`cursor-pointer p-4 rounded-lg border-2 ${
                      profileIcon === id ? 'border-red-500' : 'border-gray-600'
                    }`}
                  >
                    <div className="w-full aspect-square rounded overflow-hidden">
                      <img 
                        src={`/icon-${id}.png`}
                        alt={`Profile Icon ${id}`}
                        className="w-full h-full object-cover hover:scale-105 transition-transform"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Name Fields */}
            <div className="flex space-x-4">
              {/* First Name */}
              <div className="flex-1">
                <label className="block text-sm font-medium text-white mb-1">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-red-900 focus:border-red-500 bg-green-950 text-white"
                  placeholder="Enter first name"
                />
              </div>

              {/* Last Name */}
              <div className="flex-1">
                <label className="block text-sm font-medium text-white mb-1">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-900 focus:border-blue-500 bg-green-950 text-white"
                  placeholder="Enter last name"
                />
              </div>
            </div>


            {/* Username */}
            <div>
              <label className="block text-sm font-medium text-white mb-1">
                Username <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-900 focus:border-blue-500 bg-green-950 text-white"
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
                className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-900 focus:border-blue-500 bg-green-950 text-white"
                placeholder="Enter password"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-white mb-1">
                Email Address <span className="text-gray-400">(optional)</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-900 focus:border-blue-500 bg-green-950 text-white"
                placeholder="Enter email"
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => router.push('/')}
              className="px-4 py-2 rounded-md bg-gradient-to-b from-red-500 to-red-600 text-white hover:bg-red-90"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleSubmit()}
              disabled={!isFormValid}
              className={`px-4 py-2 rounded-md transition-colors ${
                isFormValid ? 'bg-gradient-to-b from-green-400 to-green-500 hover:bg-green-600 text-white' : 'bg-gray-500 text-gray-300 cursor-not-allowed'
              }`}
            >
              Submit
            </button>
          </div>
          <label className="block text-sm font-medium text-red-700 mb-1">{responseGet}</label>
        </form>
      </div>
    </div>
  );
}
