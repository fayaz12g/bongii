"use client";
import Header from '../components/header';
import Link from 'next/link';
import Background from '../components/background';
import Footer from '../components/footer';
export default function Volunteer() {
  return (
    <div>
      <Header />
      <Background />
      {/* <Footer /> */}
        <br />
        <br />
        <br />
        <br />
        <div className="max-w-6xl mx-auto space-y-12">
          <h1 className="text-4xl font-bold text-white text-center">Welcome Voluntalers!</h1>
          {/* Main Content */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left Section - Large */}
            <div className="bg-gray-800 flex flex-col justify-center items-center text-white p-8 rounded-2xl shadow-lg">
              <h2 className="text-2xl font-semibold text-center mb-4">Everything Counts!</h2>
              <p className="text-m mb-4 text-center"><i>How Will You Make an Impact Today?</i></p>
              <p className="text-center">
              <span className='text-green-500'>VolunTales</span> is here to help you make a real difference! Discover opportunities that align with your unique skills, experience, and availability. Choose one of the options on the right and embark on a rewarding adventure of giving back and transforming lives.
                <br />
                Choose one of the options on the right to get started.
              </p>
            </div>

            {/* Right Section - Stacked smaller boxes */}
            <div className="space-y-6">
              {/* Volunteer Time Option */}
              <Link
                href="/times"
                className="block bg-gray-700 p-6 rounded-xl shadow-lg text-white hover:bg-gray-600 transition-all"
              >
                  <div className="flex items-center space-x-4">
                    <div className="p-5 w-10 h-10 bg-gray-600 rounded-full flex justify-center items-center text-lg">🕒</div>
                    <div>
                      <h3 className="text-xl font-semibold">Contribute Your Time</h3>
                      <p className="text-sm">Invest your time in the community by volunteering with local charities and causes. Your efforts can help to build a stronger, united community</p>
                    </div>
                  </div>
              </Link>

              {/* Financial Aid Option */}
              <Link
  href="/finance"
  className="block bg-gray-700 p-6 rounded-xl shadow-lg text-white hover:bg-gray-600 transition-all"
>
                  <div className="flex items-center space-x-4">
                    <div className="p-5 w-10 h-10 bg-gray-600 rounded-full flex justify-center items-center text-lg">💵</div>
                    <div>
                      <h3 className="text-xl font-semibold">Fund a Cause</h3>
                      <p className="text-sm">Donate money to support groups or organizations.Your contributions help to sponsor essential programs and create lasting change in the community.</p>
                    </div>
                  </div>
               
              </Link>

              {/* Goods Donation Option */}
              <Link
  href="/items"
  className="block bg-gray-700 p-6 rounded-xl shadow-lg text-white hover:bg-gray-600 transition-all"
>
                  <div className="flex items-center space-x-4">
                    <div className="p-5 w-10 h-10 bg-gray-600 rounded-full flex justify-center items-center text-lg">📦</div>
                    <div>
                      <h3 className="text-xl font-semibold">Donate Goods and Supplies</h3>
                      <p className="text-sm">Find and contribute specific items(dry goods, clothing, canned food, etc), urgently needed in your community. You can make a difference!</p>
                    </div>
                  </div>
              
              </Link>
            </div>
          </div>
        </div>
      </div>

  );
}
