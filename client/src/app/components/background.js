import { useState, useEffect } from "react";

const Background = () => {

  const [backgroundClass, setBackgroundClass] = useState('');

  useEffect(() => {
    const gradientClasses = [
      // "bg-gradient-to-b from-green-700 via-yellow-600 to-orange-900",
      // "bg-gradient-to-b from-indigo-700 via-violet-600 to-gray-900",
      "bg-gradient-to-br from-green-950 via-gray-900 to-indigo-950",
      // "bg-gradient-to-br from-indigo-200 via-gray-300 to-indigo-300",
      // "bg-gradient-to-b from-pink-700 via-red-600 to-red-900",
      // "bg-gradient-to-b from-teal-400 via-cyan-500 to-blue-600",  
      // "bg-gradient-to-b from-purple-500 via-pink-500 to-red-500",
      // "bg-gradient-to-b from-blue-200 via-blue-300 to-blue-400", 
      // "bg-gradient-to-b from-rose-400 via-fuchsia-500 to-indigo-500", 
      // "bg-gradient-to-b from-green-300 via-green-400 to-lime-500",
    ];
  
    const randomIndex = Math.floor(Math.random() * gradientClasses.length);
    setBackgroundClass(gradientClasses[randomIndex]);
  }, []);

  return (
    <>
      <div className={`min-h-screen fixed inset-0 -z-10 ${backgroundClass}`}>
      </div>
    </>
  );
};

export default Background;
