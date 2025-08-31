import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { profileService } from '../services/profileService';

const menuItems = [
  { name: "Home", path: "/home" },
  { name: "Volunteer", path: "/volunteer" },
  { name: "Request Aid", path: "/request" },
  { name: "Profile", path: "/profile" },
  { name: "Sign Out", path: "/" },
];

const Header = () => {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter(); 

  useEffect(() => {
    // Check if the token exists in localStorage
    const token = localStorage.getItem('token');
    
    const seeifyouhaveaccess = async () => {
    profileService.getUserData().then(response => {
        if (!response.ok) {
          router.push('/'); // Redirect to home page
        }
    });
    }

    seeifyouhaveaccess();
  }, [router]); 

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const handleSignOut = () => {
    // Clear token from local storage
    localStorage.removeItem('token'); 
    
    router.push('/'); 
  };

  return (
    <>
      <nav className="fixed w-full z-40 bg-gradient-to-br from-gray-800 to-green-900 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-white font-bold text-xl"
            >
              <Link href="/">
              <span className="block lg:inline">
                <img src="/dragon-icon.png" alt="Dragon Icon" className="inline-block mr-2" style={{ width: '2em', height: '2em' }} />
                VolunTales
              </span>
            </Link>


            </motion.div>

            {/* Desktop Menu */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="hidden lg:flex space-x-8"
            >
              {menuItems.map((item) => (
                item.name === "Sign Out" ? (
                  <button
                    key={item.name}
                    onClick={handleSignOut} 
                    className={`text-gray-300 hover:text-white transition-colors`}
                  >
                    {item.name}
                  </button>
                ) : (
                  <Link
                    key={item.name}
                    href={item.path}
                    className={`text-gray-300 hover:text-white transition-colors ${
                      pathname === item.path ? 'text-white' : ''
                    }`}
                  >
                    {item.name}
                  </Link>
                )
              ))}
            </motion.div>

            {/* Mobile Menu Button */}
            <div className="lg:hidden">
              <button
                onClick={toggleMenu}
                className="text-gray-300 hover:text-white p-2"
              >
                <Menu size={24} />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            {/* Overlay Background */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.95 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-gray-900"
            />

            {/* Close Button */}
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={toggleMenu}
              className="fixed top-6 right-6 z-50 p-2 text-white hover:text-gray-300 transition-colors cursor-pointer"
            >
              <X size={32} />
            </motion.button>

            {/* Mobile Menu Content */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", duration: 0.3 }}
              className="fixed inset-0 z-45 flex flex-col items-center justify-center space-y-12 pointer-events-auto"
            >
              {menuItems.map((item, index) => {
                const isActive = pathname === item.path;
                return (
                  <motion.div
                    key={item.name}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    transition={{ delay: index * 0.1 }}
                    className="relative"
                  >
                    {item.name === "Sign Out" ? (
                      <button
                        onClick={handleSignOut}
                        className={`relative text-3xl font-medium transition-colors
                          ${isActive 
                            ? 'text-white' 
                            : 'text-gray-400 hover:text-white'
                          }
                        `}
                      >
                        <span className="relative z-10">
                          {item.name}
                        </span>
                      </button>
                    ) : (
                      <Link
                        href={item.path}
                        onClick={toggleMenu}
                        className={`relative text-3xl font-medium transition-colors
                          ${isActive 
                            ? 'text-white' 
                            : 'text-gray-400 hover:text-white'
                          }
                        `}
                      >
                        <span className="relative z-10">
                          {item.name}
                        </span>
                        {isActive && (
                          <motion.div
                            layoutId="activeTab"
                            className="absolute -inset-x-4 -inset-y-2 border-2 border-white rounded-lg"
                            initial={false}
                            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                          />
                        )}
                      </Link>
                    )}
                  </motion.div>
                );
              })}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Header;
