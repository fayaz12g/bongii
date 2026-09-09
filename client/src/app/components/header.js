import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { profileService } from '../services/profileService';
import { useBackground } from './context';

const menuItemsBase = [
  { name: "Home", path: "/home" },
  { name: "Boards", path: "/boards" },
  { name: "Campaigns", path: "/browse" },
  { name: "Leaderboards", path: "/leaderboards" },
  { name: "Profile", path: "/profile" },
];

const Header = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const pathname = usePathname();
  const router = useRouter(); 
  const { reduceMotion, setReduceMotion } = useBackground();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    profileService.getUserData().then((response) => {
      if (response.ok) {
        setLoggedIn(true);
      } else {
        localStorage.removeItem('token');
      }
    }).catch(() => {
      localStorage.removeItem('token');
    });
  }, []);

  const toggleMenu = () => setIsOpen(!isOpen);

  const handleSignOut = () => {
    localStorage.removeItem('token'); 
    setLoggedIn(false);
    router.push('/login');
  };

// Build menu dynamically based on login state
const menuItems = [
  ...menuItemsBase,
  ...(loggedIn
    ? [
        { name: "Create", path: "/create" },
        { name: "Moderate", path: "/moderate" },
        { name: "Sign Out", action: handleSignOut },
      ]
    : [{ name: "Sign In", path: "/login" }]
  ),
];

  return (
    <>
      <nav className="fixed w-full z-40 border-b border-line bg-[#10161d]/95" aria-label="Primary navigation">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-white font-bold text-xl"
            >
              <Link href="/">
                <span className="block lg:inline">
                  <Image src="/logo.png" alt="BONGII Logo" width={96} height={32} loading="eager" className="inline-block mr-2 h-8 w-24 object-contain" />
                  {/* BONGII */}
                </span>
              </Link>
            </motion.div>

            {/* Desktop Menu */}
            <motion.div 
              initial={reduceMotion ? false : { opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="hidden lg:flex items-center gap-5"
            >
              {menuItems.map((item) => (
                item.action ? (
                  <button
                    key={item.name}
                    onClick={item.action} 
                    className="text-muted hover:text-white transition-colors"
                  >
                    {item.name}
                  </button>
                ) : (
                  <Link
                    key={item.name}
                    href={item.path}
                    className={`text-muted hover:text-white transition-colors ${pathname === item.path || pathname.startsWith(`${item.path}/`) ? 'text-white' : ''}`}
                  >
                    {item.name}
                  </Link>
                )
              ))}
              <button
                type="button"
                role="switch"
                aria-checked={reduceMotion}
                onClick={() => setReduceMotion(!reduceMotion)}
                className="flex items-center gap-2 text-sm font-medium text-muted hover:text-white"
              >
                <span>Reduce motion</span>
                <span className={`relative h-6 w-11 rounded-full border transition-colors ${reduceMotion ? "border-focus bg-focus" : "border-line bg-panel-strong"}`} aria-hidden="true">
                  <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${reduceMotion ? "translate-x-5" : "translate-x-1"}`} />
                </span>
              </button>
            </motion.div>

            {/* Mobile Menu Button */}
            <div className="lg:hidden">
              <button
                type="button"
                onClick={toggleMenu}
                className="p-2 text-muted hover:text-white"
                aria-label="Open navigation menu"
                aria-expanded={isOpen}
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
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.95 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-gray-900"
            />
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={toggleMenu}
              className="fixed top-6 right-6 z-50 p-2 text-white hover:text-gray-300 transition-colors cursor-pointer"
              aria-label="Close navigation menu"
            >
              <X size={32} />
            </motion.button>
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", duration: 0.3 }}
              className="fixed inset-0 z-45 flex flex-col items-center justify-center space-y-12 pointer-events-auto"
            >
              {menuItems.map((item, index) => {
                const isActive = pathname === item.path || pathname.startsWith(`${item.path}/`);
                return (
                  <motion.div
                    key={item.name}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    transition={{ delay: index * 0.1 }}
                    className="relative"
                  >
                    {item.action ? (
                      <button
                        onClick={item.action}
                        className={`relative text-3xl font-medium transition-colors ${isActive ? 'text-white' : 'text-gray-400 hover:text-white'}`}
                      >
                        {item.name}
                      </button>
                    ) : (
                      <Link
                        href={item.path}
                        onClick={toggleMenu}
                        className={`relative text-3xl font-medium transition-colors ${isActive ? 'text-white' : 'text-gray-400 hover:text-white'}`}
                      >
                        {item.name}
                      </Link>
                    )}
                  </motion.div>
                );
              })}
              <button
                type="button"
                role="switch"
                aria-checked={reduceMotion}
                onClick={() => setReduceMotion(!reduceMotion)}
                className="flex items-center gap-3 text-xl font-medium text-white"
              >
                <span>Reduce motion</span>
                <span className={`relative h-7 w-12 rounded-full border transition-colors ${reduceMotion ? "border-focus bg-focus" : "border-line bg-panel-strong"}`} aria-hidden="true">
                  <span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${reduceMotion ? "translate-x-6" : "translate-x-1"}`} />
                </span>
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Header;