"use client";
import { useState, useEffect } from 'react';
import { userService } from './services/userService';
import { useRouter } from 'next/navigation';
import Header from './components/header';
import Background from './components/background';
import { profileService } from './services/profileService';
import { User, UserPlus } from 'lucide-react';
import { motion } from 'framer-motion';
import Footer from './components/footer';

export default function Home() {
  const router = useRouter();
  const [users, setUsers] = useState(null);

  const doLogin = async () => {
    router.push('/login');
  };

  useEffect(() => {
    const fetchAndLoginUser = async () => {
      try {
        // Fetch user data
        const userResponse = await profileService.getUserData();
        const userData = await userResponse.json();
  
        // Log in using username and password from user data
        const loginResponse = await userService.loginUser(userData.username, userData.password);
        const loginData = await loginResponse.json();
  
        // Store the token in localStorage and route to home
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
    <div> 
      <Footer />
      <Background />

         <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto space-y-6"
        >

        {/* Logo */}
        <div className="flex justify-center items-center mt-20 mb-8">
          <img 
            src="/logo.png" 
            alt="App Logo" 
            className="h-41 object-contain py-8"
          />
        </div>

        <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="w-full bg-gradient-to-b from-green-200 to-green-300 text-black p-6 rounded-lg shadow-lg flex items-center justify-center space-x-3 hover:from-green-300 hover:to-green-400 transition-all"
        onClick={() => {
            doLogin();
          }}
      >
        <User className="w-6 h-6" />
        <span className="text-lg font-semibold">Login</span>
      </motion.button>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="w-full bg-gradient-to-b from-green-300 to-green-400 text-black p-6 rounded-lg shadow-lg flex items-center justify-center space-x-3 hover:from-green-400 hover:to-green-500 transition-all"
        onClick={() => handleRegister()}
      >
        <UserPlus className="w-6 h-6" />
        <span className="text-lg font-semibold">Register</span>
      </motion.button>

      </motion.div>
      </div>
      
    // </div>
  );
}
