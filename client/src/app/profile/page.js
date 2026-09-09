"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { profileService } from '../services/profileService';
import Header from '../components/header';
import dynamic from "next/dynamic";

const Background = dynamic(() => import("../components/background"), { ssr: false });
const Footer = dynamic(() => import("../components/footer"), { ssr: false });

export default function ProfilePage() {
  const router = useRouter(); 
  const [userData, setUserData] = useState({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    profileIcon: '1'
  });
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;
    const loadUserData = async () => {
      try {
        const response = await profileService.getUserData();
        if (!response.ok) {
          router.push('/login');
          return;
        }
        const data = await response.json();
        if (!active) return;
        setUserData({
          ...data,
          firstName: data.firstName ?? '',
          lastName: data.lastName ?? '',
          username: data.username ?? '',
          email: data.email ?? '',
          profileIcon: data.profileIcon ?? '1',
        });
      } catch {
        if (active) setMessage('Error loading profile');
      } finally {
        if (active) setIsLoading(false);
      }
    };
    loadUserData();
    return () => { active = false; };
  }, [router]);

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
    <div className="app-page">
      <Header />
      <Background />
      {/* <Footer /> */}
      <div className="max-w-6xl mx-auto pt-24 px-4">
        <div className="app-panel mx-auto max-w-2xl p-6 sm:p-8">
          <h1 className="text-3xl font-bold text-white text-center mb-8">Your Profile</h1>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Profile Icons */}
            <fieldset className="space-y-2">
            <legend className="block text-white text-lg mb-4">Select Profile Icon</legend>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                {['1', '2', '3', '4'].map((id) => (
              <button
                type="button"
                    key={id}
                    onClick={() => handleInputChange({ target: { name: 'profileIcon', value: id } })}
                aria-pressed={userData.profileIcon === id}
                className={`rounded-md border-2 p-3 ${
                userData.profileIcon === id ? 'border-focus bg-panel-strong' : 'border-line'
                    }`}
                >
                    <div className="w-full aspect-square rounded overflow-hidden">
                    <Image
                        src={`/icon-${id}.png`}
                        alt={`Profile Icon ${id}`}
                      width={160}
                      height={160}
                        priority={id === '1'}
                        className="w-full h-full object-cover hover:scale-105 transition-transform"
                    />
                    </div>
                </button>
                ))}
            </div>
              </fieldset>

            {/* Username Field */}
            <div>
              <label htmlFor="profile-username" className="block text-white text-lg mb-2">Username</label>
              <input
                id="profile-username"
                type="text"
                value={userData.username}
                readOnly
                className="ui-field cursor-not-allowed opacity-70"
              />
            </div>

            {/* First and Last Name Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="profile-first-name" className="block text-white text-lg mb-2">First Name</label>
                <input
                  id="profile-first-name"
                  type="text"
                  name="firstName"
                  value={userData.firstName}
                  onChange={handleInputChange}
                  className="ui-field"
                />
              </div>
              <div>
                <label htmlFor="profile-last-name" className="block text-white text-lg mb-2">Last Name</label>
                <input
                  id="profile-last-name"
                  type="text"
                  name="lastName"
                  value={userData.lastName}
                  onChange={handleInputChange}
                  className="ui-field"
                />
              </div>
            </div>

            {/* Email Field */}
            <div>
              <label htmlFor="profile-email" className="block text-white text-lg mb-2">Email</label>
              <input
                id="profile-email"
                type="email"
                name="email"
                value={userData.email}
                onChange={handleInputChange}
                className="ui-field"
              />
            </div>

            {/* Message Display */}
            {message && (
              <div role="status" className={`ui-toast text-center ${
                message.includes('Error') ? 'bg-red-500/20 text-red-300' : 'bg-green-500/20 text-green-300'
              }`}>
                {message}
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-center">
              <button
                type="submit"
                className="ui-button-primary"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      </div>
      <Footer />
    </div>
  );
}