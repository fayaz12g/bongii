"use client";
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { profileService } from '../services/profileService';
import Header from '../components/header';
import dynamic from "next/dynamic";
import { useRequireAuth } from '../hooks/useRequireAuth';

const Background = dynamic(() => import("../components/background"), { ssr: false });
const Footer = dynamic(() => import("../components/footer"), { ssr: false });

export default function ProfilePage() {
  const {
    firebaseUser,
    isAuthenticated,
    loading: authLoading,
    syncProfile,
    updateDisplayName,
  } = useRequireAuth();
  const [userData, setUserData] = useState({
    displayName: '',
    username: '',
    email: '',
    profileIcon: '1',
    photoUrl: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (authLoading || !isAuthenticated) return undefined;
    let active = true;
    const loadUserData = async () => {
      try {
        const response = await profileService.getUserData();
        if (!response.ok) throw new Error('Unable to load profile');
        const data = await response.json();
        if (!active) return;
        setUserData({
          ...data,
          displayName: data.displayName ?? '',
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
  }, [authLoading, isAuthenticated]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setUserData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    try {
      await updateDisplayName(userData.displayName.trim());
      const response = await profileService.updateUserData(userData);
      if (!response.ok) throw new Error('Unable to update profile');
      await syncProfile(firebaseUser);
      setMessage('Profile updated successfully!');
    } catch {
      setMessage('Error updating profile');
    }
  };

  if (authLoading || isLoading) {
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
            <div className="flex justify-center">
              <Image
                src={userData.photoUrl || `/icon-${userData.profileIcon}.png`}
                alt="Current profile avatar"
                width={112}
                height={112}
                className="h-28 w-28 rounded-full border-2 border-line object-cover"
                priority
              />
            </div>

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

            {userData.username && <div>
              <label htmlFor="profile-username" className="block text-white text-lg mb-2">Legacy username</label>
              <input
                id="profile-username"
                type="text"
                value={userData.username}
                readOnly
                className="ui-field cursor-not-allowed opacity-70"
              />
            </div>}

            <div>
              <label htmlFor="profile-display-name" className="block text-white text-lg mb-2">Display name</label>
              <input
                id="profile-display-name"
                type="text"
                name="displayName"
                value={userData.displayName}
                onChange={handleInputChange}
                maxLength={160}
                className="ui-field"
                required
              />
            </div>

            <div>
              <label htmlFor="profile-email" className="block text-white text-lg mb-2">Email</label>
              <input
                id="profile-email"
                type="email"
                value={userData.email}
                readOnly
                className="ui-field cursor-not-allowed opacity-70"
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