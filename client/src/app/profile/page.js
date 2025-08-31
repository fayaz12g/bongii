"use client";
import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { profileService } from '../services/profileService';
import Background from '../components/background';
import Header from '../components/header';
import Footer from '../components/footer';

export default function ProfilePage() {
  const router = useRouter(); 
  const [userData, setUserData] = useState({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    password: '',
    profileIcon: '1'
  });
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState('');


  useEffect(() => {
    const loadUserData = async () => {
      
        profileService.getUserData().then(response => {
            return response.json()
        })
        
        .then(data => {
        console.log(data)
        setUserData(data);
        setIsLoading(false);
     
    });
      
    };

    // Check if the token exists in localStorage
    const token = localStorage.getItem('token');
    
    const seeifyouhaveaccess = async () => {
      console.log("Checking access");
      profileService.getUserData().then(response => {
          if (!response.ok) {
            router.push('/login'); // Redirect to home page
          }
      });
    }
    seeifyouhaveaccess();
    loadUserData();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setUserData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await profileService.updateUserData(userData); 
      setMessage('Profile updated successfully!');
    } catch (error) {
      setMessage('Error updating profile');
    }
  };

  if (isLoading) {
    return (
      <div>
        <Header />
        <Background />
        <div className="flex justify-center items-center min-h-screen">
          <div className="text-white">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header />
      <Background />
      {/* <Footer /> */}
      <div className="max-w-6xl mx-auto pt-24 px-4">
        <div className=" backdrop-blur-md bg-white/20 border-b border-white/40 rounded-2xl shadow-lg p-8 max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold text-white text-center mb-8">Your Profile</h1>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Profile Icons */}
            <div className="space-y-2">
            <label className="block text-white text-lg mb-4">Select Profile Icon</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {['1', '2', '3', '4'].map((id) => (
                <div
                    key={id}
                    onClick={() => handleInputChange({ target: { name: 'profileIcon', value: id } })}
                    className={`cursor-pointer p-4 rounded-lg border-2 ${
                    userData.profileIcon === id ? 'border-purple-500' : 'border-gray-600'
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

            {/* Username Field */}
            <div>
              <label className="block text-white text-lg mb-2">Username</label>
              <input
                type="text"
                value={userData.username}
                readOnly
                className="w-full p-3 rounded bg-gray-600 text-gray-300 border border-gray-600 cursor-not-allowed"
              />
            </div>

            {/* First and Last Name Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-white text-lg mb-2">First Name</label>
                <input
                  type="text"
                  name="firstName"
                  value={userData.firstName}
                  onChange={handleInputChange}
                  className="w-full p-3 rounded bg-gray-700 text-white border border-gray-600 focus:border-purple-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-white text-lg mb-2">Last Name</label>
                <input
                  type="text"
                  name="lastName"
                  value={userData.lastName}
                  onChange={handleInputChange}
                  className="w-full p-3 rounded bg-gray-700 text-white border border-gray-600 focus:border-purple-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Email Field */}
            <div>
              <label className="block text-white text-lg mb-2">Email</label>
              <input
                type="email"
                name="email"
                value={userData.email}
                onChange={handleInputChange}
                className="w-full p-3 rounded bg-gray-700 text-white border border-gray-600 focus:border-purple-500 focus:outline-none"
              />
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-white text-lg mb-2">Password</label>
              <input
                type="password"
                name="password"
                value={userData.password}
                onChange={handleInputChange}
                placeholder="Enter new password"
                className="w-full p-3 rounded bg-gray-700 text-white border border-gray-600 focus:border-purple-500 focus:outline-none"
              />
            </div>

            {/* Message Display */}
            {message && (
              <div className={`text-center p-3 rounded ${
                message.includes('Error') ? 'bg-red-500/20 text-red-300' : 'bg-green-500/20 text-green-300'
              }`}>
                {message}
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-center">
              <button
                type="submit"
                className="bg-purple-500 hover:bg-purple-600 text-white font-bold py-3 px-8 rounded-lg transition-colors"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}