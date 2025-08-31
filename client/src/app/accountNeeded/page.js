"use client";
import { useState, useEffect } from 'react';
import { userService } from '../services/userService';
import { useRouter } from 'next/navigation';
import Header from '../components/header';
import Background from '../components/background';
import { profileService } from '../services/profileService';
import { User, UserPlus } from 'lucide-react';
import { motion } from 'framer-motion';
import Footer from '../components/footer';

export default function Home() {
  const router = useRouter();
  const [users, setUsers] = useState(null);

  const doLogin = async () => {
    router.push('/login');
  };

  useEffect(() => {
    const fetchAndLoginUser = async () => {
      try {
        const userResponse = await profileService.getUserData();
        const userData = await userResponse.json();

        const loginResponse = await userService.loginUser(userData.username, userData.password);
        const loginData = await loginResponse.json();

        if (loginData.token) {
          localStorage.setItem("token", loginData.token);
          router.push('/home');
        } else {
          console.log('Login failed: No token returned.');
        }
      } catch (error) {
        console.log('An error occurred:', error);
      }
    };

    fetchAndLoginUser();
  }, [router]);

  const handleRegister = () => {
    router.push('/register');
  };

  return (
    <div className="relative min-h-screen flex flex-col">
      <Background />
      <div className="flex-1 flex flex-col justify-center items-center px-6">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-center items-center mb-12"
        >
          <img
            src="/logo.png"
            alt="App Logo"
            className="h-64 object-contain"
          />
        </motion.div>

        {/* Buttons */}
        <div className="w-full max-w-md space-y-6">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            className="w-full bg-white/20 backdrop-blur-md text-white p-5 rounded-2xl shadow-lg flex items-center justify-center space-x-3 border border-white/30 hover:bg-white/30 transition-all"
            onClick={doLogin}
          >
            <User className="w-6 h-6" />
            <span className="text-lg font-semibold">Login</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            className="w-full bg-gradient-to-r from-green-400 to-green-500 text-white p-5 rounded-2xl shadow-lg flex items-center justify-center space-x-3 hover:from-green-500 hover:to-green-600 transition-all"
            onClick={handleRegister}
          >
            <UserPlus className="w-6 h-6" />
            <span className="text-lg font-semibold">Register</span>
          </motion.button>
        </div>
      </div>

      <Footer />
    </div>
  );
}
