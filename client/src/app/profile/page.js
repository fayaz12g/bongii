"use client";
import { useState, useEffect } from 'react';
import { profileService } from '../services/profileService';
import Header from '../components/header';
import ConfirmDialog from '../components/confirmDialog';
import ProfileAvatarPicker from '../components/profileAvatarPicker';
import dynamic from "next/dynamic";
import { useRequireAuth } from '../hooks/useRequireAuth';
import { Coins, Plus, Trash2, Upload } from 'lucide-react';
import PlayerAvatar from '../components/playerAvatar';
import { isAvatarUploadEnabled } from '../utils/firebase';
import {
  deleteUploadedAvatar,
  isUploadedAvatarUrl,
  uploadAvatar,
} from '../utils/avatarStorage';
import {
  DEFAULT_PROFILE_AVATAR_ID,
  normalizeProfileAvatarId,
} from '../utils/profileAvatars.mjs';

const Background = dynamic(() => import("../components/background"), { ssr: false });
const Footer = dynamic(() => import("../components/footer"), { ssr: false });
const configuredDebugTokenPurchase = process.env.NEXT_PUBLIC_ENABLE_DEBUG_TOKEN_PURCHASE;
const debugTokenPurchaseEnabled = configuredDebugTokenPurchase === undefined
  ? process.env.NODE_ENV !== 'production'
  : configuredDebugTokenPurchase === 'true';

export default function ProfilePage() {
  const {
    firebaseUser,
    isAuthenticated,
    loading: authLoading,
    syncProfile,
    updateDisplayName,
    updatePhotoUrl,
  } = useRequireAuth();
  const [userData, setUserData] = useState({
    displayName: '',
    username: '',
    email: '',
    profileIcon: DEFAULT_PROFILE_AVATAR_ID,
    photoUrl: null,
    doubleOrNothingCredits: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [avatarPending, setAvatarPending] = useState(false);
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [purchasePending, setPurchasePending] = useState(false);
  const googlePhotoUrl = firebaseUser?.providerData.find(
    ({ providerId }) => providerId === 'google.com',
  )?.photoURL || null;

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
          profileIcon: normalizeProfileAvatarId(data.profileIcon),
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
    const previousPhotoUrl = firebaseUser.photoURL;
    const desiredPhotoUrl = userData.photoUrl || null;
    try {
      await updateDisplayName(userData.displayName.trim());
      if ((firebaseUser.photoURL || null) !== desiredPhotoUrl) {
        await updatePhotoUrl(desiredPhotoUrl);
      }
      const response = await profileService.updateUserData(userData);
      if (!response.ok) throw new Error('Unable to update profile');
      const nextProfile = await syncProfile(firebaseUser);
      setUserData((current) => ({ ...current, ...nextProfile }));
      if (previousPhotoUrl !== desiredPhotoUrl
        && isUploadedAvatarUrl(previousPhotoUrl, firebaseUser.uid)) {
        await deleteUploadedAvatar(firebaseUser.uid, previousPhotoUrl);
      }
      setMessage('Profile updated successfully!');
    } catch {
      setMessage('Error updating profile');
    }
  };

  const handleAvatarUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setMessage('');
    setAvatarPending(true);
    const previousUrl = userData.photoUrl;
    try {
      const photoUrl = await uploadAvatar(firebaseUser.uid, file);
      await updatePhotoUrl(photoUrl);
      const nextProfile = await syncProfile(firebaseUser);
      setUserData((current) => ({ ...current, ...nextProfile }));
      if (isUploadedAvatarUrl(previousUrl, firebaseUser.uid)) {
        await deleteUploadedAvatar(firebaseUser.uid, previousUrl);
      }
      setMessage('Avatar updated successfully!');
    } catch (error) {
      setMessage(error.message || 'Error updating avatar');
    } finally {
      setAvatarPending(false);
    }
  };

  const handleAvatarDelete = async () => {
    setMessage('');
    setAvatarPending(true);
    try {
      await deleteUploadedAvatar(firebaseUser.uid, userData.photoUrl);
      await updatePhotoUrl(null);
      const nextProfile = await syncProfile(firebaseUser);
      setUserData((current) => ({ ...current, ...nextProfile }));
      setMessage('Uploaded avatar removed.');
    } catch {
      setMessage('Error removing avatar');
    } finally {
      setAvatarPending(false);
    }
  };

  const handleProfileAvatarSelect = (profileIcon) => {
    setUserData((current) => ({ ...current, profileIcon, photoUrl: null }));
  };

  const handleGoogleImageSelect = () => {
    if (!googlePhotoUrl) return;
    setUserData((current) => ({ ...current, photoUrl: googlePhotoUrl }));
  };

  const handleDebugPurchase = async () => {
    setMessage('');
    setPurchasePending(true);
    try {
      const response = await profileService.purchaseDebugTokens();
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Mock purchase failed');
      const nextProfile = await syncProfile(firebaseUser);
      setUserData((current) => ({ ...current, ...nextProfile }));
      setPurchaseOpen(false);
      setMessage('100 mock tokens added. No charge was made.');
    } catch (error) {
      setMessage(error.message || 'Mock purchase failed');
    } finally {
      setPurchasePending(false);
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

          <div className="mb-8 flex flex-col gap-4 border-y border-amber-200/30 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <Coins className="h-6 w-6 shrink-0 text-amber-300" aria-hidden="true" />
              <div>
                <p className="font-semibold text-white">Double or Nothing</p>
                <p className="text-sm text-gray-300">Token balance</p>
              </div>
            </div>
            <div className="flex w-full flex-wrap items-center justify-between gap-3 sm:w-auto sm:justify-end">
              <output
                className="text-3xl font-black text-amber-200"
                aria-label={`${userData.doubleOrNothingCredits} Double or Nothing tokens`}
              >
                {userData.doubleOrNothingCredits}
              </output>
              {debugTokenPurchaseEnabled && (
                <button
                  type="button"
                  className="ui-button-secondary"
                  onClick={() => setPurchaseOpen(true)}
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Purchase 100 tokens
                </button>
              )}
            </div>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex justify-center">
              <PlayerAvatar
                avatar={userData}
                name={userData.displayName}
                size={112}
                className="h-28 w-28 border-2 border-line"
              />
            </div>

            {isAvatarUploadEnabled() && (
              <div className="flex flex-wrap justify-center gap-3">
                <label className={`ui-button-secondary cursor-pointer ${avatarPending ? "pointer-events-none opacity-50" : ""}`}>
                  <Upload className="h-4 w-4" aria-hidden="true" />
                  {avatarPending ? "Updating..." : "Upload avatar"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    disabled={avatarPending}
                    onChange={handleAvatarUpload}
                  />
                </label>
                {isUploadedAvatarUrl(userData.photoUrl, firebaseUser.uid) && (
                  <button
                    type="button"
                    className="ui-button-danger"
                    disabled={avatarPending}
                    onClick={handleAvatarDelete}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    Remove upload
                  </button>
                )}
              </div>
            )}

            <ProfileAvatarPicker
              disabled={avatarPending}
              googlePhotoUrl={googlePhotoUrl}
              onSelect={handleProfileAvatarSelect}
              onSelectGoogle={handleGoogleImageSelect}
              selectedId={userData.profileIcon}
              usingGoogle={Boolean(googlePhotoUrl && userData.photoUrl === googlePhotoUrl)}
            />

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
      <ConfirmDialog
        open={purchaseOpen}
        title="Mock token purchase"
        description="Add 100 Double or Nothing tokens to this account. This debug purchase makes no charge and collects no payment data."
        confirmLabel="Confirm mock purchase"
        cancelLabel="Cancel"
        busy={purchasePending}
        onCancel={() => setPurchaseOpen(false)}
        onConfirm={handleDebugPurchase}
      />
      <Footer />
    </div>
  );
}